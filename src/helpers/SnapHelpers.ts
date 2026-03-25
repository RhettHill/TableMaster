import { Point } from "../store/MeasurementStore"

/**
 * Snap a raw world-space point to the nearest grid corner.
 * Corners are at multiples of gridSize: (0,0), (70,0), (140,0) …
 */
export function snapToCorner(pt: Point, gridSize: number): Point {
  return {
    x: Math.round(pt.x / gridSize) * gridSize,
    y: Math.round(pt.y / gridSize) * gridSize,
  }
}

/**
 * Snap a raw world-space point to the nearest grid cell centre.
 * Centres are at gridSize/2 offsets: (35,35), (105,35) …
 */
export function snapToCenter(pt: Point, gridSize: number): Point {
  return {
    x: Math.floor(pt.x / gridSize) * gridSize + gridSize / 2,
    y: Math.floor(pt.y / gridSize) * gridSize + gridSize / 2,
  }
}

/**
 * Apply whichever snap mode is active.
 */
export function snapPoint(
  pt: Point,
  gridSize: number,
  mode: "corner" | "center"
): Point {
  return mode === "corner"
    ? snapToCorner(pt, gridSize)
    : snapToCenter(pt, gridSize)
}

/**
 * Convert a raw Konva stage pointer into world-space coordinates,
 * accounting for camera pan and zoom.
 */
export function stageToWorld(
  stageX: number,
  stageY: number,
  cameraX: number,
  cameraY: number,
  zoom: number
): Point {
  return {
    x: (stageX - cameraX) / zoom,
    y: (stageY - cameraY) / zoom,
  }
}

/**
 * Euclidean distance between two world-space points, in pixels.
 */
export function worldDistance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2)
}

/**
 * Convert pixel distance to feet using the GM-set scale.
 */
export function pixelsToFeet(
  pixels: number,
  gridSize: number,
  feetPerSquare: number
): number {
  return (pixels / gridSize) * feetPerSquare
}

/**
 * Angle in radians from point a → b.
 */
export function angleBetween(a: Point, b: Point): number {
  return Math.atan2(b.y - a.y, b.x - a.x)
}