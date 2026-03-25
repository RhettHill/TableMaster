import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../services/supabase";

interface Member {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface PlayerPickerModalProps {
  gameId: string;
  onConfirm: (userId: string) => void;
  onCancel: () => void;
}

export default function PlayerPickerModal({
  gameId,
  onConfirm,
  onCancel,
}: PlayerPickerModalProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("game_members")
      .select("user_id, profiles(display_name, username, avatar_url)")
      .eq("game_id", gameId)
      .then(({ data }) => {
        setMembers(
          (data ?? []).map((row: any) => {
            const p = Array.isArray(row.profiles)
              ? row.profiles[0]
              : row.profiles;
            return {
              userId: row.user_id,
              displayName: p?.display_name || p?.username || "Unknown player",
              avatarUrl: p?.avatar_url ?? null,
            };
          }),
        );
        setLoading(false);
      });
  }, [gameId]);

  return createPortal(
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-72 rounded-2xl border border-white/10 bg-[#0f0f1c]/98 shadow-2xl overflow-hidden">
        <div className="px-5 pt-5 pb-3 border-b border-white/8">
          <p className="text-white/90 text-sm font-semibold">
            Open Player Sheet
          </p>
          <p className="text-white/35 text-xs mt-0.5">
            Which player does this token belong to?
          </p>
        </div>

        <div className="max-h-64 overflow-y-auto py-1">
          {loading ? (
            <p className="text-white/25 text-xs text-center py-6">
              Loading members…
            </p>
          ) : members.length === 0 ? (
            <p className="text-white/25 text-xs text-center py-6">
              No players in this game yet.
            </p>
          ) : (
            members.map((m) => (
              <button
                key={m.userId}
                onClick={() => onConfirm(m.userId)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-full bg-white/10 flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/10">
                  {m.avatarUrl ? (
                    <img
                      src={m.avatarUrl}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white/50 text-xs font-semibold">
                      {m.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-white/75 text-sm">{m.displayName}</span>
              </button>
            ))
          )}
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-white/8">
          <button
            onClick={onCancel}
            className="w-full py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
