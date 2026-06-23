import { jsPDF } from 'jspdf';
import { PdfColorEntry, PdfLayoutResult } from './PdfTypes';
import { LTRTextRenderer } from '../../pdf/renderers/LTRTextRenderer';

export class PdfGridRenderer {
  private static getReadableTextColor(hex: string): '#000000' | '#FFFFFF' {
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    return luma < 140 ? '#FFFFFF' : '#000000';
  }

  private static isEmptyCell(value: number | null | undefined): boolean {
    return value == null || value === 0;
  }

  public static renderPdfGrid(
    doc: jsPDF,
    params: {
      grid: number[][];
      colorEntries: PdfColorEntry[];
      layout: PdfLayoutResult;
      mode: 'student' | 'answerKey';
      showNumbers: boolean;
      showCoordinates: boolean;
    }
  ): void {
    const { grid, colorEntries, layout, mode, showNumbers, showCoordinates } = params;
    const rows = grid.length;
    const cols = grid[0]?.length || 0;

    const colorMap = new Map<number, PdfColorEntry>();
    colorEntries.forEach(entry => colorMap.set(entry.internalId, entry));

    const gridX = layout.gridX;
    const gridY = layout.gridY;
    const cellSize = layout.cellSizeMm;

    // Draw coordinates if requested
    if (showCoordinates) {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(Math.min(cellSize * 1.2, 8)); // scale down coordinate font
      doc.setTextColor(100, 100, 100);

      // Top columns (X axis)
      for (let col = 0; col < cols; col++) {
        const cx = gridX + col * cellSize + (cellSize / 2);
        const cy = gridY - 2;
        LTRTextRenderer.renderText(doc, String(col + 1), cx, cy, { align: 'center', baseline: 'bottom' });
      }

      // Left rows (Y axis)
      for (let row = 0; row < rows; row++) {
        const cx = gridX - 2;
        const cy = gridY + row * cellSize + (cellSize / 2);
        LTRTextRenderer.renderText(doc, String(row + 1), cx, cy, { align: 'right', baseline: 'middle' });
      }
    }

    // Determine font size based on grid dimension sizes
    // e.g. 25x25 -> ~7pt, 40x40 -> ~5pt
    const fontSizePt = Math.max(5.0, Math.min(8.0, cellSize * 1.5));

    // Draw Grid Cells
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = gridX + col * cellSize;
        const y = gridY + row * cellSize;
        const cellValue = grid[row][col];
        const isEmpty = this.isEmptyCell(cellValue);

        // Background
        if (!isEmpty && mode === 'answerKey') {
          const entry = colorMap.get(cellValue);
          if (entry) {
            const cleanHex = entry.hex.replace('#', '');
            const r = parseInt(cleanHex.substring(0, 2), 16);
            const g = parseInt(cleanHex.substring(2, 4), 16);
            const b = parseInt(cleanHex.substring(4, 6), 16);
            doc.setFillColor(r, g, b);
            doc.rect(x, y, cellSize, cellSize, 'F');
          }
        } else if (!isEmpty && mode === 'student') {
          // Subtle grey background for student cell
          doc.setFillColor(248, 248, 248);
          doc.rect(x, y, cellSize, cellSize, 'F');
        }

        // Cell Borders
        doc.setDrawColor(0, 0, 0);
        
        // Thicker border on edges
        if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
          doc.setLineWidth(0.6);
        } else if ((row + 1) % 5 === 0 || (col + 1) % 5 === 0) {
          doc.setLineWidth(0.35); // 5th line separator
        } else {
          doc.setLineWidth(0.15); // Normal line
        }

        doc.rect(x, y, cellSize, cellSize, 'S');

        // Draw Display Number
        if (showNumbers && !isEmpty) {
          const entry = colorMap.get(cellValue);
          if (entry) {
            let textColor = '#000000';
            if (mode === 'answerKey') {
              textColor = this.getReadableTextColor(entry.hex);
            }
            const cHex = textColor.replace('#', '');
            doc.setTextColor(parseInt(cHex.substring(0, 2), 16), parseInt(cHex.substring(2, 4), 16), parseInt(cHex.substring(4, 6), 16));
            
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(fontSizePt);
            
            LTRTextRenderer.renderText(
              doc,
              String(entry.displayNumber),
              x + (cellSize / 2),
              y + (cellSize / 2),
              { align: 'center', baseline: 'middle' }
            );
          }
        }
      }
    }
  }
}
