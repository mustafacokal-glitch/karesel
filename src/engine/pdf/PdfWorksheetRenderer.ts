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
    const { headerX, pageWidthMm, marginMm } = layout;
    const rightMargin = pageWidthMm - marginMm;

    const titleY = layout.titleY ?? (layout.headerY + 8);
    const subtitleY = layout.subtitleY ?? (layout.headerY + 14);
    const metaY = layout.metaY ?? (layout.headerY + 22);

    // Title
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    const title = isStudentPage
      ? (input.title || 'KARESEL KODLAMA ÇALIŞMA KAĞIDI')
      : 'ÖĞRETMEN ÇÖZÜM ANAHTARI';
    
    LTRTextRenderer.renderText(doc, title, pageWidthMm / 2, titleY, { align: 'center' });

    // Subheader
    doc.setFont('Roboto', 'normal');
    doc.setFontSize(10);
    const modeLevelText = `${input.modeLabel || 'Eğitsel Yapay Zeka'} - ${input.difficultyLabel || 'Orta'}`;
    LTRTextRenderer.renderText(doc, modeLevelText, pageWidthMm / 2, subtitleY, { align: 'center' });

    // Student info row
    if (isStudentPage) {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(10);
      LTRTextRenderer.renderText(doc, 'Adı Soyadı: ...................................................', headerX, metaY);
      LTRTextRenderer.renderText(doc, 'Sınıfı: ........   Tarih: ..../..../........', rightMargin, metaY, { align: 'right' });
    }
  }

  private static renderInstruction(
    doc: jsPDF,
    _input: PdfWorksheetInput,
    layout: PdfLayoutResult,
    isStudentPage: boolean
  ) {
    const instructionY = layout.instructionY ?? (layout.gridY - 4);
    if (instructionY > layout.headerY + 15) {
      doc.setFont('Roboto', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(50, 50, 50);
      
      const text = isStudentPage
        ? 'Yönerge: Aşağıdaki kareleri renk tablosundaki numaralara göre boya.'
        : 'Bu sayfa öğretmen kontrolü içindir. Öğrenci sayfasıyla aynı renk kodlarını kullanır.';
      
      if (isStudentPage) {
        LTRTextRenderer.renderText(doc, text, layout.headerX, instructionY);
      } else {
        LTRTextRenderer.renderText(doc, text, layout.pageWidthMm / 2, instructionY, { align: 'center' });
      }
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
    this.renderInstruction(doc, input, layout, true);
    this.renderFooter(doc, input, layout);
  }

  public static renderAnswerKeyPage(
    doc: jsPDF,
    input: PdfWorksheetInput,
    layout: PdfLayoutResult
  ): void {
    this.renderHeaderAndInfo(doc, input, layout, false);
    this.renderInstruction(doc, input, layout, false);
    
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
