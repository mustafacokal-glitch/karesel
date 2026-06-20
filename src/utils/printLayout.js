export const MIN_CELL_SIZE_MM = 5;

export function getPageDimensions(orientation, paperSize = 'a4') {
  // A4: 210 x 297 mm
  // Letter: 215.9 x 279.4 mm
  const w = paperSize === 'letter' ? 215.9 : 210;
  const h = paperSize === 'letter' ? 279.4 : 297;

  // Sayfa kenarlıklarını tamamen minimuma (5mm) indirdik
  if (orientation === 'landscape') {
    return {
      PAGE_WIDTH: h,
      PAGE_HEIGHT: w,
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
    PAGE_WIDTH: w,
    PAGE_HEIGHT: h,
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
