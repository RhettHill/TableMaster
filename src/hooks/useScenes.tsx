import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export interface Scene {
  map_width: number;
  map_height: number;
  id: string;
  game_id: string;
  name: string;
  map_url: string | null;
  width: number | null;
  height: number | null;
  grid_enabled: boolean;
  grid_size: number;
  grid_type: string;
  grid_opacity: number;
  grid_color: string;
  snap_to_grid: boolean;
  bg_color: string;
  active: boolean;
  created_at: string;
}

export function useScenes(gameId: string | null) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScenes = async (): Promise<Scene[]> => {
    if (!gameId) return [];
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("scenes")
      .select("*")
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });

    setLoading(false);
    if (error) {
      setError(error.message);
      return [];
    }
    const result = data ?? [];
    setScenes(result);
    return result;
  };

  useEffect(() => {
    fetchScenes();
  }, [gameId]);

  const createScene = async (name: string) => {
    if (!gameId) return;
    const { error } = await supabase
      .from("scenes")
      .insert({ game_id: gameId, name, active: false });
    if (error) setError(error.message);
    else fetchScenes();
  };

  const deleteScene = async (sceneId: string) => {
    const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
    if (error) setError(error.message);
    else fetchScenes();
  };

  const updateSceneMap = async (sceneId: string, mapUrl: string) => {
    const { error } = await supabase
      .from("scenes")
      .update({ map_url: mapUrl })
      .eq("id", sceneId);
    if (error) setError(error.message);
    else fetchScenes();
  };

  const setActiveScene = async (sceneId: string) => {
    const { error: clearErr } = await supabase
      .from("scenes")
      .update({ active: false })
      .eq("game_id", gameId);
    if (clearErr) {
      setError(clearErr.message);
      return;
    }

    const { error: activateErr } = await supabase
      .from("scenes")
      .update({ active: true })
      .eq("id", sceneId);
    if (activateErr) {
      setError(activateErr.message);
      return;
    }

    fetchScenes();
  };

  return {
    scenes,
    loading,
    error,
    fetchScenes,
    createScene,
    deleteScene,
    updateSceneMap,
    setActiveScene,
  };
}
