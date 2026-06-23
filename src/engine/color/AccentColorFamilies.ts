import { ColorInfo } from './types';
import { colorDistLAB } from './colorDistance';

export type AccentColorFamily =
  | 'blue'
  | 'red'
  | 'brown'
  | 'cream'
  | 'black'
  | 'orange'
  | 'other';

export function classifyPaletteIdFamily(id: number): AccentColorFamily {
  const familyMap: Record<number, AccentColorFamily> = {
    1: 'other', // White
    2: 'cream',
    3: 'cream',
    21: 'cream',
    5: 'orange',
    6: 'orange',
    7: 'red',
    8: 'red',
    9: 'red',
    10: 'red',
    13: 'blue',
    14: 'blue',
    15: 'blue',
    16: 'blue',
    22: 'brown',
    24: 'black',
  };
  
  return familyMap[id] || 'other';
}

export function getPaletteIdsForFamily(family: AccentColorFamily): number[] {
  switch (family) {
    case 'blue': return [13, 14, 15, 16];
    case 'red': return [7, 8, 9, 10];
    case 'brown': return [22, 21];
    case 'cream': return [2, 3, 21];
    case 'orange': return [5, 6];
    case 'black': return [24];
    default: return [];
  }
}

export function classifyRgbFamily(r: number, g: number, b: number): AccentColorFamily {
  if (r < 60 && g < 60 && b < 60) return 'black';

  const isBlue = b > 100 && b > r + 30 && b > g + 10;
  if (isBlue) return 'blue';

  const isRedOrPink = r > 140 && g < 120 && b < 160 && r > b;
  if (isRedOrPink) return 'red';

  const isBrown = r >= 60 && r <= 160 && g >= 30 && g <= 120 && b >= 15 && b <= 100 && r > g && g >= b * 0.7;
  if (isBrown) return 'brown';

  const isCream = r > 200 && g > 180 && b > 140 && r > b && g > b;
  if (isCream) return 'cream';

  const isOrange = r > 180 && g > 100 && g < 200 && b < 100;
  if (isOrange) return 'orange';

  return 'other';
}

export function findNearestPaletteIdInFamily(
  color: [number, number, number],
  allowedPalette: ColorInfo[],
  family: AccentColorFamily
): number | null {
  const familyIds = getPaletteIdsForFamily(family);
  const candidates = allowedPalette.filter(c => familyIds.includes(c.id));
  
  if (candidates.length === 0) return null;
  
  let minDist = Infinity;
  let bestId = candidates[0].id;
  
  for (const c of candidates) {
    const dist = colorDistLAB({ r: color[0], g: color[1], b: color[2] }, c);
    if (dist < minDist) {
      minDist = dist;
      bestId = c.id;
    }
  }
  
  return bestId;
}
