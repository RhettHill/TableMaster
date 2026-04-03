// src/hooks/useAssets.tsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import {
  uploadFile,
  StorageQuotaError,
  UploadResult,
} from "../services/r2Storage";

export interface Asset {
  id: string;
  user_id: string;
  game_id: string;
  file_url: string;
  file_size: number;
  type: "map" | "token" | string;
  created_at: string;
  shared?: boolean;
  is_animated?: boolean;
  /** Stored MIME type — set on upload so MapLayer knows video vs gif */
  mime_type?: string;
}

export interface UploadError {
  message: string;
  isQuota: boolean;
  detail?: {
    plan: string;
    storage_used?: number;
    storage_limit?: number;
    max_file_size?: number;
  };
}

const VIDEO_MIME = new Set(["video/mp4", "video/webm"]);
const ANIMATED_MIME = new Set(["image/gif"]);

export function useAssets(userId: string | null, gameId: string | null) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sharedLibrary, setSharedLibrary] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);
  const [isPro, setIsPro] = useState(false);

  // ── Plan check ────────────────────────────────────────────────────────────────
  const checkPlan = useCallback(async () => {
    if (!userId) return;
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_id, subscription_status, plans(price_monthly)")
      .eq("id", userId)
      .single();
    if (profile) {
      const plan = profile.plans as any;
      const active = ["active", "trialing"].includes(
        profile.subscription_status ?? "",
      );
      setIsPro(active && !!profile.plan_id && (plan?.price_monthly ?? 0) > 0);
    }
  }, [userId]);

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    if (!userId || !gameId) return;
    setLoading(true);
    setError(null);

    // Assets belonging to this specific game
    const { data: gameAssets, error: dbErr } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false });

    if (dbErr) {
      setError({ message: dbErr.message, isQuota: false });
      setLoading(false);
      return;
    }
    setAssets(gameAssets ?? []);

    // Shared library = ALL assets the user has marked shared, across ALL games.
    // We do NOT filter by game_id here — that's what makes it a cross-game library.
    // We deduplicate by file_url so the same file shared from multiple games
    // only appears once in the picker.
    const { data: shared } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .eq("shared", true)
      .order("created_at", { ascending: false });

    if (shared) {
      // Deduplicate by file_url, keeping the most recent entry
      const seen = new Set<string>();
      const deduped: Asset[] = [];
      for (const a of shared) {
        if (!seen.has(a.file_url)) {
          seen.add(a.file_url);
          deduped.push(a as Asset);
        }
      }
      setSharedLibrary(deduped);
    }

    setLoading(false);
  }, [userId, gameId]);

  useEffect(() => {
    checkPlan();
    fetchAssets();
  }, [checkPlan, fetchAssets]);

  // ── Upload ────────────────────────────────────────────────────────────────────
  const uploadAsset = async (
    file: File,
    type: "map" | "token",
    options?: { shared?: boolean },
    onProgress?: (pct: number) => void,
  ): Promise<Asset | null> => {
    if (!userId || !gameId) return null;
    setError(null);

    const mimeType = file.type;
    const isVideo = VIDEO_MIME.has(mimeType);
    const isGif = ANIMATED_MIME.has(mimeType);
    const isAnimated = isVideo || isGif;

    let result: UploadResult;
    try {
      result = await uploadFile(file, gameId, onProgress);
    } catch (e: any) {
      if (e instanceof StorageQuotaError) {
        setError({ message: e.message, isQuota: true, detail: e.detail });
      } else {
        setError({ message: e.message, isQuota: false });
      }
      return null;
    }

    // Record via RPC for storage bookkeeping
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      "record_upload",
      {
        p_user_id: userId,
        p_game_id: gameId,
        p_file_url: result.publicUrl,
        p_file_size: file.size,
        p_type: type,
      },
    );

    if (rpcErr || rpcData?.error) {
      const msg =
        rpcData?.error ?? rpcErr?.message ?? "Failed to record upload";
      setError({
        message: msg,
        isQuota: msg.includes("quota") || msg.includes("large"),
      });
      return null;
    }

    const assetId: string = rpcData.asset_id;
    const shared = options?.shared ?? false;

    // Persist extra metadata — the RPC only knows about the basic fields
    const metaPatch: Record<string, any> = {};
    if (shared) metaPatch.shared = true;
    if (isAnimated) metaPatch.is_animated = true;
    if (mimeType) metaPatch.mime_type = mimeType;

    if (Object.keys(metaPatch).length > 0) {
      await supabase.from("assets").update(metaPatch).eq("id", assetId);
    }

    const newAsset: Asset = {
      id: assetId,
      user_id: userId,
      game_id: gameId,
      file_url: result.publicUrl,
      file_size: file.size,
      type,
      created_at: new Date().toISOString(),
      shared,
      is_animated: isAnimated,
      mime_type: mimeType,
    };

    setAssets((prev) => [newAsset, ...prev]);
    if (shared) {
      setSharedLibrary((prev) => {
        // Deduplicate: don't add if file_url already exists
        if (prev.some((a) => a.file_url === newAsset.file_url)) return prev;
        return [newAsset, ...prev];
      });
    }
    return newAsset;
  };

  // ── Mark existing asset as shared (add to library) ────────────────────────────
  const markAsShared = async (asset: Asset): Promise<boolean> => {
    if (!userId) return false;

    const { error: updateErr } = await supabase
      .from("assets")
      .update({ shared: true })
      .eq("id", asset.id)
      .eq("user_id", userId); // safety: can only mark your own

    if (updateErr) {
      console.error("markAsShared failed:", updateErr.message);
      return false;
    }

    const updated = { ...asset, shared: true };
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)));
    // Add to shared library if not already there (deduplicate by file_url)
    setSharedLibrary((prev) => {
      if (prev.some((a) => a.file_url === updated.file_url)) {
        return prev.map((a) => (a.id === updated.id ? updated : a));
      }
      return [updated, ...prev];
    });
    return true;
  };

  // ── Add shared library asset to this game ─────────────────────────────────────
  // This creates a new per-game copy of the asset row with shared=false.
  // The ORIGINAL shared row (in its original game) remains in the library.
  // On reload, fetchAssets will find this new row via the game_id filter,
  // and the library query will still find the original via shared=true.
  const addFromLibrary = async (asset: Asset): Promise<boolean> => {
    if (!userId || !gameId) return false;

    // Already in this game (by file_url)
    if (assets.some((a) => a.file_url === asset.file_url)) return true;

    const { data, error: insertErr } = await supabase
      .from("assets")
      .insert({
        user_id: userId,
        game_id: gameId,
        file_url: asset.file_url,
        file_size: asset.file_size,
        type: asset.type,
        // shared=false: this is a per-game reference, not a new library entry
        shared: false,
        is_animated: asset.is_animated ?? false,
        mime_type: asset.mime_type ?? null,
      })
      .select()
      .single();

    if (insertErr || !data) {
      console.error("addFromLibrary failed:", insertErr?.message);
      return false;
    }

    setAssets((prev) => [data as Asset, ...prev]);
    // Note: we do NOT add to sharedLibrary here — the original shared entry
    // still exists and will appear on next load. The library tab filters out
    // assets already in the current game by file_url, so this is consistent.
    return true;
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const deleteAsset = async (asset: Asset) => {
    await supabase.rpc("record_delete", { p_asset_id: asset.id });
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    setSharedLibrary((prev) => prev.filter((a) => a.id !== asset.id));
  };

  return {
    assets,
    sharedLibrary,
    loading,
    error,
    isPro,
    uploadAsset,
    markAsShared,
    addFromLibrary,
    deleteAsset,
    refetch: fetchAssets,
  };
}
