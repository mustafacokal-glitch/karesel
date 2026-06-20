import { AnalysisInput, IsolationResult } from './types';

export class ObjectIsolationAnalyzer {
  /**
   * Estimates how clearly the foreground object stands out from the background.
   * Compares the luminance variance and average of the "center" region vs the "perimeter".
   * High contrast/variance difference = good isolation.
   */
  public static analyze(input: AnalysisInput): IsolationResult {
    const { width, height, data } = input.imageData;

    if (width === 0 || height === 0) {
      return { isolationScore: 0, contrastRatio: 0 };
    }

    // Define the "center" as the middle 50% of the image
    const centerStartX = Math.floor(width * 0.25);
    const centerEndX = Math.floor(width * 0.75);
    const centerStartY = Math.floor(height * 0.25);
    const centerEndY = Math.floor(height * 0.75);

    let centerLumaSum = 0;
    let centerPixelCount = 0;

    let perimeterLumaSum = 0;
    let perimeterPixelCount = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Ignore fully transparent pixels
        if (data[idx + 3] === 0) continue;

        const luma = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;

        const isCenter = x >= centerStartX && x <= centerEndX && y >= centerStartY && y <= centerEndY;

        if (isCenter) {
          centerLumaSum += luma;
          centerPixelCount++;
        } else {
          perimeterLumaSum += luma;
          perimeterPixelCount++;
        }
      }
    }

    // If the image is completely empty, isolation is 0
    if (centerPixelCount === 0 && perimeterPixelCount === 0) {
      return { isolationScore: 0, contrastRatio: 0 };
    }

    const centerAvgLuma = centerPixelCount > 0 ? centerLumaSum / centerPixelCount : 0;
    const perimeterAvgLuma = perimeterPixelCount > 0 ? perimeterLumaSum / perimeterPixelCount : 0;

    // Contrast ratio based on luminance absolute difference
    const contrastRatio = Math.abs(centerAvgLuma - perimeterAvgLuma);

    // Normalize contrast ratio to a 0-100 score.
    // A difference of 100+ out of 255 represents extremely strong isolation (e.g., black object on white BG).
    const MAX_EXPECTED_CONTRAST = 80;
    let isolationScore = Math.min((contrastRatio / MAX_EXPECTED_CONTRAST) * 100, 100);

    // Note: If the user uploads a pre-cropped transparent PNG, the perimeter might have 0 pixels.
    // In that case, it is perfectly isolated (100% score) because there is literally no background.
    if (perimeterPixelCount === 0 && centerPixelCount > 0) {
      isolationScore = 100;
    }

    return {
      isolationScore,
      contrastRatio
    };
  }
}
