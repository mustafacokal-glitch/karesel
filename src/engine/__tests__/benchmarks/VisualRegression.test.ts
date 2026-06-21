import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import { EducationalAIPipeline } from '../../EducationalAIPipeline';
import { AgeGroup, Difficulty } from '../../grid/types';

// Mock ImageData for Node environment
if (typeof global.ImageData === 'undefined') {
  (global as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(data: Uint8ClampedArray, width: number, height: number) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASET_DIR = path.join(__dirname, 'dataset');
const BASELINE_FILE = path.join(__dirname, 'baseline.json');

const UPDATE_BASELINE = process.env.UPDATE_BASELINE === '1';

function loadPNGAsImageData(filepath: string): ImageData {
  const data = fs.readFileSync(filepath);
  const png = PNG.sync.read(data);
  return new ImageData(new Uint8ClampedArray(png.data), png.width, png.height);
}

describe('Visual Regression & Benchmark Suite', () => {
  let baseline: Record<string, any> = {};

  beforeAll(() => {
    if (!UPDATE_BASELINE && fs.existsSync(BASELINE_FILE)) {
      baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
    }
  });

  const runTestForImage = async (imageName: string, difficulty: Difficulty, ageGroup: AgeGroup) => {
    const imgPath = path.join(DATASET_DIR, `${imageName}.png`);
    if (!fs.existsSync(imgPath)) {
      console.warn(`[Skip] Image not found: ${imgPath}`);
      return;
    }

    const sourceData = loadPNGAsImageData(imgPath);
    const result = await EducationalAIPipeline.execute(sourceData, ageGroup, difficulty);

    const resultMetrics = {
      pixelGrid: result.pixelGrid,
      colorMap: result.colorMap,
      colorCount: Object.keys(result.colorMap).length,
      aiqesScore: result.aiqesReport.aiqesScore,
      gridWidth: result.gridDimensions.width,
      gridHeight: result.gridDimensions.height
    };

    if (UPDATE_BASELINE) {
      baseline[imageName] = resultMetrics;
    } else {
      const base = baseline[imageName];
      expect(base, `No baseline found for ${imageName}. Run "UPDATE_BASELINE=1 npx vitest" to create it.`).toBeDefined();

      // 1. Dimensional consistency
      expect(resultMetrics.gridWidth).toBe(base.gridWidth);
      expect(resultMetrics.gridHeight).toBe(base.gridHeight);

      // 2. Pixel Similarity Check
      let matchCount = 0;
      let totalPixels = base.gridHeight * base.gridWidth;
      for (let r = 0; r < base.gridHeight; r++) {
        for (let c = 0; c < base.gridWidth; c++) {
          // Compare mapped colors instead of raw IDs in case IDs shift
          const baseColor = base.colorMap[base.pixelGrid[r]?.[c]]?.hex;
          const newColor = resultMetrics.colorMap[resultMetrics.pixelGrid[r]?.[c]]?.hex;
          if (baseColor === newColor) {
            matchCount++;
          }
        }
      }
      const similarity = matchCount / totalPixels;
      expect(similarity, `Pixel similarity dropped to ${(similarity * 100).toFixed(1)}%! Minimum is 95%.`).toBeGreaterThanOrEqual(0.95);

      // 3. AIQES Score Check (Allow max 2 points drop)
      expect(resultMetrics.aiqesScore, `AIQES Score dropped significantly from ${base.aiqesScore} to ${resultMetrics.aiqesScore}`).toBeGreaterThanOrEqual(base.aiqesScore - 2);
      
      // 4. Color count inflation check
      expect(resultMetrics.colorCount).toBeLessThanOrEqual(base.colorCount + 2);
    }
  };

  it('Bench: simple_apple.png (grade1-2, balanced)', async () => {
    await runTestForImage('simple_apple', 'balanced', 'grade1-2');
  });

  it('Bench: complex_dog.png (grade3-4, advanced)', async () => {
    await runTestForImage('complex_dog', 'advanced', 'grade3-4');
  });

  it('Bench: colorful_house.png (kindergarten, easy)', async () => {
    await runTestForImage('colorful_house', 'easy', 'kindergarten');
  });

  afterAll(() => {
    if (UPDATE_BASELINE) {
      fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2), 'utf-8');
      console.log('Baseline updated successfully!');
    }
  });
});
