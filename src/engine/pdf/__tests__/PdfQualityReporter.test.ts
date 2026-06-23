import { describe, it, expect } from 'vitest';
import { PdfQualityReporter } from '../PdfQualityReporter';
import { PdfLayoutResult } from '../PdfTypes';

describe('PdfQualityReporter', () => {
  it('should generate critical warnings for cell sizes under 4.0mm', () => {
    const layout: PdfLayoutResult = {
      orientation: 'portrait',
      pageWidthMm: 210,
      pageHeightMm: 297,
      marginMm: 10,
      headerX: 10,
      headerY: 10,
      headerHeightMm: 30,
      gridX: 20,
      gridY: 50,
      gridWidthMm: 150,
      gridHeightMm: 150,
      cellSizeMm: 3.5, // Critical!
      coordinateHeaderSizeMm: 5,
      legendX: 10,
      legendY: 210,
      legendWidthMm: 50,
      legendHeightMm: 30,
      legendColumns: 1,
      warningLevel: 'critical',
      warnings: []
    };

    const report = PdfQualityReporter.createReport({
      input: {
        grid: [[1]],
        colorEntries: [],
        includeLegend: true,
        includeCoordinates: true
      },
      layout,
      pageKind: 'student'
    });

    expect(report.criticalWarnings.length).toBeGreaterThan(0);
    expect(report.criticalWarnings[0]).toContain('critically small');
  });

  it('should generate overflow warnings if missing legend or coordinates', () => {
    const layout: PdfLayoutResult = {
      orientation: 'portrait',
      pageWidthMm: 210,
      pageHeightMm: 297,
      marginMm: 10,
      headerX: 10,
      headerY: 10,
      headerHeightMm: 30,
      gridX: 20,
      gridY: 50,
      gridWidthMm: 150,
      gridHeightMm: 150,
      cellSizeMm: 5.0,
      coordinateHeaderSizeMm: 5,
      legendX: 10,
      legendY: 210,
      legendWidthMm: 50,
      legendHeightMm: 30,
      legendColumns: 1,
      warningLevel: 'none',
      warnings: []
    };

    const report = PdfQualityReporter.createReport({
      input: {
        grid: [[1]],
        colorEntries: [],
        includeLegend: false,
        includeCoordinates: false
      },
      layout,
      pageKind: 'student'
    });

    expect(report.overflowWarnings).toContain('Legend is missing.');
    expect(report.overflowWarnings).toContain('Coordinates are missing.');
  });
});
