import { create } from 'zustand';
import { calculateGridDimensions } from '../utils/gridDimensions';

const useProjectStore = create((set) => ({
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
  showSolution: false,

  // Kağıt yönü: 'portrait' veya 'landscape'
  orientation: 'portrait',

  // Grid hücre boyutu (px cinsinden, canvas çizimi için)
  cellSize: 20,

  // PDF/PNG çıktı işleme durumu
  isProcessing: false,

  // Hata durumu
  error: null,

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

  // --- Aksiyonlar ---

  setUploadedImage: (image) => set({ uploadedImage: image }),

  setImageAspectRatio: (ratio) => set({ imageAspectRatio: ratio }),

  setOriginalImageData: (data) => set({ originalImageData: data }),

  setGradeLevel: (level) => set({ gradeLevel: level }),

  setDifficultyManuallySet: (value) => set({ difficultyManuallySet: value }),

  setDifficultyLevel: (level) => set((state) => {
    const { rows, cols } = calculateGridDimensions(level, state.imageAspectRatio);
    return {
      difficultyLevel: level,
      gridDimensions: { rows, cols }
    };
  }),

  setGridDimensions: (dims) => set({ gridDimensions: dims }),

  setPixelGrid: (grid) => set({ pixelGrid: grid }),


  setSolutionGrid: (grid) => set({ solutionGrid: grid }),

  setColorMap: (colors) => set({ colorMap: colors }),

  setShowSolution: (show) => set({ showSolution: show }),

  setOrientation: (orientation) => set({ orientation }),

  setCellSize: (size) => set({ cellSize: size }),

  setProcessing: (status) => set({ isProcessing: status }),

  setError: (error) => set({ error }),

  setDownloadProgressText: (text) => set({ downloadProgressText: text }),

  setCanvasRef: (ref) => set({ canvasRef: ref }),

  // --- Öğretmen Düzenleme Modu Aksiyonları ---
  setIsEditMode: (status) => set({ isEditMode: status }),

  setSelectedColorId: (id) => set({ selectedColorId: id }),

  setIsSymmetryMode: (status) => set({ isSymmetryMode: status }),
  triggerRegenerate: () => set((state) => ({ regenerateTrigger: state.regenerateTrigger + 1 })),

  updateGridCell: (rowIndex, colIndex, colorId) => set((state) => {
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

  changeColorMapping: (colorId, newColorData) => set((state) => {
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
      pixelGrid: state.pixelGrid.map(row => [...row]),
      solutionGrid: state.solutionGrid.map(row => [...row]),
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
      pixelGrid: state.pixelGrid.map(row => [...row]),
      solutionGrid: state.solutionGrid.map(row => [...row]),
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
    showSolution: false,
    isEditMode: false,
    selectedColorId: 1,
    isSymmetryMode: false,
    past: [],
    future: [],
    error: null,
  }),

  // --- Sıfırlama ---
  reset: () => set({
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
    showSolution: false,
    orientation: 'portrait',
    cellSize: 20,
    isProcessing: false,
    error: null,
    isEditMode: false,
    selectedColorId: 1,
    isSymmetryMode: false,
    past: [],
    future: [],
  }),
}));

export default useProjectStore;