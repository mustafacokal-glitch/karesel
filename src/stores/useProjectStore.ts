import { create } from 'zustand';
import { calculateGridDimensions } from '../utils/gridDimensions';
import { ProjectStore, AIQESReport, ProcessingMode, ProcessingIntent, GridDimensions, PixelGrid, ColorMap, ColorMapEntry } from '../types';

const useProjectStore = create<ProjectStore>((set) => ({
  // Pipeline Modu
  processingMode: 'educational_ai', // 'classic' | 'educational_ai'
  
  // AI Intent
  intent: 'pedagogical-fidelity', // 'educational' | 'pedagogical-fidelity' | 'fidelity'
  
  // AIQES Raporu
  aiqesReport: null,

  // Yüklenen / ham görsel (rawImage)
  uploadedImage: null,

  // Yüklenen görselin en/boy oranı
  imageAspectRatio: null,

  // Arka plan silinmiş orijinal ImageData (canvas'ten alınan)
  originalImageData: null,

  // Sınıf seviyesi (1-4)
  gradeLevel: null,

  // Zorluk manuel olarak seçildi mi?
  difficultyManuallySet: false,

  // Zorluk seviyesi: 1-4 arası sayı (1=kolay, 2=orta, 3=zor, 4=uzman)
  difficultyLevel: 2,

  // Zorluk seviyesine göre hesaplanmış grid boyutları (satır, sütun)
  gridDimensions: { rows: 30, cols: 30 },

  // Piksel motorundan çıkan renk atanmış grid (2D dizi: renk string'leri)
  pixelGrid: null,


  // Çözüm anahtarı grid'i (temizlenmiş, doğru renklerle dolu)
  solutionGrid: null,

  // Kullanılan renk paleti (hex kodları → obje)
  colorMap: {},

  // Çözüm anahtarının gösterilip gösterilmeyeceği
  showSolution: true,

  // Kağıt yönü: 'portrait' veya 'landscape'
  orientation: 'portrait',

  // Grid hücre boyutu (px cinsinden, canvas çizimi için)
  cellSize: 20,

  // PDF/PNG çıktı işleme durumu
  isProcessing: false,

  // Hata durumu
  error: null,
  
  // Uyarı durumu (çevrimdışı vb.)
  warning: null,

  downloadProgressText: null,

  // Canvas referansı (PNG indirme vb. işlemler için DOM node referansı taşır)
  canvasRef: null,

  // --- Öğretmen Düzenleme Modu State'leri ---
  isEditMode: false,
  selectedColorId: 1,
  isSymmetryMode: false,

  // --- Geçmiş Takibi State'leri ---
  past: [],
  future: [],
  regenerateTrigger: 0,
  
  colorTolerance: 50,
  offsetX: 0,
  offsetY: 0,

  // --- Aksiyonlar ---

  setProcessingMode: (mode: ProcessingMode) => set({ processingMode: mode }),

  setIntent: (intent: ProcessingIntent) => set({ intent }),

  setAiqesReport: (report: AIQESReport | null) => set({ aiqesReport: report }),

  setUploadedImage: (image: string | null) => set({ uploadedImage: image }),

  setImageAspectRatio: (ratio: number | null) => set({ imageAspectRatio: ratio }),

  setOriginalImageData: (data: ImageData | null) => set({ originalImageData: data }),

  setGradeLevel: (level: number | null) => set({ gradeLevel: level }),

  setDifficultyManuallySet: (value: boolean) => set({ difficultyManuallySet: value }),

  setDifficultyLevel: (level: number) => set((state) => {
    const { rows, cols } = calculateGridDimensions(level, state.imageAspectRatio || 1);
    return {
      difficultyLevel: level,
      gridDimensions: { rows, cols }
    };
  }),

  setGridDimensions: (dims: GridDimensions) => set({ gridDimensions: dims }),

  setPixelGrid: (grid: PixelGrid | null) => set({ pixelGrid: grid }),


  setSolutionGrid: (grid: PixelGrid | null) => set({ solutionGrid: grid }),

  setColorMap: (colors: ColorMap) => set({ colorMap: colors }),

  setShowSolution: (show: boolean) => set({ showSolution: show }),

  setOrientation: (orientation: 'portrait' | 'landscape') => set({ orientation }),

  setCellSize: (size: number) => set({ cellSize: size }),

  setProcessing: (status: boolean) => set({ isProcessing: status }),

  setError: (error: Error | string | null) => set({ error }),
  
  setWarning: (warning: string | null) => set({ warning }),

  setDownloadProgressText: (text: string | null) => set({ downloadProgressText: text }),

  setCanvasRef: (ref: HTMLCanvasElement | null) => set({ canvasRef: ref }),
  
  setColorTolerance: (val: number) => set({ colorTolerance: val }),
  setOffsetX: (val: number) => set({ offsetX: val }),
  setOffsetY: (val: number) => set({ offsetY: val }),

  // --- Öğretmen Düzenleme Modu Aksiyonları ---
  setIsEditMode: (status: boolean) => set({ isEditMode: status }),

  setSelectedColorId: (id: number) => set({ selectedColorId: id }),

  setIsSymmetryMode: (status: boolean) => set({ isSymmetryMode: status }),
  triggerRegenerate: () => set((state) => ({ regenerateTrigger: state.regenerateTrigger + 1 })),

  updateGridCell: (rowIndex: number, colIndex: number, colorId: number) => set((state) => {
    if (!state.pixelGrid || !state.solutionGrid) return {};
    
    // Eğer zaten aynı renkteyse hiçbir şeyi güncelleme (gereksiz render tetiklenmesini önler)
    if (state.pixelGrid[rowIndex]?.[colIndex] === colorId && state.solutionGrid[rowIndex]?.[colIndex] === colorId) {
      return {};
    }

    const newPixelGrid = [...state.pixelGrid];
    if (newPixelGrid[rowIndex]) {
      newPixelGrid[rowIndex] = [...newPixelGrid[rowIndex]];
      newPixelGrid[rowIndex][colIndex] = colorId;
    }

    const newSolutionGrid = [...state.solutionGrid];
    if (newSolutionGrid[rowIndex]) {
      newSolutionGrid[rowIndex] = [...newSolutionGrid[rowIndex]];
      newSolutionGrid[rowIndex][colIndex] = colorId;
    }

    return {
      pixelGrid: newPixelGrid,
      solutionGrid: newSolutionGrid,
    };
  }),

  changeColorMapping: (colorId: string | number, newColorData: Partial<ColorMapEntry>) => set((state) => {
    if (!state.pixelGrid || !state.solutionGrid) return {};

    const currentSnapshot = {
      pixelGrid: state.pixelGrid.map(row => [...row]),
      solutionGrid: state.solutionGrid.map(row => [...row]),
      colorMap: JSON.parse(JSON.stringify(state.colorMap)),
    };

    const newPast = [...state.past, currentSnapshot];
    if (newPast.length > 30) {
      newPast.shift();
    }

    const newColorMap = { ...state.colorMap };
    if (newColorMap[colorId]) {
      newColorMap[colorId] = {
        ...newColorMap[colorId],
        ...newColorData,
        id: Number(colorId)
      };
    }
    return {
      colorMap: newColorMap,
      past: newPast,
      future: [],
    };
  }),

  saveHistoryCheckpoint: () => set((state) => {
    if (!state.pixelGrid || !state.solutionGrid) return {};

    const currentSnapshot = {
      pixelGrid: state.pixelGrid.map(row => [...row]),
      solutionGrid: state.solutionGrid.map(row => [...row]),
      colorMap: JSON.parse(JSON.stringify(state.colorMap)),
    };

    const newPast = [...state.past, currentSnapshot];
    if (newPast.length > 30) {
      newPast.shift();
    }

    return {
      past: newPast,
      future: [],
    };
  }),

  undo: () => set((state) => {
    if (state.past.length === 0) return {};

    const currentSnapshot = {
      pixelGrid: state.pixelGrid?.map(row => [...row]) || [],
      solutionGrid: state.solutionGrid?.map(row => [...row]) || [],
      colorMap: JSON.parse(JSON.stringify(state.colorMap)),
    };

    const newPast = [...state.past];
    const previousSnapshot = newPast.pop();

    return {
      pixelGrid: previousSnapshot.pixelGrid,
      solutionGrid: previousSnapshot.solutionGrid,
      colorMap: previousSnapshot.colorMap,
      past: newPast,
      future: [currentSnapshot, ...state.future],
    };
  }),

  redo: () => set((state) => {
    if (state.future.length === 0) return {};

    const currentSnapshot = {
      pixelGrid: state.pixelGrid?.map(row => [...row]) || [],
      solutionGrid: state.solutionGrid?.map(row => [...row]) || [],
      colorMap: JSON.parse(JSON.stringify(state.colorMap)),
    };

    const newFuture = [...state.future];
    const nextSnapshot = newFuture.shift();

    return {
      pixelGrid: nextSnapshot.pixelGrid,
      solutionGrid: nextSnapshot.solutionGrid,
      colorMap: nextSnapshot.colorMap,
      past: [...state.past, currentSnapshot],
      future: newFuture,
    };
  }),


  resetGridOnly: () => set({
    pixelGrid: null,
    solutionGrid: null,
    colorMap: {},
    showSolution: true,
    isEditMode: false,
    selectedColorId: 1,
    isSymmetryMode: false,
    past: [],
    future: [],
    error: null,
  }),

  // --- Sıfırlama ---
  reset: () => set({
    processingMode: 'educational_ai',
    intent: 'pedagogical-fidelity',
    aiqesReport: null,
    uploadedImage: null,
    imageAspectRatio: null,
    originalImageData: null,
    gradeLevel: null,
    difficultyManuallySet: false,
    difficultyLevel: 2,
    gridDimensions: { rows: 30, cols: 30 },
    pixelGrid: null,
    solutionGrid: null,
    colorMap: {},
    showSolution: true,
    orientation: 'portrait',
    cellSize: 20,
    isProcessing: false,
    error: null,
    isEditMode: false,
    selectedColorId: 1,
    isSymmetryMode: false,
    past: [],
    future: [],
    colorTolerance: 50,
    offsetX: 0,
    offsetY: 0,
  }),
}));

export default useProjectStore;