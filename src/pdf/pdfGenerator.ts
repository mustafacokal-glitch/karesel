/**
 * jsPDF Vektörel Yazdırma Motoru
 * 
 * Yeni Mimari: src/engine/pdf
 */

import { jsPDF } from 'jspdf';
import { PdfFontManager } from '../engine/pdf/PdfFontManager';
import { PdfLayoutEngine } from '../engine/pdf/PdfLayoutEngine';
import { PdfGridRenderer } from '../engine/pdf/PdfGridRenderer';
import { PdfLegendRenderer } from '../engine/pdf/PdfLegendRenderer';
import { PdfWorksheetRenderer } from '../engine/pdf/PdfWorksheetRenderer';
import { PdfQualityReporter } from '../engine/pdf/PdfQualityReporter';
import { PdfWorksheetInput, PdfColorEntry } from '../engine/pdf/PdfTypes';
import { normalizeColorEntryName } from '../engine/color/ColorNameResolver';

/**
 * Store state'ini alarak PDF'i üretir ve indirir.
 */
export const generateActivityPDF = async (state: any, options: any = { paperSize: 'a4', printMode: 'color' }) => {
  try {
    const {
      pixelGrid,
      solutionGrid,
      colorMap,
      orientation = 'portrait',
      gridDimensions = { rows: 16, cols: 16 },
      originalImageDataUrl,
      difficultyLevel
    } = state;

    if (!pixelGrid || !Array.isArray(pixelGrid) || pixelGrid.length === 0) {
      throw new Error('Geçersiz pixelGrid: Veri bulunamadı. Lütfen önce "Etkinlik Sayfası Oluştur" butonuna basın.');
    }

    const rows = gridDimensions.rows || gridDimensions.height || pixelGrid.length;
    const cols = gridDimensions.cols || gridDimensions.width || pixelGrid[0]?.length || 0;

    // Build Color Entries
    const colorEntries: PdfColorEntry[] = [];
    if (colorMap) {
      Object.keys(colorMap).forEach((idStr) => {
        const id = Number(idStr);
        const entry = colorMap[id];
        
        const normalized = normalizeColorEntryName(
          { id, hex: entry.hex || entry.color || '#000000', name: entry.name || entry.label },
          { displayNumber: entry.displayNumber ?? id }
        );

        colorEntries.push({
          internalId: id,
          displayNumber: entry.displayNumber ?? id,
          hex: normalized.hex || '#000000',
          name: normalized.name
        });
      });
    }

    const input: PdfWorksheetInput = {
      grid: pixelGrid,
      colorEntries,
      title: 'KARESEL KODLAMA ÇALIŞMA KAĞIDI',
      modeLabel: 'Eğitsel Yapay Zeka',
      difficultyLabel: difficultyLevel === 1 ? 'Kolay' : difficultyLevel === 2 ? 'Orta' : difficultyLevel === 3 ? 'Zor' : 'Uzman',
      originalImageDataUrl,
      includeStudentWorksheet: true,
      includeAnswerKey: true,
      includeLegend: true,
      includeCoordinates: true,
      includeOriginalReference: true
    };

    // Calculate layout for auto orientation
    const layout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: cols,
      gridHeight: rows,
      colorCount: colorEntries.length,
      pageKind: 'student',
      includeLegend: true,
      includeCoordinates: true,
      preferredOrientation: orientation === 'landscape' ? 'strict-landscape' : 'strict-portrait'
    });

    const doc = new jsPDF({
      orientation: layout.orientation,
      unit: 'mm',
      format: options.paperSize === 'letter' ? 'letter' : 'a4'
    });

    // Register fonts
    await PdfFontManager.registerPdfFonts(doc);

    // Page 1: Student
    PdfWorksheetRenderer.renderStudentWorksheetPage(doc, input, layout);
    PdfGridRenderer.renderPdfGrid(doc, {
      grid: pixelGrid,
      colorEntries,
      layout,
      mode: 'student',
      showNumbers: true,
      showCoordinates: true
    });
    PdfLegendRenderer.renderLegend(doc, { colorEntries, layout });

    PdfQualityReporter.createReport({ input, layout, pageKind: 'student' });

    // Page 2: Answer Key
    const solutionData = solutionGrid && Array.isArray(solutionGrid) && solutionGrid.length > 0 ? solutionGrid : pixelGrid;
    
    // Recalculate layout for answer key (original image reference might change it slightly, but usually same orientation)
    const answerKeyLayout = PdfLayoutEngine.calculatePdfLayout({
      gridWidth: cols,
      gridHeight: rows,
      colorCount: colorEntries.length,
      pageKind: 'answerKey',
      includeLegend: true,
      includeCoordinates: true,
      includeOriginalReference: true,
      preferredOrientation: layout.orientation === 'landscape' ? 'strict-landscape' : 'strict-portrait'
    });

    doc.addPage(options.paperSize === 'letter' ? 'letter' : 'a4', answerKeyLayout.orientation);
    
    PdfWorksheetRenderer.renderAnswerKeyPage(doc, input, answerKeyLayout);
    PdfGridRenderer.renderPdfGrid(doc, {
      grid: solutionData,
      colorEntries,
      layout: answerKeyLayout,
      mode: 'answerKey',
      showNumbers: true,
      showCoordinates: true
    });
    PdfLegendRenderer.renderLegend(doc, { colorEntries, layout: answerKeyLayout });

    PdfQualityReporter.createReport({ input, layout: answerKeyLayout, pageKind: 'answerKey' });

    return doc.output('blob');
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    throw error;
  }
};

export default generateActivityPDF;