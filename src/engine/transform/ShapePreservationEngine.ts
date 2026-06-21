export type EdgeMode =
  | 'silhouette-only'
  | 'preserve-source-color'
  | 'force-black';

export interface PreservationConfig {
  medianRadius?: number;     // e.g. 1 means 3x3 kernel
  edgeThreshold?: number;    // e.g. 50
  edgeColor?: [number, number, number]; // RGB array, usually [56, 53, 54] for Karesel Black
  edgeMode?: EdgeMode;
  internalEdgeDarkenFactor?: number;
}

export class ShapePreservationEngine {
  
  /**
   * Applies shape preservation techniques to the image data before pixelation.
   * Prioritizes recognizability by removing noise and thickening edges/silhouettes.
   */
  public static apply(sourceImageData: ImageData, config: PreservationConfig = {}): ImageData {
    const radius = config.medianRadius ?? 1;
    const edgeColor = config.edgeColor ?? [56, 53, 54]; // Default to PALETTE Black
    const edgeMode = config.edgeMode ?? 'silhouette-only';

    // We create a copy to avoid mutating the original until each step is done
    let currentData = new ImageData(
      new Uint8ClampedArray(sourceImageData.data),
      sourceImageData.width,
      sourceImageData.height
    );

    // 1. Remove small details (Median Blur)
    currentData = this.removeSmallDetails(currentData, radius);

    // 2. Protect Silhouette
    currentData = this.protectSilhouette(currentData, edgeColor);

    // 3. Enhance internal edges
    if (edgeMode !== 'silhouette-only') {
      currentData = this.detectAndEnhanceEdges(currentData, config, edgeMode);
    }

    return currentData;
  }

  /**
   * Fast median blur to remove tiny textures/noise but keep sharp boundaries.
   * Using an approximate fast median for 3x3 (radius=1).
   */
  private static removeSmallDetails(img: ImageData, radius: number): ImageData {
    if (radius <= 0) return img;
    
    const { width, height, data } = img;
    const outData = new Uint8ClampedArray(data.length);

    // Copy borders directly
    outData.set(data);

    // Optimize memory allocation (avoiding new arrays per pixel)
    const maxNeighbors = (radius * 2 + 1) * (radius * 2 + 1);
    const rVals = new Uint8Array(maxNeighbors);
    const gVals = new Uint8Array(maxNeighbors);
    const bVals = new Uint8Array(maxNeighbors);

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4;

        if (data[idx + 3] === 0) continue; // Skip transparent

        let count = 0;

        // Collect neighborhood
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nIdx = ((y + dy) * width + (x + dx)) * 4;
            // Only consider opaque-ish pixels for the median
            if (data[nIdx + 3] > 128) {
              rVals[count] = data[nIdx];
              gVals[count] = data[nIdx + 1];
              bVals[count] = data[nIdx + 2];
              count++;
            }
          }
        }

        if (count > 0) {
          const rSlice = rVals.subarray(0, count).sort();
          const gSlice = gVals.subarray(0, count).sort();
          const bSlice = bVals.subarray(0, count).sort();
          
          const mid = Math.floor(count / 2);
          outData[idx] = rSlice[mid];
          outData[idx + 1] = gSlice[mid];
          outData[idx + 2] = bSlice[mid];
          outData[idx + 3] = data[idx + 3];
        }
      }
    }

    return new ImageData(outData, width, height);
  }

  /**
   * Forces the outermost boundary of the object to be the thick edge color.
   */
  private static protectSilhouette(img: ImageData, edgeColor: [number, number, number]): ImageData {
    const { width, height, data } = img;
    const outData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // We only look at pixels that are opaque
        if (data[idx + 3] < 128) continue;

        let silhouette = false;
        
        // If it touches the absolute image boundary, it's a silhouette by definition.
        if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
          silhouette = true;
        } else {
          // Check if any of the 4 direct neighbors is transparent (alpha = 0)
          const up = ((y - 1) * width + x) * 4;
          const down = ((y + 1) * width + x) * 4;
          const left = (y * width + (x - 1)) * 4;
          const right = (y * width + (x + 1)) * 4;

          if (data[up + 3] === 0 || data[down + 3] === 0 || data[left + 3] === 0 || data[right + 3] === 0) {
            silhouette = true;
          }
        }

        if (silhouette) {
          // It's a silhouette pixel. Paint it the edge color.
          outData[idx] = edgeColor[0];
          outData[idx + 1] = edgeColor[1];
          outData[idx + 2] = edgeColor[2];
          outData[idx + 3] = 255;
        }
      }
    }

    return new ImageData(outData, width, height);
  }

  /**
   * Uses Sobel operator to find structural edges and darkens them.
   */
  private static detectAndEnhanceEdges(img: ImageData, config: PreservationConfig, edgeMode: EdgeMode): ImageData {
    const { width, height, data } = img;
    const outData = new Uint8ClampedArray(data);
    const threshold = config.edgeThreshold ?? 50;
    const edgeColor = config.edgeColor ?? [56, 53, 54];
    const darkenFactor = config.internalEdgeDarkenFactor ?? 0.85;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        if (data[idx + 3] === 0) continue;

        // Safe neighbor coordinates with clamping for boundaries
        const upY = Math.max(0, y - 1);
        const downY = Math.min(height - 1, y + 1);
        const leftX = Math.max(0, x - 1);
        const rightX = Math.min(width - 1, x + 1);

        const tl = this.getLuma(data, upY * width + leftX);
        const tc = this.getLuma(data, upY * width + x);
        const tr = this.getLuma(data, upY * width + rightX);
        const cl = this.getLuma(data, y * width + leftX);
        const cr = this.getLuma(data, y * width + rightX);
        const bl = this.getLuma(data, downY * width + leftX);
        const bc = this.getLuma(data, downY * width + x);
        const br = this.getLuma(data, downY * width + rightX);

        const gx = -tl - 2 * cl - bl + tr + 2 * cr + br;
        const gy = -tl - 2 * tc - tr + bl + 2 * bc + br;

        const magnitude = Math.sqrt(gx * gx + gy * gy);

        if (magnitude > threshold) {
          if (edgeMode === 'force-black') {
            outData[idx] = edgeColor[0];
            outData[idx + 1] = edgeColor[1];
            outData[idx + 2] = edgeColor[2];
          } else if (edgeMode === 'preserve-source-color') {
            outData[idx] = Math.floor(data[idx] * darkenFactor);
            outData[idx + 1] = Math.floor(data[idx + 1] * darkenFactor);
            outData[idx + 2] = Math.floor(data[idx + 2] * darkenFactor);
          }
          // We don't change alpha
        }
      }
    }

    return new ImageData(outData, width, height);
  }

  private static getLuma(data: Uint8ClampedArray, pixelIndex: number): number {
    const idx = pixelIndex * 4;
    // If it's transparent, treat as white/background for contrast calculation
    if (data[idx + 3] === 0) return 255;
    return data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
  }
}
