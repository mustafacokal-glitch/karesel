import { EducationalDifficulty, DIFFICULTY_GRID_PROFILES } from '../engine/grid/types';

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
 * @param {string} [intent] - İşleme niyeti (educational, pedagogical-fidelity vb.)
 * @returns {{ rows: number, cols: number }} Satır ve sütun boyutları
 */
export function calculateGridDimensions(level: number, aspectRatio: number | null, intent?: string): { rows: number; cols: number } {
  let targetMax = (DIFFICULTY_TARGETS as Record<number, number>)[level] || 30;

  if (intent === 'pedagogical-fidelity') {
      const difficultyMap: Record<number, EducationalDifficulty> = { 0: 'easy', 1: 'easy', 2: 'balanced', 3: 'advanced', 4: 'expert' };
      const diff = difficultyMap[level] ?? 'balanced';
      targetMax = DIFFICULTY_GRID_PROFILES[diff].targetSize;
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
