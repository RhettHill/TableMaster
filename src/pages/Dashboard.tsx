import { useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabase";
import { uploadFile, StorageQuotaError } from "../services/r2Storage";
import { useNavigate } from "react-router-dom";

interface Game {
  id: string;
  name: string;
  created_at: string;
  isOwner: boolean;
  icon_url?: string | null;
}

interface PlanLimits {
  planName: string;
  maxCampaigns: number;
  storageLimit: number;
  storageUsed: number;
  isPaid: boolean;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

function formatBytes(bytes: number) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + " GB";
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + " MB";
  if (bytes >= 1024) return (bytes / 1024).toFixed(1) + " KB";
  return bytes + " B";
}

const ACCENTS = [
  { color: "#7c3aed", dim: "#7c3aed22" },
  { color: "#b45309", dim: "#b4530922" },
  { color: "#065f46", dim: "#065f4622" },
  { color: "#1e40af", dim: "#1e40af22" },
  { color: "#9d174d", dim: "#9d174d22" },
  { color: "#4b5563", dim: "#4b556322" },
];
function accent(name: string) {
  return ACCENTS[name.charCodeAt(0) % ACCENTS.length];
}

// ── Storage bar ───────────────────────────────────────────────────────────────

function StorageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const isWarning = pct >= 80;
  const isFull = pct >= 100;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-medium">
          Storage
        </span>
        <span
          className={`text-[10px] tabular-nums font-mono ${
            isFull
              ? "text-red-400"
              : isWarning
                ? "text-amber-400"
                : "text-white/30"
          }`}
        >
          {formatBytes(used)} / {formatBytes(limit)}
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-white/8 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isFull
              ? "bg-red-500"
              : isWarning
                ? "bg-amber-500"
                : "bg-amber-600/60"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Campaign limit banner ─────────────────────────────────────────────────────

function LimitBanner({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <span className="text-amber-400 text-base flex-shrink-0">⚔</span>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <p className="text-white/70 text-sm font-semibold">
          Campaign limit reached
        </p>
        <p className="text-white/40 text-xs leading-snug">
          Free accounts can create up to 2 campaigns. Upgrade to create
          unlimited campaigns and unlock more storage.
        </p>
      </div>
      <button
        onClick={onUpgrade}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold
          bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30
          text-amber-400 transition-all whitespace-nowrap"
      >
        Upgrade →
      </button>
    </div>
  );
}

// ── Game card ─────────────────────────────────────────────────────────────────

function GameCard({
  game,
  onOpen,
  onDelete,
  onIconUpload,
}: {
  game: Game;
  onOpen: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onIconUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const { color, dim } = accent(game.name);
  const initials = game.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={onOpen}
      className="group relative rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col"
    >
      {/* ── Coloured header band with icon ── */}
      <div
        className="relative h-20 flex-shrink-0 flex items-end px-5 pb-3 gap-3"
        style={{
          background: `linear-gradient(135deg, ${dim} 0%, transparent 100%), #111118`,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: color }}
        />

        <div
          className="relative flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-white/10 shadow-lg"
          onClick={(e) => {
            if (!onIconUpload) return;
            e.stopPropagation();
            fileRef.current?.click();
          }}
          style={{ boxShadow: `0 4px 16px ${color}30` }}
        >
          {game.icon_url ? (
            <img
              src={game.icon_url}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-sm font-bold"
              style={{ background: dim, color }}
            >
              {initials}
            </div>
          )}
          {onIconUpload && (
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span className="text-white text-[11px] font-semibold">📷</span>
            </div>
          )}
        </div>
        {onIconUpload && (
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onIconUpload}
          />
        )}

        <div className="absolute top-3 right-3 flex items-center gap-2">
          {game.isOwner && onDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md bg-red-500/15 hover:bg-red-500/30 text-red-400/70 hover:text-red-400 flex items-center justify-center text-[10px] transition-all border border-red-500/15"
            >
              ✕
            </button>
          )}
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border backdrop-blur-sm ${
              game.isOwner
                ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                : "bg-sky-500/20 border-sky-500/40 text-sky-400"
            }`}
          >
            {game.isOwner ? "GM" : "Player"}
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col gap-2 px-5 py-4 flex-1">
        <h3
          className="text-white/90 font-bold text-base leading-snug line-clamp-2"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {game.name}
        </h3>
        <p className="text-stone-500 text-xs">
          {game.isOwner ? "Created" : "Joined"} {timeAgo(game.created_at)}
        </p>
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-3 border-t border-white/6 flex items-center justify-between">
        <span className="text-[11px] text-stone-600 group-hover:text-stone-400 transition-colors">
          Open campaign
        </span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color, opacity: 0.7 }}
          />
          <span className="text-stone-700 text-xs">→</span>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [games, setGames] = useState<Game[]>([]);
  const [newGameName, setNewGameName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const navigate = useNavigate();
  const [systems, setSystems] = useState<
    { id: string; name: string; slug: string }[]
  >([]);
  const [selectedSystemId, setSelectedSystemId] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/home");
        return;
      }

      const [
        { data: systemRows },
        { data: profile },
        { data: ownedGames },
        { data: memberRows },
      ] = await Promise.all([
        supabase.from("systems").select("id, name, slug").order("name"),
        supabase
          .from("profiles")
          .select(
            "display_name, username, avatar_url, storage_used, plan_id, subscription_status, plans(name, storage_limit, max_campaigns, price_monthly)",
          )
          .eq("id", user.id)
          .single(),
        supabase
          .from("games")
          .select("id, name, created_at, icon_url")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("game_members")
          .select("game_id, games(id, name, created_at, icon_url)")
          .eq("user_id", user.id),
      ]);

      setSystems(systemRows ?? []);
      if (systemRows && systemRows.length > 0)
        setSelectedSystemId(systemRows[0].id);

      if (profile) {
        setUserName(
          profile.display_name ||
            profile.username ||
            user.email?.split("@")[0] ||
            "",
        );
        setAvatarUrl(profile.avatar_url ?? null);

        const plan = profile.plans as any;
        if (plan) {
          setPlanLimits({
            planName: plan.name,
            maxCampaigns: plan.max_campaigns ?? 2,
            storageLimit: plan.storage_limit,
            storageUsed: profile.storage_used ?? 0,
            isPaid: (plan.price_monthly ?? 0) > 0,
          });
        }
      }

      const owned: Game[] = (ownedGames ?? []).map((g) => ({
        ...g,
        isOwner: true,
      }));
      const joined: Game[] = (memberRows ?? [])
        .map((row: any) => row.games)
        .filter(Boolean)
        .filter((g: any) => !owned.find((o) => o.id === g.id))
        .map((g: any) => ({ ...g, isOwner: false }));

      setGames([...owned, ...joined]);
      setLoading(false);
    };
    init();
  }, []);

  // How many campaigns this user owns (not joined as player)
  const ownedCount = games.filter((g) => g.isOwner).length;
  const atCampaignLimit =
    planLimits !== null &&
    !planLimits.isPaid &&
    ownedCount >= planLimits.maxCampaigns;

  const createGame = async () => {
    // Client-side guard — the DB trigger is the real enforcement
    if (atCampaignLimit) {
      setError(
        `Free accounts can only create ${planLimits!.maxCampaigns} campaigns. Upgrade to create more.`,
      );
      return;
    }

    const name = newGameName.trim();
    if (!name) {
      setError("Enter a campaign name first.");
      return;
    }

    setCreating(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error: err } = await supabase
      .from("games")
      .insert([
        { name, owner_id: user.id, system_id: selectedSystemId || null },
      ])
      .select("id, name, created_at, icon_url");

    if (err) {
      // Surface the trigger error message cleanly
      if (err.message?.includes("Campaign limit reached")) {
        setError(`You've reached your campaign limit. Upgrade to create more.`);
      } else {
        setError(err.message);
      }
      setCreating(false);
      return;
    }

    if (data) {
      const newGame = { ...data[0], isOwner: true };
      setGames((prev) => [newGame, ...prev]);
      setNewGameName("");
      // Update local owned count so the limit banner appears immediately
      navigate(`/game/${data[0].id}`);
    }
    setCreating(false);
  };

  const deleteGame = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this campaign?")) return;
    await supabase.from("games").delete().eq("id", id);
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const handleIconUpload = async (
    gameId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    let publicUrl: string;
    try {
      const result = await uploadFile(file, gameId);
      publicUrl = result.publicUrl;
    } catch (err: any) {
      if (err instanceof StorageQuotaError) {
        alert(`Upload failed: ${err.message} (Plan: ${err.detail.plan})`);
      } else {
        alert("Upload failed: " + err.message);
      }
      return;
    }
    await supabase
      .from("games")
      .update({ icon_url: publicUrl })
      .eq("id", gameId);
    setGames((prev) =>
      prev.map((g) => (g.id === gameId ? { ...g, icon_url: publicUrl } : g)),
    );
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/home");
  };

  const filtered = games.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

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
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => navigate("/")}
              className="text-white font-bold tracking-wide flex items-center gap-2.5"
            >
              <span className="text-amber-500">⚔</span>
              TableMaster
            </button>
            <button
              onClick={() => navigate("/plans")}
              className="ml-6 text-stone-400 hover:text-white text-sm transition-colors"
            >
              Plans
            </button>
          </div>

          <div className="flex items-center gap-3">
            {userName && (
              <button
                onClick={() => navigate("/profile")}
                className="flex items-center gap-2 text-stone-400 hover:text-white text-sm transition-colors group"
              >
                <span className="hidden sm:block group-hover:text-white">
                  {userName}
                </span>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold flex-shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
            )}
            <div className="w-px h-4 bg-white/10" />
            <button
              onClick={logout}
              className="text-stone-500 hover:text-white text-sm transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Hero */}
        <div className="py-12 border-b border-white/6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <p className="text-amber-500 text-xs font-semibold uppercase tracking-widest mb-2">
                Welcome back{userName ? `, ${userName}` : ""}
              </p>
              <h1 className="text-4xl font-bold text-white leading-tight mb-2">
                Your Campaigns
              </h1>
              <p className="text-stone-500 text-sm max-w-md">
                Manage your tabletop adventures or join a game your GM has
                invited you to.
              </p>

              {/* Plan info + storage bar */}
              {planLimits && (
                <div className="mt-5 flex flex-col gap-2 max-w-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 uppercase tracking-widest">
                      {planLimits.planName} plan
                    </span>
                    {!planLimits.isPaid && (
                      <button
                        onClick={() => navigate("/plans")}
                        className="text-[10px] text-amber-400/70 hover:text-amber-400 transition-colors underline underline-offset-2"
                      >
                        Upgrade
                      </button>
                    )}
                  </div>
                  <StorageBar
                    used={planLimits.storageUsed}
                    limit={planLimits.storageLimit}
                  />
                  {/* Campaign count for free users */}
                  {!planLimits.isPaid && (
                    <p
                      className={`text-[10px] ${atCampaignLimit ? "text-amber-400" : "text-white/25"}`}
                    >
                      {ownedCount} / {planLimits.maxCampaigns} campaigns used
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Create campaign panel */}
            <div className="flex flex-col gap-2 min-w-72">
              {/* Limit banner replaces the form when at limit */}
              {atCampaignLimit ? (
                <LimitBanner onUpgrade={() => navigate("/plans")} />
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Campaign name…"
                      value={newGameName}
                      onChange={(e) => {
                        setNewGameName(e.target.value);
                        setError("");
                      }}
                      onKeyDown={(e) => e.key === "Enter" && createGame()}
                      className="flex-1 bg-white/5 border border-white/10 focus:border-amber-500/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
                    />
                    <button
                      onClick={createGame}
                      disabled={creating}
                      className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50 whitespace-nowrap"
                    >
                      {creating ? "…" : "+ New"}
                    </button>
                  </div>

                  {systems.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500 text-xs">System:</span>
                      <div className="flex gap-1 flex-wrap">
                        {systems.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSelectedSystemId(s.id)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                              selectedSystemId === s.id
                                ? "bg-amber-500/20 border-amber-500/50 text-amber-400"
                                : "bg-white/5 border-white/10 text-stone-500 hover:text-white/70"
                            }`}
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {error && <p className="text-red-400 text-xs px-1">{error}</p>}
            </div>
          </div>
        </div>

        {/* Games grid */}
        <div className="py-8">
          {games.length > 0 && (
            <div className="flex items-center justify-between mb-6">
              <p className="text-stone-600 text-sm">
                {filtered.length} campaign{filtered.length !== 1 ? "s" : ""}
              </p>
              {games.length > 3 && (
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-white/5 border border-white/8 focus:border-amber-500/40 rounded-lg px-4 py-1.5 text-sm text-white placeholder-stone-600 focus:outline-none transition-colors w-44"
                />
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48 gap-3">
              <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <span className="text-stone-500 text-sm">Loading campaigns…</span>
            </div>
          ) : games.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4 text-center border border-dashed border-white/8 rounded-2xl">
              <span className="text-4xl opacity-20">📜</span>
              <div>
                <p className="text-white/50 font-medium mb-1">
                  No campaigns yet
                </p>
                <p className="text-stone-600 text-sm">
                  Create your first campaign above, or join one with an invite
                  link.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-stone-600 text-sm">
              No campaigns match "{search}"
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  onOpen={() => navigate(`/game/${game.id}`)}
                  onDelete={
                    game.isOwner ? (e) => deleteGame(e, game.id) : undefined
                  }
                  onIconUpload={
                    game.isOwner
                      ? (e) => handleIconUpload(game.id, e)
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
