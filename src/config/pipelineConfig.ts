/**
 * ============================================================
 * pipelineConfig.js
 * Görüntü işleme hattının (pixel engine, cleaners, vb.) tüm
 * ayarlarını ve sabitlerini içeren merkezi yapılandırma.
 * ============================================================
 */

export const PIPELINE_CONFIG = {
  // 1. Pixel Engine (Mode-Pooling)
  PIXEL_ENGINE: {
    ALPHA_THRESHOLD: 128,
    JPEG_NOISE: {
      MIN_RGB: 215,
      MAX_DIFF: 20
    },
    MIN_FILL_RATIO: 0.10, // 10%
    CONTRAST_BOOST: {
      DIST_THRESHOLD: 800,
      WEIGHT_MULTIPLIER: 4.0
    },
    PROTECTED_COLORS: {
      IDS: [24, 22, 8, 4], // Siyah, Kahverengi, Koyu Kırmızı, Sarı
      WEIGHT_MULTIPLIER: 2.5
    },
    OUTLINE: {
      ID: 24, // Siyah
      THRESHOLD_RATIO: 0.15, // 15%
      SECONDARY_THRESHOLD_RATIO: 0.06,
      MIN_NEIGHBOR_SUPPORT: 2
    },
    CENTER_WEIGHT: {
      MIN: 1.0,
      MAX: 1.5
    }
  },

  // 2. Renk Azaltma (reduceColors)
  REDUCE_COLORS: {
    PROTECTED_IDS: [24, 22, 8, 6, 5, 4],
    PROTECTED_WEIGHT_PENALTY: 1000000
  },

  // 3. Grid Temizleyiciler (gridCleaners)
  CLEANERS: {
    ZHANG_SUEN: {
      MAX_ITERATIONS: 30
    },
    ISOLATED_PIXELS: {
      PROTECTED_IDS: [24, 4, 1], // Siyah, Sarı, Beyaz
      CONTRAST_THRESHOLD: 1500
    },
    FILL_HOLES: {
      MIN_SAME_COLOR_NEIGHBORS: 5,
      MIN_NON_EMPTY_NEIGHBORS: 6
    },
    SMOOTH_EDGES: {
      PROTECTED_IDS: [24, 1, 4, 7, 8, 14, 19, 20, 22] // Siyah, Beyaz, Sarı, Kırmızı, Koyu Kırmızı, Mavi, Yeşil, Koyu Yeşil, Kahverengi
    }
  }
};

export const SHAPE_PRESERVATION_BY_DIFFICULTY: Record<number, { medianRadius: number; edgeThreshold: number }> = {
  1: { medianRadius: 1, edgeThreshold: 45 }, // Mini - 1. sınıf, en agresif temizlik
  2: { medianRadius: 1, edgeThreshold: 50 },
  3: { medianRadius: 1, edgeThreshold: 55 },
  4: { medianRadius: 0, edgeThreshold: 60 }, // Advanced - detay korunsun, blur YOK
};
