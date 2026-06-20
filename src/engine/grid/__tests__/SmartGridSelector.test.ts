import { describe, it, expect } from 'vitest';
import { SmartGridSelector } from '../SmartGridSelector';
import { ComplexityResult } from '../../analysis/types';

describe('SmartGridSelector', () => {

  const createMockMetrics = (complexity: number, aspectRatio: number): ComplexityResult => ({
    overallComplexityScore: complexity,
    edgeDensity: complexity,
    colorChaos: complexity,
    objectIsolation: 100 - complexity,
    aspectRatio
  });

  it('Kindergarten standard should never exceed 8x8', () => {
    // Even with a very complex image (100) and 'advanced' difficulty
    const metrics = createMockMetrics(100, 1.0);
    const result = SmartGridSelector.recommendGrid({
      metrics,
      ageGroup: 'kindergarten',
      difficulty: 'advanced'
    });

    expect(result.recommendedWidth).toBeLessThanOrEqual(8);
    expect(result.recommendedHeight).toBeLessThanOrEqual(8);
    // Since it's highly complex but restricted to 8x8, confidence should drop
    expect(result.confidenceScore).toBeLessThan(100);
  });

  it('Grade 3-4 on easy difficulty should return minimum bounds (15)', () => {
    const metrics = createMockMetrics(50, 1.0);
    const result = SmartGridSelector.recommendGrid({
      metrics,
      ageGroup: 'grade3-4',
      difficulty: 'easy'
    });

    expect(result.recommendedWidth).toBe(15);
    expect(result.recommendedHeight).toBe(15);
  });

  it('Aspect ratio scaling works correctly for wide images', () => {
    // Aspect ratio 2.0 (width is 2x height)
    const metrics = createMockMetrics(50, 2.0);
    const result = SmartGridSelector.recommendGrid({
      metrics,
      ageGroup: 'grade1-2',
      difficulty: 'advanced' // Forces to max bound 15
    });

    // Width should be max (15), Height should be half (8) due to rounding
    expect(result.recommendedWidth).toBe(15);
    expect(result.recommendedHeight).toBe(8);
  });

  it('Aspect ratio scaling works correctly for tall images', () => {
    // Aspect ratio 0.5 (height is 2x width)
    const metrics = createMockMetrics(50, 0.5);
    const result = SmartGridSelector.recommendGrid({
      metrics,
      ageGroup: 'grade1-2',
      difficulty: 'advanced' // Forces to max bound 15
    });

    // Height should be max (15), Width should be half (8)
    expect(result.recommendedWidth).toBe(8);
    expect(result.recommendedHeight).toBe(15);
  });

  it('Generates appropriate warnings when confidence drops', () => {
    const metrics = createMockMetrics(90, 1.0);
    const result = SmartGridSelector.recommendGrid({
      metrics,
      ageGroup: 'kindergarten',
      difficulty: 'balanced'
    });

    expect(result.explanation).toContain('Warning');
  });

});
