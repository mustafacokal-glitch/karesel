/**
 * ============================================================
 *  pixelEngine.ts — Projenin Matematiksel Kalbi
 *  Mode-Pooling (Çoğunluk Oylaması) + LAB Renk Uzayında Palette Eşleme
 *  + Kontur Koruması (%15 Siyah kuralı)
 * ============================================================
 */

import { PIPELINE_CONFIG } from '../../config/pipelineConfig';
import { colorDistLABFlat, rgb2labFast, rgb2lab, PALETTE, PALETTE_LAB, getPaletteForDifficulty } from '../color/colorDistance';
import { KeyFeature, FeatureMask } from './KeyFeaturePreservationEngine';
import { findNearestPaletteIdInFamily } from '../color/AccentColorFamilies';

// Siyah renk ID'si (kontur kuralı için)
const BLACK_ID = PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID;
// Boş hücre temsili için
const EMPTY_ID = 0;

// -----------------------------------------------------------
// 3. MODE-POOLING (ÇOĞUNLUK OYLAMASI) İLE GRİD OLUŞTURMA
// -----------------------------------------------------------

/**
 * Bir ImageData nesnesini alır, Mode-Pooling yöntemiyle
 * rows x cols grid'e küçültür.
 *
 * @param {ImageData} imageData - Kaynak görsel verisi
 * @param {number} rows - Hedef satır sayısı
 * @param {number} cols - Hedef sütun sayısı
 * @param {number} difficultyLevel - Zorluk seviyesi (1-4)
 * @returns {{ pixelGrid: number[][], colorMap: object }}
 */
export async function processImageToGrid(
  imageData: ImageData, 
  rows: number, 
  cols: number, 
  difficultyLevel = 2, 
  offsetX = 0, 
  offsetY = 0,
  options?: { allowedPalette?: any[], featureMask?: FeatureMask, metrics?: any }
) {
  const { width, height, data } = imageData;

  // Her grid hücresine düşen kaynak piksel blok büyüklüğü
  const blockW = width / cols;
  const blockH = height / rows;

  const pixelGrid: number[][] = [];
  const blackRatioGrid: number[][] = [];
  const foregroundCoverageGrid: number[][] = [];
  
  // New Feature Grids
  const featureCoverageGrid: number[][] = [];
  const featureTypeGrid: string[][] = [];
  const featureConfidenceGrid: number[][] = [];
  const sourceBlackCoverageGrid: number[][] = [];
  const protectedCells: ('hard'|'soft'|'none')[][] = [];

  const usedColorIds = new Set<number>();
  const allowedPalette = options?.allowedPalette || getPaletteForDifficulty(difficultyLevel);

  // Cache LAB for the allowed palette to prevent redundant calculation inside loops
  const localLabCache = new Map<number, [number, number, number]>();
  for (const p of allowedPalette) {
    const cached = PALETTE_LAB.get(p.id);
    if (cached) {
      localLabCache.set(p.id, cached);
    } else {
      localLabCache.set(p.id, rgb2lab(p.r, p.g, p.b));
    }
  }

  // OPTIMIZATION: Pre-allocate typed arrays to entirely prevent GC object creation inside tight loops
  const maxBlockSize = Math.ceil(blockW) * Math.ceil(blockH) + 10;
  const blockR = new Uint8Array(maxBlockSize);
  const blockG = new Uint8Array(maxBlockSize);
  const blockB = new Uint8Array(maxBlockSize);
  const blockX = new Uint16Array(maxBlockSize);
  const blockY = new Uint16Array(maxBlockSize);
  const blockCoverage = new Float32Array(maxBlockSize);

  // Buffer for fast LAB conversions
  const sharedLAB = new Float64Array(3);
  const { MIN: CENTER_WEIGHT_MIN, MAX: CENTER_WEIGHT_MAX } = PIPELINE_CONFIG.PIXEL_ENGINE.CENTER_WEIGHT;
  const PROTECTED_OUTLINE_IDS = new Set(PIPELINE_CONFIG.PIXEL_ENGINE.PROTECTED_COLORS.IDS);
  let lastYieldTime = Date.now();

  for (let row = 0; row < rows; row++) {
    // Tarayıcının kilitlenmesini engellemek için sadece 16ms'yi geçerse yield et (60fps)
    if (Date.now() - lastYieldTime > 16) {
      await new Promise(r => setTimeout(r, 0));
      lastYieldTime = Date.now();
    }

    const gridRow = [];
    const blackRatioRow = [];
    const fgCoverageRow = [];

    for (let col = 0; col < cols; col++) {
      const xStart = Math.floor(col * blockW);
      const xEnd = Math.min(width, Math.floor((col + 1) * blockW));
      const yStart = Math.floor(row * blockH);
      const yEnd = Math.min(height, Math.floor((row + 1) * blockH));

      let sumR = 0, sumG = 0, sumB = 0;
      let blockPixelCount = 0;
      let totalPixels = 0;
      let coverageSum = 0;
      let validCoverageSum = 0;
      
      let sourceBlackPixelCount = 0;
      const featureIdCounts = new Map<number, number>();

      // 1. Geçiş: Piksel toplama ve ortalama renk hesaplama
      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const safeX = Math.max(0, Math.min(width - 1, x + offsetX));
          const safeY = Math.max(0, Math.min(height - 1, y + offsetY));
          const srcIdx = (safeY * width + safeX) * 4;
          let alpha = data[srcIdx + 3];
          totalPixels++;
          coverageSum += (alpha / 255);

          const r = data[srcIdx];
          const g = data[srcIdx + 1];
          const b = data[srcIdx + 2];

          // 1. FİLTRE: Açık gri ve kirli beyaz JPEG lekelerini sil
          const { MIN_RGB, MAX_DIFF } = PIPELINE_CONFIG.PIXEL_ENGINE.JPEG_NOISE;
          if (r > MIN_RGB && g > MIN_RGB && b > MIN_RGB && Math.abs(r - g) < MAX_DIFF && Math.abs(g - b) < MAX_DIFF) {
            alpha = 0;
          }

          const coverage = alpha / 255;
          if (coverage < PIPELINE_CONFIG.PIXEL_ENGINE.MIN_ALPHA_COVERAGE) continue;

          // Push to flat pre-allocated arrays instead of allocating {r,g,b} objects
          blockR[blockPixelCount] = r;
          blockG[blockPixelCount] = g;
          blockB[blockPixelCount] = b;
          blockX[blockPixelCount] = x;
          blockY[blockPixelCount] = y;
          blockCoverage[blockPixelCount] = coverage;
          blockPixelCount++;

          sumR += r * coverage;
          sumG += g * coverage;
          sumB += b * coverage;
          validCoverageSum += coverage;

          // Source Black Detection for Stripe Control
          if (r < 60 && g < 60 && b < 60) {
            sourceBlackPixelCount++;
          }

          // Feature Tracking
          if (options?.featureMask) {
            const fIdx = safeY * width + safeX;
            const fId = options.featureMask.data[fIdx];
            if (fId > 0) {
              featureIdCounts.set(fId, (featureIdCounts.get(fId) || 0) + 1);
            }
          }
        }
      }

      const fgCoverage = totalPixels > 0 ? (coverageSum / totalPixels) : 0;
      const sourceBlackCoverage = blockPixelCount > 0 ? (sourceBlackPixelCount / blockPixelCount) : 0;

      // 2. FİLTRE: Hücrenin %10'undan azı doluysa veya hiç piksel yoksa boş say
      if (blockPixelCount < (totalPixels * PIPELINE_CONFIG.PIXEL_ENGINE.MIN_FILL_RATIO) || blockPixelCount === 0) {
        gridRow.push(EMPTY_ID);
        blackRatioRow.push(0);
        fgCoverageRow.push(fgCoverage);
        featureCoverageGrid[row] = featureCoverageGrid[row] || []; featureCoverageGrid[row].push(0);
        featureTypeGrid[row] = featureTypeGrid[row] || []; featureTypeGrid[row].push('none');
        featureConfidenceGrid[row] = featureConfidenceGrid[row] || []; featureConfidenceGrid[row].push(0);
        sourceBlackCoverageGrid[row] = sourceBlackCoverageGrid[row] || []; sourceBlackCoverageGrid[row].push(sourceBlackCoverage);
        protectedCells[row] = protectedCells[row] || []; protectedCells[row].push('none');
        continue;
      }

      const avgR = validCoverageSum > 0 ? sumR / validCoverageSum : 0;
      const avgG = validCoverageSum > 0 ? sumG / validCoverageSum : 0;
      const avgB = validCoverageSum > 0 ? sumB / validCoverageSum : 0;
      const [avgL, avgA, avgB_] = rgb2lab(avgR, avgG, avgB);

      const cellCenterX = (xStart + xEnd) / 2;
      const cellCenterY = (yStart + yEnd) / 2;
      const halfW = Math.max((xEnd - xStart) / 2, 1);
      const halfH = Math.max((yEnd - yStart) / 2, 1);

      // 2. Geçiş: Palette eşleme ve kontrast ağırlıklı oylama
      const freqMap = new Map();
      let blackCount = 0;

      for (let i = 0; i < blockPixelCount; i++) {
        const r = blockR[i];
        const g = blockG[i];
        const b = blockB[i];

        rgb2labFast(r, g, b, sharedLAB);
        const pL = sharedLAB[0], pA = sharedLAB[1], pB = sharedLAB[2];

        let minDist = Infinity;
        let paletteId = 1;

        for (let j = 0; j < allowedPalette.length; j++) {
          const palId = allowedPalette[j].id;
          const lab = localLabCache.get(palId);
          if (!lab) continue;
          const dist = colorDistLABFlat(pL, pA, pB, lab[0], lab[1], lab[2], 1.0);
          if (dist < minDist) {
            minDist = dist;
            paletteId = palId;
          }
        }

        if (paletteId === BLACK_ID) {
          blackCount++;
        }

        let weight = 1.0;

        if (PIPELINE_CONFIG.PIXEL_ENGINE.USE_ALPHA_WEIGHTED_POOLING) {
          weight *= blockCoverage[i];
        }

        const ndx = (blockX[i] - cellCenterX) / halfW;
        const ndy = (blockY[i] - cellCenterY) / halfH;
        const normDist = Math.min(Math.sqrt(ndx * ndx + ndy * ndy), 1);
        weight *= CENTER_WEIGHT_MAX - (CENTER_WEIGHT_MAX - CENTER_WEIGHT_MIN) * normDist;

        // Kontrast Duyarlılık (Contrast Boost)
        const distToAvg = colorDistLABFlat(pL, pA, pB, avgL, avgA, avgB_, 1.0);
        
        if (distToAvg > PIPELINE_CONFIG.PIXEL_ENGINE.CONTRAST_BOOST.DIST_THRESHOLD) {
          weight *= PIPELINE_CONFIG.PIXEL_ENGINE.CONTRAST_BOOST.WEIGHT_MULTIPLIER;
        }

        // İnce detay renklerini korumak için
        if (PIPELINE_CONFIG.PIXEL_ENGINE.PROTECTED_COLORS.IDS.includes(paletteId)) {
          weight *= PIPELINE_CONFIG.PIXEL_ENGINE.PROTECTED_COLORS.WEIGHT_MULTIPLIER;
        }

        freqMap.set(paletteId, (freqMap.get(paletteId) || 0) + weight);
      }

      // Feature Evaluation using priority-based selection
      let selectedFeature: KeyFeature | null = null;
      let selectedFeatureCoverage = 0;
      
      const FEATURE_PRIORITY: Record<string, number> = {
        'eye': 100,
        'nose': 95,
        'brown-nose': 95,
        'tongue': 90,
        'collar': 90,
        'mouth': 80,
        'chest': 60,
        'accent-important': 60,
        'whisker': 50,
        'inner-ear': 45,
        'outline': 40,
        'stripe': 30,
        'accent': 20,
        'noise': 0
      };

      const FEATURE_COVERAGE_THRESHOLDS: Record<string, number> = {
        'eye': 0.02,
        'nose': 0.035,
        'brown-nose': 0.012,
        'mouth': 0.015,
        'tongue': 0.010,
        'collar': 0.006,
        'whisker': 0.01,
        'stripe': 0.05,
        'inner-ear': 0.04,
        'chest': 0.03,
        'paw': 0.03,
        'tail': 0.03,
        'accent-important': 0.01,
        'accent': 0.05
      };

      if (options?.featureMask && featureIdCounts.size > 0) {
        let bestPriority = -1;
        
        for (const [fId, count] of featureIdCounts) {
          const coverage = count / blockPixelCount;
          const feature = options.featureMask.features.get(fId);
          if (!feature) continue;
          
          const threshold = FEATURE_COVERAGE_THRESHOLDS[feature.type] || 0.05;
          if (coverage >= threshold) {
            const priority = FEATURE_PRIORITY[feature.type] || 10;
            if (priority > bestPriority) {
              bestPriority = priority;
              selectedFeature = feature;
              selectedFeatureCoverage = coverage;
            }
          }
        }
      }

      let overrideColorId = EMPTY_ID;
      let cellProtection: 'hard'|'soft'|'none' = 'none';
      let cellFeatureType = 'none';
      let cellFeatureConfidence = 0;

      // Apply Feature Overrides
      if (selectedFeature) {
        cellFeatureType = selectedFeature.type;
        cellProtection = selectedFeature.protection;
        cellFeatureConfidence = selectedFeatureCoverage;

        // Find nearest palette ID for the feature's color (legacy fallback)
        let fDist = Infinity;
        let fId = 1;
        const [fL, fA, fB] = rgb2lab(selectedFeature.color[0], selectedFeature.color[1], selectedFeature.color[2]);
        for (const p of allowedPalette) {
          const lab = localLabCache.get(p.id)!;
          const d = colorDistLABFlat(fL, fA, fB, lab[0], lab[1], lab[2], 1.0);
          if (d < fDist) { fDist = d; fId = p.id; }
        }

        if (selectedFeature.type === 'eye' || selectedFeature.type === 'nose') {
          overrideColorId = BLACK_ID;
          cellProtection = 'hard';
        } else if (selectedFeature.type === 'brown-nose') {
          const brownId = findNearestPaletteIdInFamily(selectedFeature.color, allowedPalette, 'brown');
          overrideColorId = brownId !== null ? brownId : fId;
        } else if (selectedFeature.type === 'tongue') {
          const redId = findNearestPaletteIdInFamily(selectedFeature.color, allowedPalette, 'red');
          overrideColorId = redId !== null ? redId : fId;
        } else if (selectedFeature.type === 'collar') {
          const blueId = findNearestPaletteIdInFamily(selectedFeature.color, allowedPalette, 'blue');
          overrideColorId = blueId !== null ? blueId : fId;
        } else if (selectedFeature.type === 'chest') {
          const creamId = findNearestPaletteIdInFamily(selectedFeature.color, allowedPalette, 'cream');
          overrideColorId = creamId !== null ? creamId : fId;
        } else if (selectedFeature.type === 'mouth' || selectedFeature.type === 'whisker' || selectedFeature.type === 'inner-ear' || selectedFeature.type === 'accent-important') {
          overrideColorId = fId;
        }
      }

      // Kontur Kuralı / Mode
      let modeId = EMPTY_ID;
      let secondaryId = EMPTY_ID; // For fallback
      if (blackCount > blockPixelCount * PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.THRESHOLD_RATIO) {
        modeId = BLACK_ID;
      } else {
        // En çok tekrar eden (mode) rengi bul
        let maxFreq = 0;
        let secondFreq = 0;
        for (const [paletteId, freq] of freqMap) {
          if (freq > maxFreq) {
            secondFreq = maxFreq;
            secondaryId = modeId;
            maxFreq = freq;
            modeId = paletteId;
          } else if (freq > secondFreq) {
            secondFreq = freq;
            secondaryId = paletteId;
          }
        }
      }

      // Final Override
      if (overrideColorId !== EMPTY_ID) {
        modeId = overrideColorId;
      } else {
        // Stripe Control (Bounded Black Expansion)
        if (modeId === BLACK_ID) {
          let rejectBlack = false;
          if (sourceBlackCoverage < 0.10) {
            rejectBlack = true;
          } else if (sourceBlackCoverage < 0.25) {
            if (selectedFeature?.type !== 'stripe' && selectedFeature?.type !== 'outline' && selectedFeature?.type !== 'eye' && selectedFeature?.type !== 'nose') {
              rejectBlack = true;
            }
          }

          if (rejectBlack) {
            let fallbackId = EMPTY_ID;
            
            // 1. Source alpha-weighted average mapped to palette
            let bestAvgDist = Infinity;
            for (const p of allowedPalette) {
              if (p.id === BLACK_ID) continue;
              if (p.id === 1 && fgCoverage >= 0.5) continue; // 1 = White/Background. Do not fallback to background if foreground is dense
              const lab = localLabCache.get(p.id)!;
              const d = colorDistLABFlat(avgL, avgA, avgB_, lab[0], lab[1], lab[2], 1.0);
              if (d < bestAvgDist) {
                bestAvgDist = d;
                fallbackId = p.id;
              }
            }
            
            // 2. 2nd most dominant non-black cell color
            if (fallbackId === EMPTY_ID || bestAvgDist > 40) {
              if (secondaryId !== EMPTY_ID && secondaryId !== BLACK_ID) {
                fallbackId = secondaryId;
              }
            }

            // 3. (Optional) Neighborhood or object fallback could be implemented via a second pass,
            // but for now, if fallback is still empty, revert to EMPTY_ID.
            modeId = fallbackId !== EMPTY_ID ? fallbackId : EMPTY_ID;
            
            if (options) {
              options.metrics = options.metrics || {};
              options.metrics.rejectedBlackCells = (options.metrics.rejectedBlackCells || 0) + 1;
              options.metrics.fallbackColorUsage = (options.metrics.fallbackColorUsage || 0) + 1;
            }
          } else {
            if (options) {
              options.metrics = options.metrics || {};
              options.metrics.blackCells = (options.metrics.blackCells || 0) + 1;
            }
          }
        }
      }

      // Mode bulunamazsa boş
      if (modeId === EMPTY_ID) {
        gridRow.push(EMPTY_ID);
        blackRatioRow.push(blockPixelCount > 0 ? blackCount / blockPixelCount : 0);
        fgCoverageRow.push(fgCoverage);
        featureCoverageGrid[row] = featureCoverageGrid[row] || []; featureCoverageGrid[row].push(0);
        featureTypeGrid[row] = featureTypeGrid[row] || []; featureTypeGrid[row].push('none');
        featureConfidenceGrid[row] = featureConfidenceGrid[row] || []; featureConfidenceGrid[row].push(0);
        sourceBlackCoverageGrid[row] = sourceBlackCoverageGrid[row] || []; sourceBlackCoverageGrid[row].push(sourceBlackCoverage);
        protectedCells[row] = protectedCells[row] || []; protectedCells[row].push('none');
        continue;
      }

      gridRow.push(modeId);
      blackRatioRow.push(blockPixelCount > 0 ? blackCount / blockPixelCount : 0);
      fgCoverageRow.push(fgCoverage);
      featureCoverageGrid[row] = featureCoverageGrid[row] || []; featureCoverageGrid[row].push(selectedFeatureCoverage);
      featureTypeGrid[row] = featureTypeGrid[row] || []; featureTypeGrid[row].push(cellFeatureType);
      featureConfidenceGrid[row] = featureConfidenceGrid[row] || []; featureConfidenceGrid[row].push(cellFeatureConfidence);
      sourceBlackCoverageGrid[row] = sourceBlackCoverageGrid[row] || []; sourceBlackCoverageGrid[row].push(sourceBlackCoverage);
      protectedCells[row] = protectedCells[row] || []; protectedCells[row].push(cellProtection);

      usedColorIds.add(modeId);
    }

    pixelGrid.push(gridRow);
    blackRatioGrid.push(blackRatioRow);
    foregroundCoverageGrid.push(fgCoverageRow);
  }

  // 3. Geçiş: Edge-Aware Downscaling (Senkron Güncelleme)
  const { SECONDARY_THRESHOLD_RATIO, MIN_NEIGHBOR_SUPPORT } = PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE;
  
  // AŞAMA A: Sadece TESPİT et, henüz DEĞİŞTİRME (cascading'i önlemek için)
  const cellsToBlacken: [number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const currentId = pixelGrid[row][col];
      if (currentId === BLACK_ID) continue;
      if (PROTECTED_OUTLINE_IDS.has(currentId)) continue; // YENİ — Sarı/Koyu Kırmızı/Kahverengi'yi koru
      if (blackRatioGrid[row][col] < SECONDARY_THRESHOLD_RATIO) continue;

      // Prevent black expansion over protected detail cells
      if (protectedCells[row] && protectedCells[row][col] === 'hard') continue;
          
      const featureType = featureTypeGrid[row] && featureTypeGrid[row][col] ? featureTypeGrid[row][col] : 'none';
      if (featureType === 'collar' || featureType === 'tongue' || featureType === 'brown-nose' || featureType === 'eye' || featureType === 'mouth') continue;

      // Check color family for weak protection against blackening
      const cellColorId = pixelGrid[row][col];
      const familyIds = PIPELINE_CONFIG.CHARACTERISTIC_DETAILS?.PROTECTED_ACCENT_PALETTE_IDS || [7,8,9,10, 13,14,15,16, 21,22];
      if (familyIds.includes(cellColorId) && featureType !== 'none') {
        continue;
      }

      let blackNeighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr, nc = col + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          // pixelGrid burada hâlâ DEĞİŞMEMİŞ orijinal hal
          if (pixelGrid[nr][nc] === BLACK_ID) blackNeighbors++;
        }
      }
      if (blackNeighbors >= MIN_NEIGHBOR_SUPPORT) {
        cellsToBlacken.push([row, col]);
      }
    }
  }

  // AŞAMA B: Tespit bitti, ŞİMDİ topluca uygula (senkron update)
  for (const [r, c] of cellsToBlacken) {
    pixelGrid[r][c] = BLACK_ID;
    usedColorIds.add(BLACK_ID);
  }

  // colorMap
  const colorMap: Record<number, any> = {};
  for (const paletteId of usedColorIds) {
    const paletteColor = allowedPalette.find((p: any) => p.id === paletteId) || PALETTE.find(p => p.id === paletteId);
    if (paletteColor) {
      colorMap[paletteId] = { ...paletteColor };
    }
  }

  return { 
    pixelGrid, 
    colorMap, 
    foregroundCoverageGrid,
    featureCoverageGrid,
    featureTypeGrid,
    featureConfidenceGrid,
    sourceBlackCoverageGrid,
    protectedCells
  };
}
