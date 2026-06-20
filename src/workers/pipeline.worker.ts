/// <reference lib="webworker" />
import { EducationalAIPipeline } from '../engine/EducationalAIPipeline';
import { processImageToGrid } from '../engine/transform/pixelEngine';
import { applySmartCleaners } from '../engine/grid/gridCleaners';
import { PIPELINE_CONFIG } from '../config/pipelineConfig';

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  try {
    if (type === 'RUN_AI_PIPELINE') {
      const { imageDataArray, width, height, ageGroup, difficulty } = payload;
      
      // Reconstruct ImageData
      const imageData = new ImageData(new Uint8ClampedArray(imageDataArray), width, height);
      
      const result = await EducationalAIPipeline.execute(imageData, ageGroup, difficulty);
      
      self.postMessage({ id, status: 'success', result });
      
    } else if (type === 'RUN_CLASSIC_PIPELINE') {
      const { imageDataArray, width, height, rows, cols, difficultyLevel } = payload;
      
      const imageData = new ImageData(new Uint8ClampedArray(imageDataArray), width, height);
      
      const { pixelGrid, colorMap } = await processImageToGrid(imageData, rows, cols, difficultyLevel);
      
      const enableThinning = difficultyLevel >= 4; 
      const { cleanGrid, cleanColors } = applySmartCleaners(pixelGrid, colorMap, PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID, enableThinning);
      
      self.postMessage({ id, status: 'success', result: { cleanGrid, cleanColors } });
    } else {
      throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (err) {
    self.postMessage({ id, status: 'error', error: err instanceof Error ? err.message : 'Unknown worker error' });
  }
};
