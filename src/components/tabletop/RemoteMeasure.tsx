import { Group, Line, Circle, Arc, Rect, Text } from "react-konva";
import type { RemoteMeasure } from "../../hooks/useRealTimeGame";
import { useMeasurementStore } from "../../store/MeasurementStore";

interface Props {
  measures: RemoteMeasure[];
  zoom: number;
}
interface Point {
  x: number;
  y: number;
}

function distancePx(a: Point, b: Point) {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}
function angleDeg(from: Point, to: Point) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}
function mid(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
function toFeet(px: number, gridSize: number, feetPerSquare: number) {
  return Math.max(0, Math.round(px / gridSize)) * feetPerSquare;
}

function MeasureLabel({
  x,
  y,
  text,
  color,
  zoom,
}: {
  x: number;
  y: number;
  text: string;
  color: string;
  zoom: number;
}) {
  const fontSize = Math.min(20, 12 / zoom);
  const w = text.length * fontSize * 0.62 + 16;
  const h = fontSize + 12;
  return (
    <Group>
      <Rect
        x={x - w / 2}
        y={y - h / 2}
        width={w}
        height={h}
        fill="rgba(0,0,0,0.88)"
        stroke={color}
        strokeWidth={1.5}
        cornerRadius={4}
      />
      <Text
        x={x - w / 2 + 8}
        y={y - fontSize / 2 + 1}
        text={text}
        fontSize={fontSize}
        fontStyle="bold"
        fill={color}
      />
    </Group>
  );
}

// Make fill by stripping alpha and adding a fixed low opacity
function fillColor(color: string) {
  // color is like "rgba(99,179,237,0.85)" → use 0.22 opacity fill
  return color.replace(/[\d.]+\)$/, "0.22)");
}

function RemoteMeasureShape({
  m,
  zoom,
  feetPerSquare,
}: {
  m: RemoteMeasure;
  zoom: number;
  feetPerSquare: number;
}) {
  const {
    tool,
    start,
    end,
    gridSize,
    coneAngle,
    lineWidth,
    color,
    displayName,
  } = m;
  const distPx = distancePx(start, end);
  if (distPx < 6) return null;

  const feet = toFeet(distPx, gridSize, feetPerSquare);
  const angle = angleDeg(start, end);
  const midPt = mid(start, end);
  const label = `${displayName}: ${feet} ft`;
  const SW = 3; // match local measure stroke width
  const DASH = [8, 4];
  const FILL = fillColor(color);

  return (
    <Group listening={false}>
      {tool === "ruler" && (
        <>
          <Line
            points={[start.x, start.y, end.x, end.y]}
            stroke={color}
            strokeWidth={SW}
            dash={DASH}
          />
          <Circle x={start.x} y={start.y} radius={5} fill={color} />
          <Circle x={end.x} y={end.y} radius={6} fill={color} />
          <MeasureLabel
            x={midPt.x}
            y={midPt.y - 18}
            text={label}
            color={color}
            zoom={zoom}
          />
        </>
      )}
      {tool === "circle" && (
        <>
          <Circle
            x={start.x}
            y={start.y}
            radius={distPx}
            fill={FILL}
            stroke={color}
            strokeWidth={SW}
            dash={DASH}
          />
          <Circle x={start.x} y={start.y} radius={5} fill={color} />
          <MeasureLabel
            x={midPt.x}
            y={midPt.y - 18}
            text={`${displayName}: r ${feet} ft`}
            color={color}
            zoom={zoom}
          />
        </>
      )}
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
            stroke={color}
            strokeWidth={SW}
            dash={DASH}
          />
          <Circle x={start.x} y={start.y} radius={5} fill={color} />
          <MeasureLabel
            x={end.x}
            y={end.y - 18}
            text={`${displayName}: ${feet} ft ${coneAngle}°`}
            color={color}
            zoom={zoom}
          />
        </>
      )}
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
                stroke={color}
                strokeWidth={SW}
                dash={DASH}
              />
              <Circle x={start.x} y={start.y} radius={5} fill={color} />
              <MeasureLabel
                x={midPt.x}
                y={midPt.y - 18}
                text={label}
                color={color}
                zoom={zoom}
              />
            </>
          );
        })()}
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
                stroke={color}
                strokeWidth={SW}
                dash={DASH}
              />
              <Circle x={start.x} y={start.y} radius={5} fill={color} />
              <MeasureLabel
                x={start.x + side}
                y={start.y}
                text={`${displayName}: ${ftSide}×${ftSide} ft`}
                color={color}
                zoom={zoom}
              />
            </>
          );
        })()}
    </Group>
  );
}

export default function RemoteMeasures({ measures, zoom }: Props) {
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  if (measures.length === 0) return null;
  return (
    <Group listening={false}>
      {measures.map((m) => (
        <RemoteMeasureShape
          key={m.userId}
          m={m}
          zoom={zoom}
          feetPerSquare={feetPerSquare}
        />
      ))}
    </Group>
  );
}
