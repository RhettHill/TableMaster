import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";

export interface FogRegion {
  id: string;
  scene_id: string;
  game_id: string;
  cx: number;
  cy: number;
  radius: number;
  shape: "circle";
  points?: any;
}

// "none"     — fog disabled, all players see everything
// "fog"      — GM manually paints revealed areas
// "lighting" — token vision + wall raycasting
export type VisibilityMode = "none" | "fog" | "lighting";

interface FogBroadcastAdd    { type: "fog_add";    region: FogRegion }
interface FogBroadcastRemove { type: "fog_remove"; ids: string[] }
interface FogBroadcastClear  { type: "fog_clear" }
interface FogBroadcastMode   { type: "fog_mode";   mode: VisibilityMode }
export type FogBroadcastEvent = FogBroadcastAdd | FogBroadcastRemove | FogBroadcastClear | FogBroadcastMode;

// sendFn is injected by useRealtimeGame so fog broadcasts go on the shared channel
type SendFn = (event: FogBroadcastEvent) => void;

export function useFog(
  sceneId: string | null,
  gameId: string | null,
  sendFn: SendFn | null,   // injected from useRealtimeGame
) {
  const [visibilityMode, setVisibilityModeState] = useState<VisibilityMode>("none");
  const [revealedRegions, setRevealedRegions] = useState<FogRegion[]>([]);

  // Mirror of revealedRegions in a ref — always current, readable synchronously
  // without needing to be inside a state setter callback. This lets removeRevealedRegion
  // compute which rows to delete before awaiting the DB call, avoiding the race
  // where rapid brush strokes each see the same stale prev state.
  const revealedRegionsRef = useRef<FogRegion[]>([]);
  useEffect(() => { revealedRegionsRef.current = revealedRegions; }, [revealedRegions]);

  // Keep sendFn in a ref so callbacks don't need it in their dep arrays
  const sendRef = useRef<SendFn | null>(null);
  useEffect(() => { sendRef.current = sendFn; }, [sendFn]);

  // ── Initial load (and reload on scene change) ────────────────────────────────
  const load = useCallback(async () => {
    if (!sceneId) {
      setVisibilityModeState("none");
      setRevealedRegions([]);
      return;
    }

    const { data: scene } = await supabase
      .from("scenes")
      .select("visibility_mode")
      .eq("id", sceneId)
      .single();

    setVisibilityModeState((scene?.visibility_mode as VisibilityMode) ?? "none");

    const { data: regions } = await supabase
      .from("fog_revealed")
      .select("*")
      .eq("scene_id", sceneId);

    setRevealedRegions((regions ?? []) as FogRegion[]);
  }, [sceneId]);

  useEffect(() => { load(); }, [load]);

  // ── Called by useRealtimeGame when a fog broadcast arrives ───────────────────
  const handleFogBroadcast = useCallback((event: FogBroadcastEvent) => {
    switch (event.type) {
      case "fog_add":
        setRevealedRegions((prev) => {
          const r = event.region;
          // Remove matching temp placeholder, then deduplicate by real id
          const withoutTemp = prev.filter(
            (p) => !(p.id.startsWith("temp-") && p.cx === r.cx && p.cy === r.cy && p.radius === r.radius),
          );
          if (withoutTemp.some((p) => p.id === r.id)) return withoutTemp;
          return [...withoutTemp, r];
        });
        break;
      case "fog_remove":
        setRevealedRegions((prev) => prev.filter((r) => !event.ids.includes(r.id)));
        break;
      case "fog_clear":
        setRevealedRegions([]);
        break;
      case "fog_mode":
        // Immediate mode update without waiting for postgres_changes
        setVisibilityModeState(event.mode);
        break;
    }
  }, []);

  // ── Called by useRealtimeGame when scenes UPDATE arrives ─────────────────────
  const handleSceneUpdate = useCallback((updated: { visibility_mode?: string }) => {
    if (updated.visibility_mode) {
      setVisibilityModeState(updated.visibility_mode as VisibilityMode);
    }
  }, []);

  // ── Actions (called by GM only) ──────────────────────────────────────────────

  const setVisibilityMode = useCallback(
    async (mode: VisibilityMode) => {
      setVisibilityModeState(mode);
      if (!sceneId) return;
      // Broadcast immediately so players update without waiting for postgres_changes
      sendRef.current?.({ type: "fog_mode", mode });
      // Also persist to DB as source of truth on reconnect/reload
      await supabase.from("scenes").update({ visibility_mode: mode }).eq("id", sceneId);
    },
    [sceneId],
  );

  const addRevealedRegion = useCallback(
    async (cx: number, cy: number, radius: number) => {
      if (!sceneId || !gameId) return;

      // Optimistic: show on GM's screen immediately
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      setRevealedRegions((prev) => [
        ...prev,
        { id: tempId, scene_id: sceneId, game_id: gameId, cx, cy, radius, shape: "circle" },
      ]);

      const { data, error } = await supabase
        .from("fog_revealed")
        .insert({ scene_id: sceneId, game_id: gameId, cx, cy, radius, shape: "circle" })
        .select()
        .single();

      if (error || !data) {
        setRevealedRegions((prev) => prev.filter((r) => r.id !== tempId));
        return;
      }

      const region = data as FogRegion;

      // Swap temp → real on GM's screen
      setRevealedRegions((prev) => prev.map((r) => (r.id === tempId ? region : r)));

      // Broadcast real record to all clients via the shared game channel
      sendRef.current?.({ type: "fog_add", region });
    },
    [sceneId, gameId],
  );

  const removeRevealedRegion = useCallback(
    async (cx: number, cy: number, radius: number) => {
      if (!sceneId) return;

      // Read current regions directly from the ref (not from state setter callback)
      // so we can compute toRemoveIds synchronously before the async DB call.
      // Using the state setter callback caused a race: rapid brush strokes fired
      // multiple calls before React batched the state updates, so each call saw
      // the same stale `prev` and toRemoveIds got overwritten before the await.
      const current = revealedRegionsRef.current;
      const toRemove = current.filter((r) => {
        const dx = r.cx - cx;
        const dy = r.cy - cy;
        return dx * dx + dy * dy <= radius * radius;
      });

      if (toRemove.length === 0) return;

      const toRemoveIds = toRemove.map((r) => r.id).filter((id) => !id.startsWith("temp-"));

      // Optimistic: remove from state immediately
      setRevealedRegions((prev) => prev.filter((r) => !toRemove.some((t) => t.id === r.id)));

      // DB delete (only real rows, not temp placeholders)
      if (toRemoveIds.length > 0) {
        await supabase.from("fog_revealed").delete().in("id", toRemoveIds);
        sendRef.current?.({ type: "fog_remove", ids: toRemoveIds });
      }
    },
    [sceneId],
  );

  const clearFog = useCallback(async () => {
    if (!sceneId) return;
    setRevealedRegions([]);
    await supabase.from("fog_revealed").delete().eq("scene_id", sceneId);
    sendRef.current?.({ type: "fog_clear" });
  }, [sceneId]);

  // fogEnabled is derived — true whenever fog is active
  const fogEnabled = visibilityMode !== "none";

  return {
    fogEnabled,
    visibilityMode,
    revealedRegions,
    setVisibilityMode,
    addRevealedRegion,
    removeRevealedRegion,
    clearFog,
    handleFogBroadcast,  // consumed by useRealtimeGame
    handleSceneUpdate,   // consumed by useRealtimeGame
    reload: load,
  };
}