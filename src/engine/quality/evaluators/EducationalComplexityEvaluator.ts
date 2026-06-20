import { AIQESInput, EvaluationResult } from '../types';

export class EducationalComplexityEvaluator {
  public static evaluate(input: AIQESInput): EvaluationResult {
    const { gridRows, gridCols, ageGroup } = input;
    const maxDimension = Math.max(gridRows, gridCols);
    
    let score = 100;
    const recommendations: string[] = [];
    let explanation = "The grid size is developmentally perfect for this age group.";

    // Educational Standards
    if (ageGroup === 'kindergarten') {
      if (maxDimension > 8) {
        score -= (maxDimension - 8) * 10;
        explanation = "The grid is too large for a kindergarten student. They may struggle to count the squares.";
        recommendations.push("Reduce the grid size to 8x8 or smaller.");
      } else if (maxDimension < 4) {
        score -= 20;
        explanation = "The grid is extremely small, which might not be an engaging activity.";
        recommendations.push("Increase the grid size slightly.");
      }
    } else if (ageGroup === 'grade1-2') {
      if (maxDimension > 15) {
        score -= (maxDimension - 15) * 5;
        explanation = "The grid is too complex for 1st-2nd graders.";
        recommendations.push("Keep the maximum dimension under 15 squares.");
      }
    } else if (ageGroup === 'grade3-4') {
      if (maxDimension > 25) {
        score -= (maxDimension - 25) * 5;
        explanation = "The grid is very large and may cause fatigue even for older primary students.";
        recommendations.push("Consider keeping the grid under 25x25.");
      } else if (maxDimension < 10) {
        score -= 15;
        explanation = "The activity might be too simple and unengaging for 3rd-4th graders.";
        recommendations.push("Increase the grid size to provide an appropriate challenge.");
      }
    }

    return {
      score: Math.max(Math.round(score), 0),
      explanation,
      recommendations
    };
  }
}
