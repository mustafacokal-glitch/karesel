/**
 * ============================================================
 *  pixelEngine.js — Projenin Matematiksel Kalbi
 *  Mode-Pooling (Çoğunluk Oylaması) + RGB Öklid Palette Eşleme
 *  + Kontur Koruması (%15 Siyah kuralı)
 * ============================================================
 */

import { PIPELINE_CONFIG } from '../../config/pipelineConfig';
import { PALETTE, colorDistLAB, getPaletteForDifficulty } from '../color/colorDistance';

// Siyah renk ID'si (kontur kuralı için)
const BLACK_ID = PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID;
// Boş hücre temsili için
const EMPTY_ID = 0;

/**
 * Bir (r,g,b) rengini verilen palet içindeki en yakın renge eşler.
 * RGB Öklid/CIELAB mesafesi kullanılır.
 */
function mapToPalette(r, g, b, allowedPalette = PALETTE) {
  const target = { r, g, b };
  let minDist = Infinity;
  let bestId = 1; // Varsayılan: Beyaz

  for (let i = 0; i < allowedPalette.length; i++) {
    const dist = colorDistLAB(target, allowedPalette[i], 1.0); // Normal CIELAB mesafesi
    if (dist < minDist) {
      minDist = dist;
      bestId = allowedPalette[i].id;
    }
  }

  return bestId;
}

// -----------------------------------------------------------
// 3. MODE-POOLING (ÇOĞUNLUK OYLAMASI) İLE GRİD OLUŞTURMA
// -----------------------------------------------------------

/**
 * Bir ImageData nesnesini alır, Mode-Pooling yöntemiyle
 * rows x cols grid'e küçültür.
 *
 * Her hedef hücre için:
 * 1. NxN piksel bloğundaki her bir opak pikseli (Alpha >= 128)
 *    RGB Öklid mesafesi ile PALETTE içindeki en yakın renge eşle.
 * 2. Hangi PALETTE renginin (ID) en çok tekrar ettiğini say.
 * 3. Kontur Kuralı: Bloktaki piksellerin %15'inden fazlası
 *    Siyah (ID: 24) ise hücreyi direkt Siyah yap.
 * 4. Değilse en çok tekrar eden (mode) rengi ata.
 * 5. Çoğunluk şeffafsa 0 (boş) ata.
 *
 * @param {ImageData} imageData - Kaynak görsel verisi
 * @param {number} rows - Hedef satır sayısı
 * @param {number} cols - Hedef sütun sayısı
 * @param {number} difficultyLevel - Zorluk seviyesi (1-4)
 * @returns {{ pixelGrid: number[][], colorMap: object }}
 */
export async function processImageToGrid(imageData, rows, cols, difficultyLevel = 2) {
  const { width, height, data } = imageData;

  // Her grid hücresine düşen kaynak piksel blok büyüklüğü
  const blockW = width / cols;
  const blockH = height / rows;

  const pixelGrid = [];
  const usedColorIds = new Set();
  const allowedPalette = getPaletteForDifficulty(difficultyLevel);

  for (let row = 0; row < rows; row++) {
    // Tarayıcının kilitlenmesini engellemek için (event loop'a nefes aldır)
    if (row % 2 === 0) {
      await new Promise(r => setTimeout(r, 0));
    }

    const gridRow = [];

    for (let col = 0; col < cols; col++) {
      // Bu hücrenin kaynak görseldeki sınırları
      const xStart = Math.floor(col * blockW);
      const xEnd = Math.min(width, Math.floor((col + 1) * blockW));
      const yStart = Math.floor(row * blockH);
      const yEnd = Math.min(height, Math.floor((row + 1) * blockH));

      let sumR = 0, sumG = 0, sumB = 0;
      const blockPixels = [];
      let totalPixels = 0;

      // 1. Geçiş: Piksel toplama ve ortalama renk hesaplama
      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const srcIdx = (y * width + x) * 4;
          let alpha = data[srcIdx + 3];
          totalPixels++;

          const r = data[srcIdx];
          const g = data[srcIdx + 1];
          const b = data[srcIdx + 2];

          // 1. FİLTRE: Açık gri ve kirli beyaz JPEG lekelerini sil
          const { MIN_RGB, MAX_DIFF } = PIPELINE_CONFIG.PIXEL_ENGINE.JPEG_NOISE;
          if (r > MIN_RGB && g > MIN_RGB && b > MIN_RGB && Math.abs(r - g) < MAX_DIFF && Math.abs(g - b) < MAX_DIFF) {
            alpha = 0;
          }

          if (alpha < PIPELINE_CONFIG.PIXEL_ENGINE.ALPHA_THRESHOLD) continue;

          blockPixels.push({ r, g, b });
          sumR += r;
          sumG += g;
          sumB += b;
        }
      }

      // 2. FİLTRE: Hücrenin %10'undan azı doluysa veya hiç piksel yoksa boş say
      if (blockPixels.length < (totalPixels * PIPELINE_CONFIG.PIXEL_ENGINE.MIN_FILL_RATIO) || blockPixels.length === 0) {
        gridRow.push(EMPTY_ID);
        continue;
      }

      const avgR = sumR / blockPixels.length;
      const avgG = sumG / blockPixels.length;
      const avgB = sumB / blockPixels.length;
      const avgColor = { r: avgR, g: avgG, b: avgB };

      // 2. Geçiş: Palette eşleme ve kontrast ağırlıklı oylama
      const freqMap = new Map();
      let blackCount = 0;

      for (const p of blockPixels) {
        const paletteId = mapToPalette(p.r, p.g, p.b, allowedPalette);

        if (paletteId === BLACK_ID) {
          blackCount++;
        }

        let weight = 1.0;

        // Kontrast Duyarlılık (Contrast Boost): Blok ortalamasından algısal olarak uzak piksellere ağırlık ver
        const distToAvg = colorDistLAB(p, avgColor);
        if (distToAvg > PIPELINE_CONFIG.PIXEL_ENGINE.CONTRAST_BOOST.DIST_THRESHOLD) {
          weight *= PIPELINE_CONFIG.PIXEL_ENGINE.CONTRAST_BOOST.WEIGHT_MULTIPLIER;
        }

        // İnce detay renklerini korumak için korumalı renklere ekstra ağırlık ver
        if (PIPELINE_CONFIG.PIXEL_ENGINE.PROTECTED_COLORS.IDS.includes(paletteId)) {
          weight *= PIPELINE_CONFIG.PIXEL_ENGINE.PROTECTED_COLORS.WEIGHT_MULTIPLIER;
        }

        freqMap.set(paletteId, (freqMap.get(paletteId) || 0) + weight);
      }

      // Kontur Kuralı: Eğer blok içindeki siyah oranı %15'ten fazlaysa detayı korumak için direkt Siyah yap
      let modeId = EMPTY_ID;
      if (blackCount > blockPixels.length * PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.THRESHOLD_RATIO) {
        modeId = BLACK_ID;
      } else {
        // En çok tekrar eden (mode) rengi bul
        let maxFreq = 0;
        for (const [paletteId, freq] of freqMap) {
          if (freq > maxFreq) {
            maxFreq = freq;
            modeId = paletteId;
          }
        }
      }

      // Mode bulunamazsa boş
      if (modeId === EMPTY_ID) {
        gridRow.push(EMPTY_ID);
        continue;
      }

      gridRow.push(modeId);
      usedColorIds.add(modeId);
    }

    pixelGrid.push(gridRow);
  }

  // colorMap: OBJE (Dictionary) olarak, sadece fiilen kullanılan renkleri dahil et
  // ID'ler anahtar (key), renk bilgisi değer (value)
  const colorMap = {};
  for (const paletteId of usedColorIds) {
    const paletteColor = PALETTE.find(p => p.id === paletteId);
    if (paletteColor) {
      colorMap[paletteId] = { ...paletteColor };
    }
  }

  return { pixelGrid, colorMap };
}
