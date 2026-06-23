import { PALETTE, colorDistLAB } from './colorDistance';
import type { ColorInfo } from './types';

export interface CanonicalColorMatch {
  canonicalPaletteId: number;
  paletteColor: ColorInfo;
  distance: number;
  source: 'exact-canonical-id' | 'exact-rgb' | 'nearest-palette';
}

export interface CanonicalizeColorInput {
  id?: number;
  canonicalPaletteId?: number;
  r?: number;
  g?: number;
  b?: number;
  hex?: string;
  name?: string;
}

// Convert hex to rgb
function hexToRgbFast(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.substring(0, 2), 16),
      g: parseInt(cleanHex.substring(2, 4), 16),
      b: parseInt(cleanHex.substring(4, 6), 16),
    };
  }
  return null;
}

export function mapColorToCanonicalPalette(
  input: CanonicalizeColorInput
): CanonicalColorMatch {
  // 1. If canonicalPaletteId exists and is in PALETTE
  if (input.canonicalPaletteId !== undefined) {
    const exactCanonicalMatch = PALETTE.find((p) => p.id === input.canonicalPaletteId);
    if (exactCanonicalMatch) {
      return {
        canonicalPaletteId: exactCanonicalMatch.id,
        paletteColor: { ...exactCanonicalMatch },
        distance: 0,
        source: 'exact-canonical-id',
      };
    }
  }

  let r = input.r;
  let g = input.g;
  let b = input.b;

  if (r === undefined || g === undefined || b === undefined) {
    if (input.hex) {
      const rgb = hexToRgbFast(input.hex);
      if (rgb) {
        r = rgb.r;
        g = rgb.g;
        b = rgb.b;
      }
    }
  }

  // 2. If id is 1..24 and RGB/HEX also matches PALETTE[id]
  if (input.id !== undefined && input.id >= 1 && input.id <= 24) {
    const idMatch = PALETTE.find((p) => p.id === input.id);
    if (idMatch) {
      // Check if RGB matches (if we have RGB)
      if (r !== undefined && g !== undefined && b !== undefined) {
        if (idMatch.r === r && idMatch.g === g && idMatch.b === b) {
          return {
            canonicalPaletteId: idMatch.id,
            paletteColor: { ...idMatch },
            distance: 0,
            source: 'exact-rgb',
          };
        }
      } else if (input.hex && input.hex.toUpperCase() === idMatch.hex.toUpperCase()) {
        return {
          canonicalPaletteId: idMatch.id,
          paletteColor: { ...idMatch },
          distance: 0,
          source: 'exact-rgb',
        };
      }
    }
  }

  // Fallback if no valid RGB could be resolved
  if (r === undefined || g === undefined || b === undefined) {
    // Return black as a safe fallback
    const black = PALETTE.find((p) => p.id === 24)!;
    return {
      canonicalPaletteId: black.id,
      paletteColor: { ...black },
      distance: Infinity,
      source: 'nearest-palette',
    };
  }

  // 3. Exact RGB match in PALETTE
  const exactRgbMatch = PALETTE.find((p) => p.r === r && p.g === g && p.b === b);
  if (exactRgbMatch) {
    return {
      canonicalPaletteId: exactRgbMatch.id,
      paletteColor: { ...exactRgbMatch },
      distance: 0,
      source: 'exact-rgb',
    };
  }

  // 4. Find nearest PALETTE color by LAB distance
  let nearestDist = Infinity;
  let nearestColor = PALETTE[0];

  for (const p of PALETTE) {
    const dist = colorDistLAB({ r, g, b }, { r: p.r, g: p.g, b: p.b });
    if (dist < nearestDist) {
      nearestDist = dist;
      nearestColor = p;
    }
  }

  return {
    canonicalPaletteId: nearestColor.id,
    paletteColor: { ...nearestColor },
    distance: nearestDist,
    source: 'nearest-palette',
  };
}

export function canonicalizePaletteEntries(colors: ColorInfo[]): ColorInfo[] {
  const seen = new Set<number>();
  const canonicalized: ColorInfo[] = [];

  for (const color of colors) {
    const match = mapColorToCanonicalPalette(color);
    if (!seen.has(match.canonicalPaletteId)) {
      seen.add(match.canonicalPaletteId);
      canonicalized.push({
        ...match.paletteColor,
        canonicalPaletteId: match.canonicalPaletteId,
      });
    }
  }

  return canonicalized;
}
