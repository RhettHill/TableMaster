import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-[#080810]" />
      {/* Subtle grain texture via SVG */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.03]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="4"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
          backgroundSize: "80px 80px",
        }}
      />
      {/* Amber glow - top center */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-25"
        style={{
          background: "radial-gradient(ellipse, #c2410c 0%, transparent 65%)",
        }}
      />
      {/* Secondary glow - bottom right */}
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[400px] opacity-10"
        style={{
          background:
            "radial-gradient(ellipse at bottom right, #78350f 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 35%, #080810 100%)",
        }}
      />
    </div>
  );
}

// Decorative rune/die symbols
function FloatingRune({
  symbol,
  style,
}: {
  symbol: string;
  style: React.CSSProperties;
}) {
  return (
    <div
      className="absolute select-none pointer-events-none"
      style={{ opacity: 0.06, fontSize: "clamp(2rem, 4vw, 4rem)", ...style }}
    >
      {symbol}
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav({ navigate }: { navigate: (p: string) => void }) {
  return (
    <nav className="relative z-20 max-w-7xl mx-auto px-6 md:px-10 h-18 pt-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <img src="/swords.png" height={18} width={18} alt="TableMaster" />

        <span
          className="text-white font-bold text-xl tracking-wide"
          style={{ fontFamily: "'Georgia', serif", letterSpacing: "0.02em" }}
        >
          TableMaster
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/login")}
          className="px-5 py-2 text-sm text-stone-400 hover:text-white transition-colors"
        >
          Sign in
        </button>
        <button
          onClick={() => navigate("/signup")}
          className="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold transition-all shadow-lg shadow-amber-900/40 hover:shadow-amber-900/60 hover:-translate-y-px"
        >
          Get started free
        </button>
      </div>
    </nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({
  navigate,
  visible,
}: {
  navigate: (p: string) => void;
  visible: boolean;
}) {
  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pt-24 pb-36 text-center">
      {/* Badge */}
      <div
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-600/30 bg-amber-600/8 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-10"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.5s ease, transform 0.5s ease",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Virtual Tabletop — Free to Start
      </div>

      {/* Headline */}
      <h1
        className="text-6xl sm:text-7xl md:text-8xl font-bold leading-[1.0] tracking-tight mb-8"
        style={{
          fontFamily: "'Georgia', serif",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(24px)",
          transition: "opacity 0.65s ease 0.1s, transform 0.65s ease 0.1s",
        }}
      >
        <span className="text-white">Your adventure,</span>
        <br />
        <span
          className="text-amber-400 relative"
          style={{ textShadow: "0 0 120px rgba(217,119,6,0.5)" }}
        >
          your table.
        </span>
      </h1>

      {/* Subheadline */}
      <p
        className="text-stone-400 text-lg sm:text-xl max-w-2xl mx-auto leading-relaxed mb-12"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.65s ease 0.2s, transform 0.65s ease 0.2s",
        }}
      >
        A powerful virtual tabletop for Game Masters and their players.
        Real-time maps, dynamic lighting, full character sheets, and dice — all
        in one place.
      </p>

      {/* CTAs */}
      <div
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "opacity 0.65s ease 0.3s, transform 0.65s ease 0.3s",
        }}
      >
        <button
          onClick={() => navigate("/signup")}
          className="w-full sm:w-auto px-9 py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base transition-all shadow-2xl shadow-amber-900/50 hover:shadow-amber-900/70 hover:-translate-y-0.5"
        >
          Start for free →
        </button>
        <button
          onClick={() => navigate("/login")}
          className="w-full sm:w-auto px-9 py-4 rounded-xl border border-white/10 hover:border-white/20 text-stone-300 hover:text-white font-semibold text-base transition-all hover:-translate-y-0.5 bg-white/[0.02]"
        >
          Sign in to your campaign
        </button>
      </div>

      {/* Stats strip */}
      <div
        className="flex items-center justify-center gap-16 mt-20 pt-14 border-t border-white/6"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 0.8s ease 0.5s",
        }}
      >
        {[
          { value: "Free", label: "To get started" },
          { value: "Live", label: "Multiplayer" },
        ].map((s, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <span
              className="text-2xl font-bold text-amber-400 tabular-nums"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              {s.value}
            </span>
            <span className="text-stone-500 text-xs uppercase tracking-widest">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Feature showcase (big visual rows) ───────────────────────────────────────

function FeatureRow({
  icon,
  title,
  desc,
  details,
  reverse = false,
  accent = "#b45309",
  tag,
}: {
  icon: string;
  title: string;
  desc: string;
  details: string[];
  reverse?: boolean;
  accent?: string;
  tag?: string;
}) {
  return (
    <div
      className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} gap-10 lg:gap-20 items-center`}
    >
      {/* Visual card */}
      <div className="flex-1 min-w-0 w-full">
        <div
          className="relative rounded-2xl border border-white/8 overflow-hidden flex items-center justify-center"
          style={{
            minHeight: 260,
            background: `linear-gradient(135deg, ${accent}12 0%, transparent 60%), #0d0d16`,
          }}
        >
          {/* Decorative grid on card */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
              backgroundSize: "40px 40px",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse at 40% 50%, ${accent}20 0%, transparent 65%)`,
            }}
          />
          <img
            src={icon}
            alt={title}
            className="relative z-10 w-auto max-h-36 object-contain drop-shadow-2xl"
            style={{ filter: `drop-shadow(0 0 40px ${accent}50)` }}
          />
          {tag && (
            <span
              className="absolute top-4 right-4 text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase tracking-wider"
              style={{
                background: `${accent}20`,
                borderColor: `${accent}40`,
                color: accent,
              }}
            >
              {tag}
            </span>
          )}
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 flex flex-col gap-5">
        <h3
          className="text-3xl font-bold text-white leading-tight"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          {title}
        </h3>
        <p className="text-stone-400 text-base leading-relaxed">{desc}</p>
        <ul className="flex flex-col gap-2.5">
          {details.map((d, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm text-stone-400"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 mt-1.5 flex-shrink-0" />
              {d}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Core feature grid ─────────────────────────────────────────────────────────

const CORE_FEATURES = [
  {
    icon: "🗺",
    title: "Scene Management",
    desc: "Multiple scenes per campaign. Preview privately before pushing to players.",
  },
  {
    icon: "🪙",
    title: "Tokens & Combat",
    desc: "HP bars, AC badges, vision ranges, aura rings, and player-controlled tokens.",
  },
  {
    icon: "🎲",
    title: "Advanced Dice Roller",
    desc: "Full dice notation: 4d6kh3, exploding dice, modifiers, and nat-20 detection.",
  },
  {
    icon: "👥",
    title: "Real-time Multiplayer",
    desc: "Instant sync across all players. Live presence avatars show who's online.",
  },
  {
    icon: "🧱",
    title: "Walls & Doors",
    desc: "Draw walls and doors for dynamic lighting. Players can open and close doors.",
  },
  {
    icon: "📐",
    title: "AoE Measurements",
    desc: "Ruler, circle, cone, line, and square tools. Broadcasts to all players in real time.",
  },
  {
    icon: "📋",
    title: "Character Sheets",
    desc: "Full D&D 5e and Pathfinder 2e sheets open as draggable panels mid-session.",
  },
  {
    icon: "⚙",
    title: "Full Customisation",
    desc: "Square or hex grids, custom scale, opacity, colors, and map dimensions per scene.",
  },
  {
    icon: "📜",
    title: "NPC Stat Blocks",
    desc: "Build an NPC library. Assign stat blocks to tokens — HP and AC sync instantly.",
  },
];

function FeatureGrid() {
  return (
    <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-28">
      <div className="text-center mb-14">
        <h2
          className="text-3xl sm:text-4xl font-bold text-white mb-3"
          style={{ fontFamily: "'Georgia', serif" }}
        >
          Everything at the table
        </h2>
        <p className="text-stone-500 text-base max-w-xl mx-auto">
          Every feature a GM needs, nothing they don't.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-white/6 rounded-2xl overflow-hidden border border-white/6">
        {CORE_FEATURES.map((f, i) => (
          <div
            key={i}
            className="group flex flex-col gap-3 p-7 bg-[#080810] hover:bg-[#0f0f1a] transition-colors duration-200"
          >
            <div className="text-2xl">{f.icon}</div>
            <h3 className="text-white/90 font-semibold text-sm">{f.title}</h3>
            <p className="text-stone-500 text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks({ navigate }: { navigate: (p: string) => void }) {
  const steps = [
    {
      n: "01",
      title: "Create an account",
      desc: "Sign up free. No credit card, no trial period.",
    },
    {
      n: "02",
      title: "Build your campaign",
      desc: "Add scenes, upload maps, place tokens, draw walls, and configure your grid.",
    },
    {
      n: "03",
      title: "Invite your players",
      desc: "Share a single invite link. Players join instantly and get their character sheet.",
    },
  ];

  return (
    <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-10 pb-28">
      <div
        className="rounded-3xl border border-white/8 overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0d0d1a 0%, #0a0a10 100%)",
        }}
      >
        {/* Top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-600/40 to-transparent" />
        <div className="p-10 sm:p-14">
          <h2
            className="text-3xl font-bold text-white text-center mb-12"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            Up and running in minutes
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
            {steps.map(({ n, title, desc }) => (
              <div key={n} className="flex flex-col gap-4">
                <div
                  className="text-5xl font-bold"
                  style={{
                    fontFamily: "'Georgia', serif",
                    color: "rgba(217,119,6,0.2)",
                  }}
                >
                  {n}
                </div>
                <h3 className="text-white font-semibold text-base">{title}</h3>
                <p className="text-stone-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-center mt-12">
            <button
              onClick={() => navigate("/signup")}
              className="px-9 py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base transition-all shadow-2xl shadow-amber-900/40 hover:shadow-amber-900/60 hover:-translate-y-0.5"
            >
              Create your first campaign →
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ─────────────────────────────────────────────────────────────────────

function Footer({ navigate }: { navigate: (p: string) => void }) {
  return (
    <footer className="relative z-10 border-t border-white/6 py-8">
      <div className="max-w-7xl mx-auto px-6 md:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded flex items-center justify-center opacity-60">
            <img src="/swords.png" height={14} width={14} alt="" />
          </div>
          <span className="text-stone-500 text-sm font-medium">
            TableMaster
          </span>
        </div>
        <div className="flex items-center gap-6">
          {[
            ["Plans", "/plans"],
            ["Sign in", "/login"],
            ["Create account", "/signup"],
          ].map(([label, path]) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="text-stone-500 hover:text-stone-300 text-sm transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </footer>
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
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  if (authed === null) return null;

  return (
    <div
      className="min-h-screen bg-[#080810] text-white overflow-x-hidden"
      style={{ fontFamily: "'Georgia', serif" }}
    >
      <GridBackground />

      {/* Floating decorative runes */}
      <FloatingRune
        symbol="⬡"
        style={{ top: "12%", left: "4%", transform: "rotate(-12deg)" }}
      />
      <FloatingRune
        symbol="◆"
        style={{ top: "20%", right: "6%", transform: "rotate(18deg)" }}
      />
      <FloatingRune
        symbol="⬟"
        style={{ top: "55%", left: "2%", transform: "rotate(8deg)" }}
      />
      <FloatingRune
        symbol="◈"
        style={{ top: "45%", right: "4%", transform: "rotate(-5deg)" }}
      />

      <Nav navigate={navigate} />
      <Hero navigate={navigate} visible={visible} />

      {/* ── Advanced features section ── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-10 pb-28">
        <div className="text-center mb-16">
          <span className="text-amber-500/60 text-xs font-semibold uppercase tracking-widest">
            Built for Serious GMs
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-2 mb-3"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            A complete tabletop toolkit
          </h2>
          <p className="text-stone-500 text-base max-w-xl mx-auto">
            TableMaster goes beyond basic tokens and maps.
          </p>
        </div>

        <div className="flex flex-col gap-24">
          <FeatureRow
            icon="/fog.png"
            title="Dynamic Lighting & Fog of War"
            desc="Token-based vision with full raycasting against walls and doors. Players only see what their characters can see."
            details={[
              "Real-time raycasting against custom wall segments",
              "Doors players can open and close, changing visible area instantly",
              "Configurable vision radius — darkvision, blindsight, custom ranges",
              "GM-painted fog overlay mode for manual reveal",
            ]}
            accent="#b45309"
            tag="Plus plan"
          />

          <FeatureRow
            icon="/sheet.png"
            title="Full Character Sheets, In-Session"
            desc="No tab-switching. Complete D&D 5e and Pathfinder 2e sheets open as floating draggable panels directly in the game window."
            details={[
              "D&D 5e: ability scores, skills, spells, attacks, inventory",
              "Pathfinder 2e: actions, feats, spell slots, and more",
              "HP and AC sync instantly to the token HP bar",
              "Sheets persist between sessions and link to tokens",
            ]}
            reverse
            accent="#7c3aed"
          />

          <FeatureRow
            icon="/stats.png"
            title="NPC Stat Block Library"
            desc="Build a reusable library of NPC stat blocks per campaign. Assign them to tokens with one click — HP and AC sync automatically."
            details={[
              "D&D 5e Monster Manual-style layout with full editing",
              "Pathfinder 2e Bestiary format with action cost icons",
              "Assign a stat block to any token — stats populate instantly",
              "Draggable panel to view stats while running combat",
            ]}
            accent="#065f46"
          />
        </div>
      </section>

      <FeatureGrid />
      <HowItWorks navigate={navigate} />
      <Footer navigate={navigate} />
    </div>
  );
}
