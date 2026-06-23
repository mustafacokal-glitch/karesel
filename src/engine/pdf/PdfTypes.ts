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

  originalImageX?: number;
  originalImageY?: number;
  originalImageWidthMm?: number;
  originalImageHeightMm?: number;

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
