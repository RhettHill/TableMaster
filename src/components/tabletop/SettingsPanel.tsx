import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGameStore,
  SceneSettings,
  GameSettings,
} from "../../store/gameStore";
import { useMeasurementStore } from "../../store/MeasurementStore";
import { supabase } from "../../services/supabase";
import type { VisibilityMode } from "../../hooks/useFog";

interface SettingsPanelProps {
  gameId: string;
  activeSceneId: string | null;
  onSceneSettingChange: (settings: SceneSettings) => void;
  onGameSettingChange: (settings: GameSettings) => void;
  onClearFog?: () => void;
  visibilityMode: VisibilityMode;
  onSetVisibilityMode: (mode: VisibilityMode) => void;
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold tracking-widest uppercase text-amber-400/70 border-b border-white/8 pb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-amber-500 cursor-pointer"
        />
        <span className="text-white/50 text-xs tabular-nums w-12 text-right">
          {value}
          {unit}
        </span>
      </div>
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded-md cursor-pointer border border-white/15 bg-transparent"
        />
        <span className="text-white/40 text-xs font-mono">{value}</span>
      </div>
    </Field>
  );
}

function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Field label={label}>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-5 rounded-full transition-colors duration-200 relative shrink-0 ${value ? "bg-amber-500" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${value ? "left-5" : "left-0.5"}`}
        />
      </button>
    </Field>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <Field label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0f0f1a]">
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

function NumberField({
  label,
  value,
  min = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const prevRef = useRef(value);

  if (prevRef.current !== value) {
    prevRef.current = value;
    setDraft(String(value));
  }

  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= min) onChange(parsed);
    else setDraft(String(value));
  };

  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm
            text-white font-mono text-center focus:outline-none focus:border-amber-500/50
            transition-colors [appearance:textfield]
            [&::-webkit-outer-spin-button]:appearance-none
            [&::-webkit-inner-spin-button]:appearance-none"
        />
        {unit && <span className="text-white/40 text-xs">{unit}</span>}
      </div>
    </Field>
  );
}

// ── Visibility mode selector ──────────────────────────────────────────────────

const VISIBILITY_OPTIONS: {
  value: VisibilityMode;
  icon: string;
  label: string;
  desc: string;
  requiresPaid: boolean;
}[] = [
  {
    value: "none",
    icon: "👁",
    label: "None",
    desc: "All players see everything",
    requiresPaid: false,
  },
  {
    value: "fog",
    icon: "🖌️",
    label: "Fog of War",
    desc: "Paint revealed areas manually",
    requiresPaid: false,
  },
  {
    value: "lighting",
    icon: "💡",
    label: "Dynamic Lighting",
    desc: "Token vision + wall raycasting",
    requiresPaid: true,
  },
];

function VisibilityModeSelector({
  value,
  onChange,
  hasLightingAccess,
  onUpgradeClick,
}: {
  value: VisibilityMode;
  onChange: (v: VisibilityMode) => void;
  hasLightingAccess: boolean;
  onUpgradeClick: () => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {VISIBILITY_OPTIONS.map((opt) => {
        const active = value === opt.value;
        const locked = opt.requiresPaid && !hasLightingAccess;

        if (locked) {
          return (
            <button
              key={opt.value}
              onClick={onUpgradeClick}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left
                transition-all duration-150 group relative overflow-hidden
                bg-white/[0.02] border-white/8 hover:border-amber-500/30 hover:bg-amber-500/5"
            >
              {/* Subtle shimmer on hover */}
              <span
                className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent
                translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"
              />

              <span className="text-sm w-4 text-center flex-shrink-0 opacity-40">
                {opt.icon}
              </span>

              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold leading-tight text-white/30">
                    {opt.label}
                  </span>
                  {/* Pro badge */}
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded
                    bg-amber-500/15 border border-amber-500/30 text-amber-400
                    text-[9px] font-bold uppercase tracking-wider leading-none"
                  >
                    ✦ Plus
                  </span>
                </div>
                <span className="text-[10px] leading-tight text-white/20 mt-0.5">
                  {opt.desc}
                </span>
              </div>

              {/* Lock icon + upgrade nudge */}
              <div className="flex-shrink-0 flex flex-col items-end gap-0.5">
                <span className="text-white/20 text-sm">🔒</span>
                <span
                  className="text-[9px] text-amber-400/60 group-hover:text-amber-400
                  transition-colors whitespace-nowrap"
                >
                  Upgrade →
                </span>
              </div>
            </button>
          );
        }

        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-all duration-150
              ${
                active
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                  : "bg-white/4 border-white/8 text-white/50 hover:bg-white/8 hover:text-white/80 hover:border-white/15"
              }`}
          >
            <span className="text-sm w-4 text-center flex-shrink-0">
              {opt.icon}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold leading-tight">
                {opt.label}
              </span>
              <span
                className={`text-[10px] leading-tight ${active ? "text-amber-300/60" : "text-white/30"}`}
              >
                {opt.desc}
              </span>
            </div>
            {active && (
              <span className="ml-auto text-amber-400 text-xs flex-shrink-0">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Upgrade prompt shown below the locked option ──────────────────────────────

function UpgradeBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div
      className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border
      border-amber-500/20 bg-amber-500/5 mt-1"
    >
      <span className="text-amber-400 text-sm flex-shrink-0 mt-0.5">✦</span>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-xs text-white/60 leading-snug">
          Dynamic Lighting is available on the{" "}
          <span className="text-amber-400 font-semibold">Plus plan</span>.
          Upgrade to unlock raycasting vision, wall blocking, and per-token
          sight ranges.
        </p>
        <button
          onClick={onUpgrade}
          className="self-start mt-0.5 px-2.5 py-1 rounded-md text-[11px] font-semibold
            bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30
            text-amber-400 transition-all"
        >
          View plans →
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SettingsPanel({
  activeSceneId,
  onSceneSettingChange,
  onGameSettingChange,
  onClearFog,
  visibilityMode,
  onSetVisibilityMode,
}: SettingsPanelProps) {
  const sceneSettings = useGameStore((s) => s.sceneSettings);
  const gameSettings = useGameStore((s) => s.gameSettings);
  const setSceneSettings = useGameStore((s) => s.setSceneSettings);
  const setGameSettings = useGameStore((s) => s.setGameSettings);

  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  const setFeetPerSquare = useMeasurementStore((s) => s.setFeetPerSquare);

  // ── Fetch the GM's subscription status ───────────────────────────────────────
  // We only need plan_id and subscription_status — no sensitive data.
  const [hasLightingAccess, setHasLightingAccess] = useState(false);
  const [planCheckDone, setPlanCheckDone] = useState(false);

  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setPlanCheckDone(true);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("plan_id, subscription_status")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setPlanCheckDone(true);
        return;
      }

      // User has access if they have an active (or trialing) paid subscription.
      // "inactive" or null means free tier — no lighting access.
      const activeStatuses = ["active", "trialing"];
      const hasSub = activeStatuses.includes(profile.subscription_status ?? "");

      // Also check if their plan isn't the cheapest/free one.
      // If plan_id is null they're on the free tier by default.
      setHasLightingAccess(hasSub && !!profile.plan_id);
      setPlanCheckDone(true);
    };
    check();
  }, []);

  // If the GM somehow has lighting mode active but loses their subscription,
  // quietly revert them to "fog" mode.
  useEffect(() => {
    if (planCheckDone && !hasLightingAccess && visibilityMode === "lighting") {
      onSetVisibilityMode("fog");
    }
  }, [planCheckDone, hasLightingAccess, visibilityMode, onSetVisibilityMode]);

  const handleUpgradeClick = () => {
    // Open plans page in a new tab so the GM doesn't lose their game session
    window.open("/plans", "_blank", "noopener,noreferrer");
  };

  // ── Debounced setting saves ───────────────────────────────────────────────────
  const sceneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFeetPerSquareChange = (v: number) => {
    setFeetPerSquare(v);
    const updated = { ...sceneSettings, feetPerSquare: v } as any;
    if (sceneDebounceRef.current) clearTimeout(sceneDebounceRef.current);
    sceneDebounceRef.current = setTimeout(
      () => onSceneSettingChange(updated),
      600,
    );
  };

  const handleSceneChange = (patch: Partial<SceneSettings>) => {
    const updated = { ...sceneSettings, ...patch };
    setSceneSettings(patch);
    if (sceneDebounceRef.current) clearTimeout(sceneDebounceRef.current);
    sceneDebounceRef.current = setTimeout(
      () => onSceneSettingChange(updated),
      600,
    );
  };

  const handleGameChange = (patch: Partial<GameSettings>) => {
    const updated = { ...gameSettings, ...patch };
    setGameSettings(patch);
    if (gameDebounceRef.current) clearTimeout(gameDebounceRef.current);
    gameDebounceRef.current = setTimeout(
      () => onGameSettingChange(updated),
      600,
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* ── Scene settings ───────────────────────────────────────────────── */}
      <Section title="Scene Settings">
        {!activeSceneId ? (
          <p className="text-amber-400/60 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Switch to a scene first
          </p>
        ) : (
          <>
            <SliderField
              label="Grid Size (px per cell)"
              value={sceneSettings.gridSize}
              min={20}
              max={200}
              step={5}
              unit="px"
              onChange={(v) => handleSceneChange({ gridSize: v })}
            />
            <SliderField
              label="Grid Opacity"
              value={Math.round(sceneSettings.gridOpacity * 100)}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => handleSceneChange({ gridOpacity: v / 100 })}
            />
            <ColorField
              label="Grid Color"
              value={sceneSettings.gridColor}
              onChange={(v) => handleSceneChange({ gridColor: v })}
            />
            <SelectField
              label="Grid Type"
              value={sceneSettings.gridType}
              options={[
                { value: "square", label: "Square" },
                { value: "hex", label: "Hex" },
              ]}
              onChange={(v) => handleSceneChange({ gridType: v })}
            />
            <ToggleField
              label="Snap to Grid"
              value={sceneSettings.snapToGrid}
              onChange={(v) => handleSceneChange({ snapToGrid: v })}
            />
            <ColorField
              label="Background Color"
              value={sceneSettings.bgColor}
              onChange={(v) => handleSceneChange({ bgColor: v })}
            />
            <NumberField
              label="Grid Scale"
              value={feetPerSquare}
              min={1}
              unit="ft per square"
              onChange={handleFeetPerSquareChange}
            />
            <div className="flex gap-1.5 -mt-1">
              {[5, 10].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleFeetPerSquareChange(preset)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                    feetPerSquare === preset
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8"
                  }`}
                >
                  {preset} ft
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
                Map Dimensions (px)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30">Width</span>
                  <input
                    type="number"
                    min={500}
                    max={20000}
                    step={100}
                    value={sceneSettings.mapWidth}
                    onChange={(e) =>
                      handleSceneChange({ mapWidth: Number(e.target.value) })
                    }
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors tabular-nums"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-white/30">Height</span>
                  <input
                    type="number"
                    min={500}
                    max={20000}
                    step={100}
                    value={sceneSettings.mapHeight}
                    onChange={(e) =>
                      handleSceneChange({ mapHeight: Number(e.target.value) })
                    }
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors tabular-nums"
                  />
                </div>
              </div>
              <p className="text-[10px] text-white/20">
                {Math.round(sceneSettings.mapWidth / sceneSettings.gridSize)} ×{" "}
                {Math.round(sceneSettings.mapHeight / sceneSettings.gridSize)}{" "}
                cells at current grid size
              </p>
            </div>
            <p className="text-[10px] text-white/20 text-center">
              Changes save automatically
            </p>
          </>
        )}
      </Section>

      {/* ── Fog of War ───────────────────────────────────────────────────── */}
      <Section title="Fog of War">
        <p className="text-[10px] text-white/30 -mt-1">
          Changes apply immediately for all players.
        </p>

        <VisibilityModeSelector
          value={visibilityMode}
          onChange={onSetVisibilityMode}
          hasLightingAccess={hasLightingAccess}
          onUpgradeClick={handleUpgradeClick}
        />

        {/* Show upgrade banner if user doesn't have access */}
        {planCheckDone && !hasLightingAccess && (
          <UpgradeBanner onUpgrade={handleUpgradeClick} />
        )}

        {visibilityMode !== "none" && onClearFog && (
          <button
            onClick={() => {
              if (
                window.confirm("Clear all revealed fog regions for this scene?")
              ) {
                onClearFog();
              }
            }}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10
              text-red-400/70 hover:text-red-400 hover:bg-red-500/20 transition-all self-start mt-1"
          >
            🗑 Clear all revealed regions
          </button>
        )}
      </Section>

      {/* ── Game settings ────────────────────────────────────────────────── */}
      <Section title="Game Settings">
        <Field label="Game Name">
          <input
            type="text"
            value={gameSettings.gameName}
            onChange={(e) => handleGameChange({ gameName: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </Field>

        <p className="text-[10px] text-white/20 text-center">
          Changes save automatically
        </p>
      </Section>
    </div>
  );
}
