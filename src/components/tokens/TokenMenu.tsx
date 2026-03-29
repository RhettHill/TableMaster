import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Token, TokenStats } from "../../types/Types";
import type { GridType } from "../../utils/GridUtils";
import AuraEditor, { Aura } from "../AuraEditor";

interface TokenContextMenuProps {
  token: Token;
  gridType: GridType;
  screenX: number;
  screenY: number;
  gridSize: number;
  feetPerSquare: number;
  isGM: boolean;
  onRename: (id: string, name: string) => void;
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
      auras: Aura[];
    },
  ) => void;
  onSetTokenSize: (id: string, size: number) => void;
  onDelete: (id: string) => void;
  onOpenSheet: (id: string) => void;
  onOpenStatBlock?: (id: string) => void;
  onAssignStatBlock?: (id: string) => void;
  hasStatBlock?: boolean;
  onClose: () => void;
}

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;
  const color =
    pct > 0.5 ? "bg-emerald-500" : pct > 0.25 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}

function MenuItem({
  icon,
  label,
  onClick,
  danger = false,
  right,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors duration-100 ${
        danger
          ? "text-red-400/80 hover:bg-red-500/10 hover:text-red-400"
          : "text-white/65 hover:bg-white/7 hover:text-white/90"
      }`}
    >
      <span className="text-base w-4 text-center flex-shrink-0">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {right}
    </button>
  );
}

function TogglePill({ value }: { value: boolean }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded border ${
        value
          ? "bg-amber-500/20 border-amber-500/30 text-amber-300"
          : "bg-white/5 border-white/10 text-white/30"
      }`}
    >
      {value ? "On" : "Off"}
    </span>
  );
}

export default function TokenContextMenu({
  token,
  gridType,
  screenX,
  screenY,
  gridSize,
  feetPerSquare,
  isGM,
  onRename,
  onToggleVisibility,
  onTogglePlayerEditable,
  onEditStats,
  onSetTokenSize,
  onDelete,
  onOpenSheet,
  onOpenStatBlock,
  onAssignStatBlock,
  hasStatBlock,
  onClose,
}: TokenContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<null | "rename" | "stats">(null);
  const [nameInput, setNameInput] = useState(token.name ?? "");

  const stats = token.stats_json as TokenStats | null;
  const [hp, setHp] = useState(stats?.hp ?? 10);
  const [maxHp, setMaxHp] = useState(stats?.maxHp ?? 10);
  const [ac, setAc] = useState(stats?.ac ?? 10);
  const [showStats, setShowStats] = useState(stats?.showStats ?? false);
  const [vision_radius, setVisionRadius] = useState(stats?.vision_radius ?? 0);
  const darkvision = stats?.darkvision ?? 0;
  // Auras — safe extraction from stats_json (may be typed loosely)
  const [auras, setAuras] = useState<Aura[]>(() => {
    const raw = (stats as any)?.auras;
    return Array.isArray(raw) ? raw : [];
  });

  const [sizeInput, setSizeInput] = useState(token.token_size ?? 1);
  const [pos, setPos] = useState({ x: screenX, y: screenY });

  const canEdit = isGM || token.player_editable;

  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      x:
        screenX + rect.width > window.innerWidth
          ? screenX - rect.width
          : screenX,
      y:
        screenY + rect.height > window.innerHeight
          ? screenY - rect.height
          : screenY,
    });
  }, [screenX, screenY, mode]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const commitRename = () => {
    const name = nameInput.trim();
    if (name && name !== token.name) onRename(token.id, name);
    onClose();
  };

  const commitStats = () => {
    onEditStats(token.id, {
      hp,
      maxHp,
      ac,
      showStats,
      vision_radius,
      darkvision,
      auras,
    });
    onClose();
  };

  const sizeLabel =
    gridType === "hex"
      ? `${sizeInput.toFixed(1)}× hex`
      : `${sizeInput.toFixed(1)}× cells`;

  const inputCls =
    "w-full bg-white/5 border border-white/15 rounded-md px-2.5 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/60 transition-colors";
  const numInputCls =
    "w-full bg-white/5 border border-white/15 rounded-md px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-amber-500/60 transition-colors tabular-nums";

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[200] w-64 rounded-xl border border-white/12 bg-[#0f0f1c]/97 backdrop-blur-md shadow-2xl shadow-black/60 overflow-hidden"
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-2 border-b border-white/8">
        <div className="flex items-center gap-2">
          {token.image_url ? (
            <img
              src={token.image_url}
              className="w-7 h-7 rounded-full object-cover flex-shrink-0 ring-1 ring-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0 text-white/60">
              {token.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white/90 text-sm font-medium truncate">
              {token.name}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span
                className={`text-[10px] ${token.visible ? "text-white/30" : "text-amber-400/70"}`}
              >
                {token.visible ? "Visible" : "Hidden"}
              </span>
              <span className="text-[10px] text-white/20">·</span>
              <span className="text-[10px] text-white/30">
                Size {sizeLabel}
              </span>
              {token.player_editable && (
                <>
                  <span className="text-[10px] text-white/20">·</span>
                  <span className="text-[10px] text-emerald-400/70">
                    Editable
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        {stats?.maxHp ? (
          <div className="mt-2 flex flex-col gap-1">
            <div className="flex justify-between text-[10px] text-white/40">
              <span>
                HP {stats.hp ?? "?"} / {stats.maxHp}
              </span>
              <span>AC {stats.ac ?? "?"}</span>
            </div>
            <HpBar hp={stats.hp ?? 0} maxHp={stats.maxHp} />
          </div>
        ) : null}
      </div>

      {/* ── Rename mode ────────────────────────────────────────────────────── */}
      {mode === "rename" && (
        <div className="px-3 py-2.5 border-b border-white/8 flex flex-col gap-2">
          <input
            autoFocus
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setMode(null);
            }}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              onClick={commitRename}
              className="flex-1 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-all"
            >
              Save
            </button>
            <button
              onClick={() => setMode(null)}
              className="flex-1 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/50 text-xs border border-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Stats mode ──────────────────────────────────────────────────────── */}
      {mode === "stats" && (
        <div className="px-3 py-2.5 border-b border-white/8 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
          {/* HP / Max / AC */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "HP", value: hp, set: setHp, min: 0 },
              { label: "Max", value: maxHp, set: setMaxHp, min: 1 },
              { label: "AC", value: ac, set: setAc, min: 0 },
            ].map(({ label, value, set, min }) => (
              <div key={label} className="flex flex-col gap-1">
                <label className="text-[10px] text-white/30 text-center uppercase tracking-wider">
                  {label}
                </label>
                <input
                  type="number"
                  value={value}
                  min={min}
                  onChange={(e) => set(Number(e.target.value))}
                  className={numInputCls}
                />
              </div>
            ))}
          </div>
          <HpBar hp={hp} maxHp={maxHp} />

          {/* Vision radius (in world units) — shown as feet */}
          {isGM && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-white/30 uppercase tracking-wider w-20 flex-shrink-0">
                Vision
              </span>
              <input
                type="number"
                min={0}
                step={5}
                value={
                  feetPerSquare > 0 && gridSize > 0
                    ? Math.round((vision_radius / gridSize) * feetPerSquare)
                    : vision_radius
                }
                onChange={(e) => {
                  const ft = Number(e.target.value);
                  setVisionRadius(
                    feetPerSquare > 0 && gridSize > 0
                      ? (ft / feetPerSquare) * gridSize
                      : ft,
                  );
                }}
                className="w-16 bg-white/5 border border-white/10 rounded px-2 py-0.5 text-xs text-white text-center
                  focus:outline-none focus:border-amber-500/50 [appearance:textfield]
                  [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-[10px] text-white/30">ft</span>
            </div>
          )}

          {/* Aura editor */}
          <AuraEditor
            auras={auras}
            gridSize={gridSize}
            feetPerSquare={feetPerSquare}
            canEdit={canEdit}
            onChange={setAuras}
            tokenSize={token.scale}
          />

          {/* Show stats toggle — GM only */}
          {isGM && (
            <button
              onClick={() => setShowStats((v) => !v)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/4 hover:bg-white/8 border border-white/8 transition-all"
            >
              <span className="text-xs text-white/50">Show bar on token</span>
              <TogglePill value={showStats} />
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={commitStats}
              className="flex-1 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold border border-amber-500/20 transition-all"
            >
              Save
            </button>
            <button
              onClick={() => setMode(null)}
              className="flex-1 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/50 text-xs border border-white/10 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Menu items ──────────────────────────────────────────────────────── */}
      {mode === null && (
        <div className="py-1">
          {token.player_editable && (
            <MenuItem
              icon="📋"
              label="Character Sheet"
              onClick={() => {
                onOpenSheet(token.id);
                onClose();
              }}
            />
          )}
          {isGM &&
            !token.player_editable &&
            hasStatBlock &&
            onOpenStatBlock && (
              <MenuItem
                icon="📜"
                label="View Stat Block"
                onClick={() => {
                  onOpenStatBlock(token.id);
                  onClose();
                }}
              />
            )}
          {isGM && !token.player_editable && onAssignStatBlock && (
            <MenuItem
              icon="🔗"
              label={hasStatBlock ? "Reassign Stat Block" : "Assign Stat Block"}
              onClick={() => {
                onAssignStatBlock(token.id);
                onClose();
              }}
            />
          )}
          {canEdit && (
            <MenuItem
              icon="✏"
              label="Rename"
              onClick={() => setMode("rename")}
            />
          )}
          {canEdit && (
            <div className="px-3 py-2 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">
                  Size
                </span>
                <span className="text-[10px] text-white/50 tabular-nums">
                  {sizeLabel}
                </span>
              </div>
              <input
                type="range"
                min={0.5}
                max={5}
                step={0.25}
                value={sizeInput}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSizeInput(v);
                  onSetTokenSize(token.id, v);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-white/20">
                <span>0.5×</span>
                <span>5×</span>
              </div>
            </div>
          )}
          {canEdit && (
            <MenuItem
              icon="❤"
              label="Edit HP / AC"
              onClick={() => setMode("stats")}
              right={stats?.showStats ? <TogglePill value={true} /> : undefined}
            />
          )}
          {isGM && (
            <>
              <MenuItem
                icon={token.visible ? "👁" : "👁‍🗨"}
                label={token.visible ? "Hide from players" : "Show to players"}
                onClick={() => {
                  onToggleVisibility(token.id, !token.visible);
                  onClose();
                }}
              />
              <MenuItem
                icon={token.player_editable ? "🔒" : "🔓"}
                label={
                  token.player_editable
                    ? "Revoke player control"
                    : "Grant player control"
                }
                onClick={() => {
                  onTogglePlayerEditable(token.id, !token.player_editable);
                  onClose();
                }}
                right={
                  token.player_editable ? (
                    <TogglePill value={true} />
                  ) : undefined
                }
              />
              <div className="mx-3 my-1 h-px bg-white/8" />
              <MenuItem
                icon="🗑"
                label="Delete token"
                danger
                onClick={() => {
                  if (window.confirm(`Delete ${token.name}?`)) {
                    onDelete(token.id);
                    onClose();
                  }
                }}
              />
            </>
          )}
          {!canEdit && (
            <p className="px-3 py-3 text-xs text-white/25 text-center">
              This token is GM controlled
            </p>
          )}
        </div>
      )}
    </div>,
    document.body,
  );
}
