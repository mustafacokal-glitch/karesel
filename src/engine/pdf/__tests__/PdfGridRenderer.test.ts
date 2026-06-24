import { describe, it, expect, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { PdfGridRenderer } from '../PdfGridRenderer';
import { PdfLayoutResult } from '../PdfTypes';

const createMockDoc = () => {
  const rectMock = vi.fn();
  const textMock = vi.fn();
  const doc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: rectMock,
    text: textMock,
    line: vi.fn(),
    getTextWidth: vi.fn((text: string) => text.length * 1.5),
  } as unknown as jsPDF;
  return { doc, rectMock, textMock };
};

describe('PdfGridRenderer', () => {
  it('should draw grid cells starting at layout.gridY and coordinates outside grid cells', () => {
    const { doc, rectMock, textMock } = createMockDoc();
    const layout: PdfLayoutResult = {
      orientation: 'portrait',
      pageWidthMm: 210,
      pageHeightMm: 297,
      marginMm: 10,
      headerX: 10,
      headerY: 10,
      headerHeightMm: 30,
      gridX: 20,
      gridY: 50,
      gridWidthMm: 100,
      gridHeightMm: 100,
      cellSizeMm: 10,
      coordinateHeaderSizeMm: 5,
      legendX: 10,
      legendY: 210,
      legendWidthMm: 190,
      legendHeightMm: 12,
      legendColumns: 2,
      coordinateTopY: 45,
      coordinateLeftX: 15,
      warningLevel: 'none',
      warnings: []
    };

    const grid = [
      [1, 2],
      [0, 1]
    ];

    const colorEntries = [
      { internalId: 1, displayNumber: 1, hex: '#FF0000', name: 'Kırmızı' },
      { internalId: 2, displayNumber: 2, hex: '#000000', name: 'Siyah' }
    ];

    PdfGridRenderer.renderPdfGrid(doc, {
      grid,
      colorEntries,
      layout,
      mode: 'student',
      showNumbers: true,
      showCoordinates: true
    });

    // Check grid cell drawing start Y: must be 50 (layout.gridY)
    rectMock.mock.calls.forEach((call) => {
      const y = call[1];
      expect(y).toBeGreaterThanOrEqual(50);
    });

    const expectedColumnLabelY = 50 - PdfGridRenderer.PDF_GRID_RENDERING_OFFSETS.columnLabelToGridGapMm;
    // Check column coordinate Y: must be gridY - 0.75 exactly
    const colCoords = textMock.mock.calls.filter(call => (call[0] === '1' || call[0] === '2') && call[2] === expectedColumnLabelY);
    expect(colCoords.length).toBeGreaterThanOrEqual(2);
    colCoords.forEach((call) => {
      const cy = call[2];
      expect(cy).toBe(expectedColumnLabelY);
      expect(cy).toBeLessThan(50); // Above gridY
    });

    const expectedRowLabelX = 20 - PdfGridRenderer.PDF_GRID_RENDERING_OFFSETS.rowLabelToGridGapMm;
    // Check row coordinate X: must be gridX - 1.2, which is to the left of gridX (20)
    const rowCoords = textMock.mock.calls.filter(call => call[1] === expectedRowLabelX);
    expect(rowCoords.length).toBe(2);
    rowCoords.forEach((call) => {
      const cx = call[1];
      expect(cx).toBe(expectedRowLabelX);
      expect(cx).toBeLessThan(20); // Left of gridX
    });
  });
});
