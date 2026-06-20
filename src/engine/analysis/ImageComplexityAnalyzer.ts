import { AnalysisInput, ComplexityResult } from './types';
import { EdgeDensityAnalyzer } from './EdgeDensityAnalyzer';
import { ColorDistributionAnalyzer } from './ColorDistributionAnalyzer';
import { ObjectIsolationAnalyzer } from './ObjectIsolationAnalyzer';

export class ImageComplexityAnalyzer {
  /**
   * Evaluates the overall visual complexity of the image by orchestrating sub-analyzers.
   */
  public static analyze(input: AnalysisInput): ComplexityResult {
    const edgeResult = EdgeDensityAnalyzer.analyze(input);
    const colorResult = ColorDistributionAnalyzer.analyze(input);
    const isolationResult = ObjectIsolationAnalyzer.analyze(input);

    // Calculate Aspect Ratio
    const width = input.imageData.width;
    const height = input.imageData.height;
    const aspectRatio = height > 0 ? width / height : 1;

    // Weighting logic for overall complexity
    // Edges contribute 40%
    // Color chaos contributes 40%
    // Poor isolation contributes 20% (inverted isolation score)
    const edgeWeight = 0.4;
    const colorWeight = 0.4;
    const isolationWeight = 0.2;

    const poorIsolationPenalty = 100 - isolationResult.isolationScore;

    const overallComplexityScore = 
      (edgeResult.edgeDensityScore * edgeWeight) +
      (colorResult.colorChaosScore * colorWeight) +
      (poorIsolationPenalty * isolationWeight);

    return {
      overallComplexityScore: Math.min(overallComplexityScore, 100),
      edgeDensity: edgeResult.edgeDensityScore,
      colorChaos: colorResult.colorChaosScore,
      objectIsolation: isolationResult.isolationScore,
      aspectRatio
    };
  }
}
