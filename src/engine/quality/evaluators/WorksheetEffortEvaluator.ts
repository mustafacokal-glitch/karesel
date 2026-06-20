import { AIQESInput, EvaluationResult } from '../types';

export class WorksheetEffortEvaluator {
  public static evaluate(input: AIQESInput): EvaluationResult {
    const { gridRows, gridCols, optimizedPalette } = input;
    const totalBlocks = gridRows * gridCols;
    const colorCount = optimizedPalette.length;
    
    // Effort is a heuristic: number of blocks * number of colors
    // High colors mean constant pencil switching. High blocks mean lots of coloring.
    const effortIndex = totalBlocks * colorCount;
    
    let score = 100;
    const recommendations: string[] = [];
    let explanation = "The estimated effort to complete this worksheet is reasonable and engaging.";

    // An 8x8 with 4 colors = 256 effort (very fast, maybe 5 mins)
    // A 15x15 with 10 colors = 2250 effort (moderate, 20 mins)
    // A 25x25 with 15 colors = 9375 effort (heavy, 1 hour+)
    if (effortIndex > 6000) {
      score = Math.max(100 - ((effortIndex - 6000) / 100), 20); // Drops score for massive effort
      explanation = "The effort required to complete this worksheet is extremely high. It may feel like 'busywork'.";
      recommendations.push("Decrease the grid size or reduce the number of colors to shorten completion time.");
    } else if (effortIndex < 100) {
      score -= 20;
      explanation = "The worksheet might be completed too quickly to provide educational value.";
      recommendations.push("Increase the grid size or add more color variety.");
    }

    return {
      score: Math.round(score),
      explanation,
      recommendations
    };
  }
}
