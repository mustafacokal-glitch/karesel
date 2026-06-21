import { describe, it, expect } from 'vitest';
import { EdgeDensityAnalyzer } from '../EdgeDensityAnalyzer';
import { ColorDistributionAnalyzer } from '../ColorDistributionAnalyzer';
import { ObjectIsolationAnalyzer } from '../ObjectIsolationAnalyzer';
import { ImageComplexityAnalyzer } from '../ImageComplexityAnalyzer';


describe('KARESEL Image Analysis Engine', () => {
  
  // Helper to create a fake ImageData
  const createFakeImageData = (width: number, height: number, fillR: number, fillG: number, fillB: number): ImageData => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = fillR;
      data[i + 1] = fillG;
      data[i + 2] = fillB;
      data[i + 3] = 255; // Fully opaque
    }
    return { width, height, data } as ImageData;
  };

  it('EdgeDensityAnalyzer should return 0 for a solid color block', () => {
    const solidImage = createFakeImageData(100, 100, 255, 0, 0); // Solid Red
    const result = EdgeDensityAnalyzer.analyze({ imageData: solidImage });
    expect(result.edgeDensityScore).toBe(0);
    expect(result.totalEdges).toBe(0);
  });

  it('ColorDistributionAnalyzer should return low chaos for a solid color', () => {
    const solidImage = createFakeImageData(100, 100, 255, 0, 0); // Solid Red
    const result = ColorDistributionAnalyzer.analyze({ imageData: solidImage });
    expect(result.dominantColorsCount).toBe(1);
    expect(result.colorChaosScore).toBeLessThan(10);
  });

  it('ObjectIsolationAnalyzer should return low isolation for a solid color block (no background difference)', () => {
    const solidImage = createFakeImageData(100, 100, 255, 0, 0); // Solid Red
    const result = ObjectIsolationAnalyzer.analyze({ imageData: solidImage });
    expect(result.isolationScore).toBeCloseTo(0);
    expect(result.contrastRatio).toBeCloseTo(0);
  });

  it('ImageComplexityAnalyzer should aggregate a solid block as extremely low complexity', () => {
    const solidImage = createFakeImageData(100, 100, 255, 0, 0); // Solid Red
    const result = ImageComplexityAnalyzer.analyze({ imageData: solidImage });
    expect(result.overallComplexityScore).toBeLessThan(30);
  });

  it('EdgeDensityAnalyzer should detect edges in a noisy image', () => {
    const noisyImage = createFakeImageData(100, 100, 0, 0, 0);
    // Add random noise to create edges
    for (let i = 0; i < noisyImage.data.length; i += 4) {
      if (Math.random() > 0.8) {
        noisyImage.data[i] = 255;
        noisyImage.data[i + 1] = 255;
        noisyImage.data[i + 2] = 255;
      }
    }
    const result = EdgeDensityAnalyzer.analyze({ imageData: noisyImage });
    expect(result.totalEdges).toBeGreaterThan(0);
    expect(result.edgeDensityScore).toBeGreaterThan(10);
  });

});
