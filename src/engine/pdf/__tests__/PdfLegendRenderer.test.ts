import { describe, it, expect, vi } from 'vitest';
import { jsPDF } from 'jspdf';
import { renderPdfLegend, getCompactColorName, truncateTextToWidth } from '../PdfLegendRenderer';
import { PdfLayoutResult } from '../PdfTypes';

const createMockDoc = () => {
  const textMock = vi.fn();
  const rectMock = vi.fn();
  const setFillColorMock = vi.fn();
  const doc = {
    setFont: vi.fn(),
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    setFillColor: setFillColorMock,
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    rect: rectMock,
    text: textMock,
    getTextWidth: vi.fn((text: string) => {
      // Mock: 1.5mm per character
      return text.length * 1.5;
    }),
  } as unknown as jsPDF;
  return { doc, textMock, rectMock, setFillColorMock };
};

describe('PdfLegendRenderer', () => {
  describe('getCompactColorName', () => {
    it('should strip parentheses and clean up slashes', () => {
      expect(getCompactColorName('Krem (Ten rengi)')).toBe('Krem');
      expect(getCompactColorName('Kırmızı / Pembe')).toBe('Kırmızı/Pembe');
      expect(getCompactColorName('Mavi (Fidelity Accent)')).toBe('Mavi');
    });
  });

  describe('truncateTextToWidth', () => {
    it('should truncate and append dots if too long', () => {
      const { doc } = createMockDoc();
      // Mock getTextWidth makes 10 chars take 15mm.
      // If limit is 9mm, it should truncate.
      const truncated = truncateTextToWidth(doc, 'KaramelRenk', 9);
      expect(truncated).toContain('...');
    });
  });

  describe('renderPdfLegend', () => {
    it('should use layout.legendLayout positions and display numbers', () => {
      const { doc, textMock, rectMock, setFillColorMock } = createMockDoc();
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
        gridWidthMm: 150,
        gridHeightMm: 150,
        cellSizeMm: 5,
        coordinateHeaderSizeMm: 5,
        legendX: 10,
        legendY: 210,
        legendWidthMm: 190,
        legendHeightMm: 12,
        legendColumns: 2,
        legendLayout: {
          x: 10,
          y: 210,
          widthMm: 190,
          heightMm: 12,
          titleHeightMm: 5,
          rowHeightMm: 5.5,
          columns: 2,
          rows: 1,
          itemWidthMm: 95,
          swatchSizeMm: 4,
          numberWidthMm: 5,
          gapMm: 2,
          mode: 'full-width-bottom'
        },
        warningLevel: 'none',
        warnings: []
      };

      const colorEntries = [
        { internalId: 101, displayNumber: 1, hex: '#FF0000', name: 'Kırmızı' },
        { internalId: 102, displayNumber: 2, hex: '#000000', name: 'Siyah' }
      ];

      renderPdfLegend(doc, { colorEntries, layout });

      // First text printed is title "Renk Tablosu:"
      expect(textMock).toHaveBeenCalledWith('Renk Tablosu:', 10, 210, undefined);
      // Format must be "{displayNumber}-{name}"
      expect(textMock).toHaveBeenCalledWith('1-Kırmızı', 10, 216, undefined);
      expect(textMock).toHaveBeenCalledWith('2-Siyah', 105, 216, undefined);
      
      // Swatches should not be drawn
      expect(rectMock).not.toHaveBeenCalled();
      expect(setFillColorMock).not.toHaveBeenCalled();
    });

    it('should fallback to compact name then truncated name if name overflows itemWidthMm', () => {
      const { doc, textMock } = createMockDoc();
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
        gridWidthMm: 150,
        gridHeightMm: 150,
        cellSizeMm: 5,
        coordinateHeaderSizeMm: 5,
        legendX: 10,
        legendY: 210,
        legendWidthMm: 190,
        legendHeightMm: 12,
        legendColumns: 6,
        legendLayout: {
          x: 10,
          y: 210,
          widthMm: 190,
          heightMm: 12,
          titleHeightMm: 5,
          rowHeightMm: 7,
          columns: 6,
          rows: 1,
          itemWidthMm: 25, // Each item gets 25mm.
          // maxTextWidthMm = 25 - 2 = 23mm.
          // Character limit is 23 / 1.5 = ~15 characters.
          swatchSizeMm: 4,
          numberWidthMm: 5,
          gapMm: 2,
          mode: 'full-width-bottom'
        },
        warningLevel: 'none',
        warnings: []
      };

      const colorEntries = [
        // 1. Fits completely: "Kırmızı" (7 chars * 1.5 = 10.5mm < 18.6mm)
        { internalId: 1, displayNumber: 1, hex: '#FF0000', name: 'Kırmızı' },
        // 2. Full name doesn't fit, compact fits: "Krem (Ten rengi)" (16 chars * 1.5 = 24mm > 18.6mm. Compact "Krem" is 4 chars * 1.5 = 6mm < 18.6mm)
        { internalId: 2, displayNumber: 2, hex: '#F0E68C', name: 'Krem (Ten rengi)' },
        // 3. Compact doesn't fit either, gets truncated: "KaramelRengi (Acı)" -> Compact "KaramelRengi" (12 chars * 1.5 = 18mm, wait!
        // Let's use a very long name: "ÇokKoyuKaramelRengi (Yumuşak)" -> Compact "ÇokKoyuKaramelRengi" (19 chars * 1.5 = 28.5mm > 18.6mm, so truncated)
        { internalId: 3, displayNumber: 3, hex: '#8B4513', name: 'ÇokKoyuKaramelRengi (Yumuşak)' }
      ];

      renderPdfLegend(doc, { colorEntries, layout });

      expect(textMock).toHaveBeenCalledWith('1-Kırmızı', 10, 216, undefined);
      expect(textMock).toHaveBeenCalledWith('2-Krem', 35, 216, undefined); // Uses compactName
      // Should show truncated compactName
      expect(textMock).toHaveBeenLastCalledWith(expect.stringContaining('...'), 60, 216, undefined);
    });

    it('should never render technical names like Fidelity Color', () => {
      const { doc, textMock } = createMockDoc();
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
        gridWidthMm: 150,
        gridHeightMm: 150,
        cellSizeMm: 5,
        coordinateHeaderSizeMm: 5,
        legendX: 10,
        legendY: 210,
        legendWidthMm: 190,
        legendHeightMm: 12,
        legendColumns: 2,
        legendLayout: {
          x: 10,
          y: 210,
          widthMm: 190,
          heightMm: 12,
          titleHeightMm: 5,
          rowHeightMm: 7,
          columns: 2,
          rows: 1,
          itemWidthMm: 95,
          swatchSizeMm: 4,
          numberWidthMm: 5,
          gapMm: 2,
          mode: 'full-width-bottom'
        },
        warningLevel: 'none',
        warnings: []
      };

      const colorEntries = [
        { internalId: 1, displayNumber: 1, hex: '#FF0000', name: 'Kırmızı' }
      ];

      renderPdfLegend(doc, { colorEntries, layout });

      textMock.mock.calls.forEach((call) => {
        const textStr = String(call[0]);
        expect(textStr).not.toContain('Fidelity');
        expect(textStr).not.toContain('Generated');
      });
    });
  });
});
