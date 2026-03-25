import { supabase } from "./supabase"

export async function fetchTokens(sceneId: string) {
  const { data, error } = await supabase
    .from("tokens")
    .select("*")
    .eq("scene_id", sceneId)

  if (error) throw error
  return data
}