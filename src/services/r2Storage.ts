/**
 * r2Storage — uploads files directly to Cloudflare R2 using presigned URLs.
 * Fixed version:
 * - Reliable JWT handling (with refresh)
 * - Correct presign payload (includes fileSize)
 * - Handles backend response shape differences
 * - Prevents undefined URL bugs
 * - Avoids signature mismatch (no headers on PUT)
 */

import { supabase } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadResult {
  publicUrl: string;
  key: string;
  path: string;
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

// ── Auth helper (FIXED) ───────────────────────────────────────────────────────

async function getJWT(): Promise<string> {
  // Try existing session first
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  // 🔥 Force refresh if missing
  const { data, error } = await supabase.auth.refreshSession();

  if (error || !data.session?.access_token) {
    throw new Error("Not authenticated");
  }

  return data.session.access_token;
}

// ── Upload to R2 (low-level) ──────────────────────────────────────────────────

export async function uploadToR2(
  presignedUrl: string,
  file: File
): Promise<void> {
  console.log("Uploading file:", {
    name: file.name,
    type: file.type,
    size: file.size,
  });

  const res = await fetch(presignedUrl, {
    method: "PUT",

    body: file,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("R2 upload failed:", text);
    throw new Error("Upload failed");
  }
}

// ── Main upload pipeline ──────────────────────────────────────────────────────

export async function uploadFile(
  file: File,
  gameId: string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  // 1. Get JWT (reliable)
  const token = await getJWT();

  console.log("Using JWT:", token);

  // 2. Request presigned URL (FIXED payload)
  const res = await fetch(
    "https://cedpshwrbikizggfxcdp.supabase.co/functions/v1/r2-presign",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name || crypto.randomUUID(),
        fileType: file.type || "application/octet-stream",
        fileSize: file.size, // ✅ REQUIRED
        gameId,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Presign failed:", text);

    // Optional: detect quota errors
    if (text.toLowerCase().includes("quota")) {
      throw new StorageQuotaError("Storage quota exceeded", {
        plan: "unknown",
      });
    }

    throw new Error("Failed to get presigned URL");
  }

  const data = await res.json();

  console.log("Presign response:", data);

  // 3. Handle different backend response shapes (FIXED)
  const url = data.url || data.presignedUrl;
  const path = data.path;
  const publicUrl = data.publicUrl;

  if (!url) {
    console.error("Invalid presign response:", data);
    throw new Error("Presigned URL missing from response");
  }

  // 4. Upload to R2 (FIXED)
  await uploadToR2(url, file);

  // 5. Progress callback
  if (onProgress) onProgress(100);

  return {
    publicUrl: publicUrl ?? path,
    key: path,
    path,
  };
}

// ── Storage helpers (unchanged) ───────────────────────────────────────────────

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

  const plan = (data.plans as any);
  const used = data.storage_used ?? 0;
  const limit = plan?.storage_limit ?? 104857600;

  return {
    used,
    limit,
    planId: data.plan_id,
    planName: plan?.name ?? "Free",
    pct: Math.min(100, Math.round((used / limit) * 100)),
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}