import { PdfLayoutResult, PdfPageKind, PdfOrientation, PdfOrientationPolicy, PdfLegendLayout, PDF_LAYOUT_SPACING } from './PdfTypes';

export class PdfLayoutEngine {
  private static readonly A4_PORTRAIT_W = 210;
  private static readonly A4_PORTRAIT_H = 297;

  private static calculateLegendGrid(colorCount: number): { rows: number; columns: number } {
    if (colorCount <= 0) {
      return { rows: 0, columns: 0 };
    }
    if (colorCount <= 6) {
      return { rows: 1, columns: colorCount };
    }
    if (colorCount <= 9) {
      return { rows: 2, columns: Math.ceil(colorCount / 2) };
    }
    return { rows: Math.ceil(colorCount / 5), columns: 5 };
  }
  
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
    let warningLevel: PdfLayoutResult['warningLevel'] = 'none';

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

    const coordinateHeaderSizeMm = params.includeCoordinates ? 4 : 0;
    const instructionHeightMm = 5;

    // Calculate legend grid first (needed for spacing decisions)
    let legendRows = 0;
    let legendColumns = 0;
    if (params.includeLegend && params.colorCount > 0) {
      const gridInfo = this.calculateLegendGrid(params.colorCount);
      legendColumns = gridInfo.columns;
      legendRows = gridInfo.rows;
    }

    const testLegendHeight = 5 + legendRows * 7;
    const extraSafety = Math.max(0, PDF_LAYOUT_SPACING.footerSafetyMm - marginMm);

    // Compute Header base positions (top-down sequence)
    let titleY = marginMm + 6;
    let subtitleY = titleY + PDF_LAYOUT_SPACING.headerToMetaMm + 4;
    let metaY = subtitleY + PDF_LAYOUT_SPACING.headerToMetaMm + 6;
    let instructionY = metaY + PDF_LAYOUT_SPACING.metaToInstructionMm + 5;
    
    let instructionToCoordMm = PDF_LAYOUT_SPACING.instructionToCoordinatesMm; // 4.5
    let coordinateTopY = instructionY + instructionHeightMm + instructionToCoordMm;
    let gridY = coordinateTopY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);

    let availableGridWidthMm = pageWidthMm - marginMm * 2;

    if (!isPortrait) {
      // Compact layout for landscape to maximize grid height
      titleY = marginMm + 4;
      subtitleY = titleY + PDF_LAYOUT_SPACING.headerToMetaMm + 2;
      metaY = subtitleY + PDF_LAYOUT_SPACING.headerToMetaMm + 3;
      instructionY = metaY + PDF_LAYOUT_SPACING.metaToInstructionMm + 2;
      
      // Dynamic gap calculation based on tightness
      let testGap = 3.5;
      const testCoordY = instructionY + instructionHeightMm + testGap;
      const testGridY = testCoordY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);
      const testAvailableHeight = pageHeightMm - marginMm - testGridY - (testLegendHeight + PDF_LAYOUT_SPACING.gridToLegendMm + extraSafety);
      const testCellSize = testAvailableHeight / params.gridHeight;
      
      if (testCellSize < 4.0) {
        testGap = 3.0;
        const nextCoordY = instructionY + instructionHeightMm + 3.0;
        const nextGridY = nextCoordY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);
        const nextAvailableHeight = pageHeightMm - marginMm - nextGridY - (testLegendHeight + PDF_LAYOUT_SPACING.gridToLegendMm + extraSafety);
        if (nextAvailableHeight / params.gridHeight < 4.0) {
          testGap = 2.5;
        }
      }
      
      instructionToCoordMm = testGap;
      coordinateTopY = instructionY + instructionHeightMm + instructionToCoordMm;
      gridY = coordinateTopY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);
    }

    const headerHeightMm = gridY - marginMm;
    const headerX = marginMm;
    const headerY = marginMm;

    // Define legend metrics
    let mode: 'full-width-bottom' | 'compact-bottom' | 'fallback' = 'full-width-bottom';
    let rowHeightMm = 5.5;
    let titleHeightMm = 4;
    let legendWidthMm = 0;
    let legendHeightMm = 0;
    let legendItemWidthMm = 0;
    let legendOnSide = false;

    let availableGridHeightMm = pageHeightMm - marginMm * 2 - headerHeightMm;

    if (params.includeLegend && params.colorCount > 0) {
      // Check if bottom legend would make the cell size critically small (< 4.0) in landscape
      const testAvailableHeight = pageHeightMm - marginMm - gridY - (testLegendHeight + PDF_LAYOUT_SPACING.gridToLegendMm + extraSafety);
      const testCellSize = Math.min(
        (availableGridWidthMm - coordinateHeaderSizeMm) / params.gridWidth,
        testAvailableHeight / params.gridHeight
      );

      // Fallback condition: if landscape and bottom legend causes cell size to be < 4.0mm
      if (!isPortrait && testCellSize < 4.0) {
        legendOnSide = true;
        mode = 'fallback';
        legendColumns = params.colorCount <= 6 ? 1 : 2;
        legendWidthMm = 60; // Standard side legend width
        legendRows = Math.ceil(params.colorCount / legendColumns);
        legendHeightMm = 8 + (legendRows * 5.5);
        availableGridWidthMm -= (legendWidthMm + 10);
      } else {
        if (testCellSize < 4.2 && params.colorCount > 6) {
          mode = 'compact-bottom';
          rowHeightMm = 5.5;
          titleHeightMm = 4;
        }

        legendHeightMm = titleHeightMm + legendRows * rowHeightMm;
        legendWidthMm = pageWidthMm - marginMm * 2;
        legendItemWidthMm = legendColumns > 0 ? legendWidthMm / legendColumns : 0;

        availableGridHeightMm = pageHeightMm - marginMm - gridY - (legendHeightMm + PDF_LAYOUT_SPACING.gridToLegendMm + extraSafety);
      }
    } else {
      availableGridHeightMm = pageHeightMm - marginMm - gridY;
    }

    let cellSizeMm = Math.min(
      (availableGridWidthMm - coordinateHeaderSizeMm) / params.gridWidth,
      availableGridHeightMm / params.gridHeight
    );

    // Try compact margin if cellSize is too small
    if (cellSizeMm < 4.0 && marginMm > 5) {
      marginMm = 5;
      const testExtraSafety = Math.max(0, PDF_LAYOUT_SPACING.footerSafetyMm - marginMm);
      
      // Recalculate Y coordinates with marginMm = 5
      titleY = marginMm + 6;
      subtitleY = titleY + PDF_LAYOUT_SPACING.headerToMetaMm + 4;
      metaY = subtitleY + PDF_LAYOUT_SPACING.headerToMetaMm + 6;
      instructionY = metaY + PDF_LAYOUT_SPACING.metaToInstructionMm + 5;
      
      instructionToCoordMm = PDF_LAYOUT_SPACING.instructionToCoordinatesMm;
      coordinateTopY = instructionY + instructionHeightMm + instructionToCoordMm;
      gridY = coordinateTopY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);

      if (!isPortrait) {
        titleY = marginMm + 4;
        subtitleY = titleY + PDF_LAYOUT_SPACING.headerToMetaMm + 2;
        metaY = subtitleY + PDF_LAYOUT_SPACING.headerToMetaMm + 3;
        instructionY = metaY + PDF_LAYOUT_SPACING.metaToInstructionMm + 2;
        
        let testGap = 3.5;
        const testCoordY = instructionY + instructionHeightMm + testGap;
        const testGridY = testCoordY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);
        const testAvailableHeight = pageHeightMm - marginMm - testGridY - (testLegendHeight + PDF_LAYOUT_SPACING.gridToLegendMm + testExtraSafety);
        const testCellSize = testAvailableHeight / params.gridHeight;
        
        if (testCellSize < 4.0) {
          testGap = 3.0;
          const nextCoordY = instructionY + instructionHeightMm + 3.0;
          const nextGridY = nextCoordY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);
          const nextAvailableHeight = pageHeightMm - marginMm - nextGridY - (testLegendHeight + PDF_LAYOUT_SPACING.gridToLegendMm + testExtraSafety);
          if (nextAvailableHeight / params.gridHeight < 4.0) {
            testGap = 2.5;
          }
        }
        
        instructionToCoordMm = testGap;
        coordinateTopY = instructionY + instructionHeightMm + instructionToCoordMm;
        gridY = coordinateTopY + coordinateHeaderSizeMm + (params.includeCoordinates ? PDF_LAYOUT_SPACING.columnCoordinatesToGridMm : 0);
      }

      availableGridWidthMm = pageWidthMm - marginMm * 2;
      availableGridHeightMm = pageHeightMm - marginMm * 2 - (gridY - marginMm);
      legendOnSide = false; // Reset to recalculate
      
      if (params.includeLegend && params.colorCount > 0) {
        const gridInfo = this.calculateLegendGrid(params.colorCount);
        legendColumns = gridInfo.columns;
        legendRows = gridInfo.rows;

        const testAvailableHeight = pageHeightMm - marginMm - gridY - (testLegendHeight + PDF_LAYOUT_SPACING.gridToLegendMm + testExtraSafety);
        const testCellSize = Math.min(
          (availableGridWidthMm - coordinateHeaderSizeMm) / params.gridWidth,
          testAvailableHeight / params.gridHeight
        );

        if (!isPortrait && testCellSize < 4.0) {
          legendOnSide = true;
          mode = 'fallback';
          legendColumns = params.colorCount <= 6 ? 1 : 2;
          legendWidthMm = 60;
          legendRows = Math.ceil(params.colorCount / legendColumns);
          legendHeightMm = 8 + (legendRows * 5.5);
          availableGridWidthMm -= (legendWidthMm + 10);
        } else {
          if (testCellSize < 4.2 && params.colorCount > 6) {
            mode = 'compact-bottom';
            rowHeightMm = 5.5;
            titleHeightMm = 4;
          } else {
            mode = 'full-width-bottom';
            rowHeightMm = 5.5;
            titleHeightMm = 4;
          }

          legendHeightMm = titleHeightMm + legendRows * rowHeightMm;
          legendWidthMm = pageWidthMm - marginMm * 2;
          legendItemWidthMm = legendColumns > 0 ? legendWidthMm / legendColumns : 0;

          availableGridHeightMm = pageHeightMm - marginMm - gridY - (legendHeightMm + PDF_LAYOUT_SPACING.gridToLegendMm + testExtraSafety);
        }
      } else {
        availableGridHeightMm = pageHeightMm - marginMm - gridY;
      }
      
      cellSizeMm = Math.min(
        (availableGridWidthMm - coordinateHeaderSizeMm) / params.gridWidth,
        availableGridHeightMm / params.gridHeight
      );
    }

    const gridWidthMm = cellSizeMm * params.gridWidth;
    const gridHeightMm = cellSizeMm * params.gridHeight;

    // Center grid horizontally in available space
    const gridX = marginMm + coordinateHeaderSizeMm + ((availableGridWidthMm - coordinateHeaderSizeMm) - gridWidthMm) / 2;

    let legendX = marginMm;
    let legendY = 0;
    let legendLayout: PdfLegendLayout | undefined = undefined;

    if (params.includeLegend && params.colorCount > 0) {
      if (legendOnSide) {
        legendX = gridX + gridWidthMm + 10;
        legendY = gridY;
        legendItemWidthMm = legendColumns > 0 ? legendWidthMm / legendColumns : 0;

        legendLayout = {
          x: legendX,
          y: legendY,
          widthMm: legendWidthMm,
          heightMm: legendHeightMm,
          titleHeightMm: 4,
          rowHeightMm: 5.5,
          columns: legendColumns,
          rows: legendRows,
          itemWidthMm: legendItemWidthMm,
          swatchSizeMm: 4,
          numberWidthMm: 5,
          gapMm: 2,
          mode: 'fallback'
        };
      } else {
        legendX = marginMm;
        legendY = gridY + gridHeightMm + PDF_LAYOUT_SPACING.gridToLegendMm;

        const maxBottom = pageHeightMm - Math.max(marginMm, PDF_LAYOUT_SPACING.footerSafetyMm);
        if (legendY + legendHeightMm > maxBottom) {
          warnings.push('legend-footer-overlap: Legend bottom overlaps with footer area. Adjusting position...');
          if (warningLevel as string !== 'critical') warningLevel = 'minor';
          legendY = maxBottom - legendHeightMm;
        }

        legendLayout = {
          x: legendX,
          y: legendY,
          widthMm: legendWidthMm,
          heightMm: legendHeightMm,
          titleHeightMm,
          rowHeightMm,
          columns: legendColumns,
          rows: legendRows,
          itemWidthMm: legendItemWidthMm,
          swatchSizeMm: 4,
          numberWidthMm: 5,
          gapMm: 2,
          mode
        };
      }
    }

    if (cellSizeMm < 4.0) {
      warnings.push(`Cell size is critically small (${cellSizeMm.toFixed(2)}mm). Readability may be compromised.`);
      warningLevel = 'critical';
    } else if (cellSizeMm < 4.5) {
      warnings.push(`Cell size is small (${cellSizeMm.toFixed(2)}mm).`);
      if (warningLevel === 'none') warningLevel = 'minor';
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
      legendLayout,
      originalImageX,
      originalImageY,
      originalImageWidthMm,
      originalImageHeightMm,
      
      titleY,
      subtitleY,
      metaY,
      instructionY,
      instructionHeightMm,
      coordinateTopY,
      coordinateLeftX: gridX - PDF_LAYOUT_SPACING.rowCoordinatesToGridMm,
      gridBlockY: gridY,

      warningLevel,
      warnings
    };
  }
}
