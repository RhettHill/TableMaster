/**
 * r2Storage — uploads, deletes, and shared-asset support for R2.
 *
 * Routing:
 *   < MULTIPART_THRESHOLD  → single presigned PUT (r2-presign Edge Function)
 *   >= MULTIPART_THRESHOLD → multipart upload    (r2-multipart Edge Function)
 *
 * The threshold is 50 MB by default — well above typical images/GIFs,
 * and below the point where single PUTs become unreliable for MP4s.
 */

import { supabase } from "./supabase";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Files at or above this size use multipart upload. */
const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50 MB

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResult {
  publicUrl: string;
  key: string;
  path: string;
  isAnimated: boolean;
  shared: boolean;
  assetId: string | null;
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

// ── Single-part upload (< 50 MB) ─────────────────────────────────────────────

// ── Single-part upload (< 50 MB) ─────────────────────────────────────────────

async function singlePartUpload(
  file: File,
  gameId: string,
  onProgress: ((pct: number) => void) | undefined,
  options: { shared?: boolean; assetType?: string },
): Promise<UploadResult> {
  const token = await getJWT();
  const fileType = file.type || "image/jpeg";
  const { shared = false, assetType = "map" } = options;

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
        assetType,
        shared,
      }),
    }
  );

  if (!presignRes.ok) {
    const data = await presignRes.json().catch(() => ({}));
    if (presignRes.status === 403 && (data as any).requiresPro) {
      throw new ProPlanRequiredError((data as any).error ?? "Pro plan required");
    }
    if (presignRes.status === 413 || ((data as any).error ?? "").includes("quota")) {
      throw new StorageQuotaError((data as any).error ?? "Storage quota exceeded", { plan: "unknown" });
    }
    throw new Error(`Presign failed ${presignRes.status}: ${JSON.stringify(data)}`);
  }

  const { presignedUrl, key, publicUrl, isAnimated, assetId } = await presignRes.json();
  if (!presignedUrl || !publicUrl) throw new Error("Invalid presign response");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", presignedUrl);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress((event.loaded / event.total) * 100);
      }
    };

    xhr.timeout = 120_000;
    xhr.ontimeout = () => reject(new Error("Upload timed out"));
    xhr.onerror = () => reject(new Error("Upload failed (network error)"));
    xhr.onabort = () => reject(new Error("Upload was cancelled"));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve();
      } else {
        reject(new Error(`R2 PUT failed ${xhr.status}: ${xhr.responseText}`));
      }
    };

    xhr.send(file);
  });

  return { publicUrl, key, path: key, isAnimated: isAnimated ?? false, shared, assetId: assetId ?? null };
}

// ── Multipart upload (>= 50 MB) ───────────────────────────────────────────────

async function multipartUpload(
  file: File,
  gameId: string,
  onProgress: ((pct: number) => void) | undefined,
  options: { shared?: boolean; assetType?: string },
): Promise<UploadResult> {
  const token = await getJWT();
  const fileType = file.type || "video/mp4";
  const { shared = false, assetType = "map" } = options;

  const edgeFn = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-miltipart`;

  const callEdge = async (body: object) => {
    const res = await fetch(edgeFn, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && (data as any).requiresPro) {
        throw new ProPlanRequiredError((data as any).error ?? "Pro plan required");
      }
      if (res.status === 413) {
        throw new StorageQuotaError((data as any).error ?? "File too large", { plan: "unknown" });
      }
      throw new Error(`Edge function error ${res.status}: ${JSON.stringify(data)}`);
    }
    return res.json();
  };

  // Step 1: Initiate
  const initData = await callEdge({
    action: "initiate",
    fileName: file.name || `upload.${fileType.split("/")[1] ?? "bin"}`,
    fileType,
    fileSize: file.size,
    gameId,
    assetType,
    shared,
  });

  const { uploadId, key, publicUrl, partSize, totalParts, isAnimated, assetId } = initData;
  let partUrls: string[] = initData.partUrls;

  // Step 2: Upload each part
  const parts: { partNumber: number; etag: string }[] = [];
  let bytesUploaded = 0;
  const CONCURRENCY = 5;

  const getPartUrl = async (partNumber: number): Promise<string> => {
    const idx = partNumber - 1;
    if (idx < partUrls.length) return partUrls[idx];
    const fromPart = partUrls.length + 1;
    const toPart = Math.min(fromPart + 49, totalParts);
    const moreUrls = await callEdge({ action: "presign", key, uploadId, fromPart, toPart });
    partUrls = [...partUrls, ...moreUrls.partUrls];
    return partUrls[idx];
  };

  const uploadPart = async (partNumber: number): Promise<void> => {
    const url = await getPartUrl(partNumber);
    const start = (partNumber - 1) * partSize;
    const end = Math.min(file.size, start + partSize);
    const blob = file.slice(start, end);

    const res = await fetch(url, { method: "PUT", body: blob });
    if (!res.ok) {
      throw new Error(`Part ${partNumber} failed: ${res.status} ${await res.text()}`);
    }

    const etag = res.headers.get("ETag") ?? res.headers.get("etag") ?? `"part-${partNumber}"`;
    parts.push({ partNumber, etag });
    bytesUploaded += blob.size;
    if (onProgress) onProgress((bytesUploaded / file.size) * 100);
  };

  for (let i = 0; i < totalParts; i += CONCURRENCY) {
    const batchEnd = Math.min(i + CONCURRENCY, totalParts);
    const batch = [];
    for (let partNumber = i + 1; partNumber <= batchEnd; partNumber++) {
      batch.push(uploadPart(partNumber));
    }
    try {
      await Promise.all(batch);
    } catch (err) {
      await callEdge({ action: "abort", key, uploadId, assetId }).catch(() => {});
      throw err;
    }
  }

  // Step 3: Complete
  await callEdge({ action: "complete", key, uploadId, parts, fileSize: file.size });

  return { publicUrl, key, path: key, isAnimated: isAnimated ?? false, shared, assetId: assetId ?? null };
}

// ── Public upload function ────────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  gameId: string,
  onProgress?: (pct: number) => void,
  options: { shared?: boolean; assetType?: string } = {},
): Promise<UploadResult> {
  if (file.size >= MULTIPART_THRESHOLD) {
    return multipartUpload(file, gameId, onProgress, options);
  }
  return singlePartUpload(file, gameId, onProgress, options);
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
  }
}

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