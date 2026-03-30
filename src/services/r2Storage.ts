/**
 * r2Storage — uploads files directly to Cloudflare R2 using presigned URLs.
 * Includes a client-side storage pre-check so users get a clear error
 * before the upload even starts (the server also enforces this).
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

// ── Auth helper ───────────────────────────────────────────────────────────────

async function getJWT(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) return session.access_token;

  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session?.access_token) throw new Error("Not authenticated");
  return data.session.access_token;
}

// ── Pre-upload quota check ────────────────────────────────────────────────────
// Runs before the presign request so the user gets an instant clear error
// rather than a confusing server-side rejection mid-upload.

async function checkStorageQuota(fileSize: number): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("storage_used, plan_id, subscription_status, plans(name, storage_limit, max_file_size)")
    .eq("id", user.id)
    .single();

  if (!profile) return; // can't check, let the server decide

  const plan = profile.plans as any;
  if (!plan) return;

  const storageUsed: number = profile.storage_used ?? 0;
  const storageLimit: number = plan.storage_limit ?? Infinity;
  const maxFileSize: number = plan.max_file_size ?? Infinity;
  const planName: string = plan.name ?? "Free";

  // Check individual file size limit
  if (fileSize > maxFileSize) {
    throw new StorageQuotaError(
      `This file (${formatBytes(fileSize)}) exceeds the ${formatBytes(maxFileSize)} file size limit on the ${planName} plan.`,
      { plan: planName, max_file_size: maxFileSize }
    );
  }

  // Check total storage quota
  if (storageUsed + fileSize > storageLimit) {
    const remaining = Math.max(0, storageLimit - storageUsed);
    throw new StorageQuotaError(
      `Not enough storage. You have ${formatBytes(remaining)} remaining on the ${planName} plan.`,
      { plan: planName, storage_used: storageUsed, storage_limit: storageLimit }
    );
  }
}

// ── Upload to R2 (low-level) ──────────────────────────────────────────────────

export async function uploadToR2(presignedUrl: string, file: File): Promise<void> {
  const buffer = await file.arrayBuffer();
  const blob = new Blob([buffer]);

  const res = await fetch(presignedUrl, {
    method: "PUT",
    body: blob,
    // No Content-Type header — prevents CORS preflight that R2 rejects
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
  // 1. Client-side quota pre-check (fast, gives clear UX before any network call)
  await checkStorageQuota(file.size);

  // 2. Get JWT
  const token = await getJWT();

  // 3. Request presigned URL
  const res = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: file.name || crypto.randomUUID(),
        fileType: file.type || "application/octet-stream",
        fileSize: file.size,
        gameId,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("Presign failed:", text);

    if (text.toLowerCase().includes("quota") || text.toLowerCase().includes("limit")) {
      throw new StorageQuotaError("Storage quota exceeded", { plan: "unknown" });
    }

    throw new Error("Failed to get presigned URL");
  }

  const data = await res.json();
  const url = data.url || data.presignedUrl;
  const path = data.path;
  const publicUrl = data.publicUrl;

  if (!url) {
    console.error("Invalid presign response:", data);
    throw new Error("Presigned URL missing from response");
  }

  // 4. Upload to R2
  await uploadToR2(url, file);

  if (onProgress) onProgress(100);

  return {
    publicUrl: publicUrl ?? path,
    key: path,
    path,
  };
}

// ── Storage info helpers ──────────────────────────────────────────────────────

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