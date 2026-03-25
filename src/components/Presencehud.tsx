import { PresenceUser } from "../hooks/useRealTimeGame";

interface PresenceHUDProps {
  users: PresenceUser[];
  currentUserId: string;
}

function UserBubble({
  user,
  isCurrent,
}: {
  user: PresenceUser;
  isCurrent: boolean;
}) {
  const initials = user.displayName.charAt(0).toUpperCase();

  return (
    <div className="relative group flex-shrink-0">
      {/* Avatar circle */}
      <div
        className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold border-2 shadow-md transition-transform group-hover:scale-110 ${
          user.isGM
            ? "border-amber-400 bg-amber-900 text-amber-300"
            : isCurrent
              ? "border-sky-400 bg-sky-900 text-sky-300"
              : "border-white/30 bg-stone-700 text-white/80"
        }`}
      >
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Online dot */}
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0d0d14] shadow" />

      {/* Tooltip */}
      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
        <div className="bg-black/90 border border-white/15 rounded-md px-2 py-1 text-xs text-white/80">
          {user.displayName}
          {user.isGM && (
            <span className="ml-1 text-amber-400 font-semibold">GM</span>
          )}
          {isCurrent && <span className="ml-1 text-white/40">(you)</span>}
        </div>
      </div>
    </div>
  );
}

export default function PresenceHUD({
  users,
  currentUserId,
}: PresenceHUDProps) {
  if (users.length === 0) return null;

  // Sort: GM first, then others, current user last
  const sorted = [...users].sort((a, b) => {
    if (a.isGM && !b.isGM) return -1;
    if (!a.isGM && b.isGM) return 1;
    if (a.userId === currentUserId) return 1;
    if (b.userId === currentUserId) return -1;
    return 0;
  });

  return (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 pointer-events-auto">
      {/* Connected label */}
      <span className="text-[10px] text-white/30 mr-1 hidden sm:block">
        {users.length} online
      </span>

      {/* Avatars — overlap slightly like a stack */}
      <div className="flex items-center">
        {sorted.map((user, i) => (
          <div
            key={user.userId}
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: sorted.length - i }}
            className="relative"
          >
            <UserBubble user={user} isCurrent={user.userId === currentUserId} />
          </div>
        ))}
      </div>
    </div>
  );
}
