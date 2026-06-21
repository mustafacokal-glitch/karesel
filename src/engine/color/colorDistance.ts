export const PALETTE = [
  { id: 1, r: 255, g: 255, b: 255, name: 'Beyaz', hex: '#FFFFFF' },
  { id: 2, r: 252, g: 208, b: 161, name: 'Krem (Ten rengi)', hex: '#FCD0A1' },
  { id: 3, r: 255, g: 153, b: 128, name: 'Koyu Ten Rengi', hex: '#FF9980' },
  { id: 4, r: 251, g: 232, b: 112, name: 'Sarı', hex: '#FBE870' },
  { id: 5, r: 255, g: 174, b: 66, name: 'Koyu Sarı', hex: '#FFAE42' },
  { id: 6, r: 255, g: 136, b: 51, name: 'Turuncu', hex: '#FF8833' },
  { id: 7, r: 237, g: 10, b: 63, name: 'Kırmızı', hex: '#ED0A3F' },
  { id: 8, r: 198, g: 45, b: 66, name: 'Koyu Kırmızı', hex: '#C62D42' },
  { id: 9, r: 251, g: 174, b: 210, name: 'Pembe', hex: '#FBAED2' },
  { id: 10, r: 246, g: 100, b: 175, name: 'Koyu Pembe', hex: '#F664AF' },
  { id: 11, r: 166, g: 142, b: 232, name: 'Açık Mor', hex: '#A68EE8' },
  { id: 12, r: 97, g: 72, b: 184, name: 'Koyu Moru', hex: '#6148B8' },
  { id: 13, r: 67, g: 76, b: 167, name: 'Koyu Mavi', hex: '#434CA7' },
  { id: 14, r: 0, g: 87, b: 197, name: 'Mavi', hex: '#0057C5' },
  { id: 15, r: 100, g: 177, b: 242, name: 'Açık Mavi', hex: '#64B1F2' },
  { id: 16, r: 109, g: 193, b: 229, name: 'Turkuaz', hex: '#6DC1E5' },
  { id: 17, r: 97, g: 188, b: 110, name: 'Su Yeşili', hex: '#61BC6E' },
  { id: 18, r: 126, g: 204, b: 95, name: 'Açık Yeşil', hex: '#7ECC5F' },
  { id: 19, r: 80, g: 141, b: 93, name: 'Yeşil', hex: '#508D5D' },
  { id: 20, r: 46, g: 117, b: 97, name: 'Koyu Yeşil', hex: '#2E7561' },
  { id: 21, r: 214, g: 177, b: 160, name: 'Açık Kahverengi', hex: '#D6B1A0' },
  { id: 22, r: 111, g: 59, b: 52, name: 'Kahverengi', hex: '#6F3B34' },
  { id: 23, r: 124, g: 122, b: 121, name: 'Gri', hex: '#7C7A79' },
  { id: 24, r: 56, g: 53, b: 54, name: 'Siyah', hex: '#383536' }
];

export function rgb2lab(r: number, g: number, b: number): [number, number, number] {
  let r_ = r / 255, g_ = g / 255, b_ = b / 255;
  r_ = (r_ > 0.04045) ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
  g_ = (g_ > 0.04045) ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
  b_ = (b_ > 0.04045) ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;
  
  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) / 0.95047;
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) / 1.00000;
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) / 1.08883;
  
  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  
  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

export function rgb2labFast(r: number, g: number, b: number, out: Float64Array) {
  let r_ = r / 255, g_ = g / 255, b_ = b / 255;
  r_ = (r_ > 0.04045) ? Math.pow((r_ + 0.055) / 1.055, 2.4) : r_ / 12.92;
  g_ = (g_ > 0.04045) ? Math.pow((g_ + 0.055) / 1.055, 2.4) : g_ / 12.92;
  b_ = (b_ > 0.04045) ? Math.pow((b_ + 0.055) / 1.055, 2.4) : b_ / 12.92;
  
  let x = (r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805) / 0.95047;
  let y = (r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722) / 1.00000;
  let z = (r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505) / 1.08883;
  
  x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
  y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
  z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;
  
  out[0] = (116 * y) - 16;
  out[1] = 500 * (x - y);
  out[2] = 200 * (y - z);
}

// Precomputed LAB Cache for Palette to prevent millions of redundant calculations
export const PALETTE_LAB = new Map<number, [number, number, number]>();
for (const p of PALETTE) {
  PALETTE_LAB.set(p.id, rgb2lab(p.r, p.g, p.b));
}

// Flat parameter distance to prevent object allocation ({r,g,b})
export function colorDistLABFlat(l1: number, a1: number, b1: number, l2: number, a2: number, b2: number, lumaWeight = 1.0) {
  return Math.pow((l1 - l2) * lumaWeight, 2) + Math.pow(a1 - a2, 2) + Math.pow(b1 - b2, 2);
}

// Backward compatibility for other engines
export function colorDistLAB(c1: {r: number, g: number, b: number}, c2: {r: number, g: number, b: number}, lumaWeight = 1.0) {
  const [l1, a1, b1] = rgb2lab(c1.r, c1.g, c1.b);
  const [l2, a2, b2] = rgb2lab(c2.r, c2.g, c2.b);
  return colorDistLABFlat(l1, a1, b1, l2, a2, b2, lumaWeight);
}

export function getPaletteForDifficulty(level: number) {
  if (level <= 2) {
    const allowedIds = [1, 4, 6, 7, 14, 19, 22, 24]; 
    return PALETTE.filter(c => allowedIds.includes(c.id));
  } else if (level === 3) {
    const allowedIds = [1, 4, 5, 6, 7, 9, 11, 14, 16, 19, 22, 23, 24];
    return PALETTE.filter(c => allowedIds.includes(c.id));
  }
  return PALETTE;
}
