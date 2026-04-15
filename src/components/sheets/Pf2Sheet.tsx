// Pathfinder 2e Character Sheet

export interface Pf2eData {
  // ── Identity ──────────────────────────────────────────────────────────────
  characterName: string;
  playerName: string;
  ancestry: string;
  heritage: string;
  background: string;
  characterClass: string;
  classSpecialization: string; // subclass / archetype
  level: number;
  xp: number;
  alignment: string;
  deity: string;
  size: string;
  traits: string; // comma-separated traits

  // ── Core combat stats ─────────────────────────────────────────────────────
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  heroPoints: number; // 0–3
  dying: number; // 0–4
  wounded: number;
  drained: number;
  doomed: number;

  // ── Perception ────────────────────────────────────────────────────────────
  perception: number; // total bonus
  perceptionProficiency: string; // T/E/M/L

  // ── Ability scores ────────────────────────────────────────────────────────
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // ── Saving throws ─────────────────────────────────────────────────────────
  fortitude: number;
  fortitudeProficiency: string;
  reflex: number;
  reflexProficiency: string;
  will: number;
  willProficiency: string;

  // ── Class DC ──────────────────────────────────────────────────────────────
  classDC: number;
  classDCProficiency: string;

  // ── Skills ────────────────────────────────────────────────────────────────
  skills: {
    acrobatics: { bonus: number; proficiency: string; armorPenalty: boolean };
    arcana: { bonus: number; proficiency: string; armorPenalty: boolean };
    athletics: { bonus: number; proficiency: string; armorPenalty: boolean };
    crafting: { bonus: number; proficiency: string; armorPenalty: boolean };
    deception: { bonus: number; proficiency: string; armorPenalty: boolean };
    diplomacy: { bonus: number; proficiency: string; armorPenalty: boolean };
    intimidation: { bonus: number; proficiency: string; armorPenalty: boolean };
    lore1: {
      name: string;
      bonus: number;
      proficiency: string;
      armorPenalty: boolean;
    };
    lore2: {
      name: string;
      bonus: number;
      proficiency: string;
      armorPenalty: boolean;
    };
    medicine: { bonus: number; proficiency: string; armorPenalty: boolean };
    nature: { bonus: number; proficiency: string; armorPenalty: boolean };
    occultism: { bonus: number; proficiency: string; armorPenalty: boolean };
    performance: { bonus: number; proficiency: string; armorPenalty: boolean };
    religion: { bonus: number; proficiency: string; armorPenalty: boolean };
    society: { bonus: number; proficiency: string; armorPenalty: boolean };
    stealth: { bonus: number; proficiency: string; armorPenalty: boolean };
    survival: { bonus: number; proficiency: string; armorPenalty: boolean };
    thievery: { bonus: number; proficiency: string; armorPenalty: boolean };
  };

  // ── Actions (with action cost) ────────────────────────────────────────────
  actions: {
    name: string;
    actionCost: "1" | "2" | "3" | "R" | "F" | "passive"; // action/reaction/free
    traits: string;
    description: string;
  }[];

  // ── Feats & abilities ─────────────────────────────────────────────────────
  ancestryFeats: { name: string; level: number; description: string }[];
  classFeats: { name: string; level: number; description: string }[];
  skillFeats: { name: string; level: number; description: string }[];
  generalFeats: { name: string; level: number; description: string }[];
  classFeatures: { name: string; level: number; description: string }[];

  // ── Spellcasting ──────────────────────────────────────────────────────────
  spellcastingType: "prepared" | "spontaneous" | "innate" | "none";
  spellcastingStat: string; // int / wis / cha
  spellAttackBonus: number;
  spellDC: number;
  spellProficiency: string;
  focusPoints: number;
  maxFocusPoints: number;

  spellSlots: {
    level: number;
    total: number;
    used: number;
  }[];

  spells: {
    spellLevel: number;
    name: string;
    actionCost: "1" | "2" | "3" | "R" | "F" | "passive" | "varies";
    traits: string;
    description: string;
    prepared: boolean;
  }[];

  // ── Equipment ─────────────────────────────────────────────────────────────
  bulk: number; // current
  maxBulk: number;
  currency: { cp: number; sp: number; gp: number; pp: number };
  equipment: {
    name: string;
    quantity: number;
    bulk: number | "L" | "-";
    invested: boolean;
    worn: boolean;
    description: string;
  }[];

  // ── Notes ─────────────────────────────────────────────────────────────────
  appearance: string;
  backstory: string;
  notes: string;
  gmNotes: string;
}

export const DEFAULT_PF2E: Pf2eData = {
  characterName: "",
  playerName: "",
  ancestry: "",
  heritage: "",
  background: "",
  characterClass: "",
  classSpecialization: "",
  level: 1,
  xp: 0,
  alignment: "",
  deity: "",
  size: "Medium",
  traits: "",
  hp: 0,
  maxHp: 0,
  tempHp: 0,
  ac: 10,
  speed: 25,
  heroPoints: 1,
  dying: 0,
  wounded: 0,
  drained: 0,
  doomed: 0,
  perception: 0,
  perceptionProficiency: "T",
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  fortitude: 0,
  fortitudeProficiency: "T",
  reflex: 0,
  reflexProficiency: "T",
  will: 0,
  willProficiency: "T",
  classDC: 0,
  classDCProficiency: "T",
  skills: {
    acrobatics: { bonus: 0, proficiency: "U", armorPenalty: true },
    arcana: { bonus: 0, proficiency: "U", armorPenalty: false },
    athletics: { bonus: 0, proficiency: "U", armorPenalty: true },
    crafting: { bonus: 0, proficiency: "U", armorPenalty: false },
    deception: { bonus: 0, proficiency: "U", armorPenalty: false },
    diplomacy: { bonus: 0, proficiency: "U", armorPenalty: false },
    intimidation: { bonus: 0, proficiency: "U", armorPenalty: false },
    lore1: { name: "Lore", bonus: 0, proficiency: "U", armorPenalty: false },
    lore2: { name: "Lore", bonus: 0, proficiency: "U", armorPenalty: false },
    medicine: { bonus: 0, proficiency: "U", armorPenalty: false },
    nature: { bonus: 0, proficiency: "U", armorPenalty: false },
    occultism: { bonus: 0, proficiency: "U", armorPenalty: false },
    performance: { bonus: 0, proficiency: "U", armorPenalty: false },
    religion: { bonus: 0, proficiency: "U", armorPenalty: false },
    society: { bonus: 0, proficiency: "U", armorPenalty: false },
    stealth: { bonus: 0, proficiency: "U", armorPenalty: true },
    survival: { bonus: 0, proficiency: "U", armorPenalty: false },
    thievery: { bonus: 0, proficiency: "U", armorPenalty: true },
  },
  actions: [],
  ancestryFeats: [],
  classFeats: [],
  skillFeats: [],
  generalFeats: [],
  classFeatures: [],
  spellcastingType: "none",
  spellcastingStat: "int",
  spellAttackBonus: 0,
  spellDC: 0,
  spellProficiency: "T",
  focusPoints: 0,
  maxFocusPoints: 0,
  spellSlots: Array.from({ length: 10 }, (_, i) => ({
    level: i,
    total: 0,
    used: 0,
  })),
  spells: [],
  bulk: 0,
  maxBulk: 0,
  currency: { cp: 0, sp: 0, gp: 0, pp: 0 },
  equipment: [],
  appearance: "",
  backstory: "",
  notes: "",
  gmNotes: "",
};

// ── Action cost icons ─────────────────────────────────────────────────────────

const ACTION_ICONS: Record<string, string> = {
  "1": "◆",
  "2": "◆◆",
  "3": "◆◆◆",
  R: "↺",
  F: "◇",
  passive: "—",
  varies: "◆+",
};

const PROF_COLORS: Record<string, string> = {
  U: "text-stone-400",
  T: "text-sky-400",
  E: "text-emerald-400",
  M: "text-violet-400",
  L: "text-amber-400",
};

const PROF_LABELS: Record<string, string> = {
  U: "Untrained",
  T: "Trained",
  E: "Expert",
  M: "Master",
  L: "Legendary",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (t: string) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap border-b border-white/8 pb-2 mb-4">
      {tabs.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
            active === t
              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
              : "text-white/40 hover:text-white/70 border border-transparent"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">
        {label}
      </span>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder = "",
  className = "",
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80
        focus:outline-none focus:border-amber-500/50 disabled:opacity-50 ${className}`}
    />
  );
}

function NumInput({
  value,
  onChange,
  min = -99,
  max = 9999,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className={`bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80
        text-center tabular-nums focus:outline-none focus:border-amber-500/50 ${className}`}
    />
  );
}

function ProfSelect({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white/5 border border-white/10 rounded px-1 py-0.5 text-[10px]
        focus:outline-none focus:border-amber-500/50 ${PROF_COLORS[value] ?? "text-white/50"}`}
    >
      {["U", "T", "E", "M", "L"].map((p) => (
        <option key={p} value={p} className="bg-[#1a1a2e] text-white">
          {p} — {PROF_LABELS[p]}
        </option>
      ))}
    </select>
  );
}

function StatBox({
  label,
  value,
  onChange,
  sub,
  canEdit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  sub?: string;
  canEdit: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 bg-white/3 border border-white/8 rounded-xl p-2 min-w-[56px]">
      <span className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">
        {label}
      </span>
      {canEdit ? (
        <NumInput
          value={value}
          onChange={onChange}
          className="w-14 text-base font-bold"
        />
      ) : (
        <span className="text-base font-bold text-white/90 tabular-nums">
          {value >= 0 ? `+${value}` : value}
        </span>
      )}
      {sub && <span className="text-[9px] text-white/25">{sub}</span>}
    </div>
  );
}

function AbilityBox({
  label,
  score,
  onChange,
  canEdit,
}: {
  label: string;
  score: number;
  onChange: (v: number) => void;
  canEdit: boolean;
}) {
  const mod = Math.floor((score - 10) / 2);
  const modStr = mod >= 0 ? `+${mod}` : `${mod}`;
  return (
    <div className="flex flex-col items-center gap-1 bg-white/3 border border-white/8 rounded-xl p-2 flex-1">
      <span className="text-[9px] uppercase tracking-wider text-amber-400/70 font-bold">
        {label}
      </span>
      {canEdit ? (
        <NumInput
          value={score}
          onChange={onChange}
          min={1}
          max={30}
          className="w-12 text-sm font-bold"
        />
      ) : (
        <span className="text-sm font-bold text-white/90 tabular-nums">
          {score}
        </span>
      )}
      <span className="text-xs font-semibold text-white/60">{modStr}</span>
    </div>
  );
}

function FeatList({
  title,
  items,
  onChange,
  canEdit,
}: {
  title: string;
  items: { name: string; level: number; description: string }[];
  onChange: (v: { name: string; level: number; description: string }[]) => void;
  canEdit: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-wider text-amber-400/60 font-semibold">
          {title}
        </span>
        {canEdit && (
          <button
            onClick={() =>
              onChange([...items, { name: "", level: 1, description: "" }])
            }
            className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
          >
            + Add
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((f, i) => (
          <div
            key={i}
            className="bg-white/3 border border-white/8 rounded-lg p-2"
          >
            {canEdit ? (
              <div className="flex flex-col gap-1">
                <div className="flex gap-1 items-center">
                  <TextInput
                    value={f.name}
                    onChange={(v) => {
                      const n = [...items];
                      n[i] = { ...n[i], name: v };
                      onChange(n);
                    }}
                    placeholder="Feat name"
                    className="flex-1"
                  />
                  <NumInput
                    value={f.level}
                    onChange={(v) => {
                      const n = [...items];
                      n[i] = { ...n[i], level: v };
                      onChange(n);
                    }}
                    min={1}
                    max={20}
                    className="w-12"
                  />
                  <button
                    onClick={() => {
                      const n = [...items];
                      n.splice(i, 1);
                      onChange(n);
                    }}
                    className="text-red-400/50 hover:text-red-400 text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
                <textarea
                  value={f.description}
                  onChange={(e) => {
                    const n = [...items];
                    n[i] = { ...n[i], description: e.target.value };
                    onChange(n);
                  }}
                  placeholder="Description"
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70
                    focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-white/80">
                    {f.name}
                  </span>
                  <span className="text-[9px] text-white/25">
                    Lvl {f.level}
                  </span>
                </div>
                {f.description && (
                  <p className="text-[10px] text-white/40 mt-0.5">
                    {f.description}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[10px] text-white/20 text-center py-2">
            No {title.toLowerCase()} yet
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

import { useState } from "react";

interface Props {
  data: Partial<Pf2eData>;
  canEdit: boolean;
  isGM: boolean;
  onChange: (patch: Partial<Pf2eData>) => void;
}

const TABS = [
  "Identity",
  "Stats",
  "Skills",
  "Actions",
  "Feats",
  "Spells",
  "Equipment",
  "Notes",
];

export default function Pf2eSheet({ data, canEdit, isGM, onChange }: Props) {
  const [tab, setTab] = useState("Identity");
  const d = { ...DEFAULT_PF2E, ...data };
  const set = (patch: Partial<Pf2eData>) => {
    if (canEdit) onChange(patch);
  };

  return (
    <div className="flex flex-col h-full text-white/80 p-2">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {/* ── IDENTITY ── */}
      {tab === "Identity" && (
        <div className="flex flex-col gap-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Character Name">
              <TextInput
                value={d.characterName}
                onChange={(v) => set({ characterName: v })}
                placeholder="Name"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Player Name">
              <TextInput
                value={d.playerName}
                onChange={(v) => set({ playerName: v })}
                placeholder="Player"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Ancestry">
              <TextInput
                value={d.ancestry}
                onChange={(v) => set({ ancestry: v })}
                placeholder="e.g. Human"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Heritage">
              <TextInput
                value={d.heritage}
                onChange={(v) => set({ heritage: v })}
                placeholder="e.g. Versatile"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Background">
              <TextInput
                value={d.background}
                onChange={(v) => set({ background: v })}
                placeholder="e.g. Acolyte"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Class">
              <TextInput
                value={d.characterClass}
                onChange={(v) => set({ characterClass: v })}
                placeholder="e.g. Wizard"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Subclass / Archetype">
              <TextInput
                value={d.classSpecialization}
                onChange={(v) => set({ classSpecialization: v })}
                placeholder="e.g. School of..."
                disabled={!canEdit}
              />
            </Field>
            <Field label="Deity">
              <TextInput
                value={d.deity}
                onChange={(v) => set({ deity: v })}
                placeholder="Deity"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Level">
              <NumInput
                value={d.level}
                onChange={(v) => set({ level: v })}
                min={1}
                max={20}
                className="w-20"
              />
            </Field>
            <Field label="XP">
              <NumInput
                value={d.xp}
                onChange={(v) => set({ xp: v })}
                min={0}
                max={9999}
                className="w-20"
              />
            </Field>
            <Field label="Alignment">
              <TextInput
                value={d.alignment}
                onChange={(v) => set({ alignment: v })}
                placeholder="e.g. NG"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Size">
              <TextInput
                value={d.size}
                onChange={(v) => set({ size: v })}
                placeholder="Medium"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Traits">
              <TextInput
                value={d.traits}
                onChange={(v) => set({ traits: v })}
                placeholder="e.g. Human, Humanoid"
                disabled={!canEdit}
                className="w-full"
              />
            </Field>
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      {tab === "Stats" && (
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* HP row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="col-span-2 bg-white/3 border border-white/8 rounded-xl p-3">
              <span className="text-[9px] uppercase tracking-wider text-red-400/60 font-bold">
                Hit Points
              </span>
              <div className="flex items-center gap-2 mt-1">
                {canEdit ? (
                  <NumInput
                    value={d.hp}
                    onChange={(v) => set({ hp: v })}
                    min={0}
                    className="w-16 text-xl font-bold"
                  />
                ) : (
                  <span className="text-xl font-bold text-white/90">
                    {d.hp}
                  </span>
                )}
                <span className="text-white/30">/</span>
                {canEdit ? (
                  <NumInput
                    value={d.maxHp}
                    onChange={(v) => set({ maxHp: v })}
                    min={0}
                    className="w-16 text-xl font-bold"
                  />
                ) : (
                  <span className="text-xl font-bold text-white/90">
                    {d.maxHp}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-white/30">Temp:</span>
                {canEdit ? (
                  <NumInput
                    value={d.tempHp}
                    onChange={(v) => set({ tempHp: v })}
                    min={0}
                    className="w-14"
                  />
                ) : (
                  <span className="text-xs text-white/50">{d.tempHp}</span>
                )}
              </div>
            </div>

            {/* Hero Points */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-3 flex flex-col items-center justify-center">
              <span className="text-[9px] uppercase tracking-wider text-amber-400/60 font-bold">
                Hero Points
              </span>
              <div className="flex gap-1 mt-2">
                {[1, 2, 3].map((n) => (
                  <button
                    key={n}
                    disabled={!canEdit}
                    onClick={() =>
                      set({ heroPoints: d.heroPoints === n ? n - 1 : n })
                    }
                    className={`w-5 h-5 rounded-full border text-xs transition-all ${
                      n <= d.heroPoints
                        ? "bg-amber-500/40 border-amber-500/60 text-amber-400"
                        : "bg-white/5 border-white/15 text-white/20"
                    }`}
                  >
                    ◆
                  </button>
                ))}
              </div>
            </div>

            {/* Conditions */}
            <div className="bg-white/3 border border-white/8 rounded-xl p-3">
              <span className="text-[9px] uppercase tracking-wider text-red-400/60 font-bold">
                Conditions
              </span>
              <div className="grid grid-cols-2 gap-1 mt-1">
                {(
                  [
                    {
                      label: "Dying",
                      val: d.dying,
                      setVal: (v: number) => set({ dying: v }),
                    },
                    {
                      label: "Wounded",
                      val: d.wounded,
                      setVal: (v: number) => set({ wounded: v }),
                    },
                    {
                      label: "Drained",
                      val: d.drained,
                      setVal: (v: number) => set({ drained: v }),
                    },
                    {
                      label: "Doomed",
                      val: d.doomed,
                      setVal: (v: number) => set({ doomed: v }),
                    },
                  ] as {
                    label: string;
                    val: number;
                    setVal: (v: number) => void;
                  }[]
                ).map(({ label, val, setVal }) => (
                  <div key={label} className="flex items-center gap-1">
                    <span className="text-[9px] text-white/30 w-12">
                      {label}
                    </span>
                    {canEdit ? (
                      <NumInput
                        value={val}
                        onChange={setVal}
                        min={0}
                        max={4}
                        className="w-10"
                      />
                    ) : (
                      <span className="text-xs text-white/60">{val}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AC / Speed / Perception / Class DC */}
          <div className="flex gap-2 flex-wrap">
            <StatBox
              label="AC"
              value={d.ac}
              onChange={(v) => set({ ac: v })}
              canEdit={canEdit}
            />
            <StatBox
              label="Speed"
              value={d.speed}
              onChange={(v) => set({ speed: v })}
              sub="ft"
              canEdit={canEdit}
            />
            <div className="flex flex-col items-center gap-0.5 bg-white/3 border border-white/8 rounded-xl p-2 min-w-[72px]">
              <span className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">
                Perception
              </span>
              {canEdit ? (
                <NumInput
                  value={d.perception}
                  onChange={(v) => set({ perception: v })}
                  className="w-14 text-base font-bold"
                />
              ) : (
                <span className="text-base font-bold text-white/90">
                  {d.perception >= 0 ? `+${d.perception}` : d.perception}
                </span>
              )}
              <ProfSelect
                value={d.perceptionProficiency}
                onChange={(v) => set({ perceptionProficiency: v })}
                disabled={!canEdit}
              />
            </div>
            <div className="flex flex-col items-center gap-0.5 bg-white/3 border border-white/8 rounded-xl p-2 min-w-[72px]">
              <span className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">
                Class DC
              </span>
              {canEdit ? (
                <NumInput
                  value={d.classDC}
                  onChange={(v) => set({ classDC: v })}
                  className="w-14 text-base font-bold"
                />
              ) : (
                <span className="text-base font-bold text-white/90">
                  {d.classDC}
                </span>
              )}
              <ProfSelect
                value={d.classDCProficiency}
                onChange={(v) => set({ classDCProficiency: v })}
                disabled={!canEdit}
              />
            </div>
          </div>

          {/* Ability scores */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-400/60 font-bold mb-2">
              Ability Scores
            </p>
            <div className="flex gap-2">
              {(
                ["str", "dex", "con", "int", "wis", "cha"] as (keyof Pf2eData)[]
              ).map((ab) => (
                <AbilityBox
                  key={ab}
                  label={ab.toUpperCase()}
                  score={d[ab] as number}
                  onChange={(v) => set({ [ab]: v } as any)}
                  canEdit={canEdit}
                />
              ))}
            </div>
          </div>

          {/* Saving throws */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-400/60 font-bold mb-2">
              Saving Throws
            </p>
            <div className="flex gap-2">
              {(
                [
                  {
                    label: "Fortitude",
                    val: d.fortitude,
                    setVal: (v: number) => set({ fortitude: v }),
                    prof: d.fortitudeProficiency,
                    setProf: (v: string) => set({ fortitudeProficiency: v }),
                  },
                  {
                    label: "Reflex",
                    val: d.reflex,
                    setVal: (v: number) => set({ reflex: v }),
                    prof: d.reflexProficiency,
                    setProf: (v: string) => set({ reflexProficiency: v }),
                  },
                  {
                    label: "Will",
                    val: d.will,
                    setVal: (v: number) => set({ will: v }),
                    prof: d.willProficiency,
                    setProf: (v: string) => set({ willProficiency: v }),
                  },
                ] as {
                  label: string;
                  val: number;
                  setVal: (v: number) => void;
                  prof: string;
                  setProf: (v: string) => void;
                }[]
              ).map(({ label, val, setVal, prof, setProf }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-1 bg-white/3 border border-white/8 rounded-xl p-3 flex-1"
                >
                  <span className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">
                    {label}
                  </span>
                  {canEdit ? (
                    <NumInput
                      value={val}
                      onChange={setVal}
                      className="w-16 text-lg font-bold"
                    />
                  ) : (
                    <span className="text-lg font-bold text-white/90">
                      {val >= 0 ? `+${val}` : val}
                    </span>
                  )}
                  <ProfSelect
                    value={prof}
                    onChange={setProf}
                    disabled={!canEdit}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SKILLS ── */}
      {tab === "Skills" && (
        <div className="overflow-y-auto">
          <div className="flex flex-col gap-1">
            {(Object.entries(d.skills) as [string, any][]).map(
              ([key, skill]) => {
                const isLore = key === "lore1" || key === "lore2";
                const label = isLore
                  ? skill.name || "Lore"
                  : key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 px-3 py-2 bg-white/3 border border-white/8 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ProfSelect
                      value={skill.proficiency}
                      disabled={!canEdit}
                      onChange={(v) =>
                        set({
                          skills: {
                            ...d.skills,
                            [key]: { ...skill, proficiency: v },
                          },
                        })
                      }
                    />
                    <span
                      className={`text-xs w-24 flex-shrink-0 ${PROF_COLORS[skill.proficiency]}`}
                    >
                      {isLore && canEdit ? (
                        <input
                          value={skill.name}
                          onChange={(e) =>
                            set({
                              skills: {
                                ...d.skills,
                                [key]: { ...skill, name: e.target.value },
                              },
                            })
                          }
                          className="bg-transparent border-b border-white/20 focus:outline-none w-full text-xs"
                        />
                      ) : (
                        label
                      )}
                    </span>
                    {canEdit ? (
                      <NumInput
                        value={skill.bonus}
                        onChange={(v) =>
                          set({
                            skills: {
                              ...d.skills,
                              [key]: { ...skill, bonus: v },
                            },
                          })
                        }
                        className="w-14"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-white/80 tabular-nums w-8">
                        {skill.bonus >= 0 ? `+${skill.bonus}` : skill.bonus}
                      </span>
                    )}
                    {skill.armorPenalty && (
                      <span className="text-[9px] text-orange-400/50 ml-auto">
                        ACP
                      </span>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* ── ACTIONS ── */}
      {tab === "Actions" && (
        <div className="overflow-y-auto">
          {canEdit && (
            <button
              onClick={() =>
                set({
                  actions: [
                    ...d.actions,
                    { name: "", actionCost: "1", traits: "", description: "" },
                  ],
                })
              }
              className="mb-3 text-xs text-amber-400/60 hover:text-amber-400 transition-colors border border-amber-500/20 rounded-lg px-3 py-1.5 w-full"
            >
              + Add Action
            </button>
          )}
          <div className="flex flex-col gap-2">
            {d.actions.map((action, i) => (
              <div
                key={i}
                className="bg-white/3 border border-white/8 rounded-xl p-3"
              >
                {canEdit ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2 items-center">
                      {/* Action cost selector */}
                      <select
                        value={action.actionCost}
                        onChange={(e) => {
                          const n = [...d.actions];
                          n[i] = { ...n[i], actionCost: e.target.value as any };
                          set({ actions: n });
                        }}
                        className="bg-white/5 border border-white/10 rounded px-1.5 py-1 text-sm text-amber-400 font-bold w-16 focus:outline-none"
                      >
                        {Object.entries(ACTION_ICONS).map(([k, v]) => (
                          <option key={k} value={k} className="bg-[#1a1a2e]">
                            {v}
                          </option>
                        ))}
                      </select>
                      <TextInput
                        value={action.name}
                        onChange={(v) => {
                          const n = [...d.actions];
                          n[i] = { ...n[i], name: v };
                          set({ actions: n });
                        }}
                        placeholder="Action name"
                        className="flex-1 font-semibold"
                      />
                      <button
                        onClick={() => {
                          const n = [...d.actions];
                          n.splice(i, 1);
                          set({ actions: n });
                        }}
                        className="text-red-400/50 hover:text-red-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                    <TextInput
                      value={action.traits}
                      onChange={(v) => {
                        const n = [...d.actions];
                        n[i] = { ...n[i], traits: v };
                        set({ actions: n });
                      }}
                      placeholder="Traits (e.g. Attack, Manipulate)"
                    />
                    <textarea
                      value={action.description}
                      onChange={(e) => {
                        const n = [...d.actions];
                        n[i] = { ...n[i], description: e.target.value };
                        set({ actions: n });
                      }}
                      placeholder="Description"
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70
                        focus:outline-none focus:border-amber-500/50 resize-none"
                    />
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold text-sm w-8">
                        {ACTION_ICONS[action.actionCost] ?? action.actionCost}
                      </span>
                      <span className="text-sm font-semibold text-white/90">
                        {action.name}
                      </span>
                      {action.traits && (
                        <span className="text-[9px] text-white/30 ml-auto">
                          {action.traits}
                        </span>
                      )}
                    </div>
                    {action.description && (
                      <p className="text-[11px] text-white/50 mt-1 ml-10">
                        {action.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
            {d.actions.length === 0 && (
              <p className="text-[10px] text-white/20 text-center py-8">
                No actions added yet
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── FEATS ── */}
      {tab === "Feats" && (
        <div className="flex flex-col gap-4 overflow-y-auto">
          <FeatList
            title="Class Features"
            items={d.classFeatures}
            onChange={(v) => set({ classFeatures: v })}
            canEdit={canEdit}
          />
          <FeatList
            title="Ancestry Feats"
            items={d.ancestryFeats}
            onChange={(v) => set({ ancestryFeats: v })}
            canEdit={canEdit}
          />
          <FeatList
            title="Class Feats"
            items={d.classFeats}
            onChange={(v) => set({ classFeats: v })}
            canEdit={canEdit}
          />
          <FeatList
            title="Skill Feats"
            items={d.skillFeats}
            onChange={(v) => set({ skillFeats: v })}
            canEdit={canEdit}
          />
          <FeatList
            title="General Feats"
            items={d.generalFeats}
            onChange={(v) => set({ generalFeats: v })}
            canEdit={canEdit}
          />
        </div>
      )}

      {/* ── SPELLS ── */}
      {tab === "Spells" && (
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* Spellcasting header */}
          <div className="grid grid-cols-3 gap-2">
            <Field label="Tradition / Type">
              {canEdit ? (
                <select
                  value={d.spellcastingType}
                  onChange={(e) =>
                    set({ spellcastingType: e.target.value as any })
                  }
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="prepared">Prepared</option>
                  <option value="spontaneous">Spontaneous</option>
                  <option value="innate">Innate</option>
                </select>
              ) : (
                <span className="text-xs text-white/70 capitalize">
                  {d.spellcastingType}
                </span>
              )}
            </Field>
            <Field label="Key Ability">
              <TextInput
                value={d.spellcastingStat}
                onChange={(v) => set({ spellcastingStat: v })}
                placeholder="int / wis / cha"
                disabled={!canEdit}
              />
            </Field>
            <Field label="Proficiency">
              <ProfSelect
                value={d.spellProficiency}
                onChange={(v) => set({ spellProficiency: v })}
                disabled={!canEdit}
              />
            </Field>
            <Field label="Spell Attack">
              <NumInput
                value={d.spellAttackBonus}
                onChange={(v) => set({ spellAttackBonus: v })}
                className="w-20"
              />
            </Field>
            <Field label="Spell DC">
              <NumInput
                value={d.spellDC}
                onChange={(v) => set({ spellDC: v })}
                className="w-20"
              />
            </Field>
            <Field label="Focus Points">
              <div className="flex items-center gap-1">
                <NumInput
                  value={d.focusPoints}
                  onChange={(v) => set({ focusPoints: v })}
                  min={0}
                  max={3}
                  className="w-12"
                />
                <span className="text-white/30 text-xs">/</span>
                <NumInput
                  value={d.maxFocusPoints}
                  onChange={(v) => set({ maxFocusPoints: v })}
                  min={0}
                  max={3}
                  className="w-12"
                />
              </div>
            </Field>
          </div>

          {/* Spell slots */}
          {d.spellcastingType !== "none" && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-400/60 font-bold mb-2">
                Spell Slots
              </p>
              <div className="flex flex-wrap gap-2">
                {d.spellSlots
                  .filter((s) => s.total > 0 || canEdit)
                  .map((slot, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center gap-1 bg-white/3 border border-white/8 rounded-lg p-2 min-w-[60px]"
                    >
                      <span className="text-[9px] text-white/30">
                        {slot.level === 0 ? "Cantrip" : `Level ${slot.level}`}
                      </span>
                      {canEdit ? (
                        <div className="flex items-center gap-1">
                          <NumInput
                            value={slot.used}
                            onChange={(v) => {
                              const n = [...d.spellSlots];
                              n[i] = { ...n[i], used: v };
                              set({ spellSlots: n });
                            }}
                            min={0}
                            max={slot.total}
                            className="w-10"
                          />
                          <span className="text-white/25 text-xs">/</span>
                          <NumInput
                            value={slot.total}
                            onChange={(v) => {
                              const n = [...d.spellSlots];
                              n[i] = { ...n[i], total: v };
                              set({ spellSlots: n });
                            }}
                            min={0}
                            max={10}
                            className="w-10"
                          />
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-white/80">
                          {slot.used}/{slot.total}
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Spell list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/60 font-bold">
                Spells
              </p>
              {canEdit && (
                <button
                  onClick={() =>
                    set({
                      spells: [
                        ...d.spells,
                        {
                          spellLevel: 1,
                          name: "",
                          actionCost: "2",
                          traits: "",
                          description: "",
                          prepared: false,
                        },
                      ],
                    })
                  }
                  className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  + Add
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {d.spells.map((spell, i) => (
                <div
                  key={i}
                  className="bg-white/3 border border-white/8 rounded-xl p-2.5"
                >
                  {canEdit ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-2 items-center">
                        <NumInput
                          value={spell.spellLevel}
                          onChange={(v) => {
                            const n = [...d.spells];
                            n[i] = { ...n[i], spellLevel: v };
                            set({ spells: n });
                          }}
                          min={0}
                          max={10}
                          className="w-10"
                        />
                        <select
                          value={spell.actionCost}
                          onChange={(e) => {
                            const n = [...d.spells];
                            n[i] = {
                              ...n[i],
                              actionCost: e.target.value as any,
                            };
                            set({ spells: n });
                          }}
                          className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-amber-400 font-bold w-14 focus:outline-none"
                        >
                          {["1", "2", "3", "R", "F", "passive", "varies"].map(
                            (k) => (
                              <option
                                key={k}
                                value={k}
                                className="bg-[#1a1a2e]"
                              >
                                {ACTION_ICONS[k] ?? k}
                              </option>
                            ),
                          )}
                        </select>
                        <TextInput
                          value={spell.name}
                          onChange={(v) => {
                            const n = [...d.spells];
                            n[i] = { ...n[i], name: v };
                            set({ spells: n });
                          }}
                          placeholder="Spell name"
                          className="flex-1 font-semibold"
                        />
                        <button
                          onClick={() => {
                            const n = [...d.spells];
                            n.splice(i, 1);
                            set({ spells: n });
                          }}
                          className="text-red-400/50 hover:text-red-400 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <TextInput
                          value={spell.traits}
                          onChange={(v) => {
                            const n = [...d.spells];
                            n[i] = { ...n[i], traits: v };
                            set({ spells: n });
                          }}
                          placeholder="Traits"
                          className="flex-1"
                        />
                        <label className="flex items-center gap-1 text-[10px] text-white/40 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={spell.prepared}
                            onChange={(e) => {
                              const n = [...d.spells];
                              n[i] = { ...n[i], prepared: e.target.checked };
                              set({ spells: n });
                            }}
                            className="accent-amber-500"
                          />
                          Prepared
                        </label>
                      </div>
                      <textarea
                        value={spell.description}
                        onChange={(e) => {
                          const n = [...d.spells];
                          n[i] = { ...n[i], description: e.target.value };
                          set({ spells: n });
                        }}
                        placeholder="Description"
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70
                          focus:outline-none focus:border-amber-500/50 resize-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-white/30 w-6 text-center">
                          {spell.spellLevel === 0 ? "C" : spell.spellLevel}
                        </span>
                        <span className="text-amber-400 font-bold text-sm w-6">
                          {ACTION_ICONS[spell.actionCost] ?? spell.actionCost}
                        </span>
                        <span className="text-sm font-semibold text-white/90">
                          {spell.name}
                        </span>
                        {spell.prepared && (
                          <span className="text-[9px] text-sky-400/60 ml-auto">
                            Prepared
                          </span>
                        )}
                        {spell.traits && (
                          <span className="text-[9px] text-white/25 ml-auto">
                            {spell.traits}
                          </span>
                        )}
                      </div>
                      {spell.description && (
                        <p className="text-[11px] text-white/50 mt-1 ml-12">
                          {spell.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {d.spells.length === 0 && (
                <p className="text-[10px] text-white/20 text-center py-4">
                  No spells added yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EQUIPMENT ── */}
      {tab === "Equipment" && (
        <div className="flex flex-col gap-4 overflow-y-auto">
          {/* Currency */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-400/60 font-bold mb-2">
              Currency
            </p>
            <div className="flex gap-2">
              {(["pp", "gp", "sp", "cp"] as (keyof typeof d.currency)[]).map(
                (coin) => (
                  <div
                    key={coin}
                    className="flex flex-col items-center gap-0.5 bg-white/3 border border-white/8 rounded-lg p-2 flex-1"
                  >
                    <span className="text-[9px] uppercase text-white/30 font-semibold">
                      {coin}
                    </span>
                    {canEdit ? (
                      <NumInput
                        value={d.currency[coin]}
                        onChange={(v) =>
                          set({ currency: { ...d.currency, [coin]: v } })
                        }
                        className="w-16"
                      />
                    ) : (
                      <span className="text-sm font-bold text-white/80">
                        {d.currency[coin]}
                      </span>
                    )}
                  </div>
                ),
              )}
            </div>
          </div>

          {/* Bulk */}
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/30">Bulk:</span>
            {canEdit ? (
              <>
                <NumInput
                  value={d.bulk}
                  onChange={(v) => set({ bulk: v })}
                  min={0}
                  className="w-14"
                />
                <span className="text-white/20">/</span>
                <NumInput
                  value={d.maxBulk}
                  onChange={(v) => set({ maxBulk: v })}
                  min={0}
                  className="w-14"
                />
              </>
            ) : (
              <span className="text-xs text-white/60">
                {d.bulk} / {d.maxBulk}
              </span>
            )}
          </div>

          {/* Item list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] uppercase tracking-wider text-amber-400/60 font-bold">
                Items
              </p>
              {canEdit && (
                <button
                  onClick={() =>
                    set({
                      equipment: [
                        ...d.equipment,
                        {
                          name: "",
                          quantity: 1,
                          bulk: "L",
                          invested: false,
                          worn: false,
                          description: "",
                        },
                      ],
                    })
                  }
                  className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors"
                >
                  + Add
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {d.equipment.map((item, i) => (
                <div
                  key={i}
                  className="bg-white/3 border border-white/8 rounded-xl p-2.5"
                >
                  {canEdit ? (
                    <div className="flex flex-col gap-1">
                      <div className="flex gap-1.5 items-center">
                        <TextInput
                          value={item.name}
                          onChange={(v) => {
                            const n = [...d.equipment];
                            n[i] = { ...n[i], name: v };
                            set({ equipment: n });
                          }}
                          placeholder="Item name"
                          className="flex-1 font-semibold"
                        />
                        <NumInput
                          value={item.quantity}
                          onChange={(v) => {
                            const n = [...d.equipment];
                            n[i] = { ...n[i], quantity: v };
                            set({ equipment: n });
                          }}
                          min={1}
                          className="w-12"
                        />
                        <TextInput
                          value={String(item.bulk)}
                          onChange={(v) => {
                            const n = [...d.equipment];
                            n[i] = { ...n[i], bulk: v as any };
                            set({ equipment: n });
                          }}
                          placeholder="Bulk"
                          className="w-12"
                        />
                        <button
                          onClick={() => {
                            const n = [...d.equipment];
                            n.splice(i, 1);
                            set({ equipment: n });
                          }}
                          className="text-red-400/50 hover:text-red-400 text-xs px-1"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex gap-3 items-center">
                        <label className="flex items-center gap-1 text-[10px] text-white/40 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.worn}
                            onChange={(e) => {
                              const n = [...d.equipment];
                              n[i] = { ...n[i], worn: e.target.checked };
                              set({ equipment: n });
                            }}
                            className="accent-amber-500"
                          />{" "}
                          Worn
                        </label>
                        <label className="flex items-center gap-1 text-[10px] text-white/40 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.invested}
                            onChange={(e) => {
                              const n = [...d.equipment];
                              n[i] = { ...n[i], invested: e.target.checked };
                              set({ equipment: n });
                            }}
                            className="accent-amber-500"
                          />{" "}
                          Invested
                        </label>
                        <TextInput
                          value={item.description}
                          onChange={(v) => {
                            const n = [...d.equipment];
                            n[i] = { ...n[i], description: v };
                            set({ equipment: n });
                          }}
                          placeholder="Notes"
                          className="flex-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white/80">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-white/30">
                        ×{item.quantity}
                      </span>
                      <span className="text-[10px] text-white/25">
                        Bulk {item.bulk}
                      </span>
                      {item.worn && (
                        <span className="text-[9px] text-sky-400/50">Worn</span>
                      )}
                      {item.invested && (
                        <span className="text-[9px] text-violet-400/50">
                          Invested
                        </span>
                      )}
                      {item.description && (
                        <span className="text-[10px] text-white/30 ml-auto">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {d.equipment.length === 0 && (
                <p className="text-[10px] text-white/20 text-center py-4">
                  No equipment added yet
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── NOTES ── */}
      {tab === "Notes" && (
        <div className="flex flex-col gap-3 overflow-y-auto">
          {(
            [
              {
                label: "Appearance",
                val: d.appearance,
                setVal: (v: string) => set({ appearance: v }),
              },
              {
                label: "Backstory",
                val: d.backstory,
                setVal: (v: string) => set({ backstory: v }),
              },
              {
                label: "Notes",
                val: d.notes,
                setVal: (v: string) => set({ notes: v }),
              },
            ] as { label: string; val: string; setVal: (v: string) => void }[]
          ).map(({ label, val, setVal }) => (
            <Field key={label} label={label}>
              {canEdit ? (
                <textarea
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  rows={4}
                  placeholder={`${label}…`}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70
                      focus:outline-none focus:border-amber-500/50 resize-none"
                />
              ) : (
                <p className="text-xs text-white/60 whitespace-pre-wrap">
                  {val || "—"}
                </p>
              )}
            </Field>
          ))}
          {isGM && (
            <Field label="GM Notes (private)">
              {canEdit ? (
                <textarea
                  value={d.gmNotes}
                  onChange={(e) => set({ gmNotes: e.target.value })}
                  rows={3}
                  placeholder="Private GM notes…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70
                      focus:outline-none focus:border-amber-500/50 resize-none"
                />
              ) : (
                <p className="text-xs text-white/50 italic whitespace-pre-wrap">
                  {d.gmNotes || "—"}
                </p>
              )}
            </Field>
          )}
        </div>
      )}
    </div>
  );
}
