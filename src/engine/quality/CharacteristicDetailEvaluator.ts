import { SourceAccentAudit } from '../analysis/SourceAccentAuditEngine';
import { EducationalDifficulty } from '../grid/types';
import { PIPELINE_CONFIG } from '../../config/pipelineConfig';
import { classifyPaletteIdFamily } from '../color/AccentColorFamilies';

export interface CharacteristicDetailStats {
  blueCellCount: number;
  redCellCount: number;
  brownCellCount: number;
  creamCellCount: number;
  blackCellCount: number;
  nonEmptyCellCount: number;
  blackForegroundRatio: number;
  missingRequiredAccentCount: number;
  characteristicDetailScore: number;
}

export class CharacteristicDetailEvaluator {
  public static evaluate(
    cleanGrid: number[][],
    _cleanColors: Record<number, any>,
    sourceAccentAudit: SourceAccentAudit,
    difficulty: EducationalDifficulty
  ): CharacteristicDetailStats {
    let blueCellCount = 0;
    let redCellCount = 0;
    let brownCellCount = 0;
    let creamCellCount = 0;
    let blackCellCount = 0;
    let nonEmptyCellCount = 0;

    for (let r = 0; r < cleanGrid.length; r++) {
      for (let c = 0; c < cleanGrid[r].length; c++) {
        const cellId = cleanGrid[r][c];
        if (cellId !== 0) {
          // If ID 1 is present and the user strictly wants to ignore background white,
          // we could check if it's the actual background. But usually 0 is empty.
          nonEmptyCellCount++;
          
          const family = classifyPaletteIdFamily(cellId);
          if (family === 'blue') blueCellCount++;
          else if (family === 'red') redCellCount++;
          else if (family === 'brown') brownCellCount++;
          else if (family === 'cream') creamCellCount++;
          else if (family === 'black') blackCellCount++;
        }
      }
    }

    const blackForegroundRatio = nonEmptyCellCount > 0 ? blackCellCount / nonEmptyCellCount : 0;

    let missingRequiredAccentCount = 0;
    let detailScore = 100;

    const minAccents = PIPELINE_CONFIG.CHARACTERISTIC_DETAILS.MIN_ACCENT_CELLS[difficulty] || PIPELINE_CONFIG.CHARACTERISTIC_DETAILS.MIN_ACCENT_CELLS['balanced'];

    if (sourceAccentAudit.hasBlueAccent) {
      if (blueCellCount < minAccents.blue) {
        if (blueCellCount === 0) missingRequiredAccentCount++;
        detailScore -= 15 * Math.max(1, minAccents.blue - blueCellCount);
      }
    }

    if (sourceAccentAudit.hasRedAccent) {
      if (redCellCount < minAccents.red) {
        if (redCellCount === 0) missingRequiredAccentCount++;
        detailScore -= 15 * Math.max(1, minAccents.red - redCellCount);
      }
    }

    if (sourceAccentAudit.hasBrownAccent) {
      if (brownCellCount < minAccents.brown) {
        if (brownCellCount === 0) missingRequiredAccentCount++;
        detailScore -= 10 * Math.max(1, minAccents.brown - brownCellCount);
      }
    }

    const maxBlackRatio = PIPELINE_CONFIG.CHARACTERISTIC_DETAILS.MAX_BLACK_FOREGROUND_RATIO[difficulty] || 0.40;
    if (blackForegroundRatio > maxBlackRatio) {
      const excess = blackForegroundRatio - maxBlackRatio;
      detailScore -= (excess * 100) * 2; // Penalize heavy black outlines
    }

    return {
      blueCellCount,
      redCellCount,
      brownCellCount,
      creamCellCount,
      blackCellCount,
      nonEmptyCellCount,
      blackForegroundRatio,
      missingRequiredAccentCount,
      characteristicDetailScore: Math.max(0, detailScore),
    };
  }
}
