import { jsPDF } from 'jspdf';
// @ts-ignore
import robotoRegularUrl from '../../../public/fonts/Roboto-Regular.ttf?url';
// @ts-ignore
import robotoBoldUrl from '../../../public/fonts/Roboto-Bold.ttf?url';

export class PdfFontManager {

  private static async fetchFontBase64(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Font yüklenemedi: ${url}`);
    }
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
  }

  public static async registerPdfFonts(doc: jsPDF): Promise<void> {
    try {
      const [regularB64, boldB64] = await Promise.all([
        this.fetchFontBase64(robotoRegularUrl),
        this.fetchFontBase64(robotoBoldUrl)
      ]);

      doc.addFileToVFS('Roboto-Regular.ttf', regularB64);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
      doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
      
    } catch (e) {
      console.error('[KARESEL] PDF Font Manager failed to register fonts', e);
      throw e;
    }
  }
}
