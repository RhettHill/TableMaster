// D&D 5e NPC Stat Block — Monster Manual style layout

export interface Dnd5eStatBlockData {
  // Header
  name: string;
  size: string; // Tiny/Small/Medium/Large/Huge/Gargantuan
  type: string; // beast, humanoid (goblin), undead, etc.
  subtype: string;
  alignment: string;

  // Core stats
  ac: number;
  acNote: string; // e.g. "natural armor"
  maxHp: number;
  hpDice: string; // e.g. "2d6+4"
  speed: string; // e.g. "30 ft., fly 60 ft."

  // Ability scores
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;

  // Saving throw proficiencies (comma-separated ability names)
  savingThrows: string; // e.g. "dex, con"

  // Skills (comma-separated, e.g. "Perception +4, Stealth +6")
  skills: string;

  // Damage resistances/immunities/vulnerabilities
  damageVulnerabilities: string;
  damageResistances: string;
  damageImmunities: string;
  conditionImmunities: string;

  // Senses, languages, challenge
  senses: string; // e.g. "darkvision 60 ft., passive Perception 14"
  languages: string;
  cr: string; // e.g. "1/4", "5", "21"
  xp: number;
  proficiencyBonus: number;

  // Traits/abilities (free text, markdown-ish)
  traits: { name: string; description: string }[];

  // Actions
  actions: { name: string; description: string }[];

  // Bonus actions
  bonusActions: { name: string; description: string }[];

  // Reactions
  reactions: { name: string; description: string }[];

  // Legendary actions
  legendaryActionsIntro: string;
  legendaryActions: { name: string; description: string }[];

  // Lair actions
  lairActionsIntro: string;
  lairActions: { name: string; description: string }[];

  // GM notes (not shown to players)
  gmNotes: string;
}

export const DEFAULT_STAT_BLOCK: Dnd5eStatBlockData = {
  name: "Unnamed Creature",
  size: "Medium",
  type: "humanoid",
  subtype: "",
  alignment: "unaligned",
  ac: 10,
  acNote: "",
  maxHp: 10,
  hpDice: "2d8+2",
  speed: "30 ft.",
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  savingThrows: "",
  skills: "",
  damageVulnerabilities: "",
  damageResistances: "",
  damageImmunities: "",
  conditionImmunities: "",
  senses: "passive Perception 10",
  languages: "—",
  cr: "1/4",
  xp: 50,
  proficiencyBonus: 2,
  traits: [],
  actions: [],
  bonusActions: [],
  reactions: [],
  legendaryActionsIntro: "",
  legendaryActions: [],
  lairActionsIntro: "",
  lairActions: [],
  gmNotes: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const mod = (s: number) => Math.floor((s - 10) / 2);
const mStr = (s: number) => {
  const m = mod(s);
  return (m >= 0 ? "+" : "") + m;
};

const CR_XP: Record<string, number> = {
  "0": 10,
  "1/8": 25,
  "1/4": 50,
  "1/2": 100,
  "1": 200,
  "2": 450,
  "3": 700,
  "4": 1100,
  "5": 1800,
  "6": 2300,
  "7": 2900,
  "8": 3900,
  "9": 5000,
  "10": 5900,
  "11": 7200,
  "12": 8400,
  "13": 10000,
  "14": 11500,
  "15": 13000,
  "16": 15000,
  "17": 18000,
  "18": 20000,
  "19": 22000,
  "20": 25000,
  "21": 33000,
  "22": 41000,
  "23": 50000,
  "24": 62000,
  "30": 155000,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AbilityCol({ label, score }: { label: string; score: number }) {
  return (
    <div className="flex flex-col items-center flex-1">
      <span className="text-[10px] font-bold text-red-700 uppercase">
        {label}
      </span>
      <span className="text-sm font-semibold text-gray-900">
        {score} ({mStr(score)})
      </span>
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-[11px] text-gray-900 leading-snug">
      <span className="font-bold">{label} </span>
      {value}
    </p>
  );
}

function Divider() {
  return <div className="h-px bg-red-700/60 my-1.5" />;
}

function ActionList({
  title,
  items,
  isEditing,
  onChange,
}: {
  title: string;
  items: { name: string; description: string }[];
  isEditing: boolean;
  onChange: (items: { name: string; description: string }[]) => void;
}) {
  if (!isEditing && items.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="text-red-700 text-sm font-bold uppercase tracking-wide border-b border-red-700/50 pb-0.5 mb-1">
        {title}
      </p>
      {items.map((item, i) => (
        <div key={i} className="mb-1.5">
          {isEditing ? (
            <div className="flex flex-col gap-0.5">
              <div className="flex gap-1 items-center">
                <input
                  value={item.name}
                  onChange={(e) => {
                    const next = [...items];
                    next[i] = { ...next[i], name: e.target.value };
                    onChange(next);
                  }}
                  placeholder="Name"
                  className="flex-1 text-xs font-bold bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-red-400"
                />
                <button
                  onClick={() => {
                    const next = [...items];
                    next.splice(i, 1);
                    onChange(next);
                  }}
                  className="text-red-400 hover:text-red-600 text-xs px-1"
                >
                  ✕
                </button>
              </div>
              <textarea
                value={item.description}
                onChange={(e) => {
                  const next = [...items];
                  next[i] = { ...next[i], description: e.target.value };
                  onChange(next);
                }}
                placeholder="Description"
                rows={2}
                className="text-xs bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-red-400 resize-none w-full"
              />
            </div>
          ) : (
            <p className="text-[11px] text-gray-900 leading-snug">
              <span className="font-bold italic">{item.name}. </span>
              {item.description}
            </p>
          )}
        </div>
      ))}
      {isEditing && (
        <button
          onClick={() => onChange([...items, { name: "", description: "" }])}
          className="text-[10px] text-red-600 hover:text-red-800 font-semibold mt-0.5"
        >
          + Add {title.replace(/s$/, "")}
        </button>
      )}
    </div>
  );
}

// ── Editable field helpers ────────────────────────────────────────────────────

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
      className={`bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-red-400 text-xs text-gray-900 w-full ${bold ? "font-bold" : ""} ${className}`}
    />
  );
}

function ENum({
  value,
  onChange,
  min = 0,
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
      className="w-14 bg-amber-50 border border-amber-300 rounded px-1 py-0.5 text-xs text-center text-gray-900 focus:outline-none focus:border-red-400 tabular-nums"
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  data: Partial<Dnd5eStatBlockData>;
  canEdit: boolean;
  isGM: boolean;
  onChange: (patch: Partial<Dnd5eStatBlockData>) => void;
}

export default function Dnd5eStatBlock({
  data,
  canEdit,
  isGM,
  onChange,
}: Props) {
  const d = { ...DEFAULT_STAT_BLOCK, ...data };
  const set = (patch: Partial<Dnd5eStatBlockData>) => {
    if (canEdit) onChange(patch);
  };
  const isEditing = canEdit;

  const autoXP = CR_XP[d.cr] ?? d.xp;

  return (
    <div
      className="font-serif bg-[#fdf1dc] text-gray-900 p-4 rounded border-2 border-[#9c2b2b] shadow-md"
      style={{
        fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
      }}
    >
      {/* ── Name & type ── */}
      {isEditing ? (
        <div className="mb-1">
          <EText
            value={d.name}
            onChange={(v) => set({ name: v })}
            placeholder="Creature Name"
            bold
            className="text-xl mb-1"
          />
          <div className="flex gap-1 flex-wrap mt-1">
            <EText
              value={d.size}
              onChange={(v) => set({ size: v })}
              placeholder="Size"
              className="w-24"
            />
            <EText
              value={d.type}
              onChange={(v) => set({ type: v })}
              placeholder="Type"
              className="flex-1"
            />
            <EText
              value={d.subtype}
              onChange={(v) => set({ subtype: v })}
              placeholder="Subtype (opt.)"
              className="flex-1"
            />
            <EText
              value={d.alignment}
              onChange={(v) => set({ alignment: v })}
              placeholder="Alignment"
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="mb-1">
          <h2 className="text-xl font-bold text-red-800">{d.name}</h2>
          <p className="text-[11px] italic text-gray-600">
            {[d.size, d.type, d.subtype && `(${d.subtype})`]
              .filter(Boolean)
              .join(" ")}
            , {d.alignment}
          </p>
        </div>
      )}

      <Divider />

      {/* ── AC / HP / Speed ── */}
      {isEditing ? (
        <div className="flex flex-col gap-1 mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold w-20">Armor Class</span>
            <ENum
              value={d.ac}
              onChange={(v) => set({ ac: v })}
              min={1}
              max={30}
            />
            <EText
              value={d.acNote}
              onChange={(v) => set({ acNote: v })}
              placeholder="e.g. natural armor"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold w-20">Hit Points</span>
            <ENum value={d.maxHp} onChange={(v) => set({ maxHp: v })} min={1} />
            <EText
              value={d.hpDice}
              onChange={(v) => set({ hpDice: v })}
              placeholder="e.g. 2d8+4"
              className="flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold w-20">Speed</span>
            <EText
              value={d.speed}
              onChange={(v) => set({ speed: v })}
              placeholder="30 ft."
              className="flex-1"
            />
          </div>
        </div>
      ) : (
        <div className="mb-1">
          <StatLine
            label="Armor Class"
            value={`${d.ac}${d.acNote ? ` (${d.acNote})` : ""}`}
          />
          <StatLine label="Hit Points" value={`${d.maxHp} (${d.hpDice})`} />
          <StatLine label="Speed" value={d.speed} />
        </div>
      )}

      <Divider />

      {/* ── Ability scores ── */}
      <div className="flex gap-1 py-1">
        {(
          [
            "str",
            "dex",
            "con",
            "int",
            "wis",
            "cha",
          ] as (keyof Dnd5eStatBlockData)[]
        ).map((ab) => (
          <div key={ab} className="flex flex-col items-center flex-1">
            <span className="text-[10px] font-bold text-red-700 uppercase">
              {ab}
            </span>
            {isEditing ? (
              <input
                type="number"
                value={d[ab] as number}
                min={1}
                max={30}
                onChange={(e) => set({ [ab]: Number(e.target.value) } as any)}
                className="w-10 text-xs text-center bg-amber-50 border border-amber-300 rounded focus:outline-none focus:border-red-400 tabular-nums"
              />
            ) : (
              <span className="text-xs font-semibold">
                {d[ab] as number} ({mStr(d[ab] as number)})
              </span>
            )}
          </div>
        ))}
      </div>

      <Divider />

      {/* ── Skills, saves, resistances, senses, CR ── */}
      {isEditing ? (
        <div className="flex flex-col gap-1 mb-1 text-xs">
          {(
            [
              ["savingThrows", "Saving Throws"],
              ["skills", "Skills"],
              ["damageVulnerabilities", "Damage Vulnerabilities"],
              ["damageResistances", "Damage Resistances"],
              ["damageImmunities", "Damage Immunities"],
              ["conditionImmunities", "Condition Immunities"],
              ["senses", "Senses"],
              ["languages", "Languages"],
            ] as [keyof Dnd5eStatBlockData, string][]
          ).map(([k, label]) => (
            <div key={k} className="flex items-center gap-1">
              <span className="font-bold w-36 flex-shrink-0">{label}</span>
              <EText
                value={d[k] as string}
                onChange={(v) => set({ [k]: v } as any)}
                placeholder={label}
              />
            </div>
          ))}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">CR</span>
            <EText
              value={d.cr}
              onChange={(v) => set({ cr: v, xp: CR_XP[v] ?? d.xp })}
              placeholder="1/4"
              className="w-16"
            />
            <span className="font-bold ml-2">XP</span>
            <ENum value={d.xp} onChange={(v) => set({ xp: v })} />
            <span className="font-bold ml-2">Prof Bonus</span>
            <ENum
              value={d.proficiencyBonus}
              onChange={(v) => set({ proficiencyBonus: v })}
              min={2}
              max={9}
            />
          </div>
        </div>
      ) : (
        <div className="mb-1">
          <StatLine label="Saving Throws" value={d.savingThrows} />
          <StatLine label="Skills" value={d.skills} />
          <StatLine
            label="Damage Vulnerabilities"
            value={d.damageVulnerabilities}
          />
          <StatLine label="Damage Resistances" value={d.damageResistances} />
          <StatLine label="Damage Immunities" value={d.damageImmunities} />
          <StatLine
            label="Condition Immunities"
            value={d.conditionImmunities}
          />
          <StatLine label="Senses" value={d.senses} />
          <StatLine label="Languages" value={d.languages} />
          <StatLine
            label="Challenge"
            value={`${d.cr} (${autoXP.toLocaleString()} XP)`}
          />
          <StatLine
            label="Proficiency Bonus"
            value={`+${d.proficiencyBonus}`}
          />
        </div>
      )}

      <Divider />

      {/* ── Traits ── */}
      <ActionList
        title="Traits"
        items={d.traits}
        isEditing={isEditing}
        onChange={(v) => set({ traits: v })}
      />

      {/* ── Actions ── */}
      <ActionList
        title="Actions"
        items={d.actions}
        isEditing={isEditing}
        onChange={(v) => set({ actions: v })}
      />

      {/* ── Bonus Actions ── */}
      <ActionList
        title="Bonus Actions"
        items={d.bonusActions}
        isEditing={isEditing}
        onChange={(v) => set({ bonusActions: v })}
      />

      {/* ── Reactions ── */}
      <ActionList
        title="Reactions"
        items={d.reactions}
        isEditing={isEditing}
        onChange={(v) => set({ reactions: v })}
      />

      {/* ── Legendary Actions ── */}
      {(isEditing || d.legendaryActions.length > 0) && (
        <div className="mt-2">
          <p className="text-red-700 text-sm font-bold uppercase tracking-wide border-b border-red-700/50 pb-0.5 mb-1">
            Legendary Actions
          </p>
          {isEditing ? (
            <textarea
              value={d.legendaryActionsIntro}
              onChange={(e) => set({ legendaryActionsIntro: e.target.value })}
              placeholder="Intro text (optional)"
              rows={2}
              className="w-full text-xs bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-red-400 resize-none mb-1"
            />
          ) : d.legendaryActionsIntro ? (
            <p className="text-[11px] italic mb-1">{d.legendaryActionsIntro}</p>
          ) : null}
          <ActionList
            title=""
            items={d.legendaryActions}
            isEditing={isEditing}
            onChange={(v) => set({ legendaryActions: v })}
          />
        </div>
      )}

      {/* ── Lair Actions ── */}
      {(isEditing || d.lairActions.length > 0) && (
        <div className="mt-2">
          <p className="text-red-700 text-sm font-bold uppercase tracking-wide border-b border-red-700/50 pb-0.5 mb-1">
            Lair Actions
          </p>
          {isEditing ? (
            <textarea
              value={d.lairActionsIntro}
              onChange={(e) => set({ lairActionsIntro: e.target.value })}
              placeholder="Intro text (optional)"
              rows={2}
              className="w-full text-xs bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-red-400 resize-none mb-1"
            />
          ) : d.lairActionsIntro ? (
            <p className="text-[11px] italic mb-1">{d.lairActionsIntro}</p>
          ) : null}
          <ActionList
            title=""
            items={d.lairActions}
            isEditing={isEditing}
            onChange={(v) => set({ lairActions: v })}
          />
        </div>
      )}

      {/* ── GM Notes (GM only) ── */}
      {isGM && (
        <div className="mt-3 border-t border-red-700/30 pt-2">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1">
            GM Notes
          </p>
          {isEditing ? (
            <textarea
              value={d.gmNotes}
              onChange={(e) => set({ gmNotes: e.target.value })}
              placeholder="Private notes visible only to GM…"
              rows={3}
              className="w-full text-xs bg-amber-50 border border-amber-300 rounded px-1.5 py-1 focus:outline-none focus:border-red-400 resize-none"
            />
          ) : d.gmNotes ? (
            <p className="text-[11px] italic text-gray-500">{d.gmNotes}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
