import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { useGameMembers } from "../hooks/useGameMembers";

type Status =
  | "checking"
  | "joining"
  | "success"
  | "already_member"
  | "not_found"
  | "error"
  | "unauthenticated";

export default function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("checking");
  const [gameName, setGameName] = useState<string>("");
  const [gameId, setGameId] = useState<string>("");

  const { joinByCode } = useGameMembers(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const handle = async () => {
      if (!code) {
        setStatus("not_found");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("unauthenticated");
        return;
      }

      setStatus("joining");

      const result = await joinByCode(code);

      if (!result) {
        setStatus("not_found");
        return;
      }

      setGameName(result.gameName);
      setGameId(result.gameId);
      setStatus(result.alreadyMember ? "already_member" : "success");
      setTimeout(() => navigate(`/game/${result.gameId}`), 1800);
    };

    handle();
  }, [code]);

  const messages: Record<
    Status,
    { icon: string; title: string; body: string }
  > = {
    checking: { icon: "⏳", title: "Checking invite…", body: "Just a moment." },
    joining: {
      icon: "🔗",
      title: "Joining game…",
      body: `Connecting to ${gameName || "the game"}.`,
    },
    success: {
      icon: "✅",
      title: "Joined!",
      body: `Welcome to ${gameName}. Redirecting to lobby…`,
    },
    already_member: {
      icon: "👋",
      title: "Already a member",
      body: `You're already in ${gameName}. Redirecting…`,
    },
    not_found: {
      icon: "❌",
      title: "Invalid invite",
      body: "This invite link is not valid or has expired.",
    },
    error: {
      icon: "⚠",
      title: "Something went wrong",
      body: "Could not join the game. Try again or ask the GM for a new link.",
    },
    unauthenticated: {
      icon: "🔒",
      title: "Sign in required",
      body: "Please sign in before using an invite link.",
    },
  };

  const { icon, title, body } = messages[status];

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white border border-stone-200 rounded-2xl shadow-lg p-8 text-center">
        <div className="text-5xl mb-4">{icon}</div>
        <h1
          className="text-stone-900 font-bold text-xl mb-2"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {title}
        </h1>
        <p className="text-stone-500 text-sm">{body}</p>

        {status === "unauthenticated" && (
          <button
            onClick={() => navigate(`/login?redirect=/invite/${code}`)}
            className="mt-6 w-full py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-sm hover:bg-stone-800 transition-colors"
          >
            Sign in
          </button>
        )}

        {(status === "not_found" || status === "error") && (
          <button
            onClick={() => navigate("/")}
            className="mt-6 w-full py-2.5 rounded-xl bg-stone-100 text-stone-700 font-semibold text-sm hover:bg-stone-200 transition-colors"
          >
            Back to home
          </button>
        )}

        {status === "success" && gameId && (
          <button
            onClick={() => navigate(`/game/${gameId}`)}
            className="mt-6 w-full py-2.5 rounded-xl bg-stone-900 text-white font-semibold text-sm hover:bg-stone-800 transition-colors"
          >
            Go to lobby →
          </button>
        )}
      </div>
    </div>
  );
}
