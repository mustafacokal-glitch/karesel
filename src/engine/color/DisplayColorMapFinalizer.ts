import { mapColorToCanonicalPalette } from './CanonicalPaletteMapper';
import { PALETTE } from './colorDistance';

export interface FinalizedDisplayColorMapResult {
  displayGrid: number[][];
  displayColorMap: Record<number, any>;
  originalToDisplayMap: Record<number, number>;
  additionalRemappedGrids?: number[][][];
}

export function remapGridWithDisplayMap(
  grid: number[][],
  originalToDisplayMap: Record<number, number>
): number[][] {
  const newGrid: number[][] = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const newRow: number[] = [];
    for (let c = 0; c < row.length; c++) {
      const cellId = row[c];
      if (cellId === 0) {
        newRow.push(0);
      } else {
        const mappedId = originalToDisplayMap[cellId];
        if (mappedId === undefined) {
          console.warn(`[DisplayColorMapFinalizer] Grid cell ID ${cellId} missing in mapping! Leaving as 0.`);
          newRow.push(0);
        } else {
          newRow.push(mappedId);
        }
      }
    }
    newGrid.push(newRow);
  }
  return newGrid;
}

export function finalizeDisplayColorMap(
  grid: number[][],
  colorMap: Record<number, any>,
  additionalGrids?: number[][][]
): FinalizedDisplayColorMapResult {
  const usedOriginalIds = new Set<number>();
  
  // Read from primary grid
  for (const row of grid) {
    for (const cell of row) {
      if (cell > 0) usedOriginalIds.add(cell);
    }
  }

  // Read from additional grids if any
  if (additionalGrids) {
    for (const g of additionalGrids) {
      for (const row of g) {
        for (const cell of row) {
          if (cell > 0) usedOriginalIds.add(cell);
        }
      }
    }
  }

  // Process all used IDs to find their canonical palette match
  const canonicalIdToOriginalIds = new Map<number, number[]>();
  
  for (const originalId of usedOriginalIds) {
    let entry = colorMap[originalId];
    if (!entry) {
      console.warn(`[DisplayColorMapFinalizer] Used ID ${originalId} is missing from colorMap!`);
      // Try to recover from PALETTE directly if the originalId corresponds to a PALETTE color
      const pMatch = PALETTE.find(p => p.id === originalId);
      if (pMatch) {
        entry = { ...pMatch, canonicalPaletteId: pMatch.id };
      } else {
        // Fallback to black
        const black = PALETTE.find(p => p.id === 24)!;
        entry = { ...black, canonicalPaletteId: 24 };
      }
    }

    const match = mapColorToCanonicalPalette({
      id: entry.id,
      canonicalPaletteId: entry.canonicalPaletteId,
      r: entry.r,
      g: entry.g,
      b: entry.b,
      hex: entry.hex,
      name: entry.name
    });

    const canonicalId = match.canonicalPaletteId;
    if (!canonicalIdToOriginalIds.has(canonicalId)) {
      canonicalIdToOriginalIds.set(canonicalId, []);
    }
    canonicalIdToOriginalIds.get(canonicalId)!.push(originalId);
  }

  // Deterministic display numbering: ascending canonicalPaletteId
  const sortedCanonicalIds = Array.from(canonicalIdToOriginalIds.keys()).sort((a, b) => a - b);
  
  const displayColorMap: Record<number, any> = {};
  const originalToDisplayMap: Record<number, number> = {};
  
  let currentDisplayNumber = 1;

  for (const canonicalId of sortedCanonicalIds) {
    const originalIds = canonicalIdToOriginalIds.get(canonicalId)!;
    const p = PALETTE.find(pal => pal.id === canonicalId)!;
    
    // Create one unified legend entry for this canonical color
    displayColorMap[currentDisplayNumber] = {
      id: currentDisplayNumber,
      displayNumber: currentDisplayNumber,
      canonicalPaletteId: p.id,
      r: p.r,
      g: p.g,
      b: p.b,
      hex: p.hex,
      name: p.name
    };

    // All original IDs that map to this canonical ID will get the SAME displayNumber
    for (const origId of originalIds) {
      originalToDisplayMap[origId] = currentDisplayNumber;
    }

    currentDisplayNumber++;
  }

  const displayGrid = remapGridWithDisplayMap(grid, originalToDisplayMap);
  
  let additionalRemappedGrids: number[][][] | undefined;
  if (additionalGrids && additionalGrids.length > 0) {
    additionalRemappedGrids = additionalGrids.map(g => remapGridWithDisplayMap(g, originalToDisplayMap));
  }

  return {
    displayGrid,
    displayColorMap,
    originalToDisplayMap,
    additionalRemappedGrids
  };
}
