/**
 * r2Storage — uploads, deletes, and shared-asset support for R2.
 */

import { supabase } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResult {
  publicUrl: string;
  key: string;
  path: string;
  isAnimated: boolean;
  shared: boolean;
}

export class StorageQuotaError extends Error {
  constructor(
    message: string,
    public readonly detail: {
      plan: string;
      storage_used?: number;
      storage_limit?: number;
      max_file_size?: number;
    }
  ) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export class ProPlanRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProPlanRequiredError";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getJWT(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) throw new Error("Not authenticated");
  return data.session.access_token;
}

/** Extract the R2 object key from a full public URL. */
export function keyFromUrl(publicUrl: string): string | null {
  const match = publicUrl.match(/\.r2\.dev\/(.+)$/);
  return match ? match[1] : null;
}

export function isAnimatedType(mimeType: string): boolean {
  return mimeType.startsWith("video/") || mimeType === "image/gif";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

// ── Upload ────────────────────────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  gameId: string,
  onProgress?: (pct: number) => void,
  options: { shared?: boolean } = {},
): Promise<UploadResult> {
  const token = await getJWT();
  const fileType = file.type || "image/jpeg";
  const { shared = false } = options;

  const presignRes = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name || `upload.${fileType.split("/")[1] ?? "bin"}`,
        fileType,
        fileSize: file.size,
        gameId,
        shared,
      }),
    }
  );

  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    if (presignRes.status === 403 && data.requiresPro) {
      throw new ProPlanRequiredError(data.error ?? "Pro plan required");
    }
    if (presignRes.status === 413 || (data.error ?? "").includes("quota")) {
      throw new StorageQuotaError(data.error ?? "Storage quota exceeded", { plan: "unknown" });
    }
    throw new Error(`Presign failed ${presignRes.status}: ${JSON.stringify(data)}`);
  }

  const { presignedUrl, contentType, key, publicUrl, isAnimated } = await presignRes.json();
  if (!presignedUrl || !publicUrl) throw new Error("Invalid presign response");

  const putRes = await fetch(presignedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType ?? fileType },
    body: file,
  });

  if (!putRes.ok) {
    const text = await putRes.text();
    throw new Error(`R2 PUT failed ${putRes.status}: ${text}`);
  }

  if (onProgress) onProgress(100);
  return { publicUrl, key, path: key, isAnimated: isAnimated ?? false, shared };
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteAssetFromR2(publicUrl: string): Promise<void> {
  const key = keyFromUrl(publicUrl);
  if (!key) { console.warn("[r2] Could not extract key from URL:", publicUrl); return; }
  await deleteKeysFromR2([key]);
}

export async function deleteKeysFromR2(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const token = await getJWT();
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-delete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ keys }),
    }
  );
  if (!res.ok) {
    console.error("[r2] Delete failed:", res.status, await res.text());
  } else {
    const data = await res.json();
    if (data.failed > 0) console.warn("[r2] Some keys failed to delete:", data.errors);
  }
}

/** Call this before deleting a game row to clean up all its R2 assets. */
export async function deleteGameAssets(gameId: string): Promise<void> {
  const { data, error } = await supabase.rpc("get_game_asset_keys", { p_game_id: gameId });
  if (error) { console.error("[r2] Failed to fetch game asset keys:", error); return; }
  const keys = (data as { key: string }[]).map((r) => r.key).filter(Boolean);
  if (keys.length > 0) await deleteKeysFromR2(keys);
}

// ── Shared asset library ──────────────────────────────────────────────────────

export async function linkSharedAssetToGame(assetId: string, gameId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase
    .from("shared_asset_refs")
    .upsert({ asset_id: assetId, game_id: gameId, added_by: user.id });
  return !error;
}

export async function unlinkSharedAsset(assetId: string, gameId: string): Promise<void> {
  await supabase.from("shared_asset_refs").delete().eq("asset_id", assetId).eq("game_id", gameId);
}

// ── Storage info ──────────────────────────────────────────────────────────────

export interface StorageInfo {
  used: number;
  limit: number;
  planId: string;
  planName: string;
  pct: number;
}

export async function getStorageInfo(userId: string): Promise<StorageInfo | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("storage_used, plan_id, plans(name, storage_limit)")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  const plan = data.plans as any;
  const used = data.storage_used ?? 0;
  const limit = plan?.storage_limit ?? 104857600;
  return {
    used, limit,
    planId: data.plan_id,
    planName: plan?.name ?? "Free",
    pct: Math.min(100, Math.round((used / limit) * 100)),
  };
}