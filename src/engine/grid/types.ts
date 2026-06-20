import { ComplexityResult } from '../analysis/types';

export type AgeGroup = 'kindergarten' | 'grade1-2' | 'grade3-4';
export type Difficulty = 'easy' | 'balanced' | 'advanced';

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
}
