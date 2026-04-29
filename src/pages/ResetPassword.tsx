import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

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

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  // Supabase sends the user back with a session embedded in the URL hash.
  // We need to wait for onAuthStateChange to fire with PASSWORD_RECOVERY
  // before we can call updateUser.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, _session) => {
        if (event === "PASSWORD_RECOVERY") {
          setSessionReady(true);
        }

        const hash = window.location.hash;
        if (hash && hash.includes("type=recovery")) {
          supabase.auth.getSession().then(({ data }) => {
            if (data.session) setSessionReady(true);
          });
        }

        const { data: listener } = supabase.auth.onAuthStateChange(
          (event, _session) => {
            if (event === "PASSWORD_RECOVERY") {
              setSessionReady(true);
            }
          },
        );
        return () => listener.subscription.unsubscribe();
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (!password) {
      setError("Please enter a new password.");
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
    setError("");

    const { error: updateErr } = await supabase.auth.updateUser({ password });

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2500);
    }
    setLoading(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleReset();
  };

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

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
          <p className="text-stone-500 text-sm mt-1">Choose a new password</p>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-sm p-8">
          {success ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-2xl">
                ✓
              </div>
              <div>
                <p className="text-white/80 font-semibold text-base mb-1">
                  Password updated
                </p>
                <p className="text-stone-400 text-sm">
                  Redirecting you to sign in…
                </p>
              </div>
            </div>
          ) : !sessionReady ? (
            <div className="flex flex-col items-center gap-4 text-center py-4">
              <div className="w-6 h-6 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-stone-400 text-sm">
                Verifying your reset link…
              </p>
              <p className="text-stone-600 text-xs max-w-xs">
                If nothing happens, your link may have expired. Request a{" "}
                <button
                  onClick={() => navigate("/forgot-password")}
                  className="text-amber-400 hover:text-amber-300 transition-colors"
                >
                  new reset link
                </button>
                .
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* New password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  New password
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
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 focus:border-amber-500/60 rounded-xl px-4 py-3 text-sm text-white placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-amber-500/15 transition-all"
                />
              </div>

              {/* Confirm new password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  Confirm new password
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

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                onClick={handleReset}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Updating…" : "Set new password →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
