import { AIQESInput, EvaluationResult } from '../types';

export class ObjectRecognizabilityEvaluator {
  public static evaluate(input: AIQESInput): EvaluationResult {
    const { originalMetrics, gridRows, gridCols } = input;
    const totalBlocks = gridRows * gridCols;

    // Edge density 0-100 represents how complex the image is.
    // If edge density is high (e.g. 80), it requires a lot of blocks to look recognizable.
    // A 25x25 grid has 625 blocks. A 8x8 grid has 64 blocks.
    
    // We expect roughly (edgeDensity / 100) * 1000 blocks for perfect recognizability
    // (This is a heuristic. 100 density = 1000 blocks ~ 31x31 grid).
    const requiredBlocks = (originalMetrics.edgeDensity / 100) * 1000;
    
    let score = 100;
    const recommendations: string[] = [];
    let explanation = "The grid resolution is excellent for recognizing the original object.";

    if (totalBlocks < requiredBlocks) {
      // It's under-sampled
      const deficiency = (requiredBlocks - totalBlocks) / requiredBlocks; // 0 to 1
      score = Math.max(100 - (deficiency * 100), 0);
      
      explanation = "The grid size is too small to capture all the intricate details of the original image.";
      recommendations.push("Increase the grid size (Difficulty) or use a less detailed source image.");
    } else if (totalBlocks > requiredBlocks * 3 && originalMetrics.edgeDensity < 20) {
      // Over-sampled for a very simple image
      score -= 10;
      explanation = "The grid is extremely large for such a simple shape, which might make it harder to recognize up close.";
      recommendations.push("Consider reducing the grid size for a cleaner look.");
    }

    return {
      score: Math.round(score),
      explanation,
      recommendations
    };
  }
}
