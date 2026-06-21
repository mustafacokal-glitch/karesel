import { AIQESInput, EvaluationResult } from '../types';

export class MotivationPredictor {
  public static evaluate(input: AIQESInput): EvaluationResult {
    const { originalMetrics, gridRows, gridCols } = input;
    
    // Motivation is heavily tied to the feeling of success vs confusion.
    // If edge density is very high (noisy image) and grid is small, it looks like a blurry mess.
    // This causes immediate demotivation.
    
    let score = 100;
    const recommendations: string[] = [];
    let explanation = "This worksheet hits the 'Goldilocks Zone' - challenging enough to be fun, but clear enough to guarantee success.";

    const isComplex = originalMetrics.edgeDensity > 30 || originalMetrics.colorChaos > 50;
    const isSmallGrid = Math.max(gridRows, gridCols) <= 8;

    if (isComplex && isSmallGrid) {
      score -= 40;
      explanation = "The image is too complex to be represented in such a small grid. The child will not recognize the final result, leading to frustration.";
      recommendations.push("Use a simpler, cartoon-like image for small grids.");
    }

    // "Empty Canvas" demotivation: If it's a huge grid (25x25) but the image is just a tiny ball in the center,
    // they are coloring 500 white background squares and 20 red squares.
    // If isolation is high but edge density is extremely low, it means mostly flat background.
    if (Math.max(gridRows, gridCols) > 20 && originalMetrics.edgeDensity < 5) {
      score -= 30;
      explanation = "The grid is huge but the image lacks detail. The child will spend a long time just coloring flat background squares, which is boring.";
      recommendations.push("Crop the image to the object, or reduce the grid size.");
    }

    return {
      score: Math.max(Math.round(score), 0),
      explanation,
      recommendations
    };
  }
}
