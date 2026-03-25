import { useState } from "react";
import { supabase } from "../services/supabase";
import { Token } from "../types/Types";

export function useTokens() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTokens = async (sceneId: string): Promise<Token[]> => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("tokens")
      .select("*")
      .eq("scene_id", sceneId)
      .order("created_at", { ascending: true });

    setLoading(false);
    if (error) {
      setError(error.message);
      return [];
    }
    return data ?? [];
  };

  // sceneId passed explicitly here so it's always the current value,
  // never a stale closure capture from when the hook initialised
  const addToken = async (
    token: Token,
    sceneId: string,
    ownerId: string,
  ): Promise<Token | null> => {
    const { data, error } = await supabase
      .from("tokens")
      .insert({
        scene_id: sceneId, // explicit, never null
        name: token.name,
        image_url: token.image_url,
        x: token.x,
        y: token.y,
        rotation: token.rotation,
        scale: token.scale,
        visible: token.visible,
        owner_id: ownerId,
      })
      .select()
      .single();

    if (error) {
      console.error("[useTokens.addToken]", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      setError(error.message);
      return null;
    }

    return data;
  };

  const moveToken = async (id: string, x: number, y: number) => {
    const { error } = await supabase
      .from("tokens")
      .update({ x, y })
      .eq("id", id);
    if (error) setError(error.message);
  };

  const removeToken = async (id: string) => {
    const { error } = await supabase.from("tokens").delete().eq("id", id);
    if (error) setError(error.message);
  };

  return { loading, error, fetchTokens, addToken, moveToken, removeToken };
}
