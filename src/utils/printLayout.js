export const MIN_CELL_SIZE_MM = 5;

export function getPageDimensions(orientation) {
  // Sayfa kenarlıklarını tamamen minimuma (5mm) indirdik
  if (orientation === 'landscape') {
    return {
      PAGE_WIDTH: 297,
      PAGE_HEIGHT: 210,
      MARGIN_LEFT: 5,
      MARGIN_RIGHT: 5,
      MARGIN_TOP: 5,
      MARGIN_BOTTOM: 5,
      get USABLE_WIDTH() { return this.PAGE_WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT; },
      get USABLE_HEIGHT() { return this.PAGE_HEIGHT - this.MARGIN_TOP - this.MARGIN_BOTTOM; },
    };
  }
  // portrait (varsayılan)
  return {
    PAGE_WIDTH: 210,
    PAGE_HEIGHT: 297,
    MARGIN_LEFT: 5,
    MARGIN_RIGHT: 5,
    MARGIN_TOP: 5,
    MARGIN_BOTTOM: 5,
    get USABLE_WIDTH() { return this.PAGE_WIDTH - this.MARGIN_LEFT - this.MARGIN_RIGHT; },
    get USABLE_HEIGHT() { return this.PAGE_HEIGHT - this.MARGIN_TOP - this.MARGIN_BOTTOM; },
  };
}

export function estimateCellSizeMM(rows, cols, orientation) {
  const dims = getPageDimensions(orientation);
  // Daha dar marginlerle birlikte ayrılan üst-alt boşlukları (başlık, footer vb) azalttık
  const reservedHeight = 25; 
  const gridAreaHeight = dims.USABLE_HEIGHT - reservedHeight;
  return Math.min(dims.USABLE_WIDTH / cols, gridAreaHeight / rows);
}
