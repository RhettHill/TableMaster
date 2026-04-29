import { useState } from "react";
import { supabase } from "../services/supabase";
import { useNavigate, Link } from "react-router-dom";

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
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-125 rounded-full opacity-15"
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

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async () => {
    setError("");
    setMessage("");

    if (!email || !password || !username) {
      setError("Email, password and username are required.");
      return;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const cleanUsername = username.toLowerCase().trim();
    const cleanDisplayName = displayName.trim() || username.trim();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (existing) {
      setError("That username is already taken.");
      setLoading(false);
      return;
    }

    // Pass username + display_name as metadata so the handle_new_user
    // SECURITY DEFINER trigger can insert the profile row, bypassing RLS.
    const { data: userData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: cleanDisplayName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!userData.user) {
      setError("Account creation failed. Please try again.");
      setLoading(false);
      return;
    }

    const session = userData.session;

    if (session?.access_token) {
      // Email confirmation is OFF — session is live immediately.
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      setMessage("Account created! Taking you to your campaigns…");
      setTimeout(() => navigate("/"), 1500);
    } else {
      // Email confirmation is ON — user must confirm before signing in.
      setMessage("Account created! Check your email to confirm, then sign in.");
      setTimeout(() => navigate("/login"), 3000);
    }

    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSignup();
  };

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <GridBg />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <span className="text-amber-500 text-3xl mb-3">⚔</span>
          <h1 className="text-white font-bold text-2xl tracking-wide">
            TableMaster
          </h1>
          <p className="text-stone-500 text-sm mt-1">Begin your adventure</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm p-8">
          <div className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKey}
                autoComplete="email"
                placeholder="name@example.com"
                className="w-full bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKey}
                autoComplete="new-password"
                placeholder="Min 6 characters"
                className="w-full bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKey}
                autoComplete="new-password"
                placeholder="Repeat your password"
                className={`w-full bg-white/5 border focus:outline-none focus:ring-2 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 transition-all ${
                  passwordMismatch
                    ? "border-red-500/50 focus:border-red-500/70 focus:ring-red-500/10"
                    : "border-white/10 focus:border-amber-500/60 focus:ring-amber-500/15"
                }`}
              />
              {passwordMismatch && (
                <p className="text-red-400 text-[11px] px-1">
                  Passwords don't match
                </p>
              )}
            </div>

            <div className="h-px bg-white/6" />

            {/* Username */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Username
              </label>
              <div className="flex items-center">
                <span className="px-3 py-3 bg-white/5 border border-r-0 border-white/10 rounded-l-xl text-stone-500 text-sm select-none">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
                    );
                    setError("");
                  }}
                  onKeyDown={handleKey}
                  placeholder="your_handle"
                  className="flex-1 bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-r-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
                />
              </div>
              <p className="text-stone-600 text-[10px] px-1">
                Permanent — choose carefully. Letters, numbers, underscores.
              </p>
            </div>

            {/* Display Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                Display Name{" "}
                <span className="text-stone-600 normal-case font-normal">
                  (optional)
                </span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Shown to other players"
                className="w-full bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              onClick={handleSignup}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 disabled:opacity-50 mt-1"
            >
              {loading ? "Creating account…" : "Create account →"}
            </button>
          </div>
        </div>

        <p className="text-center text-stone-500 text-sm mt-6">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-amber-400 hover:text-amber-300 transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
        <p className="text=center mt-3">
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
