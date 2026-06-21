import { AgeGroup, ColorConfig, ColorInfo, PaletteResult } from './types';
import { colorDistLAB } from './colorDistance';

export class EducationalPaletteOptimizer {
  
  /**
   * Optimizes a given palette based on educational standards and cognitive limits.
   * @param originalColors The raw colors extracted from an image
   * @param ageGroup The target student age group
   * @param config Additional settings
   * @returns PaletteResult containing the reduced palette and mapping
   */
  public static optimizePalette(
    originalColors: ColorInfo[],
    ageGroup: AgeGroup,
    config: ColorConfig
  ): PaletteResult {
    
    // 1. Determine max colors
    let maxColors = config.maxColors || 15;
    if (ageGroup === 'kindergarten') maxColors = Math.min(maxColors, 5);
    else if (ageGroup === 'grade1-2') maxColors = Math.min(maxColors, 10);
    else if (ageGroup === 'grade3-4' || ageGroup === 'primary') maxColors = Math.min(maxColors, 15);

    // 2. Initialize working set and map
    let currentColors = [...originalColors];
    const mapping: Record<number, number> = {};
    for (const c of originalColors) {
      mapping[c.id] = c.id;
    }

    // 3. Define the cognitive threshold (using squared distance from colorDistLAB)
    // High contrast mode requires colors to be much further apart to be considered distinct.
    const tolerance = config.tolerance !== undefined ? config.tolerance : 50;
    const baseThreshold = config.highContrastMode ? 1200 : 400;
    
    let thresholdMultiplier = 1;
    if (tolerance < 50) {
      thresholdMultiplier = tolerance / 50; // 0 to 1
    } else {
      thresholdMultiplier = 1 + ((tolerance - 50) / 50) * 2; // 1 to 3
    }
    const cognitiveThreshold = baseThreshold * thresholdMultiplier;

    // 4. Protect outlines/backgrounds
    const protectedIds = config.preserveOutlines !== false ? [1, 24] : []; // 1: White, 24: Black

    // 5. Iteratively merge the closest colors
    while (currentColors.length > 1) {
      // Find the closest pair
      let minDistance = Infinity;
      let mergePair: [ColorInfo, ColorInfo] | null = null;

      for (let i = 0; i < currentColors.length; i++) {
        for (let j = i + 1; j < currentColors.length; j++) {
          const c1 = currentColors[i];
          const c2 = currentColors[j];

          // Do not merge two protected colors together (e.g. Black and White)
          if (protectedIds.includes(c1.id) && protectedIds.includes(c2.id)) {
            continue;
          }

          const dist = colorDistLAB(c1, c2, config.highContrastMode ? 1.5 : 1.0);
          if (dist < minDistance) {
            minDistance = dist;
            mergePair = [c1, c2];
          }
        }
      }

      // Stop if we reached the max colors AND the closest remaining colors are distinct enough
      if (currentColors.length <= maxColors && minDistance > cognitiveThreshold) {
        break;
      }

      if (!mergePair) break; // Should not happen unless all remaining are protected

      const [c1, c2] = mergePair;

      // Decide which color absorbs the other.
      // Rules:
      // - Protected colors absorb unprotected colors.
      // - Lower IDs (more primary colors in PALETTE) absorb higher IDs (secondary/tertiary colors).
      let survivor: ColorInfo, victim: ColorInfo;
      
      if (protectedIds.includes(c1.id)) {
        survivor = c1;
        victim = c2;
      } else if (protectedIds.includes(c2.id)) {
        survivor = c2;
        victim = c1;
      } else {
        survivor = c1.id < c2.id ? c1 : c2;
        victim = c1.id < c2.id ? c2 : c1;
      }

      // Update mapping
      for (const origId in mapping) {
        if (mapping[origId] === victim.id) {
          mapping[origId] = survivor.id;
        }
      }

      // Remove victim from current colors
      currentColors = currentColors.filter(c => c.id !== victim.id);
    }

    // 6. Generate Explanation
    let explanation = `Palette optimized for ${ageGroup}. Reduced to ${currentColors.length} colors.`;
    if (config.highContrastMode) {
      explanation += ` High contrast mode ensured distinct hues.`;
    }
    if (currentColors.length <= 5 && ageGroup === 'kindergarten') {
      explanation += ` Perfect for early learners.`;
    }

    return {
      optimizedPalette: currentColors,
      originalToOptimizedMap: mapping,
      explanation
    };
  }
}
