import { describe, it, expect } from 'vitest';
import { AIOptimizationLoop, OptimizationInput } from '../AIOptimizationLoop';
import { ColorInfo } from '../color/types';

// Mock ImageData for Node environment
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

describe('AIOptimizationLoop', () => {

  const createFakeInput = (ageGroup: 'kindergarten' | 'grade1-2'): OptimizationInput => {
    // 10x10 transparent image with some noisy dots to simulate complexity
    const data = new Uint8ClampedArray(10 * 10 * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = i % 8 === 0 ? 255 : 0; // Some random noise
    }
    const sourceImageData = new ImageData(data, 10, 10);

    const rawColors: ColorInfo[] = [];
    for (let i = 0; i < 20; i++) {
      rawColors.push({ id: i, r: i * 10, g: i * 10, b: i * 10, name: `C${i}`, hex: '#000' });
    }

    return {
      sourceImageData,
      rawColors,
      ageGroup,
      difficulty: 'balanced',
      targetScore: 85
    };
  };

  it('Executes optimization cycles and returns the best state', async () => {
    const input = createFakeInput('kindergarten');
    const bestState = await AIOptimizationLoop.optimize(input);

    // It should have executed at least 1 cycle
    expect(bestState.cycle).toBeGreaterThan(0);
    // Grid max size for kindergarten is 8
    expect(bestState.metrics.gridWidth).toBeLessThanOrEqual(8);
    // Should have a valid AIQES report
    expect(bestState.report.aiqesScore).toBeGreaterThanOrEqual(0);
  });

  it('Reduces colors when failing AIQES due to color chaos (simulated by cycles)', async () => {
    const input = createFakeInput('kindergarten');
    const bestState = await AIOptimizationLoop.optimize(input);

    // Even though raw colors were 20, kindergarten max is 5.
    // If it reached later cycles, maxColorsModifier (-3 or -5) would have dropped it even further.
    // So the final palette count should be heavily reduced.
    expect(bestState.metrics.colorCount).toBeLessThanOrEqual(5);
  });
});
