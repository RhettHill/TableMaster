/**
 * WallLayer — renders wall segments only.
 * All mouse interaction is handled by Tabletop's Stage handlers
 * and passed in via props so the Stage-level events fire correctly.
 */

import { Layer, Line, Circle, Group } from "react-konva";
import type { Wall } from "../../utils/Raycasting";

const WALL_COLORS: Record<string, string> = {
  wall: "#ef4444", // red
  door_closed: "#f59e0b", // amber
  door_open: "#22c55e", // green
  window: "#60a5fa", // blue
};

interface WallLayerProps {
  walls: Wall[];
  isGM: boolean;
  zoom: number;
  cameraX: number;
  cameraY: number;
  // Drawing preview (controlled by Tabletop)
  drawStart: { x: number; y: number } | null;
  mousePos: { x: number; y: number } | null;
  activeTool: string;
  // Interaction callbacks
  onToggleDoor: (id: string) => void;
  onRemoveWall: (id: string) => void;
  isDrawing: boolean;
}

export default function WallLayer({
  walls,
  isGM,
  zoom,
  cameraX,
  cameraY,
  drawStart,
  mousePos,
  activeTool,
  onToggleDoor,
  onRemoveWall,
  isDrawing,
}: WallLayerProps) {
  const strokeWidth = Math.max(1.5, 2.5 / zoom);
  const hitWidth = Math.max(8, 10 / zoom);
  const dotRadius = Math.max(3, 4 / zoom);

  return (
    <Layer>
      <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
        {/* ── Existing walls ── */}
        {walls.map((w) => (
          <Group key={w.id}>
            {/* Wide invisible hit area */}
            <Line
              points={[w.x1, w.y1, w.x2, w.y2]}
              stroke="transparent"
              strokeWidth={hitWidth}
              onClick={() => {
                if (!isGM) return;
                if (
                  w.wall_type === "door_closed" ||
                  w.wall_type === "door_open"
                ) {
                  onToggleDoor(w.id);
                } else if (!isDrawing) {
                  onRemoveWall(w.id);
                }
              }}
            />
            {/* Visible coloured line */}
            <Line
              points={[w.x1, w.y1, w.x2, w.y2]}
              stroke={WALL_COLORS[w.wall_type] ?? "#ef4444"}
              strokeWidth={strokeWidth}
              lineCap="round"
              opacity={isGM ? 0.85 : 0}
              listening={false}
            />
            {/* Door midpoint dot */}
            {(w.wall_type === "door_closed" || w.wall_type === "door_open") &&
              isGM && (
                <Circle
                  x={(w.x1 + w.x2) / 2}
                  y={(w.y1 + w.y2) / 2}
                  radius={dotRadius * 1.5}
                  fill={WALL_COLORS[w.wall_type]}
                  opacity={0.9}
                  listening={false}
                />
              )}
          </Group>
        ))}

        {/* ── Preview segment while drawing ── */}
        {isGM && drawStart && mousePos && (
          <Line
            points={[drawStart.x, drawStart.y, mousePos.x, mousePos.y]}
            stroke={
              activeTool === "door" ? WALL_COLORS.door_closed : WALL_COLORS.wall
            }
            strokeWidth={strokeWidth}
            dash={[6 / zoom, 4 / zoom]}
            lineCap="round"
            opacity={0.7}
            listening={false}
          />
        )}

        {/* ── Start point dot ── */}
        {isGM && drawStart && (
          <Circle
            x={drawStart.x}
            y={drawStart.y}
            radius={dotRadius}
            fill={
              activeTool === "door" ? WALL_COLORS.door_closed : WALL_COLORS.wall
            }
            opacity={0.9}
            listening={false}
          />
        )}
      </Group>
    </Layer>
  );
}
