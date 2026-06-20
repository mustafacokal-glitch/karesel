/**
 * ============================================================
 *  pixelEngine.js — Projenin Matematiksel Kalbi
 *  Mode-Pooling (Çoğunluk Oylaması) + RGB Öklid Palette Eşleme
 *  + Kontur Koruması (%15 Siyah kuralı)
 * ============================================================
 */

// -----------------------------------------------------------
// 1. SABİT RENK PALETİ (25'li Standart Kuru Boya)
// -----------------------------------------------------------
export const PALETTE = [
  { id: 1, r: 255, g: 255, b: 255, name: 'Beyaz', hex: '#FFFFFF' },
  { id: 2, r: 252, g: 208, b: 161, name: 'Krem (Ten rengi)', hex: '#FCD0A1' },
  { id: 3, r: 255, g: 153, b: 128, name: 'Koyu Ten Rengi', hex: '#FF9980' },
  { id: 4, r: 251, g: 232, b: 112, name: 'Sarı', hex: '#FBE870' },
  { id: 5, r: 255, g: 174, b: 66, name: 'Koyu Sarı', hex: '#FFAE42' },
  { id: 6, r: 255, g: 136, b: 51, name: 'Turuncu', hex: '#FF8833' },
  { id: 7, r: 237, g: 10, b: 63, name: 'Kırmızı', hex: '#ED0A3F' },
  { id: 8, r: 198, g: 45, b: 66, name: 'Koyu Kırmızı', hex: '#C62D42' },
  { id: 9, r: 251, g: 174, b: 210, name: 'Pembe', hex: '#FBAED2' },
  { id: 10, r: 246, g: 100, b: 175, name: 'Koyu Pembe', hex: '#F664AF' },
  { id: 11, r: 166, g: 142, b: 232, name: 'Açık Mor', hex: '#A68EE8' },
  { id: 12, r: 97, g: 72, b: 184, name: 'Koyu Moru', hex: '#6148B8' },
  { id: 13, r: 67, g: 76, b: 167, name: 'Koyu Mavi', hex: '#434CA7' },
  { id: 14, r: 0, g: 87, b: 197, name: 'Mavi', hex: '#0057C5' },
  { id: 15, r: 100, g: 177, b: 242, name: 'Açık Mavi', hex: '#64B1F2' },
  { id: 16, r: 109, g: 193, b: 229, name: 'Turkuaz', hex: '#6DC1E5' },
  { id: 17, r: 97, g: 188, b: 110, name: 'Su Yeşili', hex: '#61BC6E' },
  { id: 18, r: 126, g: 204, b: 95, name: 'Açık Yeşil', hex: '#7ECC5F' },
  { id: 19, r: 80, g: 141, b: 93, name: 'Yeşil', hex: '#508D5D' },
  { id: 20, r: 46, g: 117, b: 97, name: 'Koyu Yeşil', hex: '#2E7561' },
  { id: 21, r: 214, g: 177, b: 160, name: 'Açık Kahverengi', hex: '#D6B1A0' },
  { id: 22, r: 111, g: 59, b: 52, name: 'Kahverengi', hex: '#6F3B34' },
  { id: 23, r: 124, g: 122, b: 121, name: 'Gri', hex: '#7C7A79' },
  { id: 24, r: 56, g: 53, b: 54, name: 'Siyah', hex: '#383536' }
];

// Siyah renk ID'si (kontur kuralı için)
const BLACK_ID = 24;
// Boş hücre temsili için
const EMPTY_ID = 0;

// -----------------------------------------------------------
// 2. CIELAB RENK MESAFESİ İLE PALETTE EŞLEME
// -----------------------------------------------------------

function rgb2lab(r, g, b) {
  let r_ = r / 255, g_ = g / 255, b_ = b / 255;
  r_ = (r_ > 0.04045) ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
  g_ = (g_ > 0.04045) ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
  b_ = (b_ > 0.04045) ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;
  
  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) / 0.95047;
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) / 1.00000;
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) / 1.08883;
  
  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

/**
 * CIELAB renk uzayında deltaE (algısal renk mesafesi).
 */
export function colorDistLAB(c1, c2, lumaWeight = 1.0) {
  const [l1, a1, b1] = rgb2lab(c1.r, c1.g, c1.b);
  const [l2, a2, b2] = rgb2lab(c2.r, c2.g, c2.b);
  return Math.pow((l1 - l2) * lumaWeight, 2) + Math.pow(a1 - a2, 2) + Math.pow(b1 - b2, 2);
}

/**
 * Geriye dönük uyumluluk için alias
 */
function getDistance(c1, c2) {
  return colorDistLAB(c1, c2);
}

/**
 * Zorluk seviyesine göre kısıtlanmış paleti döndürür.
 * 1. ve 2. seviyelerde bilişsel yükü azaltmak için benzer renkleri çıkarır.
 */
export function getPaletteForDifficulty(level) {
  if (level <= 2) {
    // Sadece ana ve temel ara renkler (Kahverengi, Siyah, Beyaz dahil)
    const allowedIds = [1, 4, 6, 7, 14, 19, 22, 24]; 
    return PALETTE.filter(c => allowedIds.includes(c.id));
  } else if (level === 3) {
    // Orta seviye palet (Bariyer renkler eklenir ama tüm tonlar değil)
    const allowedIds = [1, 4, 5, 6, 7, 9, 11, 14, 16, 19, 22, 23, 24];
    return PALETTE.filter(c => allowedIds.includes(c.id));
  }
  return PALETTE; // Uzman seviyesi: Tüm renkler
}

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
      const xEnd = Math.floor((col + 1) * blockW);
      const yStart = Math.floor(row * blockH);
      const yEnd = Math.floor((row + 1) * blockH);

      // Palette ID -> frekans sayacı
      const freqMap = new Map();
      let totalPixels = 0;
      let opaqueCount = 0;
      let blackCount = 0;

      // Blok içindeki tüm pikselleri tara
      for (let y = yStart; y < yEnd; y++) {
        for (let x = xStart; x < xEnd; x++) {
          const srcIdx = (y * width + x) * 4;
          let alpha = data[srcIdx + 3];
          totalPixels++;

          const r = data[srcIdx];
          const g = data[srcIdx + 1];
          const b = data[srcIdx + 2];

          // 1. FİLTRE: Açık gri ve kirli beyaz JPEG lekelerini kesin olarak sil
          if (r > 215 && g > 215 && b > 215 && Math.abs(r-g) < 20 && Math.abs(g-b) < 20) {
              alpha = 0;
          }

          // Şeffaf pikseli atla (Alpha < 128)
          if (alpha < 128) continue;

          opaqueCount++;

          // Bu pikseli palette eşle (RGB Öklid/CIELAB)
          const paletteId = mapToPalette(r, g, b, allowedPalette);

          // Siyah sayacı
          if (paletteId === BLACK_ID) {
            blackCount++;
          }

          // İnce detayları (göz bebekleri, tohumlar, çizgiler) korumak için belirli renklere ekstra ağırlık ver
          let weight = 1.0;
          // Siyah(24), Kahverengi(22), Koyu Kırmızı(8), Sarı(4)
          if (paletteId === 24 || paletteId === 22 || paletteId === 8 || paletteId === 4) {
             weight = 2.5; // Detay renkleri 2.5 kat daha değerli sayılır
          }

          // Frekansı ağırlıklı artır
          freqMap.set(paletteId, (freqMap.get(paletteId) || 0) + weight);
        }
      }

      // 2. FİLTRE: Hücrenin %10'undan azı doluysa bu bir lekedir, boş say!
      if (opaqueCount < (totalPixels * 0.10)) {
        gridRow.push(EMPTY_ID);
        continue;
      }

      // Çoğunluk şeffafsa boş hücre
      if (opaqueCount === 0) {
        gridRow.push(EMPTY_ID);
        continue;
      }


      // En çok tekrar eden (mode) rengi bul
      let maxFreq = 0;
      let modeId = EMPTY_ID;

      for (const [paletteId, freq] of freqMap) {
        if (freq > maxFreq) {
          maxFreq = freq;
          modeId = paletteId;
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
