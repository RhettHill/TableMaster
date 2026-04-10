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

export type VisibilityMode = "none" | "fog" | "lighting";

interface FogBroadcastAdd    { type: "fog_add";    region: FogRegion }
interface FogBroadcastRemove { type: "fog_remove"; ids: string[] }
interface FogBroadcastClear  { type: "fog_clear" }
interface FogBroadcastMode   { type: "fog_mode";   mode: VisibilityMode }
export type FogBroadcastEvent = FogBroadcastAdd | FogBroadcastRemove | FogBroadcastClear | FogBroadcastMode;

type SendFn = (event: FogBroadcastEvent) => void;

function circleContains(
  bx: number, by: number, br: number,
  ax: number, ay: number, ar: number,
): boolean {
  return Math.hypot(bx - ax, by - ay) + ar <= br;
}

function cullContainedRegions(regions: FogRegion[]): {
  kept: FogRegion[];
  removedIds: string[];
} {
  const removedIds: string[] = [];
  const kept: FogRegion[] = [];

  for (let i = 0; i < regions.length; i++) {
    const a = regions[i];
    const covered = regions.some(
      (b, j) =>
        j !== i &&
        !b.id.startsWith("temp-") &&
        circleContains(b.cx, b.cy, b.radius, a.cx, a.cy, a.radius),
    );
    if (covered && !a.id.startsWith("temp-")) {
      removedIds.push(a.id);
    } else {
      kept.push(a);
    }
  }

  return { kept, removedIds };
}

export function useFog(
  sceneId: string | null,
  gameId: string | null,
  sendFn: SendFn | null,
) {
  const [visibilityMode, setVisibilityModeState] = useState<VisibilityMode>("none");
  const [revealedRegions, setRevealedRegions] = useState<FogRegion[]>([]);

  const revealedRegionsRef = useRef<FogRegion[]>([]);
  useEffect(() => { revealedRegionsRef.current = revealedRegions; }, [revealedRegions]);

  const sendRef = useRef<SendFn | null>(null);
  useEffect(() => { sendRef.current = sendFn; }, [sendFn]);

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

  const consolidate = useCallback(async () => {
    const current = revealedRegionsRef.current;
    if (current.length < 10) return;

    const { kept, removedIds } = cullContainedRegions(current);
    if (removedIds.length === 0) return;

    setRevealedRegions(kept);
    await supabase.from("fog_revealed").delete().in("id", removedIds);
    sendRef.current?.({ type: "fog_remove", ids: removedIds });
  }, []);

  const consolidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleConsolidate = useCallback(() => {
    if (consolidateTimer.current) clearTimeout(consolidateTimer.current);
    consolidateTimer.current = setTimeout(consolidate, 1500);
  }, [consolidate]);

  const handleFogBroadcast = useCallback((event: FogBroadcastEvent) => {
    switch (event.type) {
      case "fog_add":
        setRevealedRegions((prev) => {
          const r = event.region;
          // Remove any temp placeholder that matches this real region's position
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
        setVisibilityModeState(event.mode);
        break;
    }
  }, []);

  const handleSceneUpdate = useCallback((updated: { visibility_mode?: string }) => {
    if (updated.visibility_mode) {
      setVisibilityModeState(updated.visibility_mode as VisibilityMode);
    }
  }, []);

  const setVisibilityMode = useCallback(
    async (mode: VisibilityMode) => {
      setVisibilityModeState(mode);
      if (!sceneId) return;
      sendRef.current?.({ type: "fog_mode", mode });
      await supabase.from("scenes").update({ visibility_mode: mode }).eq("id", sceneId);
    },
    [sceneId],
  );

  const addRevealedRegion = useCallback(
    async (cx: number, cy: number, radius: number) => {
      if (!sceneId || !gameId) return;

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
      // Swap temp → real before broadcasting so players always get the canonical real ID
      setRevealedRegions((prev) => prev.map((r) => (r.id === tempId ? region : r)));
      sendRef.current?.({ type: "fog_add", region });

      scheduleConsolidate();
    },
    [sceneId, gameId, scheduleConsolidate],
  );

  const removeRevealedRegion = useCallback(
    async (cx: number, cy: number, radius: number) => {
      if (!sceneId) return;

      const current = revealedRegionsRef.current;
      const toRemove = current.filter((r) => {
        const dx = r.cx - cx;
        const dy = r.cy - cy;
        return dx * dx + dy * dy <= radius * radius;
      });

      if (toRemove.length === 0) return;

      // Remove locally (both temp and real)
      setRevealedRegions((prev) => prev.filter((r) => !toRemove.some((t) => t.id === r.id)));

      // Only delete/broadcast real IDs — temp IDs were never persisted or broadcast to players
      const realIds = toRemove.map((r) => r.id).filter((id) => !id.startsWith("temp-"));

      if (realIds.length > 0) {
        await supabase.from("fog_revealed").delete().in("id", realIds);
        sendRef.current?.({ type: "fog_remove", ids: realIds });
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

  const fogEnabled = visibilityMode !== "none";

  return {
    fogEnabled,
    visibilityMode,
    revealedRegions,
    setVisibilityMode,
    addRevealedRegion,
    removeRevealedRegion,
    clearFog,
    consolidate,
    handleFogBroadcast,
    handleSceneUpdate,
    reload: load,
  };
}