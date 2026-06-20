import { describe, it, expect } from 'vitest';
import { AIQESEngine } from '../AIQESEngine';
import { AIQESInput } from '../types';
import { ColorInfo } from '../../color/types';

describe('AIQESEngine', () => {

  const createMockInput = (
    complexity: number,
    isolation: number,
    gridSize: number,
    colorCount: number,
    ageGroup: 'kindergarten' | 'grade1-2' | 'grade3-4'
  ): AIQESInput => {
    
    const optimizedPalette: ColorInfo[] = [];
    for (let i = 0; i < colorCount; i++) {
      optimizedPalette.push({ id: i, r: 0, g: 0, b: 0, name: `C${i}`, hex: '#000' });
    }

    return {
      originalMetrics: {
        overallComplexityScore: complexity,
        edgeDensity: complexity,
        colorChaos: complexity,
        objectIsolation: isolation,
        aspectRatio: 1.0
      },
      optimizedPalette,
      gridRows: gridSize,
      gridCols: gridSize,
      ageGroup
    };
  };

  it('A Kindergarten 25x25 grid with 15 colors should yield a very low AIQES score', () => {
    // High complexity, high grid size, high colors -> Bad for kindergarten
    const input = createMockInput(80, 80, 25, 15, 'kindergarten');
    const report = AIQESEngine.generateReport(input);

    expect(report.educationalComplexity.score).toBeLessThan(20);
    expect(report.colorSimplicity.score).toBeLessThan(20);
    expect(report.aiqesScore).toBeLessThan(65);
  });

  it('A Kindergarten 8x8 grid with 4 colors should yield a high AIQES score', () => {
    // Simple image, 8x8 grid, 4 colors -> Perfect for kindergarten
    const input = createMockInput(10, 90, 8, 4, 'kindergarten');
    const report = AIQESEngine.generateReport(input);

    expect(report.educationalComplexity.score).toBe(100);
    expect(report.colorSimplicity.score).toBe(100);
    expect(report.motivation.score).toBe(100);
    expect(report.aiqesScore).toBeGreaterThan(90);
  });

  it('A highly complex image in an 8x8 grid triggers motivation/recognizability warnings', () => {
    // High complexity image squeezed into an 8x8 grid
    const input = createMockInput(90, 90, 8, 10, 'grade1-2');
    const report = AIQESEngine.generateReport(input);

    expect(report.recognizability.score).toBeLessThan(50);
    expect(report.motivation.score).toBeLessThan(100);
  });

  it('A wide image forced into a square grid penalizes shape preservation', () => {
    const input = createMockInput(50, 90, 15, 10, 'grade1-2');
    // Force aspect ratio mismatch
    input.originalMetrics.aspectRatio = 2.0; 
    // Grid is 15x15 (ratio 1.0)
    const report = AIQESEngine.generateReport(input);

    expect(report.shapePreservation.score).toBeLessThan(100);
    expect(report.shapePreservation.recommendations).toContain("Allow the grid to be rectangular rather than forcing a square.");
  });

});
