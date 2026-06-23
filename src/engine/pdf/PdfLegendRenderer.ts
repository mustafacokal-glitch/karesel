import { jsPDF } from 'jspdf';
import { PdfColorEntry, PdfLayoutResult } from './PdfTypes';
import { LTRTextRenderer } from '../../pdf/renderers/LTRTextRenderer';

export class PdfLegendRenderer {
  public static renderLegend(
    doc: jsPDF,
    params: {
      colorEntries: PdfColorEntry[];
      layout: PdfLayoutResult;
      title?: string;
    }
  ): void {
    const { colorEntries, layout, title } = params;

    doc.setFont('Roboto', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    LTRTextRenderer.renderText(doc, title || 'Renk Tablosu:', layout.legendX, layout.legendY);

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(8);

    const legendColWidth = layout.legendWidthMm / layout.legendColumns;
    
    colorEntries.forEach((entry, i) => {
      const colIdx = i % layout.legendColumns;
      const rowIdx = Math.floor(i / layout.legendColumns);
      
      const entryX = layout.legendX + colIdx * legendColWidth;
      const entryY = layout.legendY + 6 + rowIdx * 6; // 6mm spacing per row

      // Draw Number
      doc.setTextColor(0, 0, 0);
      LTRTextRenderer.renderText(doc, String(entry.displayNumber), entryX, entryY);

      // Draw Swatch
      const swatchX = entryX + 6;
      const swatchY = entryY - 3;
      const swatchSize = 4;
      
      const cleanHex = entry.hex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16);
      const g = parseInt(cleanHex.substring(2, 4), 16);
      const b = parseInt(cleanHex.substring(4, 6), 16);
      
      doc.setFillColor(r, g, b);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);
      doc.rect(swatchX, swatchY, swatchSize, swatchSize, 'FD'); // Fill and stroke

      // Draw Name
      const nameX = swatchX + swatchSize + 3;
      const nameLabel = entry.name || `Renk ${entry.displayNumber}`;
      LTRTextRenderer.renderText(doc, nameLabel, nameX, entryY);
    });
  }
}
