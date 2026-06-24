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
    expect(layout.cellSizeMm).toBeGreaterThanOrEqual(4.5); // Safe threshold
    expect(layout.legendColumns).toBe(6); // 6 columns for 6 colors in horizontal layout
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
    expect(layout.legendColumns).toBe(2); // Falls back to 2-column side legend
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

  it('should calculate 1 row and 5 colors for 5 colors', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 25,
      gridHeight: 25,
      colorCount: 5,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.legendLayout).toBeDefined();
    const ll = layout.legendLayout!;
    expect(ll.rows).toBe(1);
    expect(ll.columns).toBe(5);
    expect(ll.itemWidthMm).toBeGreaterThan(0);
    const usableWidthMm = layout.pageWidthMm - layout.marginMm * 2;
    expect(ll.widthMm).toBeLessThanOrEqual(usableWidthMm + 0.1);
    
    // Bottom edge must not exceed pageHeightMm - 8 (footer safety)
    expect(ll.y + ll.heightMm).toBeLessThanOrEqual(layout.pageHeightMm - 8);
  });

  it('should calculate 1 row and 6 columns for 6 colors', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 25,
      gridHeight: 25,
      colorCount: 6,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.legendLayout).toBeDefined();
    const ll = layout.legendLayout!;
    expect(ll.rows).toBe(1);
    expect(ll.columns).toBe(6);
  });

  it('should calculate 2 rows and 4 columns for 8 colors', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 25,
      gridHeight: 25,
      colorCount: 8,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.legendLayout).toBeDefined();
    const ll = layout.legendLayout!;
    expect(ll.rows).toBe(2);
    expect(ll.columns).toBe(4);
    expect(ll.itemWidthMm).toBeGreaterThan(0);
    const usableWidthMm = layout.pageWidthMm - layout.marginMm * 2;
    expect(ll.widthMm).toBeLessThanOrEqual(usableWidthMm + 0.1);
    expect(ll.y + ll.heightMm).toBeLessThanOrEqual(layout.pageHeightMm - 8);
  });

  it('should calculate 2 rows and 5 columns for 9 colors', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 25,
      gridHeight: 25,
      colorCount: 9,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.legendLayout).toBeDefined();
    const ll = layout.legendLayout!;
    expect(ll.rows).toBe(2);
    expect(ll.columns).toBe(5);
  });

  it('should preserve portrait and use bottom full-width or compact-bottom legend for 40x40 grid when strict-portrait is selected', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 40,
      gridHeight: 40,
      colorCount: 8,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.orientation).toBe('portrait'); // Kept portrait strictly
    expect(layout.legendLayout).toBeDefined();
    const ll = layout.legendLayout!;
    expect(ll.mode === 'full-width-bottom' || ll.mode === 'compact-bottom').toBe(true);
    expect(ll.y + ll.heightMm).toBeLessThanOrEqual(layout.pageHeightMm - 8); // Footer safe
  });

  it('should verify spacing gaps for 25x25 portrait grid', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 25,
      gridHeight: 25,
      colorCount: 6,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.instructionY).toBeDefined();
    expect(layout.coordinateTopY).toBeDefined();
    expect(layout.gridY).toBeDefined();

    // instructionY < coordinateTopY < gridY
    expect(layout.instructionY!).toBeLessThan(layout.coordinateTopY!);
    expect(layout.coordinateTopY!).toBeLessThan(layout.gridY);

    // instruction-coordinate gap >= 4 mm
    const instructionToCoordinateGap = layout.coordinateTopY! - (layout.instructionY! + layout.instructionHeightMm!);
    expect(instructionToCoordinateGap).toBeGreaterThanOrEqual(4.0);

    // coordinate-grid gap is simply gridY - coordinateTopY, which should be >= 0.75
    const coordinateToGridGap = layout.gridY - layout.coordinateTopY!;
    expect(coordinateToGridGap).toBeGreaterThanOrEqual(0.4);

    // legend does not overlap grid Y
    expect(layout.legendY).toBeGreaterThanOrEqual(layout.gridY + layout.gridHeightMm);

    // footer does not overlap legend
    if (layout.legendLayout) {
      expect(layout.legendLayout.y + layout.legendLayout.heightMm).toBeLessThanOrEqual(layout.pageHeightMm - 8);
    }
  });

  it('should verify spacing gaps for 40x40 strict portrait grid', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 40,
      gridHeight: 40,
      colorCount: 8,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-portrait'
    });

    expect(layout.orientation).toBe('portrait');
    expect(layout.instructionY).toBeDefined();
    expect(layout.coordinateTopY).toBeDefined();
    expect(layout.gridY).toBeDefined();

    expect(layout.instructionY!).toBeLessThan(layout.coordinateTopY!);
    expect(layout.coordinateTopY!).toBeLessThan(layout.gridY);

    const coordinateToGridGap = layout.gridY - layout.coordinateTopY!;
    expect(coordinateToGridGap).toBeGreaterThanOrEqual(0.4);
  });

  it('should verify spacing gaps for 40x40 strict landscape grid', () => {
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: 40,
      gridHeight: 40,
      colorCount: 8,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: 'strict-landscape'
    });

    expect(layout.orientation).toBe('landscape');
    expect(layout.instructionY).toBeDefined();
    expect(layout.coordinateTopY).toBeDefined();
    expect(layout.gridY).toBeDefined();

    expect(layout.instructionY!).toBeLessThan(layout.coordinateTopY!);
    expect(layout.coordinateTopY!).toBeLessThan(layout.gridY);

    if (layout.legendLayout && layout.legendLayout.mode !== 'fallback') {
      expect(layout.legendLayout.y + layout.legendLayout.heightMm).toBeLessThanOrEqual(layout.pageHeightMm - 8);
    }
  });
});
