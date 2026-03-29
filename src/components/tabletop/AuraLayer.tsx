/**
 * AuraLayer — renders colored aura circles beneath tokens.
 * Rendered inside the camera Group so auras scale/pan with the map.
 * Must be placed BEFORE TokenLayer in the rendering order so tokens sit on top.
 *
 * Coordinate system (matches Token.tsx exactly):
 *
 *   Token.tsx renders:
 *     <Group x={token.x + offset} y={token.y + offset}
 *            offsetX={offset} offsetY={offset}
 *            scaleX={token.scale} scaleY={token.scale}>
 *       <Circle ... />   ← drawn at (0,0) relative to group
 *
 *   In Konva, `x` positions where the `offsetX` pivot sits in world space.
 *   So the pivot (and visual center) is at world (token.x + offset, token.y + offset).
 *   `scale` acts around the pivot — it does NOT shift the center.
 *
 *   Therefore the visual center of any token = (token.x + offset, token.y + offset)
 *   where offset = tokenOffset(token_size, gridSize, gridType).
 *   This holds for BOTH square and hex grids because tokenOffset handles both.
 *
 *   Aura radius: stored in world units at scale=1. We multiply by token.scale
 *   so the aura visually grows/shrinks with the token image.
 */
import { Circle, Group } from "react-konva";
import { useGameStore } from "../../store/gameStore";
import { tokenOffset, tokenRadius, type GridType } from "../../utils/GridUtils";

export interface Aura {
  radius: number; // world units at token.scale = 1
  color: string;
  label?: string;
}

interface AuraLayerProps {
  gridSize: number;
  gridType: GridType;
}

// Runtime type guard — stats_json is `any` on Token
function getAuras(statsJson: any): Aura[] {
  if (!statsJson) return [];
  const raw = statsJson.auras;
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is Aura =>
      a !== null &&
      typeof a === "object" &&
      typeof a.radius === "number" &&
      a.radius > 0 &&
      typeof a.color === "string",
  );
}

export default function AuraLayer({ gridSize, gridType }: AuraLayerProps) {
  const tokens = useGameStore((s) => s.tokens);

  return (
    <Group listening={false}>
      {tokens.flatMap((token) => {
        const auras = getAuras(token.stats_json);
        if (!auras.length) return [];

        // tokenOffset returns the half-size offset so the token is centered
        // in its grid cell(s). Works identically for square and hex.
        const size = token.token_size ?? 1;
        const offset = tokenOffset(size, gridSize, gridType);
        const cx = (token.x ?? 0) + offset;
        const cy = (token.y ?? 0) + offset;

        // radius of the token itself
        const tokenRadiusPx = tokenRadius(size, gridSize, gridType);

        return auras.map((aura, i) => {
          const color = aura.color || "#60a5fa";

          // radius = distance from token center to edge + desired aura distance
          const radius = tokenRadiusPx + aura.radius;
          console.log("size", size);
          console.log(radius);

          return (
            <Group key={`${token.id}-aura-${i}`} listening={false}>
              {/* Filled disc at low opacity */}
              <Circle
                x={cx}
                y={cy}
                radius={radius}
                fill={color}
                opacity={0.15}
                perfectDrawEnabled={false}
              />
              {/* Dashed stroke ring */}
              <Circle
                x={cx}
                y={cy}
                radius={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={1.5}
                opacity={0.6}
                dash={[6, 4]}
                perfectDrawEnabled={false}
              />
            </Group>
          );
        });
      })}
    </Group>
  );
}
