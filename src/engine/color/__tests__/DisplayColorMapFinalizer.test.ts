import { describe, it, expect } from 'vitest';
import { finalizeDisplayColorMap } from '../DisplayColorMapFinalizer';

describe('DisplayColorMapFinalizer', () => {
  it('should canonicalize colors and map them to deterministic display numbers', () => {
    // Kırmızı = id 7
    // Mavi = id 12
    const grid = [
      [100, 101, 0],
      [0, 100, 101]
    ];
    
    const colorMap = {
      100: { id: 100, hex: '#ED0A3F', r: 237, g: 10, b: 63 }, // Kırmızı
      101: { id: 101, hex: '#1F75FE', r: 31, g: 117, b: 254 }  // Mavi
    };

    const { displayGrid, displayColorMap, originalToDisplayMap } = finalizeDisplayColorMap(grid, colorMap);

    // Kırmızı (7) < Mavi (12), so Kırmızı gets displayNumber 1, Mavi gets 2.
    expect(originalToDisplayMap[100]).toBe(1);
    expect(originalToDisplayMap[101]).toBe(2);

    expect(displayGrid).toEqual([
      [1, 2, 0],
      [0, 1, 2]
    ]);

    expect(displayColorMap[1].name).toBe('Kırmızı');
    expect(displayColorMap[1].canonicalPaletteId).toBe(7);
    
    expect(displayColorMap[2].name).toBe('Mavi');
    expect(displayColorMap[2].canonicalPaletteId).toBe(14);
  });

  it('should map two dynamic colors snapping to the same PALETTE color into a single display number', () => {
    // Dynamic 1 and Dynamic 2 both snap to Kırmızı (7)
    const grid = [
      [100, 101]
    ];

    const colorMap = {
      100: { id: 100, hex: '#ED0A3F', r: 237, g: 10, b: 63 }, // Kırmızı exact
      101: { id: 101, hex: '#EC093E', r: 236, g: 9, b: 62 }  // Very close to Kırmızı
    };

    const { displayGrid, displayColorMap, originalToDisplayMap } = finalizeDisplayColorMap(grid, colorMap);

    // Both should map to display number 1
    expect(originalToDisplayMap[100]).toBe(1);
    expect(originalToDisplayMap[101]).toBe(1);

    expect(displayGrid).toEqual([
      [1, 1]
    ]);

    // Only one display color should exist
    const displayIds = Object.keys(displayColorMap);
    expect(displayIds).toHaveLength(1);
    expect(displayColorMap[1].name).toBe('Kırmızı');
    expect(displayColorMap[1].canonicalPaletteId).toBe(7);
  });
});
