// src/components/tabletop/MapLayer.tsx
// Handles static images, animated GIFs, and video maps (mp4/webm).
//
// Key architecture decision:
// Video maps are rendered as a plain HTML <video> element positioned
// absolutely behind the Konva stage, transformed via CSS to match the
// camera pan/zoom. This avoids the canvas taint problem entirely —
// drawImage() on a cross-origin video taints the canvas and throws
// SecurityError, even when CORS headers are present, unless the video
// element has crossOrigin="anonymous" AND the server sends ACAO headers.
// Since we can't guarantee both (R2 presigned URLs reject crossOrigin),
// the HTML video approach is the only reliable solution.
//
// GIF maps: rendered via rAF loop copying frames to an offscreen canvas,
// then pushed into a Konva Image node. GIFs are fetched as images (not
// media), so they don't trigger the taint restriction.
//
// Static maps: standard Konva Image via useImage hook.

import { Group, Image } from "react-konva";
import useImage from "use-image";
import { useEffect, useRef } from "react";

export interface MapLayerProps {
  width: number;
  height: number;
  src: string;
  /** True when the asset is a GIF (mime_type="image/gif") */
  animated?: boolean;
  /** True when the asset is a video (mime_type starts with "video/") */
  isVideo?: boolean;
}

function looksLikeVideo(src: string) {
  return /\.(mp4|webm)(\?|$)/i.test(src);
}
function looksLikeGif(src: string) {
  return /\.gif(\?|$)/i.test(src);
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

// ── Animated GIF map ──────────────────────────────────────────────────────────
// GIFs are fetched as images not media, so drawImage() doesn't taint the
// canvas. We copy frames via rAF so Konva can composite fog/tokens on top.
function GifLayer({
  width,
  height,
  src,
}: {
  width: number;
  height: number;
  src: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement("canvas"));
  const rafRef = useRef<number>(0);
  const konvaImageRef = useRef<any>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    cancelAnimationFrame(rafRef.current);

    if (imgRef.current) {
      imgRef.current.onload = null;
      imgRef.current.src = "";
    }

    const img = new window.Image();
    imgRef.current = img;
    // Do NOT set crossOrigin — R2 URLs reject the preflight

    const tick = () => {
      if (img.complete && img.naturalWidth > 0) {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const node = konvaImageRef.current;
        if (node) {
          node.image(canvas);
          const layer = node.getLayer();
          if (layer) layer.batchDraw();
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    img.onload = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    img.src = src;

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (imgRef.current) {
        imgRef.current.onload = null;
        imgRef.current.src = "";
        imgRef.current = null;
      }
    };
  }, [src, width, height]);

  return (
    <Group listening={false}>
      <Image
        ref={konvaImageRef}
        image={canvasRef.current as unknown as HTMLImageElement}
        width={width}
        height={height}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}

// ── Video map — empty Konva placeholder ───────────────────────────────────────
// The actual video is rendered by VideoMapOverlay (a sibling HTML element
// in Tabletop.tsx) positioned behind the Konva Stage. This node just
// keeps the layer stack consistent.
function VideoPlaceholderLayer() {
  return <Group listening={false} />;
}

// ── Public Konva layer component ──────────────────────────────────────────────
export default function MapLayer({
  width,
  height,
  src,
  animated,
  isVideo,
}: MapLayerProps) {
  const video = isVideo ?? looksLikeVideo(src);
  const gif = !video && (animated ?? looksLikeGif(src));

  if (video) return <VideoPlaceholderLayer />;
  if (gif) return <VideoPlaceholderLayer />;
  return <StaticMapLayer width={width} height={height} src={src} />;
}

// ── VideoMapOverlay ───────────────────────────────────────────────────────────
// A plain HTML <video> element rendered OUTSIDE Konva, positioned absolutely
// in the same container as the Stage. CSS transform replicates the camera.
//
// WHY NOT drawImage(video) IN CANVAS:
// Cross-origin video drawn onto a canvas taints it → SecurityError on any
// subsequent read (toDataURL, getImageData). Even with CORS headers, the
// browser requires crossOrigin="anonymous" on the <video>, but R2 presigned
// PUT URLs reject any request that includes an Origin header. The public
// bucket URL (R2_PUBLIC_URL) does support CORS GET, but we'd need to verify
// the bucket policy allows it for every deployment. Using a plain <video>
// element completely sidesteps this: the browser streams the video natively
// without touching the canvas security model.
//
// HOW TO USE IN Tabletop.tsx:
//   1. Import: import MapLayer, { VideoMapOverlay } from "./MapLayer";
//   2. Add before <Stage>:
//        {mapIsVideo && (
//          <VideoMapOverlay
//            src={map}
//            width={mapWidth}
//            height={mapHeight}
//            zoom={zoom}
//            cameraX={cameraX}
//            cameraY={cameraY}
//          />
//        )}
//   3. The container div already has position:absolute so the overlay
//      sits correctly. No other changes needed.
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
        // Autoplay blocked — retry on first user interaction
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
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        // World-space size — CSS transform handles the actual screen placement
        width: `${width}px`,
        height: `${height}px`,
        // Must sit below the Konva canvas (zIndex 1) but above the bg div
        zIndex: 0,
        pointerEvents: "none",
        // Match the Konva camera: translate for pan, scale for zoom
        transform: `translate(${cameraX}px, ${cameraY}px) scale(${zoom})`,
        transformOrigin: "0 0",
        objectFit: "fill",
      }}
    />
  );
}
