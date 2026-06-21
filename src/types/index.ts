export type ProcessingMode = 'classic' | 'educational_ai';

export interface AIQESMetric {
  score: number;
  explanation: string;
  recommendations?: string[];
}

export interface AIQESReport {
  aiqesScore: number;
  recognizability: AIQESMetric;
  shapePreservation: AIQESMetric;
  educationalComplexity: AIQESMetric;
  colorSimplicity: AIQESMetric;
  worksheetEffort: AIQESMetric;
  motivation: AIQESMetric;
}

export interface GridDimensions {
  rows: number;
  cols: number;
  width?: number;
  height?: number;
}

export interface ColorMapEntry {
  id: number;
  hex?: string;
  color?: string;
  name?: string;
  label?: string;
  [key: string]: any; // Allow extra properties safely without using purely `any`
}

export type ColorMap = Record<string | number, ColorMapEntry>;

export type PixelGrid = (number | null)[][];

export interface ProjectState {
  processingMode: ProcessingMode;
  aiqesReport: AIQESReport | null;
  uploadedImage: string | null;
  imageAspectRatio: number | null;
  originalImageData: ImageData | null;
  gradeLevel: number | null;
  difficultyManuallySet: boolean;
  difficultyLevel: number;
  gridDimensions: GridDimensions;
  pixelGrid: PixelGrid | null;
  solutionGrid: PixelGrid | null;
  colorMap: ColorMap;
  showSolution: boolean;
  orientation: 'portrait' | 'landscape';
  cellSize: number;
  isProcessing: boolean;
  error: Error | string | null;
  downloadProgressText: string | null;
  canvasRef: HTMLCanvasElement | null;
  
  isEditMode: boolean;
  selectedColorId: number;
  isSymmetryMode: boolean;
  
  past: any[];
  future: any[];
  regenerateTrigger: number;
  
  colorTolerance: number;
  offsetX: number;
  offsetY: number;
}

export interface ProjectActions {
  setProcessingMode: (mode: ProcessingMode) => void;
  setAiqesReport: (report: AIQESReport | null) => void;
  setUploadedImage: (image: string | null) => void;
  setImageAspectRatio: (ratio: number | null) => void;
  setOriginalImageData: (data: ImageData | null) => void;
  setGradeLevel: (level: number | null) => void;
  setDifficultyManuallySet: (value: boolean) => void;
  setDifficultyLevel: (level: number) => void;
  setGridDimensions: (dims: GridDimensions) => void;
  setPixelGrid: (grid: PixelGrid | null) => void;
  setSolutionGrid: (grid: PixelGrid | null) => void;
  setColorMap: (colors: ColorMap) => void;
  setShowSolution: (show: boolean) => void;
  setOrientation: (orientation: 'portrait' | 'landscape') => void;
  setCellSize: (size: number) => void;
  setProcessing: (status: boolean) => void;
  setError: (error: Error | string | null) => void;
  setDownloadProgressText: (text: string | null) => void;
  setCanvasRef: (ref: HTMLCanvasElement | null) => void;
  
  setIsEditMode: (status: boolean) => void;
  setSelectedColorId: (id: number) => void;
  setIsSymmetryMode: (status: boolean) => void;
  triggerRegenerate: () => void;
  
  updateGridCell: (rowIndex: number, colIndex: number, colorId: number) => void;
  changeColorMapping: (colorId: string | number, newColorData: Partial<ColorMapEntry>) => void;
  saveHistoryCheckpoint: () => void;
  undo: () => void;
  redo: () => void;
  resetGridOnly: () => void;
  reset: () => void;
  setColorTolerance: (val: number) => void;
  setOffsetX: (val: number) => void;
  setOffsetY: (val: number) => void;
}

export type ProjectStore = ProjectState & ProjectActions;
