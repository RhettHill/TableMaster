import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../services/supabase";
import type { Wall } from "../utils/Raycasting"

export type { Wall };

export function useWalls(sceneId: string | null, gameId: string | null) {
  const [walls, setWalls] = useState<Wall[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Load walls for current scene
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

  // Realtime sync
  useEffect(() => {
    if (!sceneId || !gameId) return;

    const channel = supabase
      .channel(`walls:${sceneId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "walls", filter: `scene_id=eq.${sceneId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setWalls((prev) => [...prev, payload.new as Wall]);
          } else if (payload.eventType === "DELETE") {
            setWalls((prev) => prev.filter((w) => w.id !== (payload.old as any).id));
          } else if (payload.eventType === "UPDATE") {
            setWalls((prev) => prev.map((w) => w.id === (payload.new as any).id ? payload.new as Wall : w));
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [sceneId, gameId]);

  const addWall = useCallback(async (
    x1: number, y1: number,
    x2: number, y2: number,
    wall_type = "wall",
  ): Promise<Wall | null> => {
    if (!sceneId || !gameId) return null;
    const { data } = await supabase
      .from("walls")
      .insert({ scene_id: sceneId, game_id: gameId, x1, y1, x2, y2, wall_type })
      .select()
      .single();
    return data as Wall | null;
  }, [sceneId, gameId]);

  const removeWall = useCallback(async (id: string) => {
    setWalls((prev) => prev.filter((w) => w.id !== id));
    await supabase.from("walls").delete().eq("id", id);
  }, []);

  const clearScene = useCallback(async () => {
    if (!sceneId) return;
    setWalls([]);
    await supabase.from("walls").delete().eq("scene_id", sceneId);
  }, [sceneId]);

  const toggleDoor = useCallback(async (id: string) => {
    const wall = walls.find((w) => w.id === id);
    if (!wall) return;
    const newType = wall.wall_type === "door_closed" ? "door_open" : "door_closed";
    setWalls((prev) => prev.map((w) => w.id === id ? { ...w, wall_type: newType } : w));
    await supabase.from("walls").update({ wall_type: newType }).eq("id", id);
  }, [walls]);

  return { walls, addWall, removeWall, clearScene, toggleDoor, reload: load };
}