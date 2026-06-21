import { workerPool } from './WorkerPool';
import { EducationalAIPipeline } from '../engine/EducationalAIPipeline';
import { processImageToGrid } from '../engine/transform/pixelEngine';
import { applySmartCleaners } from '../engine/grid/gridCleaners';
import { PIPELINE_CONFIG, SHAPE_PRESERVATION_BY_DIFFICULTY } from '../config/pipelineConfig';
import { ShapePreservationEngine } from '../engine/transform/ShapePreservationEngine';
import { generateActivityPDF } from '../pdf/pdfGenerator';

function unflattenGrid(flat: Uint16Array, rows: number, cols: number): number[][] {
  const grid = [];
  for(let r=0; r<rows; r++) {
    const row = [];
    for(let c=0; c<cols; c++) {
      row.push(flat[r*cols + c]);
    }
    grid.push(row);
  }
  return grid;
}

function processWorkerResult(result: any) {
  if (result && result.flatBuffer) {
    const flatArray = new Uint16Array(result.flatBuffer);
    const grid = unflattenGrid(flatArray, result.rows, result.cols);
    
    if (result.cleanColors) {
      result.cleanGrid = grid; // Classic mode mapping
    } else {
      result.pixelGrid = grid; // AI mode mapping
    }
    
    delete result.flatBuffer;
    delete result.rows;
    delete result.cols;
  }
  return result;
}

/**
 * Worker Manager is now a Singleton wrapper that proxies tasks 
 * to the Priority-based WorkerPool Engine.
 */
export class WorkerManager {
  static async runAIPipeline(imageData: ImageData, ageGroup: any, difficulty: string, colorTolerance: number, offsetX: number = 0, offsetY: number = 0): Promise<any> {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      const result = await workerPool.enqueue(
        'RUN_AI_PIPELINE', 
        'NORMAL', 
        {
          imageDataArray: imageData.data.buffer,
          width: imageData.width,
          height: imageData.height,
          ageGroup,
          difficulty,
          colorTolerance,
          offsetX,
          offsetY
        }, 
        [], 
        45000 // 45s timeout
      );
      return processWorkerResult(result);
    } else {
      // Vitest / Node fallback
      return await EducationalAIPipeline.execute(imageData, ageGroup, difficulty as any, colorTolerance, offsetX, offsetY);
    }
  }

  static async runClassicPipeline(imageData: ImageData, rows: number, cols: number, difficultyLevel: number, offsetX: number = 0, offsetY: number = 0): Promise<any> {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      const result = await workerPool.enqueue(
        'RUN_CLASSIC_PIPELINE', 
        'NORMAL', 
        {
          imageDataArray: imageData.data.buffer,
          width: imageData.width,
          height: imageData.height,
          rows,
          cols,
          difficultyLevel,
          offsetX,
          offsetY
        }, 
        [], 
        15000 // 15s timeout
      );
      return processWorkerResult(result);
    } else {
      // Vitest / Node fallback
      const preservationConfig = SHAPE_PRESERVATION_BY_DIFFICULTY[difficultyLevel] || SHAPE_PRESERVATION_BY_DIFFICULTY[2];
      const preservedImageData = ShapePreservationEngine.apply(imageData, preservationConfig);
      const { pixelGrid, colorMap } = await processImageToGrid(preservedImageData, rows, cols, difficultyLevel, offsetX, offsetY);
      const enableThinning = difficultyLevel >= 4; 
      const { cleanGrid, cleanColors } = applySmartCleaners(pixelGrid, colorMap, PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID, enableThinning);
      return { cleanGrid, cleanColors };
    }
  }

  static async generatePDF(state: any, options: any): Promise<Blob> {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      // Priority: LOW. The PDF worker is dedicated so it runs parallel to AI.
      return await workerPool.enqueue('GENERATE_PDF', 'LOW', { state, options }, [], 60000);
    } else {
      // Fallback
      return await generateActivityPDF(state, options);
    }
  }
}
