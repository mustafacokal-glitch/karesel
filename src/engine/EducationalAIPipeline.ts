import { AIOptimizationLoop, OptimizationInput } from './AIOptimizationLoop';
import { AgeGroup, Difficulty } from './grid/types';
import { getPaletteFromPolicy } from './color/PalettePolicy';
export class EducationalAIPipeline {
  /**
   * Complete pipeline: takes the original uploaded image, finds the optimal configuration,
   * generates the final pixel grid, and returns it alongside the AIQES report.
   */
  public static async execute(
    sourceImageData: ImageData,
    ageGroup: AgeGroup,
    difficulty: Difficulty,
    colorTolerance: number = 50,
    _offsetX: number = 0,
    _offsetY: number = 0,
    intent: import('./grid/types').ProcessingIntent = 'educational'
  ) {
    let numericDifficulty = 2;
    if (intent === 'fidelity') {
      const diffMap: Record<Difficulty, number> = { easy: 2, balanced: 3, advanced: 4, expert: 5 };
      numericDifficulty = diffMap[difficulty] || 3;
    } else {
      const diffMap: Record<Difficulty, number> = { easy: 1, balanced: 2, advanced: 3, expert: 3 };
      numericDifficulty = diffMap[difficulty] || 2;
    }

    const allowedPalette = getPaletteFromPolicy({
      mode: intent,
      difficultyLevel: numericDifficulty,
      ageGroup
    }, sourceImageData);

    // 1. Run the AI Optimization Loop to find the perfect configuration
    const input: OptimizationInput = {
      sourceImageData,
      rawColors: allowedPalette,
      ageGroup,
      difficulty,
      targetScore: 85,
      colorTolerance,
      intent
    };

    const bestState = await AIOptimizationLoop.optimize(input);

    // 2. Extract final grid from the winning state
    if (!bestState.gridData) {
      throw new Error('AIOptimizationLoop failed to return final gridData');
    }

    return {
      pixelGrid: bestState.gridData.pixelGrid,
      colorMap: bestState.gridData.colorMap,
      aiqesReport: bestState.report,
      gridDimensions: { width: bestState.metrics.gridWidth, height: bestState.metrics.gridHeight },
      optimizationState: bestState
    };
  }
}
