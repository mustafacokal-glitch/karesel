import { ProcessingIntent } from '../grid/types';

export type FeatureType = 'eye' | 'nose' | 'mouth' | 'whisker' | 'stripe' | 'inner-ear' | 'outline' | 'accent' | 'noise';

export type ProtectionLevel = 'hard' | 'soft' | 'none';

export interface KeyFeature {
  id: number;
  type: FeatureType;
  protection: ProtectionLevel;
  color: [number, number, number];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  area: number;
  centerX: number;
  centerY: number;
  aspectRatio: number;
}

export interface FeatureMask {
  width: number;
  height: number;
  data: Uint16Array; // Maps to KeyFeature.id (0 = none)
  features: Map<number, KeyFeature>;
  sourceBlackCoverageGrid?: number[][]; // (Optional) will be populated by pixelEngine
}

export class KeyFeaturePreservationEngine {

  public static analyze(imageData: ImageData, intent: ProcessingIntent): FeatureMask {
    // 1. Determine downscale target
    let targetSize = 128;
    if (intent === 'pedagogical-fidelity') targetSize = 200;
    else if (intent === 'fidelity') targetSize = 256;

    const scale = Math.min(targetSize / imageData.width, targetSize / imageData.height);
    const scaledWidth = Math.max(1, Math.round(imageData.width * scale));
    const scaledHeight = Math.max(1, Math.round(imageData.height * scale));

    const scaledData = this.downscale(imageData, scaledWidth, scaledHeight);

    // 2. Connected Component Labeling
    const { labels, components } = this.extractComponents(scaledData);

    // 3. Classify components into FeatureTypes
    const features = this.classifyComponents(components, scaledWidth, scaledHeight);

    // 4. Map back to original resolution
    const mask = new Uint16Array(imageData.width * imageData.height);
    for (let y = 0; y < imageData.height; y++) {
      for (let x = 0; x < imageData.width; x++) {
        const sx = Math.floor(x * scale);
        const sy = Math.floor(y * scale);
        const sIndex = sy * scaledWidth + sx;
        const compId = labels[sIndex];
        if (compId !== 0 && features.has(compId)) {
          mask[y * imageData.width + x] = compId;
        }
      }
    }

    return {
      width: imageData.width,
      height: imageData.height,
      data: mask,
      features
    };
  }

  private static downscale(source: ImageData, targetW: number, targetH: number): { width: number, height: number, data: Uint8ClampedArray } {
    // Nearest neighbor for speed
    const out = {
      width: targetW,
      height: targetH,
      data: new Uint8ClampedArray(targetW * targetH * 4)
    };
    const sx = source.width / targetW;
    const sy = source.height / targetH;
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcX = Math.floor(x * sx);
        const srcY = Math.floor(y * sy);
        const srcIdx = (srcY * source.width + srcX) * 4;
        const dstIdx = (y * targetW + x) * 4;
        out.data[dstIdx] = source.data[srcIdx];
        out.data[dstIdx+1] = source.data[srcIdx+1];
        out.data[dstIdx+2] = source.data[srcIdx+2];
        out.data[dstIdx+3] = source.data[srcIdx+3];
      }
    }
    return out;
  }

  private static extractComponents(img: { width: number, height: number, data: Uint8ClampedArray }): { labels: Uint16Array, components: Map<number, any> } {
    const w = img.width;
    const h = img.height;
    const labels = new Uint16Array(w * h);
    let nextLabel = 1;
    const components = new Map<number, any>();

    // Thresholds
    const isBlack = (r: number, g: number, b: number) => (r < 60 && g < 60 && b < 60);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (labels[idx] !== 0) continue; // already labeled
        if (img.data[idx*4+3] < 128) continue; // skip transparent

        const r = img.data[idx*4];
        const g = img.data[idx*4+1];
        const b = img.data[idx*4+2];

        // We only group contiguous black pixels or contiguous colored pixels
        const startIsBlack = isBlack(r, g, b);

        // Flood fill (BFS)
        const queue: number[] = [idx];
        labels[idx] = nextLabel;
        
        let minX = x, maxX = x, minY = y, maxY = y;
        let sumR = 0, sumG = 0, sumB = 0;
        let area = 0;

        let head = 0;
        while (head < queue.length) {
          const currIdx = queue[head++];
          const cx = currIdx % w;
          const cy = Math.floor(currIdx / w);

          area++;
          sumR += img.data[currIdx*4];
          sumG += img.data[currIdx*4+1];
          sumB += img.data[currIdx*4+2];

          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // Neighbors 4-way
          const neighbors = [
            [cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]
          ];

          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
              const nIdx = ny * w + nx;
              if (labels[nIdx] === 0 && img.data[nIdx*4+3] >= 128) {
                const nr = img.data[nIdx*4];
                const ng = img.data[nIdx*4+1];
                const nb = img.data[nIdx*4+2];
                const nIsBlack = isBlack(nr, ng, nb);
                
                // Group if both are black, or both are colored (simplified grouping)
                if (startIsBlack === nIsBlack) {
                  // For colored, we should probably check color similarity but for now let's group all non-black together? 
                  // No, we need whiskers (orange) vs muzzle (cream).
                  // Color distance:
                  const dist = Math.abs(nr-r) + Math.abs(ng-g) + Math.abs(nb-b);
                  if (startIsBlack || dist < 60) {
                    labels[nIdx] = nextLabel;
                    queue.push(nIdx);
                  }
                }
              }
            }
          }
        }

        components.set(nextLabel, {
          id: nextLabel,
          area,
          minX, maxX, minY, maxY,
          color: [Math.round(sumR/area), Math.round(sumG/area), Math.round(sumB/area)],
          isBlack: startIsBlack
        });
        nextLabel++;
      }
    }
    return { labels, components };
  }

  private static classifyComponents(components: Map<number, any>, w: number, h: number): Map<number, KeyFeature> {
    const features = new Map<number, KeyFeature>();
    const totalArea = w * h;

    const MIN_EYE_COVERAGE = 3;
    const EYE_CONFIDENCE_BOOST = 1.5;
    
    const NOSE_MIN_COVERAGE = 5;
    const MOUTH_MIN_COVERAGE = 4;
    const MOUTH_PROTECTION_CONFIDENCE = 0.6;
    const CENTRAL_FACE_REGION_WEIGHT = 2.0;

    const WHISKER_MIN_COVERAGE = 4;
    const WHISKER_IMPORTANCE_BOOST = 2.0;

    for (const comp of components.values()) {
      const centerX = (comp.minX + comp.maxX) / 2;
      const centerY = (comp.minY + comp.maxY) / 2;
      const boxW = comp.maxX - comp.minX + 1;
      const boxH = comp.maxY - comp.minY + 1;
      const aspectRatio = boxW / boxH;
      const relativeArea = comp.area / totalArea;

      let type: FeatureType = 'noise';
      let protection: ProtectionLevel = 'none';
      let confidence = 1.0;

      // Central face region logic
      const isUpperMiddle = centerY > h * 0.25 && centerY < h * 0.55 && centerX > w * 0.25 && centerX < w * 0.75;
      const isCentral = centerY > h * 0.45 && centerY < h * 0.65 && centerX > w * 0.4 && centerX < w * 0.6;

      // Very small isolated components
      if (comp.area < 3) {
        type = 'noise';
        protection = 'none';
      }
      else if (comp.isBlack) {
        // Eyes
        if (comp.area >= MIN_EYE_COVERAGE && relativeArea < 0.02 && aspectRatio >= 0.4 && aspectRatio <= 2.5 && isUpperMiddle) {
          type = 'eye';
          protection = 'hard';
          confidence *= EYE_CONFIDENCE_BOOST;
        } 
        // Nose (Central dark oval)
        else if (comp.area >= NOSE_MIN_COVERAGE && relativeArea < 0.04 && isCentral && aspectRatio >= 0.5 && aspectRatio <= 2.5) {
          type = 'nose';
          protection = 'hard';
          confidence *= CENTRAL_FACE_REGION_WEIGHT;
        }
        // Mouth
        else if (comp.area >= MOUTH_MIN_COVERAGE && relativeArea < 0.05 && aspectRatio > 2.0 && centerY > h * 0.55 && centerY < h * 0.8 && centerX > w * 0.3 && centerX < w * 0.7) {
          type = 'mouth';
          confidence = Math.min(1.0, comp.area / (MOUTH_MIN_COVERAGE * 2));
          protection = confidence > MOUTH_PROTECTION_CONFIDENCE ? 'hard' : 'soft';
        }
        // Outline
        else if (relativeArea > 0.1) {
          type = 'outline';
          protection = 'soft';
        } 
        // Stripe
        else {
          type = 'stripe';
          protection = 'soft';
        }
      } else {
        // Colored components (Whiskers, Inner-ear, Accent)
        const boundingArea = boxW * boxH;
        const fillRatio = comp.area / boundingArea;
        
        const isOrangeDarkOrange = comp.color[0] > 100 && comp.color[1] < comp.color[0] * 0.8 && comp.color[2] < 100;
        
        // Whiskers: thin lines around muzzle
        if (comp.area >= WHISKER_MIN_COVERAGE && relativeArea < 0.05 && fillRatio < 0.4 && boxW > 5 && isOrangeDarkOrange && centerY > h * 0.4 && centerY < h * 0.8) {
          type = 'whisker';
          protection = 'soft'; // Will be hard protected by color preservation if possible
          confidence *= WHISKER_IMPORTANCE_BOOST;
        } else if (relativeArea < 0.05 && centerY < h * 0.4 && isOrangeDarkOrange) {
          type = 'inner-ear';
          protection = 'soft';
        } else {
          type = 'accent';
          protection = 'soft';
        }
      }

      features.set(comp.id, {
        id: comp.id,
        type,
        protection,
        color: comp.color,
        bounds: { minX: comp.minX, minY: comp.minY, maxX: comp.maxX, maxY: comp.maxY },
        area: comp.area,
        centerX,
        centerY,
        aspectRatio
      });
    }

    return features;
  }
}
