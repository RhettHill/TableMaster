import { useState, useEffect, useCallback } from "react";
import { supabase } from "../services/supabase";
import { DEFAULT_STAT_BLOCK } from "../components/blocks/Dnd5eStatsBlock";

export interface NpcStatBlockMeta {
  id: string;
  name: string;
  systemSlug: string;
  cr: string;
}

export function useNpcStatBlocks(gameId: string | null) {
  const [statBlocks, setStatBlocks] = useState<NpcStatBlockMeta[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    const { data } = await supabase
      .from("npc_stat_blocks")
      .select("id, name, data, systems(slug)")
      .eq("game_id", gameId)
      .order("name");
    setStatBlocks(
      (data ?? []).map((r: any) => ({
        id: r.id,
        name: r.name,
        systemSlug: r.systems?.slug ?? "dnd5e",
        cr: r.data?.cr ?? "—",
      })),
    );
    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async () => {
    if (!gameId) return null;
    const { data: customSys } = await supabase
      .from("systems")
      .select("id")
      .eq("game_id", gameId)
      .eq("custom", true)
      .maybeSingle();

    const systemId = customSys?.id;

    const { data: row } = await supabase
      .from("npc_stat_blocks")
      .insert({
        game_id: gameId,
        system_id: systemId.id,
        name: "New Creature",
        data: DEFAULT_STAT_BLOCK,
      })
      .select("id")
      .single();

    if (row) {
      await load();
      return row.id as string;
    }
    return null;
  }, [gameId, load]);

  const remove = useCallback(async (id: string) => {
    await supabase.from("npc_stat_blocks").delete().eq("id", id);
    setStatBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  /**
   * Assign a stat block to a token.
   * Seeds token.stats_json (for the HP bar) and token.current_hp from the template.
   * Also sets token.npc_stat_block_id so the stat block can be opened later.
   */
  const assignToToken = useCallback(
    async (tokenId: string, statBlockId: string) => {
      // Fetch the stat block data to seed HP/AC on the token
      const { data: sb } = await supabase
        .from("npc_stat_blocks")
        .select("data, name")
        .eq("id", statBlockId)
        .single();

      if (!sb) return false;

      const maxHp = sb.data?.maxHp ?? 10;
      const ac = sb.data?.ac ?? 10;

      await supabase
        .from("tokens")
        .update({
          npc_stat_block_id: statBlockId,
          current_hp: maxHp,
          name: sb.name,
          stats_json: {
            hp: maxHp,
            maxHp: maxHp,
            ac: ac,
            showStats: false,
          },
        })
        .eq("id", tokenId);

      return true;
    },
    [],
  );

  return { statBlocks, loading, create, remove, assignToToken, reload: load };
}
