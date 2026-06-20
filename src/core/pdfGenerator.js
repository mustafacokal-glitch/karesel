/**
 * jsPDF Vektörel Yazdırma Motoru
 * 
 * A4 milimetrik tabanlı, tamamen vektörel PDF çıktısı üretir.
 * Sayfa 1: Öğrenci Etkinlik Kağıdı (boş grid + lejant)
 * Sayfa 2: Öğretmen Çözüm Anahtarı (dolu grid)
 */

import { jsPDF } from 'jspdf';
import { ROBOTO_REGULAR, ROBOTO_BOLD } from './robotoFonts';
import { getPageDimensions, MIN_CELL_SIZE_MM, needsTiling, computeTilingPlan, TILE_HEADER_HEIGHT_MM } from '../utils/printLayout';

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
// Lejant Sayfası Çizimi (Bağımsız)
// ---------------------------------------------------------------------------

/**
 * Renk tablosunu (lejant) ayrı bir sayfaya çizer.
 */
function drawLegendPage(doc, colorMap, dims) {
  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_TOP, USABLE_WIDTH } = dims;
  const isLandscape = PAGE_WIDTH > PAGE_HEIGHT;
  const legendCols = isLandscape ? 5 : 3;

  const colorIds = Object.keys(colorMap).sort((a, b) => Number(a) - Number(b));
  const legendEntries = colorIds.map((id) => {
    const entry = colorMap[id];
    const name = entry?.name || entry?.label || `Renk ${id}`;
    return `${id} - ${normalizeText(name)}`;
  });

  let legendY = MARGIN_TOP + 10;

  doc.setFont('Roboto', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(normalizeText('Renk Tablosu (Lejant)'), PAGE_WIDTH / 2, legendY, { align: 'center' });

  legendY += 15;

  doc.setFont('Roboto', 'normal');
  doc.setFontSize(11);

  const legendColWidth = USABLE_WIDTH / legendCols;
  legendEntries.forEach((entry, i) => {
    const colIdx = i % legendCols;
    const rowIdx = Math.floor(i / legendCols);
    const x = MARGIN_LEFT + colIdx * legendColWidth;
    const y = legendY + 4 + rowIdx * 10; // Daha rahat satır aralığı
    doc.text(entry, x, y);
  });
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

  const needSeparateLegendPage = (rows >= 25 || cols >= 25);

  // ---- 3. Grid Çizimi ----
  const gridAreaTop = infoY + 10;
  // Lejant yüksekliğine göre alt sınır belirlenir, böylece taşma veya çakışma önlenir (Lejant yeni sayfadaysa tam boy kullan)
  const gridAreaBottom = needSeparateLegendPage 
    ? PAGE_HEIGHT - MARGIN_BOTTOM - 12
    : PAGE_HEIGHT - MARGIN_BOTTOM - legendHeight - 12;
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
  if (needSeparateLegendPage) {
    doc.addPage();
    drawLegendPage(doc, colorMap, dims);
  } else {
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
  }

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
// Karo (Tiling) Modu Fonksiyonları
// ---------------------------------------------------------------------------

/**
 * Parçalı yazdırma işlemi için birleştirme kılavuzu sayfası.
 */
function drawAssemblyGuidePage(doc, plan, dims) {
  const { PAGE_WIDTH, MARGIN_TOP } = dims;
  
  doc.setFont('Roboto', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text(normalizeText('Birleştirme Kılavuzu'), PAGE_WIDTH / 2, MARGIN_TOP + 10, { align: 'center' });
  
  doc.setFont('Roboto', 'normal');
  doc.setFontSize(12);
  const totalTiles = plan.numTileRows * plan.numTileCols;
  const desc = `Bu etkinlik ${totalTiles} parçaya bölünmüştür.\nAşağıdaki sıraya göre kağıtları yapıştırarak birleştirin.`;
  
  const textLines = doc.splitTextToSize(normalizeText(desc), dims.USABLE_WIDTH);
  doc.text(textLines, PAGE_WIDTH / 2, MARGIN_TOP + 25, { align: 'center' });
  
  const boxSize = 25;
  const guideWidth = plan.numTileCols * boxSize;
  
  const startX = (PAGE_WIDTH - guideWidth) / 2;
  const startY = MARGIN_TOP + 50;
  
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  
  for (let r = 0; r < plan.numTileRows; r++) {
    for (let c = 0; c < plan.numTileCols; c++) {
      const x = startX + c * boxSize;
      const y = startY + r * boxSize;
      
      doc.setFillColor(245, 245, 245);
      doc.rect(x, y, boxSize, boxSize, 'FD');
      
      doc.setFont('Roboto', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(50, 50, 50);
      const label = `${r + 1}.${c + 1}`;
      doc.text(label, x + (boxSize / 2), y + (boxSize / 2), { align: 'center', baseline: 'middle' });
    }
  }
}

/**
 * Karo modunda öğrenci sayfasını çizer.
 */
function drawStudentPageTiled(doc, pixelGrid, gridDimensions, dims, plan) {
  const { rows, cols } = gridDimensions;
  const { PAGE_WIDTH, PAGE_HEIGHT, MARGIN_LEFT, MARGIN_RIGHT, MARGIN_TOP, MARGIN_BOTTOM, USABLE_WIDTH } = dims;

  let firstPage = true;

  for (let tileRow = 0; tileRow < plan.numTileRows; tileRow++) {
    for (let tileCol = 0; tileCol < plan.numTileCols; tileCol++) {
      if (!firstPage) {
        doc.addPage();
      }
      firstPage = false;

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      const title = normalizeText(`Karesel Kodlama Etkinliği — Parça ${tileRow + 1}.${tileCol + 1} / ${plan.numTileRows}x${plan.numTileCols}`);
      doc.text(title, PAGE_WIDTH / 2, MARGIN_TOP + 8, { align: 'center' });

      const rowStart = tileRow * plan.rowsPerTile;
      const rowEnd = Math.min(rows, rowStart + plan.rowsPerTile);
      const colStart = tileCol * plan.colsPerTile;
      const colEnd = Math.min(cols, colStart + plan.colsPerTile);

      const currentTileRows = rowEnd - rowStart;
      const currentTileCols = colEnd - colStart;

      const gridWidth = plan.cellSize * currentTileCols;
      
      const gridStartX = MARGIN_LEFT + (USABLE_WIDTH - gridWidth) / 2;
      const gridStartY = MARGIN_TOP + TILE_HEADER_HEIGHT_MM + 5;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);

      for (let r = 0; r < currentTileRows; r++) {
        for (let c = 0; c < currentTileCols; c++) {
          const actualRow = rowStart + r;
          const actualCol = colStart + c;

          const x = gridStartX + c * plan.cellSize;
          const y = gridStartY + r * plan.cellSize;

          doc.rect(x, y, plan.cellSize, plan.cellSize);

          const cellValue = pixelGrid[actualRow]?.[actualCol];
          if (cellValue && cellValue > 0) {
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(Math.min(plan.cellSize * 1.8, 20));
            doc.setTextColor(0, 0, 0);
            const numStr = String(cellValue);
            doc.text(numStr, x + (plan.cellSize / 2), y + (plan.cellSize / 2), { align: 'center', baseline: 'middle' });
          }
        }
      }

      doc.setFont('Roboto', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      const footerY = PAGE_HEIGHT - MARGIN_BOTTOM + 10;
      doc.text(normalizeText('Karesel Kodlama Stüdyosu'), MARGIN_LEFT, footerY);
      doc.text('www.mustafacokal.com.tr', PAGE_WIDTH - MARGIN_RIGHT, footerY, { align: 'right' });
    }
  }
}

/**
 * Karo modunda çözüm anahtarı sayfasını çizer.
 */
function drawSolutionPageTiled(doc, solutionGrid, colorMap, gridDimensions, dims, plan) {
  const { rows, cols } = gridDimensions;
  const { PAGE_WIDTH, MARGIN_LEFT, MARGIN_TOP, USABLE_WIDTH } = dims;

  let firstPage = true;

  for (let tileRow = 0; tileRow < plan.numTileRows; tileRow++) {
    for (let tileCol = 0; tileCol < plan.numTileCols; tileCol++) {
      if (!firstPage) {
        doc.addPage();
      }
      firstPage = false;

      doc.setFont('Roboto', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      const title = normalizeText(`ÇÖZÜM ANAHTARI — Parça ${tileRow + 1}.${tileCol + 1} / ${plan.numTileRows}x${plan.numTileCols}`);
      doc.text(title, PAGE_WIDTH / 2, MARGIN_TOP + 8, { align: 'center' });

      const rowStart = tileRow * plan.rowsPerTile;
      const rowEnd = Math.min(rows, rowStart + plan.rowsPerTile);
      const colStart = tileCol * plan.colsPerTile;
      const colEnd = Math.min(cols, colStart + plan.colsPerTile);

      const currentTileRows = rowEnd - rowStart;
      const currentTileCols = colEnd - colStart;

      const gridWidth = plan.cellSize * currentTileCols;
      
      const gridStartX = MARGIN_LEFT + (USABLE_WIDTH - gridWidth) / 2;
      const gridStartY = MARGIN_TOP + TILE_HEADER_HEIGHT_MM + 5;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);

      for (let r = 0; r < currentTileRows; r++) {
        for (let c = 0; c < currentTileCols; c++) {
          const actualRow = rowStart + r;
          const actualCol = colStart + c;

          const x = gridStartX + c * plan.cellSize;
          const y = gridStartY + r * plan.cellSize;

          const cellValue = solutionGrid[actualRow]?.[actualCol];

          if (cellValue && cellValue > 0) {
            const colorEntry = colorMap[cellValue];
            if (colorEntry) {
              const hex = colorEntry.hex || colorEntry.color || '#000000';
              const { r: cr, g: cg, b: cb } = hexToRgb(hex);
              doc.setFillColor(cr, cg, cb);
              doc.rect(x, y, plan.cellSize, plan.cellSize, 'F');
            }
          }

          doc.setDrawColor(0, 0, 0);
          doc.rect(x, y, plan.cellSize, plan.cellSize);

          if (cellValue && cellValue > 0) {
            const colorEntry = colorMap[cellValue];
            let textColor = '#000000';
            if (colorEntry) {
              const hex = colorEntry.hex || colorEntry.color || '#000000';
              textColor = getContrastColor(hex);
            }
            const { r: cr, g: cg, b: cb } = hexToRgb(textColor);
            doc.setTextColor(cr, cg, cb);
            doc.setFont('Roboto', 'bold');
            doc.setFontSize(Math.min(plan.cellSize * 1.7, 18));
            const numStr = String(cellValue);
            doc.text(numStr, x + (plan.cellSize / 2), y + (plan.cellSize / 2), { align: 'center', baseline: 'middle' });
          }
        }
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

    const solutionData = solutionGrid && Array.isArray(solutionGrid) && solutionGrid.length > 0
      ? solutionGrid
      : pixelGrid;

    const { rows, cols } = gridDimensions;
    const tilingNeeded = needsTiling(rows, cols, safeOrientation);

    if (!tilingNeeded) {
      // ---- Sayfa 1: Öğrenci Etkinlik Kağıdı ----
      doc.setFont('Roboto', 'normal');
      drawStudentPage(doc, pixelGrid, colorMap || {}, gridDimensions, dims);

      // ---- Sayfa 2: Öğretmen Çözüm Anahtarı ----
      doc.addPage();
      doc.setFont('Roboto', 'normal');
      drawSolutionPage(doc, solutionData, colorMap || {}, gridDimensions, dims);
    } else {
      // ---- Tiling Modu Aktif ----
      const plan = computeTilingPlan(rows, cols, safeOrientation);
      
      drawAssemblyGuidePage(doc, plan, dims);
      
      doc.addPage();
      drawStudentPageTiled(doc, pixelGrid, gridDimensions, dims, plan);
      
      doc.addPage();
      drawLegendPage(doc, colorMap || {}, dims);
      
      doc.addPage();
      drawSolutionPageTiled(doc, solutionData, colorMap || {}, gridDimensions, dims, plan);
    }

    // ---- PDF'i indir ----
    doc.save('Karesel-Kodlama-Etkinligi.pdf');

    return { success: true, message: 'PDF başarıyla oluşturuldu.' };
  } catch (error) {
    console.error('PDF oluşturma hatası:', error);
    return { success: false, message: error.message || 'PDF oluşturulamadı.' };
  }
};

export default generateActivityPDF;