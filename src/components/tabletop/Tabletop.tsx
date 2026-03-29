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
import AuraLayer from "./AuraLayer";
import PingLayer from "./PingLayer";
import type { Ping } from "./PingLayer";
import type { Wall } from "../../utils/Raycasting";
import type { VisibilityMode, FogRegion } from "../../hooks/useFog";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
const FOG_BRUSH_RADIUS = 120;

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
  sceneId: string | null;
  gameId: string;
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
      darkvision: number;
      auras?: { radius: number; color: string; label?: string }[];
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
  // Pings — received from useRealtimeGame and local sends
  pings?: import("./PingLayer").Ping[];
  onPing?: (x: number, y: number) => void;
  // Fog — passed from GameSession which owns the single useFog call
  visibilityMode: VisibilityMode;
  revealedRegions: FogRegion[];
  onAddRevealedRegion: (cx: number, cy: number, radius: number) => void;
  onRemoveRevealedRegion: (cx: number, cy: number, radius: number) => void;
}

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
  gameId,
  sceneId,
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
  currentUserId,
  onAddWall,
  onRemoveWall,
  onToggleDoor,
  visibilityMode,
  revealedRegions,
  onAddRevealedRegion,
  onRemoveRevealedRegion,
  pings = [],
  onPing,
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
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  const coneAngle = useMeasurementStore((s) => s.coneAngle);
  const lineWidth = useMeasurementStore((s) => s.lineWidth);

  // ── Viewport ──────────────────────────────────────────────────────────────────
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

  // ── Wall drawing ──────────────────────────────────────────────────────────────
  const [wallDrawStart, setWallDrawStart] = useState<Point | null>(null);
  const [wallMousePos, setWallMousePos] = useState<Point | null>(null);
  const wallDrawStartRef = useRef<Point | null>(null);
  const isWallTool = activeTool === "wall" || activeTool === "door";

  useEffect(() => {
    if (!isWallTool) {
      setWallDrawStart(null);
      setWallMousePos(null);
      wallDrawStartRef.current = null;
    }
  }, [isWallTool]);

  // ── Fog brush ─────────────────────────────────────────────────────────────────
  const isFogBrushing = useRef(false);
  const lastFogPos = useRef<Point | null>(null);
  const [fogBrushPos, setFogBrushPos] = useState<Point | null>(null);
  const isFogTool = activeTool === "fog_reveal" || activeTool === "fog_hide";

  useEffect(() => {
    if (!isFogTool) {
      setFogBrushPos(null);
      isFogBrushing.current = false;
    }
  }, [isFogTool]);

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
    if (activeTool === "fog_reveal") return "none"; // custom canvas cursor
    if (activeTool === "fog_hide") return "none";
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

      // ── Wall / door ───────────────────────────────────────────────────────────
      if (isGM && isWallTool && button === 0) {
        if (e.evt.shiftKey) {
          const world = screenToWorld(pos);
          const hit = walls.find((w) => {
            const dist =
              Math.hypot(w.x1 - world.x, w.y1 - world.y) +
              Math.hypot(w.x2 - world.x, w.y2 - world.y);
            return dist < 20;
          });
          if (hit) onRemoveWall?.(hit.id);
          return;
        }

        const world = screenToWorld(pos);
        const snapped = snapWorld(world.x, world.y, gridSize, snapEnabled);
        const prev = wallDrawStartRef.current;
        if (!prev) {
          wallDrawStartRef.current = snapped;
          setWallDrawStart(snapped);
        } else {
          const dx = snapped.x - prev.x;
          const dy = snapped.y - prev.y;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            const type = activeTool === "door" ? "door_closed" : "wall";
            onAddWall?.(prev.x, prev.y, snapped.x, snapped.y, type);
          }
          wallDrawStartRef.current = snapped;
          setWallDrawStart(snapped);
        }
        return;
      }

      // ── Fog brush ─────────────────────────────────────────────────────────────
      if (isGM && isFogTool && button === 0) {
        isFogBrushing.current = true;
        const world = screenToWorld(pos);
        lastFogPos.current = world;

        if (activeTool === "fog_reveal") {
          onAddRevealedRegion(world.x, world.y, FOG_BRUSH_RADIUS);
        } else {
          onRemoveRevealedRegion(world.x, world.y, FOG_BRUSH_RADIUS);
        }
        return;
      }

      // ── Measurement ───────────────────────────────────────────────────────────
      if (isMeasureTool(activeTool) && button === 0) {
        const world = screenToWorld(pos);
        const snapped = snapMeasure(world.x, world.y);
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

      // ── Pan ───────────────────────────────────────────────────────────────────
      if (activeTool === "pan" && e.target === stage && button === 0) {
        isPanning.current = true;
        lastPointer.current = { x: pos.x, y: pos.y };
        stage.container().style.cursor = "grabbing";
      }
    },
    [
      isGM,
      isWallTool,
      isFogTool,
      activeTool,
      screenToWorld,
      snapEnabled,
      gridSize,
      gridType,
      coneAngle,
      lineWidth,
      snapMeasure,
      onAddWall,
      onRemoveWall,
      onAddRevealedRegion,
      onRemoveRevealedRegion,
      onMeasureChange,
      walls,
    ],
  );

  // ── Master mouse move ─────────────────────────────────────────────────────────
  const handleMouseMove = useCallback(
    (e: any) => {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      // Wall preview
      if (isGM && isWallTool && wallDrawStartRef.current) {
        const world = screenToWorld(pos);
        const snapped = snapWorld(world.x, world.y, gridSize, snapEnabled);
        setWallMousePos(snapped);
        return;
      }

      // Fog brush — cursor preview + continuous paint on drag
      if (isGM && isFogTool) {
        const world = screenToWorld(pos);
        setFogBrushPos(world);

        if (isFogBrushing.current) {
          const last = lastFogPos.current;
          const minDist = FOG_BRUSH_RADIUS * 0.5;
          if (
            !last ||
            Math.hypot(world.x - last.x, world.y - last.y) > minDist
          ) {
            lastFogPos.current = world;
            if (activeTool === "fog_reveal") {
              onAddRevealedRegion(world.x, world.y, FOG_BRUSH_RADIUS);
            } else {
              onRemoveRevealedRegion(world.x, world.y, FOG_BRUSH_RADIUS);
            }
          }
        }
        return;
      }

      // Measurement
      if (isMeasuring.current && measure) {
        const world = screenToWorld(pos);
        const snapped = snapMeasure(world.x, world.y);
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
      isFogTool,
      activeTool,
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
      onAddRevealedRegion,
      onRemoveRevealedRegion,
    ],
  );

  // ── Master mouse up ───────────────────────────────────────────────────────────
  const handleMouseUp = useCallback(
    (e: any) => {
      if (isFogBrushing.current) {
        isFogBrushing.current = false;
        lastFogPos.current = null;
      }
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

  const handleMouseLeave = useCallback(() => {
    if (isFogTool) setFogBrushPos(null);
    isFogBrushing.current = false;
  }, [isFogTool]);

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
            onMouseLeave={handleMouseLeave}
            onDblClick={(e) => {
              if (!onPing) return;
              const stage = e.target.getStage();
              const pos = stage?.getPointerPosition();
              if (!pos) return;
              const wx = (pos.x - cameraX) / zoom;
              const wy = (pos.y - cameraY) / zoom;
              onPing(wx, wy);
            }}
            style={{ background: bgColor }}
          >
            {/* Layer 1: map + grid + tokens */}
            <Layer>
              <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
                <MapLayer width={mapWidth} height={mapHeight} src={map} />
                <GridLayer width={mapWidth} height={mapHeight} />
                <AuraLayer gridSize={gridSize} gridType={gridType} />
                <TokenLayer
                  gridSize={gridSize}
                  gridType={gridType}
                  snapEnabled={snapEnabled}
                  isGM={isGM}
                  disableDrag={
                    isMeasureTool(activeTool) || isWallTool || isFogTool
                  }
                  onMoveToken={onMoveToken}
                  onContextMenu={(token, screenX, screenY) =>
                    setContextMenu({ token, screenX, screenY })
                  }
                  onDeleteTokens={onDeleteTokens}
                />
                <PingLayer pings={pings} />
              </Group>
            </Layer>

            {/* Layer 2: walls */}
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

          {/* Fog overlay — HTML canvas above Konva Stage */}
          <FogLayer
            walls={walls}
            isGM={isGM}
            currentUserId={currentUserId}
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            visibilityMode={visibilityMode}
            revealedRegions={revealedRegions}
            brushPos={fogBrushPos}
            brushRadius={FOG_BRUSH_RADIUS}
            isFogTool={isFogTool}
            zoom={zoom}
            cameraX={cameraX}
            cameraY={cameraY}
          />
        </>
      )}

      {contextMenu && (
        <TokenContextMenu
          token={contextMenu.token}
          gridType={gridType}
          screenX={contextMenu.screenX}
          screenY={contextMenu.screenY}
          gridSize={gridSize}
          feetPerSquare={feetPerSquare}
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
