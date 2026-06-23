import { AgeGroup, ColorConfig, ColorInfo, PaletteResult } from './types';
import { colorDistLAB, PALETTE } from './colorDistance';
import { classifyPaletteIdFamily, getPaletteIdsForFamily } from './AccentColorFamilies';
import { canonicalizePaletteEntries } from './CanonicalPaletteMapper';

export class EducationalPaletteOptimizer {
  
  public static optimizePalette(
    originalColors: ColorInfo[],
    ageGroup: AgeGroup,
    config: ColorConfig
  ): PaletteResult {
    
    let maxColors = config.maxColors || 15;
    if (ageGroup === 'kindergarten') maxColors = Math.min(maxColors, 5);
    else if (ageGroup === 'grade1') maxColors = Math.min(maxColors, 8);
    else if (ageGroup === 'grade2') maxColors = Math.min(maxColors, 10);
    else if (ageGroup === 'grade3') maxColors = Math.min(maxColors, 12);
    else if (ageGroup === 'grade4') maxColors = Math.min(maxColors, 15);

    let currentColors = [...originalColors];
    const mapping: Record<number, number> = {};
    for (const c of originalColors) {
      mapping[c.id] = c.id;
    }

    // Ensure required accent families are present
    const requiredFamilies = config.requiredAccentFamilies || [];
    for (const family of requiredFamilies) {
      const hasRepresentative = currentColors.some(c => classifyPaletteIdFamily(c.id) === family);
      if (!hasRepresentative) {
        // Inject best representative from PALETTE
        const familyIds = getPaletteIdsForFamily(family);
        if (familyIds.length > 0) {
          const repId = familyIds[0];
          const repColor = PALETTE.find(p => p.id === repId);
          if (repColor && !currentColors.some(c => c.id === repColor.id)) {
            currentColors.push(repColor);
            mapping[repColor.id] = repColor.id;
          }
        }
      }
    }

    const tolerance = config.tolerance !== undefined ? config.tolerance : 50;
    const baseThreshold = config.highContrastMode ? 1200 : 400;
    let thresholdMultiplier = 1;
    if (tolerance < 50) {
      thresholdMultiplier = tolerance / 50;
    } else {
      thresholdMultiplier = 1 + ((tolerance - 50) / 50) * 2;
    }
    const cognitiveThreshold = baseThreshold * thresholdMultiplier;

    const baseProtectedIds = config.preserveOutlines !== false ? [1, 24] : [];
    if (config.protectedColorIds) {
      baseProtectedIds.push(...config.protectedColorIds);
    }

    // Helper: Determine if a color is the LAST representative of a required family
    const isLastRequiredRepresentative = (colors: ColorInfo[], color: ColorInfo) => {
      const family = classifyPaletteIdFamily(color.id);
      if (requiredFamilies.includes(family)) {
        const familyCount = colors.filter(c => classifyPaletteIdFamily(c.id) === family).length;
        if (familyCount <= 1) return true;
      }
      return false;
    };

    while (currentColors.length > 1) {
      let minDistance = Infinity;
      let mergePair: [ColorInfo, ColorInfo] | null = null;

      for (let i = 0; i < currentColors.length; i++) {
        for (let j = i + 1; j < currentColors.length; j++) {
          const c1 = currentColors[i];
          const c2 = currentColors[j];

          const p1 = baseProtectedIds.includes(c1.id) || isLastRequiredRepresentative(currentColors, c1);
          const p2 = baseProtectedIds.includes(c2.id) || isLastRequiredRepresentative(currentColors, c2);

          if (p1 && p2) continue;

          const dist = colorDistLAB(c1, c2, config.highContrastMode ? 1.5 : 1.0);
          if (dist < minDistance) {
            minDistance = dist;
            mergePair = [c1, c2];
          }
        }
      }

      if (currentColors.length <= maxColors && minDistance > cognitiveThreshold) {
        break;
      }

      // Force merge if we are above maxColors, even if distance is huge, but never merge two fully protected colors
      if (!mergePair) {
        if (currentColors.length > maxColors) {
          // Find any pair where at least one is not baseProtected. 
          // We might have to sacrifice a required representative if maxColors is too tight, but prefer sacrificing non-required.
          let bestDist = Infinity;
          for (let i = 0; i < currentColors.length; i++) {
            for (let j = i + 1; j < currentColors.length; j++) {
              const c1 = currentColors[i];
              const c2 = currentColors[j];
              if (baseProtectedIds.includes(c1.id) && baseProtectedIds.includes(c2.id)) continue;
              
              const dist = colorDistLAB(c1, c2, 1.0);
              if (dist < bestDist) {
                bestDist = dist;
                mergePair = [c1, c2];
              }
            }
          }
          if (!mergePair) break; // Cannot reduce further without breaking hard constraints
        } else {
          break;
        }
      }

      const [c1, c2] = mergePair;
      const p1 = baseProtectedIds.includes(c1.id) || isLastRequiredRepresentative(currentColors, c1);
      const p2 = baseProtectedIds.includes(c2.id) || isLastRequiredRepresentative(currentColors, c2);

      let survivor: ColorInfo, victim: ColorInfo;
      
      if (p1 && !p2) {
        survivor = c1; victim = c2;
      } else if (p2 && !p1) {
        survivor = c2; victim = c1;
      } else {
        survivor = c1.id < c2.id ? c1 : c2;
        victim = c1.id < c2.id ? c2 : c1;
      }

      for (const origId in mapping) {
        if (mapping[origId] === victim.id) {
          mapping[origId] = survivor.id;
        }
      }

      currentColors = currentColors.filter(c => c.id !== victim.id);
    }

    let explanation = `Palette optimized for ${ageGroup}. Reduced to ${currentColors.length} colors.`;
    if (requiredFamilies.length > 0) {
      explanation += ` Preserved families: ${requiredFamilies.join(', ')}.`;
    }

    const canonicalPalette = canonicalizePaletteEntries(currentColors);

    // Verify required accent families after canonical dedupe
    for (const family of requiredFamilies) {
      const hasRep = canonicalPalette.some(c => classifyPaletteIdFamily(c.canonicalPaletteId || c.id) === family);
      if (!hasRep) {
        const familyIds = getPaletteIdsForFamily(family);
        if (familyIds.length > 0) {
          const repColor = PALETTE.find(p => p.id === familyIds[0]);
          if (repColor && !canonicalPalette.some(c => (c.canonicalPaletteId || c.id) === repColor.id)) {
            let replaced = false;
            // Try to replace the lowest priority non-required color
            for (let i = canonicalPalette.length - 1; i >= 0; i--) {
              const cFam = classifyPaletteIdFamily(canonicalPalette[i].canonicalPaletteId || canonicalPalette[i].id);
              if (!requiredFamilies.includes(cFam) && !baseProtectedIds.includes(canonicalPalette[i].canonicalPaletteId || canonicalPalette[i].id)) {
                canonicalPalette[i] = { ...repColor, canonicalPaletteId: repColor.id };
                replaced = true;
                break;
              }
            }
            if (!replaced) {
              if (canonicalPalette.length >= maxColors) {
                for (let i = canonicalPalette.length - 1; i >= 0; i--) {
                  if (![1, 24].includes(canonicalPalette[i].canonicalPaletteId || canonicalPalette[i].id)) {
                    canonicalPalette[i] = { ...repColor, canonicalPaletteId: repColor.id };
                    replaced = true;
                    break;
                  }
                }
              }
              if (!replaced) {
                canonicalPalette.push({ ...repColor, canonicalPaletteId: repColor.id });
              }
            }
          }
        }
      }
    }

    let finalPalette = canonicalPalette;
    if (finalPalette.length > maxColors) {
      finalPalette = finalPalette.slice(0, maxColors);
    }

    return {
      optimizedPalette: finalPalette,
      originalToOptimizedMap: mapping,
      explanation
    };
  }
}
