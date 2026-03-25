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
import { PresenceUser, useRealtimeGame } from "../hooks/useRealTimeGame";
import { useNpcStatBlocks } from "../hooks/useStatBlock";

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

  // Expose tokens to window so NPC handlers can look up token data without prop drilling
  const _tokens = useGameStore((s) => s.tokens);
  useEffect(() => {
    (window as any).__gameStoreTokens = _tokens;
  }, [_tokens]);

  // ── Character sheet hook (must be before any handler that uses autoLinkSheet) ─
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
  const { statBlocks, assignToToken } = useNpcStatBlocks(gameId ?? null);
  const [openStatBlockId, setOpenStatBlockId] = useState<string | null>(null);
  const [assigningTokenId, setAssigningTokenId] = useState<string | null>(null);
  const [assigningTokenName, setAssigningTokenName] = useState<string>("");

  // ── Active scene ──────────────────────────────────────────────────────────────
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const activeSceneIdRef = useRef<string | null>(null);

  // ── Walls + fog ──────────────────────────────────────────────────────────────
  const {
    walls,
    addWall,
    removeWall,
    toggleDoor,
    reload: reloadWalls,
  } = useWalls(activeSceneId, gameId ?? null);
  const [fogEnabled, setFogEnabled] = useState(false);
  const [revealedRegions, setRevealedRegions] = useState<
    { cx: number; cy: number; radius: number }[]
  >([]);

  const updateActiveScene = (id: string | null) => {
    activeSceneIdRef.current = id;
    setActiveSceneId(id);
  };

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
    },
    [setSceneSettings],
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
      setFogEnabled((active as any).fog_enabled ?? false);

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
      setFogEnabled((scene as any).fog_enabled ?? false);
      await dbSetActiveScene(scene.id);
      const { data: tokenRows } = await supabase
        .from("tokens")
        .select("*")
        .eq("scene_id", scene.id)
        .order("created_at", { ascending: true });
      setTokens(tokenRows ?? []);
    },
    [setMap, dbSetActiveScene, setTokens, applySceneSettings],
  );

  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);

  // ── Realtime — tokens, scenes, measurements, presence ────────────────────────
  const { remoteMeasures, broadcastMeasure, broadcastClearMeasure } =
    useRealtimeGame({
      gameId: gameId ?? "",
      userId: user?.id ?? "",
      isGM,
      activeSceneId,
      onSceneSwitch: handleSceneSwitch,
      onPresenceChange: setPresenceUsers,
    });

  // ── Save settings ─────────────────────────────────────────────────────────────
  const handleSaveSceneSettings = useCallback(
    async (settings: SceneSettings) => {
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
      storeMoveToken(id, x, y);
      await dbMoveToken(id, x, y);
    },
    [storeMoveToken, dbMoveToken],
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

      // Auto-link the token owner's sheet when player control is granted
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
      },
    ) => {
      storeUpdateToken(id, { stats_json: stats });
      await supabase.from("tokens").update({ stats_json: stats }).eq("id", id);

      // Sync back to the linked character sheet so sheet data stays consistent
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
          const updatedData = {
            ...(sheet.data ?? {}),
            hp: stats.hp,
            maxHp: stats.maxHp,
            ac: stats.ac,
          };
          await supabase
            .from("character_sheets")
            .update({ data: updatedData })
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

  const handleToggleFog = useCallback(
    async (enabled: boolean) => {
      setFogEnabled(enabled);
      if (activeSceneId) {
        await supabase
          .from("scenes")
          .update({ fog_enabled: enabled })
          .eq("id", activeSceneId);
      }
    },
    [activeSceneId],
  );

  // ── Sheet handlers ────────────────────────────────────────────────────────────
  const handleOpenSheet = useCallback(
    (tokenId: string) => {
      if (!gameId) return;
      openForToken(tokenId, gameId);
    },
    [gameId, openForToken],
  );

  const handleOpenOwnSheet = useCallback(() => {
    if (!gameId) return;
    openOwn(gameId, gameSystemId);
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
  const handleAddRevealedRegion = useCallback(
    (cx: number, cy: number, radius: number) => {
      setRevealedRegions((prev) => [...prev, { cx, cy, radius }]);
      // TODO: persist to fog_revealed table in Supabase if needed
    },
    [],
  );

  // ── Prompt players to create their sheet on first session load ────────────────
  const sheetCheckDone = useRef(false);
  useEffect(() => {
    if (!gameId || !user || isGM) return;
    if (gameSystemId === undefined) return; // wait for game info to load
    if (sheetCheckDone.current) return;
    sheetCheckDone.current = true;

    // Silently create the sheet using the game's system — don't open it
    // The player opens it themselves via the toolbar when they're ready
    supabase
      .from("character_sheets")
      .select("id")
      .eq("game_id", gameId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) {
          // No sheet yet — create one silently using the game's system
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
        fogEnabled={fogEnabled}
        revealedRegions={revealedRegions}
        currentUserId={user.id}
        onAddWall={addWall}
        onRemoveWall={removeWall}
        onToggleDoor={toggleDoor}
        onMeasureChange={broadcastMeasure}
        onMeasureClear={broadcastClearMeasure}
        remoteMeasures={[...remoteMeasures.values()]}
        onAddRevealedRegion={handleAddRevealedRegion}
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
            fogEnabled={fogEnabled}
            onToggleFog={handleToggleFog}
          />
        </div>
      )}

      {/* Character sheet */}
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

      {/* System picker — shown when player opens sheet for the first time */}
      {needsSystemPick && (
        <SystemPickerModal
          defaultSystemId={gameSystemId}
          onConfirm={confirmSystemPick}
          onCancel={cancelSystemPick}
        />
      )}

      {/* Player picker — GM selects which player's sheet to open */}
      {needsPlayerPick && (
        <PlayerPickerModal
          gameId={gameId!}
          onConfirm={confirmPlayerPick}
          onCancel={cancelPlayerPick}
        />
      )}

      {/* NPC stat block panel */}
      {openStatBlockId && (
        <NpcStatBlockPanel
          statBlockId={openStatBlockId}
          gameId={gameId}
          isGM={isGM}
          onClose={() => setOpenStatBlockId(null)}
        />
      )}

      {/* Assign stat block picker */}
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
