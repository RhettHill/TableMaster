import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate, useSearchParams, Link } from "react-router-dom";

function GridBg() {
  return (
    <div className="fixed inset-0 pointer-events-none">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full opacity-15"
        style={{
          background: "radial-gradient(ellipse, #b45309 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, #0a0a0f 100%)",
        }}
      />
    </div>
  );
}

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Both fields are required.");
      return;
    }
    setLoading(true);
    setError("");

    let email = identifier.trim();
    if (!email.includes("@")) {
      const { data: lookedUp, error: rpcErr } = await supabase.rpc(
        "get_email_by_username",
        { uname: email },
      );
      if (rpcErr || !lookedUp) {
        setError("No account found with that username.");
        setLoading(false);
        return;
      }
      email = lookedUp as string;
    }

    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authErr) {
      setError("Incorrect username/email or password.");
    } else {
      const redirect = searchParams.get("redirect") || "/";
      navigate(redirect, { replace: true });
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <GridBg />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-amber-500 text-3xl mb-3">⚔</span>
          <h1 className="text-white font-bold text-2xl tracking-wide">
            TableMaster
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Sign in to your campaigns
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Username or email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKey}
                autoComplete="username"
                placeholder="adventurer or name@example.com"
                className="w-full bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-stone-500 hover:text-amber-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKey}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
            >
              {loading ? "Signing in…" : "Sign in →"}
            </button>
          </div>
        </div>

        <p className="text-center text-stone-500 text-sm mt-6">
          New adventurer?{" "}
          <Link
            to="/signup"
            className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            Create an account
          </Link>
        </p>
        <p className="text-center mt-3">
          <button
            onClick={() => navigate("/home")}
            className="text-stone-600 hover:text-stone-400 text-xs transition-colors"
          >
            ← Back to home
          </button>
        </p>
      </div>
    </div>
  );
}
