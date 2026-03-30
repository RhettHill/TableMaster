import type { ActiveTool } from "../../types/Types";
import type { VisibilityMode } from "../../hooks/useFog";
import { useMeasurementStore, SnapMode } from "../../store/MeasurementStore";
import VisionRadiusControl from "./visionRadiusContol";

interface ToolbarProps {
  activeTool: ActiveTool;
  isGM: boolean;
  diceOpen: boolean;
  onToolChange: (tool: ActiveTool) => void;
  onGMPanelToggle: () => void;
  onDiceToggle: () => void;
  onOpenSheet: () => void;
  gmPanelOpen: boolean;
  // Vision control (players only, shown when lighting mode is active)
  visibilityMode?: VisibilityMode;
  currentUserId?: string;
  onEditStats?: (
    id: string,
    stats: {
      hp: number;
      maxHp: number;
      ac: number;
      showStats: boolean;
      vision_radius: number;
      darkvision: number;
    },
  ) => void;
}

function ToolButton({
  icon,
  label,
  active,
  onClick,
  shortcut,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onClick: () => void;
  shortcut?: string;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          pointer-events-auto w-10 h-10 rounded-lg flex items-center justify-center
          transition-all duration-150 border text-base
          ${
            active
              ? "bg-amber-500/20 border-amber-500/50 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              : "bg-black/40 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
          }
        `}
      >
        {icon}
      </button>
      <div className="absolute left-12 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
        <div className="bg-black/90 border border-white/15 rounded-md px-2.5 py-1.5 whitespace-nowrap flex items-center gap-2">
          <span className="text-white/80 text-xs">{label}</span>
          {shortcut && (
            <span className="text-white/30 text-xs font-mono bg-white/10 px-1 rounded">
              {shortcut}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SnapButton({
  snapMode,
  onClick,
}: {
  snapMode: SnapMode;
  onClick: () => void;
}) {
  const isCenter = snapMode === "center";
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`
          pointer-events-auto w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5
          transition-all duration-150 border
          ${
            isCenter
              ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
              : "bg-violet-500/15 border-violet-500/40 text-violet-300"
          }
        `}
      >
        <span className="text-sm leading-none">{isCenter ? "⊕" : "⋅"}</span>
        <span className="text-[8px] leading-none tracking-wider uppercase opacity-70">
          {isCenter ? "Ctr" : "Cor"}
        </span>
      </button>
      <div className="absolute left-12 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
        <div className="bg-black/90 border border-white/15 rounded-md px-2.5 py-1.5 whitespace-nowrap">
          <span className="text-white/80 text-xs">
            Snap: {isCenter ? "Cell Centre" : "Cell Corner"} — click to toggle
          </span>
        </div>
      </div>
    </div>
  );
}

function MiniStepper({
  label,
  onInc,
  onDec,
}: {
  label: string;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 w-10">
      <button
        onClick={onInc}
        className="w-10 h-5 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs border border-white/8 transition-all leading-none"
      >
        +
      </button>
      <span className="text-amber-300 text-[10px] font-mono leading-none py-0.5">
        {label}
      </span>
      <button
        onClick={onDec}
        className="w-10 h-5 rounded bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 text-xs border border-white/8 transition-all leading-none"
      >
        −
      </button>
    </div>
  );
}

function Divider() {
  return <div className="w-6 h-px bg-white/10 mx-auto" />;
}

export default function Toolbar({
  activeTool,
  isGM,
  diceOpen,
  onToolChange,
  onGMPanelToggle,
  onDiceToggle,
  onOpenSheet,
  gmPanelOpen,
  visibilityMode,
  currentUserId,
  onEditStats,
}: ToolbarProps) {
  const snapMode = useMeasurementStore((s) => s.snapMode);
  const setSnapMode = useMeasurementStore((s) => s.setSnapMode);
  const coneAngle = useMeasurementStore((s) => s.coneAngle);
  const setConeAngle = useMeasurementStore((s) => s.setConeAngle);
  const lineWidth = useMeasurementStore((s) => s.lineWidth);
  const setLineWidth = useMeasurementStore((s) => s.setLineWidth);

  const toggleSnap = () =>
    setSnapMode(snapMode === "center" ? "corner" : "center");

  const showVisionControl =
    !isGM && visibilityMode === "lighting" && currentUserId && onEditStats;

  return (
    <div className="pointer-events-none h-full flex items-center">
      <div className="pointer-events-auto ml-2 flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 shadow-xl">
        {/* ── Core tools ── */}
        <ToolButton
          icon="↖"
          label="Select"
          shortcut="S"
          active={activeTool === "select"}
          onClick={() => onToolChange("select")}
        />
        <ToolButton
          icon="✥"
          label="Pan"
          shortcut="P"
          active={activeTool === "pan"}
          onClick={() => onToolChange("pan")}
        />

        <Divider />

        {/* ── Measurement tools ── */}
        <ToolButton
          icon="📏"
          label="Ruler"
          active={activeTool === "ruler"}
          onClick={() => onToolChange("ruler")}
        />
        <ToolButton
          icon="⭕"
          label="Circle AoE"
          active={activeTool === "circle"}
          onClick={() => onToolChange("circle")}
        />
        <ToolButton
          icon="📐"
          label="Cone AoE"
          active={activeTool === "cone"}
          onClick={() => onToolChange("cone")}
        />
        <ToolButton
          icon="⬜"
          label="Square AoE"
          active={activeTool === "square"}
          onClick={() => onToolChange("square")}
        />
        <ToolButton
          icon="▬"
          label="Line AoE"
          active={activeTool === "line"}
          onClick={() => onToolChange("line")}
        />

        <SnapButton snapMode={snapMode} onClick={toggleSnap} />

        {activeTool === "cone" && (
          <MiniStepper
            label={`${coneAngle}°`}
            onInc={() => setConeAngle(Math.min(180, coneAngle + 15))}
            onDec={() => setConeAngle(Math.max(15, coneAngle - 15))}
          />
        )}
        {activeTool === "line" && (
          <MiniStepper
            label={`${lineWidth}sq`}
            onInc={() => setLineWidth(lineWidth + 1)}
            onDec={() => setLineWidth(Math.max(1, lineWidth - 1))}
          />
        )}

        <Divider />

        {/* ── Dice ── */}
        <ToolButton
          icon="🎲"
          label="Dice Roller"
          active={diceOpen}
          onClick={onDiceToggle}
        />

        {/* ── Character sheet (players only) ── */}
        {!isGM && (
          <ToolButton
            icon="📋"
            label="My Character Sheet"
            onClick={onOpenSheet}
          />
        )}

        {/* ── Vision radius (players only, when lighting mode is on) ── */}
        {showVisionControl && (
          <>
            <Divider />
            <VisionRadiusControl
              currentUserId={currentUserId!}
              onEditStats={onEditStats!}
            />
          </>
        )}

        {/* ── GM-only tools ── */}
        {isGM && (
          <>
            <Divider />
            {visibilityMode === "lighting" && (
              <>
                <ToolButton
                  icon="🧱"
                  label="Draw Wall — click to place, right-click to finish"
                  active={activeTool === "wall"}
                  onClick={() => onToolChange("wall")}
                />
                <ToolButton
                  icon="🚪"
                  label="Draw Door — click to place door segments"
                  active={activeTool === "door"}
                  onClick={() => onToolChange("door")}
                />
                <ToolButton
                  icon="🗑"
                  label="Erase Walls/Doors"
                  active={activeTool === "erase"}
                  onClick={() => onToolChange("erase")}
                />
              </>
            )}
            <Divider />
            <ToolButton
              icon="👁"
              label="Reveal Fog — paint to reveal areas for players"
              active={activeTool === "fog_reveal"}
              onClick={() => onToolChange("fog_reveal")}
            />
            <ToolButton
              icon="🌑"
              label="Hide Fog — restore fog to revealed areas"
              active={activeTool === "fog_hide"}
              onClick={() => onToolChange("fog_hide")}
            />
            <Divider />
            <ToolButton
              icon="⚙"
              label="GM Tools"
              active={gmPanelOpen}
              onClick={onGMPanelToggle}
            />
          </>
        )}
      </div>
    </div>
  );
}
