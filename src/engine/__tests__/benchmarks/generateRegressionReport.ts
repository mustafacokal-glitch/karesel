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
const REPORT_FILE = path.join(__dirname, 'report.html');

function loadPNGAsImageData(filepath: string): ImageData {
  const data = fs.readFileSync(filepath);
  const png = PNG.sync.read(data);
  return new ImageData(new Uint8ClampedArray(png.data), png.width, png.height);
}

function generateGridHTML(grid: number[][], colorMap: Record<number, any>) {
  let html = '<div class="grid">';
  for (let r = 0; r < grid.length; r++) {
    html += '<div class="row">';
    for (let c = 0; c < grid[r].length; c++) {
      const colorId = grid[r][c];
      const hex = colorMap[colorId]?.hex || '#FFFFFF';
      html += `<div class="cell" style="background-color: ${hex}"></div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

async function runReport() {
  if (!fs.existsSync(BASELINE_FILE)) {
    console.error('No baseline.json found! Please run the tests with UPDATE_BASELINE=1 first.');
    return;
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
  const testCases = [
    { name: 'simple_apple', diff: 'balanced' as Difficulty, age: 'grade1' as AgeGroup },
    { name: 'complex_dog', diff: 'advanced' as Difficulty, age: 'grade3' as AgeGroup },
    { name: 'colorful_house', diff: 'easy' as Difficulty, age: 'kindergarten' as AgeGroup }
  ];

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>KARESEL Visual Regression Report</title>
      <style>
        body { font-family: -apple-system, sans-serif; background: #f8fafc; padding: 2rem; }
        .case { background: white; border-radius: 12px; padding: 2rem; margin-bottom: 2rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
        .comparison { display: flex; gap: 2rem; margin-top: 1rem; }
        .panel { flex: 1; }
        .grid { display: flex; flex-direction: column; gap: 1px; background: #e2e8f0; border: 1px solid #cbd5e1; width: fit-content;}
        .row { display: flex; gap: 1px; }
        .cell { width: 12px; height: 12px; }
        .metrics { margin-top: 1rem; padding: 1rem; background: #f1f5f9; border-radius: 8px; font-family: monospace;}
        h2 { margin-top: 0; color: #334155; border-bottom: 2px solid #e2e8f0; padding-bottom: 0.5rem;}
        .status-pass { color: #16a34a; font-weight: bold; }
        .status-fail { color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>KARESEL Visual Regression Report</h1>
      <p>Generated at: ${new Date().toLocaleString()}</p>
  `;

  for (const tc of testCases) {
    const imgPath = path.join(DATASET_DIR, `${tc.name}.png`);
    if (!fs.existsSync(imgPath)) continue;

    const sourceData = loadPNGAsImageData(imgPath);
    const result = await EducationalAIPipeline.execute(sourceData, tc.age, tc.diff);
    const base = baseline[tc.name];

    // Calculate similarity
    let matchCount = 0;
    let totalPixels = base.gridHeight * base.gridWidth;
    for (let r = 0; r < base.gridHeight; r++) {
      for (let c = 0; c < base.gridWidth; c++) {
        const baseColor = base.colorMap[base.pixelGrid[r]?.[c]]?.hex;
        const newColor = result.colorMap[result.pixelGrid[r]?.[c]]?.hex;
        if (baseColor === newColor) matchCount++;
      }
    }
    const similarity = (matchCount / totalPixels) * 100;
    const aiqesDiff = result.aiqesReport.aiqesScore - base.aiqesScore;

    const isPass = similarity >= 95 && aiqesDiff >= -2;

    html += `
      <div class="case">
        <h2>${tc.name}.png <span class="${isPass ? 'status-pass' : 'status-fail'}">(${isPass ? 'PASS' : 'FAIL'})</span></h2>
        
        <div class="comparison">
          <div class="panel">
            <h3>Baseline (Approved)</h3>
            ${generateGridHTML(base.pixelGrid, base.colorMap)}
            <div class="metrics">
              AIQES Score: ${base.aiqesScore}<br>
              Colors: ${base.colorCount}
            </div>
          </div>
          <div class="panel">
            <h3>Current Implementation</h3>
            ${generateGridHTML(result.pixelGrid, result.colorMap)}
            <div class="metrics">
              AIQES Score: ${result.aiqesReport.aiqesScore} (${aiqesDiff >= 0 ? '+'+aiqesDiff : aiqesDiff})<br>
              Colors: ${Object.keys(result.colorMap).length}<br>
              Pixel Similarity: ${similarity.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>
    `;
  }

  html += '</body></html>';
  fs.writeFileSync(REPORT_FILE, html);
  console.log(`Regression report generated at: ${REPORT_FILE}`);
}

runReport();
