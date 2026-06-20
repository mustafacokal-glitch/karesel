export type AgeGroup = 'kindergarten' | 'grade1-2' | 'grade3-4' | 'primary';

export interface ColorConfig {
  highContrastMode: boolean;
  maxColors?: number;
  preserveOutlines?: boolean;
}

export interface ColorInfo {
  id: number;
  r: number;
  g: number;
  b: number;
  name: string;
  hex: string;
}

export interface PaletteResult {
  optimizedPalette: ColorInfo[];
  originalToOptimizedMap: Record<number, number>; // Maps original ID to optimized ID
  explanation: string;
}
