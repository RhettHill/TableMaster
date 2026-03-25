import { useState } from "react";
import { NpcStatBlockMeta, useNpcStatBlocks } from "../../hooks/useStatBlock";

interface NpcLibraryPanelProps {
  gameId: string;
  gameSystemSlug: string;
  onOpenStatBlock: (id: string) => void;
}

export default function NpcLibraryPanel({
  gameId,
  gameSystemSlug,
  onOpenStatBlock,
}: NpcLibraryPanelProps) {
  const { statBlocks, loading, create, remove } = useNpcStatBlocks(gameId);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setCreating(true);
    const id = await create(gameSystemSlug);
    if (id) onOpenStatBlock(id);
    setCreating(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-white/50 text-xs uppercase tracking-wider font-semibold">
          NPC Library
        </span>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-semibold transition-all disabled:opacity-40"
        >
          {creating ? "…" : "+ New"}
        </button>
      </div>

      {loading ? (
        <div className="text-white/20 text-xs text-center py-4">Loading…</div>
      ) : statBlocks.length === 0 ? (
        <div className="text-white/20 text-xs text-center py-4 border border-dashed border-white/10 rounded-lg">
          No stat blocks yet.
          <br />
          Create one to build your NPC library.
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {statBlocks.map((sb) => (
            <StatBlockRow
              key={sb.id}
              sb={sb}
              onOpen={() => onOpenStatBlock(sb.id)}
              onDelete={() => {
                if (
                  confirm(
                    `Delete "${sb.name}"? Tokens using it will lose their stat block link.`,
                  )
                )
                  remove(sb.id);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatBlockRow({
  sb,
  onOpen,
  onDelete,
}: {
  sb: NpcStatBlockMeta;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/3 hover:bg-white/6 border border-white/8 transition-colors group">
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpen}>
        <p className="text-white/80 text-xs font-medium truncate">{sb.name}</p>
        <p className="text-white/30 text-[10px]">
          {sb.systemSlug.toUpperCase()} · CR {sb.cr}
        </p>
      </div>
      <button
        onClick={onOpen}
        className="text-[10px] text-white/30 hover:text-amber-400 transition-colors px-1.5 py-0.5 rounded"
      >
        Edit
      </button>
      <button
        onClick={onDelete}
        className="text-[10px] text-white/20 hover:text-red-400 transition-colors px-1 opacity-0 group-hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}
