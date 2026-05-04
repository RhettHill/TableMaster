/**
 * useTabletopTouch
 *
 * Translates native touch events on the Konva stage container into the same
 * "virtual mouse" payloads that Tabletop.tsx already handles via Konva's
 * synthetic event system. This keeps Tabletop.tsx logic unchanged while
 * adding full touch support.
 *
 * Gestures supported:
 *   - 1-finger pan  (activeTool === "pan" OR on empty canvas)
 *   - 2-finger pinch-to-zoom
 *   - Tap           → select / context-menu open on long-press
 *   - Long-press    → context menu (right-click equivalent)
 *   - Double-tap    → ping
 */

import { useEffect, useRef, useCallback } from "react";

interface TouchHookOptions {
  /** The DOM element that wraps the Konva Stage (containerRef.current) */
  containerEl: HTMLElement | null;
  /** Current camera state */
  zoom: number;
  cameraX: number;
  cameraY: number;
  /** Setters */
  setZoomAndCamera: (z: number, x: number, y: number) => void;
  panCamera: (x: number, y: number) => void;
  /** Clamps */
  minZoom: number;
  maxZoom: number;
  /** Callbacks forwarded to Tabletop handlers */
  onPing?: (worldX: number, worldY: number) => void;
  /** Whether a measurement or wall tool is active (disables pan-on-empty) */
  toolBlocksPan: boolean;
}

function midpoint(t1: Touch, t2: Touch) {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  };
}

function distance(t1: Touch, t2: Touch) {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
}

const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;
const TAP_SLOP_PX = 10;

export function useTabletopTouch({
  containerEl,
  zoom,
  cameraX,
  cameraY,
  setZoomAndCamera,
  panCamera,
  minZoom,
  maxZoom,
  onPing,
  toolBlocksPan,
}: TouchHookOptions) {
  // Use refs so callbacks always see fresh values without re-registering listeners
  const stateRef = useRef({
    zoom,
    cameraX,
    cameraY,
    toolBlocksPan,
    onPing,
  });
  useEffect(() => {
    stateRef.current = { zoom, cameraX, cameraY, toolBlocksPan, onPing };
  }, [zoom, cameraX, cameraY, toolBlocksPan, onPing]);

  const setZoomAndCameraRef = useRef(setZoomAndCamera);
  const panCameraRef = useRef(panCamera);
  useEffect(() => {
    setZoomAndCameraRef.current = setZoomAndCamera;
  }, [setZoomAndCamera]);
  useEffect(() => {
    panCameraRef.current = panCamera;
  }, [panCamera]);

  // Gesture state (mutable, not React state — no re-renders)
  const gesture = useRef({
    isPanning: false,
    isPinching: false,
    lastX: 0,
    lastY: 0,
    lastDist: 0,
    lastMid: { x: 0, y: 0 },
    // Long-press / double-tap
    longPressTimer: null as ReturnType<typeof setTimeout> | null,
    tapTime: 0,
    tapX: 0,
    tapY: 0,
    touchStartX: 0,
    touchStartY: 0,
  });

  const clearLongPress = useCallback(() => {
    if (gesture.current.longPressTimer) {
      clearTimeout(gesture.current.longPressTimer);
      gesture.current.longPressTimer = null;
    }
  }, []);

  const fireContextMenu = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerEl) return;
      // Synthesize a contextmenu event so Konva's handler fires
      const rect = containerEl.getBoundingClientRect();
      // We fire a real pointerdown + contextmenu sequence that Konva will pick up
      const opts = {
        bubbles: true,
        cancelable: true,
        clientX,
        clientY,
        button: 2,
        buttons: 2,
      };
      containerEl.dispatchEvent(new MouseEvent("contextmenu", opts));
    },
    [containerEl],
  );

  useEffect(() => {
    if (!containerEl) return;

    const onTouchStart = (e: TouchEvent) => {
      const g = gesture.current;
      const { toolBlocksPan } = stateRef.current;

      if (e.touches.length === 1) {
        const t = e.touches[0];
        g.lastX = t.clientX;
        g.lastY = t.clientY;
        g.touchStartX = t.clientX;
        g.touchStartY = t.clientY;
        g.isPanning = true;
        g.isPinching = false;

        // Long-press → context menu
        clearLongPress();
        g.longPressTimer = setTimeout(() => {
          g.isPanning = false;
          fireContextMenu(t.clientX, t.clientY);
        }, LONG_PRESS_MS);
      } else if (e.touches.length === 2) {
        // Starting a pinch
        clearLongPress();
        g.isPanning = false;
        g.isPinching = true;
        g.lastDist = distance(e.touches[0], e.touches[1]);
        g.lastMid = midpoint(e.touches[0], e.touches[1]);
        e.preventDefault(); // prevent browser zoom
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      const g = gesture.current;
      const { zoom, cameraX, cameraY } = stateRef.current;

      if (e.touches.length === 2 && g.isPinching) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const newDist = distance(t1, t2);
        const newMid = midpoint(t1, t2);

        const scaleBy = newDist / g.lastDist;
        let newZoom = zoom * scaleBy;
        newZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));

        // Zoom toward the pinch midpoint
        const worldMidX = (newMid.x - cameraX) / zoom;
        const worldMidY = (newMid.y - cameraY) / zoom;
        const panDX = newMid.x - g.lastMid.x;
        const panDY = newMid.y - g.lastMid.y;

        const newCameraX = newMid.x - worldMidX * newZoom + panDX;
        const newCameraY = newMid.y - worldMidY * newZoom + panDY;

        setZoomAndCameraRef.current(newZoom, newCameraX, newCameraY);

        g.lastDist = newDist;
        g.lastMid = newMid;
        return;
      }

      if (e.touches.length === 1 && g.isPanning) {
        const t = e.touches[0];
        const dx = t.clientX - g.lastX;
        const dy = t.clientY - g.lastY;
        g.lastX = t.clientX;
        g.lastY = t.clientY;

        // Cancel long-press if moved more than slop
        const movedX = Math.abs(t.clientX - g.touchStartX);
        const movedY = Math.abs(t.clientY - g.touchStartY);
        if (movedX > TAP_SLOP_PX || movedY > TAP_SLOP_PX) {
          clearLongPress();
        }

        const { cameraX, cameraY } = stateRef.current;
        panCameraRef.current(cameraX + dx, cameraY + dy);
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      const g = gesture.current;
      clearLongPress();

      if (e.touches.length === 0) {
        g.isPinching = false;

        // Detect tap / double-tap
        if (g.isPanning) {
          g.isPanning = false;
          const changedTouch = e.changedTouches[0];
          const movedX = Math.abs(changedTouch.clientX - g.touchStartX);
          const movedY = Math.abs(changedTouch.clientY - g.touchStartY);

          if (movedX < TAP_SLOP_PX && movedY < TAP_SLOP_PX) {
            const now = Date.now();
            if (
              now - g.tapTime < DOUBLE_TAP_MS &&
              Math.abs(changedTouch.clientX - g.tapX) < TAP_SLOP_PX * 2 &&
              Math.abs(changedTouch.clientY - g.tapY) < TAP_SLOP_PX * 2
            ) {
              // Double-tap → ping
              const { zoom, cameraX, cameraY } = stateRef.current;
              const worldX = (changedTouch.clientX - cameraX) / zoom;
              const worldY = (changedTouch.clientY - cameraY) / zoom;
              stateRef.current.onPing?.(worldX, worldY);
              g.tapTime = 0;
            } else {
              // Single tap — synthesize a click so Konva token selection fires
              const rect = containerEl.getBoundingClientRect();
              const clickOpts = {
                bubbles: true,
                cancelable: true,
                clientX: changedTouch.clientX,
                clientY: changedTouch.clientY,
                button: 0,
                buttons: 1,
              };
              containerEl.dispatchEvent(new MouseEvent("mousedown", clickOpts));
              containerEl.dispatchEvent(new MouseEvent("mouseup", clickOpts));
              containerEl.dispatchEvent(new MouseEvent("click", clickOpts));
              g.tapTime = now;
              g.tapX = changedTouch.clientX;
              g.tapY = changedTouch.clientY;
            }
          }
        }
      } else if (e.touches.length === 1) {
        // One finger lifted during pinch — resume single-finger pan
        g.isPinching = false;
        g.isPanning = true;
        const t = e.touches[0];
        g.lastX = t.clientX;
        g.lastY = t.clientY;
      }
    };

    // Passive: false needed so we can call preventDefault on pinch
    containerEl.addEventListener("touchstart", onTouchStart, {
      passive: false,
    });
    containerEl.addEventListener("touchmove", onTouchMove, { passive: false });
    containerEl.addEventListener("touchend", onTouchEnd, { passive: true });
    containerEl.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      clearLongPress();
      containerEl.removeEventListener("touchstart", onTouchStart);
      containerEl.removeEventListener("touchmove", onTouchMove);
      containerEl.removeEventListener("touchend", onTouchEnd);
      containerEl.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [containerEl, clearLongPress, fireContextMenu, minZoom, maxZoom]);
}
