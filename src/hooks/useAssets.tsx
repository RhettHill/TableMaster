// src/hooks/useAssets.tsx
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import {
  uploadFile,
  StorageQuotaError,
  deleteAssetFromR2,
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

export function useAssets(userId: string | null, gameId: string | null) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [sharedLibrary, setSharedLibrary] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);

  // ── Plan check ────────────────────────────────────────────────────────────────
  const checkPlan = useCallback(async () => {
    if (!userId) {
      setIsPro(false);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_id, subscription_status, plans(price_monthly)")
      .eq("id", userId)
      .single();
    if (profile) {
      const active = ["active", "trialing", "canceling"].includes(
        profile.subscription_status ?? "",
      );
      setIsPro(active && profile.plan_id === "pro");
    } else {
      setIsPro(false);
    }
  }, [userId]);

  // ── Fetch ─────────────────────────────────────────────────────────────────────
  const fetchAssets = useCallback(async () => {
    if (!userId || !gameId) return;
    setLoading(true);
    setError(null);

    // Per-game assets (this game only)
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

    // Shared library: ALL assets this user has marked shared, across ALL games.
    // Fix issue 4: no game_id filter — shared assets appear in every game's library
    // including the game they were originally uploaded to.
    const { data: shared } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .eq("shared", true)
      .order("created_at", { ascending: false });

    if (shared) {
      // Deduplicate by file_url (same file shared from multiple games → show once)
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
    const isAnimated =
      mimeType.startsWith("video/") || mimeType === "image/gif";
    const shared = options?.shared ?? false;

    let result: any;
    try {
      result = await uploadFile(file, gameId, onProgress, {
        shared,
        assetType: type,
      });
    } catch (e: any) {
      if (e instanceof StorageQuotaError) {
        setError({ message: e.message, isQuota: true, detail: e.detail });
      } else {
        setError({ message: e.message, isQuota: false });
      }
      return null;
    }

    if (!result.assetId) {
      setError({
        message: "Upload succeeded but asset record was not created.",
        isQuota: false,
      });
      return null;
    }

    const newAsset: Asset = {
      id: result.assetId,
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
        if (prev.some((a) => a.file_url === newAsset.file_url)) return prev;
        return [newAsset, ...prev];
      });
    }
    return newAsset;
  };

  // ── Mark existing asset as shared ─────────────────────────────────────────────
  const markAsShared = async (asset: Asset): Promise<boolean> => {
    if (!userId) return false;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) return false;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mark-asset-shared`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ assetId: asset.id }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("[markAsShared] failed:", body);
        return false;
      }
    } catch (e: any) {
      console.error("[markAsShared] network error:", e.message);
      return false;
    }

    const updated = { ...asset, shared: true };
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? updated : a)));
    setSharedLibrary((prev) => {
      if (prev.some((a) => a.file_url === updated.file_url)) {
        return prev.map((a) => (a.id === updated.id ? updated : a));
      }
      return [updated, ...prev];
    });
    return true;
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const deleteAsset = async (asset: Asset) => {
    try {
      await deleteAssetFromR2(asset.file_url);
    } catch (e: any) {
      console.error("[deleteAsset] R2 delete failed:", e.message);
    }
    const { error: rpcErr } = await supabase.rpc("record_delete", {
      p_asset_id: asset.id,
    });
    if (rpcErr)
      console.error("[deleteAsset] record_delete failed:", rpcErr.message);
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    setSharedLibrary((prev) => prev.filter((a) => a.id !== asset.id));
  };

  return {
    assets,
    sharedLibrary,
    loading,
    error,
    isPro: isPro ?? false,
    isProLoading: isPro === null,
    uploadAsset,
    markAsShared,
    deleteAsset,
    refetch: fetchAssets,
  };
}
