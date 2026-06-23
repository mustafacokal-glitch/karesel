export type PdfPageKind = 'student' | 'answerKey';

export type PdfOrientation = 'portrait' | 'landscape';

export type PdfOrientationPolicy = 'auto' | 'strict-portrait' | 'strict-landscape';

export interface PdfColorEntry {
  internalId: number;
  displayNumber: number;
  hex: string;
  name?: string;
}

export interface PdfWorksheetInput {
  grid: number[][];
  colorEntries: PdfColorEntry[];

  title?: string;
  modeLabel?: string;
  gradeLabel?: string;
  difficultyLabel?: string;

  originalImageDataUrl?: string;

  locale?: 'tr' | 'en' | 'ar';

  includeStudentWorksheet?: boolean;
  includeAnswerKey?: boolean;
  includeLegend?: boolean;
  includeCoordinates?: boolean;
  includeOriginalReference?: boolean;

  createdAt?: string;
}

export interface PdfLegendLayout {
  x: number;
  y: number;
  widthMm: number;
  heightMm: number;

  titleHeightMm: number;
  rowHeightMm: number;

  columns: number;
  rows: number;
  itemWidthMm: number;

  swatchSizeMm: number;
  numberWidthMm: number;
  gapMm: number;

  mode: 'full-width-bottom' | 'compact-bottom' | 'fallback';
}

export const PDF_LAYOUT_SPACING = {
  headerToMetaMm: 3,
  metaToInstructionMm: 5,
  instructionToCoordinatesMm: 4.5,
  columnCoordinatesToGridMm: 0.75,
  rowCoordinatesToGridMm: 1.2,
  gridToLegendMm: 6,
  footerSafetyMm: 8,
};

export interface PdfLayoutResult {
  orientation: PdfOrientation;

  pageWidthMm: number;
  pageHeightMm: number;
  marginMm: number;

  headerX: number;
  headerY: number;
  headerHeightMm: number;

  gridX: number;
  gridY: number;
  gridWidthMm: number;
  gridHeightMm: number;
  cellSizeMm: number;

  coordinateHeaderSizeMm: number;

  legendX: number;
  legendY: number;
  legendWidthMm: number;
  legendHeightMm: number;
  legendColumns: number;
  legendLayout?: PdfLegendLayout;

  originalImageX?: number;
  originalImageY?: number;
  originalImageWidthMm?: number;
  originalImageHeightMm?: number;

  titleY?: number;
  subtitleY?: number;
  metaY?: number;
  instructionY?: number;
  instructionHeightMm?: number;

  coordinateTopY?: number;
  coordinateLeftX?: number;

  gridBlockY?: number;

  warningLevel: 'none' | 'minor' | 'critical';
  warnings: string[];
}

export interface PdfQualityReport {
  gridWidth: number;
  gridHeight: number;
  colorCount: number;

  pageKind: PdfPageKind;
  orientation: PdfOrientation;
  cellSizeMm: number;

  hasCoordinates: boolean;
  hasLegend: boolean;
  hasStudentPage: boolean;
  hasAnswerKeyPage: boolean;

  overflowWarnings: string[];
  criticalWarnings: string[];
}
