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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<UploadError | null>(null);

  const fetchAssets = useCallback(async () => {
    if (!userId || !gameId) return;
    setLoading(true);
    setError(null);
    const { data, error: dbErr } = await supabase
      .from("assets")
      .select("*")
      .eq("user_id", userId)
      .eq("game_id", gameId)
      .order("created_at", { ascending: false });
    if (dbErr) setError({ message: dbErr.message, isQuota: false });
    else setAssets(data ?? []);
    setLoading(false);
  }, [userId, gameId]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const uploadAsset = async (
    file: File,
    type: "map" | "token",
    onProgress?: (pct: number) => void,
  ): Promise<Asset | null> => {
    if (!userId || !gameId) return null;
    setError(null);

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

    // Record the upload in DB + increment storage_used atomically
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

    const newAsset: Asset = {
      id: rpcData.asset_id,
      user_id: userId,
      game_id: gameId,
      file_url: result.publicUrl,
      file_size: file.size,
      type,
      created_at: new Date().toISOString(),
    };

    setAssets((prev) => [newAsset, ...prev]);
    return newAsset;
  };

  const deleteAsset = async (asset: Asset) => {
    // record_delete decrements storage_used then removes the DB row
    await supabase.rpc("record_delete", { p_asset_id: asset.id });
    setAssets((prev) => prev.filter((a) => a.id !== asset.id));
    // Note: R2 object deletion is handled server-side by a scheduled cleanup
    // or you can add a second Edge Function for deletes
  };

  return {
    assets,
    loading,
    error,
    uploadAsset,
    deleteAsset,
    refetch: fetchAssets,
  };
}
