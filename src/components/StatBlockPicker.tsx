import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";
import { NpcStatBlockMeta } from "../hooks/useStatBlock";

interface AssignStatBlockPickerProps {
  tokenName: string;
  gameId: string;
  onAssign: (statBlockId: string) => void;
  onClose: () => void;
}

export default function AssignStatBlockPicker({
  tokenName,
  gameId,
  onAssign,
  onClose,
}: AssignStatBlockPickerProps) {
  const [statBlocks, setStatBlocks] = useState<NpcStatBlockMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch fresh on every open so we always have the latest library
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("npc_stat_blocks")
        .select("id, name, data, systems(slug)")
        .eq("game_id", gameId)
        .order("name");
      setStatBlocks(
        (data ?? []).map((r: any) => ({
          id: r.id,
          name: r.name,
          systemSlug: r.systems?.slug ?? "dnd5e",
          cr: r.data?.cr ?? r.data?.level ?? "—",
        })),
      );
      setLoading(false);
    };
    load();
  }, [gameId]);

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-80 rounded-2xl border border-white/10 bg-[#0f0f1c]/98 shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/8">
          <p className="text-white/90 text-sm font-semibold">
            Assign Stat Block
          </p>
          <p className="text-white/30 text-[10px]">Token: {tokenName}</p>
        </div>

        <div className="max-h-80 overflow-y-auto py-1">
          {loading ? (
            <p className="text-white/25 text-xs text-center py-8">Loading…</p>
          ) : statBlocks.length === 0 ? (
            <p className="text-white/25 text-xs text-center py-8 px-4">
              No stat blocks in your library yet.
              <br />
              Create one in the GM Panel → NPC Library.
            </p>
          ) : (
            statBlocks.map((sb) => (
              <button
                key={sb.id}
                onClick={() => {
                  onAssign(sb.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <div>
                  <p className="text-white/80 text-sm">{sb.name}</p>
                  <p className="text-white/30 text-[10px]">
                    {sb.systemSlug.toUpperCase()} ·{" "}
                    {sb.cr !== "—" ? `CR/Lvl ${sb.cr}` : "—"}
                  </p>
                </div>
                <span className="text-white/20 text-xs">Assign →</span>
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-white/8">
          <button
            onClick={onClose}
            className="w-full py-1.5 rounded-lg border border-white/10 text-white/40 text-xs hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
