import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GameSession {
  id: string;
  game_id: string;
  title: string;
  description: string | null;
  scheduled_at: string; // ISO string
  duration_minutes: number;
  created_by: string;
  game_name?: string;
  is_owner?: boolean;
}

interface Game {
  id: string;
  name: string;
  owner_id: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function isoToLocal(iso: string) {
  // Convert stored UTC ISO string to local datetime-local input value
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface SessionModalProps {
  games: Game[];
  existing?: GameSession | null;
  defaultDate?: Date | null;
  onSave: (data: {
    game_id: string;
    title: string;
    description: string;
    scheduled_at: string;
    duration_minutes: number;
  }) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}

function SessionModal({
  games,
  existing,
  defaultDate,
  onSave,
  onDelete,
  onClose,
}: SessionModalProps) {
  const defaultDt = defaultDate
    ? (() => {
        const d = new Date(defaultDate);
        d.setHours(19, 0, 0, 0);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T19:00`;
      })()
    : "";

  const [gameId, setGameId] = useState(existing?.game_id ?? games[0]?.id ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [scheduledAt, setScheduledAt] = useState(
    existing ? isoToLocal(existing.scheduled_at) : defaultDt,
  );
  const [duration, setDuration] = useState(existing?.duration_minutes ?? 180);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    if (!gameId || !title.trim() || !scheduledAt) return;
    setSaving(true);
    await onSave({
      game_id: gameId,
      title: title.trim(),
      description: description.trim(),
      scheduled_at: new Date(scheduledAt).toISOString(),
      duration_minutes: duration,
    });
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm("Delete this session?")) return;
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  const DURATION_PRESETS = [60, 120, 180, 240, 300];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f1c]/98 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <p className="text-white/90 text-sm font-semibold">
            {existing ? "Edit Session" : "Schedule Session"}
          </p>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Campaign */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Campaign
            </label>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id} className="bg-[#0f0f1c]">
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Session Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Into the Underdark"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>

          {/* Date & Time */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Date & Time
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/50 transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Duration
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {DURATION_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setDuration(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    duration === p
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/8"
                  }`}
                >
                  {formatDuration(p)}
                </button>
              ))}
              <input
                type="number"
                min={15}
                max={600}
                step={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-amber-500/50 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-white/30 text-xs self-center">min</span>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-white/40 uppercase tracking-widest font-medium">
              Notes{" "}
              <span className="normal-case text-white/20">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's planned for this session?"
              rows={3}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-amber-500/50 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          {existing && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-2.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !gameId || !title.trim() || !scheduledAt}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : existing ? "Update" : "Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Session pill ──────────────────────────────────────────────────────────────

const SESSION_COLORS = [
  {
    bg: "bg-amber-500/20",
    border: "border-amber-500/30",
    text: "text-amber-300",
    dot: "bg-amber-400",
  },
  {
    bg: "bg-violet-500/20",
    border: "border-violet-500/30",
    text: "text-violet-300",
    dot: "bg-violet-400",
  },
  {
    bg: "bg-sky-500/20",
    border: "border-sky-500/30",
    text: "text-sky-300",
    dot: "bg-sky-400",
  },
  {
    bg: "bg-emerald-500/20",
    border: "border-emerald-500/30",
    text: "text-emerald-300",
    dot: "bg-emerald-400",
  },
  {
    bg: "bg-rose-500/20",
    border: "border-rose-500/30",
    text: "text-rose-300",
    dot: "bg-rose-400",
  },
];

function gameColor(gameId: string) {
  let hash = 0;
  for (let i = 0; i < gameId.length; i++)
    hash = gameId.charCodeAt(i) + ((hash << 5) - hash);
  return SESSION_COLORS[Math.abs(hash) % SESSION_COLORS.length];
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [ownedGameIds, setOwnedGameIds] = useState<Set<string>>(new Set());
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GameSession | null>(
    null,
  );

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }

      const [{ data: profile }, { data: ownedGames }, { data: memberRows }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("display_name, username, avatar_url")
            .eq("id", user.id)
            .single(),
          supabase
            .from("games")
            .select("id, name, owner_id")
            .eq("owner_id", user.id),
          supabase
            .from("game_members")
            .select("game_id, games(id, name, owner_id)")
            .eq("user_id", user.id),
        ]);

      if (profile) {
        setUserName(profile.display_name || profile.username || "");
        setAvatarUrl(profile.avatar_url ?? null);
      }

      const owned: Game[] = (ownedGames ?? []).map((g) => ({
        id: g.id,
        name: g.name,
        owner_id: g.owner_id,
      }));
      const joined: Game[] = (memberRows ?? [])
        .map((r: any) => r.games)
        .filter(Boolean)
        .filter((g: any) => !owned.find((o) => o.id === g.id))
        .map((g: any) => ({ id: g.id, name: g.name, owner_id: g.owner_id }));

      const allGames = [...owned, ...joined];
      setGames(allGames);
      setOwnedGameIds(new Set(owned.map((g) => g.id)));

      await loadSessions(allGames, user.id);
      setLoading(false);
    };
    init();
  }, []);

  const loadSessions = useCallback(async (allGames: Game[], uid: string) => {
    if (allGames.length === 0) {
      setSessions([]);
      return;
    }
    const gameIds = allGames.map((g) => g.id);
    const { data } = await supabase
      .from("game_sessions")
      .select("*")
      .in("game_id", gameIds)
      .order("scheduled_at", { ascending: true });

    const nameMap = Object.fromEntries(allGames.map((g) => [g.id, g.name]));
    const ownedSet = new Set(
      allGames.filter((g) => g.owner_id === uid).map((g) => g.id),
    );

    setSessions(
      (data ?? []).map((s: any) => ({
        ...s,
        game_name: nameMap[s.game_id] ?? "Unknown",
        is_owner: ownedSet.has(s.game_id),
      })),
    );
  }, []);

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const numDays = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);

  const sessionsByDay = new Map<string, GameSession[]>();
  for (const s of sessions) {
    const d = new Date(s.scheduled_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!sessionsByDay.has(key)) sessionsByDay.set(key, []);
    sessionsByDay.get(key)!.push(s);
  }

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };

  // ── Selected day sessions ─────────────────────────────────────────────────
  const selectedDaySessions = selectedDay
    ? sessions.filter((s) => sameDay(new Date(s.scheduled_at), selectedDay))
    : [];

  // ── Upcoming (next 30 days from today) ───────────────────────────────────
  const upcoming = sessions
    .filter((s) => {
      const d = new Date(s.scheduled_at);
      const diff = d.getTime() - today.getTime();
      return diff >= 0 && diff <= 30 * 86400000;
    })
    .slice(0, 8);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleSave = async (data: {
    game_id: string;
    title: string;
    description: string;
    scheduled_at: string;
    duration_minutes: number;
  }) => {
    if (editingSession) {
      const { data: updated } = await supabase
        .from("game_sessions")
        .update(data)
        .eq("id", editingSession.id)
        .select()
        .single();
      if (updated) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === editingSession.id
              ? {
                  ...s,
                  ...updated,
                  game_name: games.find((g) => g.id === updated.game_id)?.name,
                  is_owner: s.is_owner,
                }
              : s,
          ),
        );
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: created } = await supabase
        .from("game_sessions")
        .insert({ ...data, created_by: user?.id })
        .select()
        .single();
      if (created) {
        const gameName = games.find((g) => g.id === created.game_id)?.name;
        setSessions((prev) =>
          [...prev, { ...created, game_name: gameName, is_owner: true }].sort(
            (a, b) =>
              new Date(a.scheduled_at).getTime() -
              new Date(b.scheduled_at).getTime(),
          ),
        );
      }
    }
    setModalOpen(false);
    setEditingSession(null);
  };

  const handleDelete = async () => {
    if (!editingSession) return;
    await supabase.from("game_sessions").delete().eq("id", editingSession.id);
    setSessions((prev) => prev.filter((s) => s.id !== editingSession.id));
    setModalOpen(false);
    setEditingSession(null);
  };

  const openNew = (day?: Date) => {
    setEditingSession(null);
    setSelectedDay(day ?? null);
    setModalOpen(true);
  };

  const openEdit = (session: GameSession) => {
    if (!session.is_owner) return;
    setEditingSession(session);
    setModalOpen(true);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/home");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-500">
          <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          Loading calendar…
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* Subtle grid bg */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Nav */}
      <nav className="relative z-50 border-b border-white/6 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0">
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
              onClick={() => navigate("/calendar")}
              className="ml-2 text-amber-400 text-sm font-semibold transition-colors"
            >
              Calendar
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

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">
              Session Calendar
            </h1>
            <p className="text-stone-500 text-sm">
              Schedule and track your tabletop sessions.
            </p>
          </div>
          {ownedGameIds.size > 0 && (
            <button
              onClick={() => openNew()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 hover:-translate-y-0.5"
            >
              + Schedule Session
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
          {/* ── Calendar ─────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Month nav */}
            <div className="flex items-center justify-between px-1">
              <button
                onClick={prevMonth}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white transition-all flex items-center justify-center text-sm"
              >
                ‹
              </button>
              <h2 className="text-white font-bold text-lg">
                {MONTHS[viewMonth]} {viewYear}
              </h2>
              <button
                onClick={nextMonth}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 text-white/50 hover:text-white transition-all flex items-center justify-center text-sm"
              >
                ›
              </button>
            </div>

            {/* Grid */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-white/6">
                {DAYS.map((d) => (
                  <div
                    key={d}
                    className="py-2.5 text-center text-[10px] font-semibold uppercase tracking-widest text-white/25"
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {/* Empty cells before month starts */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="h-24 border-b border-r border-white/4"
                  />
                ))}

                {/* Day cells */}
                {Array.from({ length: numDays }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(viewYear, viewMonth, day);
                  const isToday = sameDay(date, today);
                  const isSelected = selectedDay
                    ? sameDay(date, selectedDay)
                    : false;
                  const key = `${viewYear}-${viewMonth}-${day}`;
                  const daySessions = sessionsByDay.get(key) ?? [];
                  const col = (firstDay + i) % 7;
                  const isLastCol = col === 6;
                  const isPast = date < today && !isToday;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDay(isSelected ? null : date)}
                      className={`relative h-24 p-1.5 border-b border-r border-white/4 cursor-pointer transition-colors group
                        ${isLastCol ? "border-r-0" : ""}
                        ${isSelected ? "bg-amber-500/8" : isToday ? "bg-white/3" : "hover:bg-white/[0.02]"}
                      `}
                    >
                      {/* Day number */}
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mb-1
                        ${isToday ? "bg-amber-500 text-white" : isSelected ? "bg-amber-500/30 text-amber-300" : isPast ? "text-white/20" : "text-white/60 group-hover:text-white/80"}`}
                      >
                        {day}
                      </div>

                      {/* Session pills */}
                      <div className="flex flex-col gap-0.5 overflow-hidden">
                        {daySessions.slice(0, 2).map((s) => {
                          const c = gameColor(s.game_id);
                          return (
                            <div
                              key={s.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openEdit(s);
                              }}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium truncate border
                                ${c.bg} ${c.border} ${c.text}
                                ${s.is_owner ? "cursor-pointer hover:brightness-110" : "cursor-default"}
                              `}
                            >
                              <span
                                className={`w-1 h-1 rounded-full flex-shrink-0 ${c.dot}`}
                              />
                              <span className="truncate">{s.title}</span>
                            </div>
                          );
                        })}
                        {daySessions.length > 2 && (
                          <p className="text-[9px] text-white/25 px-1">
                            +{daySessions.length - 2} more
                          </p>
                        )}
                      </div>

                      {/* Quick add button for GM */}
                      {ownedGameIds.size > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openNew(date);
                          }}
                          className="absolute bottom-1 right-1 w-4 h-4 rounded bg-white/0 hover:bg-amber-500/20 text-white/0 hover:text-amber-400 flex items-center justify-center text-xs transition-all group-hover:opacity-100 opacity-0"
                          title="Schedule session"
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected day detail */}
            {selectedDay && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white/80 text-sm font-semibold">
                    {selectedDay.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </h3>
                  {ownedGameIds.size > 0 && (
                    <button
                      onClick={() => openNew(selectedDay)}
                      className="text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400 font-semibold transition-all"
                    >
                      + Add
                    </button>
                  )}
                </div>
                {selectedDaySessions.length === 0 ? (
                  <p className="text-white/25 text-xs text-center py-4">
                    No sessions scheduled for this day.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selectedDaySessions.map((s) => (
                      <SessionCard key={s.id} session={s} onEdit={openEdit} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Upcoming */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/70 mb-3">
                Upcoming (30 days)
              </p>
              {upcoming.length === 0 ? (
                <p className="text-white/25 text-xs text-center py-6">
                  No sessions in the next 30 days.
                  {ownedGameIds.size > 0 && (
                    <button
                      onClick={() => openNew()}
                      className="block mx-auto mt-2 text-amber-400/60 hover:text-amber-400 transition-colors underline underline-offset-2"
                    >
                      Schedule one →
                    </button>
                  )}
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcoming.map((s) => {
                    const d = new Date(s.scheduled_at);
                    const c = gameColor(s.game_id);
                    return (
                      <div
                        key={s.id}
                        onClick={() => s.is_owner && openEdit(s)}
                        className={`flex gap-3 p-2.5 rounded-xl border bg-white/[0.02] border-white/6 hover:border-white/12 transition-colors ${s.is_owner ? "cursor-pointer" : ""}`}
                      >
                        {/* Date badge */}
                        <div className="flex flex-col items-center w-9 flex-shrink-0">
                          <span className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">
                            {d.toLocaleDateString("en-US", { month: "short" })}
                          </span>
                          <span className="text-lg font-bold text-white/80 leading-tight tabular-nums">
                            {d.getDate()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`}
                            />
                            <p className="text-white/80 text-xs font-semibold truncate">
                              {s.title}
                            </p>
                          </div>
                          <p className="text-white/30 text-[10px] truncate">
                            {s.game_name}
                          </p>
                          <p className="text-white/25 text-[10px]">
                            {formatTime(s.scheduled_at)} ·{" "}
                            {formatDuration(s.duration_minutes)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Campaign legend */}
            {games.length > 0 && (
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30 mb-3">
                  Campaigns
                </p>
                <div className="flex flex-col gap-1.5">
                  {games.map((g) => {
                    const c = gameColor(g.id);
                    return (
                      <div key={g.id} className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`}
                        />
                        <span className="text-xs text-white/50 truncate">
                          {g.name}
                        </span>
                        {ownedGameIds.has(g.id) && (
                          <span className="text-[9px] text-amber-400/50 ml-auto flex-shrink-0">
                            GM
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <SessionModal
          games={games.filter((g) => ownedGameIds.has(g.id))}
          existing={editingSession}
          defaultDate={selectedDay}
          onSave={handleSave}
          onDelete={editingSession ? handleDelete : undefined}
          onClose={() => {
            setModalOpen(false);
            setEditingSession(null);
          }}
        />
      )}
    </div>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onEdit,
}: {
  session: GameSession;
  onEdit: (s: GameSession) => void;
}) {
  const c = gameColor(session.game_id);
  return (
    <div
      onClick={() => session.is_owner && onEdit(session)}
      className={`flex gap-3 p-3 rounded-xl border transition-all
        ${c.bg} ${c.border}
        ${session.is_owner ? "cursor-pointer hover:brightness-110" : ""}
      `}
    >
      <div className={`flex flex-col gap-0.5 min-w-0 flex-1`}>
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
          <p className={`text-sm font-semibold ${c.text}`}>{session.title}</p>
        </div>
        <p className="text-white/40 text-xs ml-3.5">{session.game_name}</p>
        <p className="text-white/30 text-xs ml-3.5">
          {formatTime(session.scheduled_at)} ·{" "}
          {formatDuration(session.duration_minutes)}
        </p>
        {session.description && (
          <p className="text-white/30 text-xs ml-3.5 mt-0.5 line-clamp-2">
            {session.description}
          </p>
        )}
      </div>
      {session.is_owner && (
        <span className="text-white/20 text-xs self-start flex-shrink-0">
          Edit →
        </span>
      )}
    </div>
  );
}
