import { useState } from "react";
import { useAssets } from "../../hooks/useAssets";
import { useScenes, Scene } from "../../hooks/useScenes";
import {
  useGameStore,
  SceneSettings,
  GameSettings,
} from "../../store/gameStore";
import { Token } from "../../types/Types";
import AssetPicker from "../AssetPicker";
import { Asset } from "../../hooks/useAssets";
import SettingsPanel from "./SettingsPanel";
import NpcLibraryPanel from "./LibraryPanel";
import type { VisibilityMode } from "../../hooks/useFog";

interface GMPanelProps {
  open: boolean;
  userId: string;
  gameId: string;
  activeSceneId: string | null;
  playerSceneId?: string | null;
  onScenePreview: (scene: Scene) => void;
  onScenePushToPlayers: (scene: Scene) => Promise<void>;
  onAddToken: (token: Token) => void;
  onSaveSceneSettings: (settings: SceneSettings) => Promise<void>;
  onSaveGameSettings: (settings: GameSettings) => Promise<void>;
  onClose: () => void;
  onOpenStatBlock: (id: string) => void;
  gameSystemSlug: string;
  onClearFog?: () => void;
  visibilityMode: VisibilityMode;
  onSetVisibilityMode: (mode: VisibilityMode) => void;
  onDeleteToken: (id: string) => void;
  onRenameToken: (id: string, name: string) => void;
  onLocateToken: (id: string) => void;
}

type Tab = "scenes" | "tokens" | "npcs" | "map" | "settings";

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 text-[10px] font-semibold tracking-wider uppercase transition-all duration-150 border-b-2
        ${
          active
            ? "text-amber-400 border-amber-500"
            : "text-white/30 border-transparent hover:text-white/60 hover:border-white/20"
        }`}
    >
      {children}
    </button>
  );
}

export default function GMPanel({
  open,
  userId,
  gameId,
  activeSceneId,
  playerSceneId,
  onScenePreview,
  onScenePushToPlayers,
  onAddToken,
  onSaveSceneSettings,
  onSaveGameSettings,
  onClose,
  onOpenStatBlock,
  gameSystemSlug,
  onClearFog,
  visibilityMode,
  onSetVisibilityMode,
  onDeleteToken,
  onRenameToken,
  onLocateToken,
}: GMPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("scenes");
  const [picker, setPicker] = useState<null | "map" | "token">(null);
  const [uploading, setUploading] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");
  const [tokenSearch, setTokenSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [pushingSceneId, setPushingSceneId] = useState<string | null>(null);

  // Must call setMap (not just updateSceneMap) so Zustand store updates the
  // map URL + derived mapIsAnimated / mapIsVideo flags that Tabletop reads.
  const setMap = useGameStore((s) => s.setMap);
  const tokens = useGameStore((s) => s.tokens);

  const {
    assets,
    sharedLibrary,
    loading: assetsLoading,
    isPro,
    uploadAsset,
    addFromLibrary,
    markAsShared,
    deleteAsset,
  } = useAssets(userId, gameId);

  const {
    scenes,
    loading: scenesLoading,
    error: scenesError,
    createScene,
    deleteScene,
    updateSceneMap,
  } = useScenes(gameId);

  const handleUpload = async (file: File, options?: { shared?: boolean }) => {
    setUploading(true);
    await uploadAsset(file, picker ?? "map", options);
    setUploading(false);
  };

  const handleMapPick = async (asset: Asset) => {
    // mime_type is the reliable source — set on upload via the metadata patch.
    // is_animated is the fallback for assets uploaded before mime_type was stored.
    // When is_animated=true but mime_type is unknown we can't distinguish GIF
    // from video, so we treat it as video (MP4 is far more common as a map).
    const mimeType = asset.mime_type ?? null;
    const isVideoFallback = !mimeType && !!asset.is_animated;
    const isAnimatedFallback = false; // only used for GIF; without mime_type we can't confirm

    setMap(asset.file_url, mimeType, isAnimatedFallback, isVideoFallback);

    // Persist to DB so the scene restores the correct map on reload.
    if (activeSceneId) await updateSceneMap(activeSceneId, asset.file_url);

    setPicker(null);
  };

  const handleTokenPick = (asset: Asset) => {
    onAddToken({
      id: crypto.randomUUID(),
      scene_id: activeSceneId ?? "",
      name: `Token ${tokens.length + 1}`,
      image_url: asset.file_url,
      x: 70,
      y: 70,
      rotation: 0,
      scale: 1,
      visible: true,
      player_editable: false,
      token_size: 1.0,
    });
    setPicker(null);
  };

  const handleCreateScene = async () => {
    const name = newSceneName.trim();
    if (!name) return;
    await createScene(name);
    setNewSceneName("");
  };

  const handlePushToPlayers = async (e: React.MouseEvent, scene: Scene) => {
    e.stopPropagation();
    setPushingSceneId(scene.id);
    await onScenePushToPlayers(scene);
    setPushingSceneId(null);
  };

  return (
    <>
      <div
        className={`
        pointer-events-auto h-full w-72 flex flex-col
        bg-[#0d0d18]/95 backdrop-blur-md border-l border-white/10
        shadow-2xl transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0" : "translate-x-full"}
      `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
          <span className="text-white/70 text-sm font-semibold tracking-wide flex items-center gap-2">
            <span className="text-amber-400">⚔</span> GM Tools
          </span>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-base leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 flex-shrink-0">
          <TabButton
            active={activeTab === "scenes"}
            onClick={() => setActiveTab("scenes")}
          >
            Scenes
          </TabButton>
          <TabButton
            active={activeTab === "tokens"}
            onClick={() => setActiveTab("tokens")}
          >
            Tokens
          </TabButton>
          <TabButton
            active={activeTab === "npcs"}
            onClick={() => setActiveTab("npcs")}
          >
            NPCs
          </TabButton>
          <TabButton
            active={activeTab === "map"}
            onClick={() => setActiveTab("map")}
          >
            Map
          </TabButton>
          <TabButton
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </TabButton>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── SCENES ── */}
          {activeTab === "scenes" && (
            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-4 px-1">
                <span className="flex items-center gap-1.5 text-[10px] text-white/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                  Your view
                </span>
                <span className="flex items-center gap-1.5 text-[10px] text-white/30">
                  <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />
                  Players' view
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateScene()}
                  placeholder="New scene name…"
                  className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition-colors"
                />
                <button
                  onClick={handleCreateScene}
                  disabled={!newSceneName.trim()}
                  className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-bold border border-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  +
                </button>
              </div>

              {scenesError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {scenesError}
                </p>
              )}

              {scenesLoading ? (
                <p className="text-white/25 text-xs py-4 text-center">
                  Loading…
                </p>
              ) : scenes.length === 0 ? (
                <p className="text-white/25 text-xs py-4 text-center">
                  No scenes yet
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {scenes.map((scene) => {
                    const isGMHere = scene.id === activeSceneId;
                    const isPlayerHere = scene.id === (playerSceneId ?? null);
                    const isPushing = pushingSceneId === scene.id;
                    return (
                      <div
                        key={scene.id}
                        className={`group flex flex-col rounded-lg border transition-all duration-150 overflow-hidden
                          ${
                            isGMHere
                              ? "bg-amber-500/10 border-amber-500/25"
                              : "bg-white/3 border-white/8 hover:bg-white/6"
                          }`}
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                          onClick={() => onScenePreview(scene)}
                        >
                          <span
                            title="Your current view"
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${isGMHere ? "bg-amber-400" : "bg-white/10"}`}
                          />
                          <span
                            title="Players' current view"
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${isPlayerHere ? "bg-sky-400" : "bg-white/10"}`}
                          />
                          <span
                            className={`flex-1 text-sm truncate ${isGMHere ? "text-amber-300 font-medium" : "text-white/65"}`}
                          >
                            {scene.name}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm("Delete this scene?"))
                                deleteScene(scene.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all text-xs"
                          >
                            ✕
                          </button>
                        </div>

                        <div
                          className={`flex gap-1.5 px-3 pb-2 ${isGMHere ? "flex" : "hidden group-hover:flex"}`}
                        >
                          <button
                            onClick={(e) => handlePushToPlayers(e, scene)}
                            disabled={isPushing || isPlayerHere}
                            className={`flex-1 py-1 rounded-md border text-[10px] font-semibold transition-all
                              ${
                                isPlayerHere
                                  ? "bg-sky-500/10 border-sky-500/20 text-sky-400/50 cursor-default"
                                  : "bg-sky-500/15 hover:bg-sky-500/25 border-sky-500/20 text-sky-400/80 hover:text-sky-300"
                              } disabled:opacity-50`}
                          >
                            {isPushing ? (
                              <span className="flex items-center justify-center gap-1">
                                <span className="w-2.5 h-2.5 border border-sky-400/40 border-t-sky-400 rounded-full animate-spin" />
                                Pushing…
                              </span>
                            ) : isPlayerHere ? (
                              "✓ Players here"
                            ) : (
                              "→ Push to players"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TOKENS ── */}
          {activeTab === "tokens" && (
            <div className="flex flex-col gap-2 p-3">
              {!activeSceneId && (
                <p className="text-amber-400/60 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Switch to a scene first
                </p>
              )}
              <button
                onClick={() => setPicker("token")}
                disabled={!activeSceneId}
                className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white/90 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-base">🪙</span> Add Token from Library
              </button>

              {tokens.length > 0 && (
                <>
                  <input
                    type="text"
                    value={tokenSearch}
                    onChange={(e) => setTokenSearch(e.target.value)}
                    placeholder={`Search ${tokens.length} token${tokens.length !== 1 ? "s" : ""}…`}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition-colors"
                  />
                  <div className="flex flex-col gap-0.5">
                    {tokens
                      .filter(
                        (t) =>
                          !tokenSearch ||
                          t.name
                            ?.toLowerCase()
                            .includes(tokenSearch.toLowerCase()),
                      )
                      .map((token) => {
                        const isRenaming = renamingId === token.id;
                        return (
                          <div
                            key={token.id}
                            className="group flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/3 hover:bg-white/6 border border-white/6 transition-colors"
                          >
                            {token.image_url ? (
                              <img
                                src={token.image_url}
                                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0 text-white/40">
                                {token.name?.charAt(0) ?? "?"}
                              </div>
                            )}
                            {isRenaming ? (
                              <input
                                autoFocus
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    onRenameToken(token.id, renameValue);
                                    setRenamingId(null);
                                  }
                                  if (e.key === "Escape") setRenamingId(null);
                                }}
                                onBlur={() => {
                                  if (renameValue.trim())
                                    onRenameToken(token.id, renameValue);
                                  setRenamingId(null);
                                }}
                                className="flex-1 min-w-0 bg-white/10 border border-amber-500/40 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                              />
                            ) : (
                              <span
                                className="flex-1 min-w-0 text-xs text-white/70 truncate cursor-pointer hover:text-white/90"
                                onDoubleClick={() => {
                                  setRenamingId(token.id);
                                  setRenameValue(token.name ?? "");
                                }}
                                title="Double-click to rename"
                              >
                                {token.name}
                              </span>
                            )}
                            <span
                              className={`text-[10px] flex-shrink-0 ${token.visible ? "text-green-400/60" : "text-white/20"}`}
                            >
                              {token.visible ? "●" : "○"}
                            </span>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button
                                title="Pan to token"
                                onClick={() => onLocateToken(token.id)}
                                className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-sky-400 hover:bg-sky-500/10 transition-colors text-xs"
                              >
                                ◎
                              </button>
                              <button
                                title="Rename"
                                onClick={() => {
                                  setRenamingId(token.id);
                                  setRenameValue(token.name ?? "");
                                }}
                                className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-amber-400 hover:bg-amber-500/10 transition-colors text-xs"
                              >
                                ✎
                              </button>
                              <button
                                title="Delete"
                                onClick={() => {
                                  if (window.confirm(`Delete "${token.name}"?`))
                                    onDeleteToken(token.id);
                                }}
                                className="w-6 h-6 rounded flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors text-xs"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              )}
              {tokens.length === 0 && activeSceneId && (
                <p className="text-white/20 text-xs text-center py-4">
                  No tokens on this scene
                </p>
              )}
            </div>
          )}

          {/* ── MAP ── */}
          {activeTab === "map" && (
            <div className="flex flex-col gap-3 p-4">
              {!activeSceneId && (
                <p className="text-amber-400/60 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Switch to a scene first
                </p>
              )}
              <button
                onClick={() => setPicker("map")}
                disabled={!activeSceneId}
                className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white/90 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-base">🗺</span> Choose Map Image
              </button>
            </div>
          )}

          {/* ── NPCS ── */}
          {activeTab === "npcs" && (
            <div className="p-3">
              <NpcLibraryPanel
                gameId={gameId}
                gameSystemSlug={gameSystemSlug}
                onOpenStatBlock={onOpenStatBlock}
              />
            </div>
          )}

          {/* ── SETTINGS ── */}
          {activeTab === "settings" && (
            <SettingsPanel
              gameId={gameId}
              activeSceneId={activeSceneId}
              onSceneSettingChange={onSaveSceneSettings}
              onGameSettingChange={onSaveGameSettings}
              onClearFog={onClearFog}
              visibilityMode={visibilityMode}
              onSetVisibilityMode={onSetVisibilityMode}
            />
          )}
        </div>
      </div>

      {picker && (
        <AssetPicker
          assets={assets}
          sharedLibrary={sharedLibrary}
          loading={assetsLoading}
          uploading={uploading}
          title={picker === "map" ? "Choose a Map" : "Choose a Token"}
          type={picker}
          isPro={isPro}
          onSelect={picker === "map" ? handleMapPick : handleTokenPick}
          onUpload={handleUpload}
          onDelete={deleteAsset}
          onAddFromLibrary={addFromLibrary}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
