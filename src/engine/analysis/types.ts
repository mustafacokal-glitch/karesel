export interface AnalysisInput {
  imageData: ImageData;
}

export interface EdgeResult {
  edgeDensityScore: number; // 0-100
  totalEdges: number;
}

export interface ColorDistResult {
  colorChaosScore: number; // 0-100
  dominantColorsCount: number;
}

export interface IsolationResult {
  isolationScore: number; // 0-100
  contrastRatio: number;
}

export interface ComplexityResult {
  overallComplexityScore: number; // 0-100
  edgeDensity: number;
  colorChaos: number;
  objectIsolation: number;
  aspectRatio: number;
}
