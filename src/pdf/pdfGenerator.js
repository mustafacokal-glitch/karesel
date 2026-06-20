/**
 * jsPDF Vektörel Yazdırma Motoru
 * 
 * A4 milimetrik tabanlı, tamamen vektörel PDF çıktısı üretir.
 * Sayfa 1: Öğrenci Etkinlik Kağıdı (boş grid + lejant)
 * Sayfa 2: Öğretmen Çözüm Anahtarı (dolu grid)
 */

import { jsPDF } from 'jspdf';
import { getPageDimensions } from '../utils/printLayout';

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
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * HEX rengi griskala karşılığına dönüştürür (B&W yazdırma modu için).
 */
function hexToGrayscaleHex(hex) {
  const { r, g, b } = hexToRgb(hex);
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  const gHex = gray.toString(16).padStart(2, '0');
  return `#${gHex}${gHex}${gHex}`;
}

function estimateActivityTime(rows, cols, colorCount) {
  const effort = (rows * cols) * colorCount;
  if (effort > 6000) return '45-60+ dk';
  if (effort > 4000) return '30-45 dk';
  if (effort > 2000) return '20-30 dk';
  return '10-15 dk';
}

function getDifficultyStars(level) {
  const diffMap = { 1: 'Zorluk: Kolay', 2: 'Zorluk: Orta', 3: 'Zorluk: Zor', 4: 'Zorluk: Uzman' };
  return diffMap[level] || 'Zorluk: Orta';
}
// Sayfa 1 — Öğrenci Etkinlik Kağıdı
// ---------------------------------------------------------------------------

/**
 * Öğrenci sayfasının başlık, öğrenci bilgi satırı, grid ve footer bölümlerini çizer.
 * @param {object} dims - getPageDimensions() çıktısı
 */
function drawStudentPage(doc, pixelGrid, colorMap, gridDimensions, dims, state, options) {
  const rows = gridDimensions.rows || gridDimensions.height || 16;
  const cols = gridDimensions.cols || gridDimensions.width || 16;
  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, USABLE_WIDTH } = dims;

  // ---- 1. Başlık ----
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  const title = normalizeText('Karesel Kodlama Etkinliği');
  doc.text(title, PAGE_WIDTH / 2, MARGIN_TOP + 8, { align: 'center' });

  // Alt Başlık Metrikleri (Zorluk ve Süre)
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  const diffText = normalizeText(getDifficultyStars(state.difficultyLevel || 2));
  const timeText = normalizeText(`Tahmini Süre: ${estimateActivityTime(rows, cols, Object.keys(colorMap).length)}`);
  doc.text(`${diffText}   |   ${timeText}`, PAGE_WIDTH / 2, MARGIN_TOP + 14, { align: 'center' });

  // ---- 2. Öğrenci Bilgi Satırı ----
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  const infoY = MARGIN_TOP + 22;

  // Sol tarafta: Adım Soyadım
  const nameText = normalizeText('Adı Soyadı: ...................................................');
  doc.text(nameText, MARGIN_LEFT, infoY);

  // Sağ tarafta: Sınıfı / No
  const classText = normalizeText('Sınıfı / No: ............................');
  doc.text(classText, PAGE_WIDTH - MARGIN_RIGHT, infoY, { align: 'right' });

  const isLandscape = PAGE_WIDTH > PAGE_HEIGHT;
  // Sütun sayısını artırarak aralıkları daraltıyoruz (eskiden portrede 3'tü, şimdi 5 veya renk sayısına göre)
  const legendCols = isLandscape ? 8 : 5;
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
        doc.setTextColor(0, 0, 0);
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
  doc.text(normalizeText('Renk Tablosu:'), MARGIN_LEFT, legendY);

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
function drawSolutionPage(doc, solutionGrid, colorMap, gridDimensions, dims, state, options) {
  const rows = gridDimensions.rows || gridDimensions.height || 16;
  const cols = gridDimensions.cols || gridDimensions.width || 16;
  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, USABLE_WIDTH } = dims;

  // ---- 1. Başlık ----
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(20);
  const title = normalizeText('ÇÖZÜM ANAHTARI (ÖĞRETMEN REHBERİ)');
  doc.setTextColor(0, 0, 0);
  doc.text(title, PAGE_WIDTH / 2, MARGIN_TOP + 8, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(10);
  const printModeText = options.printMode === 'bw' ? 'Siyah-Beyaz Baskı Modu' : 'Renkli Baskı Modu';
  doc.text(printModeText, PAGE_WIDTH / 2, MARGIN_TOP + 14, { align: 'center' });

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
          let hex = colorEntry.hex || colorEntry.color || '#000000';
          if (options.printMode === 'bw') {
            hex = hexToGrayscaleHex(hex);
          }
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
          let hex = colorEntry.hex || colorEntry.color || '#000000';
          if (options.printMode === 'bw') {
            hex = hexToGrayscaleHex(hex);
          }
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

// Sayfa 3 — AIQES Eğitsel Değerlendirme Raporu
// ---------------------------------------------------------------------------

function drawAIQESPage(doc, aiqesReport, dims, state, options) {
  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP } = dims;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(0, 0, 0);
  doc.text(normalizeText('Eğitsel Değerlendirme Raporu (AIQES)'), PAGE_WIDTH / 2, MARGIN_TOP + 15, { align: 'center' });

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(normalizeText('Karesel Yapay Zeka (AI) Pedagojik Analiz Sonuçları'), PAGE_WIDTH / 2, MARGIN_TOP + 23, { align: 'center' });

  // Puan Kutusu
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(PAGE_WIDTH / 2 - 40, MARGIN_TOP + 35, 80, 25);
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(normalizeText('Eğitsel Uygunluk Puanı'), PAGE_WIDTH / 2, MARGIN_TOP + 45, { align: 'center' });
  doc.setFontSize(20);
  doc.text(`${aiqesReport.aiqesScore} / 100`, PAGE_WIDTH / 2, MARGIN_TOP + 55, { align: 'center' });

  let currentY = MARGIN_TOP + 75;

  const drawSection = (title, items, icon) => {
    if (!items || items.length === 0) return;
    
    doc.setFont('Roboto', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(normalizeText(`${icon} ${title}`), MARGIN_LEFT + 10, currentY);
    currentY += 8;

    doc.setFont('Roboto', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    items.forEach(item => {
      // Split text to fit width
      const lines = doc.splitTextToSize(`- ${normalizeText(item)}`, PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT - 20);
      doc.text(lines, MARGIN_LEFT + 15, currentY);
      currentY += (lines.length * 5) + 3;
    });
    currentY += 10;
  };

  const strengths = [];
  const suggestions = [];

  const metrics = [
    aiqesReport.recognizability, aiqesReport.shapePreservation, 
    aiqesReport.educationalComplexity, aiqesReport.colorSimplicity, 
    aiqesReport.worksheetEffort, aiqesReport.motivation
  ];

  metrics.forEach(m => {
    if (m.score >= 85) strengths.push(m.explanation);
    if (m.score < 100 && m.recommendations) {
      m.recommendations.forEach(r => suggestions.push(r));
    }
  });

  drawSection('Etkinliğin Güçlü Yönleri', strengths, '+');
  drawSection('Öğretmene Tavsiyeler', suggestions, '>');
}


// ---------------------------------------------------------------------------
// Ana Dışa Aktarım Fonksiyonu
// ---------------------------------------------------------------------------

/**
 * Store state'ini alarak PDF'i üretir ve indirir.
 *
 * @param {Object} state - useProjectStore'un anlık state'i
 * @param {Object} options - PDF yazdırma seçenekleri
 * @param {string} options.paperSize - 'a4' | 'letter'
 * @param {string} options.printMode - 'color' | 'bw'
 */
export const generateActivityPDF = async (state, options = { paperSize: 'a4', printMode: 'color' }) => {
  try {
    const {
      pixelGrid,
      solutionGrid,
      colorMap,
      orientation = 'portrait',
      gridDimensions = { rows: 16, cols: 16 },
      processingMode,
      aiqesReport
    } = state;

    // Veri doğrulama
    if (!pixelGrid || !Array.isArray(pixelGrid) || pixelGrid.length === 0) {
      throw new Error('Geçersiz pixelGrid: Veri bulunamadı. Lütfen önce "Etkinlik Sayfası Oluştur" butonuna basın.');
    }

    // Yönelime göre güvenli değer (jsPDF yalnızca portrait ve landscape destekler)
    const safeOrientation = orientation === 'landscape' ? 'landscape' : 'portrait';

    // Sayfa boyutlarını yönelime göre hesapla (a4 veya letter)
    const dims = getPageDimensions(safeOrientation, options.paperSize);

    // jsPDF dokümanını oluştur
    const doc = new jsPDF({
      orientation: safeOrientation,
      unit: 'mm',
      format: options.paperSize === 'letter' ? 'letter' : 'a4'
    });

    // Roboto Türkçe destekli fontunu ekle (Dinamik import ile 1.4MB'lık dosya sadece PDF indirilirken yüklenir)
    const { ROBOTO_REGULAR, ROBOTO_BOLD } = await import('./robotoFonts');
    doc.addFileToVFS('Roboto-Regular.ttf', ROBOTO_REGULAR);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    doc.addFileToVFS('Roboto-Bold.ttf', ROBOTO_BOLD);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    const solutionData = solutionGrid && Array.isArray(solutionGrid) && solutionGrid.length > 0
      ? solutionGrid
      : pixelGrid;

    const rows = gridDimensions.rows || gridDimensions.height || 16;
    const cols = gridDimensions.cols || gridDimensions.width || 16;

    // ---- Sayfa 1: Öğrenci Etkinlik Kağıdı ----
    doc.setFont('Roboto', 'normal');
    drawStudentPage(doc, pixelGrid, colorMap || {}, gridDimensions, dims, state, options);

    // ---- Sayfa 2: Öğretmen Çözüm Anahtarı ----
    doc.addPage();
    doc.setFont('Roboto', 'normal');
    drawSolutionPage(doc, solutionData, colorMap || {}, gridDimensions, dims, state, options);

    // ---- Sayfa 3: AIQES Raporu (Sadece Eğitsel Yapay Zeka modundaysa) ----
    if (processingMode === 'educational_ai' && aiqesReport) {
      doc.addPage();
      drawAIQESPage(doc, aiqesReport, dims, state, options);
    }

    // ---- PDF Blob Döndür ----
    return doc.output('blob');
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    throw error;
  }
};

export default generateActivityPDF;