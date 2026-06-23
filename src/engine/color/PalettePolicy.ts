import { ColorInfo } from './types';
import { getPaletteForDifficulty, PALETTE, rgb2lab, colorDistLABFlat } from './colorDistance';
import { PIPELINE_CONFIG } from '../../config/pipelineConfig';
import { mapColorToCanonicalPalette, canonicalizePaletteEntries } from './CanonicalPaletteMapper';

export type PaletteMode = 'educational' | 'fidelity' | 'pedagogical-fidelity';

export interface PalettePolicyOptions {
  mode: PaletteMode;
  difficultyLevel: number;
  maxColors?: number;
  ageGroup?: import('./types').AgeGroup;
}

const QUANT_SHIFT = 3; // 5-bit color (r >> 3), 32x32x32 = 32768 bins

export function extractDominantColors(imageData: ImageData, maxColors: number): ColorInfo[] {
  const { data } = imageData;
  
  // Maps a 15-bit color key to its stats
  const bins = new Map<number, { sumR: number, sumG: number, sumB: number, coverageSum: number }>();
  
  const minCoverage = PIPELINE_CONFIG.PIXEL_ENGINE.MIN_ALPHA_COVERAGE || 0.02;
  
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    const coverage = alpha / 255;
    if (coverage < minCoverage) continue;
    
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    const qr = r >> QUANT_SHIFT;
    const qg = g >> QUANT_SHIFT;
    const qb = b >> QUANT_SHIFT;
    
    const key = (qr << 10) | (qg << 5) | qb;
    
    let bin = bins.get(key);
    if (!bin) {
      bin = { sumR: 0, sumG: 0, sumB: 0, coverageSum: 0 };
      bins.set(key, bin);
    }
    
    bin.sumR += r * coverage;
    bin.sumG += g * coverage;
    bin.sumB += b * coverage;
    bin.coverageSum += coverage;
  }
  
  // Sort bins by coverageSum
  const sortedBins = Array.from(bins.values()).sort((a, b) => b.coverageSum - a.coverageSum);
  
  // Convert bins to LAB to merge very similar colors
  const mergedColors: { r: number, g: number, b: number, l: number, a: number, b_lab: number, weight: number }[] = [];
  
  // Threshold to merge perceptually identical colors (~Delta E 12)
  const MERGE_THRESHOLD = 150; 
  
  for (const bin of sortedBins) {
    const avgR = Math.round(bin.sumR / bin.coverageSum);
    const avgG = Math.round(bin.sumG / bin.coverageSum);
    const avgB = Math.round(bin.sumB / bin.coverageSum);
    const [l, a, b_lab] = rgb2lab(avgR, avgG, avgB);
    
    let merged = false;
    for (const mc of mergedColors) {
      const dist = colorDistLABFlat(l, a, b_lab, mc.l, mc.a, mc.b_lab, 1.0);
      if (dist < MERGE_THRESHOLD) {
        // Merge into existing cluster (weighted average)
        const totalWeight = mc.weight + bin.coverageSum;
        mc.r = Math.round((mc.r * mc.weight + avgR * bin.coverageSum) / totalWeight);
        mc.g = Math.round((mc.g * mc.weight + avgG * bin.coverageSum) / totalWeight);
        mc.b = Math.round((mc.b * mc.weight + avgB * bin.coverageSum) / totalWeight);
        
        // Recompute LAB for new average
        const [newL, newA, newB] = rgb2lab(mc.r, mc.g, mc.b);
        mc.l = newL; mc.a = newA; mc.b_lab = newB;
        mc.weight = totalWeight;
        merged = true;
        break;
      }
    }
    
    if (!merged) {
      mergedColors.push({ r: avgR, g: avgG, b: avgB, l, a, b_lab, weight: bin.coverageSum });
    }
  }
  
  // Snap to canonical palette and aggregate weights
  const canonicalMap = new Map<number, { color: ColorInfo; totalWeight: number }>();

  for (const mc of mergedColors) {
    const hex = '#' + [mc.r, mc.g, mc.b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('').toUpperCase();
    const match = mapColorToCanonicalPalette({ r: mc.r, g: mc.g, b: mc.b, hex });
    
    const canonicalId = match.canonicalPaletteId;
    if (canonicalMap.has(canonicalId)) {
      canonicalMap.get(canonicalId)!.totalWeight += mc.weight;
    } else {
      canonicalMap.set(canonicalId, {
        color: { ...match.paletteColor, canonicalPaletteId: canonicalId },
        totalWeight: mc.weight
      });
    }
  }

  // Sort by aggregated weight
  const sortedCanonical = Array.from(canonicalMap.values()).sort((a, b) => b.totalWeight - a.totalWeight);
  
  let extractedPalette = sortedCanonical.slice(0, maxColors).map(sc => sc.color);
  
  // Ensure critical colors (Black and White) are always present if not already matched
  const black = PALETTE.find(p => p.id === 24)!;
  const white = PALETTE.find(p => p.id === 1)!;
  
  const hasBlack = extractedPalette.some(p => p.id === 24 || p.canonicalPaletteId === 24);
  const hasWhite = extractedPalette.some(p => p.id === 1 || p.canonicalPaletteId === 1);
  
  if (!hasBlack) extractedPalette.push({ ...black, canonicalPaletteId: 24 });
  if (!hasWhite) extractedPalette.push({ ...white, canonicalPaletteId: 1 });
  
  // Keep within bounds
  return canonicalizePaletteEntries(extractedPalette).slice(0, maxColors);
}

export function getPaletteFromPolicy(options: PalettePolicyOptions, imageData?: ImageData): ColorInfo[] {
  if (options.mode === 'fidelity' && imageData) {
    let maxColors = options.maxColors;
    if (!maxColors) {
      // Defaults based on mapped numeric difficulty
      if (options.difficultyLevel <= 2) maxColors = 16;      // Fidelity Easy
      else if (options.difficultyLevel === 3) maxColors = 24; // Fidelity Balanced
      else if (options.difficultyLevel === 4) maxColors = 32; // Fidelity Advanced
      else maxColors = 48;                                   // Fidelity Expert
    }
    return extractDominantColors(imageData, maxColors);
  } else if (options.mode === 'pedagogical-fidelity' && imageData) {
    let maxColors = options.maxColors;
    if (!maxColors) {
      if (options.ageGroup === 'kindergarten') maxColors = 8;
      else if (options.ageGroup === 'grade1') maxColors = 10;
      else if (options.ageGroup === 'grade2') maxColors = 12;
      else if (options.ageGroup === 'grade3') maxColors = 16;
      else if (options.ageGroup === 'grade4') maxColors = 20;
      else maxColors = 15;
    }
    return extractDominantColors(imageData, maxColors);
  }
  
  // Default educational mode
  return getPaletteForDifficulty(options.difficultyLevel);
}
