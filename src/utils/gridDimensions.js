const DIFFICULTY_TARGETS = {
  0: 9,   // Mini (1. Sınıf) — 8x8-10x10 aralığını hedefler, tek sayı=tek simetri ekseni
  1: 15,
  2: 30,
  3: 40,
  4: 50,
};

/**
 * Zorluk seviyesi ve en-boy oranına göre satır ve sütun sayılarını hesaplar.
 * 
 * @param {number} level - Zorluk seviyesi (1-4)
 * @param {number|null} aspectRatio - Görselin en-boy oranı (en / boy)
 * @returns {{ rows: number, cols: number }} Satır ve sütun boyutları
 */
export function calculateGridDimensions(level, aspectRatio) {
  const targetMax = DIFFICULTY_TARGETS[level] || 30;

  if (!aspectRatio) {
    return { rows: targetMax, cols: targetMax };
  }

  let rows = targetMax;
  let cols = targetMax;

  if (aspectRatio >= 1) {
    cols = targetMax;
    rows = Math.max(5, Math.round(targetMax / aspectRatio));
  } else {
    rows = targetMax;
    cols = Math.max(5, Math.round(targetMax * aspectRatio));
  }

  return { rows, cols };
}
