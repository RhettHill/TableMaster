import { useRef, useState } from "react";
import {
  useGameStore,
  SceneSettings,
  GameSettings,
} from "../../store/gameStore";
import { useMeasurementStore } from "../../store/MeasurementStore";

interface SettingsPanelProps {
  gameId: string;
  activeSceneId: string | null;
  onSceneSettingChange: (settings: SceneSettings) => void;
  onGameSettingChange: (settings: GameSettings) => void;
}

// ── Reusable field wrappers ───────────────────────────────────────────────────

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
        className={`w-10 h-5 rounded-full transition-colors duration-200 relative shrink-0
          ${value ? "bg-amber-500" : "bg-white/15"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200
          ${value ? "left-5" : "left-0.5"}`}
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

// Number input that commits on blur/Enter and rejects values below min
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

  // Keep draft in sync when value changes externally (e.g. preset button)
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

// ── Main ─────────────────────────────────────────────────────────────────────

export default function SettingsPanel({
  activeSceneId,
  onSceneSettingChange,
  onGameSettingChange,
}: SettingsPanelProps) {
  const sceneSettings = useGameStore((s) => s.sceneSettings);
  const gameSettings = useGameStore((s) => s.gameSettings);
  const setSceneSettings = useGameStore((s) => s.setSceneSettings);
  const setGameSettings = useGameStore((s) => s.setGameSettings);

  // Grid scale lives in measurementStore so all tool labels read it automatically
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  const setFeetPerSquare = useMeasurementStore((s) => s.setFeetPerSquare);

  const sceneDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      {/* ── Scene settings ──────────────────────────────────────────────── */}
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

            {/*
              FIX: background color was previously wired to handleGameChange,
              which writes to gameSettings.bgColor. Tabletop reads bgColor from
              sceneSettings, so changes had no visible effect. Now correctly
              calls handleSceneChange so the canvas updates immediately.
            */}
            <ColorField
              label="Background Color"
              value={sceneSettings.bgColor}
              onChange={(v) => handleSceneChange({ bgColor: v })}
            />

            {/*
              Grid scale — how many real-world feet one grid square represents.
              Stored in measurementStore so MeasureLayer distance labels are
              always in sync without any extra wiring.
            */}
            <NumberField
              label="Grid Scale"
              value={feetPerSquare}
              min={1}
              unit="ft per square"
              onChange={setFeetPerSquare}
            />
            <div className="flex gap-1.5 -mt-1">
              {[5, 10].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setFeetPerSquare(preset)}
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

            {/* Map dimensions */}
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

      {/* ── Game settings ───────────────────────────────────────────────── */}
      <Section title="Game Settings">
        <Field label="Game Name">
          <input
            type="text"
            value={gameSettings.gameName}
            onChange={(e) => handleGameChange({ gameName: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition-colors"
          />
        </Field>
        <SliderField
          label="Default Grid Size for New Scenes"
          value={gameSettings.defaultGridSize}
          min={20}
          max={200}
          step={5}
          unit="px"
          onChange={(v) => handleGameChange({ defaultGridSize: v })}
        />
        {/*
          Game-level bgColor removed — background is per-scene and is now
          correctly set in Scene Settings above.
        */}
        <p className="text-[10px] text-white/20 text-center">
          Changes save automatically
        </p>
      </Section>
    </div>
  );
}
