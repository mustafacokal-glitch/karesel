import { ComplexityResult } from '../analysis/types';

export type AgeGroup = 'kindergarten' | 'grade1' | 'grade2' | 'grade3' | 'grade4';
export type ProcessingIntent = 'educational' | 'fidelity' | 'pedagogical-fidelity';
export type EducationalDifficulty = 'easy' | 'balanced' | 'advanced' | 'expert';
export type Difficulty = EducationalDifficulty;

export interface DifficultyGridProfile {
  minSize: number;
  targetSize: number;
  maxSize: number;
  maxColors: number;
}

export const DIFFICULTY_GRID_PROFILE_VERSION = 'difficulty-grid-v1';

export const DIFFICULTY_GRID_PROFILES: Record<EducationalDifficulty, DifficultyGridProfile> = {
  easy: {
    minSize: 22,
    targetSize: 25,
    maxSize: 26,
    maxColors: 6,
  },
  balanced: {
    minSize: 28,
    targetSize: 30,
    maxSize: 31,
    maxColors: 7,
  },
  advanced: {
    minSize: 32,
    targetSize: 35,
    maxSize: 36,
    maxColors: 8,
  },
  expert: {
    minSize: 38,
    targetSize: 40,
    maxSize: 42,
    maxColors: 9,
  },
};

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
