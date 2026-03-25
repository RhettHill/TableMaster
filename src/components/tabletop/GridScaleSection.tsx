// ─────────────────────────────────────────────────────────────────────────────
// Drop this component into your SettingsPanel.tsx, inside the game settings
// section (wherever you render global/game-wide options).
//
// Import at the top of SettingsPanel.tsx:
//   import { useMeasurementStore } from "../../store/measurementStore"
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from "react";
import { useMeasurementStore } from "../../store/MeasurementStore";

export function GridScaleSection() {
  const feetPerSquare = useMeasurementStore((s) => s.feetPerSquare);
  const setFeetPerSquare = useMeasurementStore((s) => s.setFeetPerSquare);

  // Local string state so the user can type freely; committed on blur or Enter
  const [input, setInput] = useState(String(feetPerSquare));

  const commit = () => {
    const val = parseInt(input, 10);
    if (!isNaN(val) && val > 0) setFeetPerSquare(val);
    else setInput(String(feetPerSquare)); // reset on invalid input
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
        Grid Scale
      </p>

      <div className="flex items-center gap-2">
        <span className="text-white/40 text-xs flex-shrink-0">1 square =</span>
        <input
          type="number"
          min={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && commit()}
          className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white text-center font-mono focus:outline-none focus:border-amber-500/50 transition-colors
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-white/40 text-xs">ft</span>
      </div>

      {/* Quick presets */}
      <div className="flex gap-1.5">
        {[5, 10].map((preset) => (
          <button
            key={preset}
            onClick={() => {
              setFeetPerSquare(preset);
              setInput(String(preset));
            }}
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
    </div>
  );
}
