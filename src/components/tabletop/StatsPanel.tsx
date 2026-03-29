import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import Dnd5eStatBlock, { Dnd5eStatBlockData } from "../blocks/Dnd5eStatsBlock";
import Pf2eStatBlock, { Pf2eStatBlockData } from "../blocks/Pf2StatBlock";

interface NpcStatBlockPanelProps {
  statBlockId: string;
  gameId: string;
  isGM: boolean;
  onClose: () => void;
}

interface StatBlockRow {
  id: string;
  name: string;
  data: Record<string, any>;
  systems: { slug: string; name: string } | null;
}

export default function NpcStatBlockPanel({
  statBlockId,
  isGM,
  onClose,
}: NpcStatBlockPanelProps) {
  const [row, setRow] = useState<StatBlockRow | null>(null);
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [pos, setPos] = useState({
    x: Math.max(40, window.innerWidth / 2 - 280),
    y: 60,
  });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const W = panelRef.current?.offsetWidth ?? 560;
      const H = panelRef.current?.offsetHeight ?? 600;
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
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onHeaderMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragging.current = true;
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  // Load
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: r } = await supabase
        .from("npc_stat_blocks")
        .select("id, name, data, systems(slug, name)")
        .eq("id", statBlockId)
        .single();
      if (r) {
        setRow(r as unknown as StatBlockRow);
        setData(r.data ?? {});
      }
      setLoading(false);
    };
    load();
  }, [statBlockId]);

  // Auto-save (GM only)
  const save = useCallback(
    async (d: Record<string, any>) => {
      if (!isGM) return;
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        await supabase
          .from("npc_stat_blocks")
          .update({ data: d, name: d.name ?? row?.name ?? "Unnamed" })
          .eq("id", statBlockId);
        setSaving(false);
      }, 800);
    },
    [isGM, statBlockId, row?.name],
  );

  const update = useCallback(
    (patch: Partial<Dnd5eStatBlockData> | Partial<Pf2eStatBlockData>) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        save(next);
        return next;
      });
    },
    [save],
  );

  const slug = (row?.systems as any)?.slug ?? "dnd5e";
  const displayName = (data.name as string) || row?.name || "Stat Block";

  if (loading) {
    return createPortal(
      <div
        className="fixed z-[300] rounded-2xl border border-white/10 bg-[#0f0f1c]/98 shadow-2xl flex items-center justify-center"
        style={{ left: pos.x, top: pos.y, width: 560, height: 100 }}
      >
        <span className="text-white/30 text-sm">Loading stat block…</span>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      ref={panelRef}
      className="fixed z-[300] rounded-2xl border border-white/10 bg-[#0f0f1c]/98 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col"
      style={{ left: pos.x, top: pos.y, width: 560, maxHeight: "90vh" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b border-white/8 cursor-grab active:cursor-grabbing select-none bg-[#0f0f1c] flex-shrink-0"
        onMouseDown={onHeaderMouseDown}
      >
        <div className="flex items-center gap-3">
          <span className="text-white/25 text-xs">⠿</span>
          <div>
            <p className="text-white/90 text-sm font-semibold">{displayName}</p>
            <p className="text-white/30 text-[10px]">
              {(row?.systems as any)?.name ?? "D&D 5e"} · NPC Stat Block
              {isGM && (
                <span className="ml-2 text-amber-400/60">GM edit mode</span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-[10px] text-amber-400/60 animate-pulse">
              Saving…
            </span>
          )}
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Sheet content */}
      <div className="flex-1 overflow-y-auto p-3">
        {slug === "dnd5e" ? (
          <Dnd5eStatBlock
            data={data as Partial<Dnd5eStatBlockData>}
            canEdit={isGM}
            isGM={isGM}
            onChange={update}
          />
        ) : slug === "pf2e" ? (
          <Pf2eStatBlock
            data={data as Partial<Pf2eStatBlockData>}
            canEdit={isGM}
            isGM={isGM}
            onChange={update}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-white/25 text-sm">
              No stat block layout for this system yet.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
