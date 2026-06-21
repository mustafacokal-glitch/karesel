import { describe, it, expect } from 'vitest';
import { zhangSuenThinning, removeGridBackground } from '../gridCleaners';

describe('gridCleaners - zhangSuenThinning', () => {
  it('should thin a thick black outline to a 1-pixel line', () => {
    // 24 = Siyah (Kontur rengi)
    // 0 = Boş
    // 1 = Beyaz (İç dolgu)
    
    const thickGrid = [
      [0,  0,  0,  0,  0,  0],
      [0, 24, 24, 24, 24,  0],
      [0, 24,  1,  1, 24,  0],
      [0, 24,  1,  1, 24,  0],
      [0, 24, 24, 24, 24,  0],
      [0,  0,  0,  0,  0,  0],
    ];

    const result = zhangSuenThinning(thickGrid, 24);

    // Snapshot ile beklentiyi doğrula
    expect(result).toMatchSnapshot();
  });

  it('should not alter the grid if outlineId is invalid', () => {
    const grid = [
      [0, 24, 0],
      [24, 1, 24],
      [0, 24, 0]
    ];
    
    // Geçersiz ID (-1) veya boş ID gönderilirse grid aynı kalmalı
    expect(zhangSuenThinning(grid, null as any)).toEqual(grid);
    expect(zhangSuenThinning(grid, -1)).toEqual(grid);
  });
});

describe('gridCleaners - removeGridBackground', () => {
  const targetColorId = 1;

  it('undefined foregroundCoverageGrid must preserve previous behavior (remove outer target colors)', () => {
    const grid = [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1]
    ];
    // Without coverage grid, all outer 1s should become 0
    const result = removeGridBackground(grid, targetColorId);
    expect(result).toEqual([
      [0, 0, 0],
      [0, 2, 0],
      [0, 0, 0]
    ]);
  });

  it('White background cell with low coverage must be removed', () => {
    const grid = [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1]
    ];
    // Coverage is 0.1, which is < 0.30 (default threshold), so they should be removed
    const coverage = [
      [0.1, 0.1, 0.1],
      [0.1, 1.0, 0.1],
      [0.1, 0.1, 0.1]
    ];
    const result = removeGridBackground(grid, targetColorId, coverage, 0.30);
    expect(result).toEqual([
      [0, 0, 0],
      [0, 2, 0],
      [0, 0, 0]
    ]);
  });

  it('White foreground cell with high coverage must not be removed', () => {
    const grid = [
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1]
    ];
    // Outer cells have high coverage (0.8 > 0.30)
    // They are white (1) but belong to the foreground, so they should NOT be removed!
    const coverage = [
      [0.8, 0.8, 0.8],
      [0.8, 1.0, 0.8],
      [0.8, 0.8, 0.8]
    ];
    const result = removeGridBackground(grid, targetColorId, coverage, 0.30);
    expect(result).toEqual([
      [1, 1, 1],
      [1, 2, 1],
      [1, 1, 1]
    ]);
  });

  it('BFS must not cross protected high-coverage foreground cells', () => {
    const grid2 = [
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1]
    ];
    const coverage2 = [
      [0.1, 0.1, 0.1, 0.1, 0.1], // Background (will be removed)
      [0.9, 0.9, 0.9, 0.9, 0.9], // Barrier
      [0.9, 0.9, 0.1, 0.9, 0.9], // Center is low coverage background, but surrounded by barrier
      [0.9, 0.9, 0.9, 0.9, 0.9], // Barrier
      [0.9, 0.9, 0.9, 0.9, 0.9]  // Barrier
    ];
    const result2 = removeGridBackground(grid2, targetColorId, coverage2, 0.30);
    expect(result2).toEqual([
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1], // The center 1 is protected because BFS couldn't reach it!
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1]
    ]);
  });
});
