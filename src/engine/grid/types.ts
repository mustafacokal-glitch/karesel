import { ComplexityResult } from '../analysis/types';

export type AgeGroup = 'kindergarten' | 'grade1' | 'grade2' | 'grade3' | 'grade4';
export type ProcessingIntent = 'educational' | 'fidelity' | 'pedagogical-fidelity';
export type Difficulty = 'easy' | 'balanced' | 'advanced' | 'expert';

export interface GridRecommendation {
  recommendedWidth: number;
  recommendedHeight: number;
  confidenceScore: number;
  explanation: string;
}

export interface GridSelectionInput {
  metrics: ComplexityResult;
  ageGroup: AgeGroup;
  difficulty: Difficulty;
  intent?: ProcessingIntent;
  hasImportantFeatures?: boolean;
}
