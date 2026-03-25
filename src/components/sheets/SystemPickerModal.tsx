import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";

interface System {
  id: string;
  name: string;
  slug: string;
}

interface SystemPickerModalProps {
  defaultSystemId?: string; // pre-select the game's system
  onConfirm: (systemSlug: string) => void;
  onCancel: () => void;
}

export default function SystemPickerModal({
  defaultSystemId,
  onConfirm,
  onCancel,
}: SystemPickerModalProps) {
  const [systems, setSystems] = useState<System[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("systems")
      .select("id, name, slug")
      .order("name")
      .then(({ data }) => {
        const rows = data ?? [];
        setSystems(rows);
        // Default to game system, or first in list
        const def = rows.find((s) => s.id === defaultSystemId) ?? rows[0];
        if (def) setSelected(def.slug);
        setLoading(false);
      });
  }, [defaultSystemId]);

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-80 rounded-2xl border border-white/10 bg-[#0f0f1c]/98 shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-white/8">
          <p className="text-white/90 text-sm font-semibold">
            Create Character Sheet
          </p>
          <p className="text-white/35 text-xs mt-0.5">
            Choose your game system
          </p>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="text-white/25 text-xs text-center py-4">
              Loading systems…
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {systems.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s.slug)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    selected === s.slug
                      ? "bg-amber-500/15 border-amber-500/40 text-white/90"
                      : "bg-white/3 border-white/8 text-white/50 hover:bg-white/6 hover:text-white/70"
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full border flex-shrink-0 flex items-center justify-center ${
                      selected === s.slug
                        ? "border-amber-500 bg-amber-500/40"
                        : "border-white/20"
                    }`}
                  >
                    {selected === s.slug && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-medium leading-tight">
                      {s.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => selected && onConfirm(selected)}
            disabled={!selected || loading}
            className="flex-1 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-sm font-semibold transition-all disabled:opacity-40"
          >
            Create Sheet
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
