// src/components/AssetPicker.tsx
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Asset } from "../hooks/useAssets";

const ANIMATED_TYPES = ["video/mp4", "video/webm", "image/gif"];
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

interface AssetPickerProps {
  assets: Asset[];
  sharedLibrary: Asset[];
  loading: boolean;
  uploading: boolean;
  title: string;
  type: "map" | "token";
  isPro: boolean;
  isProLoading?: boolean;
  onSelect: (asset: Asset) => void;
  onUpload: (file: File, options?: { shared?: boolean }) => Promise<void>;
  onDelete: (asset: Asset) => void;
  onAddFromLibrary?: (asset: Asset) => Promise<boolean>;
  onMarkAsShared?: (asset: Asset) => Promise<boolean>;
  onClose: () => void;
}

type Tab = "game" | "library";

function AssetThumbnail({
  asset,
  className,
}: {
  asset: Asset;
  className: string;
}) {
  const mime = asset.mime_type ?? "";
  const isVideo = mime.startsWith("video/") || (!mime && !!asset.is_animated);
  if (isVideo) {
    return (
      <video
        src={asset.file_url}
        className={className}
        autoPlay
        loop
        muted
        playsInline
      />
    );
  }
  return <img src={asset.file_url} alt="" className={className} />;
}

export default function AssetPicker({
  assets,
  sharedLibrary,
  loading,
  uploading,
  title,
  type,
  isPro,
  isProLoading = false,
  onSelect,
  onUpload,
  onDelete,
  onMarkAsShared,
  onClose,
}: AssetPickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("game");
  const [uploadAsShared, setUploadAsShared] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [proTooltip, setProTooltip] = useState(false);

  const acceptTypes =
    isPro && !isProLoading
      ? [...IMAGE_TYPES, ...ANIMATED_TYPES].join(",")
      : IMAGE_TYPES.join(",");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;

    e.target.value = "";

    if (ANIMATED_TYPES.includes(file.type) && (!isPro || isProLoading)) {
      setProTooltip(true);
      setTimeout(() => setProTooltip(false), 3000);
      return;
    }

    onUpload(file, { shared: uploadAsShared }).catch(console.error);
  };

  const handleDelete = async (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (!window.confirm("Delete this asset permanently?")) return;
    setDeletingId(asset.id);
    await onDelete(asset);
    setDeletingId(null);
  };

  const handleMarkAsShared = async (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (!onMarkAsShared) return;
    setSharingId(asset.id);
    await onMarkAsShared(asset);
    setSharingId(null);
  };

  const gameAssets = assets.filter((a) => a.type === type);

  // Library shows ALL shared assets regardless of game.
  // Fix issue 4: do NOT filter out assets that are already in the current game —
  // the library tab should always show all shared assets (select directly, no copy needed).
  const libraryAssets = sharedLibrary.filter((a) => a.type === type);

  const uploadDisabled = uploading || isProLoading;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-[560px] max-h-[640px] flex flex-col rounded-xl border border-white/10 bg-[#0f0f1a] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <span className="text-sm font-semibold tracking-widest uppercase text-amber-400">
            {title}
          </span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => !uploadDisabled && fileInputRef.current?.click()}
                disabled={uploadDisabled}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <span className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                    Uploading…
                  </>
                ) : isProLoading ? (
                  <>
                    <span className="w-3 h-3 border border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>↑ Upload</>
                )}
              </button>
              {proTooltip && (
                <div className="absolute top-full mt-1 right-0 w-52 bg-black/90 border border-amber-500/30 rounded-lg px-3 py-2 text-[10px] text-amber-400 z-50">
                  Animated maps (GIF, MP4) require a Pro plan.
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept={acceptTypes}
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

        {isPro && !isProLoading && type === "map" && (
          <div className="px-5 py-2 bg-amber-500/5 border-b border-white/6 flex items-center gap-2">
            <span className="text-amber-400 text-xs">✦</span>
            <span className="text-[10px] text-white/30">
              Pro: Supports animated maps (GIF, MP4, WebM). They play live on
              the tabletop.
            </span>
          </div>
        )}

        {/* Tabs — only shown when confirmed Pro */}
        {isPro && !isProLoading && (
          <div className="flex border-b border-white/10 flex-shrink-0">
            {(["game", "library"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
                  tab === t
                    ? "text-amber-400 border-amber-500"
                    : "text-white/30 border-transparent hover:text-white/60"
                }`}
              >
                {t === "game"
                  ? "This Game"
                  : `Shared Library (${libraryAssets.length})`}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto p-4 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">
              Loading…
            </div>
          ) : tab === "game" ? (
            gameAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
                <span className="text-4xl">{type === "map" ? "🗺" : "🪙"}</span>
                <p className="text-sm">No {type} assets yet</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-amber-400/70 hover:text-amber-400 text-xs underline underline-offset-2"
                >
                  Upload your first {type}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {gameAssets.map((asset) => {
                  const isAnimatedAsset =
                    !!asset.mime_type?.startsWith("video/") ||
                    asset.mime_type === "image/gif" ||
                    (!asset.mime_type && !!asset.is_animated);
                  const isVideoAsset =
                    !!asset.mime_type?.startsWith("video/") ||
                    (!asset.mime_type && !!asset.is_animated);
                  return (
                    <div
                      key={asset.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-amber-400 transition-all cursor-pointer"
                      onClick={() => onSelect(asset)}
                    >
                      <AssetThumbnail
                        asset={asset}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                      {isAnimatedAsset && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/80 text-white pointer-events-none">
                          {isVideoAsset ? "VID" : "GIF"}
                        </span>
                      )}
                      {asset.shared && (
                        <span className="absolute top-1 right-7 px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/80 text-white pointer-events-none">
                          LIB
                        </span>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      <button
                        onClick={(e) => handleDelete(e, asset)}
                        disabled={deletingId === asset.id}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-red-400 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/30 transition-all"
                      >
                        {deletingId === asset.id ? "…" : "✕"}
                      </button>
                      {isPro &&
                        !isProLoading &&
                        onMarkAsShared &&
                        !asset.shared && (
                          <button
                            onClick={(e) => handleMarkAsShared(e, asset)}
                            disabled={sharingId === asset.id}
                            className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-black/70 text-amber-400/70 hover:text-amber-400 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            {sharingId === asset.id ? "…" : "+ Lib"}
                          </button>
                        )}
                    </div>
                  );
                })}
              </div>
            )
          ) : /* LIBRARY TAB — click selects directly, no copy required (fix issue 3) */
          libraryAssets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-white/30">
              <span className="text-4xl">📚</span>
              <p className="text-sm">No shared {type} assets yet</p>
              <p className="text-[11px] text-white/20 text-center max-w-xs">
                Upload assets with "Add to library" toggled on, or click "+ Lib"
                on an existing asset.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {libraryAssets.map((asset) => {
                const isAnimatedAsset =
                  !!asset.mime_type?.startsWith("video/") ||
                  asset.mime_type === "image/gif" ||
                  (!asset.mime_type && !!asset.is_animated);
                const isVideoAsset =
                  !!asset.mime_type?.startsWith("video/") ||
                  (!asset.mime_type && !!asset.is_animated);
                return (
                  <div
                    key={asset.id}
                    className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-sky-400 transition-all cursor-pointer"
                    onClick={() => {
                      // Fix issue 3: select directly without copying to game
                      onSelect(asset);
                    }}
                  >
                    <AssetThumbnail
                      asset={asset}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {isAnimatedAsset && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/80 text-white pointer-events-none">
                        {isVideoAsset ? "VID" : "GIF"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-2.5 border-t border-white/8 flex-shrink-0 flex items-center justify-between">
          <p className="text-[11px] text-white/25">
            {tab === "game"
              ? `${gameAssets.length} asset${gameAssets.length !== 1 ? "s" : ""} · click to select`
              : `${libraryAssets.length} in library · click to use`}
          </p>
          {(!isPro || isProLoading) && (
            <a
              href="/plans"
              className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
            >
              ✦ Upgrade for animated maps &amp; shared library
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
