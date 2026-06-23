
import { AgeGroup, Difficulty, DIFFICULTY_GRID_PROFILES, EducationalDifficulty } from './grid/types';
import { ColorInfo } from './color/types';

import { ShapePreservationEngine, PreservationConfig } from './transform/ShapePreservationEngine';
import { ImageComplexityAnalyzer } from './analysis/ImageComplexityAnalyzer';
import { SmartGridSelector } from './grid/SmartGridSelector';
import { EducationalPaletteOptimizer } from './color/EducationalPaletteOptimizer';
import { AIQESEngine } from './quality/AIQESEngine';
import { AIQESReport } from './quality/types';
import { KeyFeaturePreservationEngine } from './transform/KeyFeaturePreservationEngine';
import { SourceAccentAuditEngine } from './analysis/SourceAccentAuditEngine';
import { CharacteristicDetailEvaluator, CharacteristicDetailStats } from './quality/CharacteristicDetailEvaluator';
import { processImageToGrid } from './transform/pixelEngine';
import { applySmartCleaners } from './grid/gridCleaners';
import { PIPELINE_CONFIG } from '../config/pipelineConfig';

export interface OptimizationInput {
  sourceImageData: ImageData;
  rawColors: ColorInfo[];
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  targetScore?: number;
  colorTolerance?: number;
  intent?: import('./grid/types').ProcessingIntent;
}

export interface OptimizationState {
  cycle: number;
  config: {
    medianRadius: number;
    highContrastMode: boolean;
    maxColorsModifier: number;
    difficultyModifier: Difficulty;
    edgeMode?: 'silhouette-only' | 'preserve-source-color' | 'force-black';
  };
  metrics: {
    gridWidth: number;
    gridHeight: number;
    colorCount: number;
    blackCellRatio?: number;
    rejectedBlackCellCount?: number;
    fallbackColorUsageCount?: number;
  };
  gridData?: {
    pixelGrid: number[][];
    colorMap: Record<number, any>;
  };
  report: AIQESReport;
  characteristicDetailStats?: CharacteristicDetailStats;
  finalSelectionScore?: number;
}

export class AIOptimizationLoop {
  /**
   * Executes a maximum of 5 cycles to find the best possible educational configuration.
   * Runs asynchronously to prevent blocking the main thread.
   */
  public static async optimize(input: OptimizationInput): Promise<OptimizationState> {
    const targetScore = input.targetScore || 85;
    let bestAllowedState: OptimizationState | null = null;
    let fallbackState: OptimizationState | null = null;
    let closestTargetDiff = Infinity;
    
    let configs = [];
    if (input.intent === 'pedagogical-fidelity') {
      configs = [
        // 1. High-detail baseline
        { medianRadius: 0, highContrastMode: false, maxColorsModifier: 0, difficultyModifier: input.difficulty },
        // 2. Simplification (Blur + reduce colors)
        { medianRadius: 1, highContrastMode: false, maxColorsModifier: -2, difficultyModifier: input.difficulty },
        // 3. Max color detail (No blur, increase colors)
        { medianRadius: 0, highContrastMode: false, maxColorsModifier: 2, difficultyModifier: input.difficulty },
        // 4. Force balanced grid
        { medianRadius: 0, highContrastMode: false, maxColorsModifier: -1, difficultyModifier: input.difficulty },
        // 5. Force easy grid + high contrast + reduced colors (Simplest worksheet)
        { medianRadius: 1, highContrastMode: true, maxColorsModifier: -3, difficultyModifier: input.difficulty },
        // 6. Force advanced grid (Highest recognizable detail)
        { medianRadius: 2, highContrastMode: false, maxColorsModifier: 0, difficultyModifier: input.difficulty },
      ];
    } else {
      configs = [
        // Cycle 1: Base heuristics
        { medianRadius: 0, highContrastMode: false, maxColorsModifier: 0, difficultyModifier: input.difficulty },
        // Cycle 2: Simplify details (Add Median Blur)
        { medianRadius: 1, highContrastMode: false, maxColorsModifier: 0, difficultyModifier: input.difficulty },
        // Cycle 3: Reduce Colors (Decrease max colors)
        { medianRadius: 1, highContrastMode: false, maxColorsModifier: -3, difficultyModifier: input.difficulty },
        // Cycle 4: Adjust Grid
        { medianRadius: 1, highContrastMode: false, maxColorsModifier: -3, difficultyModifier: input.difficulty },
        // Cycle 5: Improve contrast
        { medianRadius: 2, highContrastMode: true, maxColorsModifier: -5, difficultyModifier: input.difficulty }
      ];
    }

    const MAX_CYCLES = configs.length;
    
    // Analyze key features once before the loop
    const featureMask = KeyFeaturePreservationEngine.analyze(input.sourceImageData, input.intent || 'educational');
    const sourceAccentAudit = SourceAccentAuditEngine.analyze(input.sourceImageData);

    for (let cycle = 0; cycle < MAX_CYCLES; cycle++) {
      const config = configs[cycle];

      let edgeMode: 'silhouette-only' | 'preserve-source-color' | 'force-black' = 'silhouette-only';
      let darkenFactor = 0.85;

      if (input.intent === 'fidelity') {
        edgeMode = 'preserve-source-color';
        darkenFactor = 0.90;
      } else if (input.intent === 'pedagogical-fidelity') {
        darkenFactor = 0.85;
        if (input.ageGroup === 'grade3' || input.ageGroup === 'grade4') {
          edgeMode = 'preserve-source-color';
        } else {
          edgeMode = 'silhouette-only';
        }
      }

      // 1. Shape Preservation (Pre-processing)
      const preservationConfig: PreservationConfig = {
        medianRadius: config.medianRadius,
        edgeThreshold: config.highContrastMode ? 30 : 50, // More aggressive edge detection in high contrast
        edgeMode,
        internalEdgeDarkenFactor: darkenFactor
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
        difficulty: config.difficultyModifier,
        intent: input.intent,
        hasImportantFeatures: Array.from(featureMask.features.values()).some(f => f.type === 'eye' || f.type === 'nose')
      });

      // 4. Optimize Colors
      // Calculate maxColors based on age group baseline
      let baseMaxColors = input.ageGroup === 'kindergarten' ? 5 : 15;
      if (input.intent === 'pedagogical-fidelity') {
        if (input.ageGroup === 'grade4') {
          baseMaxColors = (config.difficultyModifier === 'advanced' || config.difficultyModifier === 'expert') ? 19 : 17;
        } else if (input.ageGroup === 'grade3') {
          baseMaxColors = 14;
        }
      }
      const optimizedPaletteResult = EducationalPaletteOptimizer.optimizePalette(
        input.rawColors,
        input.ageGroup,
        {
          highContrastMode: config.highContrastMode,
          maxColors: Math.max(baseMaxColors + config.maxColorsModifier, 2),
          tolerance: input.colorTolerance,
          requiredAccentFamilies: input.intent === 'pedagogical-fidelity' ? sourceAccentAudit.requiredAccentFamilies : undefined
        }
      );

      // 5. Generate Candidate Pixel Grid
      const numericDifficulty = config.difficultyModifier === 'easy' ? 1 : config.difficultyModifier === 'balanced' ? 2 : config.difficultyModifier === 'advanced' ? 3 : 4;
      const gridOptions = { allowedPalette: optimizedPaletteResult.optimizedPalette, featureMask, metrics: {} as any };
      const pixelGridResult = await processImageToGrid(
        processedImage,
        gridRec.recommendedHeight,
        gridRec.recommendedWidth,
        numericDifficulty,
        0, 0,
        gridOptions
      );

      const enableThinning = numericDifficulty >= 4;
      const { cleanGrid, cleanColors } = applySmartCleaners(
        pixelGridResult.pixelGrid, 
        pixelGridResult.colorMap, 
        PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID, 
        enableThinning,
        pixelGridResult.foregroundCoverageGrid,
        0.30,
        pixelGridResult.protectedCells,
        pixelGridResult.featureConfidenceGrid
      );

      // 6. Calculate Key Feature Retention
      let preservedFeatures = 0;
      let totalConfidence = 0;
      let eyeScore = 0, noseScore = 0, mouthScore = 0, whiskerScore = 0;
      if (input.intent === 'pedagogical-fidelity' && featureMask.features.size > 0) {
        let eyeC = 0, noseC = 0, mouthC = 0, whiskerC = 0;
        let eyeT = 0, noseT = 0, mouthT = 0, whiskerT = 0;
        
        for (const feat of featureMask.features.values()) {
          if (feat.type === 'eye') eyeT++;
          else if (feat.type === 'nose') noseT++;
          else if (feat.type === 'mouth') mouthT++;
          else if (feat.type === 'whisker') whiskerT++;
        }

        for (let r = 0; r < cleanGrid.length; r++) {
           for (let c = 0; c < cleanGrid[0].length; c++) {
              if (pixelGridResult.featureTypeGrid[r] && pixelGridResult.featureTypeGrid[r][c] !== 'none') {
                 // The grid actually contains a protected cell override
                 if (pixelGridResult.featureConfidenceGrid[r] && pixelGridResult.featureConfidenceGrid[r][c] > 0.05) {
                    const type = pixelGridResult.featureTypeGrid[r][c];
                    // Feature is somewhat confidently represented here
                    preservedFeatures++;
                    totalConfidence += pixelGridResult.featureConfidenceGrid[r][c];
                    
                    if (type === 'eye') eyeC++;
                    else if (type === 'nose') noseC++;
                    else if (type === 'mouth') mouthC++;
                    else if (type === 'whisker') whiskerC++;
                 }
              }
           }
        }
        
        eyeScore = eyeT > 0 ? Math.min(100, (eyeC / (eyeT * 2)) * 100) : 100;
        noseScore = noseT > 0 ? Math.min(100, (noseC / (noseT * 2)) * 100) : 100;
        mouthScore = mouthT > 0 ? Math.min(100, (mouthC / (mouthT * 2)) * 100) : 100;
        whiskerScore = whiskerT > 0 ? Math.min(100, (whiskerC / (whiskerT * 2)) * 100) : 100;

        // Normalize
        preservedFeatures = Math.min(featureMask.features.size, Math.floor(preservedFeatures / 2)); // rough estimate
      }

      // 7. Evaluate via AIQES
      const report = AIQESEngine.generateReport({
        originalMetrics: complexityMetrics,
        optimizedPalette: Object.values(cleanColors),
        gridRows: gridRec.recommendedHeight,
        gridCols: gridRec.recommendedWidth,
        ageGroup: input.ageGroup,
        intent: input.intent,
        keyFeatureStats: {
          originalCount: featureMask.features.size,
          preservedCount: preservedFeatures,
          avgConfidence: totalConfidence / Math.max(1, preservedFeatures),
          locationMatch: 1.0, // Assumed good if preserved
          colorMatch: 1.0,     // Assumed good if preserved
          eyeScore,
          noseScore,
          mouthScore,
          whiskerScore
        }
      });

      const characteristicDetailStats = input.intent === 'pedagogical-fidelity' 
        ? CharacteristicDetailEvaluator.evaluate(cleanGrid, cleanColors, sourceAccentAudit, input.difficulty as EducationalDifficulty)
        : undefined;

      const finalSelectionScore = characteristicDetailStats 
        ? (report.aiqesScore * 0.4) + (characteristicDetailStats.characteristicDetailScore * 0.6)
        : report.aiqesScore;

      const currentState: OptimizationState = {
        cycle: cycle + 1,
        config: { ...config, edgeMode } as any, // Attach edgeMode for tracking
        metrics: {
          gridWidth: gridRec.recommendedWidth,
          gridHeight: gridRec.recommendedHeight,
          colorCount: Object.keys(cleanColors).length,
          blackCellRatio: (gridOptions.metrics?.blackCells || 0) / (gridRec.recommendedWidth * gridRec.recommendedHeight),
          rejectedBlackCellCount: gridOptions.metrics?.rejectedBlackCells || 0,
          fallbackColorUsageCount: gridOptions.metrics?.fallbackColorUsage || 0
        },
        gridData: {
          pixelGrid: cleanGrid,
          colorMap: cleanColors
        },
        report,
        characteristicDetailStats,
        finalSelectionScore
      };

      // Candidate Reporting
      if (input.intent === 'pedagogical-fidelity') {
        console.log(`=== Candidate Report [Cycle ${currentState.cycle}] ===`);
        console.table({
          gridSize: `${currentState.metrics.gridWidth}x${currentState.metrics.gridHeight}`,
          maxColors: currentState.metrics.colorCount,
          blackCellRatio: currentState.metrics.blackCellRatio,
          rejectedBlackCellCount: currentState.metrics.rejectedBlackCellCount,
          fallbackColorUsageCount: currentState.metrics.fallbackColorUsageCount,
          eyeScore,
          noseScore,
          mouthScore,
          whiskerScore,
          keyFeatureRetentionScore: report.keyFeatureRetention?.score,
          originalSimilarityScore: report.originalSimilarity?.score,
          educationalUsabilityScore: report.educationalUsability?.score,
          printabilityScore: report.printability?.score,
          aiqesScore: report.aiqesScore,
          characteristicDetailScore: currentState.characteristicDetailStats?.characteristicDetailScore,
          finalSelectionScore: currentState.finalSelectionScore
        });
      }

      // Candidate filtering
      let isAllowed = true;
      if (input.intent === 'pedagogical-fidelity') {
        const profile = DIFFICULTY_GRID_PROFILES[input.difficulty as EducationalDifficulty];
        const majorAxis = Math.max(currentState.metrics.gridWidth, currentState.metrics.gridHeight);
        if (majorAxis < profile.minSize || majorAxis > profile.maxSize || currentState.metrics.colorCount > profile.maxColors) {
          isAllowed = false;
        }
      }

      if (isAllowed) {
        if (!bestAllowedState || currentState.finalSelectionScore! > bestAllowedState.finalSelectionScore!) {
          bestAllowedState = currentState;
        }
      } else {
        if (input.intent === 'pedagogical-fidelity') {
          const profile = DIFFICULTY_GRID_PROFILES[input.difficulty as EducationalDifficulty];
          const majorAxis = Math.max(currentState.metrics.gridWidth, currentState.metrics.gridHeight);
          const diff = Math.abs(majorAxis - profile.targetSize);
          if (!fallbackState || diff < closestTargetDiff || (diff === closestTargetDiff && currentState.finalSelectionScore! > fallbackState.finalSelectionScore!)) {
            fallbackState = currentState;
            closestTargetDiff = diff;
          }
        } else {
          if (!fallbackState || currentState.finalSelectionScore! > fallbackState.finalSelectionScore!) {
            fallbackState = currentState;
          }
        }
      }

      // If we hit the target score, we can exit early!
      if (input.intent !== 'pedagogical-fidelity' && report.aiqesScore >= targetScore && isAllowed) {
        break;
      }
    }

    let finalBestState: OptimizationState;
    if (bestAllowedState) {
      finalBestState = bestAllowedState;
      console.info('[KARESEL] Candidate selected', {
        requestedDifficulty: input.difficulty,
        selectedGridSize: Math.max(finalBestState.metrics.gridWidth, finalBestState.metrics.gridHeight),
        selectedColorCount: finalBestState.metrics.colorCount,
        aiqesScore: finalBestState.report.aiqesScore
      });
    } else {
      finalBestState = fallbackState!;
      console.warn('[KARESEL] Difficulty fallback used', {
        requestedDifficulty: input.difficulty,
        reason: 'No candidate matched strict grid profile bounds'
      });
    }

    return finalBestState;
  }
}
