// src/components/tabletop/GenericStatBlockPanel.tsx
//
// Renders an NPC stat block for custom systems.
// StatsPanel.tsx should fall through to this component when the system slug
// starts with "custom_" and a stat_block_template exists on the systems row.
//
// Usage in StatsPanel.tsx:
//   import GenericStatBlockPanel from "./GenericStatBlockPanel";
//   ...
//   if (system?.slug?.startsWith("custom_") && system?.stat_block_template) {
//     return <GenericStatBlockPanel ... />;
//   }

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../services/supabase";
import type { StatBlockTemplate } from "../../pages/StatBlockBuilder";
import type { FieldDef, SectionDef } from "../sheets/GenericSheet";

interface Props {
  statBlockId: string;
  gameId: string;
  isGM: boolean;
  onClose: () => void;
}

interface StatBlockRow {
  id: string;
  name: string;
  data: Record<string, any>;
  systems: {
    slug: string;
    stat_block_template: StatBlockTemplate | null;
  } | null;
}

// ── Field renderer ────────────────────────────────────────────────────────────

function FieldView({
  field,
  value,
  onChange,
  canEdit,
}: {
  field: FieldDef;
  value: any;
  onChange: (v: any) => void;
  canEdit: boolean;
}) {
  const cls =
    "bg-transparent text-white/80 text-sm focus:outline-none border-b border-white/10 focus:border-violet-500/40 transition-colors w-full";

  if (field.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={!!value}
        disabled={!canEdit}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-violet-500 cursor-pointer disabled:cursor-default"
      />
    );
  }
  if (field.type === "textarea") {
    return (
      <textarea
        value={value ?? ""}
        disabled={!canEdit}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className={`${cls} resize-none bg-white/[0.02] rounded px-1 py-0.5 leading-relaxed text-xs`}
        placeholder={field.placeholder}
      />
    );
  }
  if (field.type === "select") {
    return (
      <select
        value={value ?? ""}
        disabled={!canEdit}
        onChange={(e) => onChange(e.target.value)}
        className={`${cls} bg-[#0d0d14] text-xs py-1`}
      >
        <option value="">—</option>
        {(field.options ?? []).map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        disabled={!canEdit}
        min={field.min}
        max={field.max}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        className={`${cls} text-center tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none`}
      />
    );
  }
  return (
    <input
      type="text"
      value={value ?? ""}
      disabled={!canEdit}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={cls}
    />
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GenericStatBlockPanel({
  statBlockId,
  isGM,
  onClose,
}: Props) {
  const [row, setRow] = useState<StatBlockRow | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: sb } = await supabase
        .from("npc_stat_blocks")
        .select("id, name, data, systems(slug, stat_block_template)")
        .eq("id", statBlockId)
        .single();
      if (sb) {
        setRow(sb as any);
        setData(sb.data ?? {});
      }
      setLoading(false);
    };
    load();
  }, [statBlockId]);

  const setField = useCallback((key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    if (!dirty || !row) return;
    setSaving(true);
    await supabase
      .from("npc_stat_blocks")
      .update({ data, name: data.name ?? row.name })
      .eq("id", row.id);
    setSaving(false);
    setDirty(false);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!row) return null;

  const template: StatBlockTemplate | null =
    row.systems?.stat_block_template ?? null;
  const sections: SectionDef[] = template?.sections ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0f0f1c] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-lg">🐉</span>
            <div>
              <p className="text-white/80 font-semibold text-sm">
                {data.name || row.name}
              </p>
              <p className="text-[10px] text-violet-400/60 uppercase tracking-widest">
                {row.systems?.slug?.replace(/^custom_[^_]+_/, "") ?? "Custom"} ·
                NPC
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isGM && dirty && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors text-lg"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {sections.length === 0 ? (
            <div className="text-center text-white/30 text-sm py-10">
              No stat block template defined for this system.
              {isGM && (
                <p className="text-xs mt-1 text-white/20">
                  Add one in the System Builder → Stat Block tab.
                </p>
              )}
            </div>
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
                  <div className="text-[9px] font-bold text-violet-400/60 uppercase tracking-widest text-center mb-3 border-b border-violet-500/10 pb-0.5">
                    {section.title}
                  </div>
                  <div className={`grid ${gridCls} gap-x-5 gap-y-3`}>
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
                        <FieldView
                          field={field}
                          value={data[field.key]}
                          onChange={(v) => setField(field.key, v)}
                          canEdit={isGM}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {isGM && (
          <div className="flex-shrink-0 px-5 py-3 border-t border-white/8 flex items-center justify-between">
            <span className="text-[10px] text-white/20">
              {dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all disabled:opacity-30"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
