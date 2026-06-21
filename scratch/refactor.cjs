const fs = require('fs');
let c = fs.readFileSync('src/pdf/pdfGenerator.ts', 'utf8');

c = c.replace(/import \{ jsPDF \} from 'jspdf';/, "import { jsPDF } from 'jspdf';\nimport { LTRTextRenderer } from './renderers/LTRTextRenderer';");

c = c.replace(/doc\.text\(/g, 'LTRTextRenderer.renderText(doc, ');

fs.writeFileSync('src/pdf/pdfGenerator.ts', c);
console.log('Done refactoring PDF text calls');
