// Pathfinder 2e NPC Stat Block — Bestiary style layout

export interface Pf2eStatBlockData {
  // Header
  name: string;
  level: number; // creature level (-1 to 25)
  rarity: string; // Common / Uncommon / Rare / Unique
  size: string;
  traits: string; // comma-separated
  alignment: string;

  // Core defenses
  ac: number;
  acNote: string;
  maxHp: number;
  hpNote: string; // e.g. regeneration
  hardness: number; // for objects/constructs

  // Speeds
  speed: string; // e.g. "25 ft., fly 40 ft."

  // Ability modifiers (PF2e uses mods directly, not scores)
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // Saving throws
  fortitude: number;
  reflex: number;
  will: number;
  saveNotes: string; // e.g. "+1 status to all saves vs magic"

  // Perception
  perception: number;
  perceptionNote: string; // senses

  // Skills
  skills: string; // e.g. "Acrobatics +12, Stealth +15 (in forests +17)"

  // Resistances, immunities, weaknesses
  immunities: string;
  resistances: string;
  weaknesses: string;

  // Languages
  languages: string;

  // Abilities / Passive traits
  passives: { name: string; traits: string; description: string }[];

  // Actions (with PF2e action cost)
  actions: {
    name: string;
    actionCost: "1" | "2" | "3" | "R" | "F" | "passive";
    traits: string;
    description: string;
  }[];

  // Spellcasting
  spellcasting: {
    tradition: string; // arcane / divine / occult / primal
    type: string; // innate / prepared / spontaneous
    dc: number;
    attackBonus: number;
    spells: { level: number; list: string }[];
  }[];

  // GM notes
  gmNotes: string;
}

export const DEFAULT_PF2E_STAT_BLOCK: Pf2eStatBlockData = {
  name: "Unnamed Creature",
  level: 1,
  rarity: "Common",
  size: "Medium",
  traits: "",
  alignment: "",
  ac: 15,
  acNote: "",
  maxHp: 20,
  hpNote: "",
  hardness: 0,
  speed: "25 ft.",
  str: 0,
  dex: 0,
  con: 0,
  int: 0,
  wis: 0,
  cha: 0,
  fortitude: 0,
  reflex: 0,
  will: 0,
  saveNotes: "",
  perception: 0,
  perceptionNote: "",
  skills: "",
  immunities: "",
  resistances: "",
  weaknesses: "",
  languages: "",
  passives: [],
  actions: [],
  spellcasting: [],
  gmNotes: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const modStr = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

const ACTION_ICONS: Record<string, string> = {
  "1": "◆",
  "2": "◆◆",
  "3": "◆◆◆",
  R: "↺",
  F: "◇",
  passive: "—",
};

const RARITY_COLOR: Record<string, string> = {
  Common: "text-white/50",
  Uncommon: "text-green-400",
  Rare: "text-sky-400",
  Unique: "text-violet-400",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-amber-800/40 my-1.5" />;
}

function StatLine({ label, value }: { label: string; value: string | number }) {
  if (!value && value !== 0) return null;
  return (
    <p className="text-[11px] text-white/80 leading-snug">
      <span className="font-bold text-white/90">{label} </span>
      {value}
    </p>
  );
}

function EText({
  value,
  onChange,
  placeholder = "",
  bold = false,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  bold?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white/80 w-full
        focus:outline-none focus:border-amber-500/50 ${bold ? "font-bold" : ""} ${className}`}
    />
  );
}

function ENum({
  value,
  onChange,
  min = -99,
  max = 999,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-14 bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-center
        text-white/80 focus:outline-none focus:border-amber-500/50 tabular-nums"
    />
  );
}

function AbilityRow({
  d,
  isEditing,
  set,
}: {
  d: Pf2eStatBlockData;
  isEditing: boolean;
  set: (patch: Partial<Pf2eStatBlockData>) => void;
}) {
  const abilities = [
    "str",
    "dex",
    "con",
    "int",
    "wis",
    "cha",
  ] as (keyof Pf2eStatBlockData)[];
  return (
    <div className="flex gap-1">
      {abilities.map((ab) => (
        <div key={ab} className="flex flex-col items-center flex-1">
          <span className="text-[9px] font-bold text-amber-400/70 uppercase">
            {ab}
          </span>
          {isEditing ? (
            <ENum
              value={d[ab] as number}
              onChange={(v) => set({ [ab]: v } as any)}
            />
          ) : (
            <span className="text-xs font-semibold text-white/80">
              {modStr(d[ab] as number)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

type PassiveItem = { name: string; traits: string; description: string };
type CostItem = {
  name: string;
  actionCost: string;
  traits: string;
  description: string;
};
type ActionItem = PassiveItem | CostItem;

function isCostItem(item: ActionItem): item is CostItem {
  return "actionCost" in item;
}

function ActionList({
  title,
  items,
  isEditing,
  onChange,
  showCost = true,
}: {
  title: string;
  items: ActionItem[];
  isEditing: boolean;
  onChange: (v: ActionItem[]) => void;
  showCost?: boolean;
}) {
  if (!isEditing && items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400/70 border-b border-amber-800/30 pb-0.5 mb-1">
        {title}
      </p>
      {items.map((item, i) => (
        <div key={i} className="mb-1.5">
          {isEditing ? (
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-1 items-center">
                {showCost && (
                  <select
                    value={(item as CostItem).actionCost}
                    onChange={(e) => {
                      const n = [...items];
                      n[i] = {
                        ...(item as CostItem),
                        actionCost: e.target.value,
                      } as CostItem;
                      onChange(n);
                    }}
                    className="bg-white/5 border border-white/10 rounded px-1 py-0.5 text-xs text-amber-400 font-bold w-12 focus:outline-none"
                  >
                    {Object.entries(ACTION_ICONS).map(([k, v]) => (
                      <option key={k} value={k} className="bg-[#1a1a2e]">
                        {v}
                      </option>
                    ))}
                  </select>
                )}
                <EText
                  value={item.name}
                  onChange={(v) => {
                    const n = [...items];
                    n[i] = { ...n[i], name: v };
                    onChange(n);
                  }}
                  placeholder="Name"
                  bold
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
              <EText
                value={item.traits}
                onChange={(v) => {
                  const n = [...items];
                  n[i] = { ...n[i], traits: v };
                  onChange(n);
                }}
                placeholder="Traits"
              />
              <textarea
                value={item.description}
                onChange={(e) => {
                  const n = [...items];
                  n[i] = { ...n[i], description: e.target.value };
                  onChange(n);
                }}
                placeholder="Description"
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white/70
                  focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>
          ) : (
            <p className="text-[11px] text-white/80 leading-snug">
              {showCost && (
                <span className="text-amber-400 font-bold mr-1">
                  {isCostItem(item)
                    ? (ACTION_ICONS[item.actionCost] ?? item.actionCost)
                    : "—"}
                </span>
              )}
              <span className="font-bold text-white/90">{item.name}</span>
              {item.traits && (
                <span className="text-[9px] text-white/40">
                  {" "}
                  ({item.traits})
                </span>
              )}
              {item.description && (
                <span className="text-white/60"> {item.description}</span>
              )}
            </p>
          )}
        </div>
      ))}
      {isEditing && (
        <button
          onClick={() =>
            onChange([
              ...items,
              { name: "", actionCost: "1", traits: "", description: "" },
            ])
          }
          className="text-[10px] text-amber-400/60 hover:text-amber-400 transition-colors mt-0.5"
        >
          + Add {title.replace(/s$/, "")}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data: Partial<Pf2eStatBlockData>;
  canEdit: boolean;
  isGM: boolean;
  onChange: (patch: Partial<Pf2eStatBlockData>) => void;
}

export default function Pf2eStatBlock({
  data,
  canEdit,
  isGM,
  onChange,
}: Props) {
  const d = { ...DEFAULT_PF2E_STAT_BLOCK, ...data };
  const set = (patch: Partial<Pf2eStatBlockData>) => {
    if (canEdit) onChange(patch);
  };
  const setPassives = (v: ActionItem[]) =>
    set({
      passives: v.map((i) => ({
        name: i.name,
        traits: i.traits,
        description: i.description,
      })),
    });
  const setActions = (v: ActionItem[]) =>
    set({
      actions: v.map((i) => {
        const cost = isCostItem(i) ? i.actionCost : "1";
        return {
          name: i.name,
          actionCost: cost as any,
          traits: i.traits,
          description: i.description,
        };
      }),
    });
  const isEditing = canEdit;

  return (
    <div className="font-sans bg-[#1a1008] text-white/80 p-4 rounded border-2 border-amber-800/60 shadow-md">
      {/* ── Name & level ── */}
      {isEditing ? (
        <div className="mb-2 flex flex-col gap-1">
          <EText
            value={d.name}
            onChange={(v) => set({ name: v })}
            placeholder="Creature Name"
            bold
            className="text-lg"
          />
          <div className="flex gap-1 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-white/40">Level</span>
              <ENum
                value={d.level}
                onChange={(v) => set({ level: v })}
                min={-1}
                max={25}
              />
            </div>
            <EText
              value={d.size}
              onChange={(v) => set({ size: v })}
              placeholder="Size"
              className="w-20"
            />
            <EText
              value={d.alignment}
              onChange={(v) => set({ alignment: v })}
              placeholder="Alignment"
              className="w-20"
            />
            <select
              value={d.rarity}
              onChange={(e) => set({ rarity: e.target.value })}
              className="bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white/80 focus:outline-none"
            >
              {["Common", "Uncommon", "Rare", "Unique"].map((r) => (
                <option key={r} value={r} className="bg-[#1a1a2e]">
                  {r}
                </option>
              ))}
            </select>
          </div>
          <EText
            value={d.traits}
            onChange={(v) => set({ traits: v })}
            placeholder="Traits (comma-separated)"
          />
        </div>
      ) : (
        <div className="mb-2">
          <div className="flex items-baseline gap-2">
            <h2 className="text-lg font-bold text-amber-200">{d.name}</h2>
            <span className="text-sm font-semibold text-white/60">
              Creature {d.level}
            </span>
          </div>
          <div className="flex flex-wrap gap-1 mt-0.5">
            {d.rarity !== "Common" && (
              <span
                className={`text-[10px] font-bold uppercase ${RARITY_COLOR[d.rarity] ?? "text-white/50"}`}
              >
                {d.rarity}
              </span>
            )}
            {d.alignment && (
              <span className="text-[10px] text-white/50">{d.alignment}</span>
            )}
            <span className="text-[10px] text-white/50">{d.size}</span>
            {d.traits &&
              d.traits.split(",").map((t, i) => (
                <span
                  key={i}
                  className="text-[10px] bg-amber-900/30 border border-amber-700/30 px-1.5 py-0.5 rounded text-amber-300/70"
                >
                  {t.trim()}
                </span>
              ))}
          </div>
        </div>
      )}

      <Divider />

      {/* ── Perception / Languages / Skills ── */}
      {isEditing ? (
        <div className="flex flex-col gap-1 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/50 w-20">
              Perception
            </span>
            <ENum
              value={d.perception}
              onChange={(v) => set({ perception: v })}
            />
            <EText
              value={d.perceptionNote}
              onChange={(v) => set({ perceptionNote: v })}
              placeholder="senses"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/50 w-20">
              Languages
            </span>
            <EText
              value={d.languages}
              onChange={(v) => set({ languages: v })}
              placeholder="Languages"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/50 w-20">
              Skills
            </span>
            <EText
              value={d.skills}
              onChange={(v) => set({ skills: v })}
              placeholder="e.g. Stealth +12, Athletics +8"
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="mb-1">
          <StatLine
            label="Perception"
            value={`${modStr(d.perception)}${d.perceptionNote ? `; ${d.perceptionNote}` : ""}`}
          />
          <StatLine label="Languages" value={d.languages} />
          <StatLine label="Skills" value={d.skills} />
        </div>
      )}

      <Divider />

      {/* ── Ability modifiers ── */}
      <AbilityRow d={d} isEditing={isEditing} set={set} />

      <Divider />

      {/* ── AC / HP / Saves ── */}
      {isEditing ? (
        <div className="flex flex-col gap-1 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-white/50 w-6">AC</span>
            <ENum value={d.ac} onChange={(v) => set({ ac: v })} />
            <EText
              value={d.acNote}
              onChange={(v) => set({ acNote: v })}
              placeholder="note"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold text-white/50 w-6">HP</span>
            <ENum value={d.maxHp} onChange={(v) => set({ maxHp: v })} />
            <EText
              value={d.hpNote}
              onChange={(v) => set({ hpNote: v })}
              placeholder="note (e.g. regeneration 10)"
              className="flex-1"
            />
          </div>
          {[
            ["Immunities", d.immunities, (v: string) => set({ immunities: v })],
            [
              "Resistances",
              d.resistances,
              (v: string) => set({ resistances: v }),
            ],
            ["Weaknesses", d.weaknesses, (v: string) => set({ weaknesses: v })],
          ].map(([label, val, fn]) => (
            <div key={label as string} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/50 w-20 flex-shrink-0">
                {label as string}
              </span>
              <EText
                value={val as string}
                onChange={fn as (v: string) => void}
                placeholder={label as string}
                className="flex-1"
              />
            </div>
          ))}
          <div className="flex items-center gap-3">
            {(
              ["fortitude", "reflex", "will"] as (keyof Pf2eStatBlockData)[]
            ).map((save) => (
              <div key={save} className="flex items-center gap-1">
                <span className="text-[10px] text-white/40 capitalize">
                  {save.slice(0, 4)}
                </span>
                <ENum
                  value={d[save] as number}
                  onChange={(v) => set({ [save]: v } as any)}
                />
              </div>
            ))}
            <EText
              value={d.saveNotes}
              onChange={(v) => set({ saveNotes: v })}
              placeholder="save notes"
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="mb-1">
          <StatLine
            label="AC"
            value={`${d.ac}${d.acNote ? ` (${d.acNote})` : ""}`}
          />
          <StatLine
            label="HP"
            value={`${d.maxHp}${d.hpNote ? `; ${d.hpNote}` : ""}`}
          />
          {d.immunities && <StatLine label="Immunities" value={d.immunities} />}
          {d.resistances && (
            <StatLine label="Resistances" value={d.resistances} />
          )}
          {d.weaknesses && <StatLine label="Weaknesses" value={d.weaknesses} />}
          <p className="text-[11px] text-white/80 leading-snug mt-0.5">
            <span className="font-bold">Fort </span>
            {modStr(d.fortitude)}
            <span className="font-bold ml-2">Ref </span>
            {modStr(d.reflex)}
            <span className="font-bold ml-2">Will </span>
            {modStr(d.will)}
            {d.saveNotes && (
              <span className="text-white/50 ml-1">({d.saveNotes})</span>
            )}
          </p>
        </div>
      )}

      <Divider />

      {/* ── Speed ── */}
      {isEditing ? (
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-white/50 w-12">
            Speed
          </span>
          <EText
            value={d.speed}
            onChange={(v) => set({ speed: v })}
            placeholder="25 ft."
            className="flex-1"
          />
        </div>
      ) : (
        <StatLine label="Speed" value={d.speed} />
      )}

      <Divider />

      {/* ── Passive abilities ── */}
      <ActionList
        title="Passive Abilities"
        items={d.passives}
        isEditing={isEditing}
        onChange={setPassives}
        showCost={false}
      />

      {/* ── Actions ── */}
      <ActionList
        title="Actions"
        items={d.actions}
        isEditing={isEditing}
        onChange={setActions}
        showCost={true}
      />

      {/* ── Spellcasting ── */}
      {(isEditing || d.spellcasting.length > 0) && (
        <div className="mt-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-400/70 border-b border-amber-800/30 pb-0.5 flex-1">
              Spellcasting
            </p>
            {isEditing && (
              <button
                onClick={() =>
                  set({
                    spellcasting: [
                      ...d.spellcasting,
                      {
                        tradition: "arcane",
                        type: "innate",
                        dc: 20,
                        attackBonus: 12,
                        spells: [],
                      },
                    ],
                  })
                }
                className="text-[10px] text-amber-400/60 hover:text-amber-400 ml-2"
              >
                + Add
              </button>
            )}
          </div>
          {d.spellcasting.map((sc, i) => (
            <div key={i} className="mb-2 bg-white/3 rounded p-2">
              {isEditing ? (
                <div className="flex flex-col gap-1">
                  <div className="flex gap-1 items-center flex-wrap">
                    <EText
                      value={sc.tradition}
                      onChange={(v) => {
                        const n = [...d.spellcasting];
                        n[i] = { ...n[i], tradition: v };
                        set({ spellcasting: n });
                      }}
                      placeholder="Tradition"
                      className="w-20"
                    />
                    <EText
                      value={sc.type}
                      onChange={(v) => {
                        const n = [...d.spellcasting];
                        n[i] = { ...n[i], type: v };
                        set({ spellcasting: n });
                      }}
                      placeholder="Type"
                      className="w-24"
                    />
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-white/40">DC</span>
                      <ENum
                        value={sc.dc}
                        onChange={(v) => {
                          const n = [...d.spellcasting];
                          n[i] = { ...n[i], dc: v };
                          set({ spellcasting: n });
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-white/40">Atk</span>
                      <ENum
                        value={sc.attackBonus}
                        onChange={(v) => {
                          const n = [...d.spellcasting];
                          n[i] = { ...n[i], attackBonus: v };
                          set({ spellcasting: n });
                        }}
                      />
                    </div>
                    <button
                      onClick={() => {
                        const n = [...d.spellcasting];
                        n.splice(i, 1);
                        set({ spellcasting: n });
                      }}
                      className="text-red-400/50 hover:text-red-400 text-xs ml-auto"
                    >
                      ✕
                    </button>
                  </div>
                  {sc.spells.map((sp, j) => (
                    <div key={j} className="flex gap-1 items-center">
                      <ENum
                        value={sp.level}
                        onChange={(v) => {
                          const n = [...d.spellcasting];
                          n[i] = { ...n[i], spells: [...n[i].spells] };
                          n[i].spells[j] = { ...n[i].spells[j], level: v };
                          set({ spellcasting: n });
                        }}
                        min={0}
                        max={10}
                      />
                      <EText
                        value={sp.list}
                        onChange={(v) => {
                          const n = [...d.spellcasting];
                          n[i] = { ...n[i], spells: [...n[i].spells] };
                          n[i].spells[j] = { ...n[i].spells[j], list: v };
                          set({ spellcasting: n });
                        }}
                        placeholder="Spells at this level"
                        className="flex-1"
                      />
                      <button
                        onClick={() => {
                          const n = [...d.spellcasting];
                          n[i] = { ...n[i], spells: [...n[i].spells] };
                          n[i].spells.splice(j, 1);
                          set({ spellcasting: n });
                        }}
                        className="text-red-400/50 hover:text-red-400 text-xs px-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const n = [...d.spellcasting];
                      n[i] = {
                        ...n[i],
                        spells: [...n[i].spells, { level: 1, list: "" }],
                      };
                      set({ spellcasting: n });
                    }}
                    className="text-[10px] text-amber-400/60 hover:text-amber-400"
                  >
                    + Add spell level
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-[11px] font-bold text-white/80 capitalize">
                    {sc.tradition} {sc.type} Spells
                    <span className="font-normal text-white/50 ml-1">
                      DC {sc.dc}, attack +{sc.attackBonus}
                    </span>
                  </p>
                  {sc.spells.map((sp, j) => (
                    <p key={j} className="text-[11px] text-white/70 ml-2">
                      <span className="font-semibold text-white/50">
                        {sp.level === 0
                          ? "Cantrips"
                          : `${sp.level}${["st", "nd", "rd"][sp.level - 1] || "th"}`}
                      </span>{" "}
                      {sp.list}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── GM Notes ── */}
      {isGM && (
        <div className="mt-3 border-t border-amber-800/30 pt-2">
          <p className="text-[10px] font-bold text-amber-400/50 uppercase tracking-wide mb-1">
            GM Notes
          </p>
          {isEditing ? (
            <textarea
              value={d.gmNotes}
              onChange={(e) => set({ gmNotes: e.target.value })}
              placeholder="Private notes…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded px-1.5 py-1 text-xs text-white/70
                  focus:outline-none focus:border-amber-500/50 resize-none"
            />
          ) : d.gmNotes ? (
            <p className="text-[11px] italic text-white/40">{d.gmNotes}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
