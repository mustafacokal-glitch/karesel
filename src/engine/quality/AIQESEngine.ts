import { AIQESInput, AIQESReport } from './types';
import { ObjectRecognizabilityEvaluator } from './evaluators/ObjectRecognizabilityEvaluator';
import { ShapePreservationEvaluator } from './evaluators/ShapePreservationEvaluator';
import { EducationalComplexityEvaluator } from './evaluators/EducationalComplexityEvaluator';
import { ColorSimplicityEvaluator } from './evaluators/ColorSimplicityEvaluator';
import { WorksheetEffortEvaluator } from './evaluators/WorksheetEffortEvaluator';
import { MotivationPredictor } from './evaluators/MotivationPredictor';

export class AIQESEngine {
  /**
   * Generates a comprehensive AI Quality Evaluation System report.
   * Does NOT modify the image or pipeline; acts as an independent "Robot Teacher".
   */
  public static generateReport(input: AIQESInput): AIQESReport {
    const recognizability = ObjectRecognizabilityEvaluator.evaluate(input);
    const shapePreservation = ShapePreservationEvaluator.evaluate(input);
    const educationalComplexity = EducationalComplexityEvaluator.evaluate(input);
    const colorSimplicity = ColorSimplicityEvaluator.evaluate(input);
    const worksheetEffort = WorksheetEffortEvaluator.evaluate(input);
    const motivation = MotivationPredictor.evaluate(input);

    // AIQES Weighted Formula
    // Recognizability: 25%
    // Shape Preservation: 20%
    // Color Simplicity: 20%
    // Educational Complexity: 15%
    // Effort: 10%
    // Motivation: 10%

    const aiqesScore = 
      (recognizability.score * 0.25) +
      (shapePreservation.score * 0.20) +
      (colorSimplicity.score * 0.20) +
      (educationalComplexity.score * 0.15) +
      (worksheetEffort.score * 0.10) +
      (motivation.score * 0.10);

    return {
      aiqesScore: Math.round(aiqesScore),
      recognizability,
      shapePreservation,
      educationalComplexity,
      colorSimplicity,
      worksheetEffort,
      motivation
    };
  }
}
