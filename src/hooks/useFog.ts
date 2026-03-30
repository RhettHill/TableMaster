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

type SendFn = (event: FogBroadcastEvent) => void;

// ── Geometry helpers ──────────────────────────────────────────────────────────

/**
 * Returns true if circle A is fully contained within circle B.
 * We use this to cull redundant regions: if a big circle already covers
 * a smaller one, the smaller one adds nothing to the visible area.
 */
function circleContains(
  bx: number, by: number, br: number,
  ax: number, ay: number, ar: number,
): boolean {
  return Math.hypot(bx - ax, by - ay) + ar <= br;
}

/**
 * Greedy O(n²) pass: remove any region that is fully contained by another.
 * On a typical map after heavy fog-painting this can trim hundreds of rows
 * down to a few dozen, which keeps the canvas re-draw fast.
 *
 * We run this client-side so the GM's screen stays responsive; the pruned
 * IDs are also deleted from the DB and broadcast so all clients stay in sync.
 */
function cullContainedRegions(regions: FogRegion[]): {
  kept: FogRegion[];
  removedIds: string[];
} {
  const removedIds: string[] = [];
  const kept: FogRegion[] = [];

  for (let i = 0; i < regions.length; i++) {
    const a = regions[i];
    // Is region[i] fully covered by any other region?
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

// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Initial load ─────────────────────────────────────────────────────────────
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

  // ── Consolidate — prune redundant circles from DB ─────────────────────────────
  // Called automatically after each stroke ends (via a debounce in the parent).
  // Safe to call frequently — it's a no-op if there's nothing to cull.
  const consolidate = useCallback(async () => {
    const current = revealedRegionsRef.current;
    if (current.length < 10) return; // not worth the work below this threshold

    const { kept, removedIds } = cullContainedRegions(current);
    if (removedIds.length === 0) return;

    // Update local state immediately
    setRevealedRegions(kept);

    // Delete from DB
    await supabase.from("fog_revealed").delete().in("id", removedIds);

    // Broadcast removal so other clients trim their lists too
    sendRef.current?.({ type: "fog_remove", ids: removedIds });
  }, []);

  // Debounced consolidation — runs 1.5 s after the last region was added
  const consolidateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleConsolidate = useCallback(() => {
    if (consolidateTimer.current) clearTimeout(consolidateTimer.current);
    consolidateTimer.current = setTimeout(consolidate, 1500);
  }, [consolidate]);

  // ── Broadcast handler ─────────────────────────────────────────────────────────
  const handleFogBroadcast = useCallback((event: FogBroadcastEvent) => {
    switch (event.type) {
      case "fog_add":
        setRevealedRegions((prev) => {
          const r = event.region;
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

  // ── Actions ───────────────────────────────────────────────────────────────────

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
      setRevealedRegions((prev) => prev.map((r) => (r.id === tempId ? region : r)));
      sendRef.current?.({ type: "fog_add", region });

      // Schedule a consolidation pass after this stroke settles
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

      const toRemoveIds = toRemove.map((r) => r.id).filter((id) => !id.startsWith("temp-"));
      setRevealedRegions((prev) => prev.filter((r) => !toRemove.some((t) => t.id === r.id)));

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

  const fogEnabled = visibilityMode !== "none";

  return {
    fogEnabled,
    visibilityMode,
    revealedRegions,
    setVisibilityMode,
    addRevealedRegion,
    removeRevealedRegion,
    clearFog,
    consolidate,         // exposed so SettingsPanel can offer a manual "Optimize" button
    handleFogBroadcast,
    handleSceneUpdate,
    reload: load,
  };
}