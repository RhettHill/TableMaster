import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

// ── Dice Parser ─────────────────────────────────────────────────────────────

interface RollGroup {
  die: number;
  rolls: number[];
  kept: number[];
  dropped: number[];
  exploding: boolean;
}

interface RollResult {
  formula: string;
  groups: RollGroup[];
  modifier: number;
  total: number;
  timestamp: Date;
  natural?: number;
}

function parseDiceFormula(input: string): RollResult | null {
  const formula = input.trim().toLowerCase().replace(/\s/g, "");
  if (!formula) return null;

  const parts = formula.split(/(?=[+-])/);
  const groups: RollGroup[] = [];
  let modifier = 0;

  for (const part of parts) {
    if (/^[+-]\d+$/.test(part)) {
      modifier += parseInt(part, 10);
      continue;
    }

    const match = part.match(/^([+-]?)(\d*)d(\d+)(!?)((kh|kl)(\d+))?$/);
    if (!match) return null;

    const sign = match[1] === "-" ? -1 : 1;
    const count = parseInt(match[2] || "1", 10);
    const die = parseInt(match[3], 10);
    const exploding = match[4] === "!";
    const keepType = match[6] as "kh" | "kl" | undefined;
    const keepCount = match[7] ? parseInt(match[7], 10) : undefined;

    let rolls: number[] = [];
    for (let i = 0; i < count; i++) {
      let roll = Math.floor(Math.random() * die) + 1;
      rolls.push(roll);
      if (exploding) {
        while (roll === die) {
          roll = Math.floor(Math.random() * die) + 1;
          rolls.push(roll);
        }
      }
    }

    let kept = [...rolls];
    let dropped: number[] = [];
    if (keepType && keepCount !== undefined && keepCount < rolls.length) {
      rolls.sort((a, b) => a - b);
      if (keepType === "kh") {
        kept = rolls.slice(-keepCount);
        dropped = rolls.slice(0, rolls.length - keepCount);
      } else {
        kept = rolls.slice(0, keepCount);
        dropped = rolls.slice(keepCount);
      }
    }

    groups.push({
      die,
      rolls: rolls.map((r) => r * sign),
      kept: kept.map((r) => r * sign),
      dropped: dropped.map((r) => r * sign),
      exploding,
    });
  }

  const total =
    groups.reduce((sum, g) => sum + g.kept.reduce((a, b) => a + b, 0), 0) +
    modifier;

  const natural =
    groups.length === 1 && groups[0].die === 20 && groups[0].rolls.length === 1
      ? groups[0].rolls[0]
      : undefined;

  return {
    formula: input,
    groups,
    modifier,
    total,
    timestamp: new Date(),
    natural,
  };
}

// ── Dice Roller Component ───────────────────────────────────────────────────

const QUICK_DICE = [4, 6, 8, 10, 12, 20, 100];
const DEFAULT_POS = { x: window.innerWidth - 360, y: window.innerHeight - 520 };

interface DiceRollerProps {
  onClose: () => void;
}

export default function DiceRoller({ onClose }: DiceRollerProps) {
  const [formula, setFormula] = useState("1d20");
  const [history, setHistory] = useState<RollResult[]>([]);
  const [lastRoll, setLastRoll] = useState<RollResult | null>(null);
  const [error, setError] = useState("");
  const [expandedHistory, setExpandedHistory] = useState<
    Record<number, boolean>
  >({});
  const [showTooltip, setShowTooltip] = useState(false);

  const [pos, setPos] = useState(DEFAULT_POS);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => {
    if (historyRef.current) historyRef.current.scrollTop = 0;
  }, [history]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      dragging.current = true;
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const panel = panelRef.current;
      const W = panel?.offsetWidth ?? 320;
      const H = panel?.offsetHeight ?? 400;
      setPos({
        x: Math.max(
          0,
          Math.min(window.innerWidth - W, e.clientX - dragOffset.current.x),
        ),
        y: Math.max(
          0,
          Math.min(window.innerHeight - H, e.clientY - dragOffset.current.y),
        ),
      });
    };
    const onMouseUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const rollColor = (r: RollResult) =>
    r.natural === 20
      ? "text-amber-400"
      : r.natural === 1
        ? "text-red-400"
        : "text-white";
  const rollLabel = (r: RollResult) =>
    r.natural === 20 ? "Nat 20!" : r.natural === 1 ? "Nat 1" : null;

  const roll = (formulaOverride?: string) => {
    const f = formulaOverride ?? formula;
    const result = parseDiceFormula(f);
    if (!result) {
      setError(`Invalid formula: "${f}"`);
      return;
    }
    setError("");
    setLastRoll(result);
    setHistory((prev) => [result, ...prev].slice(0, 50));
    if (formulaOverride) setFormula(formulaOverride);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") roll();
    if (e.key === "Escape") onClose();
  };

  const dieClass = (res: number, g: RollGroup) => {
    if (g.kept.includes(res))
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    if (g.dropped.includes(res))
      return "border-white/20 bg-white/5 text-white/30 line-through";
    return "border-white/10 bg-white/5 text-white/50";
  };

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[150] w-80 flex flex-col rounded-2xl border border-white/10 bg-[#0f0f1c]/97 backdrop-blur-md shadow-2xl max-h-[80vh]"
      style={{ left: pos.x, top: pos.y }}
      onKeyDown={handleKeyDown}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute top-[-6rem] left-0 w-full bg-[#1a1a2e]/90 border border-white/10 rounded-lg p-2 text-[10px] text-white/70 font-mono shadow-lg z-50">
          <p className="mb-1">
            <strong>Dice Notation Guide:</strong>
          </p>
          <ul className="list-disc ml-4 space-y-0.5">
            <li>
              <code>NdM</code> – Roll N dice of M sides (e.g., <code>2d6</code>)
            </li>
            <li>
              <code>!</code> – Exploding dice (e.g., <code>1d6!</code>)
            </li>
            <li>
              <code>khX</code> – Keep highest X rolls (e.g., <code>4d6kh3</code>
              )
            </li>
            <li>
              <code>klX</code> – Keep lowest X rolls (e.g., <code>4d6kl2</code>)
            </li>
            <li>
              <code>+N / -N</code> – Add or subtract modifier
            </li>
            <li>
              Combine multiple (e.g., <code>2d6+1d4+3</code>)
            </li>
          </ul>
        </div>
      )}

      {error && <p className="text-red-400/70 text-xs mt-1.5 px-1">{error}</p>}
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-white/8 flex-shrink-0 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={onMouseDown}
      >
        <span className="text-white/80 text-sm font-semibold flex items-center gap-2">
          <span className="text-white/30 text-xs">⠿</span> 🎲 Dice Roller
        </span>
        <button
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Formula Input with Tooltip */}
      <div className="px-3 py-2.5 border-b border-white/8 flex-shrink-0 relative">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={formula}
            onChange={(e) => {
              setFormula(e.target.value);
              setError("");
            }}
            placeholder="e.g. 2d6+1d4-1"
            className="flex-1 min-w-0 bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none font-mono transition-colors"
            onFocus={() => setShowTooltip(true)}
            onBlur={() => setShowTooltip(false)}
          />
          <button
            onClick={() => roll()}
            className="px-4 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/25 hover:border-amber-500/50 text-amber-400 text-sm font-bold transition-all"
          >
            Roll
          </button>
        </div>
      </div>

      {/* Last Roll */}
      {lastRoll && (
        <div className="flex flex-col items-center py-4 border-b border-white/8 flex-shrink-0">
          <span
            className={`text-5xl font-bold tabular-nums ${rollColor(lastRoll)}`}
          >
            {lastRoll.total}
          </span>
          <span className="text-white/40 text-xs mt-1">{lastRoll.formula}</span>
          {rollLabel(lastRoll) && (
            <span
              className={`text-xs font-bold mt-1 ${lastRoll.natural === 20 ? "text-amber-400" : "text-red-400"}`}
            >
              {rollLabel(lastRoll)}
            </span>
          )}
          <div className="flex flex-wrap justify-center gap-1 mt-2 px-4">
            {lastRoll.groups.flatMap((g, gi) =>
              g.rolls.map((r, idx) => (
                <span
                  key={`${gi}-${idx}`}
                  className={`px-2 py-0.5 rounded-md text-xs font-mono border flex items-center gap-1 ${dieClass(r, g)} ${g.exploding && r === g.die ? "animate-pulse" : ""}`}
                >
                  {r} {g.exploding && r === g.die ? "🔥" : ""}
                </span>
              )),
            )}
            {lastRoll.modifier !== 0 && (
              <span
                className={`px-2 py-0.5 rounded-md text-xs font-mono border ${lastRoll.modifier > 0 ? "border-green-400/50 bg-green-500/10 text-green-400" : "border-red-400/50 bg-red-500/10 text-red-400"}`}
              >
                {lastRoll.modifier > 0
                  ? `+${lastRoll.modifier}`
                  : lastRoll.modifier}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Quick Dice */}
      <div className="flex gap-1.5 px-3 py-2.5 border-b border-white/8 flex-shrink-0 flex-wrap">
        {QUICK_DICE.map((d) => (
          <button
            key={d}
            onClick={() => roll(`1d${d}`)}
            className="flex-1 min-w-0 py-1.5 rounded-lg bg-white/5 hover:bg-amber-500/15 border border-white/8 hover:border-amber-500/30 text-white/60 hover:text-amber-400 text-xs font-mono transition-all"
          >
            d{d}
          </button>
        ))}
      </div>

      {/* History */}
      {history.length > 1 && (
        <div ref={historyRef} className="flex-1 overflow-y-auto px-3 py-2">
          <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
            History
          </p>
          <div className="flex flex-col gap-1">
            {history.slice(1).map((r, i) => {
              const isExpanded = expandedHistory[i] ?? false;
              return (
                <div
                  key={i}
                  className="flex flex-col border-b border-white/10 rounded-lg hover:bg-white/4 transition-colors cursor-pointer"
                  onClick={() =>
                    setExpandedHistory((prev) => ({ ...prev, [i]: !prev[i] }))
                  }
                >
                  <div className="flex items-center justify-between py-1.5 px-2">
                    <span className="text-white/40 text-xs font-mono">
                      {r.formula}
                    </span>
                    <div className="flex items-center gap-2">
                      {rollLabel(r) && (
                        <span
                          className={`text-[10px] font-bold ${r.natural === 20 ? "text-amber-400/70" : "text-red-400/70"}`}
                        >
                          {rollLabel(r)}
                        </span>
                      )}
                      <span
                        className={`text-sm font-bold tabular-nums ${rollColor(r)}`}
                      >
                        {r.total}
                      </span>
                      <span className="text-white/20 text-[10px]">
                        {formatTime(r.timestamp)}
                      </span>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="flex flex-wrap gap-1 px-2 py-1">
                      {r.groups.flatMap((g, gi) =>
                        g.rolls.map((res, idx) => (
                          <span
                            key={`${gi}-${idx}`}
                            className={`px-2 py-0.5 rounded-md text-xs font-mono border flex items-center gap-1 ${dieClass(res, g)} ${g.exploding && res === g.die ? "animate-pulse" : ""}`}
                          >
                            {res} {g.exploding && res === g.die ? "🔥" : ""}
                          </span>
                        )),
                      )}
                      {r.modifier !== 0 && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-xs font-mono border ${r.modifier > 0 ? "border-green-400/50 bg-green-500/10 text-green-400" : "border-red-400/50 bg-red-500/10 text-red-400"}`}
                        >
                          {r.modifier > 0 ? `+${r.modifier}` : r.modifier}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
