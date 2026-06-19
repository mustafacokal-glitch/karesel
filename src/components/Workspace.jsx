import { useCallback, useRef, useState, useEffect } from 'react';
import useProjectStore from '../store/useProjectStore';

const CELL_SIZE = 28;
const LABEL_SIZE = 14;

export default function Workspace() {
  const pixelGrid = useProjectStore((s) => s.pixelGrid);
  const solutionGrid = useProjectStore((s) => s.solutionGrid);
  const colorMap = useProjectStore((s) => s.colorMap);
  const gridDimensions = useProjectStore((s) => s.gridDimensions);
  const isEditMode = useProjectStore((s) => s.isEditMode);
  const selectedColorId = useProjectStore((s) => s.selectedColorId);
  const isSymmetryMode = useProjectStore((s) => s.isSymmetryMode);
  const updateGridCell = useProjectStore((s) => s.updateGridCell);
  const showSolution = useProjectStore((s) => s.showSolution);
  const setShowSolution = useProjectStore((s) => s.setShowSolution);
  const saveHistoryCheckpoint = useProjectStore((s) => s.saveHistoryCheckpoint);

  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef(null);
  const gridRef = useRef(null);

  const rows = gridDimensions?.rows || 0;
  const cols = gridDimensions?.cols || 0;

  // Aktif grid: edit modunda pixelGrid, değilse solutionGrid
  const activeGrid = isEditMode ? pixelGrid : solutionGrid;
  const hasData = activeGrid && rows > 0 && cols > 0;

  // Canvas genişlik/yükseklik
  const svgW = cols * CELL_SIZE + LABEL_SIZE;
  const svgH = rows * CELL_SIZE + LABEL_SIZE;

  // Simetri hesaplama
  const getSymmetryCol = useCallback(
    (colIndex) => {
      if (!isSymmetryMode) return -1;
      return cols - 1 - colIndex;
    },
    [isSymmetryMode, cols]
  );

  // Grid hücresi güncelleme
  const paintCell = useCallback(
    (rowIndex, colIndex) => {
      if (!isEditMode || !pixelGrid) return;
      if (rowIndex < 0 || rowIndex >= rows || colIndex < 0 || colIndex >= cols) return;

      updateGridCell(rowIndex, colIndex, selectedColorId);

      // Simetri modu
      const symCol = getSymmetryCol(colIndex);
      if (symCol >= 0 && symCol < cols && symCol !== colIndex) {
        updateGridCell(rowIndex, symCol, selectedColorId);
      }
    },
    [isEditMode, pixelGrid, rows, cols, selectedColorId, updateGridCell, getSymmetryCol]
  );

  // Canvas Çizim Fonksiyonu
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Canvas boyutlarını belirle
    canvas.style.width = `${svgW}px`;
    canvas.style.height = `${svgH}px`;
    canvas.width = svgW * dpr;
    canvas.height = svgH * dpr;
    ctx.scale(dpr, dpr);

    // Temizle
    ctx.clearRect(0, 0, svgW, svgH);

    // 1. Etiketleri Çiz (Satır / Sütun numaraları)
    ctx.font = '600 9px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    // Sütun Etiketleri (Üst)
    for (let c = 0; c < cols; c++) {
      const x = c * CELL_SIZE + LABEL_SIZE + CELL_SIZE / 2;
      ctx.fillText(String(c + 1), x, LABEL_SIZE / 2);
    }

    // Satır Etiketleri (Sol)
    for (let r = 0; r < rows; r++) {
      const y = r * CELL_SIZE + LABEL_SIZE + CELL_SIZE / 2;
      ctx.fillText(String(r + 1), LABEL_SIZE / 2, y);
    }

    // 2. Hücreleri Çiz
    if (!activeGrid) return;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellId = activeGrid[r]?.[c];
        let fillColor = 'white';

        // Renk durumunu belirle: Düzenleme modunda veya Çözüm Anahtarı modunda boyalı çiz, değilse beyaz çiz
        if (cellId && cellId !== 0) {
          if (showSolution || isEditMode) {
            fillColor = (colorMap && colorMap[cellId] && colorMap[cellId].hex)
              ? colorMap[cellId].hex
              : 'white';
          }
        }

        const x = c * CELL_SIZE + LABEL_SIZE;
        const y = r * CELL_SIZE + LABEL_SIZE;

        // Hücre Arka Planı
        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Hücre Sınırları
        ctx.strokeStyle = isEditMode ? '#6366f1' : '#d1d5db';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, CELL_SIZE, CELL_SIZE);

        // Hücre Numarası (0 ise yazma)
        if (cellId !== 0 && cellId !== undefined && cellId !== null) {
          let textFill = '#000000'; // Öğrenci çalışma kağıdındayken her zaman siyah
          if ((showSolution || isEditMode) && fillColor !== 'white') {
            const hex = fillColor.replace('#', '');
            const rC = parseInt(hex.substring(0, 2), 16);
            const gC = parseInt(hex.substring(2, 4), 16);
            const bC = parseInt(hex.substring(4, 6), 16);
            const luminance = (0.299 * rC + 0.587 * gC + 0.114 * bC) / 255;
            textFill = luminance > 0.45 ? '#1f2937' : '#ffffff';
          }

          ctx.fillStyle = textFill;
          ctx.font = `bold ${CELL_SIZE > 20 ? 12 : 8}px sans-serif`;
          ctx.fillText(String(cellId), x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        }
      }
    }
  }, [activeGrid, colorMap, isEditMode, showSolution, rows, cols, svgW, svgH]);

  // Hücreleri güncellemek için etkileşim koordinatlarını çöz
  const getGridCoordsFromEvent = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;

    const canvasX = x * scaleX;
    const canvasY = y * scaleY;

    const col = Math.floor((canvasX - LABEL_SIZE) / CELL_SIZE);
    const row = Math.floor((canvasY - LABEL_SIZE) / CELL_SIZE);

    return { row, col };
  }, [svgW, svgH]);

  const handleStartInteraction = useCallback((e) => {
    if (!isEditMode) return;
    saveHistoryCheckpoint();
    setIsDrawing(true);
    const coords = getGridCoordsFromEvent(e);
    if (coords) {
      paintCell(coords.row, coords.col);
    }
  }, [isEditMode, getGridCoordsFromEvent, paintCell, saveHistoryCheckpoint]);

  const handleMoveInteraction = useCallback((e) => {
    if (!isDrawing || !isEditMode) return;
    const coords = getGridCoordsFromEvent(e);
    if (coords) {
      paintCell(coords.row, coords.col);
    }
  }, [isDrawing, isEditMode, getGridCoordsFromEvent, paintCell]);

  const handleEndInteraction = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const handleTouchStart = useCallback((e) => {
    if (!isEditMode) return;
    // Çizim yaparken sayfa kaydırmasını engelle
    e.preventDefault();
    saveHistoryCheckpoint();
    setIsDrawing(true);
    const coords = getGridCoordsFromEvent(e);
    if (coords) {
      paintCell(coords.row, coords.col);
    }
  }, [isEditMode, getGridCoordsFromEvent, paintCell, saveHistoryCheckpoint]);

  const handleTouchMove = useCallback((e) => {
    if (!isDrawing || !isEditMode) return;
    e.preventDefault();
    const coords = getGridCoordsFromEvent(e);
    if (coords) {
      paintCell(coords.row, coords.col);
    }
  }, [isDrawing, isEditMode, getGridCoordsFromEvent, paintCell]);

  // Grid ve harici değişikliklerde canvas çizdir
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  if (!hasData) {
    return (
      <div className="bg-white rounded-2xl shadow-md p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          🖼️ Çalışma Alanı
        </h3>
        <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center">
          <p className="text-gray-400 italic">
            Henüz görsel yüklenmedi. Lütfen bir görsel yükleyin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-5 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h3 className="text-sm font-semibold text-gray-700">
          🖼️ Çalışma Alanı
          {isEditMode && (
            <span className="ml-2 text-xs text-blue-500 font-medium">
              ✏️ Düzenleme modu
            </span>
          )}
        </h3>

        {/* Önizleme Tipi Seçimi (Yalnızca düzenleme modu kapalıyken gösterilir) */}
        {!isEditMode && (
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
            <button
              onClick={() => setShowSolution(false)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                !showSolution
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📄 Öğrenci Sayfası
            </button>
            <button
              onClick={() => setShowSolution(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                showSolution
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              🔑 Çözüm Anahtarı
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4 w-full animate-fade-in">
        {(!isEditMode && !showSolution) ? (
          <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-5 sm:p-8 space-y-6 w-full shadow-sm">
            {/* Öğrenci Başlık Bilgileri */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-gray-300 pb-5 text-base text-gray-700 font-bold select-none">
              <div className="flex items-center gap-2">
                <span>Adı Soyadı:</span>
                <span className="border-b border-dotted border-gray-400 w-48 sm:w-64 block h-6"></span>
              </div>
              <div className="flex items-center gap-2">
                <span>Sınıfı / No:</span>
                <span className="border-b border-dotted border-gray-400 w-24 block h-6"></span>
              </div>
            </div>

            <div className="text-center select-none space-y-1">
              <h4 className="text-lg font-extrabold text-gray-800 tracking-wide">KARESAL KODLAMA ETKİNLİĞİ</h4>
              <p className="text-sm text-gray-500">Aşağıdaki renk kodlarına göre kareleri boyayarak gizli resmi ortaya çıkarın!</p>
            </div>

            {/* Canvas Izgarası */}
            <div
              className="overflow-auto bg-gray-50 p-3 w-full max-h-[60vh] rounded-2xl border border-gray-200 shadow-inner"
              onMouseUp={handleEndInteraction}
              onMouseLeave={handleEndInteraction}
              ref={gridRef}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartInteraction}
                onMouseMove={handleMoveInteraction}
                onMouseUp={handleEndInteraction}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleEndInteraction}
                className="block mx-auto max-w-full h-auto select-none"
                style={{ maxWidth: `${svgW}px`, aspectRatio: `${svgW} / ${svgH}` }}
              />
            </div>

            {/* Boyama Yönergeleri (Lejant) */}
            <div className="pt-5 border-t border-gray-200 space-y-4 select-none">
              <h5 className="text-sm font-extrabold text-gray-600 uppercase tracking-wider text-center">🎨 BOYAMA YÖNERGELERİ</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Object.entries(colorMap)
                  .sort((a, b) => Number(a[0]) - Number(b[0]))
                  .map(([id, color]) => (
                    <div key={id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-100 hover:border-purple-200 transition-all">
                      <div className="w-7 h-7 rounded-xl border border-gray-200 flex-shrink-0 shadow-sm" style={{ backgroundColor: color.hex }} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-gray-800 leading-none mb-0.5">Sayı: {id}</span>
                        <span className="text-xs font-semibold text-gray-500 truncate leading-none">{color.name}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 w-full">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider text-center select-none">
              🔑 Çözüm Anahtarı
            </h4>
            <div
              className="overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-2 w-full max-h-[75vh]"
              onMouseUp={handleEndInteraction}
              onMouseLeave={handleEndInteraction}
              ref={gridRef}
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleStartInteraction}
                onMouseMove={handleMoveInteraction}
                onMouseUp={handleEndInteraction}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleEndInteraction}
                className={`block mx-auto max-w-full h-auto select-none ${
                  isEditMode ? 'cursor-crosshair' : ''
                }`}
                style={{ maxWidth: `${svgW}px`, aspectRatio: `${svgW} / ${svgH}` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}