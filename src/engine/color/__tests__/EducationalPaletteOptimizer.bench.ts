import { bench, describe } from 'vitest';
import { EducationalPaletteOptimizer } from '../EducationalPaletteOptimizer';
import { PALETTE } from '../colorDistance';
import { ColorInfo } from '../types';

describe('EducationalPaletteOptimizer Performance', () => {
  // Create a worst-case scenario: 100 distinct random colors
  const generateLargePalette = (count: number): ColorInfo[] => {
    const arr: ColorInfo[] = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        id: i + 100,
        r: Math.floor(Math.random() * 256),
        g: Math.floor(Math.random() * 256),
        b: Math.floor(Math.random() * 256),
        name: `Color${i}`,
        hex: '#000000'
      });
    }
    return arr;
  };

  const largePalette = generateLargePalette(100);

  bench('Optimize 100 colors down to 5 (Kindergarten)', () => {
    EducationalPaletteOptimizer.optimizePalette(largePalette, 'kindergarten', { highContrastMode: false });
  }, { time: 500 }); // Run for at least 500ms

  bench('Optimize 24 base colors down to 15 (Primary)', () => {
    EducationalPaletteOptimizer.optimizePalette(PALETTE as ColorInfo[], 'primary', { highContrastMode: false });
  });

  bench('Optimize 24 base colors with High Contrast Mode', () => {
    EducationalPaletteOptimizer.optimizePalette(PALETTE as ColorInfo[], 'primary', { highContrastMode: true });
  });
});
