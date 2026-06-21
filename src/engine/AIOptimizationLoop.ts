
import { AgeGroup, Difficulty } from './grid/types';
import { ColorInfo } from './color/types';

import { ShapePreservationEngine, PreservationConfig } from './transform/ShapePreservationEngine';
import { ImageComplexityAnalyzer } from './analysis/ImageComplexityAnalyzer';
import { SmartGridSelector } from './grid/SmartGridSelector';
import { EducationalPaletteOptimizer } from './color/EducationalPaletteOptimizer';
import { AIQESEngine } from './quality/AIQESEngine';
import { AIQESReport } from './quality/types';

export interface OptimizationInput {
  sourceImageData: ImageData;
  rawColors: ColorInfo[];
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  targetScore?: number;
  colorTolerance?: number;
}

export interface OptimizationState {
  cycle: number;
  config: {
    medianRadius: number;
    highContrastMode: boolean;
    maxColorsModifier: number;
    difficultyModifier: Difficulty;
  };
  metrics: {
    gridWidth: number;
    gridHeight: number;
    colorCount: number;
  };
  report: AIQESReport;
}

export class AIOptimizationLoop {
  /**
   * Executes a maximum of 5 cycles to find the best possible educational configuration.
   * Runs asynchronously to prevent blocking the main thread.
   */
  public static async optimize(input: OptimizationInput): Promise<OptimizationState> {
    const targetScore = input.targetScore || 85;
    const MAX_CYCLES = 5;

    let bestState: OptimizationState | null = null;

    // Cycle Configs
    const configs = [
      // Cycle 1: Base heuristics
      { medianRadius: 0, highContrastMode: false, maxColorsModifier: 0, difficultyModifier: input.difficulty },
      // Cycle 2: Simplify details (Add Median Blur)
      { medianRadius: 1, highContrastMode: false, maxColorsModifier: 0, difficultyModifier: input.difficulty },
      // Cycle 3: Reduce Colors (Decrease max colors)
      { medianRadius: 1, highContrastMode: false, maxColorsModifier: -3, difficultyModifier: input.difficulty },
      // Cycle 4: Adjust Grid (Force 'easy' difficulty to lower max bound, or 'advanced' if recognizability is low)
      { medianRadius: 1, highContrastMode: false, maxColorsModifier: -3, difficultyModifier: 'easy' as Difficulty },
      // Cycle 5: Improve contrast (High Contrast Mode as last resort)
      { medianRadius: 2, highContrastMode: true, maxColorsModifier: -5, difficultyModifier: 'easy' as Difficulty }
    ];

    for (let cycle = 0; cycle < MAX_CYCLES; cycle++) {
      const config = configs[cycle];

      // 1. Shape Preservation (Pre-processing)
      const preservationConfig: PreservationConfig = {
        medianRadius: config.medianRadius,
        edgeThreshold: config.highContrastMode ? 30 : 50 // More aggressive edge detection in high contrast
      };
      
      const processedImage = ShapePreservationEngine.apply(input.sourceImageData, preservationConfig);

      // Yield to event loop to keep UI performant
      await new Promise(resolve => setTimeout(resolve, 0));

      // 2. Analyze Image
      const complexityMetrics = ImageComplexityAnalyzer.analyze({ imageData: processedImage });

      // 3. Determine Grid
      const gridRec = SmartGridSelector.recommendGrid({
        metrics: complexityMetrics,
        ageGroup: input.ageGroup,
        difficulty: config.difficultyModifier
      });

      // 4. Optimize Colors
      // Calculate maxColors based on age group baseline
      let baseMaxColors = input.ageGroup === 'kindergarten' ? 5 : 15;
      const optimizedPaletteResult = EducationalPaletteOptimizer.optimizePalette(
        input.rawColors,
        input.ageGroup,
        {
          highContrastMode: config.highContrastMode,
          maxColors: Math.max(baseMaxColors + config.maxColorsModifier, 2),
          tolerance: input.colorTolerance
        }
      );

      // 5. Evaluate via AIQES
      const report = AIQESEngine.generateReport({
        originalMetrics: complexityMetrics,
        optimizedPalette: optimizedPaletteResult.optimizedPalette,
        gridRows: gridRec.recommendedHeight,
        gridCols: gridRec.recommendedWidth,
        ageGroup: input.ageGroup
      });

      const currentState: OptimizationState = {
        cycle: cycle + 1,
        config,
        metrics: {
          gridWidth: gridRec.recommendedWidth,
          gridHeight: gridRec.recommendedHeight,
          colorCount: optimizedPaletteResult.optimizedPalette.length
        },
        report
      };

      // Keep track of the absolute best score
      if (!bestState || report.aiqesScore > bestState.report.aiqesScore) {
        bestState = currentState;
      }

      // If we hit the target score, we can exit early!
      if (report.aiqesScore >= targetScore) {
        break;
      }
    }

    return bestState!;
  }
}
