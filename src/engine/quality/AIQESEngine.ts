import { AIQESInput, AIQESReport } from './types';
import { ObjectRecognizabilityEvaluator } from './evaluators/ObjectRecognizabilityEvaluator';
import { ShapePreservationEvaluator } from './evaluators/ShapePreservationEvaluator';
import { EducationalComplexityEvaluator } from './evaluators/EducationalComplexityEvaluator';
import { ColorSimplicityEvaluator } from './evaluators/ColorSimplicityEvaluator';
import { WorksheetEffortEvaluator } from './evaluators/WorksheetEffortEvaluator';
import { MotivationPredictor } from './evaluators/MotivationPredictor';

export class AIQESEngine {
  /**
   * Generates a comprehensive AI Quality Evaluation System report.
   * Does NOT modify the image or pipeline; acts as an independent "Robot Teacher".
   */
  public static generateReport(input: AIQESInput): AIQESReport {
    const recognizability = ObjectRecognizabilityEvaluator.evaluate(input);
    const shapePreservation = ShapePreservationEvaluator.evaluate(input);
    const educationalComplexity = EducationalComplexityEvaluator.evaluate(input);
    const colorSimplicity = ColorSimplicityEvaluator.evaluate(input);
    const worksheetEffort = WorksheetEffortEvaluator.evaluate(input);
    const motivation = MotivationPredictor.evaluate(input);

    let originalSimilarity;
    let educationalUsability;
    let printability;
    let keyFeatureRetention;

    if (input.intent === 'fidelity') {
      originalSimilarity = {
        score: 100, // Placeholder for future metric
        explanation: "Original similarity is prioritized in fidelity mode.",
        recommendations: []
      };
    } else if (input.intent === 'pedagogical-fidelity') {
      /**
       * 1. OriginalSimilarityScore
       * Input: shapePreservation score, recognizability score, and total extracted colors.
       * Formula: (Shape * 0.4) + (Recognizability * 0.4) + (Color Count Ratio * 0.2)
       * Range: 0 - 100
       * Impact: High similarity score prevents the optimization loop from selecting over-blurred or stripped candidates.
       */
      const shapeScore = shapePreservation.score;
      const recognizabilityScore = recognizability.score;
      const colorSimDelta = Math.min(100, 50 + (input.optimizedPalette.length * 2.5));
      originalSimilarity = {
        score: Math.round(shapeScore * 0.4 + recognizabilityScore * 0.4 + colorSimDelta * 0.2),
        explanation: "Heuristic evaluation of silhouette, shape, and color similarity.",
        recommendations: []
      };

      /**
       * 2. EducationalUsabilityScore
       * Input: educationalComplexity score, colorSimplicity score
       * Formula: (Educational Complexity * 0.6) + (Color Simplicity * 0.4)
       * Range: 0 - 100
       * Impact: Prevents candidates that use too many colors or too high of a grid for the selected ageGroup.
       */
      educationalUsability = {
        score: Math.round(educationalComplexity.score * 0.6 + colorSimplicity.score * 0.4),
        explanation: "Heuristic evaluation combining grid complexity and color limits.",
        recommendations: []
      };

      /**
       * 3. PrintabilityScore
       * Input: max(Grid Rows, Grid Cols), and number of colors
       * Formula: 100 - (20 if maxDim >= 35) - (15 if colors >= 18)
       * Range: 65 - 100
       * Impact: Penalizes candidates that would result in cells too small to color or legends that wrap awkwardly on A4 paper.
       */
      let printScore = 100;
      const maxDim = Math.max(input.gridRows, input.gridCols);
      if (maxDim >= 35) printScore -= 20;
      if (input.optimizedPalette.length >= 18) printScore -= 15;
      printability = {
        score: Math.max(0, printScore),
        explanation: "Heuristic evaluation of A4 printability, cell visibility, and legend length.",
        recommendations: []
      };

      /**
       * 4. KeyFeatureRetentionScore
       * Input: keyFeatureStats (FeaturePresenceScore, FeatureLocationScore, FeatureColorScore)
       * Formula: Presence * 0.35 + Location * 0.25 + Color * 0.20 + Approximation * 0.20
       */
      let retentionScore = 100;
      if (input.keyFeatureStats && input.keyFeatureStats.originalCount > 0) {
        const stats = input.keyFeatureStats;
        const presenceScore = (stats.preservedCount / stats.originalCount) * 100;
        const approxScore = stats.avgConfidence * 100;
        const eScore = stats.eyeScore ?? 100;
        const nScore = stats.noseScore ?? 100;
        const mScore = stats.mouthScore ?? 100;
        const wScore = stats.whiskerScore ?? 100;
        
        retentionScore = Math.round(
          (eScore * 0.30) +
          (nScore * 0.20) +
          (mScore * 0.15) +
          (wScore * 0.15) +
          (presenceScore * 0.10) +
          (approxScore * 0.10)
        );
      }
      keyFeatureRetention = {
        score: Math.min(100, Math.max(0, retentionScore)),
        explanation: "Heuristic evaluation of key facial/object feature preservation.",
        recommendations: []
      };
    }

    // AIQES Weighted Formula
    // Recognizability: 25%
    // Shape Preservation: 20%
    // Color Simplicity: 20%
    // Educational Complexity: 15%
    // Effort: 10%
    // Motivation: 10%

    let aiqesScore = 0;
    if (input.intent === 'pedagogical-fidelity' && originalSimilarity && educationalUsability && printability && keyFeatureRetention) {
      aiqesScore = (originalSimilarity.score * 0.40) + (educationalUsability.score * 0.25) + (printability.score * 0.10) + (keyFeatureRetention.score * 0.25);
    } else {
      aiqesScore = 
        (recognizability.score * 0.25) +
        (shapePreservation.score * 0.20) +
        (colorSimplicity.score * 0.20) +
        (educationalComplexity.score * 0.15) +
        (worksheetEffort.score * 0.10) +
        (motivation.score * 0.10);
    }

    return {
      aiqesScore: Math.round(aiqesScore),
      recognizability,
      shapePreservation,
      educationalComplexity,
      colorSimplicity,
      worksheetEffort,
      motivation,
      ...(originalSimilarity && { originalSimilarity }),
      ...(educationalUsability && { educationalUsability }),
      ...(printability && { printability }),
      ...(keyFeatureRetention && { keyFeatureRetention })
    };
  }
}
