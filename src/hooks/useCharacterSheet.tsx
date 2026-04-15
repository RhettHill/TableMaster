// src/hooks/useCharacterSheet.tsx
//
// Always fetches the game's current active system from Supabase before
// opening or creating a sheet. This means switching systems in the System
// Builder is immediately reflected the next time any sheet is opened —
// no stale closure state, no need to reload the page.

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

// ── Fetch the game's live active system ───────────────────────────────────────
// Always goes to DB — never use cached/closure values for system resolution.

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
  if (!sys) return null;

  return { id: sys.id, slug: sys.slug };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useCharacterSheet(currentUserId: string, isGM: boolean) {
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);
  const [needsPlayerPick, setNeedsPlayerPick] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [pendingTokenId, setPendingTokenId] = useState<string | null>(null);

  // ── Core: get-or-create sheet for a user, then open it ───────────────────
  // Always fetches the live system — never relies on stale prop values.

  const openSheetForUser = useCallback(
    async (gameId: string, userId: string, tokenId: string | null) => {
      // 1. Get the game's current active system fresh from DB
      const sys = await fetchGameSystem(gameId);
      if (!sys) {
        console.warn("[useCharacterSheet] Game has no active system");
        return;
      }

      // 2. Get or create the sheet for this user under this system
      const { data: sheetId, error } = await supabase.rpc(
        "get_or_create_sheet",
        {
          p_game_id: gameId,
          p_user_id: userId,
          p_system_slug: sys.slug,
          p_system_id: sys.id,
        },
      );

      if (error || !sheetId) {
        console.error("[useCharacterSheet] get_or_create_sheet failed", error);
        return;
      }

      // 3. Link the sheet to the token if provided
      if (tokenId) {
        await supabase
          .from("tokens")
          .update({ sheet_id: sheetId })
          .eq("id", tokenId);
      }

      setOpenSheet({
        sheetId,
        gameId,
        userId,
        systemSlug: sys.slug,
        tokenId,
        canEdit: isGM || userId === currentUserId,
      });
    },
    [currentUserId, isGM],
  );

  // ── Open the current user's own sheet ─────────────────────────────────────

  const openOwn = useCallback(
    async (gameId: string, _legacySystemId?: string) => {
      // Find this player's token(s) in the game to link the sheet
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

      await openSheetForUser(gameId, currentUserId, tokenId);
    },
    [currentUserId, openSheetForUser],
  );

  // ── Open sheet linked to a specific token ─────────────────────────────────

  const openForToken = useCallback(
    async (tokenId: string, gameId: string) => {
      const { data: token } = await supabase
        .from("tokens")
        .select("owner_id, player_editable")
        .eq("id", tokenId)
        .single();

      if (!token) return;

      // ── GM path: open or assign sheet for any token ───────────────────────────
      if (isGM) {
        if (token.owner_id) {
          // Token already has an owner — open their sheet
          await openSheetForUser(gameId, token.owner_id, tokenId);
        } else {
          // No owner yet — ask GM to pick a player to assign
          setPendingGameId(gameId);
          setPendingTokenId(tokenId);
          setNeedsPlayerPick(true);
        }
        return;
      }

      // ── Player path: only open if token is player_editable and owned by them ──
      if (!token.player_editable) return;
      if (token.owner_id && token.owner_id !== currentUserId) return;

      await openSheetForUser(gameId, currentUserId, tokenId);
    },
    [currentUserId, isGM, openSheetForUser],
  );

  // ── GM confirms which player owns a token ─────────────────────────────────

  const confirmPlayerPick = useCallback(
    async (targetUserId: string) => {
      setNeedsPlayerPick(false);
      if (!pendingGameId) return;

      // Assign ownership on the token and mark it player-editable
      if (pendingTokenId) {
        await supabase
          .from("tokens")
          .update({ owner_id: targetUserId, player_editable: true })
          .eq("id", pendingTokenId);
      }

      await openSheetForUser(pendingGameId, targetUserId, pendingTokenId);
      setPendingGameId(null);
      setPendingTokenId(null);
    },
    [pendingGameId, pendingTokenId, openSheetForUser],
  );

  const cancelPlayerPick = useCallback(() => {
    setNeedsPlayerPick(false);
    setPendingGameId(null);
    setPendingTokenId(null);
  }, []);

  // ── Auto-link sheet when GM grants player control ─────────────────────────
  // Creates the sheet in the background without opening the panel.

  const autoLinkSheet = useCallback(
    async (tokenId: string, ownerId: string, gameId: string) => {
      const sys = await fetchGameSystem(gameId);
      if (!sys) return;

      const { data: sheetId, error } = await supabase.rpc(
        "get_or_create_sheet",
        {
          p_game_id: gameId,
          p_user_id: ownerId,
          p_system_slug: sys.slug,
          p_system_id: sys.id,
        },
      );

      if (error || !sheetId) return;

      await supabase
        .from("tokens")
        .update({ sheet_id: sheetId })
        .eq("id", tokenId);
    },
    [],
  );

  const closeSheet = useCallback(() => setOpenSheet(null), []);

  return {
    openSheet,
    // needsSystemPick removed — system is always resolved from DB now
    needsSystemPick: false,
    needsPlayerPick,
    openOwn,
    openForToken,
    autoLinkSheet,
    confirmSystemPick: async () => {}, // no-op, kept for interface compat
    cancelSystemPick: () => {}, // no-op
    confirmPlayerPick,
    cancelPlayerPick,
    closeSheet,
  };
}
