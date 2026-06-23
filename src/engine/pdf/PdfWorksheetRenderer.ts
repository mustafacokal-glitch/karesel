import { jsPDF } from 'jspdf';
import { PdfWorksheetInput, PdfLayoutResult } from './PdfTypes';
import { LTRTextRenderer } from '../../pdf/renderers/LTRTextRenderer';

export class PdfWorksheetRenderer {
  private static renderHeaderAndInfo(
    doc: jsPDF,
    input: PdfWorksheetInput,
    layout: PdfLayoutResult,
    isStudentPage: boolean
  ) {
    const { headerX, headerY, pageWidthMm, marginMm } = layout;
    const rightMargin = pageWidthMm - marginMm;

    // Title
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const title = isStudentPage
      ? (input.title || 'KARESEL KODLAMA ÇALIŞMA KAĞIDI')
      : 'ÖĞRETMEN ÇÖZÜM ANAHTARI';
    
    LTRTextRenderer.renderText(doc, title, pageWidthMm / 2, headerY + 8, { align: 'center' });

    // Subheader
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10);
    if (isStudentPage) {
      const modeLevelText = `${input.modeLabel || 'Eğitsel Yapay Zeka'} - ${input.difficultyLabel || 'Orta'}`;
      LTRTextRenderer.renderText(doc, modeLevelText, pageWidthMm / 2, headerY + 14, { align: 'center' });

      // Student info row
      const infoY = headerY + 22;
      LTRTextRenderer.renderText(doc, 'Adı Soyadı: ...................................................', headerX, infoY);
      LTRTextRenderer.renderText(doc, 'Sınıfı: ........   Tarih: ..../..../........', rightMargin, infoY, { align: 'right' });
    } else {
      LTRTextRenderer.renderText(doc, 'Bu sayfa öğretmen kontrolü içindir. Öğrenci sayfasıyla aynı renk kodlarını kullanır.', pageWidthMm / 2, headerY + 14, { align: 'center' });
    }
  }

  private static renderInstruction(
    doc: jsPDF,
    _input: PdfWorksheetInput,
    layout: PdfLayoutResult
  ) {
    const instructionY = layout.gridY - 4; // Just above the grid
    if (instructionY > layout.headerY + layout.headerHeightMm) {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      LTRTextRenderer.renderText(doc, 'Yönerge: Aşağıdaki kareleri renk tablosundaki numaralara göre boya.', layout.headerX, instructionY);
    }
  }

  private static renderFooter(
    doc: jsPDF,
    _input: PdfWorksheetInput,
    layout: PdfLayoutResult
  ) {
    const footerY = layout.pageHeightMm - 5;
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    LTRTextRenderer.renderText(doc, 'Karesel Kodlama Stüdyosu', layout.marginMm, footerY);
    LTRTextRenderer.renderText(doc, 'www.mustafacokal.com.tr', layout.pageWidthMm - layout.marginMm, footerY, { align: 'right' });
  }

  public static renderStudentWorksheetPage(
    doc: jsPDF,
    input: PdfWorksheetInput,
    layout: PdfLayoutResult
  ): void {
    this.renderHeaderAndInfo(doc, input, layout, true);
    this.renderInstruction(doc, input, layout);
    this.renderFooter(doc, input, layout);
  }

  public static renderAnswerKeyPage(
    doc: jsPDF,
    input: PdfWorksheetInput,
    layout: PdfLayoutResult
  ): void {
    this.renderHeaderAndInfo(doc, input, layout, false);
    
    // Render original image if requested and layout allows
    if (input.includeOriginalReference && input.originalImageDataUrl && layout.originalImageWidthMm && layout.originalImageHeightMm) {
      try {
        doc.addImage(
          input.originalImageDataUrl,
          'PNG',
          layout.originalImageX!,
          layout.originalImageY!,
          layout.originalImageWidthMm,
          layout.originalImageHeightMm,
          undefined,
          'FAST'
        );
        doc.setFont('Roboto', 'normal');
        doc.setFontSize(7);
        LTRTextRenderer.renderText(doc, 'Orijinal Görsel', layout.originalImageX! + (layout.originalImageWidthMm / 2), layout.originalImageY! + layout.originalImageHeightMm + 3, { align: 'center' });
      } catch (e) {
        console.warn('[KARESEL] Failed to render original image to PDF', e);
      }
    }

    this.renderFooter(doc, input, layout);
  }
}
