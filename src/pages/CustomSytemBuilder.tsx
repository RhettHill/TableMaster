// src/pages/CustomSystemBuilder.tsx
import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import type {
  SheetTemplate,
  SectionDef,
  FieldDef,
} from "../components/sheets/GenericSheet";

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

interface CustomSystem {
  id: string;
  name: string;
  slug: string;
  sheet_template: SheetTemplate;
}

interface BuiltInSystem {
  id: string;
  name: string;
  slug: string;
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

// ── Field Row ─────────────────────────────────────────────────────────────────

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
                    title={t.desc}
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
                Unique identifier — data is stored under this key
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

// ── Section Card ──────────────────────────────────────────────────────────────

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

// ── Live Preview ──────────────────────────────────────────────────────────────

function LivePreview({ template }: { template: SheetTemplate }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d0d18] overflow-hidden">
      <div className="px-4 py-3 border-b border-white/8 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
          Live Preview
        </span>
      </div>
      <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
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
                        <div className="h-10 rounded bg-white/5 border-b border-white/10" />
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

// ── System Switcher ───────────────────────────────────────────────────────────

function SystemSwitcher({
  gameId,
  builtInSystems,
  currentSystemId,
  customSystemId,
  onSwitched,
}: {
  gameId: string;
  builtInSystems: BuiltInSystem[];
  currentSystemId: string | null;
  customSystemId: string | null;
  onSwitched: (systemId: string) => void;
}) {
  const [switching, setSwitching] = useState(false);

  const switchTo = async (systemId: string) => {
    if (currentSystemId === systemId) return;
    setSwitching(true);
    // Update the game's system
    await supabase
      .from("games")
      .update({ system_id: systemId })
      .eq("id", gameId);
    // Migrate all existing character sheets in this game to the new system
    await supabase
      .from("character_sheets")
      .update({ system_id: systemId })
      .eq("game_id", gameId);
    onSwitched(systemId);
    setSwitching(false);
  };

  const allOptions = [
    ...(customSystemId
      ? [
          {
            id: customSystemId,
            name: "Custom System",
            slug: "",
            isCustom: true,
          },
        ]
      : []),
    ...builtInSystems.map((s) => ({ ...s, isCustom: false })),
  ];

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-3">
        Active System for This Game
      </p>
      <div className="flex flex-col gap-1.5">
        {allOptions.map((opt) => {
          const isActive = currentSystemId === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => switchTo(opt.id)}
              disabled={switching || isActive}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? opt.isCustom
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300 cursor-default"
                    : "bg-sky-500/15 border-sky-500/40 text-sky-300 cursor-default"
                  : "bg-white/4 border-white/8 text-white/50 hover:bg-white/8 hover:border-white/15 disabled:opacity-50"
              }`}
            >
              <span className="text-sm">{opt.isCustom ? "⚙" : "📋"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold">{opt.name}</p>
                <p className="text-[10px] text-white/30">
                  {opt.isCustom ? "Your builder template" : "Built-in system"}
                </p>
              </div>
              {isActive && (
                <span
                  className={`text-xs flex-shrink-0 ${opt.isCustom ? "text-amber-400" : "text-sky-400"}`}
                >
                  ✓ Active
                </span>
              )}
            </button>
          );
        })}
      </div>
      {switching && (
        <p className="text-[10px] text-amber-400/60 text-center mt-2 animate-pulse">
          Switching — updating all player sheets…
        </p>
      )}
      <p className="text-[9px] text-white/20 mt-3 leading-relaxed">
        Switching updates all existing character sheets in this game. Player
        data is preserved.
      </p>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CustomSystemBuilder() {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [isGM, setIsGM] = useState(false);
  const [systemName, setSystemName] = useState("");
  const [sections, setSections] = useState<SectionDef[]>([makeSection()]);
  const [existingSystem, setExistingSystem] = useState<CustomSystem | null>(
    null,
  );
  const [builtInSystems, setBuiltInSystems] = useState<BuiltInSystem[]>([]);
  const [currentGameSystemId, setCurrentGameSystemId] = useState<string | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"build" | "preview" | "json">(
    "build",
  );

  const template: SheetTemplate = { sections };

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
      setCurrentGameSystemId(game?.system_id ?? null);
      setBuiltInSystems((systems ?? []) as BuiltInSystem[]);

      const { data: sys } = await supabase
        .from("systems")
        .select("id, name, slug, sheet_template")
        .eq("game_id", gameId)
        .eq("custom", true)
        .maybeSingle();

      if (sys) {
        setExistingSystem(sys as CustomSystem);
        setSystemName(sys.name);
        if (sys.sheet_template?.sections?.length)
          setSections(sys.sheet_template.sections);
      }

      setLoading(false);
    };
    init();
  }, [gameId]);

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
    let savedSystemId: string | null = existingSystem?.id ?? null;

    if (existingSystem) {
      await supabase
        .from("systems")
        .update({ name: systemName, sheet_template })
        .eq("id", existingSystem.id);
    } else {
      const { data: newSys, error: insertErr } = await supabase
        .from("systems")
        .insert({
          name: systemName,
          slug,
          sheet_template,
          game_id: gameId,
          custom: true,
        })
        .select("id, name, slug, sheet_template")
        .single();
      if (insertErr) {
        setError(insertErr.message);
        setSaving(false);
        return;
      }
      if (newSys) {
        setExistingSystem(newSys as CustomSystem);
        savedSystemId = newSys.id;
      }
    }

    // Auto-switch game to this custom system on first save,
    // and update all existing player sheets so they use the new renderer.
    if (savedSystemId && currentGameSystemId !== savedSystemId) {
      await supabase
        .from("games")
        .update({ system_id: savedSystemId })
        .eq("id", gameId);
      await supabase
        .from("character_sheets")
        .update({ system_id: savedSystemId })
        .eq("game_id", gameId);
      setCurrentGameSystemId(savedSystemId);
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const fieldCount = sections.reduce((acc, s) => acc + s.fields.length, 0);

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

  if (isPro === false) {
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
            Build your own character sheet layout for any RPG system — no code
            required. Available on the Plus or Pro plan.
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
  }

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

      <nav className="relative z-10 border-b border-white/6 bg-[#0a0a0f]/90 backdrop-blur-sm sticky top-0">
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
              <span>⚙</span> System Builder
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-400 font-bold uppercase tracking-wider">
              Pro
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-600 text-xs hidden sm:block">
              {sections.length} section{sections.length !== 1 ? "s" : ""} ·{" "}
              {fieldCount} field{fieldCount !== 1 ? "s" : ""}
            </span>
            {saved && (
              <span className="text-emerald-400 text-xs flex items-center gap-1">
                <span>✓</span> Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : existingSystem
                  ? "Update System"
                  : "Save System"}
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            Custom System Builder
          </h1>
          <p className="text-stone-500 text-sm">
            Design a character sheet for any RPG. Saving automatically switches
            this game to your custom system.
          </p>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-col gap-1.5 flex-1 max-w-md">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
              System Name
            </label>
            <input
              type="text"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              placeholder="e.g. Call of Cthulhu, Blades in the Dark, Homebrew…"
              className="bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all"
            />
          </div>
          {existingSystem && currentGameSystemId === existingSystem.id && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400/70 text-xs">
              <span>✓</span> Active — players are using this sheet
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-1 mb-6 border-b border-white/8">
          {(["build", "preview", "json"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all ${activeTab === tab ? "text-amber-400 border-amber-500" : "text-white/30 border-transparent hover:text-white/60"}`}
            >
              {tab === "build"
                ? "Builder"
                : tab === "preview"
                  ? "Preview"
                  : "JSON Output"}
            </button>
          ))}
        </div>

        {activeTab === "build" && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
            <div className="flex flex-col gap-4">
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

            <div className="flex flex-col gap-4">
              <LivePreview template={template} />

              {/* System switcher — key feature: lets GM revert to built-in */}
              <SystemSwitcher
                gameId={gameId!}
                builtInSystems={builtInSystems}
                currentSystemId={currentGameSystemId}
                customSystemId={existingSystem?.id ?? null}
                onSwitched={(systemId) => setCurrentGameSystemId(systemId)}
              />

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70 mb-3">
                  Tips
                </p>
                <ul className="flex flex-col gap-2 text-xs text-stone-400 leading-relaxed">
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>Use{" "}
                    <strong className="text-white/60">hp</strong> and{" "}
                    <strong className="text-white/60">maxHp</strong> as keys to
                    sync HP to the token bar
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>Use{" "}
                    <strong className="text-white/60">ac</strong> to sync Armor
                    Class to the token badge
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>Keys
                    must be unique — lowercase with underscores
                  </li>
                  <li className="flex gap-2">
                    <span className="text-amber-500 flex-shrink-0">◆</span>1
                    column for notes, 2–3 for stat grids
                  </li>
                </ul>
              </div>

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
                          sections.length > 1 ||
                          sections[0].fields.length > 1
                        ) {
                          if (
                            !window.confirm(
                              "Replace your current sheet with this template?",
                            )
                          )
                            return;
                        }
                        setSections(t.sections);
                        if (!systemName) setSystemName(t.name);
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

        {activeTab === "preview" && (
          <div className="max-w-2xl">
            <p className="text-stone-500 text-sm mb-4">
              This is how your sheet will look to players in-game.
            </p>
            <div className="rounded-2xl border border-white/10 bg-[#0f0f1c] overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2">
                <span className="text-white/50 text-sm font-semibold">
                  {systemName || "Custom System"}
                </span>
                <span className="text-white/20 text-xs">· Character Sheet</span>
              </div>
              <div className="p-4 space-y-4">
                {sections.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-8">
                    Nothing to preview — add sections in the Builder tab
                  </p>
                ) : (
                  sections.map((section, si) => {
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
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "json" && (
          <div className="max-w-3xl">
            <p className="text-stone-500 text-sm mb-4">
              This JSON is stored in the{" "}
              <code className="text-white/40 bg-white/5 px-1 rounded">
                sheet_template
              </code>{" "}
              column and read by{" "}
              <code className="text-white/40 bg-white/5 px-1 rounded">
                GenericSheet
              </code>
              .
            </p>
            <div className="rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
                <span className="text-[10px] text-white/30 font-mono uppercase tracking-widest">
                  SheetTemplate JSON
                </span>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(
                      JSON.stringify(template, null, 2),
                    )
                  }
                  className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20"
                >
                  Copy
                </button>
              </div>
              <pre className="p-4 text-[11px] text-emerald-400/80 font-mono overflow-auto max-h-[60vh] leading-relaxed">
                {JSON.stringify(template, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Starter templates ─────────────────────────────────────────────────────────

const STARTER_TEMPLATES: {
  name: string;
  icon: string;
  desc: string;
  sections: SectionDef[];
}[] = [
  {
    name: "Generic OSR",
    icon: "🗡",
    desc: "Old-school stats, saves, HP",
    sections: [
      {
        title: "Character Info",
        columns: 2,
        fields: [
          { key: "characterName", label: "Name", type: "text" },
          { key: "class", label: "Class", type: "text" },
          { key: "level", label: "Level", type: "number", min: 1, max: 20 },
          {
            key: "alignment",
            label: "Alignment",
            type: "select",
            options: ["Lawful", "Neutral", "Chaotic"],
          },
        ],
      },
      {
        title: "Ability Scores",
        columns: 3,
        fields: [
          { key: "str", label: "STR", type: "number", min: 3, max: 18 },
          { key: "dex", label: "DEX", type: "number", min: 3, max: 18 },
          { key: "con", label: "CON", type: "number", min: 3, max: 18 },
          { key: "int", label: "INT", type: "number", min: 3, max: 18 },
          { key: "wis", label: "WIS", type: "number", min: 3, max: 18 },
          { key: "cha", label: "CHA", type: "number", min: 3, max: 18 },
        ],
      },
      {
        title: "Combat",
        columns: 3,
        fields: [
          { key: "hp", label: "HP", type: "number" },
          { key: "maxHp", label: "Max HP", type: "number" },
          { key: "ac", label: "AC", type: "number" },
          { key: "thac0", label: "THAC0", type: "number" },
          { key: "speed", label: "Speed", type: "text", placeholder: "120ft" },
        ],
      },
      {
        title: "Saving Throws",
        columns: 3,
        fields: [
          { key: "save_death", label: "Death/Poison", type: "number" },
          { key: "save_wands", label: "Wands", type: "number" },
          { key: "save_stone", label: "Paralysis", type: "number" },
          { key: "save_breath", label: "Breath", type: "number" },
          { key: "save_magic", label: "Spells", type: "number" },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [
          { key: "equipment", label: "Equipment", type: "textarea" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      },
    ],
  },
  {
    name: "Blades in the Dark",
    icon: "🕯",
    desc: "Stress, trauma, action ratings",
    sections: [
      {
        title: "Character",
        columns: 2,
        fields: [
          { key: "name", label: "Name", type: "text" },
          {
            key: "playbook",
            label: "Playbook",
            type: "select",
            options: [
              "Cutter",
              "Hound",
              "Leech",
              "Lurk",
              "Slide",
              "Spider",
              "Whisper",
            ],
          },
          { key: "heritage", label: "Heritage", type: "text" },
          { key: "background", label: "Background", type: "text" },
          { key: "vice", label: "Vice", type: "text" },
        ],
      },
      {
        title: "Stress & Trauma",
        columns: 2,
        fields: [
          { key: "stress", label: "Stress", type: "number", min: 0, max: 9 },
          {
            key: "maxStress",
            label: "Max Stress",
            type: "number",
            min: 0,
            max: 9,
          },
          {
            key: "trauma",
            label: "Trauma",
            type: "textarea",
            placeholder: "Cold, Haunted, Obsessed…",
          },
        ],
      },
      {
        title: "Insight",
        columns: 3,
        fields: [
          { key: "hunt", label: "Hunt", type: "number", min: 0, max: 4 },
          { key: "study", label: "Study", type: "number", min: 0, max: 4 },
          { key: "survey", label: "Survey", type: "number", min: 0, max: 4 },
          { key: "tinker", label: "Tinker", type: "number", min: 0, max: 4 },
        ],
      },
      {
        title: "Prowess",
        columns: 3,
        fields: [
          { key: "finesse", label: "Finesse", type: "number", min: 0, max: 4 },
          { key: "prowl", label: "Prowl", type: "number", min: 0, max: 4 },
          {
            key: "skirmish",
            label: "Skirmish",
            type: "number",
            min: 0,
            max: 4,
          },
          { key: "wreck", label: "Wreck", type: "number", min: 0, max: 4 },
        ],
      },
      {
        title: "Resolve",
        columns: 3,
        fields: [
          { key: "attune", label: "Attune", type: "number", min: 0, max: 4 },
          { key: "command", label: "Command", type: "number", min: 0, max: 4 },
          { key: "consort", label: "Consort", type: "number", min: 0, max: 4 },
          { key: "sway", label: "Sway", type: "number", min: 0, max: 4 },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [
          { key: "abilities", label: "Special Abilities", type: "textarea" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      },
    ],
  },
  {
    name: "Minimal Free-form",
    icon: "📝",
    desc: "Name, stats, notes — blank slate",
    sections: [
      {
        title: "Character",
        columns: 2,
        fields: [
          { key: "name", label: "Name", type: "text" },
          { key: "concept", label: "Concept", type: "text" },
        ],
      },
      {
        title: "Stats",
        columns: 3,
        fields: [
          { key: "hp", label: "HP", type: "number" },
          { key: "maxHp", label: "Max HP", type: "number" },
          { key: "ac", label: "Defense", type: "number" },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [{ key: "notes", label: "Notes", type: "textarea" }],
      },
    ],
  },
];
