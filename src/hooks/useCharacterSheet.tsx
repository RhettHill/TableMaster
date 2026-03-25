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

export function useCharacterSheet(
  currentUserId: string,
  isGM: boolean,
  gameSystemSlug: string = "dnd5e",
) {
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);
  const [needsSystemPick, setNeedsSystemPick] = useState(false);
  const [needsPlayerPick, setNeedsPlayerPick] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [pendingTokenId, setPendingTokenId] = useState<string | null>(null);

  // ── Internal: create sheet via RPC then open ──────────────────────────────
  const createAndOpen = useCallback(
    async (
      gameId: string,
      userId: string,
      systemSlug: string,
      tokenId: string | null,
    ) => {
      const { data: sheetId } = await supabase.rpc("get_or_create_sheet", {
        p_game_id: gameId,
        p_user_id: userId,
        p_system_slug: systemSlug,
      });
      if (!sheetId) return;

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
        systemSlug,
        tokenId,
        canEdit: isGM || userId === currentUserId,
      });
    },
    [currentUserId, isGM],
  );

  // ── Resolve ALL of the player's tokens in the current game ─────────────────
  // Returns every token across all scenes that belongs to this player.
  const resolveTokens = useCallback(
    async (gameId: string, sheetId?: string): Promise<string[]> => {
      const ids = new Set<string>();

      // All scenes in this game
      const { data: scenes } = await supabase
        .from("scenes")
        .select("id")
        .eq("game_id", gameId);
      if (!scenes?.length) return [];
      const sceneIds = scenes.map((s: any) => s.id);

      // Tokens linked to this sheet
      if (sheetId) {
        const { data: bySheet } = await supabase
          .from("tokens")
          .select("id")
          .eq("sheet_id", sheetId)
          .in("scene_id", sceneIds);
        (bySheet ?? []).forEach((t: any) => ids.add(t.id));
      }

      // Tokens owned by this user in this game
      const { data: byOwner } = await supabase
        .from("tokens")
        .select("id")
        .eq("owner_id", currentUserId)
        .in("scene_id", sceneIds);
      (byOwner ?? []).forEach((t: any) => ids.add(t.id));

      return [...ids];
    },
    [currentUserId],
  );

  // ── Open player's own sheet (toolbar button or on-load check) ─────────────
  // linkTokenId: optionally link the found/created sheet to a token
  const openOwn = useCallback(
    async (
      gameId: string,
      gameSystemId?: string,
      linkTokenId?: string | null,
    ) => {
      // Check if player already has a sheet for this game
      const { data: existing } = await supabase
        .from("character_sheets")
        .select("id, systems(slug)")
        .eq("game_id", gameId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (existing) {
        // Resolve all tokens for this player in this game, link them to the sheet
        const allTokenIds = linkTokenId
          ? [linkTokenId]
          : await resolveTokens(gameId, existing.id);

        // Ensure all tokens have sheet_id set
        if (allTokenIds.length > 0) {
          await supabase
            .from("tokens")
            .update({ sheet_id: existing.id })
            .in("id", allTokenIds);
        }

        setOpenSheet({
          sheetId: existing.id,
          gameId,
          userId: currentUserId,
          systemSlug: (existing.systems as any)?.slug ?? "dnd5e",
          tokenId: allTokenIds[0] ?? null, // primary token for seed-from-token logic
          canEdit: true,
        });
        return;
      }

      // No sheet yet — resolve token first
      const allTokenIds = linkTokenId
        ? [linkTokenId]
        : await resolveTokens(gameId);
      const tokenId = allTokenIds[0] ?? null;

      // If the game has a system set, always use it — never prompt the player
      if (gameSystemSlug && gameSystemSlug !== "dnd5e") {
        await createAndOpen(gameId, currentUserId, gameSystemSlug, tokenId);
        return;
      }

      // Single system available — auto-create without prompting
      const { data: systems } = await supabase
        .from("systems")
        .select("id, slug");
      if (systems && systems.length === 1) {
        await createAndOpen(gameId, currentUserId, systems[0].slug, tokenId);
        return;
      }

      // Game uses dnd5e (the default) and multiple systems exist — use dnd5e directly
      // Only show the picker if the game has no system set at all
      if (gameSystemSlug) {
        await createAndOpen(gameId, currentUserId, gameSystemSlug, tokenId);
        return;
      }

      // No game system set — show picker as last resort
      setPendingGameId(gameId);
      setPendingTokenId(tokenId);
      setNeedsSystemPick(true);
    },
    [currentUserId, gameSystemSlug, createAndOpen, resolveTokens],
  );

  // ── Player confirms system in picker ──────────────────────────────────────
  const confirmSystemPick = useCallback(
    async (systemSlug: string) => {
      setNeedsSystemPick(false);
      if (!pendingGameId) return;
      await createAndOpen(
        pendingGameId,
        currentUserId,
        systemSlug,
        pendingTokenId,
      );
      setPendingGameId(null);
      setPendingTokenId(null);
    },
    [pendingGameId, pendingTokenId, currentUserId, createAndOpen],
  );

  const cancelSystemPick = useCallback(() => {
    setNeedsSystemPick(false);
    setPendingGameId(null);
    setPendingTokenId(null);
  }, []);

  // ── GM confirms which player owns a token ─────────────────────────────────
  const confirmPlayerPick = useCallback(
    async (targetUserId: string) => {
      setNeedsPlayerPick(false);
      if (!pendingGameId) return;

      // Get or create the sheet for this player — but don't open it on the GM's screen
      const { data: sheetId } = await supabase.rpc("get_or_create_sheet", {
        p_game_id: pendingGameId,
        p_user_id: targetUserId,
        p_system_slug: gameSystemSlug,
      });

      if (sheetId && pendingTokenId) {
        // Link sheet + owner to the token so the player can open it later
        await supabase
          .from("tokens")
          .update({
            sheet_id: sheetId,
            owner_id: targetUserId,
          })
          .eq("id", pendingTokenId);
      }

      setPendingGameId(null);
      setPendingTokenId(null);
    },
    [pendingGameId, pendingTokenId, gameSystemSlug],
  );

  const cancelPlayerPick = useCallback(() => {
    setNeedsPlayerPick(false);
    setPendingGameId(null);
    setPendingTokenId(null);
  }, []);

  // ── Open sheet linked to a token ──────────────────────────────────────────
  const openForToken = useCallback(
    async (tokenId: string, gameId: string) => {
      const { data: token } = await supabase
        .from("tokens")
        .select("sheet_id, owner_id, player_editable")
        .eq("id", tokenId)
        .single();

      if (!token) return;

      // ── GM path ───────────────────────────────────────────────────────────
      if (isGM && token.player_editable) {
        if (token.sheet_id) {
          const { data: sheet } = await supabase
            .from("character_sheets")
            .select("id, user_id, systems(slug)")
            .eq("id", token.sheet_id)
            .single();

          if (sheet && sheet.user_id !== currentUserId) {
            // Valid player sheet already linked — open directly
            setOpenSheet({
              sheetId: sheet.id,
              gameId,
              userId: sheet.user_id,
              systemSlug: (sheet.systems as any)?.slug ?? "dnd5e",
              tokenId,
              canEdit: true,
            });
            return;
          }

          // Sheet is GM's own stale test sheet — clear it
          await supabase
            .from("tokens")
            .update({ sheet_id: null })
            .eq("id", tokenId);
        }

        // No valid player sheet — ask GM to pick which player
        setPendingGameId(gameId);
        setPendingTokenId(tokenId);
        setNeedsPlayerPick(true);
        return;
      }

      // ── Player path ───────────────────────────────────────────────────────

      // Token has a sheet linked
      if (token.sheet_id) {
        const { data: sheet } = await supabase
          .from("character_sheets")
          .select("id, user_id, systems(slug)")
          .eq("id", token.sheet_id)
          .single();

        // Only open if the sheet belongs to this player
        if (sheet && sheet.user_id === currentUserId) {
          setOpenSheet({
            sheetId: sheet.id,
            gameId,
            userId: sheet.user_id,
            systemSlug: (sheet.systems as any)?.slug ?? "dnd5e",
            tokenId,
            canEdit: true,
          });
          return;
        }

        // Sheet belongs to someone else — player can't open it
        if (sheet && sheet.user_id !== currentUserId) return;
      }

      // Token has a known owner — only open if it's this player's token
      if (token.owner_id && token.owner_id !== currentUserId) return;

      // Token is either unowned+player_editable, or owned by this player
      // Route through openOwn so system picker shows if needed (never auto-creates blank)
      if (token.player_editable) {
        await openOwn(gameId, undefined, tokenId);
      }
    },
    [currentUserId, isGM, createAndOpen, openOwn],
  );

  // ── Auto-link sheet when GM grants player control ─────────────────────────
  const autoLinkSheet = useCallback(
    async (tokenId: string, ownerId: string, gameId: string) => {
      const { data: sheetId } = await supabase.rpc("get_or_create_sheet", {
        p_game_id: gameId,
        p_user_id: ownerId,
        p_system_slug: gameSystemSlug,
      });
      if (!sheetId) return;
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
    needsSystemPick,
    needsPlayerPick,
    openOwn,
    openForToken,
    autoLinkSheet,
    confirmSystemPick,
    cancelSystemPick,
    confirmPlayerPick,
    cancelPlayerPick,
    closeSheet,
  };
}
