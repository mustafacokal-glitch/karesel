import { AccentColorFamily, classifyRgbFamily } from '../color/AccentColorFamilies';

export interface SourceAccentAudit {
  foregroundPixelCount: number;

  hasBlueAccent: boolean;
  hasRedAccent: boolean;
  hasBrownAccent: boolean;
  hasCreamRegion: boolean;

  blueRatio: number;
  redRatio: number;
  brownRatio: number;
  creamRatio: number;
  blackRatio: number;
  orangeRatio: number;

  requiredAccentFamilies: AccentColorFamily[];
}

const SOURCE_ACCENT_THRESHOLDS = {
  blueRatio: 0.0025,
  redRatio: 0.0025,
  brownRatio: 0.0015,
  creamRatio: 0.01,
};

export class SourceAccentAuditEngine {
  public static analyze(imageData: ImageData): SourceAccentAudit {
    let foregroundPixelCount = 0;
    
    let blueCount = 0;
    let redCount = 0;
    let brownCount = 0;
    let creamCount = 0;
    let blackCount = 0;
    let orangeCount = 0;

    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // Skip transparent
      
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Skip obvious background whites / near-white low-information pixels
      if (r > 240 && g > 240 && b > 240) continue;

      foregroundPixelCount++;

      const family = classifyRgbFamily(r, g, b);
      if (family === 'blue') blueCount++;
      else if (family === 'red') redCount++;
      else if (family === 'brown') brownCount++;
      else if (family === 'cream') creamCount++;
      else if (family === 'black') blackCount++;
      else if (family === 'orange') orangeCount++;
    }

    const blueRatio = foregroundPixelCount > 0 ? blueCount / foregroundPixelCount : 0;
    const redRatio = foregroundPixelCount > 0 ? redCount / foregroundPixelCount : 0;
    const brownRatio = foregroundPixelCount > 0 ? brownCount / foregroundPixelCount : 0;
    const creamRatio = foregroundPixelCount > 0 ? creamCount / foregroundPixelCount : 0;
    const blackRatio = foregroundPixelCount > 0 ? blackCount / foregroundPixelCount : 0;
    const orangeRatio = foregroundPixelCount > 0 ? orangeCount / foregroundPixelCount : 0;

    const hasBlueAccent = blueRatio >= SOURCE_ACCENT_THRESHOLDS.blueRatio;
    const hasRedAccent = redRatio >= SOURCE_ACCENT_THRESHOLDS.redRatio;
    const hasBrownAccent = brownRatio >= SOURCE_ACCENT_THRESHOLDS.brownRatio;
    const hasCreamRegion = creamRatio >= SOURCE_ACCENT_THRESHOLDS.creamRatio;

    const requiredAccentFamilies: AccentColorFamily[] = [];
    if (hasBlueAccent) requiredAccentFamilies.push('blue');
    if (hasRedAccent) requiredAccentFamilies.push('red');
    if (hasBrownAccent) requiredAccentFamilies.push('brown');
    if (hasCreamRegion) requiredAccentFamilies.push('cream');

    return {
      foregroundPixelCount,
      hasBlueAccent,
      hasRedAccent,
      hasBrownAccent,
      hasCreamRegion,
      blueRatio,
      redRatio,
      brownRatio,
      creamRatio,
      blackRatio,
      orangeRatio,
      requiredAccentFamilies
    };
  }
}
