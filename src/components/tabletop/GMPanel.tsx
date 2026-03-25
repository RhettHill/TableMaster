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

interface GMPanelProps {
  open: boolean;
  userId: string;
  gameId: string;
  activeSceneId: string | null;
  onSceneSwitch: (scene: Scene) => void;
  onAddToken: (token: Token) => void;
  onSaveSceneSettings: (settings: SceneSettings) => Promise<void>;
  onSaveGameSettings: (settings: GameSettings) => Promise<void>;
  onClose: () => void;
  onOpenStatBlock: (id: string) => void;
  gameSystemSlug: string;
  fogEnabled: boolean;
  onToggleFog: (enabled: boolean) => void;
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
  onSceneSwitch,
  onAddToken,
  onSaveSceneSettings,
  onSaveGameSettings,
  onClose,
  onOpenStatBlock,
  gameSystemSlug,
  fogEnabled,
  onToggleFog,
}: GMPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("scenes");
  const [picker, setPicker] = useState<null | "map" | "token">(null);
  const [uploading, setUploading] = useState(false);
  const [newSceneName, setNewSceneName] = useState("");

  const setMap = useGameStore((s) => s.setMap);
  const tokens = useGameStore((s) => s.tokens);

  const {
    assets,
    loading: assetsLoading,
    uploadAsset,
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

  const handleUpload = async (file: File, type: "map" | "token") => {
    setUploading(true);
    await uploadAsset(file, type);
    setUploading(false);
  };

  const handleMapPick = async (asset: Asset) => {
    setMap(asset.file_url);
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
          {/* ── SCENES ────────────────────────────────────────────────────── */}
          {activeTab === "scenes" && (
            <div className="flex flex-col gap-3 p-4">
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
                <div className="flex flex-col gap-1">
                  {scenes.map((scene) => {
                    const isActive = scene.id === activeSceneId;
                    return (
                      <div
                        key={scene.id}
                        onClick={() => onSceneSwitch(scene)}
                        className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-all duration-150
                          ${
                            isActive
                              ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
                              : "bg-white/4 border-white/8 text-white/60 hover:bg-white/8 hover:text-white/90"
                          }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? "bg-amber-400" : "bg-white/20"}`}
                        />
                        <span className="flex-1 truncate">{scene.name}</span>
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
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TOKENS ────────────────────────────────────────────────────── */}
          {activeTab === "tokens" && (
            <div className="flex flex-col gap-3 p-4">
              {!activeSceneId && (
                <p className="text-amber-400/60 text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  Switch to a scene first
                </p>
              )}
              <button
                onClick={() => setPicker("token")}
                disabled={!activeSceneId}
                className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white/60 hover:text-white/90 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-base">🪙</span> Add Token from Library
              </button>

              {tokens.length > 0 && (
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1">
                    On map ({tokens.length})
                  </p>
                  {tokens.map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border border-white/8 text-sm text-white/60"
                    >
                      {token.image_url ? (
                        <img
                          src={token.image_url}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs flex-shrink-0">
                          {token.name?.charAt(0)}
                        </div>
                      )}
                      <span className="truncate flex-1">{token.name}</span>
                      <span
                        className={`text-xs ${token.visible ? "text-green-400/60" : "text-white/20"}`}
                      >
                        {token.visible ? "●" : "○"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MAP ───────────────────────────────────────────────────────── */}
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

          {/* ── NPCS ─────────────────────────────────────────────────────── */}
          {activeTab === "npcs" && (
            <div className="p-3">
              <NpcLibraryPanel
                gameId={gameId}
                gameSystemSlug={gameSystemSlug}
                onOpenStatBlock={onOpenStatBlock}
              />
            </div>
          )}

          {/* ── SETTINGS ──────────────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div className="p-4 flex flex-col gap-4">
              {/* Fog of war toggle */}
              <div className="flex items-center justify-between px-1 mb-4">
                <div>
                  <p className="text-white/80 text-sm font-semibold">
                    Fog of War
                  </p>
                  <p className="text-white/30 text-[10px]">
                    Hides map from players based on token vision
                  </p>
                </div>
                <button
                  onClick={() => onToggleFog(!fogEnabled)}
                  className={`w-10 h-5 rounded-full border transition-all relative ${
                    fogEnabled
                      ? "bg-amber-500/40 border-amber-500/60"
                      : "bg-white/5 border-white/15"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                      fogEnabled
                        ? "left-5 bg-amber-400"
                        : "left-0.5 bg-white/30"
                    }`}
                  />
                </button>
              </div>

              <SettingsPanel
                gameId={gameId}
                activeSceneId={activeSceneId}
                onSceneSettingChange={onSaveSceneSettings}
                onGameSettingChange={onSaveGameSettings}
              />
            </div>
          )}
        </div>
      </div>

      {picker && (
        <AssetPicker
          assets={assets}
          loading={assetsLoading}
          uploading={uploading}
          title={picker === "map" ? "Choose a Map" : "Choose a Token"}
          type={picker}
          onSelect={picker === "map" ? handleMapPick : handleTokenPick}
          onUpload={(file) => handleUpload(file, picker)}
          onDelete={deleteAsset}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}
