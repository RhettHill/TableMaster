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

// ── Helpers ───────────────────────────────────────────────────────────────────

// Resolve a system_id → { id, slug } — used when we have an ID but need the slug
// for rendering, and vice versa.
async function resolveSystem(
  systemId?: string | null,
  systemSlug?: string | null,
): Promise<{ id: string; slug: string } | null> {
  if (!systemId && !systemSlug) return null;

  const query = supabase.from("systems").select("id, slug");
  const { data } = systemId
    ? await query.eq("id", systemId).single()
    : await query.eq("slug", systemSlug!).single();

  return data ?? null;
}

export function useCharacterSheet(
  currentUserId: string,
  isGM: boolean,
  // Now accepts both slug and id so custom systems work correctly.
  // GameSession passes the real slug (e.g. "custom_<gameId>_blades") from the
  // joined systems row; for built-in games that have no system set yet this
  // falls back to "dnd5e".
  gameSystemSlug: string = "dnd5e",
  gameSystemId?: string,
) {
  const [openSheet, setOpenSheet] = useState<OpenSheet | null>(null);
  const [needsSystemPick, setNeedsSystemPick] = useState(false);
  const [needsPlayerPick, setNeedsPlayerPick] = useState(false);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);
  const [pendingTokenId, setPendingTokenId] = useState<string | null>(null);

  // ── Internal: create/get sheet then open ─────────────────────────────────
  // Uses system_id when available (custom systems) so the RPC inserts the
  // correct system_id into character_sheets instead of looking up by slug.
  const createAndOpen = useCallback(
    async (
      gameId: string,
      userId: string,
      systemSlug: string,
      tokenId: string | null,
      systemIdOverride?: string,
    ) => {
      // Prefer the passed system_id; fall back to slug-based lookup in the RPC
      const { data: sheetId, error } = await supabase.rpc(
        "get_or_create_sheet",
        {
          p_game_id: gameId,
          p_user_id: userId,
          p_system_slug: systemSlug,
          // p_system_id is an optional param — add it to the RPC if your DB
          // version supports it; otherwise the slug lookup handles it.
          ...(systemIdOverride ? { p_system_id: systemIdOverride } : {}),
        },
      );

      if (error || !sheetId) {
        console.error("get_or_create_sheet failed", error);
        return;
      }

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

  // ── Resolve all tokens for a player in a game ─────────────────────────────
  const resolveTokens = useCallback(
    async (gameId: string, sheetId?: string): Promise<string[]> => {
      const ids = new Set<string>();

      const { data: scenes } = await supabase
        .from("scenes")
        .select("id")
        .eq("game_id", gameId);
      if (!scenes?.length) return [];
      const sceneIds = scenes.map((s: any) => s.id);

      if (sheetId) {
        const { data: bySheet } = await supabase
          .from("tokens")
          .select("id")
          .eq("sheet_id", sheetId)
          .in("scene_id", sceneIds);
        (bySheet ?? []).forEach((t: any) => ids.add(t.id));
      }

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

  // ── Determine which system to use for this game ───────────────────────────
  // Priority: custom system for this game > game's system_id > slug fallback
  const resolveGameSystem = useCallback(
    async (gameId: string): Promise<{ slug: string; id?: string } | null> => {
      // First check if there's a custom system for this specific game
      const { data: customSys } = await supabase
        .from("systems")
        .select("id, slug")
        .eq("game_id", gameId)
        .eq("custom", true)
        .maybeSingle();

      if (customSys) return { slug: customSys.slug, id: customSys.id };

      // Fall back to the game's assigned system
      if (gameSystemId) {
        const sys = await resolveSystem(gameSystemId);
        if (sys) return { slug: sys.slug, id: sys.id };
      }

      if (gameSystemSlug && gameSystemSlug !== "dnd5e") {
        return { slug: gameSystemSlug };
      }

      return { slug: "dnd5e" };
    },
    [gameSystemId, gameSystemSlug],
  );

  // ── Open player's own sheet ───────────────────────────────────────────────
  const openOwn = useCallback(
    async (gameId: string, linkTokenId?: string | null) => {
      // Check existing sheet
      const { data: existing } = await supabase
        .from("character_sheets")
        .select("id, system_id, systems(slug, sheet_template)")
        .eq("game_id", gameId)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (existing) {
        const allTokenIds = linkTokenId
          ? [linkTokenId]
          : await resolveTokens(gameId, existing.id);

        if (allTokenIds.length > 0) {
          await supabase
            .from("tokens")
            .update({ sheet_id: existing.id })
            .in("id", allTokenIds);
        }

        // Check if the game now has a custom system — if so, the sheet's
        // system may be stale (was created before the custom system existed).
        // Re-check and update if needed.
        const { data: customSys } = await supabase
          .from("systems")
          .select("id, slug")
          .eq("game_id", gameId)
          .eq("custom", true)
          .maybeSingle();

        if (customSys && existing.system_id !== customSys.id) {
          // Update the sheet to use the new custom system
          await supabase
            .from("character_sheets")
            .update({ system_id: customSys.id })
            .eq("id", existing.id);

          setOpenSheet({
            sheetId: existing.id,
            gameId,
            userId: currentUserId,
            systemSlug: customSys.slug,
            tokenId: allTokenIds[0] ?? null,
            canEdit: true,
          });
          return;
        }

        setOpenSheet({
          sheetId: existing.id,
          gameId,
          userId: currentUserId,
          systemSlug: (existing.systems as any)?.slug ?? "dnd5e",
          tokenId: allTokenIds[0] ?? null,
          canEdit: true,
        });
        return;
      }

      // No sheet yet — determine which system to use
      const allTokenIds = linkTokenId
        ? [linkTokenId]
        : await resolveTokens(gameId);
      const tokenId = allTokenIds[0] ?? null;

      const sys = await resolveGameSystem(gameId);

      if (sys) {
        await createAndOpen(gameId, currentUserId, sys.slug, tokenId, sys.id);
        return;
      }

      // Last resort — show system picker
      setPendingGameId(gameId);
      setPendingTokenId(tokenId);
      setNeedsSystemPick(true);
    },
    [
      currentUserId,
      gameSystemSlug,
      gameSystemId,
      createAndOpen,
      resolveTokens,
      resolveGameSystem,
    ],
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

      const sys = await resolveGameSystem(pendingGameId);
      const slug = sys?.slug ?? gameSystemSlug ?? "dnd5e";

      const { data: sheetId } = await supabase.rpc("get_or_create_sheet", {
        p_game_id: pendingGameId,
        p_user_id: targetUserId,
        p_system_slug: slug,
        ...(sys?.id ? { p_system_id: sys.id } : {}),
      });

      if (sheetId && pendingTokenId) {
        await supabase
          .from("tokens")
          .update({ sheet_id: sheetId, owner_id: targetUserId })
          .eq("id", pendingTokenId);
      }

      setPendingGameId(null);
      setPendingTokenId(null);
    },
    [pendingGameId, pendingTokenId, gameSystemSlug, resolveGameSystem],
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

          await supabase
            .from("tokens")
            .update({ sheet_id: null })
            .eq("id", tokenId);
        }

        setPendingGameId(gameId);
        setPendingTokenId(tokenId);
        setNeedsPlayerPick(true);
        return;
      }

      // ── Player path ───────────────────────────────────────────────────────
      if (token.sheet_id) {
        const { data: sheet } = await supabase
          .from("character_sheets")
          .select("id, user_id, systems(slug)")
          .eq("id", token.sheet_id)
          .single();

        if (sheet && sheet.user_id === currentUserId) {
          // Check if system has changed since sheet was created
          const { data: customSys } = await supabase
            .from("systems")
            .select("id, slug")
            .eq("game_id", gameId)
            .eq("custom", true)
            .maybeSingle();

          const currentSlug = (sheet.systems as any)?.slug ?? "dnd5e";
          const targetSlug = customSys?.slug ?? currentSlug;

          // If game now has a custom system but this sheet doesn't use it, migrate
          if (customSys && currentSlug !== customSys.slug) {
            await supabase
              .from("character_sheets")
              .update({ system_id: customSys.id })
              .eq("id", sheet.id);
          }

          setOpenSheet({
            sheetId: sheet.id,
            gameId,
            userId: sheet.user_id,
            systemSlug: targetSlug,
            tokenId,
            canEdit: true,
          });
          return;
        }

        if (sheet && sheet.user_id !== currentUserId) return;
      }

      if (token.owner_id && token.owner_id !== currentUserId) return;

      if (token.player_editable) {
        await openOwn(gameId, undefined);
      }
    },
    [currentUserId, isGM, openOwn],
  );

  // ── Auto-link sheet when GM grants player control ─────────────────────────
  const autoLinkSheet = useCallback(
    async (tokenId: string, ownerId: string, gameId: string) => {
      const sys = await resolveGameSystem(gameId);
      const slug = sys?.slug ?? gameSystemSlug ?? "dnd5e";

      const { data: sheetId, error } = await supabase.rpc(
        "get_or_create_sheet",
        {
          p_game_id: gameId,
          p_user_id: ownerId,
          p_system_slug: slug,
          ...(sys?.id ? { p_system_id: sys.id } : {}),
        },
      );

      if (error || !sheetId) return;

      await supabase
        .from("tokens")
        .update({ sheet_id: sheetId })
        .eq("id", tokenId);
    },
    [gameSystemSlug, resolveGameSystem],
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
