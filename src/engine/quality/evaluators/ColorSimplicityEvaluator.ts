import { AIQESInput, EvaluationResult } from '../types';

export class ColorSimplicityEvaluator {
  public static evaluate(input: AIQESInput): EvaluationResult {
    const { optimizedPalette, ageGroup } = input;
    const colorCount = optimizedPalette.length;
    
    let score = 100;
    const recommendations: string[] = [];
    let explanation = "The color palette is well balanced and distinct.";

    if (ageGroup === 'kindergarten') {
      if (colorCount > 5) {
        score -= (colorCount - 5) * 15;
        explanation = "There are too many colors for a kindergarten student. It might cause cognitive overload.";
        recommendations.push("Use a simpler image or enable High Contrast Mode to merge similar colors.");
      }
    } else {
      if (colorCount > 15) {
        score -= (colorCount - 15) * 5;
        explanation = "The palette is very large, which means the child will spend a lot of time switching pencils.";
        recommendations.push("Reduce the palette size to improve focus.");
      }
    }

    if (colorCount === 1) {
      score -= 50;
      explanation = "The image is monochromatic and won't make for an interesting coloring activity.";
      recommendations.push("Use a colorful source image.");
    }

    return {
      score: Math.max(Math.round(score), 0),
      explanation,
      recommendations
    };
  }
}
