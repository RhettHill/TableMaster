import { Stage, Layer, Group } from "react-konva";
import { useEffect, useRef, useState, useCallback } from "react";
import MapLayer from "./MapLayer";
import GridLayer from "./GridLayer";
import TokenLayer from "./TokenLayer";
import MeasureLayer, { MeasureState } from "./MeasureLayer";
import RemoteMeasures from "./RemoteMeasure";
import TokenContextMenu from "../tokens/TokenMenu";
import DiceRoller from "./DiceRoller";
import { useGameStore } from "../../store/gameStore";
import { useMeasurementStore } from "../../store/MeasurementStore";
import type { ActiveTool, MeasureTool } from "../../types/Types";
import { isMeasureTool } from "../../types/Types";
import { snapToGrid as snapPt } from "../../utils/GridUtils";
import type { Token } from "../../types/Types";
import type { RemoteMeasure } from "../../hooks/useRealTimeGame";
import WallLayer from "./WallLayer";
import FogLayer from "./FogLayer";
import type { Wall } from "../../utils/Raycasting";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

interface Point {
  x: number;
  y: number;
}
interface ContextMenuState {
  token: Token;
  screenX: number;
  screenY: number;
}

interface TabletopProps {
  activeTool: ActiveTool;
  isGM: boolean;
  diceOpen: boolean;
  onDiceClose: () => void;
  onMoveToken: (id: string, x: number, y: number) => void;
  onRenameToken: (id: string, name: string) => void;
  onToggleVisibility: (id: string, visible: boolean) => void;
  onTogglePlayerEditable: (id: string, editable: boolean) => void;
  onEditStats: (
    id: string,
    stats: {
      hp: number;
      maxHp: number;
      ac: number;
      showStats: boolean;
      vision_radius: number;
    },
  ) => void;
  onSetTokenSize: (id: string, size: number) => void;
  onDeleteTokens: (ids: string[]) => void;
  onOpenSheet: (tokenId: string) => void;
  onOpenStatBlock: (tokenId: string) => void;
  onAssignStatBlock: (tokenId: string) => void;
  onMeasureChange?: (measure: MeasureState) => void;
  onMeasureClear?: () => void;
  remoteMeasures?: RemoteMeasure[];
  walls?: Wall[];
  fogEnabled?: boolean;
  revealedRegions?: { cx: number; cy: number; radius: number }[];
  currentUserId: string;
  onAddWall?: (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: string,
  ) => void;
  onRemoveWall?: (id: string) => void;
  onToggleDoor?: (id: string) => void;
  onAddRevealedRegion?: (cx: number, cy: number, radius: number) => void;
}

// Snap a world point to grid
function snapWorld(x: number, y: number, gridSize: number, snap: boolean) {
  if (!snap) return { x, y };
  return {
    x: Math.round(x / gridSize) * gridSize,
    y: Math.round(y / gridSize) * gridSize,
  };
}

export default function Tabletop({
  activeTool,
  isGM,
  diceOpen,
  onDiceClose,
  onMoveToken,
  onRenameToken,
  onToggleVisibility,
  onTogglePlayerEditable,
  onEditStats,
  onSetTokenSize,
  onDeleteTokens,
  onOpenSheet,
  onOpenStatBlock,
  onAssignStatBlock,
  onMeasureChange,
  onMeasureClear,
  remoteMeasures = [],
  walls = [],
  fogEnabled = false,
  revealedRegions = [],
  currentUserId,
  onAddWall,
  onRemoveWall,
  onToggleDoor,
  onAddRevealedRegion,
}: TabletopProps) {
  const zoom = useGameStore((s) => s.zoom);
  const cameraX = useGameStore((s) => s.cameraX);
  const cameraY = useGameStore((s) => s.cameraY);
  const map = useGameStore((s) => s.map);
  const setZoomAndCamera = useGameStore((s) => s.setZoomAndCamera);
  const panCamera = useGameStore((s) => s.panCamera);
  const {
    gridSize,
    gridType,
    snapToGrid: snapEnabled,
    bgColor,
    mapWidth,
    mapHeight,
  } = useGameStore((s) => s.sceneSettings);

  const snapMode = useMeasurementStore((s) => s.snapMode);
  const coneAngle = useMeasurementStore((s) => s.coneAngle);
  const lineWidth = useMeasurementStore((s) => s.lineWidth);

  // ── Viewport ─────────────────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setSize({ width: el.offsetWidth, height: el.offsetHeight }),
    );
    observer.observe(el);
    setSize({ width: el.offsetWidth, height: el.offsetHeight });
    return () => observer.disconnect();
  }, []);

  // ── Context menu ──────────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Measurement ───────────────────────────────────────────────────────────────
  const [measure, setMeasure] = useState<MeasureState | null>(null);
  const isMeasuring = useRef(false);

  // ── Wall drawing state ────────────────────────────────────────────────────────
  const [wallDrawStart, setWallDrawStart] = useState<Point | null>(null);
  const [wallMousePos, setWallMousePos] = useState<Point | null>(null);
  const wallDrawStartRef = useRef<Point | null>(null); // stable ref for handlers

  const isWallTool = activeTool === "wall" || activeTool === "door";

  // Reset wall drawing when tool changes away
  useEffect(() => {
    if (!isWallTool) {
      setWallDrawStart(null);
      setWallMousePos(null);
      wallDrawStartRef.current = null;
    }
  }, [isWallTool]);

  // ── Coordinate helpers ────────────────────────────────────────────────────────
  const screenToWorld = useCallback(
    (pt: Point): Point => ({
      x: (pt.x - cameraX) / zoom,
      y: (pt.y - cameraY) / zoom,
    }),
    [cameraX, cameraY, zoom],
  );

  const snapMeasure = useCallback(
    (worldX: number, worldY: number) =>
      snapPt(worldX, worldY, gridSize, gridType, snapMode),
    [gridSize, gridType, snapMode],
  );

  // ── Panning ───────────────────────────────────────────────────────────────────
  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const getCursor = useCallback(() => {
    if (activeTool === "pan") return "grab";
    if (isMeasureTool(activeTool)) return "crosshair";
    if (activeTool === "wall") return "crosshair";
    if (activeTool === "door") return "crosshair";
    if (activeTool === "fog_reveal") return "cell";
    if (activeTool === "fog_hide") return "cell";
    return "default";
  }, [activeTool]);

  // ── Master mouse down ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: any) => {
      const button = e.evt.button as number;
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (!pos) return;

      // Right-click: cancel wall drawing
      if (button === 2) {
        if (isWallTool) {
          setWallDrawStart(null);
          setWallMousePos(null);
          wallDrawStartRef.current = null;
        }
        return;
      }

      setContextMenu(null);

      // Middle-mouse pan
      if (button === 1) {
        isPanning.current = true;
        lastPointer.current = { x: pos.x, y: pos.y };
        stage.container().style.cursor = "grabbing";
        return;
      }

      // ── Wall / door drawing ─────────────────────────────────────────────────
      if (isGM && isWallTool && button === 0) {
        const world = screenToWorld(pos);
        const snapped = snapWorld(world.x, world.y, gridSize, snapEnabled);

        const prev = wallDrawStartRef.current;
        if (!prev) {
          // First click — set start point
          wallDrawStartRef.current = snapped;
          setWallDrawStart(snapped);
        } else {
          // Second click — emit wall segment, chain to next
          const dx = snapped.x - prev.x;
          const dy = snapped.y - prev.y;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            const type = activeTool === "door" ? "door_closed" : "wall";
            onAddWall?.(prev.x, prev.y, snapped.x, snapped.y, type);
          }
          // Chain: new segment starts where old one ended
          wallDrawStartRef.current = snapped;
          setWallDrawStart(snapped);
        }
        return;
      }

      // ── Fog reveal / hide brush ─────────────────────────────────────────────
      if (
        isGM &&
        (activeTool === "fog_reveal" || activeTool === "fog_hide") &&
        button === 0
      ) {
        const world = screenToWorld(pos);
        if (activeTool === "fog_reveal") {
          onAddRevealedRegion?.(world.x, world.y, FOG_BRUSH_RADIUS);
        }
        return;
      }

      // ── Measurement tools ───────────────────────────────────────────────────
      if (isMeasureTool(activeTool) && button === 0) {
        const snapped = snapMeasure(screenToWorld(pos).x, screenToWorld(pos).y);
        isMeasuring.current = true;
        const newMeasure: MeasureState = {
          tool: activeTool as MeasureTool,
          start: snapped,
          end: snapped,
          gridSize,
          coneAngle,
          lineWidth,
          gridType,
        };
        setMeasure(newMeasure);
        onMeasureChange?.(newMeasure);
        return;
      }

      // ── Pan tool ────────────────────────────────────────────────────────────
      if (activeTool === "pan" && e.target === stage && button === 0) {
        isPanning.current = true;
        lastPointer.current = { x: pos.x, y: pos.y };
        stage.container().style.cursor = "grabbing";
      }
    },
    [
      isGM,
      isWallTool,
      activeTool,
      screenToWorld,
      snapEnabled,
      gridSize,
      gridType,
      coneAngle,
      lineWidth,
      snapMeasure,
      onAddWall,
      onAddRevealedRegion,
      onMeasureChange,
    ],
  );

  // ── Master mouse move ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: any) => {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      // Update wall preview
      if (isGM && isWallTool && wallDrawStartRef.current) {
        const world = screenToWorld(pos);
        const snapped = snapWorld(world.x, world.y, gridSize, snapEnabled);
        setWallMousePos(snapped);
        return;
      }

      // Update measurement
      if (isMeasuring.current && measure) {
        const snapped = snapMeasure(screenToWorld(pos).x, screenToWorld(pos).y);
        const updated = { ...measure, end: snapped, coneAngle, lineWidth };
        setMeasure(updated);
        onMeasureChange?.(updated);
        return;
      }

      // Pan
      if (isPanning.current) {
        const dx = pos.x - lastPointer.current.x;
        const dy = pos.y - lastPointer.current.y;
        lastPointer.current = { x: pos.x, y: pos.y };
        panCamera(cameraX + dx, cameraY + dy);
      }
    },
    [
      isGM,
      isWallTool,
      screenToWorld,
      snapEnabled,
      gridSize,
      measure,
      snapMeasure,
      coneAngle,
      lineWidth,
      cameraX,
      cameraY,
      panCamera,
      onMeasureChange,
    ],
  );

  // ── Master mouse up ───────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(
    (e: any) => {
      if (isMeasuring.current) {
        isMeasuring.current = false;
        return;
      }
      if (isPanning.current) {
        isPanning.current = false;
        e.target.getStage().container().style.cursor = getCursor();
      }
    },
    [getCursor],
  );

  useEffect(() => {
    if (!isMeasureTool(activeTool)) {
      setMeasure(null);
      isMeasuring.current = false;
      onMeasureClear?.();
    }
  }, [activeTool, onMeasureClear]);

  // ── Zoom ──────────────────────────────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      const pointer = e.target.getStage().getPointerPosition();
      if (!pointer) return;
      const scaleBy = 1.05;
      const dir = e.evt.deltaY > 0 ? -1 : 1;
      let newScale = dir > 0 ? zoom * scaleBy : zoom / scaleBy;
      newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
      const mousePointTo = {
        x: (pointer.x - cameraX) / zoom,
        y: (pointer.y - cameraY) / zoom,
      };
      setZoomAndCamera(
        newScale,
        pointer.x - mousePointTo.x * newScale,
        pointer.y - mousePointTo.y * newScale,
      );
    },
    [zoom, cameraX, cameraY, setZoomAndCamera],
  );

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: getCursor(), background: bgColor }}
    >
      {size.width > 0 && (
        <>
          <Stage
            width={size.width}
            height={size.height}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{ background: bgColor }}
          >
            {/* Layer 1: map + grid + tokens */}
            <Layer>
              <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
                <MapLayer width={mapWidth} height={mapHeight} src={map} />
                <GridLayer width={mapWidth} height={mapHeight} />
                <TokenLayer
                  gridSize={gridSize}
                  gridType={gridType}
                  snapEnabled={snapEnabled}
                  isGM={isGM}
                  disableDrag={isMeasureTool(activeTool) || isWallTool}
                  onMoveToken={onMoveToken}
                  onContextMenu={(token, screenX, screenY) =>
                    setContextMenu({ token, screenX, screenY })
                  }
                  onDeleteTokens={onDeleteTokens}
                />
              </Group>
            </Layer>

            {/* Layer 2: walls — display only, mouse handling is on the Stage */}
            <WallLayer
              walls={walls}
              isGM={isGM}
              zoom={zoom}
              cameraX={cameraX}
              cameraY={cameraY}
              drawStart={wallDrawStart}
              mousePos={wallMousePos}
              activeTool={activeTool}
              isDrawing={isWallTool}
              onToggleDoor={onToggleDoor ?? (() => {})}
              onRemoveWall={onRemoveWall ?? (() => {})}
            />

            {/* Layer 3: local measurement */}
            {measure && (
              <Layer listening={false}>
                <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
                  <MeasureLayer measure={measure} zoom={zoom} />
                </Group>
              </Layer>
            )}

            {/* Layer 4: remote measurements */}
            {remoteMeasures.length > 0 && (
              <Layer listening={false}>
                <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
                  <RemoteMeasures measures={remoteMeasures} zoom={zoom} />
                </Group>
              </Layer>
            )}
          </Stage>

          {/* Fog overlay — plain HTML canvas, not inside Konva */}
          <FogLayer
            walls={walls}
            isGM={isGM}
            fogEnabled={fogEnabled}
            currentUserId={currentUserId}
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            revealedRegions={revealedRegions}
          />
        </>
      )}

      {contextMenu && (
        <TokenContextMenu
          token={contextMenu.token}
          gridType={gridType}
          screenX={contextMenu.screenX}
          screenY={contextMenu.screenY}
          isGM={isGM}
          onRename={onRenameToken}
          onToggleVisibility={onToggleVisibility}
          onTogglePlayerEditable={onTogglePlayerEditable}
          onEditStats={onEditStats}
          onSetTokenSize={onSetTokenSize}
          onDelete={(id) => onDeleteTokens([id])}
          onOpenSheet={onOpenSheet}
          onOpenStatBlock={onOpenStatBlock}
          onAssignStatBlock={isGM ? onAssignStatBlock : undefined}
          hasStatBlock={!!(contextMenu?.token as any)?.npc_stat_block_id}
          onClose={() => setContextMenu(null)}
        />
      )}

      {diceOpen && <DiceRoller onClose={onDiceClose} />}
    </div>
  );
}

// Fog brush radius in world units (~2 grid squares at default gridSize=70)
const FOG_BRUSH_RADIUS = 140;
