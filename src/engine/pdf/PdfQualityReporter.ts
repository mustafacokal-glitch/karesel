import { PdfWorksheetInput, PdfLayoutResult, PdfPageKind, PdfQualityReport } from './PdfTypes';

export class PdfQualityReporter {
  public static createReport(params: {
    input: PdfWorksheetInput;
    layout: PdfLayoutResult;
    pageKind: PdfPageKind;
  }): PdfQualityReport {
    const { input, layout, pageKind } = params;
    
    const overflowWarnings: string[] = [];
    const criticalWarnings: string[] = [];

    // Check bounds
    if (layout.gridX + layout.gridWidthMm > layout.pageWidthMm - layout.marginMm + 1) {
      overflowWarnings.push('Grid overflows page width margin.');
    }
    if (layout.gridY + layout.gridHeightMm > layout.pageHeightMm - layout.marginMm + 1) {
      overflowWarnings.push('Grid overflows page height margin.');
    }
    
    if (input.includeLegend) {
      if (layout.legendX + layout.legendWidthMm > layout.pageWidthMm - layout.marginMm + 1) {
        overflowWarnings.push('Legend overflows page width margin.');
      }
      if (layout.legendY + layout.legendHeightMm > layout.pageHeightMm - layout.marginMm + 1) {
        overflowWarnings.push('Legend overflows page height margin.');
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
