import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';
import { EducationalAIPipeline } from './src/engine/EducationalAIPipeline.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function loadPNGAsImageData(filepath: string): ImageData {
  const data = fs.readFileSync(filepath);
  const png = PNG.sync.read(data);
  return new ImageData(new Uint8ClampedArray(png.data), png.width, png.height);
}

async function run() {
  const imgPath = path.join(__dirname, 'src/engine/__tests__/benchmarks/dataset/complex_dog.png');
  const sourceData = loadPNGAsImageData(imgPath);

  console.log('--- 30x30 Pedagogical Fidelity Grade 3 ---');
  let res30 = await EducationalAIPipeline.execute(sourceData, 'grade3', 'balanced', 50, 0, 0, 'pedagogical-fidelity');
  console.log(`Grid: ${res30.gridDimensions.width}x${res30.gridDimensions.height}`);
  console.log(`Max Colors: ${Object.keys(res30.colorMap).length}`);
  console.log(`AIQES Score: ${res30.aiqesReport.aiqesScore}`);
  console.log(`Key Feature Retention: ${res30.aiqesReport.keyFeatureRetention?.score}`);

  console.log('\n--- 40x40 Pedagogical Fidelity Grade 4 ---');
  let res40 = await EducationalAIPipeline.execute(sourceData, 'grade4', 'advanced', 50, 0, 0, 'pedagogical-fidelity');
  console.log(`Grid: ${res40.gridDimensions.width}x${res40.gridDimensions.height}`);
  console.log(`Max Colors: ${Object.keys(res40.colorMap).length}`);
  console.log(`AIQES Score: ${res40.aiqesReport.aiqesScore}`);
  console.log(`Key Feature Retention: ${res40.aiqesReport.keyFeatureRetention?.score}`);
  
  console.log('\n--- 50x50 Fidelity Mode (High Detail) ---');
  let res50 = await EducationalAIPipeline.execute(sourceData, 'grade4', 'expert', 50, 0, 0, 'fidelity');
  console.log(`Grid: ${res50.gridDimensions.width}x${res50.gridDimensions.height}`);
  console.log(`Max Colors: ${Object.keys(res50.colorMap).length}`);
  console.log(`AIQES Score: ${res50.aiqesReport.aiqesScore}`);
  
}

run().catch(console.error);
