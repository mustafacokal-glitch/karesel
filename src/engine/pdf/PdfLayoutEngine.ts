import { PdfLayoutResult, PdfPageKind, PdfOrientation, PdfOrientationPolicy } from './PdfTypes';

export class PdfLayoutEngine {
  private static readonly A4_PORTRAIT_W = 210;
  private static readonly A4_PORTRAIT_H = 297;
  
  public static calculatePdfLayout(params: {
    gridWidth: number;
    gridHeight: number;
    colorCount: number;
    pageKind: PdfPageKind;
    includeLegend: boolean;
    includeCoordinates: boolean;
    includeOriginalReference?: boolean;
    preferredOrientation?: PdfOrientationPolicy;
  }): PdfLayoutResult {
    let orientation: PdfOrientation = 'portrait';
    let warnings: string[] = [];
    let warningLevel: 'none' | 'minor' | 'critical' = 'none';

    if (params.preferredOrientation === 'strict-portrait') {
      orientation = 'portrait';
    } else if (params.preferredOrientation === 'strict-landscape') {
      orientation = 'landscape';
    } else {
      // Auto orientation determination
      const maxDim = Math.max(params.gridWidth, params.gridHeight);
      if (maxDim <= 25) {
        orientation = 'portrait';
      } else if (maxDim <= 30) {
        // Evaluate if portrait can do >= 4.5mm
        const w = this.A4_PORTRAIT_W - 20; // 10mm margin
        const maxCell = w / maxDim;
        orientation = maxCell >= 4.5 ? 'portrait' : 'landscape';
      } else {
        orientation = 'landscape';
      }
    }

    const isPortrait = orientation === 'portrait';
    const pageWidthMm = isPortrait ? this.A4_PORTRAIT_W : this.A4_PORTRAIT_H;
    const pageHeightMm = isPortrait ? this.A4_PORTRAIT_H : this.A4_PORTRAIT_W;

    // Start with normal margins
    let marginMm = 10;
    const maxDim = Math.max(params.gridWidth, params.gridHeight);
    
    // If very tight, use compact margin
    if (maxDim >= 35) {
      marginMm = 7;
    }

    const coordinateHeaderSizeMm = params.includeCoordinates ? 5 : 0;
    
    // Compute Header
    const headerHeightMm = 30; // standard header
    const headerX = marginMm;
    const headerY = marginMm;

    // Compute Legend Size
    let legendWidthMm = 0;
    let legendHeightMm = 0;
    let legendColumns = 1;

    if (params.includeLegend && params.colorCount > 0) {
      if (params.colorCount <= 6) {
        legendColumns = 1;
        legendWidthMm = isPortrait ? 50 : 60;
      } else {
        legendColumns = 2;
        legendWidthMm = isPortrait ? 90 : 100;
      }
      const legendRows = Math.ceil(params.colorCount / legendColumns);
      // title height + row heights
      legendHeightMm = 8 + (legendRows * 6);
    }

    // Try to fit the grid
    let availableGridHeightMm = pageHeightMm - marginMm * 2 - headerHeightMm;
    let availableGridWidthMm = pageWidthMm - marginMm * 2;
    
    let legendX = marginMm;
    let legendY = 0;

    // Place legend
    let legendOnSide = false;
    if (params.includeLegend) {
      if (!isPortrait && (pageWidthMm - marginMm * 2 - legendWidthMm) / params.gridWidth > (availableGridHeightMm) / params.gridHeight) {
        // Legend on side
        legendOnSide = true;
        availableGridWidthMm -= (legendWidthMm + 10);
      } else {
        // Legend at bottom
        availableGridHeightMm -= (legendHeightMm + 5);
      }
    }

    let cellSizeMm = 0;
    let gridWidthMm = 0;
    let gridHeightMm = 0;
    
    const possibleCellW = (availableGridWidthMm - coordinateHeaderSizeMm) / params.gridWidth;
    const possibleCellH = (availableGridHeightMm - coordinateHeaderSizeMm) / params.gridHeight;
    cellSizeMm = Math.min(possibleCellW, possibleCellH);

    // Try compact margin if cellSize is too small
    if (cellSizeMm < 4.0 && marginMm > 5) {
      marginMm = 5;
      availableGridHeightMm = pageHeightMm - marginMm * 2 - headerHeightMm;
      availableGridWidthMm = pageWidthMm - marginMm * 2;
      
      if (params.includeLegend) {
        if (!isPortrait && (pageWidthMm - marginMm * 2 - legendWidthMm) / params.gridWidth > (availableGridHeightMm) / params.gridHeight) {
          legendOnSide = true;
          availableGridWidthMm -= (legendWidthMm + 10);
        } else {
          legendOnSide = false;
          availableGridHeightMm -= (legendHeightMm + 5);
        }
      }
      
      cellSizeMm = Math.min(
        (availableGridWidthMm - coordinateHeaderSizeMm) / params.gridWidth,
        (availableGridHeightMm - coordinateHeaderSizeMm) / params.gridHeight
      );
    }

    gridWidthMm = cellSizeMm * params.gridWidth;
    gridHeightMm = cellSizeMm * params.gridHeight;

    // Center grid in available space
    const gridX = marginMm + coordinateHeaderSizeMm + ((availableGridWidthMm - coordinateHeaderSizeMm) - gridWidthMm) / 2;
    const gridY = headerY + headerHeightMm + ((availableGridHeightMm - coordinateHeaderSizeMm) - gridHeightMm) / 2 + coordinateHeaderSizeMm;

    if (legendOnSide) {
      legendX = gridX + gridWidthMm + 10;
      legendY = gridY;
    } else {
      legendX = marginMm;
      legendY = gridY + gridHeightMm + 8;
    }

    if (cellSizeMm < 4.0) {
      warnings.push(`Cell size is critically small (${cellSizeMm.toFixed(2)}mm). Readability may be compromised.`);
      warningLevel = 'critical';
    } else if (cellSizeMm < 4.5) {
      warnings.push(`Cell size is small (${cellSizeMm.toFixed(2)}mm).`);
      if (warningLevel === 'none') warningLevel = 'minor';
    }

    if (legendY + legendHeightMm > pageHeightMm - marginMm) {
      warnings.push('Legend overflows the page margin. Trying to fit...');
      if (warningLevel !== 'critical') warningLevel = 'minor';
      legendY = pageHeightMm - marginMm - legendHeightMm; // Force it up, might overlap
    }

    // Original Image
    let originalImageX, originalImageY, originalImageWidthMm, originalImageHeightMm;
    if (params.pageKind === 'answerKey' && params.includeOriginalReference) {
      originalImageWidthMm = isPortrait ? 25 : 35;
      originalImageHeightMm = originalImageWidthMm; // assume squareish bounding box
      originalImageX = pageWidthMm - marginMm - originalImageWidthMm;
      originalImageY = marginMm;
    }

    return {
      orientation,
      pageWidthMm,
      pageHeightMm,
      marginMm,
      headerX,
      headerY,
      headerHeightMm,
      gridX,
      gridY,
      gridWidthMm,
      gridHeightMm,
      cellSizeMm,
      coordinateHeaderSizeMm,
      legendX,
      legendY,
      legendWidthMm,
      legendHeightMm,
      legendColumns,
      originalImageX,
      originalImageY,
      originalImageWidthMm,
      originalImageHeightMm,
      warningLevel,
      warnings
    };
  }
}
