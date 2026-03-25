/**
 * Raycasting visibility engine.
 * Given an observer position and a set of wall segments,
 * computes the polygon of visible area using shadow casting.
 *
 * Algorithm:
 * 1. Collect all wall endpoints
 * 2. For each endpoint, cast a ray at angle θ, θ-ε, θ+ε
 * 3. For each ray, find the nearest wall intersection
 * 4. Sort hits by angle, connect to form the visibility polygon
 */

export interface Point {
  x: number;
  y: number;
}

export interface Wall {
  id:   string;
  x1:   number;
  y1:   number;
  x2:   number;
  y2:   number;
  wall_type: string;
}

// ── Geometry helpers ──────────────────────────────────────────────────────────

function cross2d(ax: number, ay: number, bx: number, by: number): number {
  return ax * by - ay * bx;
}

/**
 * Ray–segment intersection.
 * Ray: origin + t * direction (t >= 0)
 * Segment: a + u * (b - a), u in [0, 1]
 * Returns t or null if no intersection.
 */
function raySegmentIntersect(
  ox: number, oy: number, dx: number, dy: number,
  ax: number, ay: number, bx: number, by: number,
): number | null {
  const rx = dx, ry = dy;
  const sx = bx - ax, sy = by - ay;
  const denom = cross2d(rx, ry, sx, sy);
  if (Math.abs(denom) < 1e-10) return null; // parallel

  const tx = ax - ox, ty = ay - oy;
  const t = cross2d(tx, ty, sx, sy) / denom;
  const u = cross2d(tx, ty, rx, ry) / denom;

  if (t >= 0 && u >= 0 && u <= 1) return t;
  return null;
}

/**
 * Find the nearest wall hit along a ray from origin in direction (dx, dy).
 * Returns the hit point and distance.
 */
function castRay(
  ox: number, oy: number, dx: number, dy: number,
  walls: Wall[],
  maxDist: number,
): { t: number; x: number; y: number } {
  let best = maxDist;

  for (const w of walls) {
    if (w.wall_type === "door_open") continue; // open doors don't block

    const t = raySegmentIntersect(ox, oy, dx, dy, w.x1, w.y1, w.x2, w.y2);
    if (t !== null && t < best) best = t;
  }

  return { t: best, x: ox + dx * best, y: oy + dy * best };
}

// ── Main visibility polygon ───────────────────────────────────────────────────

/**
 * Compute the visibility polygon for an observer at (ox, oy).
 * @param ox          Observer x (world coords)
 * @param oy          Observer y
 * @param walls       Wall segments to cast against
 * @param visionRadius Max vision distance in world units
 * @param mapBounds   {x, y, w, h} — bounding rectangle of the map
 * @returns           Array of {x,y} points forming the visibility polygon
 */
export function computeVisibilityPolygon(
  ox: number,
  oy: number,
  walls: Wall[],
  visionRadius: number,
  mapBounds: { x: number; y: number; w: number; h: number },
): Point[] {
  const EPSILON = 0.0001;
  const angles: number[] = [];

  // Add angles to all wall endpoints
  for (const w of walls) {
    if (w.wall_type === "door_open") continue;
    for (const [wx, wy] of [[w.x1, w.y1], [w.x2, w.y2]]) {
      const a = Math.atan2(wy - oy, wx - ox);
      angles.push(a - EPSILON, a, a + EPSILON);
    }
  }

  // Add bounding box corners so the polygon always covers the full visible area
  const { x: bx, y: by, w: bw, h: bh } = mapBounds;
  for (const [cx, cy] of [
    [bx, by], [bx + bw, by], [bx + bw, by + bh], [bx, by + bh],
  ]) {
    const a = Math.atan2(cy - oy, cx - ox);
    angles.push(a - EPSILON, a, a + EPSILON);
  }

  // Add cardinal angles to ensure full coverage even with no walls nearby
  for (let i = 0; i < 32; i++) {
    angles.push((i / 32) * Math.PI * 2 - Math.PI);
  }

  // Sort angles
  angles.sort((a, b) => a - b);

  // Cast ray for each angle
  const hits: { angle: number; x: number; y: number }[] = [];

  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    const hit = castRay(ox, oy, dx, dy, walls, visionRadius);
    hits.push({ angle, x: hit.x, y: hit.y });
  }

  // Remove nearly-duplicate angles
  const deduped = hits.filter((h, i) => {
    if (i === 0) return true;
    return Math.abs(h.angle - hits[i - 1].angle) > EPSILON / 2;
  });

  return deduped.map(h => ({ x: h.x, y: h.y }));
}

/**
 * Clip a point to stay within visionRadius of the observer.
 * Useful for rendering a hard circular edge even without walls.
 */
export function circleClip(
  points: Point[],
  ox: number,
  oy: number,
  radius: number,
  numSegments = 64,
): Point[] {
  // If no walls at all, just return a circle
  if (points.length === 0) {
    return Array.from({ length: numSegments }, (_, i) => {
      const a = (i / numSegments) * Math.PI * 2;
      return { x: ox + Math.cos(a) * radius, y: oy + Math.sin(a) * radius };
    });
  }
  return points;
}