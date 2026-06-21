import { jsPDF } from 'jspdf';

/**
 * Handles text rendering for Left-to-Right (LTR) languages like English and Turkish.
 * This abstracts away jsPDF text calls so we can plug in an RTL renderer in the future.
 */
export class LTRTextRenderer {
  public static renderText(doc: jsPDF, text: string | string[], x: number, y: number, options?: any) {
    doc.text(text, x, y, options);
  }
}
