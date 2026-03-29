/**
 * PingLayer — animated ping indicators rendered in world space.
 * Lives inside the camera Group so coordinates are world units.
 * The parent Group applies zoom/pan — PingMarker just uses world coords.
 */
import { useEffect, useRef, useState } from "react";
import { Circle, Group, Text } from "react-konva";
import Konva from "konva";
import { useGameStore } from "../../store/gameStore";

export interface Ping {
  id: string;
  x: number; // world x (px at zoom=1)
  y: number; // world y (px at zoom=1)
  color: string;
  label: string; // sender display name
  timestamp: number;
}

interface PingLayerProps {
  pings: Ping[];
}

const PING_DURATION_MS = 2200;
// Ring expands to this radius in world units.
// At gridSize=70 this is ~1 square; scales visually with zoom.
const RING_MAX_RADIUS = 50;

function PingMarker({ ping }: { ping: Ping }) {
  const ringRef = useRef<Konva.Circle>(null);
  const dotRef = useRef<Konva.Circle>(null);
  const [alive, setAlive] = useState(true);
  // Read zoom to scale text so it stays a consistent screen size
  const zoom = useGameStore((s) => s.zoom);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    // Expand ring and fade
    ring.to({
      radius: RING_MAX_RADIUS,
      opacity: 0,
      duration: PING_DURATION_MS / 1000,
      easing: Konva.Easings.EaseOut,
    });

    // Dot fades after brief pause
    dot.to({
      opacity: 0,
      duration: PING_DURATION_MS / 1000,
      easing: Konva.Easings.EaseOut,
    });

    const timer = setTimeout(() => setAlive(false), PING_DURATION_MS);
    return () => clearTimeout(timer);
  }, []); // run once on mount

  if (!alive) return null;

  // Text is in world space but we want it to appear ~12px on screen.
  // world_size = screen_size / zoom
  const labelSize = Math.max(8, 12 / zoom);
  const labelOffset = Math.max(16, 20 / zoom);

  return (
    <Group x={ping.x} y={ping.y} listening={false}>
      {/* Expanding ring */}
      <Circle
        ref={ringRef}
        radius={8}
        fill="transparent"
        stroke={ping.color}
        strokeWidth={Math.max(1, 2 / zoom)}
        opacity={0.9}
      />
      {/* Center dot */}
      <Circle
        ref={dotRef}
        radius={Math.max(3, 5 / zoom)}
        fill={ping.color}
        opacity={0.95}
      />
      {/* Sender label above the ping — stays readable at any zoom */}
      <Text
        text={ping.label}
        fontSize={labelSize}
        fill={ping.color}
        offsetX={ping.label.length * labelSize * 0.3} // approximate center
        offsetY={labelOffset}
        opacity={0.95}
        listening={false}
      />
    </Group>
  );
}

export default function PingLayer({ pings }: PingLayerProps) {
  return (
    <Group listening={false}>
      {pings.map((ping) => (
        <PingMarker key={`${ping.id}-${ping.timestamp}`} ping={ping} />
      ))}
    </Group>
  );
}
