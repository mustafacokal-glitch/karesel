/**
 * ============================================================
 *  gridCleaners.js — Hücre Temizleme ve Sınır Filtreleri
 *  Çocuklar için pürüzsüz, hatasız grid çıktısı üretir.
 *
 *  Bağımlılık: pixelEngine.js çıktısındaki pixelGrid (2D dizi,
 *  her hücre palette ID'si tutar, 0 = boş/beyaz) ve colorMap.
 * ============================================================
 */
import { colorDistLAB, PALETTE } from './pixelEngine';

// -----------------------------------------------------------
// 1. ZHANG-SUEN İSKELETLEŞTİRME (Thinning)
// -----------------------------------------------------------

/**
 * 8-komşu değerlerini [P2,P3,P4,P5,P6,P7,P8,P9] sırasıyla döndürür.
 *
 *  P9 P2 P3
 *  P8 P1 P4
 *  P7 P6 P5
 *
 * @param {number[][]} grid
 * @param {number} r - Satır
 * @param {number} c - Sütun
 * @returns {number[]} 8 elemanlı dizi
 */
function _getNeighbors(grid, r, c) {
  return [
    grid[r - 1][c],       // P2 (üst)
    grid[r - 1][c + 1],   // P3 (sağ üst)
    grid[r][c + 1],       // P4 (sağ)
    grid[r + 1][c + 1],   // P5 (sağ alt)
    grid[r + 1][c],       // P6 (alt)
    grid[r + 1][c - 1],   // P7 (sol alt)
    grid[r][c - 1],       // P8 (sol)
    grid[r - 1][c - 1],   // P9 (sol üst)
  ];
}

/**
 * 0→1 (background→foreground) geçiş sayısını hesaplar.
 * Zhang-Suen'in A(P) değeri.
 *
 * @param {number[]} neighbors - [P2..P9]
 * @param {number} foreground - Kontur rengi ID'si
 * @returns {number}
 */
function _countTransitions(neighbors, foreground) {
  let count = 0;
  const binary = neighbors.map(v => (v === foreground ? 1 : 0));
  for (let i = 0; i < 8; i++) {
    if (binary[i] === 0 && binary[(i + 1) % 8] === 1) count++;
  }
  return count;
}

/**
 * Siyah veya çok koyu olan kontur (sınır) piksellerini algılayıp,
 * kalınlıklarını Zhang-Suen iskeletleştirme algoritmasıyla
 * tam 1 hücre kalınlığına indirir.
 *
 * Silinen sınır piksellerinin yerini çevredeki en baskın renk doldurur.
 *
 * @param {number[][]} grid - 2D grid (hücre değerleri palette ID)
 * @param {number} outlineId - Kontur renginin palette ID'si (örn. 24 = Siyah)
 * @returns {number[][]} İskeletleştirilmiş grid
 */
export function zhangSuenThinning(grid, outlineId) {
  try {
    if (!outlineId || outlineId <= 0) return grid;

    const rows = grid.length;
    const cols = grid[0].length;

    // Çok büyük gridlerde bile Zhang-Suen algoritması JavaScript'te milisaniyeler içinde çalışır.
    // Bu yüzden grid boyutuna bakılmaksızın her zaman iskeletleştirme yapılır.

    const result = grid.map(row => [...row]);

    let changed = true;
    let maxIter = 30; // 30 iterasyon tipik grid desenleri için yeterli
    while (changed && maxIter-- > 0) {
      changed = false;

      // ---- Alt iterasyon 1 ----
      const mark1 = [];
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          if (result[r][c] !== outlineId) continue;

          const nb = _getNeighbors(result, r, c);

          // B(P): foreground komşu sayısı [2,6] aralığında olmalı
          const B = nb.filter(v => v === outlineId).length;
          if (B < 2 || B > 6) continue;

          // A(P): 0→1 geçiş sayısı tam 1 olmalı
          const A = _countTransitions(nb, outlineId);
          if (A !== 1) continue;

          // Şart 4: P2 * P4 * P6 == 0
          if (nb[0] === outlineId && nb[2] === outlineId && nb[4] === outlineId) continue;
          // Şart 5: P4 * P6 * P8 == 0
          if (nb[2] === outlineId && nb[4] === outlineId && nb[6] === outlineId) continue;

          mark1.push([r, c]);
        }
      }

      for (const [r, c] of mark1) {
        result[r][c] = 0;
        changed = true;
      }

      // ---- Alt iterasyon 2 ----
      const mark2 = [];
      for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
          if (result[r][c] !== outlineId) continue;

          const nb = _getNeighbors(result, r, c);

          const B = nb.filter(v => v === outlineId).length;
          if (B < 2 || B > 6) continue;

          const A = _countTransitions(nb, outlineId);
          if (A !== 1) continue;

          // Şart 4: P2 * P4 * P8 == 0
          if (nb[0] === outlineId && nb[2] === outlineId && nb[6] === outlineId) continue;
          // Şart 5: P2 * P6 * P8 == 0
          if (nb[0] === outlineId && nb[4] === outlineId && nb[6] === outlineId) continue;

          mark2.push([r, c]);
        }
      }

      for (const [r, c] of mark2) {
        result[r][c] = 0;
        changed = true;
      }
    }

    // ---- Silinen sınır piksellerini çevredeki en baskın renkle doldur ----
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (result[r][c] !== 0 || grid[r][c] !== outlineId) continue;
        // Bu hücre silinmiş: çevredeki renk dağılımına bak
        const colorCounts = new Map();
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            const val = grid[nr][nc]; // <--- DEĞİŞİKLİK BURADA: result yerine grid
            if (val !== outlineId) {
              colorCounts.set(val, (colorCounts.get(val) || 0) + 1);
            }
          }
        }
        if (colorCounts.size > 0) {
          let maxCount = -1;
          let bestColor = 0;
          for (const [color, count] of colorCounts) {
            // Eğer count eşitse ve yeni renk 0 değilse (dani dolu bir renkse), dolu rengi tercih et
            if (count > maxCount || (count === maxCount && color !== 0 && bestColor === 0)) { 
              maxCount = count; 
              bestColor = color; 
            }
          }
          result[r][c] = bestColor;
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[gridCleaners] zhangSuenThinning hatası:', err);
    return grid;
  }
}

// -----------------------------------------------------------
// 1.5. GÜVENLİ BLOK İNCELTME (Safe Block Thinning)
// -----------------------------------------------------------

/**
 * Zhang-Suen algoritmasının hatları kopardığı durumlarda alternatif olarak
 * sadece 2x2 siyah blokları tespit edip "L" biçimine indirerek
 * kalın çizgileri güvenli bir şekilde 1 piksel kalınlığa çeker.
 * 
 * @param {number[][]} grid - 2D grid
 * @param {number} outlineId - Kontur renginin palette ID'si
 * @returns {number[][]} İncelmiş grid
 */
export function safeBlockThinning(grid, outlineId) {
  try {
    if (!outlineId || outlineId <= 0) return grid;
    const rows = grid.length;
    const cols = grid[0].length;
    const result = grid.map(row => [...row]);

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        // Eğer 2x2 blok tamamen kontur rengi ise
        if (result[r][c] === outlineId &&
            result[r][c+1] === outlineId &&
            result[r+1][c] === outlineId &&
            result[r+1][c+1] === outlineId) {
          // Sol alt pikseli sil (kopmayı engeller, kalınlığı azaltır)
          result[r+1][c] = 0;
        }
      }
    }

    // Silinen pikselleri (0 olanları) en yakın komşu renkle doldur
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (result[r][c] === 0 && grid[r][c] === outlineId) {
          const colorCounts = new Map();
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                const val = result[nr][nc];
                if (val !== 0 && val !== outlineId) {
                  colorCounts.set(val, (colorCounts.get(val) || 0) + 1);
                }
              }
            }
          }
          let bestColor = 0;
          let maxCount = 0;
          for (const [color, count] of colorCounts) {
             if (count > maxCount) { maxCount = count; bestColor = color; }
          }
          if (bestColor !== 0) {
            result[r][c] = bestColor;
          } else {
             result[r][c] = grid[r][c]; // Renk bulunamazsa geri al
          }
        }
      }
    }
    return result;
  } catch (err) {
    console.error('[gridCleaners] safeBlockThinning hatası:', err);
    return grid;
  }
}


// -----------------------------------------------------------
// 2. İZOLE PİKSELLERİ TEMİZLEME
// -----------------------------------------------------------

/**
 * Çevresindeki 8 komşusundan en fazla 1 tanesi kendi renginde olan
 * (1-2 piksellik izole leke) hücreleri tespit edip,
 * komşularda en çok tekrar eden renge dönüştürür.
 *
 * ÖNEMLİ: Siyah konturlara (id:24) veya Sarı çekirdek/göz (id:4)
 * gibi yüksek kontrastlı önemli detaylara dokunmaz.
 *
 * @param {number[][]} grid - 2D grid
 * @param {object} _colors - colorMap (yalnızca API uyumu, korunan ID'ler sabit)
 * @returns {number[][]} Temizlenmiş grid
 */
export function cleanIsolatedPixels(grid, _colors) {
  try {
    const rows = grid.length;
    const cols = grid[0].length;
    const result = grid.map(row => [...row]);

    // Dokunulmayacak kritik renk ID'leri
    const PROTECTED = new Set([24, 4, 1]); // Siyah (24), Sarı (4), Beyaz (1)

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const current = result[r][c];
        if (current === 0) continue;
        if (PROTECTED.has(current)) continue;

        // 8 komşuda kaç tane aynı renkten var?
        let sameCount = 0;
        const neighborFreq = new Map();

        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            const val = result[nr][nc];
            if (val === current) sameCount++;
            if (val !== 0) {
              neighborFreq.set(val, (neighborFreq.get(val) || 0) + 1);
            }
          }
        }

        // Yalnızca tamamen yalnız olanları (hiç aynı renkte komşusu olmayanları) izole say
        if (sameCount === 0) {
          let maxCount = 0;
          let bestColor = 0;
          for (const [color, count] of neighborFreq) {
            if (color !== current && count > maxCount) {
              maxCount = count;
              bestColor = color;
            }
          }
          if (bestColor !== 0) {
            // Kontrast kontrolü (deltaE)
            const currentColorData = _colors[current] || PALETTE.find(p => p.id === current);
            const bestColorData = _colors[bestColor] || PALETTE.find(p => p.id === bestColor);
            
            let shouldProtect = false;
            if (currentColorData && bestColorData) {
              const dist = colorDistLAB(currentColorData, bestColorData);
              // CIELAB'da > 1500 çok yüksek bir zıtlık anlamına gelir (kareler toplamı)
              if (dist > 1500) {
                 shouldProtect = true;
              }
            }
            
            if (!shouldProtect) {
              result[r][c] = bestColor;
            }
          }
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[gridCleaners] cleanIsolatedPixels hatası:', err);
    return grid;
  }
}

// -----------------------------------------------------------
// 3. DELİK DOLDURMA
// -----------------------------------------------------------

/**
 * Çevresi (en az 5 komşusu) tamamen dolu bir renk bloğuyla çevrili
 * olan, ortada kalmış tekil beyaz (id: 0) delikleri o baskın renkle
 * doldurur.
 *
 * @param {number[][]} grid - 2D grid
 * @returns {number[][]} Delikleri doldurulmuş grid
 */
export function fillHoles(grid) {
  try {
    const rows = grid.length;
    const cols = grid[0].length;
    const result = grid.map(row => [...row]);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (result[r][c] !== 0) continue;

        // 8 komşudaki renk frekansını hesapla
        const freq = new Map();
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
            const val = result[nr][nc];
            if (val !== 0) {
              freq.set(val, (freq.get(val) || 0) + 1);
            }
          }
        }

        // Toplam dolu (0 olmayan) komşu sayısını ve en çok tekrar eden rengi bul
        let totalNonZero = 0;
        let maxColor = 0;
        let maxCount = 0;
        
        for (const [color, count] of freq) {
          totalNonZero += count;
          if (count > maxCount) {
            maxCount = count;
            maxColor = color;
          }
        }

        // Kural 1: Herhangi bir renkten 5 veya daha fazla varsa KESİN deliktir (eski kural)
        // Kural 2: VEYA toplam dolu komşu sayısı 6 veya daha fazlaysa (iki rengin arasına sıkışmış bir delikse)
        // En çok olan renge boya
        if (maxCount >= 5 || totalNonZero >= 6) {
          result[r][c] = maxColor;
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[gridCleaners] fillHoles hatası:', err);
    return grid;
  }
}

// -----------------------------------------------------------
// 4. KONTUR SÜREKLİLİĞİ DÜZELTME
// -----------------------------------------------------------

/**
 * Diyagonal olarak kopmuş veya arasına başka renk sızmış ince
 * kontur çizgilerini tespit edip topolojik olarak birbirine bağlar.
 *
 * @param {number[][]} grid - 2D grid
 * @returns {number[][]} Sürekliliği düzeltilmiş grid
 */
export function fixLineContinuity(grid) {
  try {
    const rows = grid.length;
    const cols = grid[0].length;
    const result = grid.map(row => [...row]);

    // --- Pattern 1: Diyagonal kopukluklar (2×2 blok taraması) ---
    //  X 0  →  X X     0 X  →  X X
    //  0 X     X X     X 0     X X
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = result[r][c];
        const tr = result[r][c + 1];
        const bl = result[r + 1][c];
        const br = result[r + 1][c + 1];

        // Vaka A: sol-üst == sağ-alt (diyagonal bağlantı kopuk)
        if (tl !== 0 && br !== 0 && tl === br && tr === 0 && bl === 0) {
          result[r][c + 1] = tl;
          result[r + 1][c] = tl;
        }
        // Vaka B: sağ-üst == sol-alt (ters diyagonal bağlantı kopuk)
        else if (tr !== 0 && bl !== 0 && tr === bl && tl === 0 && br === 0) {
          result[r][c] = tr;
          result[r + 1][c + 1] = tr;
        }
      }
    }

    // --- Pattern 2: Yatay kopukluk (X 0 X → X X X) ---
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const left = result[r][c - 1];
        const mid  = result[r][c];
        const right = result[r][c + 1];
        if (left !== 0 && right !== 0 && left === right && mid === 0) {
          result[r][c] = left;
        }
      }
    }

    // --- Pattern 3: Dikey kopukluk ---
    for (let c = 0; c < cols; c++) {
      for (let r = 1; r < rows - 1; r++) {
        const top    = result[r - 1][c];
        const mid    = result[r][c];
        const bottom = result[r + 1][c];
        if (top !== 0 && bottom !== 0 && top === bottom && mid === 0) {
          result[r][c] = top;
        }
      }
    }

    // --- Pattern 4: Beyaz Parlama (Highlight - id: 1) Sürekliliği ---
    // 25x25 veya 45x45 gibi kolay modlarda kopan 1 numaralı beyaz pikselleri
    // kalınlaştırmadan zarif tek bir çizgiyle birbirine bağlar.
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = result[r][c];
        const tr = result[r][c + 1];
        const bl = result[r + 1][c];
        const br = result[r + 1][c + 1];

        if (tl === 1 && br === 1 && tr !== 1 && bl !== 1) {
          result[r + 1][c] = 1; // Sol altı doldur
        } else if (tr === 1 && bl === 1 && tl !== 1 && br !== 1) {
          result[r][c] = 1; // Sol üstü doldur
        }
      }
    }

    // --- Yatay ve dikey kopukluklar için ek kural (Parlama - id: 1) ---
    // 1 0 1 -> 1 1 1
    for (let r = 0; r < rows; r++) {
      for (let c = 1; c < cols - 1; c++) {
        if (result[r][c-1] === 1 && result[r][c+1] === 1 && result[r][c] !== 1) {
          result[r][c] = 1;
        }
      }
    }
    for (let c = 0; c < cols; c++) {
      for (let r = 1; r < rows - 1; r++) {
        if (result[r-1][c] === 1 && result[r+1][c] === 1 && result[r][c] !== 1) {
          result[r][c] = 1;
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[gridCleaners] fixLineContinuity hatası:', err);
    return grid;
  }
}

// -----------------------------------------------------------
// 5. TEKRARLANAN RENK İSİMLERİNİ AYIRT ETME
// -----------------------------------------------------------

/**
 * Kuantizasyon sonrası palete birden fazla aynı isimde renk
 * eklendiyse (örneğin 2 adet 'Kahverengi'), algısal parlaklıklarını
 * (Luminance) hesaplayıp isimlerini 'Açık Kahverengi' ve
 * 'Koyu Kahverengi' olarak günceller.
 *
 * Luminance formülü: 0.299·R + 0.587·G + 0.114·B
 *
 * @param {object} colorsMap - { id: { r, g, b, name, hex }, ... } (ID'ler sayısal)
 * @returns {object} İsimleri güncellenmiş colorsMap (ID'ler sayısal)
 */
export function differentiateDuplicateColorNames(colorsMap) {
  try {
    // ID'leri sayısal anahtar olarak koruyarak kopyala
    const result = {};
    for (const rawId in colorsMap) {
      if (Object.prototype.hasOwnProperty.call(colorsMap, rawId)) {
        const numId = Number(rawId);
        result[numId] = { ...colorsMap[rawId] };
      }
    }

    // İsimlere göre grupla
    const groups = new Map();
    for (const numId in result) {
      if (Object.prototype.hasOwnProperty.call(result, numId)) {
        const color = result[numId];
        const name = color.name;
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push({ id: Number(numId), ...color });
      }
    }

    for (const [name, colors] of groups) {
      if (colors.length <= 1) continue;

      // Luminance hesapla
      for (const c of colors) {
        c.luminance = 0.299 * c.r + 0.587 * c.g + 0.114 * c.b;
      }

      // Parlaklığa göre sırala (artan = koyudan açığa)
      colors.sort((a, b) => a.luminance - b.luminance);

      const labels = ['Koyu', 'Orta', 'Açık'];

      for (let i = 0; i < colors.length; i++) {
        const c = colors[i];
        // İndeksi [0..labels.length-1] aralığına yay
        const idx = colors.length <= 2
          ? i  // 2 renk: [0]=Koyu, [1]=Açık
          : Math.round((i / (colors.length - 1)) * (labels.length - 1));
        const safeIdx = Math.min(idx, labels.length - 1);
        // Sayısal ID ile objeyi güncelle
        result[c.id] = { ...result[c.id], name: `${labels[safeIdx]} ${name}` };
      }
    }

    return result;
  } catch (err) {
    console.error('[gridCleaners] differentiateDuplicateColorNames hatası:', err);
    return colorsMap;
  }
}

// -----------------------------------------------------------
// 5.5. ZIG-ZAG (CHECKERBOARD) YUMUŞATMA
// -----------------------------------------------------------

/**
 * 2x2'lik alanlarda oluşan çapraz merdivenleri (checkerboard) 
 * yumuşatarak piksel sanatında daha temiz kavisler oluşturur.
 *
 * @param {number[][]} grid - 2D grid
 * @returns {number[][]} Yumuşatılmış grid
 */
export function smoothJaggedEdges(grid) {
  try {
    const rows = grid.length;
    const cols = grid[0].length;
    const result = grid.map(row => [...row]);
    
    // Daha çok korunması gereken kritik renkler
    const PROTECTED = new Set([24, 1, 4, 7, 8, 14, 19, 20, 22]); // 7(Kırmızı) ve 14(Mavi) eklendi

    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const tl = result[r][c];
        const tr = result[r][c + 1];
        const bl = result[r + 1][c];
        const br = result[r + 1][c + 1];

        // Çapraz renkler aynıysa (tl == br) ve (tr == bl) ama birbirlerinden farklıysa
        if (tl !== 0 && br !== 0 && tl === br && tr !== 0 && bl !== 0 && tr === bl && tl !== tr) {
          // Hangi rengin daha baskın/korunan olduğuna karar ver
          if (PROTECTED.has(tl) && !PROTECTED.has(tr)) {
            result[r][c + 1] = tl; // tr'yi tl yap
          } else if (PROTECTED.has(tr) && !PROTECTED.has(tl)) {
            result[r][c] = tr; // tl'yi tr yap
          } else {
             // İkisi de korunmuyorsa veya ikisi de korunuyorsa rastgele birini doldurarak kavis yap
             result[r][c + 1] = tl; 
          }
        }
      }
    }
    return result;
  } catch (err) {
    console.error('[gridCleaners] smoothJaggedEdges hatası:', err);
    return grid;
  }
}

// -----------------------------------------------------------
// 5.7. DIŞ BEYAZ ARKA PLAN TEMİZLİĞİ (Flood Fill)
// -----------------------------------------------------------

/**
 * Gridin dış kenarlarından başlayarak, birbirine bağlı olan Beyaz (id: 1) pikselleri bulur 
 * ve bunları 0 (Boş / EMPTY_ID) yapar. Böylece figürün içindeki beyazlar (göz vb.) korunurken,
 * arka plan beyazları gereksiz yere numaralandırılmaz.
 *
 * @param {number[][]} grid - 2D grid
 * @returns {number[][]} Arka planı temizlenmiş grid
 */
export function removeOuterWhiteBackground(grid) {
  try {
    const rows = grid.length;
    if (rows === 0) return grid;
    const cols = grid[0].length;
    if (cols === 0) return grid;

    const result = grid.map(row => [...row]);
    const visited = Array.from({ length: rows }, () => new Array(cols).fill(false));
    const queue = [];

    // Kenarlardaki hücreleri sıraya ekle (0 veya 1 olanları)
    for (let r = 0; r < rows; r++) {
      if (result[r][0] === 0 || result[r][0] === 1) { queue.push([r, 0]); visited[r][0] = true; }
      if (result[r][cols - 1] === 0 || result[r][cols - 1] === 1) { queue.push([r, cols - 1]); visited[r][cols - 1] = true; }
    }
    for (let c = 1; c < cols - 1; c++) {
      if (result[0][c] === 0 || result[0][c] === 1) { queue.push([0, c]); visited[0][c] = true; }
      if (result[rows - 1][c] === 0 || result[rows - 1][c] === 1) { queue.push([rows - 1, c]); visited[rows - 1][c] = true; }
    }

    // BFS (Flood Fill) ile dışarıdan bağlı tüm boşlukları ve beyazları tara
    let head = 0;
    while (head < queue.length) {
      const [r, c] = queue[head++];
      
      // Eğer hücre 1 (Beyaz) ise, onu 0 (Boş) yap
      if (result[r][c] === 1) {
        result[r][c] = 0;
      }

      // 4 yönlü komşulara bak
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          if (!visited[nr][nc]) {
            const val = result[nr][nc];
            // Sadece 0 (Boş) veya 1 (Beyaz) üzerinden ilerle (Diğer renklere / konturlara çarpınca dur)
            if (val === 0 || val === 1) {
              visited[nr][nc] = true;
              queue.push([nr, nc]);
            }
          }
        }
      }
    }

    return result;
  } catch (err) {
    console.error('[gridCleaners] removeOuterWhiteBackground hatası:', err);
    return grid;
  }
}

// -----------------------------------------------------------
// 6. ANA DIŞA AKTARIM (applySmartCleaners)
// -----------------------------------------------------------

/**
 * Tüm temizleme filtrelerini sırasıyla uygular.
 *
 * Sıra:
 *   1. cleanIsolatedPixels
 *   2. fillHoles
 *   3. cleanIsolatedPixels (2. geçiş)
 *   4. fixLineContinuity
 *   5. zhangSuenThinning (eğer outlineId varsa ve etkinleştirilmişse)
 *   6. smoothJaggedEdges
 *   7. differentiateDuplicateColorNames
 *
 * @param {number[][]} grid         - Ham pixelGrid (pixelEngine çıktısı)
 * @param {object}     colors       - colorMap { id: { r, g, b, name, hex } }
 * @param {number}     [outlineId]  - Kontur renginin ID'si (örn. 24 = Siyah)
 * @param {boolean}    [enableThinning=false] - İskeletleştirme (thinning) yapılsın mı?
 * @returns {{ cleanGrid: number[][], cleanColors: object }}
 */
export function applySmartCleaners(grid, colors, outlineId, enableThinning = false) {
  try {
    let cleanGrid = grid.map(row => [...row]);
    let cleanColors = { ...colors };

    // 0. Dış Beyaz Arka Plan Temizliği (Flood Fill)
    // Sadece dışarıdaki beyazları 0 (EMPTY_ID) yapar, içeridekiler korunur
    cleanGrid = removeOuterWhiteBackground(cleanGrid);

    // 1. İzole piksel temizliği
    cleanGrid = cleanIsolatedPixels(cleanGrid, cleanColors);

    // 2. Delik doldurma
    cleanGrid = fillHoles(cleanGrid);

    // 3. İkinci geçiş izole piksel temizliği
    cleanGrid = cleanIsolatedPixels(cleanGrid, cleanColors);

    // 4. Kontur sürekliliği düzeltme
    cleanGrid = fixLineContinuity(cleanGrid);

    // 5. Zhang-Suen iskeletleştirme (sadece outlineId tanımlıysa ve thinning etkinse)
    if (enableThinning && typeof outlineId === 'number' && outlineId > 0) {
      cleanGrid = zhangSuenThinning(cleanGrid, outlineId);
      // İnceltme algoritması, keskin (V şekilli) iç köşelerde arka plan (0) boşlukları yaratabilir.
      // Bu nedenle inceltme sonrası oluşan bu beyaz delikleri (0) tekrar dolduruyoruz.
      cleanGrid = fillHoles(cleanGrid);
    }
    
    // 6. Çapraz Merdiven Yumuşatma (Anti-aliasing etkisi)
    cleanGrid = smoothJaggedEdges(cleanGrid);

    // 7. Tekrarlanan renk isimlerini ayırt et
    cleanColors = differentiateDuplicateColorNames(cleanColors);

    return { cleanGrid, cleanColors };
  } catch (err) {
    console.error('[gridCleaners] applySmartCleaners hatası:', err);
    return { cleanGrid: grid.map(r => [...r]), cleanColors: { ...colors } };
  }
}