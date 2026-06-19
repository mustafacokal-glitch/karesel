/**
 * jsPDF Vektörel Yazdırma Motoru
 * 
 * A4 milimetrik tabanlı, tamamen vektörel PDF çıktısı üretir.
 * Sayfa 1: Öğrenci Etkinlik Kağıdı (boş grid + lejant)
 * Sayfa 2: Öğretmen Çözüm Anahtarı (dolu grid)
 */

import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR, ROBOTO_BOLD } from './robotoFonts';

// ---------------------------------------------------------------------------
// Yardımcı Fonksiyonlar
// ---------------------------------------------------------------------------

/**
 * Metinleri temizler.
 * Türkçe karakterleri artık gömülü Roboto fontu sayesinde koruyoruz.
 */
function normalizeText(text) {
  if (!text) return '';
  return text.replace(/🎨/g, '').trim();
}

/**
 * HEX (#RRGGBB) rengini { r, g, b } nesnesine çevirir.
 */
function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16)
  };
}

/**
 * HEX rengin parlaklık değerine göre zıt kontrast rengi döndürür.
 * Açık arkaplan → siyah (#000000), koyu arkaplan → beyaz (#ffffff)
 */
function getContrastColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  // Relative luminance (W3C standardı yaklaşımı)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}



// ---------------------------------------------------------------------------
// Sabitler yardımcı fonksiyon (mm cinsinden, yönelime göre hesaplanır)
// ---------------------------------------------------------------------------

/**
 * Verilen yönelime göre A4 sayfa boyutlarını döndürür.
 * jsPDF 'landscape' modunda genişlik ile yüksekliği yer değiştirir.
 */
function getPageDimensions(orientation) {
  if (orientation === 'landscape') {
    return {
      PAGE_WIDTH: 297,
      PAGE_HEIGHT: 210,
      MARGIN_LEFT: 15,
      MARGIN_RIGHT: 15,
      MARGIN_TOP: 15,
      MARGIN_BOTTOM: 15,
      get USABLE_WIDTH() { return this.PAGE_WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT; },
      get USABLE_HEIGHT() { return this.PAGE_HEIGHT - this.MARGIN_TOP - this.MARGIN_BOTTOM; },
    };
  }
  // portrait (varsayılan)
  return {
    PAGE_WIDTH: 210,
    PAGE_HEIGHT: 297,
    MARGIN_LEFT: 15,
    MARGIN_RIGHT: 15,
    MARGIN_TOP: 20,
    MARGIN_BOTTOM: 20,
    get USABLE_WIDTH() { return this.PAGE_WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT; },
    get USABLE_HEIGHT() { return this.PAGE_HEIGHT - this.MARGIN_TOP - this.MARGIN_BOTTOM; },
  };
}


// Sayfa 1 — Öğrenci Etkinlik Kağıdı
// ---------------------------------------------------------------------------

/**
 * Öğrenci sayfasının başlık, öğrenci bilgi satırı, grid ve footer bölümlerini çizer.
 * @param {object} dims - getPageDimensions() çıktısı
 */
function drawStudentPage(doc, pixelGrid, colorMap, gridDimensions, dims) {
  const { rows, cols } = gridDimensions;
  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, USABLE_WIDTH } = dims;

  // ---- 1. Başlık ----
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  const title = normalizeText('Karesel Kodlama Etkinliği');
  doc.text(title, PAGE_WIDTH / 2, MARGIN_TOP + 8, { align: 'center' });

  // ---- 2. Öğrenci Bilgi Satırı ----
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  const infoY = MARGIN_TOP + 18;

  // Sol tarafta: Adım Soyadım
  const nameText = normalizeText('Adı Soyadı: ...................................................');
  doc.text(nameText, MARGIN_LEFT, infoY);

  // Sağ tarafta: Sınıfı / No
  const classText = normalizeText('Sınıfı / No: ............................');
  doc.text(classText, PAGE_WIDTH - MARGIN_RIGHT, infoY, { align: 'right' });

  const isLandscape = PAGE_WIDTH > PAGE_HEIGHT;
  const legendCols = isLandscape ? 5 : 3;
  const legendRowSpacing = isLandscape ? 4 : 5;

  const colorIds = Object.keys(colorMap).sort((a, b) => Number(a) - Number(b));
  const legendEntries = colorIds.map((id) => {
    const entry = colorMap[id];
    const name = entry?.name || entry?.label || `Renk ${id}`;
    return `${id} - ${normalizeText(name)}`;
  });

  const legendRows = Math.ceil(legendEntries.length / legendCols);
  const legendHeight = legendRows * legendRowSpacing;

  // ---- 3. Grid Çizimi ----
  const gridAreaTop = infoY + 10;
  // Lejant yüksekliğine göre alt sınır belirlenir, böylece taşma veya çakışma önlenir
  const gridAreaBottom = PAGE_HEIGHT - MARGIN_BOTTOM - legendHeight - 12;
  const gridAreaHeight = gridAreaBottom - gridAreaTop;
  const gridAreaWidth = USABLE_WIDTH;

  const cellW = gridAreaWidth / cols;
  const cellH = gridAreaHeight / rows;
  const cellSize = Math.min(cellW, cellH);

  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;

  const gridStartX = MARGIN_LEFT + (gridAreaWidth - gridWidth) / 2;
  const gridStartY = gridAreaTop + (gridAreaHeight - gridHeight) / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = gridStartX + col * cellSize;
      const y = gridStartY + row * cellSize;

      doc.rect(x, y, cellSize, cellSize);

      const cellValue = pixelGrid[row]?.[col];
      if (cellValue && cellValue > 0) {
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(Math.min(cellSize * 1.8, 20)); // %20 artırıldı ve kalın yapıldı
        doc.setTextColor(100, 100, 100);
        const numStr = String(cellValue);
        // Tam ortaya hizalama
        doc.text(numStr, x + (cellSize / 2), y + (cellSize / 2), { align: 'center', baseline: 'middle' });
      }
    }
  }

  // ---- 4. Renk Tablosu (Lejant) ----
  const rawLegendY = gridStartY + gridHeight + 6;
  const maxLegendY = PAGE_HEIGHT - MARGIN_BOTTOM - legendHeight - 4;
  const legendY = Math.min(rawLegendY, maxLegendY);

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(normalizeText('Renk Tablosu (Lejant):'), MARGIN_LEFT, legendY);

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(8);

  // Lejantı sütunlar halinde yerleştir
  const legendColWidth = USABLE_WIDTH / legendCols;
  legendEntries.forEach((entry, i) => {
    const colIdx = i % legendCols;
    const rowIdx = Math.floor(i / legendCols);
    const x = MARGIN_LEFT + colIdx * legendColWidth;
    const y = legendY + 4 + rowIdx * legendRowSpacing;
    if (y < PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.text(entry, x, y);
    }
  });

  // ---- 5. Footer ----
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 10;
  doc.text(normalizeText('Karesel Kodlama Stüdyosu'), MARGIN_LEFT, footerY);
  doc.text('www.mustafacokal.com.tr', PAGE_WIDTH - MARGIN_RIGHT, footerY, { align: 'right' });
}
// Sayfa 2 — Öğretmen Çözüm Anahtarı
// ---------------------------------------------------------------------------

/**
 * Çözüm anahtarı sayfasını çizer. Grid hücreleri colorMap'teki orijinal
 * HEX renkleriyle doldurulur, üzerine zıt renkte numara yazılır.
 * @param {object} dims - getPageDimensions() çıktısı
 */
function drawSolutionPage(doc, solutionGrid, colorMap, gridDimensions, dims) {
  const { rows, cols } = gridDimensions;
  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, USABLE_WIDTH } = dims;

  // ---- 1. Başlık ----
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(20);
  const title = normalizeText('ÇÖZÜM ANAHTARI (ÖĞRETMEN REHBERİ)');
  doc.setTextColor(0, 0, 0);
  doc.text(title, PAGE_WIDTH / 2, MARGIN_TOP + 8, { align: 'center' });

  // ---- 2. Grid Çizimi (dolu renklerle) ----
  const gridAreaTop = MARGIN_TOP + 16;
  const gridAreaBottom = PAGE_HEIGHT - MARGIN_BOTTOM - 5;
  const gridAreaHeight = gridAreaBottom - gridAreaTop;
  const gridAreaWidth = USABLE_WIDTH;

  const cellW = gridAreaWidth / cols;
  const cellH = gridAreaHeight / rows;
  const cellSize = Math.min(cellW, cellH);

  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;

  const gridStartX = MARGIN_LEFT + (gridAreaWidth - gridWidth) / 2;
  const gridStartY = gridAreaTop + (gridAreaHeight - gridHeight) / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = gridStartX + col * cellSize;
      const y = gridStartY + row * cellSize;
      const cellValue = solutionGrid[row]?.[col];

      // Hücre arkaplan rengini doldur
      if (cellValue && cellValue > 0) {
        const colorEntry = colorMap[cellValue];
        if (colorEntry) {
          const hex = colorEntry.hex || colorEntry.color || '#000000';
          const { r, g, b } = hexToRgb(hex);
          doc.setFillColor(r, g, b);
          doc.rect(x, y, cellSize, cellSize, 'F');  // Doldur
        }
      }

      // Hücre çerçevesini tekrar çiz (dolgunun üzerine)
      doc.setDrawColor(0, 0, 0);
      doc.rect(x, y, cellSize, cellSize);

      // Hücre değerini zıt renkte yaz
      if (cellValue && cellValue > 0) {
        const colorEntry = colorMap[cellValue];
        let textColor = '#000000';
        if (colorEntry) {
          const hex = colorEntry.hex || colorEntry.color || '#000000';
          textColor = getContrastColor(hex);
        }
        const { r, g, b } = hexToRgb(textColor);
        doc.setTextColor(r, g, b);
        doc.setFont('Roboto', 'bold');
        doc.setFontSize(Math.min(cellSize * 1.7, 18)); // %20 artırıldı
        const numStr = String(cellValue);
        // Tam ortaya hizalama
        doc.text(numStr, x + (cellSize / 2), y + (cellSize / 2), { align: 'center', baseline: 'middle' });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ana Dışa Aktarım Fonksiyonu
// ---------------------------------------------------------------------------

/**
 * Store state'ini alarak 2 sayfalık bir etkinlik PDF'i üretir ve indirir.
 *
 * @param {Object} state - useProjectStore'un anlık state'i
 * @param {number[][]}  state.pixelGrid       - Renk ID'leriyle dolu grid
 * @param {number[][]}  [state.solutionGrid]  - Çözüm grid'i (yoksa pixelGrid kullanılır)
 * @param {Object}      state.colorMap        - { id: { name, hex } }
 * @param {string}      state.orientation     - 'portrait' | 'landscape'
 * @param {{ rows: number, cols: number }} state.gridDimensions
 */
export const generateActivityPDF = (state) => {
  try {
    const {
      pixelGrid,
      solutionGrid,
      colorMap,
      orientation = 'portrait',
      gridDimensions = { rows: 16, cols: 16 }
    } = state;

    // Veri doğrulama
    if (!pixelGrid || !Array.isArray(pixelGrid) || pixelGrid.length === 0) {
      throw new Error('Geçersiz pixelGrid: Veri bulunamadı. Lütfen önce "Etkinlik Sayfası Oluştur" butonuna basın.');
    }

    // Yönelime göre güvenli değer (jsPDF yalnızca portrait ve landscape destekler)
    const safeOrientation = orientation === 'landscape' ? 'landscape' : 'portrait';

    // Sayfa boyutlarını yönelime göre hesapla
    const dims = getPageDimensions(safeOrientation);

    // jsPDF dokümanını oluştur
    const doc = new jsPDF({
      orientation: safeOrientation,
      unit: 'mm',
      format: 'a4'
    });

    // Roboto Türkçe destekli fontunu ekle
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // ---- Sayfa 1: Öğrenci Etkinlik Kağıdı ----
    doc.setFont('Roboto', 'normal');
    drawStudentPage(doc, pixelGrid, colorMap || {}, gridDimensions, dims);

    // ---- Sayfa 2: Öğretmen Çözüm Anahtarı ----
    doc.addPage();

    const solutionData = solutionGrid && Array.isArray(solutionGrid) && solutionGrid.length > 0
      ? solutionGrid
      : pixelGrid;

    doc.setFont('Roboto', 'normal');
    drawSolutionPage(doc, solutionData, colorMap || {}, gridDimensions, dims);

    // ---- PDF'i indir ----
    doc.save('Karesel-Kodlama-Etkinligi.pdf');

    return { success: true, message: 'PDF başarıyla oluşturuldu.' };
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    return { success: false, message: error.message || 'PDF oluşturulamadı.' };
  }
};

export default generateActivityPDF;