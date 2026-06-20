import { AnalysisInput, ColorDistResult } from './types';

export class ColorDistributionAnalyzer {
  /**
   * Analyzes how chaotic or confusing the colors are in the image.
   * Groups RGB values into bins to estimate the number of distinctly recognizable colors.
   */
  public static analyze(input: AnalysisInput): ColorDistResult {
    const { width, height, data } = input.imageData;
    
    // We quantize the 24-bit RGB space into fewer bins.
    // e.g., shift right by 5 bits reduces 0-255 down to 0-7 (8 levels per channel).
    // Total distinct bins = 8 * 8 * 8 = 512.
    const SHIFT_BITS = 5; 
    const colorBins = new Set<number>();
    
    // To ignore tiny specks of noise, we will track bin frequencies
    // and only count bins that appear a significant number of times.
    const binFrequencies: Record<number, number> = {};
    let validPixelCount = 0;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // Ignore mostly transparent pixels

      validPixelCount++;
      const r = data[i] >> SHIFT_BITS;
      const g = data[i + 1] >> SHIFT_BITS;
      const b = data[i + 2] >> SHIFT_BITS;

      // Create a unique hash for the 3D bin
      // r is 0-7, g is 0-7, b is 0-7. We can pack them into a single integer.
      const binHash = (r << 6) | (g << 3) | b;
      
      binFrequencies[binHash] = (binFrequencies[binHash] || 0) + 1;
    }

    if (validPixelCount === 0) {
      return { colorChaosScore: 0, dominantColorsCount: 0 };
    }

    // A color is considered "dominant" or "structurally significant" if it makes up
    // at least 0.5% of the valid image area.
    const thresholdCount = validPixelCount * 0.005;

    for (const hash in binFrequencies) {
      if (binFrequencies[hash] > thresholdCount) {
        colorBins.add(Number(hash));
      }
    }

    const dominantColorsCount = colorBins.size;

    // Normalizing the chaos score.
    // A cartoon might have 5-10 dominant colors.
    // A photo might have 50-100+ dominant color bins even with quantization.
    // We map anything over 25 dominant colors to 100% chaos.
    const MAX_EXPECTED_COLORS = 25;
    const colorChaosScore = Math.min((dominantColorsCount / MAX_EXPECTED_COLORS) * 100, 100);

    return {
      colorChaosScore,
      dominantColorsCount
    };
  }
}
