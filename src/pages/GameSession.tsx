import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import {
  useGameStore,
  SceneSettings,
  GameSettings,
  DEFAULT_SCENE_SETTINGS,
  DEFAULT_GAME_SETTINGS,
} from "../store/gameStore";
import type { Scene } from "../hooks/useScenes";
import { useTokens } from "../hooks/useTokens";
import { useCharacterSheet } from "../hooks/useCharacterSheet";
import { useFog } from "../hooks/useFog";
import { useWalls } from "../hooks/useWalls";

import type { ActiveTool } from "../types/Types";
import type { Token } from "../types/Types";
import Tabletop from "../components/tabletop/Tabletop";
import Toolbar from "../components/tabletop/Toolbar";
import GMPanel from "../components/tabletop/GMPanel";
import CharacterSheet from "../components/sheets/CharacterSheet";
import SystemPickerModal from "../components/sheets/SystemPickerModal";
import PlayerPickerModal from "../components/PlayerPickerModal";
import PresenceHUD from "../components/Presencehud";
import AssignStatBlockPicker from "../components/StatBlockPicker";
import NpcStatBlockPanel from "../components/tabletop/StatsPanel";
import {
  PresenceUser,
  useRealtimeGame,
  RemotePing,
} from "../hooks/useRealTimeGame";
import type { Ping } from "../components/tabletop/PingLayer";
import { useNpcStatBlocks } from "../hooks/useStatBlock";
import { useMeasurementStore } from "../store/MeasurementStore";

export default function GameSession() {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const { gameId } = useParams<{ gameId: string }>();

  // ── Game info + GM check ──────────────────────────────────────────────────────
  const [isGM, setIsGM] = useState(false);
  const [gameSystemId, setGameSystemId] = useState<string | undefined>(
    undefined,
  );
  const [gameSystemSlug, setGameSystemSlug] = useState<string>("dnd5e");
  const setGameSettings = useGameStore((s) => s.setGameSettings);

  useEffect(() => {
    if (!gameId || !user) return;
    supabase
      .from("games")
      .select(
        "owner_id, name, default_grid_size, bg_color, system_id, systems(slug)",
      )
      .eq("id", gameId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return;
        setIsGM(data.owner_id === user.id);
        setGameSystemId(data.system_id ?? undefined);
        setGameSystemSlug((data.systems as any)?.slug ?? "dnd5e");
        setGameSettings({
          gameName: data.name ?? "",
          defaultGridSize:
            data.default_grid_size ?? DEFAULT_GAME_SETTINGS.defaultGridSize,
          bgColor: data.bg_color ?? DEFAULT_GAME_SETTINGS.bgColor,
        });
      });
  }, [gameId, user]);

  // ── Store ─────────────────────────────────────────────────────────────────────
  const setMap = useGameStore((s) => s.setMap);
  const setTokens = useGameStore((s) => s.setTokens);
  const storeAddToken = useGameStore((s) => s.addToken);
  const storeMoveToken = useGameStore((s) => s.moveToken);
  const storeUpdateToken = useGameStore((s) => s.updateToken);
  const storeRemoveToken = useGameStore((s) => s.removeToken);
  const setSceneSettings = useGameStore((s) => s.setSceneSettings);
  const gameSettings = useGameStore((s) => s.gameSettings);
  const setFeetPerSquare = useMeasurementStore((s) => s.setFeetPerSquare);

  const _tokens = useGameStore((s) => s.tokens);
  useEffect(() => {
    (window as any).__gameStoreTokens = _tokens;
  }, [_tokens]);
  // Expose store for locate-token camera pan
  const _store = useGameStore;
  useEffect(() => {
    (window as any).__gameStore = _store;
  }, [_store]);

  // ── Character sheet ───────────────────────────────────────────────────────────
  const {
    openSheet,
    needsSystemPick,
    needsPlayerPick,
    openOwn,
    openForToken,
    autoLinkSheet,
    confirmSystemPick,
    cancelSystemPick,
    confirmPlayerPick,
    cancelPlayerPick,
    closeSheet,
  } = useCharacterSheet(user?.id ?? "", isGM, gameSystemSlug);

  // ── NPC stat blocks ───────────────────────────────────────────────────────────
  const { assignToToken } = useNpcStatBlocks(gameId ?? null);
  const [openStatBlockId, setOpenStatBlockId] = useState<string | null>(null);
  const [assigningTokenId, setAssigningTokenId] = useState<string | null>(null);
  const [assigningTokenName, setAssigningTokenName] = useState<string>("");

  // ── Active scene ──────────────────────────────────────────────────────────────
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const activeSceneIdRef = useRef<string | null>(null);

  const updateActiveScene = useCallback((id: string | null) => {
    activeSceneIdRef.current = id;
    setActiveSceneId(id);
  }, []);

  // ── Walls ─────────────────────────────────────────────────────────────────────

  // ── Fog — single source of truth, shared by Tabletop + GMPanel ───────────────
  // sendFogRef is set after useRealtimeGame (below) and passed into useFog's ref.
  const sendFogRef = useRef<
    ((e: import("../hooks/useFog").FogBroadcastEvent) => void) | null
  >(null);
  const sendFogStable = useCallback(
    (e: import("../hooks/useFog").FogBroadcastEvent) => sendFogRef.current?.(e),
    [],
  );

  // handleWallBroadcast stable ref — useWalls is called AFTER useRealtimeGame
  // so we forward through a ref to break the circular declaration dependency.
  const handleWallBroadcastRef = useRef<
    ((e: import("../hooks/useWalls").WallBroadcastEvent) => void) | null
  >(null);
  const handleWallBroadcastStable = useCallback(
    (e: import("../hooks/useWalls").WallBroadcastEvent) =>
      handleWallBroadcastRef.current?.(e),
    [],
  );
  const {
    visibilityMode,
    revealedRegions,
    setVisibilityMode,
    addRevealedRegion,
    removeRevealedRegion,
    clearFog,
    handleFogBroadcast,
    handleSceneUpdate,
  } = useFog(activeSceneId, gameId ?? null, sendFogStable);

  const dbSetActiveScene = useCallback(
    async (sceneId: string) => {
      await supabase
        .from("scenes")
        .update({ active: false })
        .eq("game_id", gameId);
      await supabase.from("scenes").update({ active: true }).eq("id", sceneId);
    },
    [gameId],
  );

  const { addToken: dbAddToken, moveToken: dbMoveToken } = useTokens();

  // ── Scene settings ────────────────────────────────────────────────────────────
  const applySceneSettings = useCallback(
    (scene: Scene) => {
      setSceneSettings({
        gridSize: scene.grid_size ?? DEFAULT_SCENE_SETTINGS.gridSize,
        gridOpacity: scene.grid_opacity ?? DEFAULT_SCENE_SETTINGS.gridOpacity,
        gridColor: scene.grid_color ?? DEFAULT_SCENE_SETTINGS.gridColor,
        gridType:
          (scene.grid_type as "square" | "hex") ??
          DEFAULT_SCENE_SETTINGS.gridType,
        snapToGrid: scene.snap_to_grid ?? DEFAULT_SCENE_SETTINGS.snapToGrid,
        bgColor: scene.bg_color ?? DEFAULT_SCENE_SETTINGS.bgColor,
        mapWidth: scene.map_width ?? DEFAULT_SCENE_SETTINGS.mapWidth,
        mapHeight: scene.map_height ?? DEFAULT_SCENE_SETTINGS.mapHeight,
      });
      // feet_per_square is stored on the scene so all clients share the same scale
      if ((scene as any).feet_per_square) {
        setFeetPerSquare((scene as any).feet_per_square);
      }
    },
    [setSceneSettings, setFeetPerSquare],
  );

  // ── Restore on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;
    const restore = async () => {
      const { data: sceneRows } = await supabase
        .from("scenes")
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true });

      if (!sceneRows || sceneRows.length === 0) {
        setMap("/testmap.jpg");
        setTokens([]);
        setSceneSettings(DEFAULT_SCENE_SETTINGS);
        updateActiveScene(null);
        return;
      }

      const active = sceneRows.find((s: Scene) => s.active);
      if (!active) {
        setMap("/testmap.jpg");
        setTokens([]);
        setSceneSettings(DEFAULT_SCENE_SETTINGS);
        updateActiveScene(null);
        return;
      }

      updateActiveScene(active.id);
      setMap(active.map_url ?? "/testmap.jpg");
      applySceneSettings(active);
      // useFog handles fog_enabled, visibility_mode, and revealedRegions
      // automatically when activeSceneId changes — no manual loading needed.

      const { data: tokenRows } = await supabase
        .from("tokens")
        .select("*")
        .eq("scene_id", active.id)
        .order("created_at", { ascending: true });
      setTokens(tokenRows ?? []);
    };
    restore();
  }, [gameId]);

  // ── Scene switch ──────────────────────────────────────────────────────────────
  const handleSceneSwitch = useCallback(
    async (scene: Scene) => {
      updateActiveScene(scene.id);
      setMap(scene.map_url ?? "/testmap.jpg");
      applySceneSettings(scene);
      await dbSetActiveScene(scene.id);
      // useFog reacts to activeSceneId change and reloads fog state automatically

      const { data: tokenRows } = await supabase
        .from("tokens")
        .select("*")
        .eq("scene_id", scene.id)
        .order("created_at", { ascending: true });
      setTokens(tokenRows ?? []);
    },
    [
      setMap,
      dbSetActiveScene,
      setTokens,
      applySceneSettings,
      updateActiveScene,
    ],
  );

  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);

  const handleRemotePing = useCallback((ping: RemotePing) => {
    const p: Ping = {
      id: ping.id,
      x: ping.x,
      y: ping.y,
      color: ping.color,
      label: ping.label,
      timestamp: ping.timestamp,
    };
    setPings((prev) => [...prev, p]);
    setTimeout(
      () => setPings((prev) => prev.filter((pp) => pp.id !== p.id)),
      3000,
    );
  }, []);

  // ── Realtime ──────────────────────────────────────────────────────────────────
  const {
    remoteMeasures,
    broadcastMeasure,
    broadcastClearMeasure,
    sendFog,
    sendTokenMove,
    sendWall,
    sendPing,
  } = useRealtimeGame({
    gameId: gameId ?? "",
    userId: user?.id ?? "",
    isGM,
    activeSceneId,
    onSceneSwitch: handleSceneSwitch,
    onPresenceChange: setPresenceUsers,
    onFogBroadcast: handleFogBroadcast,
    onFogSceneUpdate: handleSceneUpdate,
    onSceneSettingsChange: applySceneSettings,
    onWallBroadcast: handleWallBroadcastStable,
    onPing: handleRemotePing,
  });
  // Wire the shared channel's sendFog into useFog's ref
  // (useEffect runs after render so this is always set before any fog action)
  useEffect(() => {
    sendFogRef.current = sendFog;
  }, [sendFog]);

  // ── Walls — uses shared channel via sendWall from useRealtimeGame ──────────
  const sendWallRef = useRef<
    ((e: import("../hooks/useWalls").WallBroadcastEvent) => void) | null
  >(null);
  const sendWallStable = useCallback(
    (e: import("../hooks/useWalls").WallBroadcastEvent) =>
      sendWallRef.current?.(e),
    [],
  );
  const { walls, addWall, removeWall, toggleDoor, handleWallBroadcast } =
    useWalls(activeSceneId, gameId ?? null, sendWallStable);
  useEffect(() => {
    sendWallRef.current = sendWall;
  }, [sendWall]);
  useEffect(() => {
    handleWallBroadcastRef.current = handleWallBroadcast;
  }, [handleWallBroadcast]);

  // ── Save settings ─────────────────────────────────────────────────────────────
  const handleSaveSceneSettings = useCallback(
    async (settings: SceneSettings & { feetPerSquare?: number }) => {
      const sceneId = activeSceneIdRef.current;
      if (!sceneId) return;
      await supabase
        .from("scenes")
        .update({
          grid_size: settings.gridSize,
          grid_opacity: settings.gridOpacity,
          grid_color: settings.gridColor,
          grid_type: settings.gridType,
          snap_to_grid: settings.snapToGrid,
          bg_color: settings.bgColor,
          map_width: settings.mapWidth,
          map_height: settings.mapHeight,
          // feet_per_square persisted so players receive it via postgres_changes
          ...(settings.feetPerSquare !== undefined
            ? { feet_per_square: settings.feetPerSquare }
            : {}),
        })
        .eq("id", sceneId);
    },
    [],
  );

  const handleSaveGameSettings = useCallback(
    async (settings: GameSettings) => {
      if (!gameId) return;
      await supabase
        .from("games")
        .update({
          name: settings.gameName,
          default_grid_size: settings.defaultGridSize,
          bg_color: settings.bgColor,
        })
        .eq("id", gameId);
    },
    [gameId],
  );

  // ── Token handlers ────────────────────────────────────────────────────────────
  const handleAddToken = useCallback(
    async (token: Token) => {
      const sceneId = activeSceneIdRef.current;
      const userId = user?.id ?? null;
      if (!userId || !sceneId) return;
      const saved = await dbAddToken(token, sceneId, userId);
      if (saved) storeAddToken(saved);
    },
    [user, dbAddToken, storeAddToken],
  );

  const handleMoveToken = useCallback(
    async (id: string, x: number, y: number) => {
      // Optimistic local update
      storeMoveToken(id, x, y);
      // Broadcast position to all other clients instantly (GM + other players)
      // This bypasses the postgres_changes round-trip and owner_id ambiguity
      sendTokenMove(id, x, y);
      // Also persist to DB (source of truth on reconnect/reload)
      await dbMoveToken(id, x, y);
    },
    [storeMoveToken, dbMoveToken, sendTokenMove],
  );

  const handleRenameToken = useCallback(
    async (id: string, name: string) => {
      storeUpdateToken(id, { name });
      await supabase.from("tokens").update({ name }).eq("id", id);
    },
    [storeUpdateToken],
  );

  const handleToggleVisibility = useCallback(
    async (id: string, visible: boolean) => {
      storeUpdateToken(id, { visible });
      await supabase.from("tokens").update({ visible }).eq("id", id);
    },
    [storeUpdateToken],
  );

  const handleTogglePlayerEditable = useCallback(
    async (id: string, player_editable: boolean) => {
      storeUpdateToken(id, { player_editable });
      await supabase.from("tokens").update({ player_editable }).eq("id", id);
      if (player_editable && gameId) {
        const tokens = (window as any).__gameStoreTokens ?? [];
        const token = tokens.find((t: any) => t.id === id);
        const ownerId = token?.owner_id;
        if (ownerId) await autoLinkSheet(id, ownerId, gameId);
      }
    },
    [storeUpdateToken, gameId, autoLinkSheet],
  );

  const handleEditStats = useCallback(
    async (
      id: string,
      stats: {
        hp: number;
        maxHp: number;
        ac: number;
        showStats: boolean;
        vision_radius: number;
        darkvision: number;
        auras?: { radius: number; color: string; label?: string }[];
      },
    ) => {
      // Cast to any: stats_json is JSONB and accepts our extended shape.
      // The project TokenStats type may not include auras[] but the DB column does.
      storeUpdateToken(id, { stats_json: stats as any });
      await supabase
        .from("tokens")
        .update({ stats_json: stats as any })
        .eq("id", id);
      const { data: token } = await supabase
        .from("tokens")
        .select("sheet_id")
        .eq("id", id)
        .single();
      if (token?.sheet_id) {
        const { data: sheet } = await supabase
          .from("character_sheets")
          .select("data")
          .eq("id", token.sheet_id)
          .single();
        if (sheet) {
          await supabase
            .from("character_sheets")
            .update({
              data: {
                ...(sheet.data ?? {}),
                hp: stats.hp,
                maxHp: stats.maxHp,
                ac: stats.ac,
              },
            })
            .eq("id", token.sheet_id);
        }
      }
    },
    [storeUpdateToken],
  );

  const sizeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSetTokenSize = useCallback(
    (id: string, token_size: number) => {
      storeUpdateToken(id, { token_size });
      if (sizeDebounceRef.current) clearTimeout(sizeDebounceRef.current);
      sizeDebounceRef.current = setTimeout(async () => {
        await supabase.from("tokens").update({ token_size }).eq("id", id);
      }, 400);
    },
    [storeUpdateToken],
  );

  const handleDeleteTokens = useCallback(
    async (ids: string[]) => {
      ids.forEach((id) => storeRemoveToken(id));
      await supabase.from("tokens").delete().in("id", ids);
    },
    [storeRemoveToken],
  );

  const handleLocateToken = useCallback((id: string) => {
    // Pan the camera so the token is centered in the viewport
    // We import setZoomAndCamera from gameStore
    const tokens = (window as any).__gameStoreTokens ?? [];
    const token = tokens.find((t: any) => t.id === id);
    if (!token) return;
    const store = (window as any).__gameStore;
    if (store) {
      const { zoom, panCamera } = store.getState();
      const W = window.innerWidth;
      const H = window.innerHeight;
      panCamera(W / 2 - token.x * zoom, H / 2 - token.y * zoom);
    }
  }, []);

  const handlePing = useCallback(
    (x: number, y: number) => {
      const me = presenceUsers.find((u) => u.userId === user?.id);
      const label = me?.displayName ?? (isGM ? "GM" : "Player");
      const color = isGM ? "#f59e0b" : "#60a5fa";
      const ping = sendPing(x, y, label, color);
      // Show own ping locally immediately (broadcast echo skipped by senderId check)
      setPings((prev) => [...prev, { ...ping, label }]);
      setTimeout(
        () => setPings((prev) => prev.filter((p) => p.id !== ping.id)),
        3000,
      );
    },
    [sendPing, isGM, presenceUsers, user?.id],
  );

  // ── Sheet handlers ────────────────────────────────────────────────────────────
  const handleOpenSheet = useCallback(
    (tokenId: string) => {
      if (gameId) openForToken(tokenId, gameId);
    },
    [gameId, openForToken],
  );

  const handleOpenOwnSheet = useCallback(() => {
    if (gameId) openOwn(gameId, gameSystemId);
  }, [gameId, gameSystemId, openOwn]);

  // ── NPC stat block handlers ───────────────────────────────────────────────────
  const handleOpenStatBlock = useCallback((tokenId: string) => {
    const tokens = (window as any).__gameStoreTokens ?? [];
    const token = tokens.find((t: any) => t.id === tokenId);
    if (token?.npc_stat_block_id) setOpenStatBlockId(token.npc_stat_block_id);
  }, []);

  const handleAssignStatBlock = useCallback((tokenId: string) => {
    const tokens = (window as any).__gameStoreTokens ?? [];
    const token = tokens.find((t: any) => t.id === tokenId);
    setAssigningTokenId(tokenId);
    setAssigningTokenName(token?.name ?? "Token");
  }, []);

  const handleConfirmAssign = useCallback(
    async (statBlockId: string) => {
      if (!assigningTokenId) return;
      const ok = await assignToToken(assigningTokenId, statBlockId);
      if (ok) {
        const { data } = await supabase
          .from("tokens")
          .select("*")
          .eq("id", assigningTokenId)
          .single();
        if (data) storeUpdateToken(assigningTokenId, data);
      }
      setAssigningTokenId(null);
    },
    [assigningTokenId, assignToToken, storeUpdateToken],
  );

  // ── Prompt players to create sheet on first load ──────────────────────────────
  const sheetCheckDone = useRef(false);
  useEffect(() => {
    if (!gameId || !user || isGM) return;
    if (gameSystemId === undefined) return;
    if (sheetCheckDone.current) return;
    sheetCheckDone.current = true;
    supabase
      .from("character_sheets")
      .select("id")
      .eq("game_id", gameId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) {
          await supabase.rpc("get_or_create_sheet", {
            p_game_id: gameId,
            p_user_id: user.id,
            p_system_slug: gameSystemSlug || "dnd5e",
          });
        }
      });
  }, [gameId, user, isGM, gameSystemId, openOwn]);

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [gmPanelOpen, setGmPanelOpen] = useState(false);
  const [diceOpen, setDiceOpen] = useState(false);

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (!user || !gameId) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0d0d14]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-white/30 text-xs tracking-widest uppercase">
            Entering game…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: gameSettings.bgColor }}
    >
      <Tabletop
        activeTool={activeTool}
        isGM={isGM}
        gameId={gameId}
        sceneId={activeSceneId}
        diceOpen={diceOpen}
        onDiceClose={() => setDiceOpen(false)}
        onMoveToken={handleMoveToken}
        onRenameToken={handleRenameToken}
        onToggleVisibility={handleToggleVisibility}
        onTogglePlayerEditable={handleTogglePlayerEditable}
        onEditStats={handleEditStats}
        onSetTokenSize={handleSetTokenSize}
        onDeleteTokens={handleDeleteTokens}
        onOpenSheet={handleOpenSheet}
        onOpenStatBlock={handleOpenStatBlock}
        onAssignStatBlock={handleAssignStatBlock}
        walls={walls}
        currentUserId={user.id}
        onAddWall={addWall}
        onRemoveWall={removeWall}
        onToggleDoor={toggleDoor}
        onMeasureChange={broadcastMeasure}
        onMeasureClear={broadcastClearMeasure}
        remoteMeasures={[...remoteMeasures.values()]}
        pings={pings}
        onPing={handlePing}
        // Fog — passed from the single useFog call above
        visibilityMode={visibilityMode}
        revealedRegions={revealedRegions}
        onAddRevealedRegion={addRevealedRegion}
        onRemoveRevealedRegion={removeRevealedRegion}
      />

      <div className="absolute left-0 top-0 h-full z-20 pointer-events-none">
        <Toolbar
          activeTool={activeTool}
          isGM={isGM}
          diceOpen={diceOpen}
          onToolChange={setActiveTool}
          onGMPanelToggle={() => setGmPanelOpen((v) => !v)}
          onDiceToggle={() => setDiceOpen((v) => !v)}
          onOpenSheet={handleOpenOwnSheet}
          gmPanelOpen={gmPanelOpen}
          visibilityMode={visibilityMode}
          currentUserId={user.id}
          onEditStats={handleEditStats}
        />
      </div>

      {isGM && (
        <div className="absolute right-0 top-0 h-full z-20 pointer-events-none">
          <GMPanel
            open={gmPanelOpen}
            userId={user.id}
            gameId={gameId}
            activeSceneId={activeSceneId}
            onSceneSwitch={handleSceneSwitch}
            onAddToken={handleAddToken}
            onSaveSceneSettings={handleSaveSceneSettings}
            onSaveGameSettings={handleSaveGameSettings}
            onClose={() => setGmPanelOpen(false)}
            onOpenStatBlock={setOpenStatBlockId}
            gameSystemSlug={gameSystemSlug}
            // Fog — same useFog instance, so GM controls affect all clients
            onClearFog={clearFog}
            visibilityMode={visibilityMode}
            onSetVisibilityMode={setVisibilityMode}
            onDeleteToken={(id) => handleDeleteTokens([id])}
            onRenameToken={handleRenameToken}
            onLocateToken={handleLocateToken}
          />
        </div>
      )}

      {openSheet && (
        <CharacterSheet
          sheetId={openSheet.sheetId}
          tokenId={openSheet.tokenId}
          gameId={gameId}
          userId={user.id}
          isGM={isGM}
          canEdit={openSheet.canEdit}
          onClose={closeSheet}
        />
      )}
      {needsSystemPick && (
        <SystemPickerModal
          defaultSystemId={gameSystemId}
          onConfirm={confirmSystemPick}
          onCancel={cancelSystemPick}
        />
      )}
      {needsPlayerPick && (
        <PlayerPickerModal
          gameId={gameId!}
          onConfirm={confirmPlayerPick}
          onCancel={cancelPlayerPick}
        />
      )}
      {openStatBlockId && (
        <NpcStatBlockPanel
          statBlockId={openStatBlockId}
          gameId={gameId}
          isGM={isGM}
          onClose={() => setOpenStatBlockId(null)}
        />
      )}
      {assigningTokenId && (
        <AssignStatBlockPicker
          tokenName={assigningTokenName}
          gameId={gameId!}
          onAssign={handleConfirmAssign}
          onClose={() => setAssigningTokenId(null)}
        />
      )}

      <PresenceHUD users={presenceUsers} currentUserId={user.id} />
      <ZoomHUD />
    </div>
  );
}

function ZoomHUD() {
  const zoom = useGameStore((s) => s.zoom);
  return (
    <div className="absolute bottom-4 right-4 z-20 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm border border-white/10 text-white/40 text-xs font-mono tabular-nums pointer-events-none">
      {Math.round(zoom * 100)}%
    </div>
  );
}
