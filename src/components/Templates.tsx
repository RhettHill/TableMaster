// ── Starter templates ──────────────────────────────────────────────────────────

import { StatBlockTemplate } from "../pages/StatBlockBuilder";
import { SectionDef } from "./sheets/GenericSheet";

export const STARTER_TEMPLATES: {
  name: string;
  icon: string;
  desc: string;
  sections: SectionDef[];
}[] = [
  {
    name: "Generic OSR",
    icon: "🗡",
    desc: "Old-school stats, saves, HP",
    sections: [
      {
        title: "Character Info",
        columns: 2,
        fields: [
          { key: "characterName", label: "Name", type: "text" },
          { key: "class", label: "Class", type: "text" },
          { key: "level", label: "Level", type: "number", min: 1, max: 20 },
          {
            key: "alignment",
            label: "Alignment",
            type: "select",
            options: ["Lawful", "Neutral", "Chaotic"],
          },
        ],
      },
      {
        title: "Ability Scores",
        columns: 3,
        fields: [
          { key: "str", label: "STR", type: "number", min: 3, max: 18 },
          { key: "dex", label: "DEX", type: "number", min: 3, max: 18 },
          { key: "con", label: "CON", type: "number", min: 3, max: 18 },
          { key: "int", label: "INT", type: "number", min: 3, max: 18 },
          { key: "wis", label: "WIS", type: "number", min: 3, max: 18 },
          { key: "cha", label: "CHA", type: "number", min: 3, max: 18 },
        ],
      },
      {
        title: "Combat",
        columns: 3,
        fields: [
          { key: "hp", label: "HP", type: "number" },
          { key: "maxHp", label: "Max HP", type: "number" },
          { key: "ac", label: "AC", type: "number" },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [
          { key: "equipment", label: "Equipment", type: "textarea" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      },
    ],
  },
  {
    name: "Blades in the Dark",
    icon: "🕯",
    desc: "Stress, trauma, action ratings",
    sections: [
      {
        title: "Character",
        columns: 2,
        fields: [
          { key: "name", label: "Name", type: "text" },
          {
            key: "playbook",
            label: "Playbook",
            type: "select",
            options: [
              "Cutter",
              "Hound",
              "Leech",
              "Lurk",
              "Slide",
              "Spider",
              "Whisper",
            ],
          },
          { key: "heritage", label: "Heritage", type: "text" },
          { key: "background", label: "Background", type: "text" },
          { key: "vice", label: "Vice", type: "text" },
        ],
      },
      {
        title: "Stress & Trauma",
        columns: 2,
        fields: [
          { key: "stress", label: "Stress", type: "number", min: 0, max: 9 },
          {
            key: "maxStress",
            label: "Max Stress",
            type: "number",
            min: 0,
            max: 9,
          },
          {
            key: "trauma",
            label: "Trauma",
            type: "textarea",
            placeholder: "Cold, Haunted, Obsessed…",
          },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [
          { key: "abilities", label: "Special Abilities", type: "textarea" },
          { key: "notes", label: "Notes", type: "textarea" },
        ],
      },
    ],
  },
  {
    name: "Minimal Free-form",
    icon: "📝",
    desc: "Name, stats, notes — blank slate",
    sections: [
      {
        title: "Character",
        columns: 2,
        fields: [
          { key: "name", label: "Name", type: "text" },
          { key: "concept", label: "Concept", type: "text" },
        ],
      },
      {
        title: "Stats",
        columns: 3,
        fields: [
          { key: "hp", label: "HP", type: "number" },
          { key: "maxHp", label: "Max HP", type: "number" },
          { key: "ac", label: "Defense", type: "number" },
        ],
      },
      {
        title: "Notes",
        columns: 1,
        fields: [{ key: "notes", label: "Notes", type: "textarea" }],
      },
    ],
  },
];

// ── Built-in stat block templates ─────────────────────────────────────────────
// Representative stat block layouts for built-in systems, shown in the editor
// when the GM selects a built-in system. Editing any field makes it custom.

export const BUILTIN_STAT_BLOCK_TEMPLATES: Record<string, StatBlockTemplate> = {
  dnd5e: {
    sections: [
      {
        title: "Identity",
        columns: 2,
        fields: [
          { key: "name", label: "Name", type: "text" },
          {
            key: "size",
            label: "Size",
            type: "select",
            options: ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"],
          },
          {
            key: "type",
            label: "Type",
            type: "text",
            placeholder: "humanoid, beast…",
          },
          {
            key: "alignment",
            label: "Alignment",
            type: "text",
            placeholder: "neutral evil…",
          },
          { key: "cr", label: "CR", type: "text", placeholder: "1/4, 5, 21…" },
          { key: "xp", label: "XP", type: "number" },
        ],
      },
      {
        title: "Defenses",
        columns: 3,
        fields: [
          { key: "ac", label: "AC", type: "number" },
          {
            key: "acNote",
            label: "AC Note",
            type: "text",
            placeholder: "natural armor",
          },
          { key: "maxHp", label: "HP", type: "number" },
          {
            key: "hpDice",
            label: "HP Dice",
            type: "text",
            placeholder: "2d8+4",
          },
          { key: "speed", label: "Speed", type: "text", placeholder: "30 ft." },
        ],
      },
      {
        title: "Ability Scores",
        columns: 3,
        fields: [
          { key: "str", label: "STR", type: "number" },
          { key: "dex", label: "DEX", type: "number" },
          { key: "con", label: "CON", type: "number" },
          { key: "int", label: "INT", type: "number" },
          { key: "wis", label: "WIS", type: "number" },
          { key: "cha", label: "CHA", type: "number" },
        ],
      },
      {
        title: "Combat Info",
        columns: 1,
        fields: [
          {
            key: "skills",
            label: "Skills",
            type: "text",
            placeholder: "Perception +4, Stealth +6",
          },
          {
            key: "senses",
            label: "Senses",
            type: "text",
            placeholder: "darkvision 60 ft., passive Perception 14",
          },
          {
            key: "languages",
            label: "Languages",
            type: "text",
            placeholder: "Common, Elvish",
          },
          { key: "damageImmunities", label: "Damage Immunities", type: "text" },
          {
            key: "conditionImmunities",
            label: "Condition Immunities",
            type: "text",
          },
        ],
      },
      {
        title: "Abilities & Actions",
        columns: 1,
        fields: [
          {
            key: "traits",
            label: "Traits",
            type: "textarea",
            placeholder: "Pack Tactics, Darkvision…",
          },
          {
            key: "actions",
            label: "Actions",
            type: "textarea",
            placeholder: "Multiattack, Bite +4 (1d6+2)…",
          },
          { key: "reactions", label: "Reactions", type: "textarea" },
          {
            key: "legendaryActions",
            label: "Legendary Actions",
            type: "textarea",
          },
          { key: "gmNotes", label: "GM Notes", type: "textarea" },
        ],
      },
    ],
  },

  pf2e: {
    sections: [
      {
        title: "Identity",
        columns: 2,
        fields: [
          { key: "name", label: "Name", type: "text" },
          { key: "level", label: "Level", type: "number", min: -1, max: 25 },
          {
            key: "rarity",
            label: "Rarity",
            type: "select",
            options: ["Common", "Uncommon", "Rare", "Unique"],
          },
          { key: "size", label: "Size", type: "text", placeholder: "Medium" },
          {
            key: "traits",
            label: "Traits",
            type: "text",
            placeholder: "Undead, Mindless…",
          },
          { key: "alignment", label: "Alignment", type: "text" },
        ],
      },
      {
        title: "Defenses",
        columns: 3,
        fields: [
          { key: "ac", label: "AC", type: "number" },
          { key: "maxHp", label: "HP", type: "number" },
          { key: "speed", label: "Speed", type: "text", placeholder: "25 ft." },
          { key: "fortitude", label: "Fortitude", type: "number" },
          { key: "reflex", label: "Reflex", type: "number" },
          { key: "will", label: "Will", type: "number" },
        ],
      },
      {
        title: "Ability Modifiers",
        columns: 3,
        fields: [
          { key: "str", label: "STR", type: "number" },
          { key: "dex", label: "DEX", type: "number" },
          { key: "con", label: "CON", type: "number" },
          { key: "int", label: "INT", type: "number" },
          { key: "wis", label: "WIS", type: "number" },
          { key: "cha", label: "CHA", type: "number" },
        ],
      },
      {
        title: "Combat Info",
        columns: 1,
        fields: [
          { key: "perception", label: "Perception", type: "number" },
          {
            key: "skills",
            label: "Skills",
            type: "text",
            placeholder: "Acrobatics +12, Stealth +15",
          },
          { key: "languages", label: "Languages", type: "text" },
          { key: "immunities", label: "Immunities", type: "text" },
          { key: "resistances", label: "Resistances", type: "text" },
          { key: "weaknesses", label: "Weaknesses", type: "text" },
        ],
      },
      {
        title: "Abilities & Actions",
        columns: 1,
        fields: [
          { key: "passives", label: "Passive Abilities", type: "textarea" },
          {
            key: "actions",
            label: "Actions",
            type: "textarea",
            placeholder: "◆ Strike +8 (1d8+4)",
          },
          { key: "gmNotes", label: "GM Notes", type: "textarea" },
        ],
      },
    ],
  },
};
