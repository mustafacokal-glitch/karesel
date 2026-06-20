import { describe, it, expect } from 'vitest';
import { EducationalPaletteOptimizer } from '../EducationalPaletteOptimizer';
import { PALETTE } from '../colorDistance';
import { ColorInfo } from '../types';

describe('EducationalPaletteOptimizer', () => {
  it('should reduce colors to max 5 for kindergarten', () => {
    // Provide 8 distinct colors
    const inputColors = PALETTE.slice(0, 8) as ColorInfo[];
    
    const result = EducationalPaletteOptimizer.optimizePalette(inputColors, 'kindergarten', { highContrastMode: false });
    
    expect(result.optimizedPalette.length).toBeLessThanOrEqual(5);
    expect(Object.keys(result.originalToOptimizedMap).length).toBe(8);
  });

  it('should preserve protected colors (White and Black) by default', () => {
    // ID 1 is White, ID 24 is Black. Add a very dark grey to test merging.
    const inputColors = [
      PALETTE.find(c => c.id === 1)!,  // White
      PALETTE.find(c => c.id === 24)!, // Black
      { id: 99, r: 50, g: 50, b: 50, name: 'Dark Grey', hex: '#323232' }
    ] as ColorInfo[];

    const result = EducationalPaletteOptimizer.optimizePalette(inputColors, 'kindergarten', { highContrastMode: false, maxColors: 2 });
    
    // It should merge Dark Grey into Black. White and Black should remain.
    expect(result.optimizedPalette.length).toBe(2);
    expect(result.optimizedPalette.find(c => c.id === 1)).toBeDefined();
    expect(result.optimizedPalette.find(c => c.id === 24)).toBeDefined();
    expect(result.originalToOptimizedMap[99]).toBe(24);
  });

  it('should merge similar shades of blue into a single blue', () => {
    // Mavi, Açık Mavi, Turkuaz
    const blues = [
      PALETTE.find(c => c.id === 14)!, // Mavi
      PALETTE.find(c => c.id === 15)!, // Açık Mavi
      PALETTE.find(c => c.id === 16)!  // Turkuaz
    ] as ColorInfo[];

    const result = EducationalPaletteOptimizer.optimizePalette(blues, 'kindergarten', { highContrastMode: false, maxColors: 1 });
    
    // They are very similar, so for kindergarten they should be merged into the base blue (ID 14)
    expect(result.optimizedPalette.length).toBe(1);
    expect(result.optimizedPalette[0].id).toBe(14);
    expect(result.originalToOptimizedMap[15]).toBe(14);
    expect(result.originalToOptimizedMap[16]).toBe(14);
  });

  it('should merge more aggressively in highContrastMode', () => {
    // Provide two slightly different colors that might not merge in normal mode but will in high contrast
    const colors = [
      { id: 101, r: 255, g: 0, b: 0, name: 'Red1', hex: '#FF0000' },
      { id: 102, r: 220, g: 30, b: 30, name: 'Red2', hex: '#DC1E1E' }
    ] as ColorInfo[];

    const normalResult = EducationalPaletteOptimizer.optimizePalette(colors, 'grade3-4', { highContrastMode: false });
    // In normal grade 3-4, we allow more colors, they might stay distinct if distance > 400
    
    const hcResult = EducationalPaletteOptimizer.optimizePalette(colors, 'grade3-4', { highContrastMode: true });
    // In high contrast, distance threshold is 1200, so they definitely merge
    
    expect(hcResult.optimizedPalette.length).toBe(1);
  });
});
