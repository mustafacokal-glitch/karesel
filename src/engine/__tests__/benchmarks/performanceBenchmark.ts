import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import { EducationalAIPipeline } from '../../EducationalAIPipeline';
import { processImageToGrid } from '../../transform/pixelEngine';

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

function loadPNGAsImageData(filepath: string): ImageData {
  const data = fs.readFileSync(filepath);
  const png = PNG.sync.read(data);
  return new ImageData(new Uint8ClampedArray(png.data), png.width, png.height);
}

async function runBenchmark() {
  const imgPath = path.join(DATASET_DIR, 'complex_dog.png');
  const sourceData = loadPNGAsImageData(imgPath);

  console.log('--- RUNNING BENCHMARK ---');
  
  // Benchmark pixelEngine (inner loop)
  const startEngine = performance.now();
  for (let i = 0; i < 5; i++) {
    await processImageToGrid(sourceData, 50, 50, 3);
  }
  const endEngine = performance.now();
  console.log(`pixelEngine average time: ${((endEngine - startEngine) / 5).toFixed(2)} ms`);

  // Benchmark Full Pipeline
  const startPipeline = performance.now();
  for (let i = 0; i < 2; i++) {
    await EducationalAIPipeline.execute(sourceData, 'grade3-4', 'advanced');
  }
  const endPipeline = performance.now();
  console.log(`EducationalAIPipeline average time: ${((endPipeline - startPipeline) / 2).toFixed(2)} ms`);
}

runBenchmark();
