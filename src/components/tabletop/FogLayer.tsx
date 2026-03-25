import { useEffect, useRef } from "react";
import {
  computeVisibilityPolygon,
  circleClip,
  type Wall,
} from "../../utils/Raycasting";
import { useGameStore } from "../../store/gameStore";

interface FogLayerProps {
  walls: Wall[];
  isGM: boolean;
  fogEnabled: boolean;
  currentUserId: string;
  mapWidth: number;
  mapHeight: number;
  revealedRegions: { cx: number; cy: number; radius: number }[];
}

const DEFAULT_VISION_RADIUS = 840;

export default function FogLayer({
  walls,
  isGM,
  fogEnabled,
  currentUserId,
  mapWidth,
  mapHeight,
  revealedRegions,
}: FogLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokens = useGameStore((s) => s.tokens);
  const zoom = useGameStore((s) => s.zoom);
  const cameraX = useGameStore((s) => s.cameraX);
  const cameraY = useGameStore((s) => s.cameraY);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;
    const W = container.offsetWidth;
    const H = container.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    // Always clear — if fog is off just leave it transparent
    ctx.clearRect(0, 0, W, H);
    if (!fogEnabled) return;

    // ── Draw onto an offscreen canvas in world space ──────────────────────────
    // We use an offscreen canvas so destination-out compositing works correctly.
    // The offscreen canvas is in world coordinates; we blit it to screen after.
    const off = document.createElement("canvas");
    off.width = W;
    off.height = H;
    const offCtx = off.getContext("2d")!;

    // Transform to match Konva world group (same cameraX/Y and zoom)
    offCtx.save();
    offCtx.translate(cameraX, cameraY);
    offCtx.scale(zoom, zoom);

    // Step 1 — fill the entire map area with fog
    offCtx.fillStyle = isGM ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,1)";
    offCtx.fillRect(0, 0, mapWidth, mapHeight);

    // Step 2 — punch holes using destination-out
    offCtx.globalCompositeOperation = "destination-out";

    // GM brush-revealed regions
    for (const region of revealedRegions) {
      offCtx.beginPath();
      offCtx.arc(region.cx, region.cy, region.radius, 0, Math.PI * 2);
      offCtx.fillStyle = "rgba(0,0,0,1)";
      offCtx.fill();
    }

    // Determine which tokens grant vision
    const visibleTokens = isGM
      ? tokens.filter((t: any) => t.player_editable)
      : tokens.filter(
          (t: any) =>
            t.player_editable && (t.owner_id === currentUserId || !t.owner_id),
        );

    for (const token of visibleTokens) {
      const ox = (token as any).x ?? 0;
      const oy = (token as any).y ?? 0;
      const visionRadius =
        (token as any).stats_json?.vision_radius ?? DEFAULT_VISION_RADIUS;

      // Compute visibility polygon (raycasting against walls)
      let visPoints = computeVisibilityPolygon(ox, oy, walls, visionRadius, {
        x: 0,
        y: 0,
        w: mapWidth,
        h: mapHeight,
      });

      // Fall back to a plain circle if no walls / degenerate polygon
      if (visPoints.length < 3) {
        visPoints = circleClip([], ox, oy, visionRadius);
      }
      if (visPoints.length < 3) continue;

      offCtx.save();

      // Clip to the vision circle so we get a hard circular edge
      offCtx.beginPath();
      offCtx.arc(ox, oy, visionRadius, 0, Math.PI * 2);
      offCtx.clip();

      // Fill the visibility polygon to punch through the fog
      offCtx.beginPath();
      offCtx.moveTo(visPoints[0].x, visPoints[0].y);
      for (let i = 1; i < visPoints.length; i++) {
        offCtx.lineTo(visPoints[i].x, visPoints[i].y);
      }
      offCtx.closePath();
      offCtx.fillStyle = "rgba(0,0,0,1)";
      offCtx.fill();

      offCtx.restore();
    }

    offCtx.restore(); // restore world transform

    // ── Blit offscreen fog onto the screen canvas ─────────────────────────────
    // GM gets a semi-transparent overlay so they can still see the map.
    // Players get a nearly-opaque overlay.
    ctx.save();
    ctx.globalAlpha = isGM ? 0.55 : 1.0;
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }, [
    fogEnabled,
    isGM,
    walls,
    tokens,
    currentUserId,
    mapWidth,
    mapHeight,
    revealedRegions,
    zoom,
    cameraX,
    cameraY,
  ]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
      }}
    />
  );
}
