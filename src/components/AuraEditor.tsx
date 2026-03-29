/**
 * AuraEditor — lets GMs and players add, edit, and remove auras on a token.
 *
 * Usage: drop inside your TokenContextMenu / stats edit panel.
 * It manages its own local state and calls onChange when committed.
 *
 * Example:
 *   <AuraEditor
 *     auras={token.stats_json?.auras ?? []}
 *     gridSize={gridSize}
 *     feetPerSquare={feetPerSquare}
 *     onChange={(auras) => onEditStats(token.id, { ...stats, auras })}
 *   />
 */
import { useState } from "react";

export interface Aura {
  radius: number; // world units (px at zoom=1)
  color: string;
  label?: string;
}

interface AuraEditorProps {
  auras: Aura[];
  gridSize: number;
  feetPerSquare: number;
  onChange: (auras: Aura[]) => void;
  canEdit: boolean;
  tokenSize: number;
}

const PRESET_COLORS = [
  "#60a5fa", // blue
  "#4ade80", // green
  "#f87171", // red
  "#fbbf24", // amber
  "#a78bfa", // purple
  "#f472b6", // pink
  "#34d399", // emerald
  "#fb923c", // orange
];

function feetToWorld(
  feet: number,
  gridSize: number,
  feetPerSquare: number,
): number {
  return (feet / feetPerSquare) * gridSize;
}

function worldToFeet(
  world: number,
  gridSize: number,
  feetPerSquare: number,
): number {
  return Math.round((world / gridSize) * feetPerSquare);
}

export default function AuraEditor({
  auras,
  gridSize,
  feetPerSquare,
  onChange,
  canEdit,
}: AuraEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (index: number, patch: Partial<Aura>) => {
    const next = auras.map((a, i) => (i === index ? { ...a, ...patch } : a));
    onChange(next);
  };

  const add = () => {
    onChange([
      ...auras,
      {
        radius: feetToWorld(10, gridSize, feetPerSquare),
        color: PRESET_COLORS[auras.length % PRESET_COLORS.length],
      },
    ]);
    setExpanded(true);
  };

  const remove = (index: number) => {
    onChange(auras.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-1.5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1.5 text-[10px] text-white/40 uppercase tracking-widest font-medium hover:text-white/70 transition-colors"
        >
          <span
            className={`transition-transform text-[8px] ${expanded ? "rotate-90" : ""}`}
          >
            ▶
          </span>
          Auras{" "}
          {auras.length > 0 && (
            <span className="text-amber-400/70">({auras.length})</span>
          )}
        </button>
        {canEdit && (
          <button
            onClick={add}
            className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors px-1.5 py-0.5 rounded border border-amber-500/20 hover:border-amber-500/40"
          >
            + Add
          </button>
        )}
      </div>

      {/* Aura list */}
      {expanded && (
        <div className="flex flex-col gap-2 pl-2">
          {auras.length === 0 && (
            <p className="text-[10px] text-white/25 italic">
              No auras — click + Add
            </p>
          )}

          {auras.map((aura, i) => {
            const feet = worldToFeet(aura.radius, gridSize, feetPerSquare);
            return (
              <div
                key={i}
                className="flex flex-col gap-1.5 p-2 rounded-lg bg-white/4 border border-white/8"
              >
                {/* Preview swatch + label */}
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 rounded-full border-2 flex-shrink-0"
                    style={{
                      backgroundColor: aura.color + "33",
                      borderColor: aura.color,
                    }}
                  />
                  {canEdit ? (
                    <input
                      type="text"
                      value={aura.label ?? ""}
                      onChange={(e) => update(i, { label: e.target.value })}
                      placeholder="Label (optional)"
                      className="flex-1 min-w-0 bg-transparent text-xs text-white/70
                        border-b border-white/15 focus:border-amber-500/50 focus:outline-none
                        placeholder-white/20"
                    />
                  ) : (
                    <span className="text-xs text-white/60">
                      {aura.label || "Aura"}
                    </span>
                  )}
                  {canEdit && (
                    <button
                      onClick={() => remove(i)}
                      className="text-red-400/40 hover:text-red-400 text-xs flex-shrink-0 transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {canEdit && (
                  <div className="flex items-center gap-3">
                    {/* Radius in feet */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] text-white/30 uppercase tracking-wider">
                        Radius
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={600}
                        step={5}
                        value={feet}
                        onChange={(e) =>
                          update(i, {
                            radius: feetToWorld(
                              Number(e.target.value),
                              gridSize,
                              feetPerSquare,
                            ),
                          })
                        }
                        className="w-14 bg-white/5 border border-white/10 rounded px-2 py-0.5
                          text-xs text-white text-center focus:outline-none focus:border-amber-500/50
                          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none
                          [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-[9px] text-white/30">ft</span>
                    </div>

                    {/* Color picker + presets */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => update(i, { color: c })}
                          className="w-4 h-4 rounded-full border transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor:
                              aura.color === c ? "white" : "transparent",
                            transform:
                              aura.color === c ? "scale(1.2)" : "scale(1)",
                          }}
                        />
                      ))}
                      {/* Custom color input */}
                      <input
                        type="color"
                        value={aura.color}
                        onChange={(e) => update(i, { color: e.target.value })}
                        className="w-4 h-4 rounded cursor-pointer border-0 bg-transparent p-0"
                        title="Custom color"
                      />
                    </div>
                  </div>
                )}

                {/* Read-only display */}
                {!canEdit && (
                  <div className="flex items-center gap-2 text-[10px] text-white/40">
                    <span>{feet}ft radius</span>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: aura.color }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
