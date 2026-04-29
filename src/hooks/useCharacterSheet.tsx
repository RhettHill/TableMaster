// src/hooks/useCharacterSheet.tsx
//
// Sheet management rules:
//  - One sheet per non-GM player per game, keyed on (game_id, user_id).
//  - GM never owns a sheet but can open any player's sheet (read/write).
//  - Unowned player_editable token: any player can move/edit stats,
//    but clicking "Character Sheet" does nothing (no owner = no sheet link).
//  - Owned player_editable token: only the owner can move/edit;
//    owner sees their sheet (edit), others see it view-only.
//  - System changes UPDATE existing sheets in place — sheet_id links on
//    tokens are preserved.

import { useState, useCallback } from "react";
import { supabase } from "../services/supabase";

export interface OpenSheet {
  sheetId: string;
  gameId: string;
  userId: string;
  systemSlug: string;
  tokenId: string | null;
  canEdit: boolean;
}

async function fetchGameSystem(
  gameId: string,
): Promise<{ id: string; slug: string } | null> {
  const { data } = await supabase
    .from("games")
    .select("system_id, systems:systems!games_system_id_fkey(id, slug)")
    .eq("id", gameId)
    .single();
  if (!data?.system_id) return null;
  const sys = Array.isArray(data.systems) ? data.systems[0] : data.systems;
  return sys ? { id: sys.id, slug: sys.slug } : null;
}

async function getOrCreateSheet(
  gameId: string,
  userId: string,
): Promise<{ sheetId: string; systemSlug: string } | null> {
  const sys = await fetchGameSystem(gameId);
  if (!sys) {
    console.warn("[useCharacterSheet] Game has no active system");
    return null;
  }
  const { data: sheetId, error } = await supabase.rpc("get_or_create_sheet", {
    p_game_id: gameId,
    p_user_id: userId,
    p_system_id: sys.id,
    p_system_slug: sys.slug,
  });
  if (error || !sheetId) {
    console.error("[useCharacterSheet] get_or_create_sheet failed", error);
    return null;
  }
  return { sheetId, systemSlug: sys.slug };
}

export function useCharacterSheet(currentUserId: string, isGM: boolean) {
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);
  const [needsPlayerPick, setNeedsPlayerPick] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [pendingTokenId, setPendingTokenId] = useState<string | null>(null);

  const openSheetForPlayer = useCallback(
    async (
      gameId: string,
      userId: string,
      tokenId: string | null,
      forceReadOnly = false,
    ) => {
      const result = await getOrCreateSheet(gameId, userId);
      if (!result) return;
      if (tokenId) {
        await supabase
          .from("tokens")
          .update({ sheet_id: result.sheetId })
          .eq("id", tokenId);
      }
      setOpenSheet({
        sheetId: result.sheetId,
        gameId,
        userId,
        systemSlug: result.systemSlug,
        tokenId,
        canEdit: !forceReadOnly && (isGM || userId === currentUserId),
      });
    },
    [currentUserId, isGM],
  );

  // ── Player's own sheet button (toolbar) ───────────────────────────────────
  const openOwn = useCallback(
    async (gameId: string) => {
      if (isGM) return;
      const { data: scenes } = await supabase
        .from("scenes")
        .select("id")
        .eq("game_id", gameId);
      const sceneIds = (scenes ?? []).map((s: any) => s.id);
      let tokenId: string | null = null;
      if (sceneIds.length > 0) {
        const { data: myTokens } = await supabase
          .from("tokens")
          .select("id")
          .eq("owner_id", currentUserId)
          .in("scene_id", sceneIds)
          .limit(1);
        tokenId = myTokens?.[0]?.id ?? null;
      }
      await openSheetForPlayer(gameId, currentUserId, tokenId);
    },
    [currentUserId, isGM, openSheetForPlayer],
  );

  // ── Open sheet via token right-click ──────────────────────────────────────
  // Rules:
  //   GM, token has owner → open owner's sheet (edit)
  //   GM, token unowned   → prompt to pick a player (PlayerPickerModal)
  //   Player, unowned     → do nothing (no sheet until assigned)
  //   Player, own token   → open own sheet (edit)
  //   Player, other owner → open owner's sheet (view-only)
  const openForToken = useCallback(
    async (tokenId: string, gameId: string) => {
      const { data: token } = await supabase
        .from("tokens")
        .select("owner_id, player_editable")
        .eq("id", tokenId)
        .single();
      if (!token) return;

      if (isGM) {
        if (token.owner_id) {
          await openSheetForPlayer(gameId, token.owner_id, tokenId);
        } else {
          // Unowned — GM needs to assign before a sheet can be opened
          setPendingGameId(gameId);
          setPendingTokenId(tokenId);
          setNeedsPlayerPick(true);
        }
        return;
      }

      // Player path
      if (!token.player_editable) return;

      if (!token.owner_id) {
        // Unowned player_editable — players can move/edit stats but there is
        // no sheet yet. Do nothing; the menu hides the sheet button for this case.
        return;
      }

      if (token.owner_id === currentUserId) {
        await openSheetForPlayer(gameId, currentUserId, tokenId);
      } else {
        // Another player's assigned token — view-only
        await openSheetForPlayer(gameId, token.owner_id, tokenId, true);
      }
    },
    [currentUserId, isGM, openSheetForPlayer],
  );

  // ── Open by sheet id directly (lobby) ─────────────────────────────────────
  const openSheetById = useCallback(
    async (sheetId: string, gameId: string, userId: string) => {
      const { data } = await supabase
        .from("character_sheets")
        .select(
          "system_id, systems:systems!character_sheets_system_id_fkey(slug)",
        )
        .eq("id", sheetId)
        .single();
      const sys = data
        ? Array.isArray(data.systems)
          ? data.systems[0]
          : data.systems
        : null;
      setOpenSheet({
        sheetId,
        gameId,
        userId,
        systemSlug: sys?.slug ?? "dnd5e",
        tokenId: null,
        canEdit: isGM || userId === currentUserId,
      });
    },
    [currentUserId, isGM],
  );

  // ── GM picks a player for an unowned token ────────────────────────────────
  // Writes owner_id to DB, then immediately updates the Zustand store via the
  // optional storeUpdateToken callback so all permission checks reflect the
  // new owner without waiting for a realtime event.
  const confirmPlayerPick = useCallback(
    async (
      targetUserId: string,
      storeUpdateToken?: (id: string, patch: Record<string, any>) => void,
    ) => {
      setNeedsPlayerPick(false);
      if (!pendingGameId) return;

      if (pendingTokenId) {
        await supabase
          .from("tokens")
          .update({ owner_id: targetUserId, player_editable: true })
          .eq("id", pendingTokenId);

        // Sync store immediately — no reload needed
        storeUpdateToken?.(pendingTokenId, {
          owner_id: targetUserId,
          player_editable: true,
        });
      }

      await openSheetForPlayer(pendingGameId, targetUserId, pendingTokenId);
      setPendingGameId(null);
      setPendingTokenId(null);
    },
    [pendingGameId, pendingTokenId, openSheetForPlayer],
  );

  const cancelPlayerPick = useCallback(() => {
    setNeedsPlayerPick(false);
    setPendingGameId(null);
    setPendingTokenId(null);
  }, []);

  // ── Auto-link sheet when GM grants player control ─────────────────────────
  const autoLinkSheet = useCallback(
    async (tokenId: string, ownerId: string, gameId: string) => {
      const result = await getOrCreateSheet(gameId, ownerId);
      if (!result) return;
      await supabase
        .from("tokens")
        .update({ sheet_id: result.sheetId })
        .eq("id", tokenId);
    },
    [],
  );

  // ── Ensure sheet exists on game join (silent, GM-skipped) ─────────────────
  const ensureSheet = useCallback(
    async (gameId: string) => {
      if (isGM) return;
      await getOrCreateSheet(gameId, currentUserId);
    },
    [currentUserId, isGM],
  );

  const closeSheet = useCallback(() => setOpenSheet(null), []);

  return {
    openSheet,
    needsSystemPick: false,
    needsPlayerPick,
    openOwn,
    openForToken,
    openSheetById,
    autoLinkSheet,
    ensureSheet,
    confirmSystemPick: async () => {},
    cancelSystemPick: () => {},
    confirmPlayerPick,
    cancelPlayerPick,
    closeSheet,
  };
}
