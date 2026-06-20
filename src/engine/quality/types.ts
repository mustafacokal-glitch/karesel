import { ComplexityResult } from '../analysis/types';
import { ColorInfo } from '../color/types';
import { AgeGroup } from '../color/types';

export interface AIQESInput {
  originalMetrics: ComplexityResult;
  optimizedPalette: ColorInfo[];
  gridRows: number;
  gridCols: number;
  ageGroup: AgeGroup;
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
}
