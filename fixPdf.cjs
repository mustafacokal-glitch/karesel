const fs = require('fs');

let content = fs.readFileSync('src/pdf/pdfGenerator.ts', 'utf8');

// 1. Add imports at the top
content = content.replace(
  "import { getPageDimensions } from '../utils/printLayout';",
  "import { getPageDimensions } from '../utils/printLayout';\n// @ts-ignore\nimport robotoRegularUrl from '../../public/fonts/Roboto-Regular.ttf?url';\n// @ts-ignore\nimport robotoBoldUrl from '../../public/fonts/Roboto-Bold.ttf?url';"
);

// 2. Replace the font loading section. Using regex to avoid exact whitespace issues.
const targetRegex = /const \{ ROBOTO_REGULAR, ROBOTO_BOLD \} = await import\('\.\/robotoFonts'\);\s+doc\.addFileToVFS\('Roboto-Regular\.ttf', ROBOTO_REGULAR\);\s+doc\.addFont\('Roboto-Regular\.ttf', 'Roboto', 'normal'\);\s+doc\.addFileToVFS\('Roboto-Bold\.ttf', ROBOTO_BOLD\);\s+doc\.addFont\('Roboto-Bold\.ttf', 'Roboto', 'bold'\);/g;

const replacementContent = `const fetchFontBase64 = async (url: string): Promise<string> => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(\`Font yüklenemedi: \${url}\`);
      const buffer = await response.arrayBuffer();
      let binary = '';
      const bytes = new Uint8Array(buffer);
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    const [regularB64, boldB64] = await Promise.all([
      fetchFontBase64(robotoRegularUrl),
      fetchFontBase64(robotoBoldUrl)
    ]);

    doc.addFileToVFS('Roboto-Regular.ttf', regularB64);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', boldB64);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');`;

content = content.replace(targetRegex, replacementContent);
// also remove the comment above it just in case
content = content.replace("// Roboto Türkçe destekli fontunu ekle (Dinamik import ile 1.4MB'lık dosya sadece PDF indirilirken yüklenir)", "// Roboto Türkçe destekli fontunu dinamik olarak URL'den yükle (bellek tasarrufu için)");

fs.writeFileSync('src/pdf/pdfGenerator.ts', content);
console.log('Fixed pdfGenerator.ts');
