import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#0a0a0f]" />
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
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(ellipse, #b45309 0%, transparent 70%)",
        }}
      />
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

// ── Feature grid cards ────────────────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
  badge,
}: {
  icon: string;
  title: string;
  desc: string;
  badge?: string;
}) {
  return (
    <div className="group relative flex flex-col gap-3 p-6 rounded-2xl border border-white/6 bg-white/[0.02] hover:bg-white/[0.05] hover:border-amber-500/20 transition-all duration-300">
      {badge && (
        <span className="absolute top-4 right-4 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold uppercase tracking-wider">
          {badge}
        </span>
      )}
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

// ── Spotlight feature row ─────────────────────────────────────────────────────
function SpotlightRow({
  icon,
  title,
  desc,
  details,
  reverse = false,
  accent = "#b45309",
}: {
  icon: string;
  title: string;
  desc: string;
  details: string[];
  reverse?: boolean;
  accent?: string;
}) {
  return (
    <div
      className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} gap-8 md:gap-16 items-center`}
    >
      {/* Visual panel */}
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-8 flex items-center justify-center"
          style={{
            minHeight: 200,
            background: `radial-gradient(ellipse at 30% 50%, ${accent}18 0%, transparent 70%)`,
          }}
        >
          <span
            style={{
              fontSize: "5rem",
              filter: "drop-shadow(0 0 32px " + accent + "60)",
            }}
          >
            <img src={icon} />
          </span>
        </div>
      </div>
      {/* Text */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        <h3
          className="text-2xl font-bold text-white"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {title}
        </h3>
        <p className="text-stone-400 text-base leading-relaxed">{desc}</p>
        <ul className="flex flex-col gap-2">
          {details.map((d, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm text-stone-400"
            >
              <span className="text-amber-500 mt-0.5 flex-shrink-0">◆</span>
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) navigate("/", { replace: true });
      else setAuthed(false);
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (authed === null) return null;

  return (
    <div
      className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <GridBackground />

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

      {/* ── Nav ───────────────────────────────────────────────────────────── */}
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
            Get started free
          </button>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-32 text-center">
        <div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/8 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-8"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          Virtual Tabletop — Free to Start
        </div>

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
            style={{ textShadow: "0 0 80px rgba(180,83,9,0.6)" }}
          >
            your table.
          </span>
        </h1>

        <p
          className="text-stone-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-10"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: "opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s",
          }}
        >
          A powerful virtual tabletop for Game Masters and their players.
          Real-time maps, dynamic lighting, full character sheets, and dice —
          all in one place.
        </p>

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

        <div
          className="flex items-center justify-center gap-12 mt-16 pt-12 border-t border-white/6"
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.8s ease 0.5s",
          }}
        >
          <StatPill value="Live" label="Support" />
          <div className="w-px h-8 bg-white/8" />
          <StatPill value="Free" label="To get started" />
        </div>
      </section>

      {/* ── Spotlight: Dynamic Lighting ────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-16">
          <span className="text-amber-500/60 text-xs font-semibold uppercase tracking-widest">
            Advanced Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-3">
            Built for the serious GM
          </h2>
          <p className="text-stone-500 text-base max-w-xl mx-auto">
            TableMaster goes beyond basic tokens and maps — it's a complete
            toolkit.
          </p>
        </div>

        <div className="flex flex-col gap-24">
          {/* Dynamic Lighting */}
          <SpotlightRow
            icon="/fog.png"
            title="Dynamic Lighting & Fog of War"
            desc="Token-based vision with full raycasting against walls and doors. Your players only see what their characters can see — nothing more."
            details={[
              "Real-time raycasting against custom wall segments you draw",
              "Doors players can open and close, instantly changing visible area",
              "Configurable vision radius per token — darkvision, blindsight, custom ranges",
              "GM-painted fog overlay mode for manual reveal without raycasting",
              "Token vision scales correctly with token size",
            ]}
            accent="#b45309"
          />

          {/* Character Sheets */}
          <SpotlightRow
            icon="/sheet.png"
            title="Full Character Sheets, In-Session"
            desc="No tab-switching. Full D&D 5e and Pathfinder 2e character sheets open as floating panels directly in the game window."
            details={[
              "Complete D&D 5e sheet: ability scores, skills, spells, attacks, inventory",
              "Full Pathfinder 2e sheet with actions, feats, and spell slots",
              "HP and AC changes sync instantly to the token HP bar on the map",
              "GM can view (but not edit) any player's sheet",
              "Sheets persist between sessions and link to tokens automatically",
            ]}
            reverse
            accent="#7c3aed"
          />

          {/* NPC Stat Blocks */}
          <SpotlightRow
            icon="/stats.png"
            title="NPC Stat Block Library"
            desc="Build a library of NPC stat blocks per campaign. Assign them to tokens with one click — HP and AC sync to the token automatically."
            details={[
              "D&D 5e Monster Manual-style stat blocks with full editing",
              "Pathfinder 2e Bestiary format with action cost icons",
              "Assign a stat block to any token — HP and AC populate instantly",
              "GM-only notes field on every stat block",
              "Draggable panel so you can view stats while running combat",
            ]}
            accent="#065f46"
          />

          {/* Measurement Tools */}
          <SpotlightRow
            icon="/measurments.png"
            title="AoE Measurement Tools"
            desc="Cast spells and measure distances with precision. Every measurement broadcasts to all players in real time."
            details={[
              "Ruler, circle, cone, line and square AoE tools",
              "All shapes snap to grid with configurable snap mode (center or corner)",
              "Cone angle adjustable from 15° to 180°",
              "Each player's measurement shown in a different colour",
              "Configurable grid scale (5ft, 10ft, or custom per scene)",
            ]}
            reverse
            accent="#1e40af"
          />
        </div>
      </section>

      {/* ── Core feature grid ──────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Everything at the table
          </h2>
          <p className="text-stone-500 text-base max-w-xl mx-auto">
            Every feature a GM needs, nothing they don't.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FeatureCard
            icon="🗺"
            title="Scene Management"
            desc="Create multiple scenes per campaign, each with its own map, grid, tokens and fog state. GM can preview scenes privately before pushing players to them."
          />
          <FeatureCard
            icon="🪙"
            title="Tokens & Combat Tracking"
            desc="Place tokens, track HP and AC with visual health bars, set vision ranges, add aura rings for spells and effects, and grant players control of their own tokens."
          />
          <FeatureCard
            icon="🎲"
            title="Built-in Dice Roller"
            desc="Roll any formula like 4d6kh3+2 with exploding dice, keep highest/lowest, modifiers and full history. Natural 20 detection built in."
          />
          <FeatureCard
            icon="👥"
            title="Real-time Multiplayer"
            desc="Token moves, scene switches, fog changes, and measurements sync instantly across all connected players. See who's online with live presence avatars."
          />
          <FeatureCard
            icon="🧱"
            title="Wall & Door Drawing"
            desc="Draw wall segments directly on the map for dynamic lighting. Place doors that players can open and close to dynamically change their visible area."
          />
          <FeatureCard
            icon="⚙"
            title="Full Customisation"
            desc="Square or hex grids, custom cell sizes, opacity, grid color, background tint, and map dimensions — all saved per scene automatically."
          />
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
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
                desc: "Add scenes, upload maps, place tokens, draw walls, and configure your grid.",
              },
              {
                step: "03",
                title: "Invite your players",
                desc: "Share a single invite link. Players join instantly and get their character sheet ready.",
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

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/6 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">⚔</span>
            <span className="text-stone-500 text-sm">TableMaster</span>
          </div>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/plans")}
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
            >
              Plans
            </button>
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
