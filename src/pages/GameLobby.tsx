import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useGameMembers, type GameMember } from "../hooks/useGameMembers";
import { useAuthStore } from "../store/AuthStore";
import CharacterSheet from "../components/sheets/CharacterSheet";
import { useCharacterSheet } from "../hooks/useCharacterSheet";

interface Game {
  id: string;
  name: string;
  created_at: string;
  owner_id: string;
  invite_code: string;
  icon_url: string | null;
}

interface Scene {
  id: string;
  name: string;
  active: boolean;
  map_url: string | null;
  map_mime_type: string | null;
  created_at: string;
  grid_type: string;
  grid_size: number;
}

interface SheetEntry {
  id: string;
  user_id: string;
  displayName: string;
  avatarUrl: string | null;
  characterName: string;
  systemName: string;
  systemSlug: string;
}

const ACCENTS = [
  "#7c3aed",
  "#b45309",
  "#065f46",
  "#1e40af",
  "#9d174d",
  "#374151",
];
function accentColor(name: string) {
  return ACCENTS[name.charCodeAt(0) % ACCENTS.length];
}

// ── SceneCard ─────────────────────────────────────────────────────────────────

function SceneCard({ scene }: { scene: Scene }) {
  const mime = (scene as any).map_mime_type as string | undefined;
  const isVideo = mime ? mime.startsWith("video/") : false;
  const isGif = mime === "image/gif";
  const isAnimated = isVideo || isGif || !!(scene as any).map_is_animated;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-white/5 border border-white/8 flex items-center justify-center relative">
        {!scene.map_url ? (
          <span className="text-stone-600 text-lg">🗺</span>
        ) : isVideo ? (
          <video
            src={scene.map_url}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          />
        ) : (
          <img
            src={scene.map_url}
            alt=""
            className="w-full h-full object-cover"
          />
        )}
        {isAnimated && scene.map_url && (
          <span className="absolute bottom-0.5 right-0.5 text-[8px] font-bold bg-amber-500/80 text-white px-0.5 rounded leading-tight">
            {isVideo ? "VID" : "GIF"}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-white/80 font-medium text-sm truncate">
            {scene.name}
          </p>
          {scene.active && (
            <span className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Active
            </span>
          )}
        </div>
        <p className="text-stone-500 text-xs capitalize">
          {scene.grid_type} · {scene.grid_size}px
        </p>
      </div>
    </div>
  );
}

// ── StatBox ───────────────────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-center">
      <p className="text-white font-bold text-xl mb-0.5">{value}</p>
      <p className="text-stone-600 text-xs uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ── MemberRow ─────────────────────────────────────────────────────────────────

function MemberRow({
  member,
  isOwner,
  currentUserId,
  ownerId,
  onKick,
}: {
  member: GameMember;
  isOwner: boolean;
  currentUserId: string;
  ownerId: string;
  onKick: (id: string) => void;
}) {
  const { display_name, username, avatar_url } = member.profile;
  const displayName = display_name || username || "Unknown player";
  const isGM = member.user_id === ownerId;
  const isYou = member.user_id === currentUserId;

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-amber-600/20 border border-amber-500/20 flex items-center justify-center">
        {avatar_url ? (
          <img src={avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-amber-400 text-sm font-bold">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-white/80 text-sm font-medium truncate">
            {displayName}
          </span>
          {isYou && (
            <span className="text-[10px] text-stone-500 bg-white/5 border border-white/8 px-1.5 py-0.5 rounded">
              You
            </span>
          )}
          {isGM && (
            <span className="text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 rounded font-semibold">
              GM
            </span>
          )}
        </div>
        {username && <p className="text-stone-600 text-xs">@{username}</p>}
      </div>
      {isOwner && !isGM && !isYou && (
        <button
          onClick={() => {
            if (window.confirm(`Remove ${displayName}?`)) onKick(member.id);
          }}
          className="text-xs text-stone-600 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
        >
          ✕
        </button>
      )}
    </div>
  );
}

// ── InvitePanel ───────────────────────────────────────────────────────────────

function InvitePanel({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}/invite/${inviteCode}`;
  return (
    <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
      <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
        🔗 Invite Players
      </p>
      <p className="text-stone-400 text-xs mb-3">
        Anyone with this link can join as a player.
      </p>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-xs font-mono text-stone-400 truncate select-all">
          {inviteUrl}
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
            copied
              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
              : "bg-amber-600 hover:bg-amber-500 text-white"
          }`}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <p className="text-amber-600/60 text-[10px] mt-2 font-mono">
        Code: {inviteCode}
      </p>
    </div>
  );
}

// ── SheetCard ─────────────────────────────────────────────────────────────────

interface SheetEntry {
  id: string;
  user_id: string;
  displayName: string;
  avatarUrl: string | null;
  characterName: string;
  systemName: string;
}

function SheetCard({
  sheet,
  isOwn,
  isGM,
  onOpen,
}: {
  sheet: SheetEntry;
  isOwn: boolean;
  isGM: boolean;
  onOpen: () => void;
}) {
  const canEdit = isGM || isOwn;
  return (
    <button
      onClick={onOpen}
      className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-500/20 transition-all text-left"
    >
      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-amber-600/20 border border-amber-500/20 flex items-center justify-center">
        {sheet.avatarUrl ? (
          <img
            src={sheet.avatarUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-amber-400 text-sm font-bold">
            {sheet.displayName.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-white/85 text-sm font-medium truncate">
            {sheet.characterName || "Unnamed Character"}
          </span>
          {isOwn && (
            <span className="text-[10px] text-sky-400/70 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded">
              You
            </span>
          )}
        </div>
        <p className="text-stone-500 text-xs">
          {sheet.displayName} · {sheet.systemName}
        </p>
      </div>

      <span
        className={`text-[10px] flex-shrink-0 transition-colors ${canEdit ? "text-amber-400/50 group-hover:text-amber-400" : "text-white/20 group-hover:text-white/50"}`}
      >
        {canEdit ? "Edit →" : "View →"}
      </span>
    </button>
  );
}

export function CharacterSheetsPanel({
  gameId,
  currentUserId,
  isGM,
  ownerId, // game owner — exclude from sheets list
  members,
}: {
  gameId: string;
  currentUserId: string;
  isGM: boolean;
  ownerId: string;
  members: GameMember[];
}) {
  const [sheets, setSheets] = useState<SheetEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const { openSheet, openSheetById, closeSheet } = useCharacterSheet(
    currentUserId,
    isGM,
  );

  // Build userId → profile map
  const memberMap = Object.fromEntries(
    members.map((m) => [
      m.user_id,
      {
        displayName: m.profile.display_name || m.profile.username || "Player",
        avatarUrl: m.profile.avatar_url ?? null,
      },
    ]),
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("character_sheets")
      .select(
        "id, user_id, data, systems:systems!character_sheets_system_id_fkey(name, slug)",
      )
      .eq("game_id", gameId)
      .order("created_at", { ascending: true });

    if (!data) {
      setLoading(false);
      return;
    }

    const entries: SheetEntry[] = data
      .filter((row: any) => row.user_id !== ownerId)
      .map((row: any) => {
        const sys = Array.isArray(row.systems) ? row.systems[0] : row.systems;
        const member = memberMap[row.user_id];
        return {
          id: row.id,
          user_id: row.user_id,
          displayName: member?.displayName ?? "Unknown player",
          avatarUrl: member?.avatarUrl ?? null,
          characterName: row.data?.characterName || row.data?.name || "",
          systemName: sys?.name ?? "Unknown system",
          systemSlug: sys.slug,
        };
      });

    setSheets(entries);
    setLoading(false);
  }, [gameId, ownerId, members]);

  useEffect(() => {
    if (members.length > 0) load();
  }, [load, members.length]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm py-4">
        <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <>
      <p className="text-[10px] text-white/25 mb-3">
        {isGM
          ? "Click any sheet to view or edit it."
          : "Click your sheet to edit it, or view other players' sheets."}
      </p>

      <div className="flex flex-col gap-2">
        {sheets.length === 0 ? (
          <div className="flex items-center justify-center h-24 border border-dashed border-white/8 rounded-xl">
            <span className="text-stone-600 text-xs text-center px-4">
              No sheets yet — players create them when they first open the game
            </span>
          </div>
        ) : (
          sheets.map((sheet) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              isOwn={sheet.user_id === currentUserId}
              isGM={isGM}
              onOpen={() => openSheetById(sheet.id, gameId, sheet.user_id)}
            />
          ))
        )}
      </div>

      {openSheet && (
        <CharacterSheet
          key={openSheet.sheetId}
          sheetId={openSheet.sheetId}
          tokenId={null}
          gameId={gameId}
          userId={openSheet.userId}
          isGM={isGM}
          canEdit={openSheet.canEdit}
          onClose={closeSheet}
        />
      )}
    </>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GameLobby() {
  const { gameId } = useParams();
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);

  const [game, setGame] = useState<Game | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);

  const {
    members,
    loading: membersLoading,
    kickMember,
  } = useGameMembers(gameId ?? null);

  useEffect(() => {
    if (!gameId) return;
    const init = async () => {
      const [{ data: gameData }, { data: sceneData }] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).single(),
        supabase
          .from("scenes")
          .select(
            "id, name, active, map_url, map_mime_type, created_at, grid_type, grid_size",
          )
          .eq("game_id", gameId)
          .order("created_at", { ascending: true }),
      ]);
      setGame(gameData);
      setScenes(sceneData ?? []);
      setIsOwner(!!user && gameData?.owner_id === user.id);
      setLoading(false);
    };
    init();
  }, [gameId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex items-center gap-3 text-stone-500">
          <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          Loading campaign…
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-stone-500">
        Campaign not found.
      </div>
    );
  }

  const activeScene = scenes.find((s) => s.active);
  const createdDate = new Date(game.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const initials = game.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const accent = accentColor(game.name);
  const playerCount = members.filter((m) => m.user_id !== game.owner_id).length;
  const currentUserId = user?.id ?? "";

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      {/* Subtle grid background */}
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
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="text-stone-500 hover:text-white text-sm transition-colors"
            >
              ← Campaigns
            </button>
            <span className="text-white/10">/</span>
            <span className="text-white/60 text-sm truncate max-w-40">
              {game.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚔</span>
            <span className="text-white font-bold text-sm hidden sm:block">
              TableMaster
            </span>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        {/* ── Campaign header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div
              className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg"
              style={{ boxShadow: `0 0 24px ${accent}40` }}
            >
              {game.icon_url ? (
                <img
                  src={game.icon_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `${accent}22`,
                    border: `1px solid ${accent}40`,
                  }}
                >
                  <span className="font-bold text-lg" style={{ color: accent }}>
                    {initials}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white leading-tight mb-1">
                {game.name}
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                {activeScene ? (
                  <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active: {activeScene.name}
                  </span>
                ) : (
                  <span className="text-stone-600 text-xs">
                    No active scene
                  </span>
                )}
                {isOwner && (
                  <>
                    <span className="text-white/15 text-xs">·</span>
                    <span className="text-amber-400 text-xs font-semibold">
                      Game Master
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate(`/game/${gameId}/play`)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-xl shadow-amber-900/40 hover:shadow-amber-900/60 hover:-translate-y-0.5 whitespace-nowrap"
          >
            ⚔ Enter Game
          </button>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          <StatBox label="Scenes" value={String(scenes.length)} />
          <StatBox label="Players" value={String(playerCount)} />
          <StatBox label="Created" value={createdDate} />
          <StatBox label="Status" value={activeScene ? "Active" : "Idle"} />
        </div>

        {/* ── Three-column grid: Players | Scenes | Sheets ───────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Members */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest">
                Players
              </h2>
              <div className="flex-1 h-px bg-white/6" />
              <span className="text-xs text-stone-600">
                {members.length} total
              </span>
            </div>

            {isOwner && game.invite_code && (
              <div className="mb-4">
                <InvitePanel inviteCode={game.invite_code} />
              </div>
            )}

            {membersLoading ? (
              <div className="flex items-center gap-2 text-stone-500 text-sm py-4">
                <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                Loading members…
              </div>
            ) : members.length === 0 ? (
              <div className="flex items-center justify-center h-24 border border-dashed border-white/8 rounded-xl">
                <span className="text-stone-600 text-xs">
                  No members yet — share the invite link above
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((member) => (
                  <MemberRow
                    key={member.id}
                    member={member}
                    isOwner={isOwner}
                    currentUserId={currentUserId}
                    ownerId={game.owner_id}
                    onKick={kickMember}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Character Sheets */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest">
                Character Sheets
              </h2>
              <div className="flex-1 h-px bg-white/6" />
            </div>

            {membersLoading ? (
              <div className="flex items-center gap-2 text-stone-500 text-sm py-4">
                <div className="w-4 h-4 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
                Loading…
              </div>
            ) : (
              <CharacterSheetsPanel
                gameId={gameId!}
                currentUserId={currentUserId}
                isGM={isOwner}
                members={members}
                ownerId={""}
              />
            )}
          </div>

          {/* Scenes */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-white/80 font-semibold text-sm uppercase tracking-widest">
                Scenes
              </h2>
              <div className="flex-1 h-px bg-white/6" />
              {isOwner && (
                <button
                  onClick={() => navigate(`/game/${gameId}/play`)}
                  className="text-xs text-stone-600 hover:text-amber-400 transition-colors"
                >
                  Manage →
                </button>
              )}
            </div>

            {scenes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-36 gap-3 border border-dashed border-white/8 rounded-xl text-center">
                <span className="text-3xl opacity-20">🗺</span>
                <div>
                  <p className="text-white/40 text-sm font-medium">
                    No scenes yet
                  </p>
                  <p className="text-stone-600 text-xs mt-0.5">
                    Enter the game to create your first scene.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                {scenes.map((scene) => (
                  <SceneCard key={scene.id} scene={scene} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Getting started */}
        {scenes.length === 0 && isOwner && (
          <div className="mt-10 p-6 rounded-2xl border border-amber-500/15 bg-amber-500/5">
            <h3 className="text-amber-400 font-semibold mb-3 text-sm uppercase tracking-wider">
              Getting started
            </h3>
            <ol className="text-stone-400 text-sm space-y-2 list-decimal list-inside">
              <li>
                Click <strong className="text-white/70">Enter Game</strong> to
                open the tabletop
              </li>
              <li>Open the GM Tools panel (⚙ button on the toolbar)</li>
              <li>Create a scene and upload a map image</li>
              <li>Share the invite link above with your players</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
