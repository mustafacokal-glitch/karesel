/**
 * ============================================================
 *  pixelEngine.ts — Projenin Matematiksel Kalbi
 *  Mode-Pooling (Çoğunluk Oylaması) + LAB Renk Uzayında Palette Eşleme
 *  + Kontur Koruması (%15 Siyah kuralı)
 * ============================================================
 */

import { PIPELINE_CONFIG } from '../../config/pipelineConfig';
import { PALETTE, PALETTE_LAB, rgb2lab, rgb2labFast, colorDistLABFlat, getPaletteForDifficulty } from '../color/colorDistance';

// Siyah renk ID'si (kontur kuralı için)
const BLACK_ID = PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID;
// Boş hücre temsili için
const EMPTY_ID = 0;

// -----------------------------------------------------------
// 3. MODE-POOLING (ÇOĞUNLUK OYLAMASI) İLE GRİD OLUŞTURMA
// -----------------------------------------------------------

/**
 * Bir ImageData nesnesini alır, Mode-Pooling yöntemiyle
 * rows x cols grid'e küçültür.
 *
 * @param {ImageData} imageData - Kaynak görsel verisi
 * @param {number} rows - Hedef satır sayısı
 * @param {number} cols - Hedef sütun sayısı
 * @param {number} difficultyLevel - Zorluk seviyesi (1-4)
 * @returns {{ pixelGrid: number[][], colorMap: object }}
 */
export async function processImageToGrid(imageData: ImageData, rows: number, cols: number, difficultyLevel = 2, offsetX = 0, offsetY = 0) {
  const { width, height, data } = imageData;

  // Her grid hücresine düşen kaynak piksel blok büyüklüğü
  const blockW = width / cols;
  const blockH = height / rows;

  const pixelGrid: number[][] = [];
  const blackRatioGrid: number[][] = [];
  const usedColorIds = new Set<number>();
  const allowedPalette = getPaletteForDifficulty(difficultyLevel);

  // OPTIMIZATION: Pre-allocate typed arrays to entirely prevent GC object creation inside tight loops
  const maxBlockSize = Math.ceil(blockW) * Math.ceil(blockH) + 10;
  const blockR = new Uint8Array(maxBlockSize);
  const blockG = new Uint8Array(maxBlockSize);
  const blockB = new Uint8Array(maxBlockSize);
  const blockX = new Uint16Array(maxBlockSize);
  const blockY = new Uint16Array(maxBlockSize);

  // Buffer for fast LAB conversions
  const sharedLAB = new Float64Array(3);
  let lastYieldTime = Date.now();

  for (let row = 0; row < rows; row++) {
    // Tarayıcının kilitlenmesini engellemek için sadece 16ms'yi geçerse yield et (60fps)
    if (Date.now() - lastYieldTime > 16) {
      await new Promise(r => setTimeout(r, 0));
      lastYieldTime = Date.now();
    }

    const gridRow = [];
    const blackRatioRow = [];

    for (let col = 0; col < cols; col++) {
      const xStart = Math.floor(col * blockW);
      const xEnd = Math.min(width, Math.floor((col + 1) * blockW));
      const yStart = Math.floor(row * blockH);
      const yEnd = Math.min(height, Math.floor((row + 1) * blockH));

      let sumR = 0, sumG = 0, sumB = 0;
      let blockPixelCount = 0;
      let totalPixels = 0;

      // 1. Geçiş: Piksel toplama ve ortalama renk hesaplama
      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const safeX = Math.max(0, Math.min(width - 1, x + offsetX));
          const safeY = Math.max(0, Math.min(height - 1, y + offsetY));
          const srcIdx = (safeY * width + safeX) * 4;
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

          // Push to flat pre-allocated arrays instead of allocating {r,g,b} objects
          blockR[blockPixelCount] = r;
          blockG[blockPixelCount] = g;
          blockB[blockPixelCount] = b;
          blockX[blockPixelCount] = x;
          blockY[blockPixelCount] = y;
          blockPixelCount++;

          sumR += r;
          sumG += g;
          sumB += b;
        }
      }

      // 2. FİLTRE: Hücrenin %10'undan azı doluysa veya hiç piksel yoksa boş say
      if (blockPixelCount < (totalPixels * PIPELINE_CONFIG.PIXEL_ENGINE.MIN_FILL_RATIO) || blockPixelCount === 0) {
        gridRow.push(EMPTY_ID);
        blackRatioRow.push(0);
        continue;
      }

      const avgR = sumR / blockPixelCount;
      const avgG = sumG / blockPixelCount;
      const avgB = sumB / blockPixelCount;
      const [avgL, avgA, avgB_] = rgb2lab(avgR, avgG, avgB);

      const cellCenterX = (xStart + xEnd) / 2;
      const cellCenterY = (yStart + yEnd) / 2;
      const halfW = Math.max((xEnd - xStart) / 2, 1);
      const halfH = Math.max((yEnd - yStart) / 2, 1);

      // 2. Geçiş: Palette eşleme ve kontrast ağırlıklı oylama
      const freqMap = new Map();
      let blackCount = 0;

      for (let i = 0; i < blockPixelCount; i++) {
        const r = blockR[i];
        const g = blockG[i];
        const b = blockB[i];

        rgb2labFast(r, g, b, sharedLAB);
        const pL = sharedLAB[0], pA = sharedLAB[1], pB = sharedLAB[2];

        let minDist = Infinity;
        let paletteId = 1;

        for (let j = 0; j < allowedPalette.length; j++) {
          const palId = allowedPalette[j].id;
          const lab = PALETTE_LAB.get(palId);
          if (!lab) continue;
          const dist = colorDistLABFlat(pL, pA, pB, lab[0], lab[1], lab[2], 1.0);
          if (dist < minDist) {
            minDist = dist;
            paletteId = palId;
          }
        }

        if (paletteId === BLACK_ID) {
          blackCount++;
        }

        let weight = 1.0;

        const ndx = (blockX[i] - cellCenterX) / halfW;
        const ndy = (blockY[i] - cellCenterY) / halfH;
        const normDist = Math.min(Math.sqrt(ndx * ndx + ndy * ndy), 1);
        const { MIN, MAX } = PIPELINE_CONFIG.PIXEL_ENGINE.CENTER_WEIGHT;
        weight *= MAX - (MAX - MIN) * normDist;

        // Kontrast Duyarlılık (Contrast Boost)
        const distToAvg = colorDistLABFlat(pL, pA, pB, avgL, avgA, avgB_, 1.0);
        
        if (distToAvg > PIPELINE_CONFIG.PIXEL_ENGINE.CONTRAST_BOOST.DIST_THRESHOLD) {
          weight *= PIPELINE_CONFIG.PIXEL_ENGINE.CONTRAST_BOOST.WEIGHT_MULTIPLIER;
        }

        // İnce detay renklerini korumak için
        if (PIPELINE_CONFIG.PIXEL_ENGINE.PROTECTED_COLORS.IDS.includes(paletteId)) {
          weight *= PIPELINE_CONFIG.PIXEL_ENGINE.PROTECTED_COLORS.WEIGHT_MULTIPLIER;
        }

        freqMap.set(paletteId, (freqMap.get(paletteId) || 0) + weight);
      }

      // Kontur Kuralı
      let modeId = EMPTY_ID;
      if (blackCount > blockPixelCount * PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.THRESHOLD_RATIO) {
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
        blackRatioRow.push(blockPixelCount > 0 ? blackCount / blockPixelCount : 0);
        continue;
      }

      gridRow.push(modeId);
      blackRatioRow.push(blockPixelCount > 0 ? blackCount / blockPixelCount : 0);
      usedColorIds.add(modeId);
    }

    pixelGrid.push(gridRow);
    blackRatioGrid.push(blackRatioRow);
  }

  // 3. Geçiş: Edge-Aware Downscaling (Senkron Güncelleme)
  const { SECONDARY_THRESHOLD_RATIO, MIN_NEIGHBOR_SUPPORT } = PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE;
  
  // AŞAMA A: Sadece TESPİT et, henüz DEĞİŞTİRME (cascading'i önlemek için)
  const cellsToBlacken: [number, number][] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (pixelGrid[row][col] === BLACK_ID) continue;
      if (blackRatioGrid[row][col] < SECONDARY_THRESHOLD_RATIO) continue;

      let blackNeighbors = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = row + dr, nc = col + dc;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
          // pixelGrid burada hâlâ DEĞİŞMEMİŞ orijinal hal
          if (pixelGrid[nr][nc] === BLACK_ID) blackNeighbors++;
        }
      }
      if (blackNeighbors >= MIN_NEIGHBOR_SUPPORT) {
        cellsToBlacken.push([row, col]);
      }
    }
  }

  // AŞAMA B: Tespit bitti, ŞİMDİ topluca uygula (senkron update)
  for (const [r, c] of cellsToBlacken) {
    pixelGrid[r][c] = BLACK_ID;
    usedColorIds.add(BLACK_ID);
  }

  // colorMap
  const colorMap: Record<number, any> = {};
  for (const paletteId of usedColorIds) {
    const paletteColor = PALETTE.find(p => p.id === paletteId);
    if (paletteColor) {
      colorMap[paletteId] = { ...paletteColor };
    }
  }

  return { pixelGrid, colorMap };
}
