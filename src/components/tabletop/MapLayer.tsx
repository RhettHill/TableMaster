// src/components/tabletop/MapLayer.tsx
// Static images → Konva Image (useImage hook, no taint risk)
// GIF maps      → exported GifMapOverlay (HTML <img>, browser animates natively)
// Video maps    → exported VideoMapOverlay (HTML <video>)
//
// Both animated types are rendered as absolutely-positioned HTML elements
// BEHIND the Konva Stage. The Stage gets background:transparent so they
// show through. This completely avoids the cross-origin canvas taint issue.

import { Group, Image } from "react-konva";
import useImage from "use-image";
import { useEffect, useRef } from "react";

export interface MapLayerProps {
  width: number;
  height: number;
  src: string;
  animated?: boolean; // true = GIF
  isVideo?: boolean; // true = mp4/webm
}

// ── Static map ────────────────────────────────────────────────────────────────
function StaticMapLayer({
  width,
  height,
  src,
}: {
  width: number;
  height: number;
  src: string;
}) {
  const [map, status] = useImage(src, "anonymous");
  return (
    <Group listening={false}>
      {status === "loaded" && map && (
        <Image
          image={map}
          width={width}
          height={height}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
}

// ── Konva layer: empty placeholder for animated maps ─────────────────────────
// The actual rendering is handled by GifMapOverlay / VideoMapOverlay below.
function AnimatedPlaceholder() {
  return <Group listening={false} />;
}

// ── Public Konva component ────────────────────────────────────────────────────
export default function MapLayer({
  width,
  height,
  src,
  animated,
  isVideo,
}: MapLayerProps) {
  if (isVideo || animated) return <AnimatedPlaceholder />;
  return <StaticMapLayer width={width} height={height} src={src} />;
}

// ── Shared CSS transform for overlays ─────────────────────────────────────────
function overlayStyle(
  width: number,
  height: number,
  zoom: number,
  cameraX: number,
  cameraY: number,
): React.CSSProperties {
  return {
    position: "absolute",
    top: 0,
    left: 0,
    minWidth: `${width}px`,
    height: `${height}px`,
    zIndex: 0,
    pointerEvents: "none",
    transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
    transformOrigin: "0 0",
    objectFit: "fill",
  };
}

// ── GIF overlay ───────────────────────────────────────────────────────────────
// Browsers animate GIFs natively inside <img> — no canvas needed.
export function GifMapOverlay({
  src,
  width,
  height,
  zoom,
  cameraX,
  cameraY,
}: {
  src: string;
  width: number;
  height: number;
  zoom: number;
  cameraX: number;
  cameraY: number;
}) {
  return (
    <img
      src={src}
      alt=""
      style={overlayStyle(width, height, zoom, cameraX, cameraY)}
    />
  );
}

// ── Video overlay ─────────────────────────────────────────────────────────────
export function VideoMapOverlay({
  src,
  width,
  height,
  zoom,
  cameraX,
  cameraY,
}: {
  src: string;
  width: number;
  height: number;
  zoom: number;
  cameraX: number;
  cameraY: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = src;
    video.load();
    const tryPlay = () =>
      video.play().catch(() => {
        const resume = () => video.play().catch(() => {});
        document.addEventListener("click", resume, { once: true });
        document.addEventListener("keydown", resume, { once: true });
      });
    video.addEventListener("canplay", tryPlay, { once: true });
    return () => {
      video.removeEventListener("canplay", tryPlay);
      video.pause();
      video.src = "";
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      loop
      muted
      playsInline
      style={overlayStyle(width, height, zoom, cameraX, cameraY)}
    />
  );
}
