import { AIQESReport, ColorMap, GridDimensions, PixelGrid } from '../types';

export const CANONICAL_PALETTE_VERSION = 'canonical-24-palette-v1';

export interface CacheKeyParams {
  imageHash: string;
  gridSize: { rows: number; cols: number };
  difficulty: number | string;
  ageLevel: string | number;
  colorSettings: string;
  processingMode: string;
  offsetX?: number;
  offsetY?: number;
  intent?: import('../types').ProcessingIntent | string;
  gridProfileVersion?: string;
  paletteVersion?: string;
}

export interface CachedResult {
  pixelGrid: PixelGrid;
  solutionGrid: PixelGrid;
  colorMap: ColorMap;
  aiqesReport?: AIQESReport | null;
  gridDimensions?: GridDimensions;
}

export interface CacheEntry {
  key: string;
  data: CachedResult;
  timestamp: number;
  processingTimeMs: number;
}

/**
 * SmartCache implements an LRU (Least Recently Used) caching mechanism
 * for KARESEL pixel art generation outputs.
 */
export class SmartCache {
  private static MAX_ENTRIES = 20;
  private static cache = new Map<string, CacheEntry>();
  
  public static metrics = {
    hits: 0,
    misses: 0,
    totalSavedMs: 0
  };

  /**
   * Generates a unique JSON string key from the provided parameters.
   */
  public static generateKey(params: CacheKeyParams): string {
    return JSON.stringify(params);
  }

  /**
   * Extremely fast hash function for large Base64 Image strings.
   * Uses DJB2 algorithm on a sampled subset of characters to prevent blocking the main thread.
   */
  public static fastHash(str: string): string {
    if (!str) return 'empty';
    let hash = 5381;
    let i = str.length;
    // For very long strings, sample every Nth character (max 1000 samples)
    const step = Math.max(1, Math.floor(i / 1000));
    while (i > 0) {
      i -= step;
      if (i >= 0) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
      }
    }
    // Include the original length to minimize collision probability
    return `${hash}_${str.length}`;
  }

  /**
   * Retrieves an item from the cache. Updates its LRU timestamp if found.
   */
  public static get(key: string): CacheEntry | null {
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.timestamp = Date.now(); // LRU Bump
      
      this.metrics.hits++;
      this.metrics.totalSavedMs += entry.processingTimeMs;
      
      console.log(`[SmartCache] HIT! 🚀 Key: ${key.substring(0, 50)}... | Recovered ~${Math.round(entry.processingTimeMs)}ms`);
      return entry;
    }
    this.metrics.misses++;
    return null;
  }

  /**
   * Stores an item in the cache. Evicts the oldest entry if max capacity is reached.
   */
  public static set(key: string, data: CachedResult, processingTimeMs: number): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.evictOldest();
    }
    this.cache.set(key, {
      key,
      data,
      timestamp: Date.now(),
      processingTimeMs
    });
    console.log(`[SmartCache] MISS - Added to Cache 💾 (${Math.round(processingTimeMs)}ms)`);
  }

  /**
   * Evicts the Least Recently Used (LRU) entry from the cache.
   */
  private static evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Explicitly clears the entire cache.
   */
  public static clear(): void {
    this.cache.clear();
    this.metrics = { hits: 0, misses: 0, totalSavedMs: 0 };
    console.log('[SmartCache] Cache cleared explicitly.');
  }

  /**
   * Prints cache performance metrics to the console.
   */
  public static printMetrics(): void {
    console.table({
      "Cache Hits": this.metrics.hits,
      "Cache Misses": this.metrics.misses,
      "Total Time Saved (ms)": Math.round(this.metrics.totalSavedMs),
      "Current Entries": this.cache.size,
      "Max Capacity": this.MAX_ENTRIES
    });
  }
}
