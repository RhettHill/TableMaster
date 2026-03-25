import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useGameStore } from "../store/gameStore";
import type { Token } from "../types/Types";
import type { Scene } from "./useScenes";
import type { MeasureState } from "../components/tabletop/MeasureLayer";

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isGM: boolean;
}

// A remote user's active measurement, augmented with who drew it
export interface RemoteMeasure extends MeasureState {
  userId: string;
  displayName: string;
  color: string;
}

interface Options {
  gameId: string;
  userId: string;
  isGM: boolean;
  activeSceneId: string | null;
  onSceneSwitch: (scene: Scene) => Promise<void>;
  onPresenceChange: (users: PresenceUser[]) => void;
}

// Deterministic colour per userId so each player's measure has a consistent tint
function userColor(userId: string): string {
  const palette = [
    "rgba(99,179,237,0.85)", // sky
    "rgba(154,230,180,0.85)", // green
    "rgba(246,173,85,0.85)", // orange
    "rgba(252,129,129,0.85)", // red
    "rgba(183,148,246,0.85)", // purple
    "rgba(237,100,166,0.85)", // pink
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++)
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function useRealtimeGame({
  gameId,
  userId,
  isGM,
  activeSceneId,
  onSceneSwitch,
  onPresenceChange,
}: Options) {
  const storeAddToken = useGameStore((s) => s.addToken);
  const storeUpdateToken = useGameStore((s) => s.updateToken);
  const storeRemoveToken = useGameStore((s) => s.removeToken);
  const setMap = useGameStore((s) => s.setMap);

  // Remote measurements from other users
  const [remoteMeasures, setRemoteMeasures] = useState<
    Map<string, RemoteMeasure>
  >(new Map());

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const activeSceneRef = useRef(activeSceneId);
  const onSceneSwitchRef = useRef(onSceneSwitch);
  const isGMRef = useRef(isGM);

  useEffect(() => {
    activeSceneRef.current = activeSceneId;
  }, [activeSceneId]);
  useEffect(() => {
    onSceneSwitchRef.current = onSceneSwitch;
  }, [onSceneSwitch]);
  useEffect(() => {
    isGMRef.current = isGM;
  }, [isGM]);

  // Presence display names — kept in a ref for the measure label lookup
  const presenceNamesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!gameId || !userId) return;

    const channel = supabase.channel(`game-${gameId}`, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    // ── Token changes ─────────────────────────────────────────────────────
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tokens" },
      (payload) => {
        const token = payload.new as Token;
        if (token.scene_id !== activeSceneRef.current) return;
        if ((token as any).owner_id === userId) return;
        storeAddToken(token);
      },
    );

    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tokens" },
      (payload) => {
        const token = payload.new as Token;
        if (token.scene_id !== activeSceneRef.current) return;

        const isOwnToken = (token as any).owner_id === userId;

        if (isOwnToken) {
          // For own tokens, only sync fields that can be changed by others
          // (stats_json updated by sheet save, visibility/editable by GM).
          // Skip position — we already have the optimistic local update.
          storeUpdateToken(token.id, {
            visible: token.visible,
            player_editable: token.player_editable,
            stats_json: token.stats_json,
            token_size: token.token_size,
            name: token.name,
          });
          return;
        }

        storeUpdateToken(token.id, {
          x: token.x,
          y: token.y,
          rotation: token.rotation,
          scale: token.scale,
          visible: token.visible,
          player_editable: token.player_editable,
          stats_json: token.stats_json,
          token_size: token.token_size,
          name: token.name,
          image_url: token.image_url,
        });
      },
    );

    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "tokens" },
      (payload) => {
        const old = payload.old as Partial<Token>;
        if (old.id) storeRemoveToken(old.id);
      },
    );

    // ── Scene changes ─────────────────────────────────────────────────────
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "scenes",
        filter: `game_id=eq.${gameId}`,
      },
      async (payload) => {
        const scene = payload.new as Scene;
        if (scene.id === activeSceneRef.current && scene.map_url)
          setMap(scene.map_url);
        if (
          scene.active &&
          scene.id !== activeSceneRef.current &&
          !isGMRef.current
        ) {
          await onSceneSwitchRef.current(scene);
        }
      },
    );

    // ── Measurement broadcast ─────────────────────────────────────────────
    channel.on("broadcast", { event: "measure_update" }, ({ payload }) => {
      const { senderId, measure } = payload as {
        senderId: string;
        measure: MeasureState;
      };
      if (senderId === userId) return; // ignore own echoes

      const displayName = presenceNamesRef.current.get(senderId) ?? "Player";
      const color = userColor(senderId);

      setRemoteMeasures((prev) => {
        const next = new Map(prev);
        next.set(senderId, {
          ...measure,
          userId: senderId,
          displayName,
          color,
        });
        return next;
      });
    });

    channel.on("broadcast", { event: "measure_clear" }, ({ payload }) => {
      const { senderId } = payload as { senderId: string };
      if (senderId === userId) return;
      setRemoteMeasures((prev) => {
        const next = new Map(prev);
        next.delete(senderId);
        return next;
      });
    });

    // ── Presence ──────────────────────────────────────────────────────────
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{
        displayName: string;
        avatarUrl: string | null;
        isGM: boolean;
      }>();

      const users: PresenceUser[] = Object.entries(state).map(([uid, arr]) => {
        const p = arr[0];
        presenceNamesRef.current.set(uid, p?.displayName ?? "Player");
        return {
          userId: uid,
          displayName: p?.displayName ?? "Player",
          avatarUrl: p?.avatarUrl ?? null,
          isGM: p?.isGM ?? false,
        };
      });

      onPresenceChange(users);
    });

    // Subscribe and announce
    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, username, avatar_url")
        .eq("id", userId)
        .single();
      await channel.track({
        displayName: profile?.display_name || profile?.username || "Player",
        avatarUrl: profile?.avatar_url ?? null,
        isGM,
      });
    });

    return () => {
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [gameId, userId]);

  // ── Broadcast helpers — called by Tabletop on mouse move / up ─────────────
  const broadcastMeasure = useCallback(
    (measure: MeasureState) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "measure_update",
        payload: { senderId: userId, measure },
      });
    },
    [userId],
  );

  const broadcastClearMeasure = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "measure_clear",
      payload: { senderId: userId },
    });
    // Also clear own remote entry just in case
    setRemoteMeasures((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, [userId]);

  return { remoteMeasures, broadcastMeasure, broadcastClearMeasure };
}
