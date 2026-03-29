import { Line, Circle, Arc, Rect, Text, Group } from "react-konva";
import type { MeasureTool } from "../../types/Types";
import { useMeasurementStore } from "../../store/MeasurementStore";

interface Point {
  x: number;
  y: number;
}

export interface MeasureState {
  tool: MeasureTool;
  start: Point;
  end: Point;
  gridSize: number;
  coneAngle: number; // degrees, e.g. 60
  lineWidth: number; // in grid squares, e.g. 1
}

interface MeasureLayerProps {
  measure: MeasureState;
  zoom: number;
}

function distancePx(a: Point, b: Point) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function toFeet(px: number, gridSize: number, feetPerSquare: number) {
  return Math.round((px / gridSize) * feetPerSquare);
}

function angleDeg(from: Point, to: Point) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Floating label — scales inversely with zoom so it reads the same size
// whether zoomed in or out
function Label({
  x,
  y,
  text,
  zoom,
}: {
  x: number;
  y: number;
  text: string;
  zoom: number;
}) {
  const fontSize = Math.min(22, 13 / zoom);
  const charW = fontSize * 0.62;
  const w = text.length * charW + 14;
  const h = fontSize + 10;
  return (
    <Group>
      <Rect
        x={x}
        y={y - h / 2}
        width={w}
        height={h}
        fill="rgba(0,0,0,0.75)"
        cornerRadius={5}
      />
      <Text
        x={x + 7}
        y={y - fontSize / 2 + 1}
        text={text}
        fontSize={fontSize}
        fontStyle="bold"
        fill="white"
      />
    </Group>
  );
}

const STROKE = "rgba(251,191,36,0.95)";
const FILL = "rgba(251,191,36,0.10)";
const STROKE_W = 2;
const DASH: number[] = [7, 4];

export default function MeasureLayer({ measure, zoom }: MeasureLayerProps) {
  // Read GM-set scale from store — single source of truth for all distance labels
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);

  const { tool, start, end, gridSize, coneAngle, lineWidth } = measure;
  const distPx = distancePx(start, end);

  if (distPx < 6) return <Group />;

  const feet = toFeet(distPx, gridSize, feetPerSquare);
  const angle = angleDeg(start, end);
  const midPt = mid(start, end);

  return (
    <Group>
      {/* ── Ruler ──────────────────────────────────────────────────────── */}
      {tool === "ruler" && (
        <>
          <Line
            points={[start.x, start.y, end.x, end.y]}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            dash={DASH}
          />
          <Circle x={start.x} y={start.y} radius={4} fill={STROKE} />
          <Circle x={end.x} y={end.y} radius={5} fill={STROKE} />
          <Label x={midPt.x + 8} y={midPt.y} text={`${feet} ft`} zoom={zoom} />
        </>
      )}

      {/* ── Circle AoE ─────────────────────────────────────────────────── */}
      {tool === "circle" && (
        <>
          <Circle
            x={start.x}
            y={start.y}
            radius={distPx}
            fill={FILL}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            dash={DASH}
          />
          <Line
            points={[start.x, start.y, end.x, end.y]}
            stroke={STROKE}
            strokeWidth={1}
            dash={[3, 3]}
            opacity={0.5}
          />
          <Circle x={start.x} y={start.y} radius={4} fill={STROKE} />
          <Label
            x={midPt.x + 8}
            y={midPt.y}
            text={`r: ${feet} ft`}
            zoom={zoom}
          />
        </>
      )}

      {/* ── Cone AoE — angle from store, centred on drag direction ─────── */}
      {tool === "cone" && (
        <>
          <Arc
            x={start.x}
            y={start.y}
            innerRadius={0}
            outerRadius={distPx}
            angle={coneAngle}
            rotation={angle - coneAngle / 2}
            fill={FILL}
            stroke={STROKE}
            strokeWidth={STROKE_W}
            dash={DASH}
          />
          <Circle x={start.x} y={start.y} radius={4} fill={STROKE} />
          <Label
            x={end.x + 8}
            y={end.y}
            text={`${feet} ft  ${coneAngle}°`}
            zoom={zoom}
          />
        </>
      )}

      {/* ── Line AoE — rotated rectangle, width from store ──────────────── */}
      {tool === "line" &&
        (() => {
          const halfW = (lineWidth * gridSize) / 2;
          return (
            <>
              <Rect
                x={(start.x + end.x) / 2}
                y={(start.y + end.y) / 2}
                width={distPx}
                height={lineWidth * gridSize}
                offsetX={distPx / 2}
                offsetY={halfW}
                rotation={angle}
                fill={FILL}
                stroke={STROKE}
                strokeWidth={STROKE_W}
                dash={DASH}
              />
              <Circle x={start.x} y={start.y} radius={4} fill={STROKE} />
              <Label
                x={midPt.x + 8}
                y={midPt.y}
                text={`${feet} ft`}
                zoom={zoom}
              />
            </>
          );
        })()}

      {/* ── Square / Cube AoE — centred on origin, drag = half-side ────── */}
      {tool === "square" &&
        (() => {
          // Snap size to nearest whole grid square
          const squares = Math.max(1, Math.round(distPx / gridSize));
          const side = squares * gridSize;
          const ftSide = squares * feetPerSquare;
          return (
            <>
              <Rect
                x={start.x - side}
                y={start.y - side}
                width={side * 2}
                height={side * 2}
                fill={FILL}
                stroke={STROKE}
                strokeWidth={STROKE_W}
                dash={DASH}
              />
              <Circle x={start.x} y={start.y} radius={4} fill={STROKE} />
              <Label
                x={start.x + side + 8}
                y={start.y}
                text={`${ftSide} × ${ftSide} ft`}
                zoom={zoom}
              />
            </>
          );
        })()}
    </Group>
  );
}
