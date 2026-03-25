import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";

// Supabase returns embedded one-to-one relations inconsistently —
// sometimes as a single object, sometimes as an array.
// We normalise to always have a flat profile object.
export interface GameMember {
  id: string;
  user_id: string;
  game_id: string;
  role: "gm" | "player";
  joined_at: string;
  // After normalisation this is always a plain object, never an array
  profile: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

// Raw shape from Supabase before normalisation
interface RawMember {
  id: string;
  user_id: string;
  game_id: string;
  role: "gm" | "player";
  joined_at: string;
  profiles:
    | {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }
    | {
        username: string | null;
        display_name: string | null;
        avatar_url: string | null;
      }[]
    | null;
}

function normalise(raw: RawMember): GameMember {
  let profile = {
    username: null,
    display_name: null,
    avatar_url: null,
  } as GameMember["profile"];

  if (Array.isArray(raw.profiles)) {
    profile = raw.profiles[0] ?? profile;
  } else if (raw.profiles && typeof raw.profiles === "object") {
    profile = raw.profiles;
  }

  return {
    id: raw.id,
    user_id: raw.user_id,
    game_id: raw.game_id,
    role: raw.role,
    joined_at: raw.joined_at,
    profile,
  };
}

export function useGameMembers(gameId: string | null) {
  const [members, setMembers] = useState<GameMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!gameId) return;
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("game_members")
      .select(
        `
        id,
        user_id,
        game_id,
        role,
        joined_at,
        profiles (
          username,
          display_name,
          avatar_url
        )
      `,
      )
      .eq("game_id", gameId)
      .order("joined_at", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setMembers((data as unknown as RawMember[]).map(normalise));
    }

    setLoading(false);
  }, [gameId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const joinByCode = useCallback(
    async (
      code: string,
    ): Promise<{
      gameId: string;
      gameName: string;
      alreadyMember: boolean;
    } | null> => {
      // Single security-definer RPC handles lookup + duplicate check + insert atomically
      const { data, error } = await supabase.rpc("join_game_by_invite", {
        p_code: code.trim().toLowerCase(),
      });

      if (error) {
        console.error(
          "join_game_by_invite error:",
          error.message,
          error.details,
          error.hint,
        );
        return null;
      }

      // Supabase returns set-returning functions as an array but single-row
      // functions (RETURNS TABLE with one row) sometimes come back as a plain object
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

      return {
        gameId: row.out_game_id,
        gameName: row.out_game_name,
        alreadyMember: row.out_already_member,
      };
    },
    [],
  );

  const kickMember = useCallback(async (memberId: string) => {
    const { error } = await supabase
      .from("game_members")
      .delete()
      .eq("id", memberId);

    if (!error) setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }, []);

  return { members, loading, error, fetchMembers, joinByCode, kickMember };
}
