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
  coneAngle: number;
  lineWidth: number;
  gridType?: "square" | "hex";
}

interface MeasureLayerProps {
  measure: MeasureState;
  zoom: number;
}

function distancePx(a: Point, b: Point) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

function toFeet(
  distPx: number,
  gridSize: number,
  gridType: "square" | "hex" = "square",
  feetPerSquare: number,
) {
  const cellDist =
    gridType === "hex" ? (Math.sqrt(3) / 2) * gridSize : gridSize;
  return Math.max(0, Math.round(distPx / cellDist)) * feetPerSquare;
}

function angleDeg(from: Point, to: Point) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

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
  const w = text.length * charW + 16;
  const h = fontSize + 12;
  return (
    <Group>
      <Rect
        x={x}
        y={y - h / 2}
        width={w}
        height={h}
        fill="rgba(0,0,0,0.88)"
        stroke="rgba(251,191,36,0.6)"
        strokeWidth={1}
        cornerRadius={5}
      />
      <Text
        x={x + 8}
        y={y - fontSize / 2 + 1}
        text={text}
        fontSize={fontSize}
        fontStyle="bold"
        fill="rgba(251,191,36,1)"
      />
    </Group>
  );
}

// ── Bolder constants ──────────────────────────────────────────────────────────
const STROKE = "rgba(251,191,36,1)"; // full opacity — was 0.95
const FILL = "rgba(251,191,36,0.22)"; // more visible fill — was 0.10
const STROKE_W = 3; // thicker line — was 2
const DASH: number[] = [8, 4];

export default function MeasureLayer({ measure, zoom }: MeasureLayerProps) {
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  const {
    tool,
    start,
    end,
    gridSize,
    coneAngle,
    lineWidth,
    gridType = "square",
  } = measure;
  const distPx = distancePx(start, end);
  if (distPx < 6) return <Group />;

  const feet = toFeet(distPx, gridSize, gridType, feetPerSquare);
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
          <Circle x={start.x} y={start.y} radius={5} fill={STROKE} />
          <Circle x={end.x} y={end.y} radius={6} fill={STROKE} />
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
            strokeWidth={1.5}
            dash={[4, 4]}
            opacity={0.6}
          />
          <Circle x={start.x} y={start.y} radius={5} fill={STROKE} />
          <Label
            x={midPt.x + 8}
            y={midPt.y}
            text={`r: ${feet} ft`}
            zoom={zoom}
          />
        </>
      )}

      {/* ── Cone AoE ───────────────────────────────────────────────────── */}
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
          <Circle x={start.x} y={start.y} radius={5} fill={STROKE} />
          <Label
            x={end.x + 8}
            y={end.y}
            text={`${feet} ft  ${coneAngle}°`}
            zoom={zoom}
          />
        </>
      )}

      {/* ── Line AoE ───────────────────────────────────────────────────── */}
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
              <Circle x={start.x} y={start.y} radius={5} fill={STROKE} />
              <Label
                x={midPt.x + 8}
                y={midPt.y}
                text={`${feet} ft`}
                zoom={zoom}
              />
            </>
          );
        })()}

      {/* ── Square AoE ─────────────────────────────────────────────────── */}
      {tool === "square" &&
        (() => {
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
              <Circle x={start.x} y={start.y} radius={5} fill={STROKE} />
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
