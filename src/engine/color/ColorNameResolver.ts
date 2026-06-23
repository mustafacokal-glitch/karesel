import { PALETTE } from './colorDistance';
import { classifyRgbFamily } from './AccentColorFamilies';

export interface ResolvedColorName {
  name: string;
  source: 'existing-valid' | 'palette-exact' | 'palette-nearest' | 'family' | 'fallback';
}

export interface ResolveColorNameInput {
  id?: number;
  hex?: string;
  r?: number;
  g?: number;
  b?: number;
  existingName?: string;
  existingLabel?: string;
  displayNumber?: number;
  locale?: 'tr' | 'en' | 'ar';
}

const FAMILY_NAMES_TR: Record<string, string> = {
  blue: 'Mavi',
  red: 'Kırmızı / Pembe',
  brown: 'Kahverengi',
  cream: 'Krem (Ten rengi)',
  black: 'Siyah',
  orange: 'Turuncu',
  other: 'Renk',
};

// Custom fast RGB distance for nearest match threshold check
function rgbDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

const MAX_RGB_DISTANCE_FOR_NAME_MATCH = 45;

export function isTechnicalColorName(value?: string | null): boolean {
  if (!value) return true;

  const normalized = value.trim().toLowerCase();

  return (
    normalized === '' ||
    normalized.includes('fidelity color') ||
    normalized.includes('generated color') ||
    normalized.includes('custom color') ||
    normalized.includes('accent color') ||
    /^color\s*\d+$/i.test(normalized) ||
    /^renk\s*undefined$/i.test(normalized) ||
    /^undefined$/i.test(normalized)
  );
}

// Convert hex to rgb
function hexToRgbFast(hex: string): { r: number, g: number, b: number } | null {
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

export function resolveColorName(input: ResolveColorNameInput): ResolvedColorName {
  const existing = input.existingName || input.existingLabel;

  // 1. Valid existing name
  if (!isTechnicalColorName(existing) && existing) {
    return { name: existing, source: 'existing-valid' };
  }

  // 2. Exact palette ID
  if (input.id !== undefined && input.id > 0) {
    const exactMatch = PALETTE.find(p => p.id === input.id);
    if (exactMatch && exactMatch.name) {
      return { name: exactMatch.name, source: 'palette-exact' };
    }
  }

  // Find RGB to check exact HEX/RGB or Nearest
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

  // 3. Exact or nearest HEX/RGB palette match
  if (r !== undefined && g !== undefined && b !== undefined) {
    // 3.1 Exact RGB
    const exactRgbMatch = PALETTE.find(p => p.r === r && p.g === g && p.b === b);
    if (exactRgbMatch && exactRgbMatch.name) {
      return { name: exactRgbMatch.name, source: 'palette-nearest' };
    }

    // 3.2 Nearest RGB under threshold
    let nearestDist = Infinity;
    let nearestColor = null;

    for (const p of PALETTE) {
      const dist = rgbDistance(r, g, b, p.r, p.g, p.b);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestColor = p;
      }
    }

    if (nearestColor && nearestDist <= MAX_RGB_DISTANCE_FOR_NAME_MATCH) {
      return { name: nearestColor.name, source: 'palette-nearest' };
    }

    // 4. Family name fallback
    const family = classifyRgbFamily(r, g, b);
    const familyName = FAMILY_NAMES_TR[family];
    if (familyName && familyName !== 'Renk') {
      return { name: familyName, source: 'family' };
    }
  }

  // 5. Final fallback
  if (input.displayNumber !== undefined) {
    return { name: `Renk ${input.displayNumber}`, source: 'fallback' };
  }
  
  return { name: 'Renk', source: 'fallback' };
}

export function normalizeColorEntryName<T extends {
  id?: number;
  hex?: string;
  r?: number;
  g?: number;
  b?: number;
  name?: string;
  label?: string;
}>(
  entry: T,
  options?: {
    displayNumber?: number;
    locale?: 'tr' | 'en' | 'ar';
  }
): T & { name: string } {
  const resolved = resolveColorName({
    id: entry.id,
    hex: entry.hex,
    r: entry.r,
    g: entry.g,
    b: entry.b,
    existingName: entry.name,
    existingLabel: entry.label,
    displayNumber: options?.displayNumber,
    locale: options?.locale ?? 'tr',
  });

  return {
    ...entry,
    name: resolved.name,
  };
}
