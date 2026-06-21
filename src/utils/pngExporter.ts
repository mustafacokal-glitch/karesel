/**
 * Canvas içeriğini PNG formatında bilgisayara indiren yardımcı fonksiyon.
 *
 * @param {HTMLCanvasElement} canvasElement - İndirilecek canvas elementı
 * @param {string} fileName - Kaydedilecek dosya adı
 */
export function downloadGridAsPNG(canvasElement: HTMLCanvasElement | null, fileName: string): void {
  if (!canvasElement) {
    console.warn('[pngExporter] Canvas elementi bulunamadı.');
    return;
  }

  try {
    const dataURL = canvasElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err: unknown) {
    console.error('[pngExporter] PNG indirilirken hata oluştu:', err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error('Görsel indirilirken bir hata oluştu: ' + message);
  }
}
