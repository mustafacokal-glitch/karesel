import { GridRecommendation, GridSelectionInput } from './types';

export class SmartGridSelector {
  /**
   * Recommends the optimal pixel grid size based on educational constraints and image complexity.
   */
  public static recommendGrid(input: GridSelectionInput): GridRecommendation {
    const { metrics, ageGroup, difficulty } = input;

    // 1. Determine bounds based on Educational Standards
    let minBound = 4;
    let maxBound = 8;

    switch (ageGroup) {
      case 'kindergarten':
        minBound = 4;
        maxBound = 8;
        break;
      case 'grade1-2':
        minBound = 8;
        maxBound = 15;
        break;
      case 'grade3-4':
        minBound = 15;
        maxBound = 25;
        break;
    }

    // 2. Adjust target max scale based on difficulty
    // 'easy' scales down, 'advanced' pushes to max allowed.
    let targetMax = Math.round((minBound + maxBound) / 2); // default balanced
    if (difficulty === 'easy') {
      targetMax = minBound;
    } else if (difficulty === 'advanced') {
      targetMax = maxBound;
    }

    // Adjust targetMax based on complexity: highly complex images push towards the upper bound of the difficulty scale
    if (metrics.overallComplexityScore > 80 && targetMax < maxBound) {
      targetMax = Math.min(targetMax + 3, maxBound);
    } else if (metrics.overallComplexityScore < 20 && targetMax > minBound) {
      targetMax = Math.max(targetMax - 3, minBound);
    }

    // Ensure we don't violate the absolute maximums for the age group
    targetMax = Math.min(Math.max(targetMax, minBound), maxBound);

    // 3. Apply aspect ratio
    let recommendedWidth = targetMax;
    let recommendedHeight = targetMax;

    if (metrics.aspectRatio > 1) {
      // Wide image
      recommendedHeight = Math.max(Math.round(targetMax / metrics.aspectRatio), 4);
    } else if (metrics.aspectRatio < 1) {
      // Tall image
      recommendedWidth = Math.max(Math.round(targetMax * metrics.aspectRatio), 4);
    }

    // 4. Calculate Confidence Score
    let confidenceScore = 100;
    
    // Penalize if the image is highly complex but we are restricted to a tiny grid
    if (metrics.overallComplexityScore > 75 && maxBound <= 8) {
      confidenceScore -= 30; // Hard to represent complex objects in 8x8
    }
    
    // Penalize if the image is too simple but we are forcing a massive grid
    if (metrics.overallComplexityScore < 15 && targetMax > 20) {
      confidenceScore -= 20; // Overkill
    }

    confidenceScore = Math.max(confidenceScore, 0);

    // 5. Generate Explanation
    let explanation = `Grid set to ${recommendedWidth}x${recommendedHeight} based on ${ageGroup} standards.`;
    if (metrics.aspectRatio !== 1) {
      explanation += ` Scaled to preserve the original image aspect ratio.`;
    }
    if (confidenceScore < 80) {
      explanation += ` Warning: The image complexity might not translate perfectly at this restricted grid size.`;
    } else {
      explanation += ` This provides a perfect balance of recognizable detail and educational simplicity.`;
    }

    return {
      recommendedWidth,
      recommendedHeight,
      confidenceScore,
      explanation
    };
  }
}
