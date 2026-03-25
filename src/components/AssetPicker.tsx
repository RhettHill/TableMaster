import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Asset } from "../hooks/useAssets";

interface AssetPickerProps {
  assets: Asset[];
  loading: boolean;
  uploading: boolean;
  title: string;
  type: "map" | "token";
  onSelect: (asset: Asset) => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (asset: Asset) => void;
  onClose: () => void;
}

export default function AssetPicker({
  assets,
  loading,
  uploading,
  title,
  type,
  onSelect,
  onUpload,
  onDelete,
  onClose,
}: AssetPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(file);
    e.target.value = "";
  };

  const handleDelete = async (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (!window.confirm("Remove this asset?")) return;
    setDeletingId(asset.id);
    await onDelete(asset);
    setDeletingId(null);
  };

  const filtered = assets.filter((a) => a.type === type);

  // ── Portal: renders directly into document.body, completely outside the
  // pointer-events-none GMPanel wrapper in GameSession. ─────────────────────
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[520px] max-h-[620px] flex flex-col rounded-xl border border-white/10 bg-[#0f0f1a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <span className="text-sm font-semibold tracking-widest uppercase text-amber-400">
            {title}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <span className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>↑ Upload</>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={onClose}
              className="text-white/40 hover:text-white/80 transition-colors text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto p-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
              <span className="text-4xl">{type === "map" ? "🗺" : "🪙"}</span>
              <p className="text-sm">No {type} images uploaded yet</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-amber-400/70 hover:text-amber-400 text-xs underline underline-offset-2 transition-colors"
              >
                Upload your first {type}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((asset) => (
                <div
                  key={asset.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 transition-all duration-150 cursor-pointer"
                  onClick={() => onSelect(asset)}
                >
                  <img
                    src={asset.file_url}
                    alt=""
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-150" />
                  <button
                    onClick={(e) => handleDelete(e, asset)}
                    disabled={deletingId === asset.id}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/30 transition-all"
                  >
                    {deletingId === asset.id ? "…" : "✕"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="px-5 py-2.5 border-t border-white/8 flex-shrink-0">
            <p className="text-[11px] text-white/25">
              {filtered.length} asset{filtered.length !== 1 ? "s" : ""} · click
              to select, hover to delete
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body, // ← renders outside the entire React tree's DOM position
  );
}
