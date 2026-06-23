import { jsPDF } from 'jspdf';
import { PdfColorEntry, PdfLayoutResult, PdfLegendLayout } from './PdfTypes';
import { LTRTextRenderer } from '../../pdf/renderers/LTRTextRenderer';

export function getCompactColorName(name: string): string {
  let compacted = name
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*\((.*?)\)\s*/g, '')
    .trim();
    
  if (compacted === 'Açık Kahverengi') compacted = 'Açık Kahve.';
  if (compacted === 'Koyu Kahverengi') compacted = 'Koyu Kahve.';
  if (name === 'Krem (Ten rengi)') compacted = 'Krem';
  if (name === 'Koyu Ten Rengi') compacted = 'Koyu Ten';
  return compacted;
}

export function truncateTextToWidth(
  doc: jsPDF,
  text: string,
  maxWidthMm: number
): string {
  if (doc.getTextWidth(text) <= maxWidthMm) {
    return text;
  }
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxWidthMm) {
    truncated = truncated.slice(0, -1);
  }
  return truncated.length > 0 ? truncated + '...' : text.substring(0, 3) + '...';
}

export function renderPdfLegend(
  doc: jsPDF,
  params: {
    colorEntries: PdfColorEntry[];
    layout: PdfLayoutResult;
    title?: string;
    compact?: boolean;
  }
): void {
  const { colorEntries, layout, title } = params;

  if (colorEntries.length === 0) {
    return;
  }

  // Safety fallback if legendLayout is missing
  let legendLayout: PdfLegendLayout | undefined = layout.legendLayout;
  if (!legendLayout) {
    console.warn('[KARESEL] legendLayout is missing in layout result! Generating safe fallback layout.');
    const marginMm = layout.marginMm || 10;
    const colorCount = colorEntries.length;
    const columns = colorCount <= 6 ? colorCount : Math.ceil(colorCount / 2);
    const rows = colorCount <= 6 ? 1 : 2;
    const widthMm = layout.pageWidthMm ? (layout.pageWidthMm - marginMm * 2) : 190;
    const itemWidthMm = columns > 0 ? (widthMm / columns) : 0;
    const rowHeightMm = 5.5;
    const titleHeightMm = 4;
    const heightMm = titleHeightMm + rows * rowHeightMm;
    const y = layout.pageHeightMm ? (layout.pageHeightMm - marginMm - heightMm - 8) : 250;
    
    legendLayout = {
      x: marginMm,
      y,
      widthMm,
      heightMm,
      titleHeightMm,
      rowHeightMm,
      columns,
      rows,
      itemWidthMm,
      swatchSizeMm: 4,
      numberWidthMm: 5,
      gapMm: 2,
      mode: 'fallback'
    };
  }

  // Draw Title
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  LTRTextRenderer.renderText(doc, title || 'Renk Tablosu:', legendLayout.x, legendLayout.y);

  // Set font for legend items
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(8);

  const columns = legendLayout.columns || 1;
  const itemWidthMm = legendLayout.itemWidthMm;
  const rowHeightMm = legendLayout.rowHeightMm;

  colorEntries.forEach((entry, i) => {
    const colIdx = i % columns;
    const rowIdx = Math.floor(i / columns);

    const entryX = legendLayout!.x + colIdx * itemWidthMm;
    const entryY = legendLayout!.y + 6 + rowIdx * rowHeightMm;

    const rawName = entry.name || `Renk ${entry.displayNumber ?? entry.internalId}`;
    const compactName = getCompactColorName(rawName);
    const displayNumber = entry.displayNumber ?? Number(entry.internalId);

    // Limit name width: itemWidthMm - 2
    const maxTextWidthMm = Math.max(itemWidthMm - 2, 10);

    let label = `${displayNumber}-${rawName}`;
    if (doc.getTextWidth(label) > maxTextWidthMm) {
      label = `${displayNumber}-${compactName}`;
      if (doc.getTextWidth(label) > maxTextWidthMm) {
         const maxNameWidth = maxTextWidthMm - doc.getTextWidth(`${displayNumber}-`);
         label = `${displayNumber}-${truncateTextToWidth(doc, compactName, maxNameWidth)}`;
      }
    }

    doc.setTextColor(0, 0, 0);
    LTRTextRenderer.renderText(doc, label, entryX, entryY);
  });
}

export class PdfLegendRenderer {
  public static renderLegend(
    doc: jsPDF,
    params: {
      colorEntries: PdfColorEntry[];
      layout: PdfLayoutResult;
      title?: string;
    }
  ): void {
    renderPdfLegend(doc, params);
  }
}
