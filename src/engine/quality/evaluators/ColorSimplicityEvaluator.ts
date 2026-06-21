import { AIQESInput, EvaluationResult } from '../types';

export class ColorSimplicityEvaluator {
  public static evaluate(input: AIQESInput): EvaluationResult {
    const { optimizedPalette, ageGroup, intent } = input;
    const colorCount = optimizedPalette.length;

    if (intent === 'fidelity') {
      return {
        score: 100,
        explanation: `Fidelity mode permits rich palettes to preserve original similarity. (${colorCount} colors used)`,
        recommendations: []
      };
    }
    
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
