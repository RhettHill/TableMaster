// src/pages/CustomSystemBuilder.tsx
import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import type {
  SheetTemplate,
  SectionDef,
  FieldDef,
} from "../components/sheets/GenericSheet";
import { StatBlockBuilder, StatBlockTemplate } from "./StatBlockBuilder";
import SystemSwitcher, {
  BUILTIN_TEMPLATES,
  SystemOption,
} from "../utils/SystemSwitcher";
import {
  BUILTIN_STAT_BLOCK_TEMPLATES,
  STARTER_TEMPLATES,
} from "../components/Templates";

// ── Types ──────────────────────────────────────────────────────────────────────

type FieldType = FieldDef["type"];

const FIELD_TYPES: {
  value: FieldType;
  label: string;
  icon: string;
  desc: string;
}[] = [
  { value: "text", label: "Text", icon: "Tt", desc: "Short text input" },
  { value: "number", label: "Number", icon: "##", desc: "Numeric value" },
  {
    value: "textarea",
    label: "Notes",
    icon: "¶",
    desc: "Multi-line text block",
  },
  { value: "checkbox", label: "Toggle", icon: "☑", desc: "On / off checkbox" },
  { value: "select", label: "Dropdown", icon: "▾", desc: "Pick from a list" },
];

interface BuiltInSystem {
  id: string;
  name: string;
  slug: string;
}

interface CustomSystem {
  id: string;
  name: string;
  slug: string;
  sheet_template: SheetTemplate;
  stat_block_template?: StatBlockTemplate | null;
}

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}
function makeField(): FieldDef {
  return { key: `field_${Date.now()}`, label: "New Field", type: "text" };
}
function makeSection(): SectionDef {
  return { title: "New Section", fields: [makeField()], columns: 2 };
}

// ── FieldRow ───────────────────────────────────────────────────────────────────

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
        <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-[10px] font-bold font-mono">
          {typeInfo.icon}
        </span>
        <input
          type="text"
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder="Field label"
          className="flex-1 min-w-0 bg-transparent text-sm text-white/80 placeholder-white/20 focus:outline-none border-b border-transparent focus:border-amber-500/40 transition-colors py-0.5"
        />
        <span className="text-[10px] font-mono text-white/20 flex-shrink-0 hidden sm:block">
          {field.key}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className={`w-6 h-6 rounded flex items-center justify-center text-xs transition-colors ${expanded ? "bg-amber-500/20 text-amber-400" : "text-white/30 hover:text-white/70 hover:bg-white/5"}`}
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
                    title={t.desc}
                    onClick={() =>
                      onChange({
                        ...field,
                        type: t.value,
                        options:
                          t.value === "select"
                            ? ["Option A", "Option B"]
                            : undefined,
                      })
                    }
                    className={`px-2 py-1 rounded-lg text-xs font-semibold border transition-all ${field.type === t.value ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8"}`}
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
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 font-mono focus:outline-none focus:border-amber-500/40 transition-colors"
              />
              <p className="text-[9px] text-white/20">
                Unique identifier — data stored under this key
              </p>
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
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-amber-500/40 transition-colors"
              />
            </div>
          )}
          {field.type === "number" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">
                  Min
                </label>
                <input
                  type="number"
                  value={field.min ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...field,
                      min: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-amber-500/40 text-center"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-white/40 uppercase tracking-widest">
                  Max
                </label>
                <input
                  type="number"
                  value={field.max ?? ""}
                  onChange={(e) =>
                    onChange({
                      ...field,
                      max: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-amber-500/40 text-center"
                />
              </div>
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
                rows={4}
                placeholder={"Option A\nOption B\nOption C"}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/70 focus:outline-none focus:border-amber-500/40 resize-none font-mono"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── SectionCard ────────────────────────────────────────────────────────────────

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
    const fields = [...section.fields];
    fields[i] = f;
    onChange({ ...section, fields });
  };
  const deleteField = (i: number) =>
    onChange({ ...section, fields: section.fields.filter((_, j) => j !== i) });
  const moveField = (i: number, dir: -1 | 1) => {
    const fields = [...section.fields];
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    [fields[i], fields[j]] = [fields[j], fields[i]];
    onChange({ ...section, fields });
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/[0.02]">
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-6 h-6 rounded bg-white/5 text-white/30 hover:text-white/70 disabled:opacity-20 text-xs transition-colors"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="w-6 h-6 rounded bg-white/5 text-white/30 hover:text-white/70 disabled:opacity-20 text-xs transition-colors"
          >
            ▼
          </button>
        </div>
        <span className="text-xs font-bold text-amber-500/40 font-mono w-5 flex-shrink-0">
          §{index + 1}
        </span>
        <input
          type="text"
          value={section.title}
          onChange={(e) => onChange({ ...section, title: e.target.value })}
          placeholder="Section title"
          className="flex-1 min-w-0 bg-transparent text-sm font-semibold text-white/80 placeholder-white/20 focus:outline-none border-b border-transparent focus:border-amber-500/40 transition-colors py-0.5"
        />
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-[10px] text-white/30">Cols</span>
          {([1, 2, 3] as (1 | 2 | 3)[]).map((n) => (
            <button
              key={n}
              onClick={() => onChange({ ...section, columns: n })}
              className={`w-6 h-6 rounded text-xs font-bold transition-all ${(section.columns ?? 2) === n ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-white/5 text-white/30 hover:text-white/70 border border-white/8"}`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={onDelete}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors text-sm flex-shrink-0"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {section.fields.length === 0 ? (
          <p className="text-white/20 text-xs text-center py-4">
            No fields yet — add one below
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
          className="mt-1 w-full py-2 rounded-xl border border-dashed border-white/10 hover:border-amber-500/30 text-white/25 hover:text-amber-400 text-xs font-semibold transition-all hover:bg-amber-500/5"
        >
          + Add Field
        </button>
      </div>
    </div>
  );
}

// ── Live Preview ───────────────────────────────────────────────────────────────

function LivePreview({ template }: { template: SheetTemplate }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d18] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
          Live Preview
        </span>
      </div>
      <div className="p-4 space-y-4 max-h-[35vh] overflow-y-auto">
        {template.sections.length === 0 ? (
          <p className="text-white/20 text-xs text-center py-6">
            Add a section to see a preview
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
                <div className="text-[9px] font-bold text-amber-400/70 uppercase tracking-widest text-center mb-2 border-b border-amber-500/15 pb-0.5">
                  {section.title || "Untitled"}
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
                        {field.label || "Field"}
                      </div>
                      {field.type === "checkbox" ? (
                        <div className="w-4 h-4 rounded border border-white/25 bg-white/5" />
                      ) : field.type === "textarea" ? (
                        <div className="h-8 rounded bg-white/5 border-b border-white/10" />
                      ) : field.type === "select" ? (
                        <div className="h-5 rounded bg-white/5 border-b border-white/10 flex items-center px-1">
                          <span className="text-[10px] text-white/20">
                            {(field.options ?? [])[0] ?? "—"}
                          </span>
                        </div>
                      ) : (
                        <div className="h-5 border-b border-white/10">
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

// ── Main ───────────────────────────────────────────────────────────────────────

export default function CustomSystemBuilder() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  // ── Auth / access ──────────────────────────────────────────────────────────
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Systems ────────────────────────────────────────────────────────────────
  const [builtInSystems, setBuiltInSystems] = useState<BuiltInSystem[]>([]);
  const [existingCustomSystem, setExistingCustomSystem] =
    useState<CustomSystem | null>(null);

  // The system_id currently saved as active in games table
  const [activeSystemId, setActiveSystemId] = useState<string | null>(null);

  // The system currently loaded in the editor (local selection — not yet saved)
  const [selectedSystemId, setSelectedSystemId] = useState<string | null>(null);

  // ── Working copy state ─────────────────────────────────────────────────────
  // These represent what's currently in the editor. They start as a copy of
  // whatever system the user selected, and diverge as they edit.
  const [systemName, setSystemName] = useState("");
  const [sections, setSections] = useState<SectionDef[]>([makeSection()]);
  const [statBlockTemplate, setStatBlockTemplate] =
    useState<StatBlockTemplate | null>(null);

  // Snapshot of the working copy at the moment it was loaded (for dirty detection)
  const baselineRef = useRef<{
    sections: SectionDef[];
    name: string;
    statBlock: StatBlockTemplate | null;
  } | null>(null);
  const isDirty = (() => {
    if (!baselineRef.current) return false;
    return (
      JSON.stringify(sections) !==
        JSON.stringify(baselineRef.current.sections) ||
      systemName !== baselineRef.current.name ||
      JSON.stringify(statBlockTemplate) !==
        JSON.stringify(baselineRef.current.statBlock)
    );
  })();

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "build" | "preview" | "json" | "statblock"
  >("build");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [error, setError] = useState("");

  // ── Load initial data ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        navigate("/login");
        return;
      }

      const [{ data: profile }, { data: game }, { data: systems }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("plan_id, subscription_status, plans(price_monthly)")
            .eq("id", user.id)
            .single(),
          supabase
            .from("games")
            .select("owner_id, system_id")
            .eq("id", gameId ?? "")
            .single(),
          supabase
            .from("systems")
            .select("id, name, slug")
            .eq("custom", false)
            .order("name"),
        ]);

      const activeStatuses = ["active", "trialing", "canceling"];
      const hasSub = activeStatuses.includes(
        profile?.subscription_status ?? "",
      );
      const planPrice = (profile?.plans as any)?.price_monthly ?? 0;
      setIsPro(hasSub && planPrice > 0);
      setIsGM(game?.owner_id === user.id);

      const allBuiltIn = (systems ?? []) as BuiltInSystem[];
      setBuiltInSystems(allBuiltIn);

      const savedActiveId = game?.system_id ?? null;
      setActiveSystemId(savedActiveId);

      // Load this game's custom system if one exists
      const { data: customSys } = await supabase
        .from("systems")
        .select("id, name, slug, sheet_template, stat_block_template")
        .eq("game_id", gameId)
        .eq("custom", true)
        .maybeSingle();

      if (customSys) setExistingCustomSystem(customSys as CustomSystem);

      // Determine which system to load into the editor on open:
      // Priority: the game's active system → custom if exists → first built-in
      const targetId =
        savedActiveId ?? customSys?.id ?? allBuiltIn[0]?.id ?? null;
      setSelectedSystemId(targetId);

      // Load that system's template into the editor
      if (targetId) {
        if (customSys && targetId === customSys.id) {
          loadCustomIntoEditor(customSys as CustomSystem);
        } else {
          const builtIn = allBuiltIn.find((s) => s.id === targetId);
          if (builtIn) loadBuiltInIntoEditor(builtIn);
        }
      }

      setLoading(false);
    };
    init();
  }, [gameId]);

  // ── Load helpers ───────────────────────────────────────────────────────────

  const loadCustomIntoEditor = useCallback((sys: CustomSystem) => {
    const name = sys.name;
    const secs = sys.sheet_template?.sections ?? [makeSection()];
    const sb = sys.stat_block_template ?? null;
    setSystemName(name);
    setSections(secs);
    setStatBlockTemplate(sb);
    baselineRef.current = {
      sections: JSON.parse(JSON.stringify(secs)),
      name,
      statBlock: JSON.parse(JSON.stringify(sb)),
    };
  }, []);

  const loadBuiltInIntoEditor = useCallback((sys: BuiltInSystem) => {
    // Load the built-in's representative templates for both sheet and stat block.
    const sheetTpl = BUILTIN_TEMPLATES[sys.slug];
    const sbTpl = BUILTIN_STAT_BLOCK_TEMPLATES[sys.slug] ?? null;
    const secs = sheetTpl
      ? JSON.parse(JSON.stringify(sheetTpl.sections))
      : [makeSection()];
    const name = sys.name;
    setSystemName(name);
    setSections(secs);
    setStatBlockTemplate(sbTpl ? JSON.parse(JSON.stringify(sbTpl)) : null);
    baselineRef.current = {
      sections: JSON.parse(JSON.stringify(secs)),
      name,
      statBlock: sbTpl ? JSON.parse(JSON.stringify(sbTpl)) : null,
    };
  }, []);

  // ── System selection (from switcher) ──────────────────────────────────────

  const handleSelectSystem = useCallback(
    (opt: SystemOption) => {
      if (opt.id === selectedSystemId) return; // already selected

      // Warn about discarding edits (unless it's a clean state)
      if (isDirty) {
        if (
          !window.confirm(`Discard unsaved changes and switch to ${opt.name}?`)
        )
          return;
      }

      setSelectedSystemId(opt.id);
      setError("");

      if (opt.isCustom && existingCustomSystem) {
        loadCustomIntoEditor(existingCustomSystem);
      } else {
        // Built-in
        const builtIn = builtInSystems.find((s) => s.id === opt.id);
        if (builtIn) loadBuiltInIntoEditor(builtIn);
      }
    },
    [
      selectedSystemId,
      isDirty,
      existingCustomSystem,
      builtInSystems,
      loadCustomIntoEditor,
      loadBuiltInIntoEditor,
    ],
  );

  // ── Save & Activate ────────────────────────────────────────────────────────
  // Always saves as a custom system (upsert), then activates it.
  // Even if the user started from a built-in template — once they press Save,
  // it becomes a custom system override for this game.

  const handleSave = async () => {
    if (!systemName.trim()) {
      setError("Give your system a name first.");
      return;
    }
    if (sections.length === 0) {
      setError("Add at least one section.");
      return;
    }
    setError("");
    setSaving(true);

    const slug = `custom_${gameId}_${slugify(systemName)}`;
    const sheet_template: SheetTemplate = { sections };

    if (existingCustomSystem) {
      await supabase
        .from("systems")
        .update({
          name: systemName,
          slug,
          sheet_template,
          stat_block_template: statBlockTemplate ?? null,
        })
        .eq("id", existingCustomSystem.id);
      setExistingCustomSystem({
        ...existingCustomSystem,
        name: systemName,
        slug,
        sheet_template,
        stat_block_template: statBlockTemplate,
      });
    } else {
      const { data: newSys, error: insertErr } = await supabase
        .from("systems")
        .insert({
          name: systemName,
          slug,
          sheet_template,
          stat_block_template: statBlockTemplate ?? null,
          game_id: gameId,
          custom: true,
        })
        .select("id, name, slug, sheet_template, stat_block_template")
        .single();
      if (insertErr || !newSys) {
        setError(insertErr?.message ?? "Failed to create system");
        setSaving(false);
        return;
      }
      setExistingCustomSystem(newSys as CustomSystem);
    }
  };

  // ── Revert to built-in ─────────────────────────────────────────────────────
  // When the GM wants to switch the game BACK to a built-in system without
  // creating a custom one. This writes to the DB immediately (it's an explicit
  // "discard custom and use built-in" action).

  const handleActivateBuiltIn = async (sys: BuiltInSystem) => {
    if (
      !window.confirm(
        `Activate ${sys.name} as the game system? This will reset all character sheets to blank.`,
      )
    )
      return;
    setSaving(true);

    // 1. Point the game at the built-in system
    await supabase.from("games").update({ system_id: sys.id }).eq("id", gameId);

    // 2. UPDATE existing sheets in place (reset data, keep sheet ids + token links)
    await supabase.rpc("reset_sheets_for_new_system", {
      p_game_id: gameId,
      p_system_id: sys.id,
    });

    // 3. Reset NPC stat blocks
    await supabase
      .from("npc_stat_blocks")
      .update({ system_id: sys.id, data: {} })
      .eq("game_id", gameId);

    setActiveSystemId(sys.id);
    setSelectedSystemId(sys.id);
    loadBuiltInIntoEditor(sys);
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  // ── Section helpers ────────────────────────────────────────────────────────

  const setSection = useCallback((i: number, s: SectionDef) => {
    setSections((prev) => {
      const n = [...prev];
      n[i] = s;
      return n;
    });
  }, []);
  const deleteSection = useCallback((i: number) => {
    setSections((prev) => prev.filter((_, j) => j !== i));
  }, []);
  const moveSection = useCallback((i: number, dir: -1 | 1) => {
    setSections((prev) => {
      const n = [...prev];
      const j = i + dir;
      if (j < 0 || j >= n.length) return n;
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const selectedIsCustom =
    existingCustomSystem && selectedSystemId === existingCustomSystem.id;
  const selectedIsBuiltIn = !selectedIsCustom;
  const selectedBuiltIn = builtInSystems.find((s) => s.id === selectedSystemId);

  // System options for the switcher
  const systemOptions: SystemOption[] = [
    ...(existingCustomSystem
      ? [
          {
            id: existingCustomSystem.id,
            name: existingCustomSystem.name,
            slug: existingCustomSystem.slug,
            isCustom: true,
          },
        ]
      : []),
    ...builtInSystems.map((s) => ({ ...s, isCustom: false })),
  ];

  const fieldCount = sections.reduce((acc, s) => acc + s.fields.length, 0);

  // ── Render guards ──────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );

  if (!isGM)
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white/40 text-sm">
        Only the Game Master can edit systems.
      </div>
    );

  if (isPro === false)
    return (
      <div
        className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-6"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-white font-bold text-2xl mb-2">
            Custom System Builder
          </h1>
          <p className="text-stone-400 text-sm leading-relaxed mb-6">
            Build your own character sheet layout for any RPG system. Available
            on Plus or Pro.
          </p>
          <button
            onClick={() => navigate("/plans")}
            className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30"
          >
            View Plans →
          </button>
          <button
            onClick={() => navigate(`/game/${gameId}/play`)}
            className="block mx-auto mt-4 text-stone-500 hover:text-white text-sm transition-colors"
          >
            ← Back to game
          </button>
        </div>
      </div>
    );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-50 border-b border-white/6 bg-[#0a0a0f]/90 backdrop-blur-sm sticky top-0">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/game/${gameId}/play`)}
              className="text-stone-500 hover:text-white text-sm transition-colors"
            >
              ← Game
            </button>
            <span className="text-white/10">/</span>
            <span className="text-amber-400 text-sm font-semibold flex items-center gap-1.5">
              ⚙ System Builder
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-bold uppercase tracking-wider">
              Pro
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-stone-600 text-xs hidden sm:block">
              {sections.length} section{sections.length !== 1 ? "s" : ""} ·{" "}
              {fieldCount} field{fieldCount !== 1 ? "s" : ""}
            </span>
            {savedMsg && (
              <span className="text-emerald-400 text-xs">
                ✓ Saved &amp; activated
              </span>
            )}
            {isDirty && !savedMsg && (
              <span className="text-amber-400/60 text-xs">Unsaved changes</span>
            )}
            {/* Show "Activate [built-in]" when user has a built-in selected without edits */}
            {selectedIsBuiltIn &&
              selectedBuiltIn &&
              !isDirty &&
              selectedSystemId !== activeSystemId && (
                <button
                  onClick={() => handleActivateBuiltIn(selectedBuiltIn)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-all shadow-lg disabled:opacity-50"
                >
                  {saving ? "Activating…" : `Activate ${selectedBuiltIn.name}`}
                </button>
              )}
            {/* Show "Save & Activate" when editing (custom selected OR dirty from a built-in) */}
            {(selectedIsCustom || isDirty) && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save & Activate"}
              </button>
            )}
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">System Builder</h1>
          <p className="text-stone-500 text-sm">
            Select a system to view or edit its template. Any edits create a
            custom version. Press{" "}
            <span className="text-white/60 font-semibold">
              Save &amp; Activate
            </span>{" "}
            to apply to this game.
          </p>
        </div>

        {/* System name — only editable when working on a custom system */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-col gap-1.5 flex-1 max-w-md">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              {isDirty || selectedIsCustom
                ? "Custom System Name"
                : "Viewing Template"}
            </label>
            <input
              type="text"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="e.g. My Homebrew System…"
              disabled={!isDirty && !selectedIsCustom}
              className="bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {!isDirty && selectedIsBuiltIn && (
              <p className="text-[10px] text-white/25">
                Edit any field below to start customising this system
              </p>
            )}
          </div>
          {activeSystemId === existingCustomSystem?.id && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/70 text-xs">
              ✓ Custom system active
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-white/8">
          {(["build", "preview", "json", "statblock"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab ? "text-amber-400 border-amber-500" : "text-white/30 border-transparent hover:text-white/60"}`}
            >
              {tab === "build"
                ? "Character Sheet"
                : tab === "preview"
                  ? "Preview"
                  : tab === "json"
                    ? "JSON Output"
                    : "Stat Block"}
            </button>
          ))}
        </div>

        {/* Build tab */}
        {activeTab === "build" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            {/* Section editor */}
            <div className="flex flex-col gap-4">
              {/* Read-only notice for unmodified built-in */}
              {selectedIsBuiltIn && !isDirty && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-sky-500/20 bg-sky-500/5">
                  <span className="text-sky-400 text-sm flex-shrink-0 mt-0.5">
                    ℹ
                  </span>
                  <div>
                    <p className="text-sky-300/80 text-xs font-semibold">
                      Viewing {systemName} template
                    </p>
                    <p className="text-white/35 text-xs mt-0.5">
                      This is the built-in layout. Edit any field to start
                      customising — your changes will be saved as a custom
                      system overlay for this game.
                    </p>
                  </div>
                </div>
              )}

              {sections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 border border-dashed border-white/10 rounded-2xl text-white/25 text-sm gap-2">
                  <span className="text-2xl opacity-30">📋</span>No sections yet
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
              <button
                onClick={() => setSections((prev) => [...prev, makeSection()])}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-white/10 hover:border-amber-500/30 text-white/30 hover:text-amber-400 text-sm font-semibold transition-all hover:bg-amber-500/5"
              >
                + Add Section
              </button>
            </div>

            {/* Right sidebar */}
            <div className="flex flex-col gap-4">
              <LivePreview template={{ sections }} />

              <SystemSwitcher
                options={systemOptions}
                activeSystemId={activeSystemId}
                selectedId={selectedSystemId}
                isDirty={isDirty}
                onSelect={handleSelectSystem}
              />

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70 mb-3">
                  Tips
                </p>
                <ul className="flex flex-col gap-2 text-xs text-stone-400 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>Use{" "}
                    <strong className="text-white/60">hp</strong> /{" "}
                    <strong className="text-white/60">maxHp</strong> to sync to
                    the token HP bar
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>Use{" "}
                    <strong className="text-white/60">ac</strong> to sync to the
                    token AC badge
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>
                    Editing a built-in template creates a custom system for this
                    game only
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>
                    Activating a system resets all sheets in this game to blank
                  </li>
                </ul>
              </div>

              {/* Quick-start templates */}
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">
                  Quick-start Templates
                </p>
                <div className="flex flex-col gap-1.5">
                  {STARTER_TEMPLATES.map((t) => (
                    <button
                      key={t.name}
                      onClick={() => {
                        if (
                          isDirty &&
                          !window.confirm(
                            "Replace your current sections with this template?",
                          )
                        )
                          return;
                        setSections(JSON.parse(JSON.stringify(t.sections)));
                        if (!systemName || systemName === selectedBuiltIn?.name)
                          setSystemName(t.name);
                      }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/3 hover:bg-white/6 border border-white/8 hover:border-white/15 text-left transition-all group"
                    >
                      <span className="text-base">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white/70 group-hover:text-white/90 truncate">
                          {t.name}
                        </p>
                        <p className="text-[10px] text-white/30">{t.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview tab */}
        {activeTab === "preview" && (
          <div className="max-w-2xl">
            <p className="text-stone-500 text-sm mb-4">
              {isDirty
                ? "Preview of your unsaved changes."
                : `Viewing the ${systemName} template.`}
            </p>
            <div className="rounded-2xl border border-white/10 bg-[#0f0f1c] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
                <span className="text-white/50 text-sm font-semibold">
                  {systemName}
                </span>
                <span className="text-white/20 text-xs">· Character Sheet</span>
                {isDirty && (
                  <span className="text-amber-400/50 text-[10px] ml-auto">
                    Unsaved
                  </span>
                )}
              </div>
              <div className="p-4 space-y-4">
                {sections.map((section, si) => {
                  const cols = section.columns ?? 2;
                  const gridCls =
                    cols === 1
                      ? "grid-cols-1"
                      : cols === 3
                        ? "grid-cols-3"
                        : "grid-cols-2";
                  return (
                    <div key={si}>
                      <div className="text-[9px] font-bold text-amber-400/60 uppercase tracking-widest text-center mb-2 border-b border-amber-500/10 pb-0.5">
                        {section.title}
                      </div>
                      <div className={`grid ${gridCls} gap-x-4 gap-y-3`}>
                        {section.fields.map((field, fi) => (
                          <div
                            key={fi}
                            className={
                              field.type === "textarea" ? "col-span-full" : ""
                            }
                          >
                            <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">
                              {field.label}
                            </div>
                            {field.type === "checkbox" ? (
                              <div className="w-4 h-4 rounded border border-white/25" />
                            ) : field.type === "textarea" ? (
                              <div className="h-16 rounded bg-white/5 border-b border-white/10" />
                            ) : field.type === "select" ? (
                              <select className="bg-[#0d0d14] text-white/50 text-xs border-b border-white/10 focus:outline-none w-full py-1">
                                {(field.options ?? []).map((o) => (
                                  <option key={o}>{o}</option>
                                ))}
                              </select>
                            ) : (
                              <div className="border-b border-white/10 py-1">
                                <span className="text-[11px] text-white/20">
                                  {field.placeholder ?? ""}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* JSON tab */}
        {activeTab === "json" && (
          <div className="max-w-3xl">
            <p className="text-stone-500 text-sm mb-4">
              The{" "}
              <code className="text-white/40 bg-white/5 px-1 rounded">
                sheet_template
              </code>{" "}
              JSON stored in the systems table.
              {isDirty && (
                <span className="text-amber-400/70 ml-2">
                  (showing unsaved working copy)
                </span>
              )}
            </p>
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                  sheet_template JSON
                </span>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify({ sections }, null, 2),
                    )
                  }
                  className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 text-[11px] text-emerald-400/80 font-mono overflow-auto max-h-[50vh] leading-relaxed">
                {JSON.stringify({ sections }, null, 2)}
              </pre>
            </div>
            {statBlockTemplate && (
              <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden mt-4">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                  <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                    stat_block_template JSON
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        JSON.stringify(statBlockTemplate, null, 2),
                      )
                    }
                    className="text-[10px] text-violet-400/60 hover:text-violet-400 transition-colors px-2 py-1 rounded bg-violet-500/10 border border-violet-500/20"
                  >
                    Copy
                  </button>
                </div>
                <pre className="p-4 text-[11px] text-violet-400/80 font-mono overflow-auto max-h-[50vh] leading-relaxed">
                  {JSON.stringify(statBlockTemplate, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Stat block tab */}
        {activeTab === "statblock" && (
          <StatBlockBuilder
            initialTemplate={statBlockTemplate ?? undefined}
            onChange={setStatBlockTemplate}
          />
        )}
      </div>
    </div>
  );
}
