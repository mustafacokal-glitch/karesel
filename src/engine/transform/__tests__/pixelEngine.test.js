import { describe, it, expect } from 'vitest';
import { processImageToGrid } from '../pixelEngine';

describe('pixelEngine - processImageToGrid', () => {
  it('should correctly pool pixels into a grid and match snapshot', async () => {
    const width = 4;
    const height = 4;
    const data = new Uint8ClampedArray(width * height * 4);

    const setPixel = (x, y, r, g, b, a = 255) => {
      const idx = (y * width + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
    };

    // 4x4 görseli, 2x2'lik bir grid'e indirgeyeceğiz (Her grid hücresi 2x2=4 pikselden oluşacak)
    
    // Sol üst blok (0,0) - Siyah ağırlıklı (3 adet Siyah, 1 adet Beyaz)
    setPixel(0, 0, 56, 53, 54); // Siyah
    setPixel(1, 0, 56, 53, 54); // Siyah
    setPixel(0, 1, 56, 53, 54); // Siyah
    setPixel(1, 1, 255, 255, 255); // Beyaz

    // Sağ üst blok (1,0) - Kırmızı ağırlıklı (4 adet Kırmızı)
    setPixel(2, 0, 237, 10, 63); // Kırmızı
    setPixel(3, 0, 237, 10, 63);
    setPixel(2, 1, 237, 10, 63);
    setPixel(3, 1, 237, 10, 63);

    // Sol alt blok (0,1) - Boş/Şeffaf ağırlıklı (3 adet şeffaf, 1 adet Siyah)
    setPixel(0, 2, 0, 0, 0, 0); // Şeffaf
    setPixel(1, 2, 0, 0, 0, 0);
    setPixel(0, 3, 0, 0, 0, 0);
    setPixel(1, 3, 56, 53, 54); // Siyah (Kontur kuralını test etmek için yeterli, %25 > %15)

    // Sağ alt blok (1,1) - Beyaz (Gürültü simülasyonu)
    // 255, 255, 255 ama alpha 120 (şeffaflık sınırı altında, dolayısıyla yoksayılmalı)
    setPixel(2, 2, 255, 255, 255, 120);
    setPixel(3, 2, 255, 255, 255, 120);
    setPixel(2, 3, 255, 255, 255, 120);
    setPixel(3, 3, 255, 255, 255, 120);

    const imageData = { width, height, data };

    // 2 satır, 2 sütun, zorluk seviyesi 4 (tüm renkler aktif)
    const result = await processImageToGrid(imageData, 2, 2, 4);

    expect(result).toMatchSnapshot();
  });
});
