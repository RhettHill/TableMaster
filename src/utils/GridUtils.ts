export type GridType = "square" | "hex";

interface Point {
  x: number;
  y: number;
}

/**
 * Snap a world-space point to the nearest grid position.
 *
 * @param x          World X coordinate
 * @param y          World Y coordinate
 * @param gridSize   Pixel size of one grid cell
 * @param gridType   "square" or "hex"
 * @param snapMode   "center" (default) snaps to cell centre,
 *                   "corner" snaps to nearest cell corner/vertex
 */
export function snapToGrid(
  x: number,
  y: number,
  gridSize: number,
  gridType: GridType,
  snapMode: "corner" | "center" = "center",
): Point {
  if (gridType === "hex") {
    return snapToHex(x, y, gridSize, snapMode);
  }
  return snapToSquare(x, y, gridSize, snapMode);
}

// ── Square grid ───────────────────────────────────────────────────────────────

function snapToSquare(
  x: number,
  y: number,
  gridSize: number,
  snapMode: "corner" | "center",
): Point {
  if (snapMode === "corner") {
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize,
    };
  }
  // Center: floor to cell origin then offset by half
  return {
    x: Math.floor(x / gridSize) * gridSize + gridSize / 2,
    y: Math.floor(y / gridSize) * gridSize + gridSize / 2,
  };
}

// ── Hex grid (pointy-top offset) ──────────────────────────────────────────────
//
// Matches the pointy-top layout used in GridLayer.tsx:
//   hexW = sqrt(3) * size   where size = gridSize / 2
//   hexH = 2 * size
//   odd rows are offset by hexW / 2

function snapToHex(
  x: number,
  y: number,
  gridSize: number,
  snapMode: "corner" | "center",
): Point {
  const size = gridSize / 2;
  const hexW = Math.sqrt(3) * size;
  const vertSpacing = (2 * size) * 0.75; // 3/4 of full hex height

  // Sample nearby hex centres and pick the closest one
  const roughRow = Math.round(y / vertSpacing);
  let best: Point = { x, y };
  let bestDist = Infinity;

  for (let dr = -1; dr <= 1; dr++) {
    const r = roughRow + dr;
    const offsetX = r % 2 !== 0 ? hexW / 2 : 0;
    const roughCol = Math.round((x - offsetX) / hexW);

    for (let dc = -1; dc <= 1; dc++) {
      const c = roughCol + dc;
      const cx = c * hexW + offsetX;
      const cy = r * vertSpacing;
      const dist = Math.hypot(x - cx, y - cy);
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: cx, y: cy };
      }
    }
  }

  if (snapMode === "center") {
    return best;
  }

  // Corner: find the nearest of the 6 vertices of the winning hex
  let nearestVertex = best;
  let nearestDist = Infinity;
  for (const v of hexVertices(best.x, best.y, size)) {
    const d = Math.hypot(x - v.x, y - v.y);
    if (d < nearestDist) {
      nearestDist = d;
      nearestVertex = v;
    }
  }
  return nearestVertex;
}

/** Returns the 6 vertex Points of a pointy-top hex centred at (cx, cy). */
function hexVertices(cx: number, cy: number, size: number): Point[] {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30);
    return {
      x: cx + size * Math.cos(angle),
      y: cy + size * Math.sin(angle),
    };
  });
}

export function tokenRadius(
  tokenSize: number,
  gridSize: number,
  gridType: GridType,
): number {
  const base =
    gridType === "hex"
      ? (Math.sqrt(3) / 4) * gridSize  // apothem of a pointy-top hex
      : gridSize / 2;
  return base * tokenSize * 0.8;
}
export function tokenOffset(
  tokenSize: number,
  gridSize: number,
  gridType: GridType,
): number {
  if (tokenSize <= 1) return 0;
 
  if (gridType === "hex") {
    const hexW = Math.sqrt(3) * (gridSize / 2);
    return (hexW * (tokenSize - 1)) / 2;
  }
 
  return (gridSize * (tokenSize - 1)) / 2;
}