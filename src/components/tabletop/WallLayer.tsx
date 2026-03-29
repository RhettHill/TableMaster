/**
 * WallLayer — renders wall segments and handles door toggling.
 *
 * Door interaction rules:
 * - Anyone (GM or player) can click a door to open/close it regardless of
 *   which tool is active. Doors are interactive objects, not just GM tools.
 * - Wall removal (shift+click) is handled upstream in Tabletop's Stage handler.
 * - The hit area is intentionally wider than the visible line for easier clicking.
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
  isDrawing: boolean;
  // Callbacks
  onToggleDoor: (id: string) => void;
  onRemoveWall: (id: string) => void;
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
}: WallLayerProps) {
  const strokeWidth = Math.max(1.5, 2.5 / zoom);
  const hitWidth = Math.max(10, 14 / zoom); // generous hit area
  const dotRadius = Math.max(3, 4 / zoom);

  return (
    <Layer>
      <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
        {/* ── Existing walls ─────────────────────────────────────────────────── */}
        {walls.map((w) => {
          const isDoor =
            w.wall_type === "door_closed" || w.wall_type === "door_open";
          const color = WALL_COLORS[w.wall_type] ?? "#ef4444";

          return (
            <Group key={w.id}>
              {/* Wide invisible hit area for easier clicking */}
              <Line
                points={[w.x1, w.y1, w.x2, w.y2]}
                stroke="transparent"
                strokeWidth={hitWidth}
                onClick={() => {
                  // Erase tool always deletes — takes priority over door toggle
                  if (isGM && activeTool === "erase") {
                    onRemoveWall(w.id);
                    return;
                  }
                  // Doors: anyone can toggle open/closed with non-erase tools
                  if (isDoor) {
                    onToggleDoor(w.id);
                  }
                }}
                // Cursor hint: pointer for doors so players know they're clickable
                onMouseEnter={(e) => {
                  if (!isDoor) return;
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = "pointer";
                }}
                onMouseLeave={(e) => {
                  if (!isDoor) return;
                  const stage = e.target.getStage();
                  if (stage) stage.container().style.cursor = "";
                }}
              />

              {/* Visible coloured line — GMs always see walls; players see only doors */}
              <Line
                points={[w.x1, w.y1, w.x2, w.y2]}
                stroke={color}
                strokeWidth={strokeWidth}
                lineCap="round"
                opacity={isGM ? 0.85 : isDoor ? 0.7 : 0}
                listening={false}
              />

              {/* Door midpoint indicator dot */}
              {isDoor && (
                <Circle
                  x={(w.x1 + w.x2) / 2}
                  y={(w.y1 + w.y2) / 2}
                  radius={dotRadius * 1.8}
                  fill={color}
                  opacity={0.9}
                  listening={false}
                />
              )}
            </Group>
          );
        })}

        {/* ── Preview segment while drawing (GM only) ─────────────────────────── */}
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

        {/* ── Start-point anchor dot ──────────────────────────────────────────── */}
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
