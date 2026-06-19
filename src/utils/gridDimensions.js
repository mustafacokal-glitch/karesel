const DIFFICULTY_TARGETS = {
  1: 25,
  2: 45,
  3: 60,
  4: 80,
};

/**
 * Zorluk seviyesi ve en-boy oranına göre satır ve sütun sayılarını hesaplar.
 * 
 * @param {number} level - Zorluk seviyesi (1-4)
 * @param {number|null} aspectRatio - Görselin en-boy oranı (en / boy)
 * @param {string} orientation - Kağıt yönü ('portrait' veya 'landscape')
 * @returns {{ rows: number, cols: number }} Satır ve sütun boyutları
 */
export function calculateGridDimensions(level, aspectRatio, orientation = 'portrait') {
  const targetMax = DIFFICULTY_TARGETS[level] || 30;
  
  // Yatay kağıt seçildiyse (Seçenek 1) A4 basılabilir alan oranına yakın bir grid üret (1:1.5)
  if (orientation === 'landscape') {
    return { rows: targetMax, cols: Math.round(targetMax * 1.5) };
  }

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
