// src/components/sheets/StatBlockBuilder.tsx
//
// Generic stat block builder that lives inside CustomSystemBuilder.
// GMs define the NPC stat block layout using the same field-type system
// as the character sheet builder. The output is stored as `stat_block_template`
// on the systems row and used by GenericStatBlockPanel to render any NPC.
//
// This component is self-contained — import it in CustomSystemBuilder and
// render it in a new "Stat Block" tab.

import { useState, useCallback } from "react";
import type { FieldDef, SectionDef } from "../components/sheets/GenericSheet";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatBlockTemplate {
  sections: SectionDef[];
}

type FieldType = FieldDef["type"];

const FIELD_TYPES: {
  value: FieldType;
  label: string;
  icon: string;
  desc: string;
}[] = [
  {
    value: "text",
    label: "Text",
    icon: "Tt",
    desc: "Short text / string value",
  },
  { value: "number", label: "Number", icon: "##", desc: "Numeric stat" },
  {
    value: "textarea",
    label: "Block",
    icon: "¶",
    desc: "Multi-line description or trait",
  },
  { value: "checkbox", label: "Toggle", icon: "☑", desc: "Boolean flag" },
  { value: "select", label: "Dropdown", icon: "▾", desc: "Fixed choice list" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function makeField(label = "New Field", type: FieldType = "text"): FieldDef {
  return { key: `sb_${slugify(label)}_${Date.now()}`, label, type };
}

function makeSection(title = "New Section"): SectionDef {
  return { title, fields: [makeField()], columns: 2 };
}

// ── Default template GMs get on first open ────────────────────────────────────
// Covers the most common NPC attributes across RPG systems.
export const DEFAULT_GENERIC_STAT_BLOCK_TEMPLATE: StatBlockTemplate = {
  sections: [
    {
      title: "Identity",
      columns: 2,
      fields: [
        { key: "name", label: "Name", type: "text" },
        {
          key: "type",
          label: "Type",
          type: "text",
          placeholder: "Beast, Humanoid…",
        },
        {
          key: "size",
          label: "Size",
          type: "select",
          options: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"],
        },
        {
          key: "alignment",
          label: "Alignment",
          type: "text",
          placeholder: "Neutral Evil…",
        },
        {
          key: "cr",
          label: "CR / Threat",
          type: "text",
          placeholder: "1/2, 5, 12…",
        },
        { key: "xp", label: "XP", type: "number" },
      ],
    },
    {
      title: "Defenses",
      columns: 3,
      fields: [
        { key: "ac", label: "AC", type: "number" },
        { key: "hp", label: "HP", type: "number" },
        { key: "maxHp", label: "Max HP", type: "number" },
        { key: "speed", label: "Speed", type: "text", placeholder: "30 ft" },
      ],
    },
    {
      title: "Ability Scores",
      columns: 3,
      fields: [
        { key: "str", label: "STR", type: "number" },
        { key: "dex", label: "DEX", type: "number" },
        { key: "con", label: "CON", type: "number" },
        { key: "int", label: "INT", type: "number" },
        { key: "wis", label: "WIS", type: "number" },
        { key: "cha", label: "CHA", type: "number" },
      ],
    },
    {
      title: "Combat",
      columns: 1,
      fields: [
        {
          key: "attacks",
          label: "Attacks",
          type: "textarea",
          placeholder: "Claws +4, 1d6+2 slashing",
        },
        {
          key: "special_attacks",
          label: "Special Attacks",
          type: "textarea",
          placeholder: "Breath weapon, grapple…",
        },
      ],
    },
    {
      title: "Traits & Notes",
      columns: 1,
      fields: [
        {
          key: "traits",
          label: "Traits",
          type: "textarea",
          placeholder: "Darkvision 60ft, Pack Tactics…",
        },
        {
          key: "resistances",
          label: "Resistances",
          type: "textarea",
          placeholder: "Fire, Poison (immune)…",
        },
        { key: "notes", label: "Notes", type: "textarea" },
      ],
    },
  ],
};

// ── FieldRow ──────────────────────────────────────────────────────────────────

function FieldRow({
  field,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  field: FieldDef;
  onChange: (f: FieldDef) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const typeInfo = FIELD_TYPES.find((t) => t.value === field.type)!;

  return (
    <div className="group border border-white/8 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors overflow-hidden">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div className="flex flex-col gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="w-4 h-4 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 text-[10px] leading-none"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="w-4 h-4 flex items-center justify-center text-white/30 hover:text-white/70 disabled:opacity-20 text-[10px] leading-none"
          >
            ▼
          </button>
        </div>
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 text-[10px] font-bold font-mono">
          {typeInfo.icon}
        </span>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Field label"
          className="flex-1 min-w-0 bg-transparent text-sm text-white/80 placeholder-white/20 focus:outline-none border-b border-transparent focus:border-violet-500/40 transition-colors py-0.5"
        />
        <span className="text-[10px] font-mono text-white/20 flex-shrink-0 hidden sm:block">
          {field.key}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${expanded ? "bg-violet-500/20 text-violet-400" : "text-white/30 hover:text-white/70 hover:bg-white/5"}`}
          >
            {expanded ? "−" : "+"}
          </button>
          <button
            onClick={onDelete}
            className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/6 px-4 py-3 flex flex-col gap-3 bg-white/[0.02]">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/40 uppercase tracking-widest">
                Type
              </label>
              <div className="flex flex-wrap gap-1">
                {FIELD_TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() =>
                      onChange({
                        ...field,
                        type: t.value,
                        options:
                          t.value === "select" ? ["Option A"] : undefined,
                      })
                    }
                    title={t.desc}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${field.type === t.value ? "bg-violet-500/20 border-violet-500/40 text-violet-300" : "bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8"}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/40 uppercase tracking-widest">
                Data Key
              </label>
              <input
                type="text"
                value={field.key}
                onChange={(e) =>
                  onChange({
                    ...field,
                    key: slugify(e.target.value) || field.key,
                  })
                }
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 font-mono focus:outline-none focus:border-violet-500/40"
              />
            </div>
          </div>
          {(field.type === "text" ||
            field.type === "textarea" ||
            field.type === "number") && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/40 uppercase tracking-widest">
                Placeholder
              </label>
              <input
                type="text"
                value={field.placeholder ?? ""}
                onChange={(e) =>
                  onChange({ ...field, placeholder: e.target.value })
                }
                placeholder="Hint shown when empty…"
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-violet-500/40"
              />
            </div>
          )}
          {field.type === "select" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-white/40 uppercase tracking-widest">
                Options (one per line)
              </label>
              <textarea
                value={(field.options ?? []).join("\n")}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                rows={3}
                placeholder={"Option A\nOption B"}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-violet-500/40 resize-none font-mono"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({
  section,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  section: SectionDef;
  index: number;
  total: number;
  onChange: (s: SectionDef) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const setField = (i: number, f: FieldDef) => {
    const fs = [...section.fields];
    fs[i] = f;
    onChange({ ...section, fields: fs });
  };
  const deleteField = (i: number) =>
    onChange({ ...section, fields: section.fields.filter((_, j) => j !== i) });
  const moveField = (i: number, dir: -1 | 1) => {
    const fs = [...section.fields];
    const j = i + dir;
    if (j < 0 || j >= fs.length) return;
    [fs[i], fs[j]] = [fs[j], fs[i]];
    onChange({ ...section, fields: fs });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-6 h-6 rounded bg-white/5 text-white/30 hover:text-white/70 disabled:opacity-20 text-xs"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="w-6 h-6 rounded bg-white/5 text-white/30 hover:text-white/70 disabled:opacity-20 text-xs"
          >
            ▼
          </button>
        </div>
        <span className="text-xs font-bold text-violet-500/40 font-mono w-5 flex-shrink-0">
          §{index + 1}
        </span>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="Section title"
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-white/80 placeholder-white/20 focus:outline-none border-b border-transparent focus:border-violet-500/40 py-0.5"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-white/30">Cols</span>
          {([1, 2, 3] as (1 | 2 | 3)[]).map((n) => (
            <button
              key={n}
              onClick={() => onChange({ ...section, columns: n })}
              className={`w-6 h-6 rounded text-xs font-bold transition-all ${(section.columns ?? 2) === n ? "bg-violet-500/20 text-violet-400 border border-violet-500/30" : "bg-white/5 text-white/30 hover:text-white/70 border border-white/8"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 text-sm flex-shrink-0"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-1.5 p-3">
        {section.fields.length === 0 ? (
          <p className="text-white/20 text-xs text-center py-4">
            No fields — add one below
          </p>
        ) : (
          section.fields.map((field, i) => (
            <FieldRow
              key={field.key}
              field={field}
              onChange={(f) => setField(i, f)}
              onDelete={() => deleteField(i)}
              onMoveUp={() => moveField(i, -1)}
              onMoveDown={() => moveField(i, 1)}
              isFirst={i === 0}
              isLast={i === section.fields.length - 1}
            />
          ))
        )}
        <button
          onClick={() =>
            onChange({ ...section, fields: [...section.fields, makeField()] })
          }
          className="mt-1 w-full py-2 rounded-xl border border-dashed border-white/10 hover:border-violet-500/30 text-white/25 hover:text-violet-400 text-xs font-semibold transition-all hover:bg-violet-500/5"
        >
          + Add Field
        </button>
      </div>
    </div>
  );
}

// ── Preview ───────────────────────────────────────────────────────────────────

function StatBlockPreview({ template }: { template: StatBlockTemplate }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d18] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
          Stat Block Preview
        </span>
      </div>
      <div className="p-4 space-y-3 max-h-[40vh] overflow-y-auto">
        {template.sections.length === 0 ? (
          <p className="text-white/20 text-xs text-center py-6">
            Add a section to preview
          </p>
        ) : (
          template.sections.map((section, si) => {
            const cols = section.columns ?? 2;
            const gridCls =
              cols === 1
                ? "grid-cols-1"
                : cols === 3
                  ? "grid-cols-3"
                  : "grid-cols-2";
            return (
              <div key={si}>
                <div className="text-[9px] font-bold text-violet-400/70 uppercase tracking-widest text-center mb-2 border-b border-violet-500/15 pb-0.5">
                  {section.title || "Section"}
                </div>
                <div className={`grid ${gridCls} gap-x-4 gap-y-2`}>
                  {section.fields.map((field, fi) => (
                    <div
                      key={fi}
                      className={
                        field.type === "textarea" ? "col-span-full" : ""
                      }
                    >
                      <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">
                        {field.label}
                      </div>
                      {field.type === "checkbox" ? (
                        <div className="w-4 h-4 rounded border border-white/25 bg-white/5" />
                      ) : field.type === "textarea" ? (
                        <div className="h-8 rounded bg-white/5 border-b border-white/10" />
                      ) : (
                        <div className="h-4 border-b border-white/10">
                          <span className="text-[10px] text-white/15">
                            {field.placeholder ?? "…"}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

interface StatBlockBuilderProps {
  /** Initial template to populate from (e.g. loaded from DB) */
  initialTemplate?: StatBlockTemplate;
  /** Called whenever the template changes so the parent can save */
  onChange: (template: StatBlockTemplate) => void;
}

export function StatBlockBuilder({
  initialTemplate,
  onChange,
}: StatBlockBuilderProps) {
  const [sections, setSections] = useState<SectionDef[]>(
    initialTemplate?.sections ?? DEFAULT_GENERIC_STAT_BLOCK_TEMPLATE.sections,
  );

  const emit = useCallback(
    (secs: SectionDef[]) => {
      setSections(secs);
      onChange({ sections: secs });
    },
    [onChange],
  );

  const setSection = useCallback(
    (i: number, s: SectionDef) => {
      emit(sections.map((sec, idx) => (idx === i ? s : sec)));
    },
    [sections, emit],
  );

  const deleteSection = useCallback(
    (i: number) => {
      emit(sections.filter((_, idx) => idx !== i));
    },
    [sections, emit],
  );

  const moveSection = useCallback(
    (i: number, dir: -1 | 1) => {
      const n = [...sections];
      const j = i + dir;
      if (j < 0 || j >= n.length) return;
      [n[i], n[j]] = [n[j], n[i]];
      emit(n);
    },
    [sections, emit],
  );

  const template: StatBlockTemplate = { sections };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* Left: section builder */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 px-1">
          <div>
            <h3 className="text-sm font-semibold text-white/80">
              NPC Stat Block Layout
            </h3>
            <p className="text-xs text-white/30 mt-0.5">
              Define what fields appear when a GM views or creates an NPC using
              this system. The{" "}
              <span className="text-violet-400/70 font-mono">hp</span>,{" "}
              <span className="text-violet-400/70 font-mono">maxHp</span>, and{" "}
              <span className="text-violet-400/70 font-mono">ac</span> keys sync
              to the token bar automatically.
            </p>
          </div>
        </div>

        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 border border-dashed border-white/10 rounded-2xl text-white/20 text-sm gap-2">
            <span className="text-2xl opacity-30">🐉</span>No sections yet
          </div>
        ) : (
          sections.map((section, i) => (
            <SectionCard
              key={i}
              section={section}
              index={i}
              total={sections.length}
              onChange={(s) => setSection(i, s)}
              onDelete={() => deleteSection(i)}
              onMoveUp={() => moveSection(i, -1)}
              onMoveDown={() => moveSection(i, 1)}
            />
          ))
        )}

        <div className="flex gap-2">
          <button
            onClick={() => emit([...sections, makeSection()])}
            className="flex-1 py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-violet-500/30 text-white/30 hover:text-violet-400 text-sm font-semibold transition-all hover:bg-violet-500/5"
          >
            + Add Section
          </button>
          <button
            onClick={() => {
              if (
                sections.length > 0 &&
                !window.confirm("Reset to the default stat block template?")
              )
                return;
              emit(DEFAULT_GENERIC_STAT_BLOCK_TEMPLATE.sections);
            }}
            className="px-4 py-3 rounded-2xl border border-white/10 hover:border-white/20 text-white/25 hover:text-white/50 text-xs font-semibold transition-all"
            title="Reset to default template"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Right: preview + tips */}
      <div className="flex flex-col gap-4">
        <StatBlockPreview template={template} />

        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400/70 mb-3">
            Stat Block Tips
          </p>
          <ul className="flex flex-col gap-2 text-xs text-stone-400 leading-relaxed">
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">◆</span>Use{" "}
              <strong className="text-white/60">hp</strong>,{" "}
              <strong className="text-white/60">maxHp</strong>,{" "}
              <strong className="text-white/60">ac</strong> to sync with the
              token HP bar
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">◆</span>Use{" "}
              <strong className="text-white/60">cr</strong> to display challenge
              rating in the NPC list
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">◆</span>Use{" "}
              <strong className="text-white/60">name</strong> to auto-name the
              token when assigned
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">◆</span>
              <strong className="text-white/60">textarea</strong> fields span
              the full width — good for traits, attacks, and notes
            </li>
            <li className="flex gap-2">
              <span className="text-violet-500 flex-shrink-0">◆</span>This
              layout is shared across all NPCs using this system in your game
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
