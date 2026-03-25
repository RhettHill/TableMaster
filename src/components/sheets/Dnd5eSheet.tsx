import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpellSlots {
  max: number;
  used: number;
}

export interface Dnd5eData {
  characterName: string;
  playerName: string;
  race: string;
  class: string;
  subclass: string;
  background: string;
  alignment: string;
  level: number;
  experiencePoints: number;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  ac: number;
  speed: number;
  hitDice: string;
  hitDiceTotal: number;
  saveProfStr: boolean;
  saveProfDex: boolean;
  saveProfCon: boolean;
  saveProfInt: boolean;
  saveProfWis: boolean;
  saveProfCha: boolean;
  skillProf: Record<string, 0 | 1 | 2>;
  deathSaveSuccesses: number;
  deathSaveFailures: number;
  attacks: { name: string; bonus: string; damage: string; type: string }[];
  spellcastingAbility: string;
  spellSlots: Record<number, SpellSlots>;
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
  equipment: string;
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  featuresTraits: string;
  proficienciesLanguages: string;
  notes: string;
}

export const DEFAULT_DND5E: Dnd5eData = {
  characterName: "",
  playerName: "",
  race: "",
  class: "",
  subclass: "",
  background: "",
  alignment: "",
  level: 1,
  experiencePoints: 0,
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  hp: 0,
  maxHp: 0,
  tempHp: 0,
  ac: 10,
  speed: 30,
  hitDice: "d8",
  hitDiceTotal: 1,
  saveProfStr: false,
  saveProfDex: false,
  saveProfCon: false,
  saveProfInt: false,
  saveProfWis: false,
  saveProfCha: false,
  skillProf: {},
  deathSaveSuccesses: 0,
  deathSaveFailures: 0,
  attacks: [],
  spellcastingAbility: "int",
  spellSlots: Object.fromEntries(
    [1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => [l, { max: 0, used: 0 }]),
  ) as Record<number, SpellSlots>,
  cp: 0,
  sp: 0,
  ep: 0,
  gp: 0,
  pp: 0,
  equipment: "",
  personalityTraits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  featuresTraits: "",
  proficienciesLanguages: "",
  notes: "",
};

// ── Calculations ──────────────────────────────────────────────────────────────

const mod = (s: number) => Math.floor((s - 10) / 2);
const modStr = (s: number) => {
  const m = mod(s);
  return (m >= 0 ? "+" : "") + m;
};
const profBonus = (lvl: number) => Math.ceil(lvl / 4) + 1;

const SKILLS = [
  { key: "acrobatics", label: "Acrobatics", ab: "dex" },
  { key: "animalHandling", label: "Animal Handling", ab: "wis" },
  { key: "arcana", label: "Arcana", ab: "int" },
  { key: "athletics", label: "Athletics", ab: "str" },
  { key: "deception", label: "Deception", ab: "cha" },
  { key: "history", label: "History", ab: "int" },
  { key: "insight", label: "Insight", ab: "wis" },
  { key: "intimidation", label: "Intimidation", ab: "cha" },
  { key: "investigation", label: "Investigation", ab: "int" },
  { key: "medicine", label: "Medicine", ab: "wis" },
  { key: "nature", label: "Nature", ab: "int" },
  { key: "perception", label: "Perception", ab: "wis" },
  { key: "performance", label: "Performance", ab: "cha" },
  { key: "persuasion", label: "Persuasion", ab: "cha" },
  { key: "religion", label: "Religion", ab: "int" },
  { key: "sleightOfHand", label: "Sleight of Hand", ab: "dex" },
  { key: "stealth", label: "Stealth", ab: "dex" },
  { key: "survival", label: "Survival", ab: "wis" },
];

function skillBonus(d: Dnd5eData, key: string, ab: string) {
  const base = mod(d[ab as keyof Dnd5eData] as number);
  const prof = d.skillProf[key] ?? 0;
  const pb = profBonus(d.level);
  return base + (prof === 2 ? pb * 2 : prof === 1 ? pb : 0);
}
function saveBonus(d: Dnd5eData, ab: string) {
  const score = d[ab as keyof Dnd5eData] as number;
  const profKey =
    `saveProf${ab.charAt(0).toUpperCase() + ab.slice(1)}` as keyof Dnd5eData;
  return mod(score) + ((d[profKey] as boolean) ? profBonus(d.level) : 0);
}
function spellAtk(d: Dnd5eData) {
  return (
    mod(d[d.spellcastingAbility as keyof Dnd5eData] as number) +
    profBonus(d.level)
  );
}
const spellDC = (d: Dnd5eData) => 8 + spellAtk(d);

// ── Tiny shared primitives ────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      <div className="text-[9px] font-bold text-red-400 uppercase tracking-widest text-center mb-1 border-b border-red-900/40 pb-0.5">
        {title}
      </div>
      {children}
    </div>
  );
}

const inputCls =
  "bg-transparent text-white/80 text-xs focus:outline-none border-b border-white/10 focus:border-amber-500/50 w-full placeholder-white/20 transition-colors";
const numCls = `${inputCls} text-center tabular-nums`;

function TI({
  value,
  onChange,
  placeholder = "",
  multiline = false,
  rows = 3,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
}) {
  if (multiline)
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`${inputCls} resize-none disabled:opacity-40`}
      />
    );
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`${inputCls} disabled:opacity-40`}
    />
  );
}

function NI({
  value,
  onChange,
  min = 0,
  max = 999,
  disabled = false,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) =>
        onChange(Math.max(min, Math.min(max, Number(e.target.value))))
      }
      className={`${numCls} disabled:opacity-40`}
    />
  );
}

function TogglePill({ on }: { on: boolean }) {
  return (
    <span
      className={`text-[9px] px-1 py-0.5 rounded border ${on ? "bg-amber-500/20 border-amber-500/30 text-amber-300" : "border-white/10 text-white/20"}`}
    >
      {on ? "●" : "○"}
    </span>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
type Tab = "core" | "skills" | "combat" | "spells" | "equipment" | "traits";
const TABS: { key: Tab; label: string }[] = [
  { key: "core", label: "Core" },
  { key: "skills", label: "Skills" },
  { key: "combat", label: "Combat" },
  { key: "spells", label: "Spells" },
  { key: "equipment", label: "Items" },
  { key: "traits", label: "Traits" },
];

// ── Main ──────────────────────────────────────────────────────────────────────

interface Props {
  data: Partial<Dnd5eData>;
  canEdit: boolean;
  isGM: boolean;
  onChange: (patch: Partial<Dnd5eData>) => void;
}

export default function Dnd5eSheet({ data, canEdit, isGM, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("core");
  const d = { ...DEFAULT_DND5E, ...data };
  const set = (patch: Partial<Dnd5eData>) => {
    if (canEdit) onChange(patch);
  };
  const pb = profBonus(d.level);

  return (
    <div>
      {/* Tabs */}
      <div className="flex border-b border-white/8 bg-[#0d0d14] flex-shrink-0">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${tab === t.key ? "text-amber-400 border-b-2 border-amber-500" : "text-white/30 hover:text-white/60"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        className="overflow-y-auto p-4 space-y-3"
        style={{
          maxHeight: "calc(90vh - 130px)",
          fontFamily: "'Georgia', serif",
        }}
      >
        {/* ════ CORE ════ */}
        {tab === "core" && (
          <>
            <Section title="Character Info">
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["characterName", "Character Name"],
                    ["playerName", "Player Name"],
                    ["race", "Race"],
                    ["class", "Class"],
                    ["subclass", "Subclass"],
                    ["background", "Background"],
                    ["alignment", "Alignment"],
                  ] as [keyof Dnd5eData, string][]
                ).map(([k, label]) => (
                  <div key={k} className="flex flex-col gap-0.5">
                    <span className="text-[9px] text-white/30 uppercase tracking-wider">
                      {label}
                    </span>
                    <TI
                      value={d[k] as string}
                      onChange={(v) => set({ [k]: v } as any)}
                      placeholder={label}
                      disabled={!canEdit}
                    />
                  </div>
                ))}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    Level
                  </span>
                  <NI
                    value={d.level}
                    onChange={(v) => set({ level: v })}
                    min={1}
                    max={20}
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    XP
                  </span>
                  <NI
                    value={d.experiencePoints}
                    onChange={(v) => set({ experiencePoints: v })}
                    min={0}
                    max={999999}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </Section>

            <Section title="Ability Scores">
              <div className="grid grid-cols-6 gap-1.5">
                {(
                  [
                    ["STR", "str", "saveProfStr"],
                    ["DEX", "dex", "saveProfDex"],
                    ["CON", "con", "saveProfCon"],
                    ["INT", "int", "saveProfInt"],
                    ["WIS", "wis", "saveProfWis"],
                    ["CHA", "cha", "saveProfCha"],
                  ] as [string, keyof Dnd5eData, keyof Dnd5eData][]
                ).map(([label, ab, profKey]) => {
                  const score = d[ab] as number;
                  const isProfSave = d[profKey] as boolean;
                  const sb = saveBonus(d, ab as string);
                  return (
                    <div
                      key={label}
                      className="flex flex-col items-center border border-white/12 rounded-xl bg-[#0d0d14] p-2 gap-1"
                    >
                      <span className="text-[9px] text-white/50 uppercase font-bold">
                        {label}
                      </span>
                      <input
                        type="number"
                        value={score}
                        min={1}
                        max={30}
                        disabled={!canEdit}
                        onChange={(e) =>
                          set({ [ab]: Number(e.target.value) } as any)
                        }
                        className="w-10 h-8 text-sm font-bold bg-transparent text-white text-center border border-white/15 rounded-lg focus:outline-none focus:border-amber-500/60 tabular-nums disabled:opacity-40"
                      />
                      <div className="text-base font-bold text-white">
                        {modStr(score)}
                      </div>
                      <button
                        disabled={!canEdit}
                        onClick={() => set({ [profKey]: !isProfSave } as any)}
                        className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border transition-colors disabled:opacity-40 ${isProfSave ? "bg-amber-500/20 border-amber-500/30 text-amber-400" : "border-white/10 text-white/30"}`}
                      >
                        <TogglePill on={isProfSave} />
                        <span>{(sb >= 0 ? "+" : "") + sb}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 text-center">
                <span className="text-[9px] text-white/25">Prof Bonus: </span>
                <span className="text-[9px] text-amber-400 font-semibold">
                  +{pb}
                </span>
                <span className="text-[9px] text-white/25 ml-3">
                  Passive Perception:{" "}
                </span>
                <span className="text-[9px] text-amber-400 font-semibold">
                  {10 + skillBonus(d, "perception", "wis")}
                </span>
              </div>
            </Section>
          </>
        )}

        {/* ════ SKILLS ════ */}
        {tab === "skills" && (
          <Section title="Skills — click to cycle: none → proficient → expertise">
            {SKILLS.map((s) => {
              const prof = (d.skillProf[s.key] ?? 0) as 0 | 1 | 2;
              const bonus = skillBonus(d, s.key, s.ab);
              const icon = prof === 2 ? "◉" : prof === 1 ? "●" : "○";
              const color =
                prof === 2
                  ? "text-amber-400"
                  : prof === 1
                    ? "text-emerald-400"
                    : "text-white/25";
              return (
                <div
                  key={s.key}
                  onClick={() =>
                    canEdit &&
                    set({
                      skillProf: {
                        ...d.skillProf,
                        [s.key]: ((prof + 1) % 3) as 0 | 1 | 2,
                      },
                    })
                  }
                  className={`flex items-center gap-1.5 py-0.5 rounded px-1 ${canEdit ? "cursor-pointer hover:bg-white/3" : ""}`}
                >
                  <span className={`text-xs ${color} w-3 flex-shrink-0`}>
                    {icon}
                  </span>
                  <span className="text-[10px] text-white/60 flex-1">
                    {s.label}
                  </span>
                  <span className="text-[10px] text-white/40 uppercase w-6 text-right">
                    {s.ab.slice(0, 3).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-white font-semibold w-6 text-right tabular-nums">
                    {(bonus >= 0 ? "+" : "") + bonus}
                  </span>
                </div>
              );
            })}
          </Section>
        )}

        {/* ════ COMBAT ════ */}
        {tab === "combat" && (
          <>
            <Section title="Core Stats">
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    HP / Max HP
                  </span>
                  <div className="flex gap-1 items-center">
                    <NI
                      value={d.hp}
                      onChange={(v) => set({ hp: v })}
                      min={-999}
                      disabled={!canEdit}
                    />
                    <span className="text-white/30 text-xs">/</span>
                    <NI
                      value={d.maxHp}
                      onChange={(v) => set({ maxHp: v })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    Temp HP
                  </span>
                  <NI
                    value={d.tempHp}
                    onChange={(v) => set({ tempHp: v })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    AC
                  </span>
                  <NI
                    value={d.ac}
                    onChange={(v) => set({ ac: v })}
                    min={0}
                    max={40}
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    Speed
                  </span>
                  <NI
                    value={d.speed}
                    onChange={(v) => set({ speed: v })}
                    disabled={!canEdit}
                  />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    Initiative
                  </span>
                  <div className="text-sm font-bold text-white text-center border-b border-white/10">
                    {modStr(d.dex)}
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    Hit Dice
                  </span>
                  <TI
                    value={d.hitDice}
                    onChange={(v) => set({ hitDice: v })}
                    placeholder="d8"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </Section>

            <Section title="Death Saves">
              <div className="flex items-center gap-6">
                {(
                  [
                    ["Successes", "deathSaveSuccesses", "emerald"],
                    ["Failures", "deathSaveFailures", "red"],
                  ] as const
                ).map(([label, key, color]) => (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <span
                      className={`text-[9px] text-${color}-400/70 uppercase tracking-wider`}
                    >
                      {label}
                    </span>
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <button
                          key={i}
                          disabled={!canEdit}
                          onClick={() =>
                            set({ [key]: i < d[key] ? i : i + 1 } as any)
                          }
                          className={`w-5 h-5 rounded-full border transition-colors disabled:opacity-40 ${i < d[key] ? `bg-${color}-500/60 border-${color}-500/60` : "border-white/25"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <button
                  disabled={!canEdit}
                  onClick={() =>
                    set({ deathSaveSuccesses: 0, deathSaveFailures: 0 })
                  }
                  className="text-[10px] text-white/20 hover:text-white/50 ml-auto disabled:opacity-40"
                >
                  Reset
                </button>
              </div>
            </Section>

            <Section title="Attacks">
              <div className="space-y-1">
                {d.attacks.map((atk, i) => (
                  <div key={i} className="grid grid-cols-4 gap-1 items-end">
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <span className="text-[9px] text-white/20">Name</span>
                      <TI
                        value={atk.name}
                        onChange={(v) => {
                          const a = [...d.attacks];
                          a[i] = { ...a[i], name: v };
                          set({ attacks: a });
                        }}
                        placeholder="Attack"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-white/20">Bonus</span>
                      <TI
                        value={atk.bonus}
                        onChange={(v) => {
                          const a = [...d.attacks];
                          a[i] = { ...a[i], bonus: v };
                          set({ attacks: a });
                        }}
                        placeholder="+5"
                        disabled={!canEdit}
                      />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] text-white/20">Damage</span>
                      <TI
                        value={atk.damage}
                        onChange={(v) => {
                          const a = [...d.attacks];
                          a[i] = { ...a[i], damage: v };
                          set({ attacks: a });
                        }}
                        placeholder="1d8+3"
                        disabled={!canEdit}
                      />
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => {
                          const a = [...d.attacks];
                          a.splice(i, 1);
                          set({ attacks: a });
                        }}
                        className="col-span-4 text-[9px] text-red-400/40 hover:text-red-400 text-right"
                      >
                        remove
                      </button>
                    )}
                  </div>
                ))}
                {canEdit && (
                  <button
                    onClick={() =>
                      set({
                        attacks: [
                          ...d.attacks,
                          { name: "", bonus: "", damage: "", type: "" },
                        ],
                      })
                    }
                    className="text-[10px] text-amber-400/50 hover:text-amber-400 transition-colors mt-1"
                  >
                    + Add attack
                  </button>
                )}
              </div>
            </Section>
          </>
        )}

        {/* ════ SPELLS ════ */}
        {tab === "spells" && (
          <>
            <Section title="Spellcasting">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] text-white/30 uppercase tracking-wider">
                    Ability
                  </span>
                  <select
                    value={d.spellcastingAbility}
                    disabled={!canEdit}
                    onChange={(e) =>
                      set({ spellcastingAbility: e.target.value })
                    }
                    className="bg-[#0d0d14] text-white text-xs border border-white/10 rounded px-2 py-1 focus:outline-none focus:border-amber-500/60 disabled:opacity-40"
                  >
                    {["str", "dex", "con", "int", "wis", "cha"].map((a) => (
                      <option key={a} value={a}>
                        {a.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col items-center justify-center border border-white/12 rounded-lg bg-[#0d0d14] p-2">
                  <span className="text-[9px] text-white/40 uppercase">
                    Save DC
                  </span>
                  <span className="text-lg font-bold text-white">
                    {spellDC(d)}
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center border border-white/12 rounded-lg bg-[#0d0d14] p-2">
                  <span className="text-[9px] text-white/40 uppercase">
                    Atk Bonus
                  </span>
                  <span className="text-lg font-bold text-white">
                    {(spellAtk(d) >= 0 ? "+" : "") + spellAtk(d)}
                  </span>
                </div>
              </div>
            </Section>

            <Section title="Spell Slots">
              {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((lvl) => {
                const slots = d.spellSlots[lvl] ?? { max: 0, used: 0 };
                if (slots.max === 0 && !canEdit) return null;
                return (
                  <div key={lvl} className="flex items-center gap-2 py-0.5">
                    <span className="text-[9px] text-white/40 w-8">
                      Lvl {lvl}
                    </span>
                    {slots.max > 0 ? (
                      <>
                        <div className="flex gap-0.5">
                          {Array.from({ length: slots.max }).map((_, i) => (
                            <button
                              key={i}
                              disabled={!canEdit}
                              onClick={() => {
                                const next = {
                                  ...slots,
                                  used: i < slots.used ? i : i + 1,
                                };
                                set({
                                  spellSlots: { ...d.spellSlots, [lvl]: next },
                                });
                              }}
                              className={`w-3.5 h-3.5 rounded-full border transition-colors disabled:opacity-40 ${i < slots.used ? "bg-red-500/60 border-red-500/60" : "border-white/30 hover:border-amber-500/60"}`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                          {canEdit && (
                            <>
                              <button
                                onClick={() =>
                                  set({
                                    spellSlots: {
                                      ...d.spellSlots,
                                      [lvl]: {
                                        ...slots,
                                        max: Math.max(0, slots.max - 1),
                                      },
                                    },
                                  })
                                }
                                className="text-[9px] text-white/20 hover:text-white/60"
                              >
                                −
                              </button>
                              <span className="text-[9px] text-white/30">
                                {slots.max}
                              </span>
                              <button
                                onClick={() =>
                                  set({
                                    spellSlots: {
                                      ...d.spellSlots,
                                      [lvl]: {
                                        ...slots,
                                        max: Math.min(9, slots.max + 1),
                                      },
                                    },
                                  })
                                }
                                className="text-[9px] text-white/20 hover:text-white/60"
                              >
                                +
                              </button>
                              <button
                                onClick={() =>
                                  set({
                                    spellSlots: {
                                      ...d.spellSlots,
                                      [lvl]: { ...slots, used: 0 },
                                    },
                                  })
                                }
                                className="text-[9px] text-white/20 hover:text-emerald-400 ml-1"
                              >
                                ↺
                              </button>
                            </>
                          )}
                        </div>
                      </>
                    ) : canEdit ? (
                      <button
                        onClick={() =>
                          set({
                            spellSlots: {
                              ...d.spellSlots,
                              [lvl]: { max: 1, used: 0 },
                            },
                          })
                        }
                        className="text-[9px] text-white/20 hover:text-amber-400"
                      >
                        + add slots
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </Section>
          </>
        )}

        {/* ════ EQUIPMENT ════ */}
        {tab === "equipment" && (
          <>
            <Section title="Currency">
              <div className="grid grid-cols-5 gap-2">
                {(["cp", "sp", "ep", "gp", "pp"] as (keyof Dnd5eData)[]).map(
                  (k) => (
                    <div key={k} className="flex flex-col items-center gap-0.5">
                      <span className="text-[9px] text-white/30 uppercase">
                        {k}
                      </span>
                      <NI
                        value={d[k] as number}
                        onChange={(v) => set({ [k]: v } as any)}
                        min={0}
                        max={99999}
                        disabled={!canEdit}
                      />
                    </div>
                  ),
                )}
              </div>
            </Section>
            <Section title="Equipment & Items">
              <TI
                value={d.equipment}
                onChange={(v) => set({ equipment: v })}
                placeholder="List items…"
                multiline
                rows={6}
                disabled={!canEdit}
              />
            </Section>
            <Section title="Proficiencies & Languages">
              <TI
                value={d.proficienciesLanguages}
                onChange={(v) => set({ proficienciesLanguages: v })}
                placeholder="Armor, weapons, tools, languages…"
                multiline
                rows={3}
                disabled={!canEdit}
              />
            </Section>
          </>
        )}

        {/* ════ TRAITS ════ */}
        {tab === "traits" &&
          (
            [
              ["personalityTraits", "Personality Traits"],
              ["ideals", "Ideals"],
              ["bonds", "Bonds"],
              ["flaws", "Flaws"],
              ["featuresTraits", "Features & Traits"],
              ["notes", "Notes"],
            ] as [keyof Dnd5eData, string][]
          ).map(([k, label]) => {
            return (
              <Section key={k} title={label}>
                <TI
                  value={d[k] as string}
                  onChange={(v) => set({ [k]: v } as any)}
                  placeholder={label}
                  multiline
                  rows={3}
                  disabled={!canEdit}
                />
              </Section>
            );
          })}
      </div>
    </div>
  );
}
