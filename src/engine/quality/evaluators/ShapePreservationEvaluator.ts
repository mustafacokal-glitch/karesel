import { AIQESInput, EvaluationResult } from '../types';

export class ShapePreservationEvaluator {
  public static evaluate(input: AIQESInput): EvaluationResult {
    const { originalMetrics } = input;
    
    // Isolation score tells us if the foreground is separated from the background
    const isolation = originalMetrics.objectIsolation;
    
    let score = 100;
    const recommendations: string[] = [];
    let explanation = "The object's shape is well preserved and stands out from the background.";

    if (isolation < 40) {
      score = isolation * 2; // Scales 40 down to 80, 20 down to 40, etc.
      explanation = "The object blends into the background, which might cause the shape to be lost during pixelation.";
      recommendations.push("Use an image with a clearer, solid background.");
      recommendations.push("Ensure the object is centered and takes up most of the image.");
    }

    // Check aspect ratio distortion
    // In our system, grids might be perfectly square (8x8) but the image is wide (aspectRatio = 2)
    // If the image is heavily squashed, shape is not preserved.
    // However, our SmartGridSelector tries to preserve ratio (e.g. 15x8).
    // The AIQES should evaluate if the final gridRows/gridCols matches the original aspect ratio.
    const gridRatio = input.gridCols / input.gridRows;
    const ratioDifference = Math.abs(gridRatio - originalMetrics.aspectRatio);

    if (ratioDifference > 0.3) {
      score -= 20;
      explanation += " The final grid severely distorts the original image proportions.";
      recommendations.push("Allow the grid to be rectangular rather than forcing a square.");
    }

    return {
      score: Math.max(Math.round(score), 0),
      explanation,
      recommendations
    };
  }
}
