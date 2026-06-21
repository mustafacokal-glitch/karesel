import { describe, it, expect } from 'vitest';
import { getPaletteFromPolicy } from '../PalettePolicy';

// Helper to create a fake ImageData with specific colors
function createFakeImageData(width: number, height: number, colors: {r: number, g: number, b: number, a?: number}[]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  let colorIdx = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const c = colors[colorIdx % colors.length];
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = c.a !== undefined ? c.a : 255;
    colorIdx++;
  }
  
  return { width, height, data, colorSpace: 'srgb' } as ImageData;
}

describe('PalettePolicy', () => {
  it('should return fixed educational palette when mode is educational', () => {
    const policyOptions = { mode: 'educational' as const, difficultyLevel: 1 };
    const palette = getPaletteFromPolicy(policyOptions);
    
    // Level 1 difficulty allows specific 8 colors
    expect(palette.length).toBe(8);
    expect(palette.map(p => p.id)).toEqual([1, 4, 6, 7, 14, 19, 22, 24]);
  });

  it('should extract dominant colors in fidelity mode', () => {
    // Fake image with 4 distinct flat colors
    const colors = [
      { r: 200, g: 100, b: 50 }, // Dominant 1
      { r: 50,  g: 200, b: 100 }, // Dominant 2
      { r: 100, g: 50,  b: 200 }, // Dominant 3
      { r: 150, g: 150, b: 150 }  // Dominant 4
    ];
    
    const imageData = createFakeImageData(10, 10, colors);
    
    const policyOptions = { mode: 'fidelity' as const, difficultyLevel: 2, maxColors: 10 };
    const palette = getPaletteFromPolicy(policyOptions, imageData);
    
    // Extracted palette should contain the 4 colors, plus Black and White (if they were not near)
    expect(palette.length).toBeGreaterThanOrEqual(4);
    
    // The top extracted colors should be exactly our 4 flat colors
    const hasColor1 = palette.some(p => Math.abs(p.r - 200) < 5 && Math.abs(p.g - 100) < 5);
    const hasColor2 = palette.some(p => Math.abs(p.r - 50) < 5 && Math.abs(p.g - 200) < 5);
    
    expect(hasColor1).toBe(true);
    expect(hasColor2).toBe(true);
    
    // Should have Black and White injected
    const hasBlack = palette.some(p => p.id === 24);
    const hasWhite = palette.some(p => p.id === 1);
    expect(hasBlack).toBe(true);
    expect(hasWhite).toBe(true);
  });

  it('Alpha 80 semi-transparent orange edge pixels should contribute to the fidelity palette with low weight', () => {
    // 9 pixels white, 1 pixel orange with alpha 80
    const pixels = Array(9).fill({ r: 255, g: 255, b: 255 });
    pixels.push({ r: 255, g: 136, b: 51, a: 80 }); 
    
    const imageData = createFakeImageData(10, 1, pixels); // 10 pixels total
    const palette = getPaletteFromPolicy({ mode: 'fidelity', difficultyLevel: 4, maxColors: 10 }, imageData);
    
    // The extracted palette should include the orange color (r~255, g~136, b~51) 
    // because alpha 80 gives coverage ~0.31 > 0.02
    const hasOrange = palette.some(p => Math.abs(p.r - 255) < 15 && Math.abs(p.g - 136) < 15);
    expect(hasOrange).toBe(true);
  });

  it('Cream foreground color must remain separate from white', () => {
    // 5 cream pixels, 5 white pixels
    const pixels = [
      ...Array(5).fill({ r: 242, g: 225, b: 195 }), // Cream
      ...Array(5).fill({ r: 255, g: 255, b: 255 })  // White
    ];
    const imageData = createFakeImageData(10, 1, pixels);
    const palette = getPaletteFromPolicy({ mode: 'fidelity', difficultyLevel: 4, maxColors: 10 }, imageData);
    
    // Since cream vs white LAB distance is high enough, they shouldn't merge
    const hasCream = palette.some(p => Math.abs(p.r - 242) < 15 && Math.abs(p.g - 225) < 15);
    const hasWhite = palette.some(p => Math.abs(p.r - 255) < 5 && Math.abs(p.g - 255) < 5);
    expect(hasCream).toBe(true);
    expect(hasWhite).toBe(true);
  });
});
