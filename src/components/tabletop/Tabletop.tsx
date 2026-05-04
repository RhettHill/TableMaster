import { Stage, Layer, Group } from "react-konva";
import { useEffect, useRef, useState, useCallback } from "react";
import MapLayer, { GifMapOverlay, VideoMapOverlay } from "./MapLayer";
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
import type { Wall } from "../../utils/Raycasting";
import type { VisibilityMode, FogRegion } from "../../hooks/useFog";
import { useArrowKeyTokenMove } from "../../hooks/useArrowMove";
import { useTabletopTouch } from "../../hooks/usetabletoptouch";

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;

const BRUSH_PRESETS = [
  { label: "XS", radius: 60 },
  { label: "S", radius: 120 },
  { label: "M", radius: 220 },
  { label: "L", radius: 380 },
  { label: "XL", radius: 600 },
];
const DEFAULT_BRUSH_IDX = 1;

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
  pings?: import("./PingLayer").Ping[];
  onPing?: (x: number, y: number) => void;
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

function BrushSizePicker({
  selectedIdx,
  onChange,
  activeTool,
}: {
  selectedIdx: number;
  onChange: (idx: number) => void;
  activeTool: ActiveTool;
}) {
  const isFog = activeTool === "fog_reveal" || activeTool === "fog_hide";
  if (!isFog) return null;
  return (
    <div className="absolute bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-3 py-2 rounded-2xl bg-black/70 backdrop-blur-md border border-white/15 shadow-2xl pointer-events-auto select-none">
      <span className="text-white/40 text-[10px] uppercase tracking-widest mr-1.5">
        Brush
      </span>
      {BRUSH_PRESETS.map((p, i) => (
        <button
          key={p.label}
          onClick={() => onChange(i)}
          title={`Radius ${p.radius}px`}
          className={`flex items-center justify-center rounded-lg transition-all duration-150 text-xs font-bold ${
            i === selectedIdx
              ? "bg-amber-500/30 border border-amber-500/60 text-amber-300"
              : "bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white/70"
          }`}
          style={{ width: `${22 + i * 4}px`, height: `${22 + i * 4}px` }}
        >
          {p.label}
        </button>
      ))}
      <span className="text-white/25 text-[10px] ml-1.5 tabular-nums">
        r{BRUSH_PRESETS[selectedIdx].radius}
      </span>
    </div>
  );
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
  const mapIsAnimated = useGameStore((s) => s.mapIsAnimated);
  const mapIsVideo = useGameStore((s) => s.mapIsVideo);
  const setZoomAndCamera = useGameStore((s) => s.setZoomAndCamera);
  const panCamera = useGameStore((s) => s.panCamera);
  const tokens = useGameStore((s) => s.tokens);

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

  // ── Selected token IDs (lifted from TokenLayer) ───────────────────────────
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);

  // ── Arrow key movement ────────────────────────────────────────────────────
  useArrowKeyTokenMove({
    selectedTokenIds,
    gridSize,
    snapToGrid: snapEnabled,
    tokens,
    isGM,
    currentUserId,
    onMoveToken,
  });

  const [brushPresetIdx, setBrushPresetIdx] = useState(DEFAULT_BRUSH_IDX);
  const fogBrushRadius = BRUSH_PRESETS[brushPresetIdx].radius;
  const fogBrushRadiusRef = useRef(fogBrushRadius);
  useEffect(() => {
    fogBrushRadiusRef.current = fogBrushRadius;
  }, [fogBrushRadius]);

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

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [measure, setMeasure] = useState<MeasureState | null>(null);
  const isMeasuring = useRef(false);

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

  const isFogBrushing = useRef(false);
  const lastFogPos = useRef<Point | null>(null);
  const [fogBrushPos, setFogBrushPos] = useState<Point | null>(null);
  const isFogTool = activeTool === "fog_reveal" || activeTool === "fog_hide";

  const pendingFogOps = useRef<
    { x: number; y: number; radius: number; reveal: boolean }[]
  >([]);
  const fogFlushTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const flushFogOps = useCallback(() => {
    const ops = pendingFogOps.current;
    if (ops.length === 0) return;
    pendingFogOps.current = [];
    const reveals = ops.filter((o) => o.reveal);
    const hides = ops.filter((o) => !o.reveal);
    const dedupe = (list: typeof ops) => {
      const out: typeof ops = [];
      for (const op of list) {
        const covered = list.some(
          (other) =>
            other !== op &&
            other.radius >= op.radius &&
            Math.hypot(other.x - op.x, other.y - op.y) + op.radius <=
              other.radius,
        );
        if (!covered) out.push(op);
      }
      return out;
    };
    for (const op of dedupe(reveals))
      onAddRevealedRegion(op.x, op.y, op.radius);
    for (const op of dedupe(hides))
      onRemoveRevealedRegion(op.x, op.y, op.radius);
  }, [onAddRevealedRegion, onRemoveRevealedRegion]);

  useEffect(() => {
    if (isFogTool && isGM) {
      fogFlushTimer.current = setInterval(flushFogOps, 250);
    } else {
      if (fogFlushTimer.current) {
        clearInterval(fogFlushTimer.current);
        fogFlushTimer.current = null;
      }
      flushFogOps();
      setFogBrushPos(null);
      isFogBrushing.current = false;
    }
    return () => {
      if (fogFlushTimer.current) clearInterval(fogFlushTimer.current);
    };
  }, [isFogTool, isGM, flushFogOps]);

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

  const isPanning = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  const getCursor = useCallback(() => {
    if (activeTool === "pan") return "grab";
    if (isMeasureTool(activeTool)) return "crosshair";
    if (activeTool === "wall" || activeTool === "door") return "crosshair";
    if (activeTool === "fog_reveal" || activeTool === "fog_hide") return "none";
    return "default";
  }, [activeTool]);

  const handleMouseDown = useCallback(
    (e: any) => {
      const button = e.evt.button as number;
      const stage = e.target.getStage();
      const pos = stage.getPointerPosition();
      if (!pos) return;

      if (button === 2) {
        if (isWallTool) {
          setWallDrawStart(null);
          setWallMousePos(null);
          wallDrawStartRef.current = null;
        }
        return;
      }

      setContextMenu(null);

      if (button === 1) {
        isPanning.current = true;
        lastPointer.current = { x: pos.x, y: pos.y };
        stage.container().style.cursor = "grabbing";
        return;
      }

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

      if (isGM && isFogTool && button === 0) {
        isFogBrushing.current = true;
        const world = screenToWorld(pos);
        lastFogPos.current = world;
        const radius = fogBrushRadiusRef.current;
        const reveal = activeTool === "fog_reveal";
        pendingFogOps.current.push({ x: world.x, y: world.y, radius, reveal });
        return;
      }

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
      onMeasureChange,
      walls,
    ],
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      if (isGM && isWallTool && wallDrawStartRef.current) {
        const world = screenToWorld(pos);
        setWallMousePos(snapWorld(world.x, world.y, gridSize, snapEnabled));
        return;
      }

      if (isGM && isFogTool) {
        const world = screenToWorld(pos);
        setFogBrushPos(world);
        if (isFogBrushing.current) {
          const last = lastFogPos.current;
          const radius = fogBrushRadiusRef.current;
          if (
            !last ||
            Math.hypot(world.x - last.x, world.y - last.y) > radius * 0.6
          ) {
            lastFogPos.current = world;
            pendingFogOps.current.push({
              x: world.x,
              y: world.y,
              radius,
              reveal: activeTool === "fog_reveal",
            });
          }
        }
        return;
      }

      if (isMeasuring.current && measure) {
        const world = screenToWorld(pos);
        const snapped = snapMeasure(world.x, world.y);
        const updated = { ...measure, end: snapped, coneAngle, lineWidth };
        setMeasure(updated);
        onMeasureChange?.(updated);
        return;
      }

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
    ],
  );

  const handleMouseUp = useCallback(
    (e: any) => {
      if (isFogBrushing.current) {
        isFogBrushing.current = false;
        lastFogPos.current = null;
        flushFogOps();
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
    [getCursor, flushFogOps],
  );

  const handleMouseLeave = useCallback(() => {
    if (isFogTool) {
      setFogBrushPos(null);
      if (isFogBrushing.current) {
        isFogBrushing.current = false;
        lastFogPos.current = null;
        flushFogOps();
      }
    }
  }, [isFogTool, flushFogOps]);

  useEffect(() => {
    if (!isMeasureTool(activeTool)) {
      setMeasure(null);
      isMeasuring.current = false;
      onMeasureClear?.();
    }
  }, [activeTool, onMeasureClear]);

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

  // ── Touch support ─────────────────────────────────────────────────────────
  // Get the actual Konva stage container DOM element
  const [stageContainer, setStageContainer] = useState<HTMLElement | null>(
    null,
  );
  useEffect(() => {
    // After size is known the stage is mounted; grab its container div
    if (size.width > 0 && containerRef.current) {
      const el =
        containerRef.current.querySelector("canvas")?.parentElement ?? null;
      setStageContainer(el);
    }
  }, [size.width]);

  const toolBlocksPan = isMeasureTool(activeTool) || isWallTool || isFogTool;

  useTabletopTouch({
    containerEl: stageContainer,
    zoom,
    cameraX,
    cameraY,
    setZoomAndCamera,
    panCamera,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    onPing,
    toolBlocksPan,
  });

  const hasOverlay = mapIsAnimated || mapIsVideo;

  const overlayProps = {
    src: map,
    width: mapWidth,
    height: mapHeight,
    zoom,
    cameraX,
    cameraY,
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ cursor: getCursor(), background: bgColor }}
    >
      {size.width > 0 && (
        <>
          {mapIsAnimated && <GifMapOverlay key={map} {...overlayProps} />}
          {mapIsVideo && <VideoMapOverlay key={map} {...overlayProps} />}

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
              onPing((pos.x - cameraX) / zoom, (pos.y - cameraY) / zoom);
            }}
            style={{
              background: hasOverlay ? "transparent" : bgColor,
              position: "relative",
              zIndex: 1,
              // Prevent native touch behaviors interfering
              touchAction: "none",
            }}
          >
            <Layer>
              <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
                <MapLayer
                  width={mapWidth}
                  height={mapHeight}
                  src={map}
                  animated={mapIsAnimated}
                  isVideo={mapIsVideo}
                />
                <GridLayer width={mapWidth} height={mapHeight} />
                <AuraLayer gridSize={gridSize} gridType={gridType} />
                <TokenLayer
                  gridSize={gridSize}
                  gridType={gridType}
                  snapEnabled={snapEnabled}
                  isGM={isGM}
                  disableDrag={toolBlocksPan}
                  onMoveToken={onMoveToken}
                  onContextMenu={(token, screenX, screenY) =>
                    setContextMenu({ token, screenX, screenY })
                  }
                  onDeleteTokens={onDeleteTokens}
                  onSelectionChange={setSelectedTokenIds}
                  currentUserId={currentUserId}
                />
                <PingLayer pings={pings} />
              </Group>
            </Layer>

            {visibilityMode === "lighting" && (
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
            )}

            {measure && (
              <Layer listening={false}>
                <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
                  <MeasureLayer measure={measure} zoom={zoom} />
                </Group>
              </Layer>
            )}

            {remoteMeasures.length > 0 && (
              <Layer listening={false}>
                <Group x={cameraX} y={cameraY} scaleX={zoom} scaleY={zoom}>
                  <RemoteMeasures measures={remoteMeasures} zoom={zoom} />
                </Group>
              </Layer>
            )}
          </Stage>

          <FogLayer
            walls={walls}
            isGM={isGM}
            currentUserId={currentUserId}
            mapWidth={mapWidth}
            mapHeight={mapHeight}
            visibilityMode={visibilityMode}
            revealedRegions={revealedRegions}
            brushPos={fogBrushPos}
            brushRadius={fogBrushRadius}
            isFogTool={isFogTool}
            zoom={zoom}
            cameraX={cameraX}
            cameraY={cameraY}
          />

          {isGM && (
            <BrushSizePicker
              selectedIdx={brushPresetIdx}
              onChange={setBrushPresetIdx}
              activeTool={activeTool}
            />
          )}
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
          currentUserId={currentUserId}
        />
      )}

      {diceOpen && <DiceRoller onClose={onDiceClose} />}
    </div>
  );
}
