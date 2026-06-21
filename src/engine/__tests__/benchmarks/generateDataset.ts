import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PNG } from 'pngjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const datasetPath = path.join(__dirname, 'dataset');
if (!fs.existsSync(datasetPath)) {
  fs.mkdirSync(datasetPath, { recursive: true });
}

function createSimpleApple() {
  const width = 100;
  const height = 100;
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const dx = x - 50;
      const dy = y - 50;
      
      // Base transparent background
      png.data[idx] = 255;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 255;
      png.data[idx + 3] = 0; // Transparent

      // Red Apple body
      if (dx * dx + dy * dy < 1600) { 
        png.data[idx] = 220; // R
        png.data[idx + 1] = 30;  // G
        png.data[idx + 2] = 30;  // B
        png.data[idx + 3] = 255; // A
      }
      
      // Green stem
      if (x >= 47 && x <= 53 && y >= 5 && y <= 20) {
        png.data[idx] = 34;
        png.data[idx + 1] = 139;
        png.data[idx + 2] = 34;
        png.data[idx + 3] = 255;
      }
    }
  }
  fs.writeFileSync(path.join(datasetPath, 'simple_apple.png'), PNG.sync.write(png));
  console.log('Created simple_apple.png');
}

function createComplexDog() {
  const width = 150;
  const height = 150;
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx + 3] = 0; // Transparent BG
      
      // Dog Head (Brown)
      if (x > 40 && x < 110 && y > 50 && y < 120) {
        png.data[idx] = 139; // SaddleBrown
        png.data[idx + 1] = 69;
        png.data[idx + 2] = 19;
        png.data[idx + 3] = 255;
      }

      // Ears (Dark Brown)
      if ((x > 30 && x < 60 && y > 30 && y < 70) || (x > 90 && x < 120 && y > 30 && y < 70)) {
        png.data[idx] = 101; 
        png.data[idx + 1] = 67;
        png.data[idx + 2] = 33;
        png.data[idx + 3] = 255;
      }

      // Nose (Black)
      if (x > 65 && x < 85 && y > 90 && y < 105) {
        png.data[idx] = 0; 
        png.data[idx + 1] = 0;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 255;
      }

      // Add noise to simulate fur/complexity
      if (png.data[idx + 3] === 255 && Math.random() > 0.8) {
        png.data[idx] = Math.min(255, png.data[idx] + 20);
        png.data[idx + 1] = Math.min(255, png.data[idx + 1] + 20);
        png.data[idx + 2] = Math.min(255, png.data[idx + 2] + 20);
      }
    }
  }
  fs.writeFileSync(path.join(datasetPath, 'complex_dog.png'), PNG.sync.write(png));
  console.log('Created complex_dog.png');
}

function createColorfulHouse() {
  const width = 120;
  const height = 120;
  const png = new PNG({ width, height });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      png.data[idx + 3] = 0; // Transparent BG
      
      // House Body (Yellow)
      if (x > 30 && x < 90 && y > 60 && y < 110) {
        png.data[idx] = 255; // Gold
        png.data[idx + 1] = 215;
        png.data[idx + 2] = 0;
        png.data[idx + 3] = 255;
      }

      // Roof (Red Triangle approximation)
      if (y > 20 && y <= 60 && x > 30 - (y - 20) && x < 90 + (y - 20)) {
        png.data[idx] = 220; // Crimson
        png.data[idx + 1] = 20;
        png.data[idx + 2] = 60;
        png.data[idx + 3] = 255;
      }

      // Door (Blue)
      if (x > 50 && x < 70 && y > 80 && y < 110) {
        png.data[idx] = 30; // DodgerBlue
        png.data[idx + 1] = 144;
        png.data[idx + 2] = 255;
        png.data[idx + 3] = 255;
      }
    }
  }
  fs.writeFileSync(path.join(datasetPath, 'colorful_house.png'), PNG.sync.write(png));
  console.log('Created colorful_house.png');
}

createSimpleApple();
createComplexDog();
createColorfulHouse();
