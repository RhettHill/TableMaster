/**
 * VisionRadiusControl
 *
 * Shown in the toolbar for non-GM players when visibility mode is "lighting".
 * Lets the player set their own token's vision_radius (in world units at scale=1)
 * so the dynamic lighting accurately reflects their character's sight range.
 *
 * Note: FogLayer multiplies the stored radius by token_size at render time,
 * so we always store the radius for a size-1 token here.
 */
import { useState, useCallback } from "react";
import { useGameStore } from "../../store/gameStore";
import { useMeasurementStore } from "../../store/MeasurementStore";

interface VisionRadiusControlProps {
  currentUserId: string;
  onEditStats: (
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

// Standard D&D vision presets in feet
const VISION_PRESETS_FT = [
  { label: "Normal (60ft)", ft: 60 },
  { label: "Darkvision (120ft)", ft: 120 },
  { label: "Blind", ft: 0 },
];

function feetToWorld(
  feet: number,
  gridSize: number,
  feetPerSquare: number,
): number {
  return (feet / feetPerSquare) * gridSize;
}

export default function VisionRadiusControl({
  currentUserId,
  onEditStats,
}: VisionRadiusControlProps) {
  const tokens = useGameStore((s) => s.tokens);
  const { gridSize } = useGameStore((s) => s.sceneSettings);
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  const [open, setOpen] = useState(false);

  // Find this player's own editable token
  const myToken =
    tokens.find((t) => t.player_editable && t.owner_id === currentUserId) ??
    tokens.find((t) => t.player_editable && !t.owner_id);

  // vision_radius in store is stored at scale=1 world units
  // Convert to feet for display
  const storedRadiusWorld = myToken?.stats_json?.vision_radius ?? 0;
  const currentFt =
    storedRadiusWorld > 0
      ? Math.round((storedRadiusWorld / gridSize) * feetPerSquare)
      : 0;

  const applyFeet = useCallback(
    (ft: number) => {
      if (!myToken) return;
      // Store as scale-1 world units; FogLayer scales by token_size at render time
      const worldRadius = ft > 0 ? feetToWorld(ft, gridSize, feetPerSquare) : 0;
      const existing = myToken.stats_json;
      onEditStats(myToken.id, {
        hp: existing?.hp ?? 0,
        maxHp: existing?.maxHp ?? 0,
        ac: existing?.ac ?? 10,
        showStats: existing?.showStats ?? false,
        vision_radius: worldRadius,
        darkvision: existing?.darkvision ?? 0,
      });
      setOpen(false);
    },
    [myToken, gridSize, feetPerSquare, onEditStats],
  );

  if (!myToken) return null;

  return (
    <div className="relative group">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Set your vision range"
        className={`
          pointer-events-auto w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-0.5
          transition-all duration-150 border text-base
          ${
            open
              ? "bg-sky-500/20 border-sky-500/50 text-sky-400"
              : "bg-black/40 border-white/10 text-white/50 hover:bg-white/10 hover:text-white/80 hover:border-white/20"
          }
        `}
      >
        <span className="text-sm leading-none">👁</span>
        <span className="text-[8px] leading-none tracking-wide opacity-70">
          {currentFt > 0 ? `${currentFt}ft` : "—"}
        </span>
      </button>

      {!open && (
        <div className="absolute left-12 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
          <div className="bg-black/90 border border-white/15 rounded-md px-2.5 py-1.5 whitespace-nowrap">
            <span className="text-white/80 text-xs">Vision Range</span>
          </div>
        </div>
      )}

      {open && (
        <div
          className="absolute left-12 top-0 z-50 pointer-events-auto
          bg-black/90 border border-white/15 rounded-xl shadow-2xl
          backdrop-blur-md p-2 flex flex-col gap-1 min-w-[180px]"
        >
          <p className="text-[10px] text-white/40 uppercase tracking-widest px-2 pb-1">
            Vision Range
          </p>

          {VISION_PRESETS_FT.map((preset) => {
            const active = currentFt === preset.ft;
            return (
              <button
                key={preset.label}
                onClick={() => applyFeet(preset.ft)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left transition-all
                  ${
                    active
                      ? "bg-sky-500/20 border border-sky-500/30 text-sky-300"
                      : "text-white/60 hover:bg-white/8 hover:text-white/90 border border-transparent"
                  }`}
              >
                {active && <span className="text-sky-400">✓</span>}
                {!active && <span className="w-3" />}
                {preset.label}
              </button>
            );
          })}

          <div className="border-t border-white/10 mt-1 pt-1 px-2">
            <p className="text-[9px] text-white/25 mb-1">Custom (feet)</p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={600}
                step={5}
                defaultValue={currentFt}
                onKeyDown={(e) => {
                  if (e.key === "Enter")
                    applyFeet(Number((e.target as HTMLInputElement).value));
                }}
                className="w-16 bg-white/5 border border-white/15 rounded px-2 py-1 text-xs
                  text-white text-center focus:outline-none focus:border-sky-500/50
                  [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                  [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget
                    .previousSibling as HTMLInputElement;
                  applyFeet(Number(input.value));
                }}
                className="text-[10px] px-2 py-1 rounded bg-sky-500/20 border border-sky-500/30
                  text-sky-300 hover:bg-sky-500/30 transition-colors"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
