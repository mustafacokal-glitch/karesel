import { describe, it, expect } from 'vitest';
import { ShapePreservationEngine } from '../ShapePreservationEngine';

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

describe('ShapePreservationEngine', () => {

  const createFakeImageData = (width: number, height: number): ImageData => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 0; // Transparent background
    }
    return new ImageData(data, width, height);
  };

  const getPixel = (img: ImageData, x: number, y: number) => {
    const idx = (y * img.width + x) * 4;
    return {
      r: img.data[idx],
      g: img.data[idx + 1],
      b: img.data[idx + 2],
      a: img.data[idx + 3]
    };
  };

  const setPixel = (img: ImageData, x: number, y: number, r: number, g: number, b: number, a: number) => {
    const idx = (y * img.width + x) * 4;
    img.data[idx] = r;
    img.data[idx + 1] = g;
    img.data[idx + 2] = b;
    img.data[idx + 3] = a;
  };

  it('protectSilhouette should draw a black boundary on the edges of an object', () => {
    const img = createFakeImageData(10, 10);
    // Draw a 3x3 solid red square in the middle (x: 4-6, y: 4-6)
    for (let y = 4; y <= 6; y++) {
      for (let x = 4; x <= 6; x++) {
        setPixel(img, x, y, 255, 0, 0, 255);
      }
    }

    const result = ShapePreservationEngine.apply(img, { medianRadius: 0, edgeColor: [0, 0, 0] });

    // Center pixel (5,5) should still be red because it has no transparent neighbors
    const center = getPixel(result, 5, 5);
    expect(center.r).toBe(255);
    expect(center.g).toBe(0);

    // Border pixel (4,4) should be blackened (edgeColor)
    const border = getPixel(result, 4, 4);
    expect(border.r).toBe(0);
    expect(border.g).toBe(0);
    expect(border.b).toBe(0);
  });

  it('detectAndEnhanceEdges should darken internal high-contrast edges in force-black mode', () => {
    const img = createFakeImageData(10, 10);
    // Fill left half with white, right half with black
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (x < 5) setPixel(img, x, y, 255, 255, 255, 255); // White
        else setPixel(img, x, y, 0, 0, 0, 255); // Black
      }
    }

    // Apply with no median to preserve our sharp test edge
    const result = ShapePreservationEngine.apply(img, { medianRadius: 0, edgeColor: [255, 0, 0], edgeMode: 'force-black' });

    // The boundary at x=4 or x=5 should trigger the edge detection and be painted red
    const boundaryPixel = getPixel(result, 4, 5);
    expect(boundaryPixel.r).toBe(255); // Because edgeColor is [255, 0, 0]
    expect(boundaryPixel.g).toBe(0);
  });

  it('should darken internal edges preserving source color when edgeMode is preserve-source-color', () => {
    const img = createFakeImageData(10, 10);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (x < 5) setPixel(img, x, y, 200, 100, 50, 255); // Orange
        else setPixel(img, x, y, 50, 50, 50, 255); // Dark Gray
      }
    }

    const result = ShapePreservationEngine.apply(img, { 
      medianRadius: 0, 
      edgeMode: 'preserve-source-color',
      internalEdgeDarkenFactor: 0.5 
    });

    // The boundary pixel should be darkened by 0.5
    const boundaryPixel = getPixel(result, 4, 5);
    expect(boundaryPixel.r).toBe(100); // 200 * 0.5
    expect(boundaryPixel.g).toBe(50);  // 100 * 0.5
    expect(boundaryPixel.b).toBe(25);  // 50 * 0.5
  });

  it('should ignore internal edges when edgeMode is silhouette-only', () => {
    const img = createFakeImageData(10, 10);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (x < 5) setPixel(img, x, y, 255, 255, 255, 255); // White
        else setPixel(img, x, y, 50, 50, 50, 255); // Dark Gray
      }
    }

    const result = ShapePreservationEngine.apply(img, { medianRadius: 0, edgeColor: [255, 0, 0], edgeMode: 'silhouette-only' });

    // Internal boundary at x=4 should NOT be painted red (edgeColor)
    const internalBoundaryPixel = getPixel(result, 4, 5);
    expect(internalBoundaryPixel.r).toBe(255); // Unchanged white
    expect(internalBoundaryPixel.g).toBe(255);
  });

  it('should darken internal edges preserving source hue when edgeMode is preserve-source-color (default factor 0.85)', () => {
    const img = createFakeImageData(10, 10);
    // Left side light red, right side dark red to trigger edge
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (x < 5) setPixel(img, x, y, 200, 100, 100, 255); 
        else setPixel(img, x, y, 50, 25, 25, 255); 
      }
    }

    const result = ShapePreservationEngine.apply(img, { medianRadius: 0, edgeColor: [0, 0, 0], edgeMode: 'preserve-source-color' });

    // The internal boundary at x=4 should trigger edge detection
    // Was 200, 100, 100. Default factor 0.85 => 170, 85, 85
    const boundaryPixel = getPixel(result, 4, 5);
    expect(boundaryPixel.r).toBe(170);
    expect(boundaryPixel.g).toBe(85);
    expect(boundaryPixel.b).toBe(85);
  });

  it('should allow custom internalEdgeDarkenFactor', () => {
    const img = createFakeImageData(10, 10);
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 10; x++) {
        if (x < 5) setPixel(img, x, y, 200, 100, 100, 255); 
        else setPixel(img, x, y, 50, 25, 25, 255); 
      }
    }

    const result = ShapePreservationEngine.apply(img, { medianRadius: 0, edgeColor: [0, 0, 0], edgeMode: 'preserve-source-color', internalEdgeDarkenFactor: 0.70 });

    // Was 200, 100, 100. Factor 0.70 => 140, 70, 70
    const boundaryPixel = getPixel(result, 4, 5);
    expect(boundaryPixel.r).toBe(140);
    expect(boundaryPixel.g).toBe(70);
    expect(boundaryPixel.b).toBe(70);
  });

});
