/// <reference lib="webworker" />
import { EducationalAIPipeline } from '../engine/EducationalAIPipeline';
import { processImageToGrid } from '../engine/transform/pixelEngine';
import { applySmartCleaners } from '../engine/grid/gridCleaners';
import { PIPELINE_CONFIG, SHAPE_PRESERVATION_BY_DIFFICULTY } from '../config/pipelineConfig';
import { ShapePreservationEngine } from '../engine/transform/ShapePreservationEngine';
import { getPaletteFromPolicy } from '../engine/color/PalettePolicy';

function flattenGrid(grid: number[][]): Uint16Array {
  const rows = grid.length;
  if (rows === 0) return new Uint16Array(0);
  const cols = grid[0].length;
  const flat = new Uint16Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      flat[r * cols + c] = grid[r][c];
    }
  }
  return flat;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  try {
    if (type === 'RUN_AI_PIPELINE') {
      const { imageDataArray, width, height, ageGroup, difficulty, colorTolerance, offsetX, offsetY, intent = 'educational' } = payload;
      
      // Reconstruct ImageData
      const imageData = new ImageData(new Uint8ClampedArray(imageDataArray), width, height);
      
      const result: any = await EducationalAIPipeline.execute(imageData, ageGroup, difficulty, colorTolerance, offsetX, offsetY, intent);
      
      // Zero-copy transfer optimization
      const rows = result.pixelGrid.length;
      const cols = rows > 0 ? result.pixelGrid[0].length : 0;
      const flatBuffer = flattenGrid(result.pixelGrid).buffer;
      delete result.pixelGrid; // Prevent structured cloning of 2D array
      
      self.postMessage({ id, status: 'success', result: { ...result, flatBuffer, rows, cols } });
      
    } else if (type === 'RUN_CLASSIC_PIPELINE') {
      const { imageDataArray, width, height, rows, cols, difficultyLevel, ageGroup, offsetX, offsetY, intent = 'educational' } = payload;
      
      const imageData = new ImageData(new Uint8ClampedArray(imageDataArray), width, height);
      
      const preservationConfig = SHAPE_PRESERVATION_BY_DIFFICULTY[difficultyLevel] || SHAPE_PRESERVATION_BY_DIFFICULTY[2];
      const preservedImageData = ShapePreservationEngine.apply(imageData, preservationConfig);
      
      const allowedPalette = getPaletteFromPolicy({ mode: intent, difficultyLevel, ageGroup }, preservedImageData);

      const { pixelGrid, colorMap, foregroundCoverageGrid } = await processImageToGrid(preservedImageData, rows, cols, difficultyLevel, offsetX, offsetY, { allowedPalette });
      
      const enableThinning = difficultyLevel >= 4; 
      const { cleanGrid, cleanColors } = applySmartCleaners(
        pixelGrid, 
        colorMap, 
        PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID, 
        enableThinning,
        foregroundCoverageGrid,
        preservationConfig.foregroundProtectionThreshold
      );
      
      // Structured cloning is very fast for small grids (~5-10 KB), avoiding transfer detached errors.
      const flatBuffer = flattenGrid(cleanGrid).buffer;
      
      self.postMessage({ 
        id, 
        status: 'success', 
        result: { cleanColors, flatBuffer, rows, cols } 
      });
    } else {
      throw new Error(`Unknown worker message type: ${type}`);
    }
  } catch (err) {
    self.postMessage({ id, status: 'error', error: err instanceof Error ? err.message : 'Unknown worker error' });
  }
};
