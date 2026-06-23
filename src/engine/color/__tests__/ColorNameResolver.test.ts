import { describe, it, expect } from 'vitest';
import { resolveColorName } from '../ColorNameResolver';

describe('ColorNameResolver', () => {
  it('should resolve exact palette IDs correctly', () => {
    expect(resolveColorName({ id: 24 }).name).toBe('Siyah');
    expect(resolveColorName({ id: 22 }).name).toBe('Kahverengi');
    expect(resolveColorName({ id: 13 }).name).toBe('Koyu Mavi');
    expect(resolveColorName({ id: 2 }).name).toBe('Krem (Ten rengi)');
  });

  it('should ignore technical names and resolve from ID or HEX', () => {
    expect(resolveColorName({
      id: 24,
      existingName: 'Fidelity Color 2'
    }).name).toBe('Siyah');

    expect(resolveColorName({
      id: 22,
      existingName: 'Generated Color'
    }).name).toBe('Kahverengi');
  });

  it('should preserve valid existing names', () => {
    expect(resolveColorName({
      id: 24,
      existingName: 'Siyah'
    }).source).toBe('existing-valid');
  });

  it('should fallback to nearest RGB/HEX palette match', () => {
    expect(resolveColorName({
      hex: '#000000',
      existingName: 'Fidelity Color 2'
    }).name).toBe('Siyah');

    expect(resolveColorName({
      hex: '#6F3B34'
    }).name).toBe('Kahverengi');

    expect(resolveColorName({
      hex: '#3F4EA8'
    }).name).toMatch(/Mavi|Koyu Mavi/);
  });

  it('should fallback to family name when distance is too high', () => {
    expect(resolveColorName({
      r: 40,
      g: 120,
      b: 220
    }).name).toContain('Mavi');
  });

  it('should output no technical name as final fallback', () => {
    const result = resolveColorName({
      hex: '#111111',
      existingName: 'Fidelity Color 2',
      displayNumber: 5,
    });

    expect(result.name).not.toContain('Fidelity');
    expect(result.name).not.toContain('Generated');
    expect(result.name).not.toContain('Custom');
  });
});
