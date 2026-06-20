export const MIN_CELL_SIZE_MM = 7;
export const TILE_HEADER_HEIGHT_MM = 14;
export const TILE_FOOTER_HEIGHT_MM = 8;

export function getPageDimensions(orientation) {
  if (orientation === 'landscape') {
    return {
      PAGE_WIDTH: 297,
      PAGE_HEIGHT: 210,
      MARGIN_LEFT: 15,
      MARGIN_RIGHT: 15,
      MARGIN_TOP: 15,
      MARGIN_BOTTOM: 15,
      get USABLE_WIDTH() { return this.PAGE_WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT; },
      get USABLE_HEIGHT() { return this.PAGE_HEIGHT - this.MARGIN_TOP - this.MARGIN_BOTTOM; },
    };
  }
  // portrait (varsayılan)
  return {
    PAGE_WIDTH: 210,
    PAGE_HEIGHT: 297,
    MARGIN_LEFT: 15,
    MARGIN_RIGHT: 15,
    MARGIN_TOP: 20,
    MARGIN_BOTTOM: 20,
    get USABLE_WIDTH() { return this.PAGE_WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT; },
    get USABLE_HEIGHT() { return this.PAGE_HEIGHT - this.MARGIN_TOP - this.MARGIN_BOTTOM; },
  };
}

export function estimateCellSizeMM(rows, cols, orientation) {
  const dims = getPageDimensions(orientation);
  // drawStudentPage'deki gridAreaTop/Bottom hesabını basitleştirilmiş sabit bir
  // header+legend rezervasyonuyla taklit et
  const reservedHeight = 40;
  const gridAreaHeight = dims.USABLE_HEIGHT - reservedHeight;
  return Math.min(dims.USABLE_WIDTH / cols, gridAreaHeight / rows);
}

export function needsTiling(rows, cols, orientation) {
  return estimateCellSizeMM(rows, cols, orientation) < MIN_CELL_SIZE_MM;
}

export function computeTilingPlan(rows, cols, orientation) {
  const dims = getPageDimensions(orientation);
  const colsPerTile = Math.floor(dims.USABLE_WIDTH / MIN_CELL_SIZE_MM);
  const rowsPerTile = Math.floor(
    (dims.USABLE_HEIGHT - TILE_HEADER_HEIGHT_MM - TILE_FOOTER_HEIGHT_MM) / MIN_CELL_SIZE_MM
  );
  return {
    cellSize: MIN_CELL_SIZE_MM,
    colsPerTile,
    rowsPerTile,
    numTileCols: Math.ceil(cols / colsPerTile),
    numTileRows: Math.ceil(rows / rowsPerTile),
  };
}
