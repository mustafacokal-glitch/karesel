import PipelineWorker from './pipeline.worker?worker';
import { EducationalAIPipeline } from '../engine/EducationalAIPipeline';
import { processImageToGrid } from '../engine/transform/pixelEngine';
import { applySmartCleaners } from '../engine/grid/gridCleaners';
import { PIPELINE_CONFIG } from '../config/pipelineConfig';

let workerInstance: Worker | null = null;
let messageIdCounter = 0;
const resolvers = new Map<number, { resolve: (val: any) => void, reject: (err: Error) => void }>();

function getWorker(): Worker | null {
  if (!workerInstance && typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    try {
      workerInstance = new PipelineWorker();
      workerInstance.onmessage = (e) => {
        const { id, status, result, error } = e.data;
        const handlers = resolvers.get(id);
        if (handlers) {
          if (status === 'success') {
            handlers.resolve(result);
          } else {
            handlers.reject(new Error(error));
          }
          resolvers.delete(id);
        }
      };
      workerInstance.onerror = (err) => {
        console.error('Worker Initialization Error:', err);
      };
    } catch (e) {
      console.warn('Web Worker is not supported or failed to initialize, falling back to main thread.', e);
      workerInstance = null;
    }
  }
  return workerInstance;
}

/**
 * Worker Manager handles moving heavy ImageData arrays to the worker thread.
 * If Web Workers are unsupported (e.g. Vitest), it gracefully falls back to synchronous execution.
 */
export class WorkerManager {
  static async runAIPipeline(imageData: ImageData, ageGroup: string, difficulty: string): Promise<any> {
    const worker = getWorker();
    if (worker) {
      return new Promise((resolve, reject) => {
        const id = ++messageIdCounter;
        resolvers.set(id, { resolve, reject });
        
        // Zero-copy transfer of the ImageData buffer
        const buffer = imageData.data.buffer;
        worker.postMessage({
          id,
          type: 'RUN_AI_PIPELINE',
          payload: {
            imageDataArray: buffer,
            width: imageData.width,
            height: imageData.height,
            ageGroup,
            difficulty
          }
        }, [buffer]); // The array buffer is transferred, freeing memory in the main thread!
      });
    } else {
      // Vitest / Node fallback
      return await EducationalAIPipeline.execute(imageData, ageGroup, difficulty as any);
    }
  }

  static async runClassicPipeline(imageData: ImageData, rows: number, cols: number, difficultyLevel: number): Promise<any> {
    const worker = getWorker();
    if (worker) {
      return new Promise((resolve, reject) => {
        const id = ++messageIdCounter;
        resolvers.set(id, { resolve, reject });
        
        const buffer = imageData.data.buffer;
        worker.postMessage({
          id,
          type: 'RUN_CLASSIC_PIPELINE',
          payload: {
            imageDataArray: buffer,
            width: imageData.width,
            height: imageData.height,
            rows,
            cols,
            difficultyLevel
          }
        }, [buffer]);
      });
    } else {
      // Vitest / Node fallback
      const { pixelGrid, colorMap } = await processImageToGrid(imageData, rows, cols, difficultyLevel);
      const enableThinning = difficultyLevel >= 4; 
      const { cleanGrid, cleanColors } = applySmartCleaners(pixelGrid, colorMap, PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID, enableThinning);
      return { cleanGrid, cleanColors };
    }
  }
}
