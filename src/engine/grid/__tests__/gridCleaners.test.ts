import { describe, it, expect } from 'vitest';
import { zhangSuenThinning } from '../gridCleaners';

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
