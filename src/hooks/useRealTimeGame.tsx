// src/hooks/useRealTimeGame.tsx
// Only change from the original: the Token UPDATE postgres_changes handler
// now includes owner_id in the patch so when the GM assigns a token,
// all connected clients immediately see the new owner and lock permissions correctly.

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useGameStore } from "../store/gameStore";
import type { Token } from "../types/Types";
import type { Scene } from "./useScenes";
import type { MeasureState } from "../components/tabletop/MeasureLayer";
import type { FogBroadcastEvent } from "./useFog";
import type { WallBroadcastEvent } from "./useWalls";

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  isGM: boolean;
}

export interface RemoteMeasure extends MeasureState {
  userId: string;
  displayName: string;
  color: string;
}

export interface RemotePing {
  id: string;
  x: number;
  y: number;
  color: string;
  label: string;
  senderId: string;
  timestamp: number;
}

interface Options {
  gameId: string;
  userId: string;
  isGM: boolean;
  activeSceneId: string | null;
  onSceneSwitch: (scene: Scene) => Promise<void>;
  onPresenceChange: (users: PresenceUser[]) => void;
  onFogBroadcast?: (event: FogBroadcastEvent) => void;
  onFogSceneUpdate?: (updated: { visibility_mode?: string }) => void;
  onSceneSettingsChange?: (scene: Scene) => void;
  onWallBroadcast?: (event: WallBroadcastEvent) => void;
  onPing?: (ping: RemotePing) => void;
}

function userColor(userId: string): string {
  const palette = [
    "rgba(99,179,237,0.85)",
    "rgba(154,230,180,0.85)",
    "rgba(246,173,85,0.85)",
    "rgba(252,129,129,0.85)",
    "rgba(183,148,246,0.85)",
    "rgba(237,100,166,0.85)",
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
  onFogBroadcast,
  onFogSceneUpdate,
  onSceneSettingsChange,
  onWallBroadcast,
  onPing,
}: Options) {
  const storeAddToken = useGameStore((s) => s.addToken);
  const storeUpdateToken = useGameStore((s) => s.updateToken);
  const storeRemoveToken = useGameStore((s) => s.removeToken);
  const setMap = useGameStore((s) => s.setMap);

  const [remoteMeasures, setRemoteMeasures] = useState<
    Map<string, RemoteMeasure>
  >(new Map());

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const subscribedRef = useRef(false);
  const activeSceneRef = useRef(activeSceneId);
  const isGMRef = useRef(isGM);
  const onSceneSwitchRef = useRef(onSceneSwitch);
  const onPresenceChangeRef = useRef(onPresenceChange);
  const onFogBroadcastRef = useRef(onFogBroadcast);
  const onFogSceneUpdateRef = useRef(onFogSceneUpdate);
  const onSceneSettingsChangeRef = useRef(onSceneSettingsChange);
  const onWallBroadcastRef = useRef(onWallBroadcast);
  const onPingRef = useRef(onPing);
  const presenceNamesRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    activeSceneRef.current = activeSceneId;
  }, [activeSceneId]);
  useEffect(() => {
    isGMRef.current = isGM;
  }, [isGM]);
  useEffect(() => {
    onSceneSwitchRef.current = onSceneSwitch;
  }, [onSceneSwitch]);
  useEffect(() => {
    onPresenceChangeRef.current = onPresenceChange;
  }, [onPresenceChange]);
  useEffect(() => {
    onFogBroadcastRef.current = onFogBroadcast;
  }, [onFogBroadcast]);
  useEffect(() => {
    onFogSceneUpdateRef.current = onFogSceneUpdate;
  }, [onFogSceneUpdate]);
  useEffect(() => {
    onSceneSettingsChangeRef.current = onSceneSettingsChange;
  }, [onSceneSettingsChange]);
  useEffect(() => {
    onWallBroadcastRef.current = onWallBroadcast;
  }, [onWallBroadcast]);
  useEffect(() => {
    onPingRef.current = onPing;
  }, [onPing]);

  useEffect(() => {
    if (!gameId || !userId) return;

    subscribedRef.current = false;

    const channel = supabase.channel(`game-${gameId}`, {
      config: { presence: { key: userId }, broadcast: { ack: false } },
    });
    channelRef.current = channel;

    // Token INSERT
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

    // Token UPDATE — include owner_id so ownership changes propagate immediately
    // to all clients and permission checks (canControlToken) use fresh data.
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "tokens" },
      (payload) => {
        const token = payload.new as Token;
        if (token.scene_id !== activeSceneRef.current) return;
        storeUpdateToken(token.id, {
          visible: token.visible,
          player_editable: token.player_editable,
          owner_id: token.owner_id, // ← ADDED: propagate ownership changes
          stats_json: token.stats_json,
          token_size: token.token_size,
          name: token.name,
          image_url: token.image_url,
        });
      },
    );

    // Token DELETE
    channel.on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "tokens" },
      (payload) => {
        const old = payload.old as Partial<Token>;
        if (old.id) storeRemoveToken(old.id);
      },
    );

    // Token position broadcast
    channel.on("broadcast", { event: "token_move" }, ({ payload }) => {
      const { senderId, id, x, y } = payload as {
        senderId: string;
        id: string;
        x: number;
        y: number;
      };
      if (senderId === userId) return;
      storeUpdateToken(id, { x, y });
    });

    // Scene changes
    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "scenes",
        filter: `game_id=eq.${gameId}`,
      },
      async (payload) => {
        const scene = payload.new as Scene & { visibility_mode?: string };
        if (scene.id === activeSceneRef.current) {
          if (scene.map_url)
            setMap(scene.map_url, (scene as any).map_mime_type ?? null);
          if (!isGMRef.current) onSceneSettingsChangeRef.current?.(scene);
          if (scene.visibility_mode !== undefined)
            onFogSceneUpdateRef.current?.({
              visibility_mode: scene.visibility_mode,
            });
        }
        if (
          scene.active &&
          scene.id !== activeSceneRef.current &&
          !isGMRef.current
        ) {
          await onSceneSwitchRef.current(scene);
        }
      },
    );

    // Measurement broadcast
    channel.on("broadcast", { event: "measure_update" }, ({ payload }) => {
      const { senderId, measure } = payload as {
        senderId: string;
        measure: MeasureState;
      };
      if (senderId === userId) return;
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

    // Fog broadcast
    channel.on("broadcast", { event: "fog" }, ({ payload }) => {
      onFogBroadcastRef.current?.(payload as FogBroadcastEvent);
    });

    // Wall broadcast
    channel.on("broadcast", { event: "wall" }, ({ payload }) => {
      onWallBroadcastRef.current?.(payload as WallBroadcastEvent);
    });

    // Ping broadcast
    channel.on("broadcast", { event: "ping" }, ({ payload }) => {
      const p = payload as RemotePing;
      if (p.senderId === userId) return;
      onPingRef.current?.(p);
    });

    // Presence
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
      onPresenceChangeRef.current(users);
    });

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      subscribedRef.current = true;
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
      subscribedRef.current = false;
      channel.untrack();
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [gameId, userId]);

  const sendFog = useCallback((event: FogBroadcastEvent) => {
    const send = () =>
      channelRef.current?.send({
        type: "broadcast",
        event: "fog",
        payload: event,
      });
    if (subscribedRef.current) {
      send();
      return;
    }
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (subscribedRef.current) {
        clearInterval(interval);
        send();
      } else if (attempts > 60) clearInterval(interval);
    }, 50);
  }, []);

  const sendWall = useCallback((event: WallBroadcastEvent) => {
    channelRef.current?.send({
      type: "broadcast",
      event: "wall",
      payload: event,
    });
  }, []);

  const sendTokenMove = useCallback(
    (id: string, x: number, y: number) => {
      channelRef.current?.send({
        type: "broadcast",
        event: "token_move",
        payload: { senderId: userId, id, x, y },
      });
    },
    [userId],
  );

  const sendPing = useCallback(
    (x: number, y: number, label: string, color: string) => {
      const ping: RemotePing = {
        id: `ping-${Date.now()}-${Math.random()}`,
        x,
        y,
        color,
        label,
        senderId: userId,
        timestamp: Date.now(),
      };
      channelRef.current?.send({
        type: "broadcast",
        event: "ping",
        payload: ping,
      });
      return ping;
    },
    [userId],
  );

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
    setRemoteMeasures((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, [userId]);

  return {
    remoteMeasures,
    broadcastMeasure,
    broadcastClearMeasure,
    sendFog,
    sendTokenMove,
    sendWall,
    sendPing,
  };
}
