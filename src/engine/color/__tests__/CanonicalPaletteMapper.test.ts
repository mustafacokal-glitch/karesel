import { describe, it, expect } from 'vitest';
import { mapColorToCanonicalPalette, canonicalizePaletteEntries } from '../CanonicalPaletteMapper';

describe('CanonicalPaletteMapper', () => {
  describe('mapColorToCanonicalPalette', () => {
    it('should map hex #6F3B34 to Kahverengi (id: 22)', () => {
      const match = mapColorToCanonicalPalette({ id: 22, hex: '#6F3B34' });
      expect(match.paletteColor.name).toBe('Kahverengi');
      expect(match.canonicalPaletteId).toBe(22);
    });

    it('should map hex #6E3A33 to Kahverengi (id: 22) via nearest distance', () => {
      const match = mapColorToCanonicalPalette({ hex: '#6E3A33' });
      expect(match.paletteColor.name).toBe('Kahverengi');
      expect(match.canonicalPaletteId).toBe(22);
      expect(match.source).toBe('nearest-palette');
    });

    it('should map hex #F20B46 to Kırmızı (id: 7)', () => {
      const match = mapColorToCanonicalPalette({ hex: '#F20B46' });
      expect(match.paletteColor.name).toBe('Kırmızı');
    });

    it('should map hex #000000 to Siyah (id: 24)', () => {
      const match = mapColorToCanonicalPalette({ hex: '#000000' });
      expect(match.paletteColor.name).toBe('Siyah');
    });

    it('should not treat sequential id 1 as PALETTE id 1 if hex is Kırmızı', () => {
      const match = mapColorToCanonicalPalette({
        id: 1, // display ID
        hex: '#ED0A3F' // Kırmızı hex
      });
      expect(match.paletteColor.name).toBe('Kırmızı');
      expect(match.canonicalPaletteId).toBe(7);
      expect(match.source).toBe('exact-rgb'); // Since #ED0A3F is exactly Kırmızı
    });
  });

  describe('canonicalizePaletteEntries', () => {
    it('should deduplicate same canonical ids', () => {
      const colors = [
        { id: 1000, hex: '#ED0A3F', name: 'Dynamic 1', r: 237, g: 10, b: 63 },
        { id: 1001, hex: '#EC093E', name: 'Dynamic 2', r: 236, g: 9, b: 62 },
      ];
      const canonicalized = canonicalizePaletteEntries(colors);
      expect(canonicalized).toHaveLength(1);
      expect(canonicalized[0].name).toBe('Kırmızı');
      expect(canonicalized[0].canonicalPaletteId).toBe(7);
    });
  });
});
