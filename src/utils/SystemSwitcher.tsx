// src/components/tabletop/SystemSwitcher.tsx
//
// Manages system selection in the Custom System Builder.
//
// Mental model:
//   activeSystemId  = what's saved in the DB right now (game's real system)
//   selectedId      = what the user clicked to view/edit (local only)
//   isDirty         = working copy has unsaved edits
//
// Clicking a system loads its template into the editor but does NOT touch the DB.
// Pressing "Save & Activate" in the parent is the only thing that writes to DB.

import type { SectionDef } from "../components/sheets/GenericSheet";

export interface SystemOption {
  id: string;
  name: string;
  slug: string;
  isCustom: boolean;
}

// ── Synthetic templates for built-in systems ──────────────────────────────────
// Mirrors the key fields in Dnd5eSheet / Pf2eSheet so the editor gives a
// meaningful starting point when the GM wants to customise a built-in system.
export const BUILTIN_TEMPLATES: Record<string, { sections: SectionDef[] }> = {
  dnd5e: {
    sections: [
      {
        title: "Character Info",
        columns: 2,
        fields: [
          { key: "characterName", label: "Character Name", type: "text" },
          { key: "playerName", label: "Player Name", type: "text" },
          { key: "race", label: "Race", type: "text" },
          { key: "class", label: "Class", type: "text" },
          { key: "subclass", label: "Subclass", type: "text" },
          { key: "background", label: "Background", type: "text" },
          { key: "alignment", label: "Alignment", type: "text" },
          { key: "level", label: "Level", type: "number", min: 1, max: 20 },
        ],
      },
      {
        title: "Ability Scores",
        columns: 3,
        fields: [
          { key: "str", label: "STR", type: "number", min: 1, max: 30 },
          { key: "dex", label: "DEX", type: "number", min: 1, max: 30 },
          { key: "con", label: "CON", type: "number", min: 1, max: 30 },
          { key: "int", label: "INT", type: "number", min: 1, max: 30 },
          { key: "wis", label: "WIS", type: "number", min: 1, max: 30 },
          { key: "cha", label: "CHA", type: "number", min: 1, max: 30 },
        ],
      },
      {
        title: "Combat",
        columns: 3,
        fields: [
          { key: "hp", label: "HP", type: "number" },
          { key: "maxHp", label: "Max HP", type: "number" },
          { key: "tempHp", label: "Temp HP", type: "number" },
          { key: "ac", label: "AC", type: "number" },
          { key: "speed", label: "Speed", type: "number" },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [
          { key: "equipment", label: "Equipment", type: "textarea" },
          {
            key: "featuresTraits",
            label: "Features & Traits",
            type: "textarea",
          },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      },
    ],
  },

  pf2e: {
    sections: [
      {
        title: "Character Info",
        columns: 2,
        fields: [
          { key: "characterName", label: "Character Name", type: "text" },
          { key: "playerName", label: "Player Name", type: "text" },
          { key: "ancestry", label: "Ancestry", type: "text" },
          { key: "heritage", label: "Heritage", type: "text" },
          { key: "characterClass", label: "Class", type: "text" },
          { key: "background", label: "Background", type: "text" },
          { key: "level", label: "Level", type: "number", min: 1, max: 20 },
          { key: "xp", label: "XP", type: "number" },
          { key: "alignment", label: "Alignment", type: "text" },
          { key: "deity", label: "Deity", type: "text" },
        ],
      },
      {
        title: "Ability Scores",
        columns: 3,
        fields: [
          { key: "str", label: "STR", type: "number", min: 1, max: 30 },
          { key: "dex", label: "DEX", type: "number", min: 1, max: 30 },
          { key: "con", label: "CON", type: "number", min: 1, max: 30 },
          { key: "int", label: "INT", type: "number", min: 1, max: 30 },
          { key: "wis", label: "WIS", type: "number", min: 1, max: 30 },
          { key: "cha", label: "CHA", type: "number", min: 1, max: 30 },
        ],
      },
      {
        title: "Combat",
        columns: 3,
        fields: [
          { key: "hp", label: "HP", type: "number" },
          { key: "maxHp", label: "Max HP", type: "number" },
          { key: "ac", label: "AC", type: "number" },
          { key: "speed", label: "Speed", type: "number" },
          { key: "perception", label: "Perception", type: "number" },
          {
            key: "heroPoints",
            label: "Hero Points",
            type: "number",
            min: 0,
            max: 3,
          },
        ],
      },
      {
        title: "Saving Throws",
        columns: 3,
        fields: [
          { key: "fortitude", label: "Fortitude", type: "number" },
          { key: "reflex", label: "Reflex", type: "number" },
          { key: "will", label: "Will", type: "number" },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [
          { key: "backstory", label: "Backstory", type: "textarea" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      },
    ],
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

interface SystemSwitcherProps {
  options: SystemOption[];
  /** System currently saved as active in the DB */
  activeSystemId: string | null;
  /** System the user is currently viewing/editing (local selection) */
  selectedId: string | null;
  /** Whether the working copy has edits not yet saved */
  isDirty: boolean;
  /** User clicked a system to view/edit it */
  onSelect: (option: SystemOption) => void;
}

export default function SystemSwitcher({
  options,
  activeSystemId,
  selectedId,
  isDirty,
  onSelect,
}: SystemSwitcherProps) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
          Active System for This Game
        </p>
        {isDirty && (
          <span className="text-[10px] text-amber-400/70">
            ✎ Unsaved changes
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        {options.map((opt) => {
          const isActive = opt.id === activeSystemId;
          const isSelected = opt.id === selectedId;

          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all
                ${
                  isSelected
                    ? opt.isCustom
                      ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                      : "bg-sky-500/15 border-sky-500/40 text-sky-300"
                    : "bg-white/4 border-white/8 text-white/50 hover:bg-white/8 hover:border-white/15"
                }`}
            >
              <span className="text-sm flex-shrink-0">
                {opt.isCustom ? "⚙" : "📋"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{opt.name}</p>
                <p className="text-[10px] text-white/30">
                  {opt.isCustom ? "Your custom template" : "Built-in system"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {isActive && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold
                    ${
                      opt.isCustom
                        ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                        : "bg-sky-500/15 border-sky-500/30 text-sky-400"
                    }`}
                  >
                    Active
                  </span>
                )}
                {isSelected && !isActive && (
                  <span className="text-[10px] text-white/30 italic">
                    Editing
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-[9px] text-white/20 leading-relaxed">
        Click a system to edit it. Press{" "}
        <span className="text-white/40 font-semibold">Save &amp; Activate</span>{" "}
        to apply. Switching systems discards unsaved edits.
      </p>
    </div>
  );
}
