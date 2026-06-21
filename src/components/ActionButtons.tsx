import { useCallback, useEffect, useState } from 'react';
import useProjectStore from '../stores/useProjectStore';
import { removeBackground } from '../engine/transform/bgRemover';
import { PALETTE, colorDistLAB } from '../engine/color/colorDistance';
import { applySmartCleaners, removeGridBackground } from '../engine/grid/gridCleaners';
import { WorkerManager } from '../workers/WorkerManager';
import { calculateGridDimensions } from '../utils/gridDimensions';
import { downloadGridAsPNG } from '../utils/pngExporter';
import { launchConfetti } from '../utils/confetti';
import { PIPELINE_CONFIG } from '../config/pipelineConfig';
import { SmartCache } from '../cache/SmartCache';
import { ImageProcessingError, PDFGenerationError, KareselError } from '../errors/KareselErrors';

/**
 * Zorluk seviyesine göre maksimum renk sayısı
 */
const DIFFICULTY_MAX_COLORS: Record<number, number> = {
  0: 8,
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
function reduceColors(grid: number[][], colorMap: Record<number, any>, maxColors: number) {
  // Kullanım frekanslarını hesapla
  const freq: Record<number, number> = {};
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

  // Dokunulmaz detay renkleri
  const PROTECTED_IDS = new Set(PIPELINE_CONFIG.REDUCE_COLORS.PROTECTED_IDS);
  const PENALTY = PIPELINE_CONFIG.REDUCE_COLORS.PROTECTED_WEIGHT_PENALTY;

  // Frekansa göre artan sırala (en az kullanılan önce)
  // Korunan renklerin frekansını suni olarak devasa yaparak silinmelerini engelle
  usedIds.sort((a, b) => {
    const weightA = PROTECTED_IDS.has(a) ? freq[a] + PENALTY : freq[a];
    const weightB = PROTECTED_IDS.has(b) ? freq[b] + PENALTY : freq[b];
    return weightA - weightB;
  });

  // Silinecek renkler için eşleme tablosu: { silinecekId → yerine geçecekId }
  const remapping: Record<number, number> = {};
  const activeIds = new Set(usedIds);

  while (activeIds.size > maxColors) {
    // En az kullanılan rengi al
    const rareId = [...activeIds].sort((a, b) => {
      const weightA = PROTECTED_IDS.has(a) ? freq[a] + PENALTY : freq[a];
      const weightB = PROTECTED_IDS.has(b) ? freq[b] + PENALTY : freq[b];
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
  function resolveRemap(id: number) {
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
  const reducedColorMap: Record<number, any> = {};
  for (const id of activeIds) {
    if (colorMap[id]) reducedColorMap[id] = colorMap[id];
  }

  return { reducedGrid, reducedColorMap };
}

/**
 * Global PALETTE ID'lerini sıralı (1, 2, 3...) ID'lere dönüştürür.
 */
function sequentializeColors(grid: number[][], colorMap: Record<number, any>) {
  const usedIds = new Set<number>();
  for (const row of grid) {
    for (const cellId of row) {
      if (cellId && cellId !== 0) {
        usedIds.add(cellId);
      }
    }
  }

  const sortedIds = Array.from(usedIds).sort((a, b) => a - b);
  const sequentialColorMap: Record<number, any> = {};
  const remapping: Record<number, number> = {};

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

  const uploadedImage = useProjectStore((s) => s.uploadedImage);
  const difficultyLevel = useProjectStore((s) => s.difficultyLevel);

  const setProcessing = useProjectStore((s) => s.setProcessing);
  const setPixelGrid = useProjectStore((s) => s.setPixelGrid);
  const setSolutionGrid = useProjectStore((s) => s.setSolutionGrid);
  const setColorMap = useProjectStore((s) => s.setColorMap);
  const setError = useProjectStore((s) => s.setError);
  const setShowSolution = useProjectStore((s) => s.setShowSolution);
  const pixelGrid = useProjectStore((s) => s.pixelGrid);
  const isProcessing = useProjectStore((s) => s.isProcessing);
  const showSolution = useProjectStore((s) => s.showSolution);

  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const past = useProjectStore((s) => s.past);
  const future = useProjectStore((s) => s.future);
  const regenerateTrigger = useProjectStore((s) => s.regenerateTrigger);

  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfPaperSize, setPdfPaperSize] = useState('a4');
  const [pdfPrintMode, setPdfPrintMode] = useState('color');

  // Listen to Undo/Redo keyboard shortcuts in edit mode
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
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
        throw new ImageProcessingError('Lütfen işlem yapmadan önce bir görsel yükleyin.');
      }

      const processingMode = useProjectStore.getState().processingMode;
      const gradeLevel = useProjectStore.getState().gradeLevel || 1;
      let ageGroup = 'kindergarten';
      if (gradeLevel === 1) ageGroup = 'grade1';
      else if (gradeLevel === 2) ageGroup = 'grade2';
      else if (gradeLevel === 3) ageGroup = 'grade3';
      else if (gradeLevel === 4) ageGroup = 'grade4';

      const difficultyMap: Record<number, string> = { 1: 'easy', 2: 'balanced', 3: 'advanced', 4: 'advanced' };
      const diff = difficultyMap[difficultyLevel] || 'balanced';

      // --- SMART CACHE CHECK ---
      const cacheKey = SmartCache.generateKey({
        imageHash: SmartCache.fastHash(uploadedImage),
        gridSize: useProjectStore.getState().gridDimensions,
        difficulty: difficultyLevel,
        ageLevel: ageGroup,
        colorSettings: `max_${DIFFICULTY_MAX_COLORS[difficultyLevel] || 10}_tol_${useProjectStore.getState().colorTolerance}`,
        processingMode,
        intent: useProjectStore.getState().intent,
        offsetX: useProjectStore.getState().offsetX,
        offsetY: useProjectStore.getState().offsetY
      });

      const cachedResult = SmartCache.get(cacheKey);
      if (cachedResult) {
        setPixelGrid(cachedResult.data.pixelGrid);
        setSolutionGrid(cachedResult.data.solutionGrid);
        setColorMap(cachedResult.data.colorMap);
        
        if (processingMode === 'educational_ai') {
          useProjectStore.getState().setAiqesReport(cachedResult.data.aiqesReport || null);
          if (cachedResult.data.gridDimensions) {
            useProjectStore.getState().setGridDimensions(cachedResult.data.gridDimensions);
          }
        }
        
        launchConfetti();
        SmartCache.printMetrics(); // Benchmark log
        return;
      }

      const startTime = performance.now();

      // 1. Yüklenen görselden ImageData al
      const img = new Image();
      img.src = uploadedImage;
      await new Promise((resolve, reject) => {
        img.onload = () => {
          if (img.width === 0 || img.height === 0) reject(new ImageProcessingError('Görsel boyutları sıfır. Dosya bozuk olabilir.'));
          else resolve(null);
        };
        img.onerror = () => reject(new ImageProcessingError('Görsel yüklenemedi. Lütfen görseli tekrar yüklemeyi deneyin.'));
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new ImageProcessingError('Tarayıcınız çizim araçlarını desteklemiyor.');
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
        // Önbellekte daha önce temizlenmiş görsel var mı kontrol et
        const cachedBgRemovedData = useProjectStore.getState().originalImageData;
        if (cachedBgRemovedData && cachedBgRemovedData.data.buffer.byteLength > 0) {
          cleanData = cachedBgRemovedData;
        } else {
          try {
            cleanData = await removeBackground(imageData, (info) => {
              if (info.status === 'progress') {
                const percentage = Math.round((info.loaded / info.total) * 100);
                useProjectStore.getState().setDownloadProgressText(`🤖 Yapay Zeka İndiriliyor: %${percentage}`);
              } else if (info.status === 'done' || info.status === 'ready') {
                useProjectStore.getState().setDownloadProgressText(null);
              }
            });
            // Başarılı arka plan temizleme sonucunu önbelleğe al
            useProjectStore.getState().setOriginalImageData(cleanData);
          } catch (bgErr: any) {
            console.warn('[ActionButtons] Arka plan silme basarisiz oldu, orijinal gorselle devam ediliyor:', bgErr);
            // Graceful fallback: orijinal görselle devam et
            cleanData = imageData;
            
            // Kullanıcıya soft uyarı göster
            useProjectStore.getState().setWarning("Çevrimdışı moddasınız veya ağ bağlantısı yavaş. Arka plan temizleme atlandı, görsel olduğu gibi işlendi.");
            useProjectStore.getState().setDownloadProgressText(null);
          }
        }
      } else {
        // Şeffaf görselse direkt önbelleğe yazılabilir
        useProjectStore.getState().setOriginalImageData(imageData);
      }

      // 3. PixelEngine ile grid'e çevir

      if (processingMode === 'educational_ai') {
        useProjectStore.getState().setDownloadProgressText(`🤖 Yapay Zeka Düşünüyor...`);
        await new Promise(r => setTimeout(r, 10)); // UI paint

        const aiResult = await WorkerManager.runAIPipeline(cleanData, ageGroup as any, diff as any, useProjectStore.getState().colorTolerance, useProjectStore.getState().offsetX, useProjectStore.getState().offsetY, useProjectStore.getState().intent);

        const { sequentialGrid, sequentialColorMap } = sequentializeColors(aiResult.pixelGrid, aiResult.colorMap);
        
        let finalGrid = sequentialGrid;
        let whiteSeqId = null;
        for (const [id, colorObj] of Object.entries(sequentialColorMap)) {
          if (colorObj.hex === '#FFFFFF') {
            whiteSeqId = Number(id);
            break;
          }
        }
        if (whiteSeqId !== null) {
          finalGrid = removeGridBackground(finalGrid, whiteSeqId);
        }

        useProjectStore.getState().setGridDimensions({
          rows: aiResult.gridDimensions.height || aiResult.gridDimensions.rows,
          cols: aiResult.gridDimensions.width || aiResult.gridDimensions.cols
        });
        setPixelGrid(finalGrid);
        setSolutionGrid(finalGrid);
        setColorMap(sequentialColorMap);
        setShowSolution(true);
        useProjectStore.getState().setAiqesReport(aiResult.aiqesReport);
        useProjectStore.getState().setDownloadProgressText(null);

        const endTime = performance.now();
        SmartCache.set(cacheKey, {
          pixelGrid: finalGrid,
          solutionGrid: finalGrid,
          colorMap: sequentialColorMap,
          aiqesReport: aiResult.aiqesReport,
          gridDimensions: {
            rows: aiResult.gridDimensions.height || aiResult.gridDimensions.rows,
            cols: aiResult.gridDimensions.width || aiResult.gridDimensions.cols
          }
        }, endTime - startTime);
        SmartCache.printMetrics();

      } else {
        const imgRatio = img.width / img.height;
        const { rows, cols } = calculateGridDimensions(difficultyLevel, imgRatio);

        // Store'daki gridDimensions'ı güncelle
        useProjectStore.getState().setGridDimensions({ rows, cols });

        await new Promise(r => setTimeout(r, 10)); // UI'ın loading state'ini çizmesine izin ver
        
        // Classic modda Image Processing
        const { cleanGrid, cleanColors } = await WorkerManager.runClassicPipeline(cleanData, rows, cols, difficultyLevel, useProjectStore.getState().offsetX, useProjectStore.getState().offsetY);

        // 5. Zorluk seviyesine göre renk sayısını sınırla
        const maxColors = DIFFICULTY_MAX_COLORS[difficultyLevel] || 10;
        const { reducedGrid, reducedColorMap } = reduceColors(cleanGrid, cleanColors, maxColors);

        // Renk birleştirmelerinden sonra oluşan gürültüleri gidermek için ikinci bir hafif temizlik pası çalıştır
        const postCleanResult = applySmartCleaners(reducedGrid, reducedColorMap, PIPELINE_CONFIG.PIXEL_ENGINE.OUTLINE.ID, false);
        const finalCleanGrid = postCleanResult.cleanGrid;
        const finalCleanColors = postCleanResult.cleanColors;

        // 6. Renkleri sırala (Sequentialize)
        const { sequentialGrid, sequentialColorMap } = sequentializeColors(finalCleanGrid, finalCleanColors);

        // 7. SON TEMİZLİK: Gürültü filtrelerinden (reduceColors vs.) geçtikten sonra 
        // yanlışlıkla Beyaz'a (#FFFFFF) yuvarlanmış ve kenara dokunan tüm arka plan lekelerini temizle
        let finalGrid = sequentialGrid;
        let whiteSeqId = null;
        for (const [id, colorObj] of Object.entries(sequentialColorMap)) {
          if (colorObj.hex === '#FFFFFF') {
            whiteSeqId = Number(id);
            break;
          }
        }

        if (whiteSeqId !== null) {
          finalGrid = removeGridBackground(finalGrid, whiteSeqId);
        }

        // 8. Store'a kaydet
        setPixelGrid(finalGrid);
        setSolutionGrid(finalGrid); // Çözüm anahtarı = temizlenmiş + renk azaltılmış grid
        setColorMap(sequentialColorMap);
        setShowSolution(true);

        const endTime = performance.now();
        SmartCache.set(cacheKey, {
          pixelGrid: finalGrid,
          solutionGrid: finalGrid,
          colorMap: sequentialColorMap
        }, endTime - startTime);
        SmartCache.printMetrics();
      }

      // Başarı durumunda konfeti patlat!
      launchConfetti();

    } catch (err: any) {
      console.error('[ActionButtons] Islem hatasi:', err);
      if (err instanceof KareselError) {
        setError(err.message);
      } else {
        setError('Görsel işlenirken beklenmeyen bir hata oluştu. Tarayıcınızın belleği dolmuş olabilir. Sayfayı yenilemeyi deneyin.');
      }
    } finally {
      setProcessing(false);
    }
  }, [uploadedImage, difficultyLevel, setProcessing, setPixelGrid, setSolutionGrid, setColorMap, setError]);

  // Otomatik olarak yeniden üretimi tetikle (Zorluk seviyesi değiştiğinde)
  useEffect(() => {
    if (regenerateTrigger > 0 && uploadedImage) {
      handleGenerateActivity();
    }
  }, [regenerateTrigger, uploadedImage, handleGenerateActivity]);


  /**
   * PDF indirme
   */
  const executePdfDownload = async () => {
    try {
      setShowPdfOptions(false);
      setProcessing(true);
      useProjectStore.getState().setDownloadProgressText(`🖨️ PDF Hazırlanıyor...`);
      await new Promise(r => setTimeout(r, 10)); // UI paint

      const state = useProjectStore.getState();
      const pdfBlob = await WorkerManager.generatePDF(state, { paperSize: pdfPaperSize, printMode: pdfPrintMode });
      
      const currentCount = parseInt(localStorage.getItem('kareselPdfCount') || '1', 10);
      const formattedCount = currentCount.toString().padStart(2, '0');

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `karesel-kodlama-calismasi-${formattedCount}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      localStorage.setItem('kareselPdfCount', (currentCount + 1).toString());
    } catch (err: any) {
      console.error('[ActionButtons] PDF hatasi:', err);
      const msg = err?.message || '';
      if (msg.includes('DataClone') || msg.includes('could not be cloned')) {
        setError('PDF hazırlanırken veri aktarım hatası oluştu. Sayfayı yenileyip tekrar deneyin.');
      } else if (msg.includes('timed out') || msg.includes('timeout')) {
        setError('PDF oluşturma zaman aşımına uğradı. Daha küçük bir grid deneyin.');
      } else if (err instanceof KareselError) {
        setError(err.message);
      } else {
        setError(new PDFGenerationError().message);
      }
    } finally {
      setProcessing(false);
      useProjectStore.getState().setDownloadProgressText(null);
    }
  };

  /**
   * PNG (Görsel) indirme
   */
  const handleDownloadPNG = useCallback(() => {
    try {
      const canvas = useProjectStore.getState().canvasRef;
      if (!canvas) {
        throw new ImageProcessingError('Çalışma alanında indirilecek görsel bulunamadı.');
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
    } catch (err: any) {
      console.error('[ActionButtons] PNG hatasi:', err);
      setError(err instanceof KareselError ? err.message : 'Görsel indirilemedi. Lütfen tekrar deneyin.');
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
            setShowPdfOptions(true);
          }}
          disabled={!pixelGrid || pixelGrid.length === 0}
          className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all border-2 ${
            (!pixelGrid || pixelGrid.length === 0)
              ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
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
              ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
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
              ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
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
              ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
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
                ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
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
                ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer'
            }`}
          >
            ↪️ İleri Al
          </button>
        </>
      )}

      {/* PDF Options Modal */}
      {showPdfOptions && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pdf-modal-title"
        >
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" tabIndex={-1}>
            <h3 id="pdf-modal-title" className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              🖨️ PDF Yazdırma Ayarları
            </h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Kağıt Boyutu</label>
                <div className="flex gap-2" role="group" aria-label="Kağıt Boyutu Seçimi">
                  <button onClick={() => setPdfPaperSize('a4')} aria-pressed={pdfPaperSize === 'a4'} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${pdfPaperSize === 'a4' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>A4</button>
                  <button onClick={() => setPdfPaperSize('letter')} aria-pressed={pdfPaperSize === 'letter'} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${pdfPaperSize === 'letter' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>US Letter</button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Baskı Modu</label>
                <div className="flex gap-2" role="group" aria-label="Baskı Modu Seçimi">
                  <button onClick={() => setPdfPrintMode('color')} aria-pressed={pdfPrintMode === 'color'} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${pdfPrintMode === 'color' ? 'border-pink-600 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>🎨 Renkli</button>
                  <button onClick={() => setPdfPrintMode('bw')} aria-pressed={pdfPrintMode === 'bw'} className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 ${pdfPrintMode === 'bw' ? 'border-gray-800 bg-gray-100 text-gray-800' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>⚫ Siyah-Beyaz</button>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setShowPdfOptions(false)} className="px-4 py-2 rounded-xl text-gray-600 font-medium hover:bg-gray-100">İptal</button>
              <button onClick={executePdfDownload} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md">PDF Oluştur</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}