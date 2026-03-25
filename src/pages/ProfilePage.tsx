import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { uploadFile, StorageQuotaError } from "../services/r2Storage";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function Avatar({
  url,
  initials,
  size = "lg",
}: {
  url: string | null;
  initials: string;
  size?: "sm" | "lg";
}) {
  const dim = size === "lg" ? "w-24 h-24" : "w-8 h-8";
  const text = size === "lg" ? "text-3xl" : "text-sm";
  return url ? (
    <img
      src={url}
      alt="Avatar"
      className={`${dim} rounded-full object-cover ring-2 ring-white/10 shadow-xl`}
    />
  ) : (
    <div
      className={`${dim} rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center`}
    >
      <span className={`${text} font-bold text-amber-400`}>{initials}</span>
    </div>
  );
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, created_at")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name ?? "");
        setAvatarPreview(data.avatar_url);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    e.target.value = "";
    setUploading(true);
    setError("");
    setSuccess("");
    setAvatarPreview(URL.createObjectURL(file));

    const ext = file.name.split(".").pop() ?? "jpg";
    let publicUrl: string;
    try {
      // Avatars use a special "avatars" game context
      const result = await uploadFile(file, "avatars");
      publicUrl = result.publicUrl;
    } catch (uploadErr: any) {
      if (uploadErr instanceof StorageQuotaError) {
        setError(
          `Upload failed: ${uploadErr.message} (Plan: ${uploadErr.detail.plan})`,
        );
      } else {
        setError("Upload failed: " + uploadErr.message);
      }
      setAvatarPreview(profile.avatar_url);
      setUploading(false);
      return;
    }

    const { error: updateErr, data: updateData } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", profile.id)
      .select("avatar_url")
      .single();

    if (updateErr) {
      setError("Saved photo but failed to update profile.");
      setUploading(false);
      return;
    }
    const confirmed = updateData?.avatar_url ?? publicUrl;
    setProfile((p) => (p ? { ...p, avatar_url: confirmed } : p));
    setAvatarPreview(confirmed);
    setSuccess("Avatar updated.");
    setTimeout(() => setSuccess(""), 3000);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    setError("");
    setSuccess("");
    setSaving(true);
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null })
      .eq("id", profile.id);
    if (updateErr) {
      setError(updateErr.message);
    } else {
      setProfile((p) =>
        p ? { ...p, display_name: displayName.trim() || null } : p,
      );
      setSuccess("Saved.");
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!profile) return null;

  const initials = (profile.display_name || profile.username || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 border-b border-white/6 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-stone-500 hover:text-white text-sm transition-colors"
          >
            ← Campaigns
          </button>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚔</span>
            <span className="text-white font-bold text-sm hidden sm:block">
              TableMaster
            </span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">
        {/* Profile hero card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden mb-6">
          {/* Amber banner */}
          <div
            className="h-20 relative"
            style={{
              background:
                "linear-gradient(135deg, #0a0a0f 0%, #1c0f00 50%, #0a0a0f 100%)",
            }}
          >
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse at 30% 50%, #b45309 0%, transparent 60%)",
              }}
            />
          </div>
          <div className="px-8 pb-6">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div
                className="relative group cursor-pointer flex-shrink-0"
                onClick={() => fileRef.current?.click()}
              >
                <Avatar url={avatarPreview} initials={initials} size="lg" />
                <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span className="text-white text-xs font-semibold">
                      Change
                    </span>
                  )}
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <div className="pb-1">
                <h1 className="text-white font-bold text-xl">
                  {profile.display_name || profile.username || "Your Profile"}
                </h1>
                {profile.username && (
                  <p className="text-stone-500 text-sm">@{profile.username}</p>
                )}
                <p className="text-stone-600 text-xs mt-0.5">
                  Member since {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Edit card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-8">
          <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest mb-6 pb-4 border-b border-white/6">
            Edit Profile
          </h2>

          <div className="flex flex-col gap-6">
            {/* Display name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="How others see you in game"
                className="w-full bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
              />
              <p className="text-stone-600 text-xs">
                Shown on tokens, lobbies and the player list.
              </p>
            </div>

            {/* Username — read only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Username
              </label>
              <div className="flex items-center">
                <span className="px-3 py-3 bg-white/[0.03] border border-r-0 border-white/8 rounded-l-xl text-stone-600 text-sm select-none">
                  @
                </span>
                <div className="flex-1 bg-white/[0.03] border border-white/8 rounded-r-xl px-4 py-3 text-sm text-stone-500">
                  {profile.username ?? "—"}
                </div>
              </div>
              <p className="text-stone-600 text-xs">
                Usernames are permanent and cannot be changed.
              </p>
            </div>

            {/* Avatar row */}
            <div className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.02]">
              <Avatar url={avatarPreview} initials={initials} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-white/70 text-sm font-medium">
                  Profile photo
                </p>
                <p className="text-stone-500 text-xs">
                  Click your avatar above to upload a new image.
                </p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload"}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
            {success && (
              <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                ✓ {success}
              </p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="self-start px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
