import { PdfWorksheetInput, PdfLayoutResult, PdfPageKind, PdfQualityReport } from './PdfTypes';
import { PdfGridRenderer } from './PdfGridRenderer';

export class PdfQualityReporter {
  public static createReport(params: {
    input: PdfWorksheetInput;
    layout: PdfLayoutResult;
    pageKind: PdfPageKind;
  }): PdfQualityReport {
    const { input, layout, pageKind } = params;
    
    const overflowWarnings: string[] = [];
    const criticalWarnings: string[] = [];

    // Check spacing gaps
    if (layout.coordinateTopY !== undefined && layout.instructionY !== undefined && layout.instructionHeightMm !== undefined) {
      const instructionToCoordinateGap = layout.coordinateTopY - (layout.instructionY + layout.instructionHeightMm);
      if (instructionToCoordinateGap < 4.0) {
        overflowWarnings.push('instruction-coordinate-gap-too-small: Gap between instruction and coordinates is too small.');
      }
    }

    if (layout.gridY !== undefined) {
      const actualColumnLabelY = layout.gridY - PdfGridRenderer.PDF_GRID_RENDERING_OFFSETS.columnLabelToGridGapMm;
      const actualColumnLabelToGridGap = layout.gridY - actualColumnLabelY;

      if (actualColumnLabelToGridGap < 0.45) {
        overflowWarnings.push('column-label-too-close-to-grid: column labels are too close to the grid.');
      }

      if (actualColumnLabelToGridGap > 1.1) {
        overflowWarnings.push('column-label-too-far-from-grid: column labels are too far from the grid.');
      }
    }

    // Check bounds
    if (layout.gridX + layout.gridWidthMm > layout.pageWidthMm - layout.marginMm + 1) {
      overflowWarnings.push('Grid overflows page width margin.');
    }
    if (layout.gridY + layout.gridHeightMm > layout.pageHeightMm - layout.marginMm + 1) {
      overflowWarnings.push('Grid overflows page height margin.');
    }
    
    if (input.includeLegend) {
      const ll = layout.legendLayout;
      if (!ll) {
        overflowWarnings.push('legend-layout-missing: Legend layout is missing.');
      } else {
        const usableWidthMm = layout.pageWidthMm - layout.marginMm * 2;
        if (ll.widthMm > usableWidthMm + 0.1) {
          overflowWarnings.push('legend-overflow: Legend width exceeds usable page width.');
        }
        if (ll.itemWidthMm <= 0) {
          criticalWarnings.push('legend-item-width-too-small: Legend item width is zero or negative.');
        }
        if (ll.y + ll.heightMm > layout.pageHeightMm - 8) {
          overflowWarnings.push('legend-footer-overlap: Legend bottom overlaps with footer area.');
        }
        if (ll.y < layout.gridY + layout.gridHeightMm) {
          criticalWarnings.push('legend-grid-overlap: Legend overlaps with the grid.');
        }
        if (ll.rows * ll.columns < input.colorEntries.length) {
          criticalWarnings.push('legend-capacity-insufficient: Legend grid cannot hold all colors.');
        }
      }
    }

    if (layout.cellSizeMm < 4.0) {
      criticalWarnings.push(`Cell size is critically small (${layout.cellSizeMm.toFixed(2)}mm)`);
    }

    if (!input.includeLegend) {
      overflowWarnings.push('Legend is missing.');
    }
    
    if (!input.includeCoordinates) {
      overflowWarnings.push('Coordinates are missing.');
    }

    if (input.colorEntries.length > 9) {
      overflowWarnings.push(`High color count: ${input.colorEntries.length}`);
    }

    const report: PdfQualityReport = {
      gridWidth: input.grid[0]?.length || 0,
      gridHeight: input.grid.length || 0,
      colorCount: input.colorEntries.length,
      pageKind,
      orientation: layout.orientation,
      cellSizeMm: layout.cellSizeMm,
      hasCoordinates: !!input.includeCoordinates,
      hasLegend: !!input.includeLegend,
      hasStudentPage: !!input.includeStudentWorksheet,
      hasAnswerKeyPage: !!input.includeAnswerKey,
      overflowWarnings,
      criticalWarnings
    };

    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.info(`[KARESEL] PDF quality report for ${pageKind}`, report);
    }

    return report;
  }
}
