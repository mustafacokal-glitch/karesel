import { AIOptimizationLoop, OptimizationInput } from './AIOptimizationLoop';
import { processImageToGrid } from './transform/pixelEngine';
import { AgeGroup, Difficulty } from './grid/types';
import { ColorInfo } from './color/types';
import { PALETTE } from './color/colorDistance';
import { ShapePreservationEngine } from './transform/ShapePreservationEngine';
import { applySmartCleaners } from './grid/gridCleaners';
import { PIPELINE_CONFIG } from '../config/pipelineConfig';
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
    offsetX: number = 0,
    offsetY: number = 0
  ) {
    // 1. Run the AI Optimization Loop to find the perfect configuration
    const input: OptimizationInput = {
      sourceImageData,
      rawColors: PALETTE as ColorInfo[],
      ageGroup,
      difficulty,
      targetScore: 85,
      colorTolerance
    };

    const bestState = await AIOptimizationLoop.optimize(input);

    // 2. We now have the best state. We need to generate the FINAL pixel grid.
    // First, apply the winning shape preservation configuration.
    const finalPreservedImage = ShapePreservationEngine.apply(sourceImageData, {
      medianRadius: bestState.config.medianRadius,
      edgeThreshold: bestState.config.highContrastMode ? 30 : 50
    });

    // 3. Run the classic pixel conversion but with the AI's strict instructions
    // Note: difficultyLevel controls maxColors in classic. We pass difficulty as a fallback.
    const difficultyLevelMap: Record<Difficulty, number> = { easy: 1, balanced: 2, advanced: 3 };
    const numericDifficulty = difficultyLevelMap[difficulty] || 2;
    const pixelGridResult = await processImageToGrid(
      finalPreservedImage,
      bestState.metrics.gridHeight,
      bestState.metrics.gridWidth,
      numericDifficulty,
      offsetX,
      offsetY
    );

    const enableThinning = numericDifficulty >= 4;
    const { cleanGrid, cleanColors } = applySmartCleaners(
      pixelGridResult.pixelGrid, 
      pixelGridResult.colorMap, 
      PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID, 
      enableThinning
    );

    return {
      pixelGrid: cleanGrid,
      colorMap: cleanColors,
      aiqesReport: bestState.report,
      gridDimensions: { width: bestState.metrics.gridWidth, height: bestState.metrics.gridHeight },
      optimizationState: bestState
    };
  }
}
