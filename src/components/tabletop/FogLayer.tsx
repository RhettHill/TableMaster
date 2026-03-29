import { useEffect, useRef, useCallback } from "react";
import {
  computeVisibilityPolygon,
  circleClip,
  type Wall,
} from "../../utils/Raycasting";
import { useGameStore } from "../../store/gameStore";
import { useMeasurementStore } from "../../store/MeasurementStore";
import type { FogRegion, VisibilityMode } from "../../hooks/useFog";

interface FogLayerProps {
  walls: Wall[];
  isGM: boolean;
  currentUserId: string;
  mapWidth: number;
  mapHeight: number;
  visibilityMode: VisibilityMode;
  revealedRegions: FogRegion[];
  brushPos?: { x: number; y: number } | null;
  brushRadius?: number;
  isFogTool?: boolean;
  zoom: number;
  cameraX: number;
  cameraY: number;
}

// Convert feet to world units using current scene's gridSize and feetPerSquare scale
function feetToWorld(
  feet: number,
  gridSize: number,
  feetPerSquare: number,
): number {
  return (feet / feetPerSquare) * gridSize;
}

export default function FogLayer({
  walls,
  isGM,
  currentUserId,
  mapWidth,
  mapHeight,
  visibilityMode,
  revealedRegions,
  brushPos,
  brushRadius = 120,
  isFogTool = false,
  zoom,
  cameraX,
  cameraY,
}: FogLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tokens = useGameStore((s) => s.tokens);
  const gridSize = useGameStore((s) => s.sceneSettings.gridSize);
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  // Default vision: 60ft in world units. Scales correctly with any gridSize/scale.
  const defaultVisionRadius = feetToWorld(60, gridSize, feetPerSquare);

  const drawFog = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;
    const W = container.offsetWidth;
    const H = container.offsetHeight;

    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    ctx.clearRect(0, 0, W, H);

    // ── Fog rendering — active whenever mode is not "none" ────────────────────
    if (visibilityMode !== "none") {
      const off = document.createElement("canvas");
      off.width = W;
      off.height = H;
      const offCtx = off.getContext("2d")!;

      offCtx.save();
      offCtx.translate(cameraX, cameraY);
      offCtx.scale(zoom, zoom);

      // Fill map with solid fog
      offCtx.fillStyle = "rgba(0,0,0,1)";
      offCtx.fillRect(0, 0, mapWidth, mapHeight);

      // ── Punch holes: GM-painted revealed regions ───────────────────────────
      // Applied in both "fog" and "lighting" modes so GM pre-reveals stack
      if (revealedRegions.length > 0) {
        offCtx.globalCompositeOperation = "destination-out";
        for (const region of revealedRegions) {
          const gradient = offCtx.createRadialGradient(
            region.cx,
            region.cy,
            region.radius * 0.4,
            region.cx,
            region.cy,
            region.radius,
          );
          gradient.addColorStop(0, "rgba(0,0,0,1)");
          gradient.addColorStop(1, "rgba(0,0,0,0)");
          offCtx.beginPath();
          offCtx.arc(region.cx, region.cy, region.radius, 0, Math.PI * 2);
          offCtx.fillStyle = gradient;
          offCtx.fill();
        }
      }

      // ── Punch holes: token vision (lighting mode only) ────────────────────
      if (visibilityMode === "lighting") {
        offCtx.globalCompositeOperation = "destination-out";

        const visibleTokens = isGM
          ? tokens.filter((t) => t.player_editable)
          : tokens.filter(
              (t) =>
                t.player_editable &&
                (t.owner_id === currentUserId || !t.owner_id),
            );

        for (const token of visibleTokens) {
          const ox = token.x ?? 0;
          const oy = token.y ?? 0;
          // vision_radius is stored in world units (px).
          // If not set, default to 60ft expressed in world units.
          // darkvision is stored in feet and converted using current scale.
          const manualRadius =
            token.stats_json?.vision_radius != null
              ? token.stats_json.vision_radius
              : defaultVisionRadius;
          const darkvisionFt = token.stats_json?.darkvision ?? 0;
          const darkvisionWorld =
            darkvisionFt > 0
              ? feetToWorld(darkvisionFt, gridSize, feetPerSquare)
              : 0;
          const visionRadius = Math.max(manualRadius, darkvisionWorld);

          let visPoints = computeVisibilityPolygon(
            ox,
            oy,
            walls,
            visionRadius,
            {
              x: 0,
              y: 0,
              w: mapWidth,
              h: mapHeight,
            },
          );

          if (visPoints.length < 3)
            visPoints = circleClip([], ox, oy, visionRadius);
          if (visPoints.length < 3) continue;

          offCtx.save();
          offCtx.beginPath();
          offCtx.arc(ox, oy, visionRadius, 0, Math.PI * 2);
          offCtx.clip();

          const vGradient = offCtx.createRadialGradient(
            ox,
            oy,
            visionRadius * 0.75,
            ox,
            oy,
            visionRadius,
          );
          vGradient.addColorStop(0, "rgba(0,0,0,1)");
          vGradient.addColorStop(1, "rgba(0,0,0,0)");

          offCtx.beginPath();
          offCtx.moveTo(visPoints[0].x, visPoints[0].y);
          for (let i = 1; i < visPoints.length; i++)
            offCtx.lineTo(visPoints[i].x, visPoints[i].y);
          offCtx.closePath();
          offCtx.fillStyle = vGradient;
          offCtx.fill();
          offCtx.restore();
        }
      }

      offCtx.restore();

      // GMs see fog at reduced opacity so the map is still visible underneath
      ctx.save();
      ctx.globalAlpha = isGM ? 0.45 : 1.0;
      ctx.drawImage(off, 0, 0);
      ctx.restore();
    }

    // ── GM brush cursor preview ────────────────────────────────────────────────
    if (isGM && isFogTool && brushPos) {
      const sx = brushPos.x * zoom + cameraX;
      const sy = brushPos.y * zoom + cameraY;
      const sr = brushRadius * zoom;

      ctx.save();
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fill();
      ctx.restore();
    }
  }, [
    revealedRegions,
    tokens,
    walls,
    zoom,
    cameraX,
    cameraY,
    visibilityMode,
    isGM,
    currentUserId,
    mapWidth,
    mapHeight,
    brushPos,
    brushRadius,
    isFogTool,
    gridSize,
    feetPerSquare,
    defaultVisionRadius,
  ]);

  useEffect(() => {
    drawFog();
  }, [drawFog]);

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
