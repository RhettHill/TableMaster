import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

// ── Animated grid background ──────────────────────────────────────────────────
function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base dark */}
      <div className="absolute inset-0 bg-[#0a0a0f]" />

      {/* Subtle grid lines */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow centre */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(ellipse, #b45309 0%, transparent 70%)",
        }}
      />

      {/* Corner vignettes */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, #0a0a0f 100%)",
        }}
      />
    </div>
  );
}

// ── Floating dice decoration ──────────────────────────────────────────────────
function FloatingDie({
  symbol,
  style,
}: {
  symbol: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="absolute text-stone-700 select-none pointer-events-none font-serif"
      style={{ fontSize: "clamp(1.5rem, 3vw, 3rem)", opacity: 0.12, ...style }}
    >
      {symbol}
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div className="group relative flex flex-col gap-3 p-6 rounded-2xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-500/20 transition-all duration-300">
      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl group-hover:bg-amber-500/20 transition-colors">
        {icon}
      </div>
      <h3
        className="text-white/90 font-semibold text-base"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        {title}
      </h3>
      <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-3xl font-bold text-amber-400 tabular-nums"
        style={{ fontFamily: "'Georgia', serif" }}
      >
        {value}
      </span>
      <span className="text-stone-500 text-xs uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null); // null = loading

  // If already signed in, redirect to dashboard
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate("/", { replace: true });
      } else {
        setAuthed(false);
      }
    });
  }, []);

  // Staggered reveal animation state
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (authed === null) return null; // brief loading, avoids flash

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <GridBackground />

      {/* Floating decorative dice */}
      <FloatingDie
        symbol="⬡"
        style={{ top: "8%", left: "6%", transform: "rotate(-15deg)" }}
      />
      <FloatingDie
        symbol="⬟"
        style={{ top: "15%", right: "8%", transform: "rotate(20deg)" }}
      />
      <FloatingDie
        symbol="⬡"
        style={{ top: "60%", left: "3%", transform: "rotate(10deg)" }}
      />
      <FloatingDie
        symbol="⬟"
        style={{ bottom: "12%", right: "5%", transform: "rotate(-8deg)" }}
      />
      <FloatingDie
        symbol="◈"
        style={{ top: "40%", right: "12%", transform: "rotate(5deg)" }}
      />

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-amber-500 text-xl">⚔</span>
          <span
            className="text-white font-bold text-lg tracking-wide"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            TableMaster
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 text-sm text-stone-400 hover:text-white transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={() => navigate("/signup")}
            className="px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50"
          >
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-32 text-center">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/8 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Virtual Tabletop
        </div>

        {/* Headline */}
        <h1
          className="text-5xl sm:text-6xl md:text-7xl font-bold leading-[1.05] tracking-tight mb-6"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
          }}
        >
          <span className="text-white">Your adventure,</span>
          <br />
          <span
            className="text-amber-400"
            style={{
              textShadow: "0 0 80px rgba(180,83,9,0.6)",
            }}
          >
            your table.
          </span>
        </h1>

        {/* Subheading */}
        <p
          className="text-stone-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
        >
          A powerful virtual tabletop built for Game Masters and their players.
          Real-time maps, tokens, dice — everything you need to run the perfect
          session.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.3s, transform 0.7s ease 0.3s",
          }}
        >
          <button
            onClick={() => navigate("/signup")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base transition-all shadow-xl shadow-amber-900/40 hover:shadow-amber-900/60 hover:-translate-y-0.5"
          >
            Start for free →
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-white/10 hover:border-white/25 text-stone-300 hover:text-white font-semibold text-base transition-all hover:-translate-y-0.5"
          >
            Sign in to your campaign
          </button>
        </div>

        {/* Stats row */}
        <div
          className="flex items-center justify-center gap-12 mt-16 pt-12 border-t border-white/6"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.5s",
          }}
        >
          <StatPill value="∞" label="Campaigns" />
          <div className="w-px h-8 bg-white/8" />
          <StatPill value="Live" label="Real-time sync" />
          <div className="w-px h-8 bg-white/8" />
          <StatPill value="Free" label="To get started" />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Everything at the table
          </h2>
          <p className="text-stone-500 text-base max-w-xl mx-auto">
            Built from the ground up for Game Masters who want control, and
            players who want immersion.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon="🗺"
            title="Scene Management"
            desc="Create multiple scenes per campaign, each with its own map, grid, tokens and settings. Switch scenes and all players follow instantly."
          />
          <FeatureCard
            icon="🪙"
            title="Tokens & HP Tracking"
            desc="Place and move tokens on your map. Track HP, AC and visibility. Grant players control of their own character tokens."
          />
          <FeatureCard
            icon="📏"
            title="Measurement Tools"
            desc="Ruler, cone, circle, line and square AoE tools with grid snapping. All measurements visible to every player in real time."
          />
          <FeatureCard
            icon="🎲"
            title="Built-in Dice Roller"
            desc="Roll any combination of dice with a formula like 2d6+3. Draggable panel, natural 20 detection, full history."
          />
          <FeatureCard
            icon="👥"
            title="Real-time Multiplayer"
            desc="Token positions, scene switches and map changes sync instantly across all connected players. See who's online with live presence."
          />
          <FeatureCard
            icon="⚙"
            title="Full Customisation"
            desc="Square or hex grids, custom sizes, colors, background tints and fog. All settings saved automatically per scene."
          />
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-28">
        <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-10 sm:p-14">
          <h2 className="text-3xl font-bold text-white text-center mb-10">
            Up and running in minutes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Create an account",
                desc: "Sign up free. No credit card, no trial period.",
              },
              {
                step: "02",
                title: "Build your campaign",
                desc: "Add scenes, upload maps, place tokens and configure your grid.",
              },
              {
                step: "03",
                title: "Invite your players",
                desc: "Share a single invite link. Players join instantly with their own account.",
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex flex-col gap-3">
                <div
                  className="text-4xl font-bold text-amber-500/25"
                  style={{ fontFamily: "'Georgia', serif" }}
                >
                  {step}
                </div>
                <h3 className="text-white font-semibold">{title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-10">
            <button
              onClick={() => navigate("/signup")}
              className="px-8 py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base transition-all shadow-xl shadow-amber-900/40 hover:shadow-amber-900/60 hover:-translate-y-0.5"
            >
              Create your first campaign →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/6 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚔</span>
            <span className="text-stone-500 text-sm">TableMaster</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/login")}
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
            >
              Sign in
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
            >
              Create account
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
