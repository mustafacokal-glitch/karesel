import { ComplexityResult } from '../analysis/types';
import { ColorInfo } from '../color/types';
import { AgeGroup } from '../color/types';

export interface AIQESInput {
  originalMetrics: ComplexityResult;
  optimizedPalette: ColorInfo[];
  gridRows: number;
  gridCols: number;
  ageGroup: AgeGroup;
  intent?: import('../grid/types').ProcessingIntent;
  keyFeatureStats?: {
    originalCount: number;
    preservedCount: number;
    avgConfidence: number;
    locationMatch: number;
    colorMatch: number;
    eyeScore?: number;
    noseScore?: number;
    mouthScore?: number;
    whiskerScore?: number;
  };
}

export interface EvaluationResult {
  score: number; // 0-100
  explanation: string;
  recommendations: string[];
}

export interface AIQESReport {
  aiqesScore: number;
  recognizability: EvaluationResult;
  shapePreservation: EvaluationResult;
  educationalComplexity: EvaluationResult;
  colorSimplicity: EvaluationResult;
  worksheetEffort: EvaluationResult;
  motivation: EvaluationResult;
  originalSimilarity?: EvaluationResult;
  educationalUsability?: EvaluationResult;
  printability?: EvaluationResult;
  keyFeatureRetention?: EvaluationResult;
}
