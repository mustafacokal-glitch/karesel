import { useCallback, useEffect } from 'react';
import useProjectStore from '../store/useProjectStore';
import { removeBackground } from '../core/bgRemover';
import { processImageToGrid, PALETTE, colorDistLAB } from '../core/pixelEngine';
import { applySmartCleaners } from '../core/gridCleaners';
import { generateActivityPDF } from '../core/pdfGenerator';
import { calculateGridDimensions } from '../utils/gridDimensions';
import { downloadGridAsPNG } from '../utils/pngExporter';
import { launchConfetti } from '../utils/confetti';

/**
 * Zorluk seviyesine göre maksimum renk sayısı
 */
const DIFFICULTY_MAX_COLORS = {
  1: 8,
  2: 12,
  3: 16,
  4: 24,
};

/**
 * Kullanılan renk sayısını maxColors ile sınırlar.
 * En az kullanılan renkler, PALETTE'teki en yakın komşularıyla birleştirilir.
 *
 * @param {number[][]} grid      - 2D piksel grid'i (palette ID'leri)
 * @param {object}     colorMap  - { id: { r, g, b, hex, name } }
 * @param {number}     maxColors - İzin verilen maksimum renk sayısı
 * @returns {{ reducedGrid: number[][], reducedColorMap: object }}
 */
function reduceColors(grid, colorMap, maxColors) {
  // Kullanım frekanslarını hesapla
  const freq = {};
  for (const row of grid) {
    for (const cellId of row) {
      if (cellId && cellId !== 0) {
        freq[cellId] = (freq[cellId] || 0) + 1;
      }
    }
  }

  let usedIds = Object.keys(freq).map(Number);

  // Renk sayısı zaten sınır içindeyse dokunma
  if (usedIds.length <= maxColors) {
    return { reducedGrid: grid, reducedColorMap: colorMap };
  }

  // Dokunulmaz renkler: Siyah(24), Kahverengi(22), Koyu Kırmızı(8), Sarı(4)
  const PROTECTED_IDS = new Set([24, 22, 8, 4]);

  // Frekansa göre artan sırala (en az kullanılan önce)
  // Korunan renklerin frekansını suni olarak devasa yaparak silinmelerini engelle
  usedIds.sort((a, b) => {
    const weightA = PROTECTED_IDS.has(a) ? freq[a] + 1000000 : freq[a];
    const weightB = PROTECTED_IDS.has(b) ? freq[b] + 1000000 : freq[b];
    return weightA - weightB;
  });

  // Silinecek renkler için eşleme tablosu: { silinecekId → yerine geçecekId }
  const remapping = {};
  const activeIds = new Set(usedIds);

  while (activeIds.size > maxColors) {
    // En az kullanılan rengi al
    const rareId = [...activeIds].sort((a, b) => {
      const weightA = PROTECTED_IDS.has(a) ? freq[a] + 1000000 : freq[a];
      const weightB = PROTECTED_IDS.has(b) ? freq[b] + 1000000 : freq[b];
      return weightA - weightB;
    })[0];
    activeIds.delete(rareId);

    // Bu rengin PALETTE'teki RGB değerlerini al
    const rareColor = colorMap[rareId] || PALETTE.find(p => p.id === rareId);
    if (!rareColor) continue;

    // Kalan aktif renkler içinde algısal olarak en yakın olanı bul (CIELAB mesafesi)
    let minDist = Infinity;
    let nearestId = null;
    for (const activeId of activeIds) {
      const activeColor = colorMap[activeId] || PALETTE.find(p => p.id === activeId);
      if (!activeColor) continue;
      
      const dist = colorDistLAB(rareColor, activeColor);
      
      if (dist < minDist) {
        minDist = dist;
        nearestId = activeId;
      }
    }

    if (nearestId !== null) {
      remapping[rareId] = nearestId;
      // Frekansı aktarım
      freq[nearestId] = (freq[nearestId] || 0) + (freq[rareId] || 0);
    }
  }

  // Grid'i yeniden eşle (transitif zincirleri çöz)
  function resolveRemap(id) {
    let curr = id;
    const visited = new Set();
    while (remapping[curr] !== undefined && !visited.has(curr)) {
      visited.add(curr);
      curr = remapping[curr];
    }
    return curr;
  }

  const reducedGrid = grid.map(row =>
    row.map(cellId => {
      if (!cellId || cellId === 0) return 0;
      return resolveRemap(cellId);
    })
  );

  // Sadece kalan renkleri içeren colorMap
  const reducedColorMap = {};
  for (const id of activeIds) {
    if (colorMap[id]) reducedColorMap[id] = colorMap[id];
  }

  return { reducedGrid, reducedColorMap };
}

/**
 * Global PALETTE ID'lerini sıralı (1, 2, 3...) ID'lere dönüştürür.
 */
function sequentializeColors(grid, colorMap) {
  const usedIds = new Set();
  for (const row of grid) {
    for (const cellId of row) {
      if (cellId && cellId !== 0) {
        usedIds.add(cellId);
      }
    }
  }

  const sortedIds = Array.from(usedIds).sort((a, b) => a - b);
  const sequentialColorMap = {};
  const remapping = {};

  let seqId = 1;
  for (const oldId of sortedIds) {
    remapping[oldId] = seqId;
    if (colorMap[oldId]) {
      sequentialColorMap[seqId] = { ...colorMap[oldId], id: seqId };
    }
    seqId++;
  }

  const sequentialGrid = grid.map(row =>
    row.map(cellId => {
      if (!cellId || cellId === 0) return 0;
      return remapping[cellId];
    })
  );

  return { sequentialGrid, sequentialColorMap };
}

export default function ActionButtons() {
  const isEditMode = useProjectStore((s) => s.isEditMode);
  const setIsEditMode = useProjectStore((s) => s.setIsEditMode);
  const isSymmetryMode = useProjectStore((s) => s.isSymmetryMode);
  const setIsSymmetryMode = useProjectStore((s) => s.setIsSymmetryMode);

  const orientation = useProjectStore((s) => s.orientation);

  const uploadedImage = useProjectStore((s) => s.uploadedImage);
  const difficultyLevel = useProjectStore((s) => s.difficultyLevel);
  const gridDimensions = useProjectStore((s) => s.gridDimensions);
  const setProcessing = useProjectStore((s) => s.setProcessing);
  const setPixelGrid = useProjectStore((s) => s.setPixelGrid);
  const setSolutionGrid = useProjectStore((s) => s.setSolutionGrid);
  const setColorMap = useProjectStore((s) => s.setColorMap);
  const setError = useProjectStore((s) => s.setError);
  const pixelGrid = useProjectStore((s) => s.pixelGrid);
  const isProcessing = useProjectStore((s) => s.isProcessing);
  const showSolution = useProjectStore((s) => s.showSolution);

  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);

  // Listen to Undo/Redo keyboard shortcuts in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditMode, undo, redo]);

  /**
   * Ana işlem hattı: Görsel yükle → Arka plan sil → Grid'e çevir → Temizle → Renk azalt → Kaydet
   */
  const handleGenerateActivity = useCallback(async () => {
    try {
      setProcessing(true);
      setError(null);

      if (!uploadedImage) {
        throw new Error('Lutfen once bir gorsel yukleyin.');
      }

      // 1. Yüklenen görselden ImageData al
      const img = new Image();
      img.src = uploadedImage;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error('Gorsel yuklenemedi.'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // 2. Arka planı sil (Eğer resimde hali hazırda şeffaflık varsa AI arka plan siliciyi atla!)
      let hasTransparency = false;
      const dataArr = imageData.data;
      for (let i = 3; i < dataArr.length; i += 4) {
        if (dataArr[i] < 255) {
          hasTransparency = true;
          break;
        }
      }
      
      let cleanData = imageData;
      if (!hasTransparency) {
        cleanData = await removeBackground(imageData);
      }

      // 3. PixelEngine ile grid'e çevir
      const imgRatio = img.width / img.height;
      const { rows, cols } = calculateGridDimensions(difficultyLevel, imgRatio, orientation);

      // Store'daki gridDimensions'ı güncelle
      useProjectStore.getState().setGridDimensions({ rows, cols });

      const { pixelGrid, colorMap } = processImageToGrid(cleanData, rows, cols, difficultyLevel);

      // Kolay modlarda (1 ve 2) pikselli bloklu yapıyı korumak için iskeletleştirmeyi (thinning) kapatıyoruz.
      // Sadece uzman modunda (4) devreye alıyoruz.
      const enableThinning = difficultyLevel >= 4; 
      const { cleanGrid, cleanColors } = applySmartCleaners(pixelGrid, colorMap, 24, enableThinning);

      // 5. Zorluk seviyesine göre renk sayısını sınırla
      const maxColors = DIFFICULTY_MAX_COLORS[difficultyLevel] || 10;
      const { reducedGrid, reducedColorMap } = reduceColors(cleanGrid, cleanColors, maxColors);

      // 6. Renkleri sırala (Sequentialize)
      const { sequentialGrid, sequentialColorMap } = sequentializeColors(reducedGrid, reducedColorMap);

      // 7. Store'a kaydet
      setPixelGrid(sequentialGrid);
      setSolutionGrid(sequentialGrid); // Çözüm anahtarı = temizlenmiş + renk azaltılmış grid
      setColorMap(sequentialColorMap);

      // Başarı durumunda konfeti patlat!
      launchConfetti();

    } catch (err) {
      console.error('[ActionButtons] Islem hatasi:', err);
      setError(err.message || 'Beklenmeyen bir hata olustu.');
    } finally {
      setProcessing(false);
    }
  }, [uploadedImage, difficultyLevel, setProcessing, setPixelGrid, setSolutionGrid, setColorMap, setError]);


  /**
   * PDF indirme
   */
  const handleDownloadPDF = useCallback(() => {
    try {
      const state = useProjectStore.getState();
      generateActivityPDF(state);
    } catch (err) {
      console.error('[ActionButtons] PDF hatasi:', err);
      setError(err.message || 'PDF olusturulamadi.');
    }
  }, [setError]);

  /**
   * PNG (Görsel) indirme
   */
  const handleDownloadPNG = useCallback(() => {
    try {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        throw new Error('Çalışma alanında indirilecek görsel bulunamadı.');
      }

      let fileName = 'karesel-kodlama';
      if (isEditMode) {
        fileName = 'cozum-anahtari-duzenleme';
      } else if (showSolution) {
        fileName = 'cozum-anahtari';
      } else {
        fileName = 'ogrenci-calisma-kagidi';
      }

      downloadGridAsPNG(canvas, fileName);
    } catch (err) {
      console.error('[ActionButtons] PNG hatasi:', err);
      setError(err.message || 'Görsel indirilemedi.');
    }
  }, [isEditMode, showSolution, setError]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
       {/* Ana buton: Etkinlik Sayfası Oluştur */}
        <button
          onClick={() => {
            handleGenerateActivity();
          }}
          disabled={isProcessing || !uploadedImage}
          className={`px-8 py-3 bg-gradient-to-r rounded-xl font-bold text-lg shadow-lg transition-all duration-200 ${
            (isProcessing || !uploadedImage)
              ? 'from-gray-400 to-gray-500 text-white opacity-60 cursor-not-allowed'
              : 'from-purple-600 to-pink-500 text-white hover:shadow-xl hover:scale-105 cursor-pointer'
          }`}
        >
          {isProcessing ? '⏳ Oluşturuluyor...' : '✨ Etkinlik Sayfası Oluştur'}
        </button>

      <div className="w-px h-8 bg-gray-300 hidden sm:block" />

      {/* PDF İndir */}
       <button
          onClick={() => {
            handleDownloadPDF();
          }}
          disabled={!pixelGrid || pixelGrid.length === 0}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border-2 ${
            (!pixelGrid || pixelGrid.length === 0)
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:bg-red-50 cursor-pointer'
          }`}
       >
         🖨️ PDF İndir
       </button>

      {/* Görsel İndir (PNG) */}
       <button
          onClick={() => {
            handleDownloadPNG();
          }}
          disabled={!pixelGrid || pixelGrid.length === 0}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border-2 ${
            (!pixelGrid || pixelGrid.length === 0)
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:bg-pink-50 cursor-pointer'
          }`}
       >
         🖼️ Görsel İndir (PNG)
       </button>

      <div className="w-px h-8 bg-gray-300 hidden sm:block" />

      {/* Düzenleme Modu */}
       <button
          onClick={() => {
            setIsEditMode(!isEditMode);
          }}
          disabled={!pixelGrid || pixelGrid.length === 0}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border-2 ${
            (!pixelGrid || pixelGrid.length === 0)
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : isEditMode
              ? 'bg-blue-600 text-white border-blue-600 shadow-md cursor-pointer'
              : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
          }`}
       >
         ✏️ {isEditMode ? 'Düzenleme Aktif' : 'Düzenleme Modu'}
       </button>

      {/* Simetri Modu (yalnızca düzenleme modunda aktif) */}
       <button
          onClick={() => {
            setIsSymmetryMode(!isSymmetryMode);
          }}
          disabled={!isEditMode || !pixelGrid || pixelGrid.length === 0}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border-2 ${
            (!isEditMode || !pixelGrid || pixelGrid.length === 0)
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : isSymmetryMode
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md cursor-pointer'
              : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer'
          }`}
       >
         🪞 {isSymmetryMode ? 'Simetri Aktif' : 'Simetri Modu'}
       </button>

      {/* Geri Al / İleri Al Butonları (yalnızca düzenleme modunda gösterilir) */}
      {isEditMode && (
        <>
          <button
            onClick={() => {
              undo();
            }}
            disabled={past.length === 0}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border-2 ${
              past.length === 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
            }`}
          >
            ↩️ Geri Al
          </button>
          <button
            onClick={() => {
              redo();
            }}
            disabled={future.length === 0}
            className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border-2 ${
              future.length === 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
            }`}
          >
            ↪️ İleri Al
          </button>
        </>
      )}
    </div>
  );
}