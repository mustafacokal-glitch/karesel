import { describe, it, expect } from 'vitest';
import { EducationalDifficulty, DIFFICULTY_GRID_PROFILES } from '../grid/types';
import { SmartGridSelector } from '../grid/SmartGridSelector';

describe('Difficulty Selection and Grid Profiles', () => {

  it('Test 1: Difficulty Mapping', () => {
    const difficultyMap: Record<number, EducationalDifficulty> = {
      0: 'easy',
      1: 'easy',
      2: 'balanced',
      3: 'advanced',
      4: 'expert',
    };

    expect(difficultyMap[0]).toBe('easy');
    expect(difficultyMap[1]).toBe('easy');
    expect(difficultyMap[2]).toBe('balanced');
    expect(difficultyMap[3]).toBe('advanced');
    expect(difficultyMap[4]).toBe('expert');
    expect(difficultyMap[4]).not.toBe('advanced');
  });

  it('Test 2: Profile Order', () => {
    const easy = DIFFICULTY_GRID_PROFILES['easy'];
    const balanced = DIFFICULTY_GRID_PROFILES['balanced'];
    const advanced = DIFFICULTY_GRID_PROFILES['advanced'];
    const expert = DIFFICULTY_GRID_PROFILES['expert'];

    expect(easy.targetSize).toBeLessThan(balanced.targetSize);
    expect(balanced.targetSize).toBeLessThan(advanced.targetSize);
    expect(advanced.targetSize).toBeLessThan(expert.targetSize);
  });

  it('Test 3: Profile Bounds', () => {
    expect(DIFFICULTY_GRID_PROFILES['easy'].minSize).toBe(22);
    expect(DIFFICULTY_GRID_PROFILES['easy'].maxSize).toBe(26);
    expect(DIFFICULTY_GRID_PROFILES['balanced'].minSize).toBe(28);
    expect(DIFFICULTY_GRID_PROFILES['balanced'].maxSize).toBe(31);
    expect(DIFFICULTY_GRID_PROFILES['advanced'].minSize).toBe(32);
    expect(DIFFICULTY_GRID_PROFILES['advanced'].maxSize).toBe(36);
    expect(DIFFICULTY_GRID_PROFILES['expert'].minSize).toBe(38);
    expect(DIFFICULTY_GRID_PROFILES['expert'].maxSize).toBe(42);
  });

  it('Test 4: Candidate Filtering via SmartGridSelector', () => {
    const runSelector = (diff: EducationalDifficulty) => {
      return SmartGridSelector.recommendGrid({
        metrics: { overallComplexityScore: 50, aspectRatio: 1, contrastScore: 50, detailDensity: 50, edgeDensity: 50, colorComplexity: 50, blurScore: 50 } as any,
        ageGroup: 'grade3',
        difficulty: diff,
        intent: 'pedagogical-fidelity'
      });
    };

    const easyRec = runSelector('easy');
    const balancedRec = runSelector('balanced');
    const advancedRec = runSelector('advanced');
    const expertRec = runSelector('expert');

    expect(easyRec.recommendedWidth).toBe(25);
    expect(balancedRec.recommendedWidth).toBe(30);
    expect(advancedRec.recommendedWidth).toBe(35);
    expect(expertRec.recommendedWidth).toBe(40);
  });

  it('Test 5: Different difficulty outputs', () => {
    const baseMetrics = { overallComplexityScore: 50, aspectRatio: 1, contrastScore: 50, detailDensity: 50, edgeDensity: 50, colorComplexity: 50, blurScore: 50 } as any;
    const easySize = SmartGridSelector.recommendGrid({ metrics: baseMetrics, ageGroup: 'grade3', difficulty: 'easy', intent: 'pedagogical-fidelity' }).recommendedWidth;
    const balancedSize = SmartGridSelector.recommendGrid({ metrics: baseMetrics, ageGroup: 'grade3', difficulty: 'balanced', intent: 'pedagogical-fidelity' }).recommendedWidth;
    const advancedSize = SmartGridSelector.recommendGrid({ metrics: baseMetrics, ageGroup: 'grade3', difficulty: 'advanced', intent: 'pedagogical-fidelity' }).recommendedWidth;
    const expertSize = SmartGridSelector.recommendGrid({ metrics: baseMetrics, ageGroup: 'grade3', difficulty: 'expert', intent: 'pedagogical-fidelity' }).recommendedWidth;

    expect(easySize).not.toBe(balancedSize);
    expect(balancedSize).not.toBe(advancedSize);
    expect(advancedSize).not.toBe(expertSize);
  });

});
