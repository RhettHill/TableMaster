import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import type { Wall } from "../utils/Raycasting";

export type { Wall };

// Broadcast event shapes — sent on the shared game-${gameId} channel
export interface WallBroadcastAdd    { type: "wall_add";    wall: Wall }
export interface WallBroadcastRemove { type: "wall_remove"; id: string }
export interface WallBroadcastUpdate { type: "wall_update"; wall: Wall }
export type WallBroadcastEvent =
  | WallBroadcastAdd
  | WallBroadcastRemove
  | WallBroadcastUpdate;

type SendFn = (event: WallBroadcastEvent) => void;

export function useWalls(
  sceneId: string | null,
  gameId: string | null,
  sendFn: SendFn | null,   // injected from useRealtimeGame after it subscribes
) {
  const [walls, setWalls] = useState<Wall[]>([]);
  const sendRef  = useRef<SendFn | null>(null);
  const wallsRef = useRef<Wall[]>([]);            // sync snapshot for closures

  useEffect(() => { sendRef.current = sendFn; }, [sendFn]);
  useEffect(() => { wallsRef.current = walls; },  [walls]);

  // ── Load (initial + on scene change) ─────────────────────────────────────────
  const load = useCallback(async () => {
    if (!sceneId) { setWalls([]); return; }
    const { data } = await supabase
      .from("walls")
      .select("*")
      .eq("scene_id", sceneId)
      .order("created_at");
    setWalls((data ?? []) as Wall[]);
  }, [sceneId]);

  useEffect(() => { load(); }, [load]);

  // ── handleWallBroadcast — called by useRealtimeGame when a wall event arrives
  const handleWallBroadcast = useCallback((event: WallBroadcastEvent) => {
    switch (event.type) {
      case "wall_add":
        setWalls((prev) => {
          if (prev.some((w) => w.id === event.wall.id)) return prev;
          // Replace matching temp placeholder if the GM is the sender
          const withoutTemp = prev.filter(
            (w) =>
              !(
                w.id.startsWith("temp-") &&
                w.x1 === event.wall.x1 &&
                w.y1 === event.wall.y1 &&
                w.x2 === event.wall.x2 &&
                w.y2 === event.wall.y2
              ),
          );
          return [...withoutTemp, event.wall];
        });
        break;
      case "wall_remove":
        setWalls((prev) => prev.filter((w) => w.id !== event.id));
        break;
      case "wall_update":
        setWalls((prev) =>
          prev.map((w) => (w.id === event.wall.id ? event.wall : w)),
        );
        break;
    }
  }, []);

  // ── addWall ───────────────────────────────────────────────────────────────────
  const addWall = useCallback(
    async (
      x1: number, y1: number,
      x2: number, y2: number,
      wall_type = "wall",
    ): Promise<Wall | null> => {
      if (!sceneId || !gameId) return null;

      // Optimistic: show immediately on GM's screen without waiting for DB
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const tempWall = {
        id: tempId, scene_id: sceneId, game_id: gameId,
        x1, y1, x2, y2, wall_type,
      } as Wall;
      setWalls((prev) => [...prev, tempWall]);

      const { data, error } = await supabase
        .from("walls")
        .insert({ scene_id: sceneId, game_id: gameId, x1, y1, x2, y2, wall_type })
        .select()
        .single();

      if (error || !data) {
        // Rollback
        setWalls((prev) => prev.filter((w) => w.id !== tempId));
        return null;
      }

      const saved = data as Wall;
      // Swap temp → real on GM screen
      setWalls((prev) => prev.map((w) => (w.id === tempId ? saved : w)));
      // Broadcast real wall to all other clients
      sendRef.current?.({ type: "wall_add", wall: saved });
      return saved;
    },
    [sceneId, gameId],
  );

  // ── removeWall ────────────────────────────────────────────────────────────────
  const removeWall = useCallback(async (id: string) => {
    // Optimistic
    setWalls((prev) => prev.filter((w) => w.id !== id));
    await supabase.from("walls").delete().eq("id", id);
    // Broadcast
    sendRef.current?.({ type: "wall_remove", id });
  }, []);

  // ── clearScene ────────────────────────────────────────────────────────────────
  const clearScene = useCallback(async () => {
    if (!sceneId) return;
    setWalls([]);
    await supabase.from("walls").delete().eq("scene_id", sceneId);
    // Other clients reload walls via scene switch / load
  }, [sceneId]);

  // ── toggleDoor ────────────────────────────────────────────────────────────────
  const toggleDoor = useCallback(async (id: string) => {
    const wall = wallsRef.current.find((w) => w.id === id);
    if (!wall) return;
    const newType = wall.wall_type === "door_closed" ? "door_open" : "door_closed";
    const updated = { ...wall, wall_type: newType };
    // Optimistic
    setWalls((prev) => prev.map((w) => (w.id === id ? updated : w)));
    await supabase.from("walls").update({ wall_type: newType }).eq("id", id);
    // Broadcast
    sendRef.current?.({ type: "wall_update", wall: updated });
  }, []);

  return { walls, addWall, removeWall, clearScene, toggleDoor, handleWallBroadcast, reload: load };
}