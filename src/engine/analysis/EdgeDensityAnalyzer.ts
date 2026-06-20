import { AnalysisInput, EdgeResult } from './types';

export class EdgeDensityAnalyzer {
  /**
   * Calculates the edge density of an image using a lightweight Sobel operator.
   * Returns a score from 0-100 representing how "detailed" or "complex" the structure is.
   */
  public static analyze(input: AnalysisInput): EdgeResult {
    const { width, height, data } = input.imageData;
    
    let edgeCount = 0;
    const threshold = 50; // Minimum gradient magnitude to be considered an edge

    // Iterate through pixels, excluding a 1-pixel border
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        // Ignore fully transparent pixels
        if (data[idx + 3] === 0) continue;

        // To keep it lightweight, we calculate a simplified luminance approximation 
        // for the surrounding pixels directly.
        const tl = this.getLuminance(data, (y - 1) * width + (x - 1));
        const tc = this.getLuminance(data, (y - 1) * width + x);
        const tr = this.getLuminance(data, (y - 1) * width + (x + 1));
        const cl = this.getLuminance(data, y * width + (x - 1));
        const cr = this.getLuminance(data, y * width + (x + 1));
        const bl = this.getLuminance(data, (y + 1) * width + (x - 1));
        const bc = this.getLuminance(data, (y + 1) * width + x);
        const br = this.getLuminance(data, (y + 1) * width + (x + 1));

        // Sobel kernels
        // Gx:
        // -1  0  1
        // -2  0  2
        // -1  0  1
        const gx = -tl - 2 * cl - bl + tr + 2 * cr + br;

        // Gy:
        // -1 -2 -1
        //  0  0  0
        //  1  2  1
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

        const magnitude = Math.sqrt(gx * gx + gy * gy);

        if (magnitude > threshold) {
          edgeCount++;
        }
      }
    }

    const totalPixels = width * height;
    
    // Density represents the percentage of pixels that are edges.
    // 0% -> solid color. > 15% -> highly noisy/complex image.
    // We normalize this to a 0-100 score.
    const rawDensity = edgeCount / totalPixels;
    
    // Let's assume a density of 0.15 (15%) maps to a score of 100.
    const MAX_EXPECTED_DENSITY = 0.15;
    let edgeDensityScore = Math.min((rawDensity / MAX_EXPECTED_DENSITY) * 100, 100);

    return {
      edgeDensityScore,
      totalEdges: edgeCount
    };
  }

  private static getLuminance(data: Uint8ClampedArray, pixelIndex: number): number {
    const idx = pixelIndex * 4;
    // Standard RGB to Luminance formula (simplified for performance)
    return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
  }
}
