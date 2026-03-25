// Generic character sheet renderer.
// Reads a JSON template from systems.sheet_template and renders editable fields.
// Template shape:
//   { sections: [{ title, fields: [{ key, label, type, options? }] }] }
// Field types: "text" | "number" | "textarea" | "checkbox" | "select"

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "textarea" | "checkbox" | "select";
  options?: string[]; // for select
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface SectionDef {
  title: string;
  fields: FieldDef[];
  columns?: 1 | 2 | 3; // default 2
}

export interface SheetTemplate {
  sections: SectionDef[];
}

interface GenericSheetProps {
  template: SheetTemplate;
  data: Record<string, any>;
  canEdit: boolean;
  onChange: (patch: Record<string, any>) => void;
}

function FieldInput({
  field,
  value,
  canEdit,
  onChange,
}: {
  field: FieldDef;
  value: any;
  canEdit: boolean;
  onChange: (v: any) => void;
}) {
  const base =
    "bg-transparent text-white/80 text-xs focus:outline-none border-b border-white/10 focus:border-amber-500/50 w-full placeholder-white/20 transition-colors disabled:opacity-40";

  if (!canEdit) {
    if (field.type === "checkbox") {
      return (
        <span
          className={`inline-block w-3.5 h-3.5 rounded border ${value ? "bg-amber-500/60 border-amber-500" : "border-white/25"}`}
        />
      );
    }
    return (
      <span className="text-white/60 text-xs">{String(value ?? "—")}</span>
    );
  }

  switch (field.type) {
    case "textarea":
      return (
        <textarea
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.label}
          className={`${base} resize-none`}
          rows={3}
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value ?? ""}
          min={field.min}
          max={field.max}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          className={`${base} text-center tabular-nums`}
        />
      );
    case "checkbox":
      return (
        <button
          onClick={() => onChange(!value)}
          className={`w-4 h-4 rounded border transition-colors ${value ? "bg-amber-500/60 border-amber-500" : "border-white/30 hover:border-amber-500/50"}`}
        />
      );
    case "select":
      return (
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="bg-[#0d0d14] text-white/80 text-xs border-b border-white/10 focus:border-amber-500/50 focus:outline-none w-full"
        >
          <option value="">—</option>
          {(field.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder ?? field.label}
          className={base}
        />
      );
  }
}

export default function GenericSheet({
  template,
  data,
  canEdit,
  onChange,
}: GenericSheetProps) {
  const set = (key: string, val: any) => onChange({ [key]: val });

  return (
    <div className="space-y-4 p-4">
      {template.sections.map((section) => {
        const cols = section.columns ?? 2;
        const gridCls =
          cols === 1
            ? "grid-cols-1"
            : cols === 3
              ? "grid-cols-3"
              : "grid-cols-2";
        return (
          <div key={section.title}>
            <div className="text-[9px] font-bold text-red-400 uppercase tracking-widest text-center mb-2 border-b border-red-900/40 pb-0.5">
              {section.title}
            </div>
            <div className={`grid ${gridCls} gap-x-4 gap-y-2`}>
              {section.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === "textarea" ? "col-span-full" : ""}
                >
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">
                    {field.label}
                  </div>
                  <FieldInput
                    field={field}
                    value={data[field.key]}
                    canEdit={canEdit}
                    onChange={(v) => set(field.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {template.sections.length === 0 && (
        <p className="text-center text-white/25 text-xs py-8">
          No sheet template defined for this system.
        </p>
      )}
    </div>
  );
}
