import { describe, it, expect } from 'vitest';
import { PdfLayoutEngine } from '../PdfLayoutEngine';

describe('PdfLayoutEngine', () => {
  it('should prefer portrait for 25x25 grid', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 25,
      gridHeight: 25,
      colorCount: 6,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'auto'
    });

    expect(layout.orientation).toBe('portrait');
    expect(layout.cellSizeMm).toBeGreaterThanOrEqual(5.0); // Safe threshold
    expect(layout.warnings.length).toBe(0);
    expect(layout.legendColumns).toBe(1);
  });

  it('should switch to landscape or compact for 40x40 grid to avoid critical warnings', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 40,
      gridHeight: 40,
      colorCount: 8,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'auto'
    });

    expect(layout.orientation).toBe('landscape');
    expect(layout.legendColumns).toBe(2);
    // Even at 40x40 landscape, we hope to stay above 4.0mm if possible
    expect(layout.cellSizeMm).toBeGreaterThanOrEqual(4.0);
  });

  it('should correctly configure original image reference for answer key', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 20,
      gridHeight: 20,
      colorCount: 4,
      pageKind: 'answerKey',
      includeLegend: true,
      includeCoordinates: true,
      includeOriginalReference: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.originalImageWidthMm).toBeDefined();
    expect(layout.originalImageX).toBeGreaterThan(layout.gridX); // Placed on the right
  });
});
