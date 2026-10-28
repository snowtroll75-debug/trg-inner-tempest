/**
 * Inner Tempest — Block 10 (1.0.0): the Dragon Companions and Dragon Tamer,
 * as ruled on 27 October 2026 (B10-1 to B10-14 and interpretations 1–7,
 * docs/INNER_TEMPEST_RULINGS_2026-10-27-B10.md), on TRG Prime 3.674.0.
 *
 * THE PRINTED TEXT AND NUMBERS ARE THE BOOK'S, read from
 * tools/content/book-text-block10.json (cut from the docx by
 * tools/content/extract-book-block10.mjs), never retyped: the Dragon
 * Companion Table, each base dragon's stat block, the chapter's rules, the
 * companion feats, High Magic and Dragon Tamer. Every number a document
 * carries is parsed from those cells and lines, and the parse throws on
 * anything it cannot read.
 *
 * What is built, each in the shape the matching TRG Prime pack keeps:
 *
 *   it-dragons      the Dragon Companion class (rows 1–30), the four base
 *                   dragons (`race` items, as the Animal Companion's base
 *                   creatures are) and their four eggs. Its own pack, extending
 *                   nothing, so no dragon is offered as an animal companion.
 *   it-companions   each dragon's Bite (with its elemental secondary damage)
 *                   and the dragons' Claws, at Medium, which the system
 *                   resizes to the dragon (B10-10: one size ladder)
 *   it-abilities    the four breath weapons (a declared area, dice by level,
 *                   TRG Prime 3.674.0 C5) and High Magic
 *   it-feats        Dragon Tamer (Archetype) and the four Dragon Companion feats
 *
 * FLAGS, under the system's scope: `itDragonTable` (the class: the table as
 * numbers, one row per level gained), `itDragon` (each base dragon's figures,
 * which module/block10-automations.mjs reads), `itDragonEgg` (an egg's
 * bonding), `companionKind` (TRG Prime 3.674.0 C4), `creatureAbility`,
 * `creatureAttack`, `repertoire` (C10).
 */
import fs from "node:fs";
import { SYSTEM_ID, stableId, skillKey, changesEffect, classItem, ability, feat, gear, naturalAttack, conditional } from "./builders.mjs";
import { md } from "./markdown.mjs";

export const BOOK10 = JSON.parse(fs.readFileSync(new URL("./book-text-block10.json", import.meta.url), "utf8"));

const STATS = { coreVersion: "14", systemId: SYSTEM_ID, systemVersion: "3.674.0", createdTime: 1789000000000, modifiedTime: 1789000000000, lastModifiedBy: null, compendiumSource: null, duplicateSource: null };
const HOW = { auto: "Automated", partly: "Partly automated", manual: "Not automated" };
const how = (kind, text) => md(`*${HOW[kind]}:* ${text}`);
const titleWords = (line) => String(line ?? "").split(/[\s,]+/).filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(", ");
const fail = (what) => { throw new Error(`Block 10: ${what}`); };

/* ------------------------------------------------------------------ */
/* The Dragon Companion Table                                           */
/* ------------------------------------------------------------------ */

/** "Base", "Base +5", "Base -1" → 0, 5, -1. */
export function baseCell(cell) {
  const m = /^Base(?:\s*([+-])\s*(\d+))?$/.exec(String(cell ?? "").trim());
  if (!m) fail(`cannot read the table cell "${cell}"`);
  return m[1] ? (m[1] === "-" ? -1 : 1) * Number(m[2]) : 0;
}

/** "30 ft." → 30. */
export function feetCell(cell) {
  const m = /^(\d+)\s*ft\.?$/.exec(String(cell ?? "").trim());
  if (!m) fail(`cannot read the distance "${cell}"`);
  return Number(m[1]);
}

/**
 * The table as numbers, one row per level gained (Base, Base +1 … Base +20).
 * Columns as printed: Level, Size, Land Speed, Fly Speed, Str, Con, Dex,
 * Int/Wis/Cha, Natural Attacks, Line, Cone.
 */
export const DRAGON_TABLE = Object.freeze(BOOK10.table.map((c, i) => {
  if (c.length !== 11) fail(`table row ${i} has ${c.length} cells`);
  const gained = baseCell(c[0]);
  if (gained !== i) fail(`table row ${i} reads Base +${gained}`);
  return Object.freeze({
    gained, size: baseCell(c[1]), land: baseCell(c[2]), fly: baseCell(c[3]),
    str: baseCell(c[4]), con: baseCell(c[5]), dex: baseCell(c[6]), mental: baseCell(c[7]),
    attacks: Object.freeze(c[8].split(",").map((a) => a.trim()).filter(Boolean)),
    line: feetCell(c[9]), cone: feetCell(c[10])
  });
}));

/* ------------------------------------------------------------------ */
/* The base dragons                                                     */
/* ------------------------------------------------------------------ */

/** The core feats a stat block's Special line names (the rest are codex specials). */
const CORE_FEATS = new Set(["Alertness", "Great Fortitude", "Improved Initiative", "Iron Will", "Lightning Reflexes"]);
/** The breath energies, as the breath's own trait line names one. */
const ELEMENTS = ["acid", "cold", "electricity", "fire"];
/** B10-9: the light dragon's fourth feat, the GM's extra, granted free. */
const FREE_FEATS = { LIGHT: ["Lightning Reflexes"] };

/**
 * TRG Prime's DR Multiplier Table (combat/damage.mjs `drMultiplier`): 0–5
 * ×1, 6–11 ×2, 12–17 ×3, 18–23 ×4, 24+ ×5. The printed DR is the block's
 * at its base level (BDB = level), so the natural armour it carries is the
 * printed DR over that (interpretation 4). verify-block10 holds this
 * against the core's own function.
 */
export function drMultiplierAt(bdb) {
  const v = Math.max(0, Math.floor(Number(bdb) || 0));
  return v >= 24 ? 5 : v >= 18 ? 4 : v >= 12 ? 3 : v >= 6 ? 2 : 1;
}

/** "Acrobatics +8(3), … Climbing +8(3) Culture +6(3)" → { acrobatics: 3, … } (the print drops some commas). */
export function skillRanks(line) {
  const out = {};
  for (const [, label, ranks] of String(line).matchAll(/([A-Za-z][A-Za-z ]*?)\s*[+-]\d+\s*\((\d+)\)/g)) out[skillKey(label.trim())] = Number(ranks);
  return out;
}

/** "30 feet; Fly 50; Swim 40" → { land: 30, fly: 50, swim: 40 }. */
export function speeds(line) {
  const parts = String(line).split(";").map((p) => p.trim()).filter(Boolean);
  const land = /^(\d+)\s*feet$/i.exec(parts.shift() ?? "");
  if (!land) fail(`cannot read the speed line "${line}"`);
  const out = { land: Number(land[1]) };
  for (const p of parts) {
    const m = /^(Fly|Swim|Burrow|Climb)\s+(\d+)$/i.exec(p);
    if (!m) fail(`cannot read the speed "${p}"`);
    out[m[1].toLowerCase()] = Number(m[2]);
  }
  return out;
}

/** "HP 76; Immunity cold, paralysis, sleep; Weakness fire" → its parts (the print drops a comma in the light dragon's). */
export function hpLine(line) {
  const m = /^HP\s+(\d+)(?:;\s*Immunity\s+([^;]+))?(?:;\s*Weakness\s+(.+))?$/.exec(String(line).trim());
  if (!m) fail(`cannot read the HP line "${line}"`);
  const list = (s) => String(s ?? "").split(/[,\s]+/).map((w) => w.trim().toLowerCase()).filter(Boolean).join(", ");
  return { hp: Number(m[1]), immunities: list(m[2]), weaknesses: list(m[3]) };
}

/** One base dragon, read from its block. */
export function dragonData(bookName) {
  const b = BOOK10.dragons[bookName];
  if (!b) fail(`the book has no ${bookName}`);
  const key = bookName.split(" ")[0].toLowerCase();
  const name = titleWords(bookName).replace(/,/g, "");
  const level = Number(b.fields.Level);
  if (!(level >= 1)) fail(`${name} has no level`);
  const dr = /;\s*DR\s+(\d+)\s*$/.exec(b.defence[0]);
  if (!dr) fail(`${name}: cannot read DR from "${b.defence[0]}"`);
  const mult = drMultiplierAt(level);
  if (Number(dr[1]) % mult) fail(`${name}: DR ${dr[1]} is not a multiple of ×${mult}`);
  const db = /^DB\s+\+(\d+)/.exec(b.defence[0]);
  const saves = /^Fort\s+\+(\d+),\s*Ref\s+\+(\d+),\s*Will\s+\+(\d+)$/.exec(b.defence[1]);
  if (!db || !saves) fail(`${name}: cannot read the DB or saves`);
  const hp = hpLine(b.defence[2]);
  const traits = b.breath.traits.split(",").map((t) => t.trim().toLowerCase());
  const element = ELEMENTS.find((e) => traits.includes(e)) ?? fail(`${name}: the breath names no energy`);
  const shape = /(\d+)-foot (cone|line)/.exec(b.breath.text) ?? fail(`${name}: the breath has no shape`);
  const dice = /inflicts (\d+)d(\d+)/.exec(b.breath.text) ?? fail(`${name}: the breath has no dice`);
  if (Number(dice[1]) !== level) fail(`${name}: the breath's ${dice[1]} dice are not its level ${level} (IT-C5)`);
  if (b.breath.ap !== 2) fail(`${name}: the breath costs ${b.breath.ap} AP`);
  const first = DRAGON_TABLE[0];
  if (Number(shape[1]) !== (shape[2] === "line" ? first.line : first.cone)) fail(`${name}: the breath's ${shape[1]} feet are not the table's base ${shape[2]}`);
  const special = b.special.join(" ").split(",").map((s) => s.trim()).filter(Boolean);
  const feats = special.filter((s) => CORE_FEATS.has(s));
  const baseSpecials = special.filter((s) => !CORE_FEATS.has(s));
  const bite = /^Bite\s+\+\d+\s+\(([^)]*)\)\s+(\d*d\d+)\+?\d*\s+(\w+)\s+plus\s+(\d+d\d+)\s+(\w+)$/.exec(b.attacks[0]);
  const claw = /^Claw\s+\+\d+\s+\(([^)]*)\)\s+(\d*d\d+)\+?\d*\s+(\w+)$/.exec(b.attacks[1]);
  if (!bite || !claw) fail(`${name}: cannot read the attacks`);
  if (bite[5] !== element) fail(`${name}: the bite's ${bite[5]} is not the breath's ${element}`);
  const spells = /(\d+) additional spells?/.exec(b.magic.join(" ")) ?? fail(`${name}: no spell count`);
  const sp = speeds(b.fields.Speed);
  return {
    key, name, bookName, level, el: Number(b.fields.EL), dc: Number(b.fields.DC),
    size: b.fields.Size.toLowerCase(), speeds: sp,
    abilities: { ...b.abilities },
    skills: skillRanks(b.skills),
    printed: { db: Number(db[1]), dr: Number(dr[1]), fort: Number(saves[1]), ref: Number(saves[2]), will: Number(saves[3]), hp: hp.hp, initiative: Number(b.fields.Initiative.replace("+", "")), bite: bite[2], claw: claw[2] },
    naturalDR: Number(dr[1]) / mult,
    immunities: hp.immunities, weaknesses: hp.weaknesses,
    languages: b.fields.Languages,
    feats, freeFeats: FREE_FEATS[key.toUpperCase()] ?? [], baseSpecials,
    breath: { name: b.breath.title, die: `d${dice[2]}`, shape: shape[2], feet: Number(shape[1]), type: element, traits: titleWords(b.breath.traits), text: b.breath.text },
    bite: { secondary: { dice: bite[4], type: element } },
    spells: Number(spells[1]),
    specials: b.levels.map(([at, n]) => [Number(at), String(n).trim()]),
    egg: `Dragon Egg (${name.split(" ")[0]})`
  };
}

export const DRAGONS = Object.freeze(Object.keys(BOOK10.dragons).map(dragonData));

/* ------------------------------------------------------------------ */
/* The class                                                            */
/* ------------------------------------------------------------------ */

const rules = (heading) => BOOK10.rules[heading] ?? fail(`the book has no rule "${heading}"`);
const CLASS_SKILLS = rules("CLASS SKILLS")[1].replace(/\.+$/, "");

/**
 * One row of the class's progression at a level (the chapter's rules):
 * "a primary BAB and BDB which equates to +1 per level"; "a base saving throw
 * equal to 5 +1 per level"; general feats "one at 1st and then another every
 * 2 levels"; "a caster equal to their level -3"; "4 PP per level and a BSB of
 * +1 per level".
 */
export function dragonClassRow(level) {
  const L = Math.max(1, Math.floor(Number(level) || 1));
  return { level: L, bab: L, bdb: L, fortitude: 5 + L, reflex: 5 + L, will: 5 + L, bonusFeats: Math.ceil(L / 2), casterLevel: L > 3 ? L - 3 : null, pp: 4 * L, bsb: L };
}

/** The chapter's own rules, as printed, for the class's description. */
function chapterRules() {
  const out = [];
  for (const heading of ["TRAITS", "LEVEL", "CLASS SKILLS", "SKILL POINTS", "FEATS", "HIT POINTS", "BASE ATTACK/DEFENCE BONUS", "SAVING THROWS", "OTHER ABILITIES", "ABILITY SCORES", "ATTACKS", "BREATH WEAPON"]) {
    out.push(md(`**${heading}**\n\n${rules(heading).join("\n\n")}`));
  }
  return out.join("\n");
}

function dragonClass() {
  const rows = Array.from({ length: 20 }, (_, i) => dragonClassRow(i + 1));
  const item = classItem({
    name: "Dragon Companion",
    classType: "",
    keyAbilityScores: "",
    classSkills: CLASS_SKILLS,
    proficiencies: "",
    hitPoints: 12,
    skillPoints: 8,
    magicalTradition: "arcane",
    magicalAbility: "charisma",
    casterStyle: "instinctive",
    cantripsKnown: 4,
    wealth: "0",
    table: rows.map((r) => [r.bab, r.bdb, r.fortitude, r.reflex, r.will, r.bonusFeats, r.casterLevel, r.pp, r.bsb]),
    description: [
      md(BOOK10.rules.intro.join("\n\n")),
      chapterRules(),
      md(`**MAGIC** ${BOOK10.format.find((l) => /^Magic /.test(l))?.replace(/^Magic /, "") ?? fail("no Magic line")}`),
      how("auto", "the companion's class: BAB and BDB +1 a level, every save 5 + level, 12 + Con hit points a level beside the system's size base (the Dragon Companion HP Table is the system's own), 8 + Intelligence skill points a level (B10-8), general feats on the PC's schedule, caster level − 3, 4 PP a level and BSB +1 a level, an arcane instinctive caster on Charisma whose spells may come from any tradition (High Magic). The rows run to 30, so a dragon the GM raises still reads its own row. The Dragon Companion Table rides on this class, and Inner Tempest keeps the dragon in step with it whenever its level moves.")
    ].join("\n"),
    flags: {
      // C10: the dragon's own count is laid on the dragon when it hatches; a
      // dragon made by hand opens with the system's two, then one a level.
      repertoire: { pickFrom: 2, pickStep: 1 },
      itDragonTable: DRAGON_TABLE.map((r) => ({ ...r, attacks: [...r.attacks] }))
    }
  });
  // Beyond the printed twenty, for a raised dragon (B10-1).
  for (let L = 21; L <= 30; L += 1) item.system.progression.push(dragonClassRow(L));
  item.system.skillPointAbility = "intelligence";
  item.system.traits = "Minion";
  item.system.source = "Inner Tempest, Chapter 5";
  return item;
}

/* ------------------------------------------------------------------ */
/* The base dragons, as race items                                      */
/* ------------------------------------------------------------------ */

const ABILITY_KEYS = { STR: "strength", CON: "constitution", DEX: "dexterity", INT: "intelligence", WIS: "wisdom", CHA: "charisma" };
const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);

/** The block as printed, for the sheet. */
function printedBlock(d) {
  const b = BOOK10.dragons[d.bookName];
  const f = b.fields;
  return md([
    `**${d.name.toUpperCase()}**`,
    `**Size** ${f.Size}`,
    `**Level** ${f.Level} (**EL** ${f.EL}); **DC** ${f.DC}`,
    `**Initiative** ${f.Initiative}`,
    `**Speed** ${f.Speed}`,
    `**Senses** ${f.Senses}`,
    `**Languages** ${f.Languages}`,
    `**ABILITY SCORES** ${Object.entries(b.abilities).map(([k, v]) => `**${k}** ${sign(v)}`).join(", ")}`,
    `**SKILLS** ${b.skills}`,
    `**DEFENCE**\n${b.defence.join("\n")}`,
    `**FEATS/SPECIAL** ${b.special.join(" ")}`,
    `**${b.breath.title}** ${b.breath.ap} AP (${b.breath.traits})\n${b.breath.text}`,
    `**ATTACKS**\n${b.attacks.join("\n")}`,
    `**MAGIC**\n${b.magic.join("\n")}`,
    `**SPECIAL ABILITIES BY LEVEL** ${b.levels.map(([l, n]) => `${l}: ${n}`).join("; ")}`,
    `*${b.description}*`
  ].join("\n\n"));
}

function dragonRace(d) {
  const id = stableId(`it-dragons:${d.name}`);
  const abilityText = Object.entries(d.abilities).map(([k, v]) => `${k.charAt(0)}${k.slice(1).toLowerCase()} ${v}`).join(", ");
  const speedChanges = Object.entries(d.speeds).map(([mode, v]) => ({ key: `system.combat.movement.${mode}`, mode: 5, value: String(v), priority: 10 }));
  const effects = [
    // The printed scores, final at its base size (B10-2): no allocated
    // points beneath them (C7) and no size step on top (C6).
    changesEffect(id, `${d.name}: ability scores`, Object.entries(ABILITY_KEYS).flatMap(([k, key]) => [
      { key: `system.attributes.${key}.base`, mode: 5, value: "0", priority: 10 },
      { key: `system.attributes.${key}.racial`, mode: 2, value: String(d.abilities[k]), priority: 20 }
    ]), `${abilityText} — the printed scores.`),
    changesEffect(id, `${d.name}: size and speed`, [{ key: "system.identity.size", mode: 5, value: d.size, priority: 10 }, ...speedChanges],
      `${d.size}; ${Object.entries(d.speeds).map(([m, v]) => `${m} ${v}`).join(", ")}. It grows with the Dragon Companion Table.`),
    changesEffect(id, `${d.name}: natural armour`, [{ key: "system.combat.naturalArmourBase.natural", mode: 5, value: String(d.naturalDR), priority: 10 }],
      `DR ${d.naturalDR} (base — scales with BDB): the printed DR ${d.printed.dr} at BDB ${d.level}.`)
  ];
  const { bookName: _b, printed: _p, ...data } = d;
  return {
    _id: id, name: d.name, img: "icons/svg/mystery-man.svg", type: "race",
    system: {
      source: "Inner Tempest, Chapter 5", category: "Base Creature", tier: "", level: 0, prerequisites: "", active: true,
      description: [
        printedBlock(d),
        how("auto", `hatched by Dragon Tamer at level ${d.level}, with the skill ranks printed (B10-7), the feats printed (${d.freeFeats.length ? `${d.freeFeats.join(", ")} granted free, B10-9` : "each counting as a pick made"}), its languages, immunities and weakness. The breath is ${d.level}d${d.breath.die.slice(1)} at ${d.level} and a die a level after (C5), a Focus ability with a basic Reflex save at the creature DC; it grows ${d.breath.shape === "line" ? "as a line" : "as a cone"} with the table. Its specials arrive by its own level from the system's Creature Codex. Its DB is the printed block's (Graham, 28 October 2026): the system's creature rule, half its level as an other bonus and its class bonus − 2 as a status bonus. Its natural attacks follow the system's one size ladder (B10-10).${d.key === "earth" ? " It has wings but does not fly (B10-4)." : ""}`)
      ].join("\n"),
      traits: "", abilityModifiers: abilityText, maximumSize: "", languages: d.languages,
      grantedFeats: "", racialAbilities: `Darkvision, Nightvision, Scent, ${d.breath.name}, High Magic`,
      grantedWeapons: `Bite (${d.name}), Claws (Dragon)`,
      specialistSkills: "", coreLanguages: "", additionalLanguages: "", languageChoices: ""
    },
    effects, folder: null, sort: 0, ownership: { default: 0 },
    flags: { [SYSTEM_ID]: { itDragon: {
      key: data.key, name: data.name, baseLevel: data.level, el: data.el, size: data.size, ...data.speeds, fly: data.speeds.fly ?? 0,
      element: data.breath.type, breath: { name: data.breath.name, die: data.breath.die, shape: data.breath.shape, type: data.breath.type },
      specials: data.specials, baseSpecials: data.baseSpecials, feats: data.feats, freeFeats: data.freeFeats,
      skills: data.skills, spells: data.spells, languages: data.languages, immunities: data.immunities, weaknesses: data.weaknesses, egg: data.egg
    } } },
    _stats: { ...STATS }
  };
}

function dragonEgg(d) {
  const item = gear({
    name: d.egg, price: 0, weight: 5,
    description: [
      md(rules("ACQUIRING A DRAGON").join("\n\n")),
      how("auto", `while you carry it, each daily preparation counts a day of bonding (the hour's meditation is yours to make). It is ready at 28 days, which the GM may raise on the egg's flag ("may take longer"). Dragon Tamer's Use then hatches a ${d.name.toLowerCase()} and consumes the egg.`)
    ].join("\n"),
    flags: { itDragonEgg: { dragon: d.name, days: 0, required: 28 } }
  });
  item._id = stableId(`it-dragons:${d.egg}`);
  item.system.source = "Inner Tempest, Chapter 5";
  return item;
}

export const BLOCK10_DRAGONS = [dragonClass(), ...DRAGONS.map(dragonRace), ...DRAGONS.map(dragonEgg)];

/* ------------------------------------------------------------------ */
/* Natural attacks, breath, High Magic                                   */
/* ------------------------------------------------------------------ */

export const BLOCK10_NATURAL_ATTACKS = [
  ...DRAGONS.map((d) => {
    const item = naturalAttack({
      name: `Bite (${d.name})`, damage: "1d8", damageType: "piercing", traits: "Finesse",
      description: `A ${d.name.toLowerCase()}'s bite: 1d8 piercing at Medium, plus ${d.bite.secondary.dice} ${d.bite.secondary.type}. As printed: ${BOOK10.dragons[d.bookName].attacks[0]}.\n\nResized to the dragon by the system (B10-10: one size ladder, Small 1d6), and its damage grows with BAB.`,
      img: "systems/trg-prime/assets/weapons/claw.png"
    });
    item.flags[SYSTEM_ID] = { creatureAttack: { secondary: { ...d.bite.secondary } } };
    return item;
  }),
  naturalAttack({
    name: "Claws (Dragon)", damage: "1d6", damageType: "slashing", traits: "Agile, Finesse, Versatile (P)",
    description: `A dragon companion's claws: 1d6 slashing at Medium. As printed for the cold dragon: ${BOOK10.dragons["COLD DRAGON"].attacks[1]}.\n\nResized to the dragon by the system (B10-10: Small 1d5), and its damage grows with BAB.`
  })
];

function breathAbility(d) {
  const b = BOOK10.dragons[d.bookName].breath;
  return ability({
    name: d.breath.name, sourceRace: d.name, traits: d.breath.traits, usesPerDay: "1",
    description: [
      md(`**${b.title.toUpperCase()}**\n\n**${b.traits.toUpperCase()}**\n\n**Action** ${b.ap} AP\n\n${b.text}`),
      how("auto", `Use: 2 AP, then target the creatures in the ${d.breath.shape}. ${d.level}d${d.breath.die.slice(1)} ${d.breath.type} at level ${d.level}, one ${d.breath.die} a level (C5), basic Reflex at the dragon's level DC (interpretation 2: High Magic's +2 is for spells). One use; Refocus restores it. Its length follows the Dragon Companion Table (the card's intro names it).`)
    ].join("\n"),
    flags: {
      creatureAbility: {
        printedTraits: b.traits.toUpperCase(), printedAction: `Action ${b.ap} AP`, printedArea: `${d.breath.feet}-foot ${d.breath.shape}`,
        activation: { kind: "action", ap: b.ap, save: "reflex" },
        area: { save: "reflex", basic: true, damage: { perLevel: d.breath.die, type: d.breath.type }, scope: "targets", intro: `A ${d.breath.feet}-foot ${d.breath.shape} — target the creatures in it.`, breath: true },
        source: "Inner Tempest, Chapter 5"
      }
    }
  });
}

const HIGH_MAGIC = ability({
  name: "High Magic",
  description: [
    md(`**HIGH MAGIC**\n\n${BOOK10.highMagic.intro}\n\n${BOOK10.highMagic.bullets.map((l) => `• ${l}`).join("\n")}`),
    how("auto", "the dragon carries the system's High Magic (casting DCs +2, Heighten's benefit at no PP, Spell Fumble checks +50), and this ability opens every tradition's spells to its repertoire.")
  ].join("\n"),
  flags: { creatureAbility: { derives: { learnTraditions: "any" }, source: "Inner Tempest, Chapter 5" } }
});

export const BLOCK10_ABILITIES = [...DRAGONS.map(breathAbility), HIGH_MAGIC];

/* ------------------------------------------------------------------ */
/* Dragon Tamer and the four companion feats                             */
/* ------------------------------------------------------------------ */

const tamer = BOOK10.tamer;
const DRAGON_TAMER = (() => {
  const item = feat({
    name: "Dragon Tamer", category: "Archetype", prerequisites: tamer.prerequisites,
    description: [
      md(`*${tamer.flavour}*`),
      md(`**Prerequisites** ${tamer.prerequisites}\n\n**Special Prerequisite** ${tamer.special}`),
      md(tamer.lines.join("\n\n")),
      md(`**Progression Requirements** ${tamer.progression}`),
      how("auto", "Use: checks Inner Discipline, 8 ranks of Arcana, the Dragon Lore specialist skill (B10-11, however gained) and an egg that has finished bonding, then hatches it: your Dragon Companion, a linked companion actor at its base level, which gains a level whenever you do (B10-1). One dragon (B10-12); a ranger keeps the wolf. With a dragon bonded, the Use is the GM's: separated (Soul Drain half its level, held, and Refocus Hard) or reunited. Its death is automated (B10-13).")
    ].join("\n")
  });
  item.system.progressionRequirements = tamer.progression;
  return item;
})();

const bookFeat = (key) => BOOK10.feats[key] ?? fail(`the book has no feat ${key}`);
function companionFeat(key, { kind = "auto", how: text, flags = {}, repeatable = false }) {
  const b = bookFeat(key);
  const name = titleWords(key).replace(/,/g, "");
  const fields = ["Prerequisites", "Trigger", "Action"].filter((k) => b.fields[k]).map((k) => `**${k}** ${b.fields[k]}`).join("\n\n");
  return feat({
    name, category: "General", traits: "Companion", prerequisites: b.fields.Prerequisites ?? "", repeatable,
    description: [md(`**${key}**${fields ? `\n\n${fields}` : ""}\n\n${b.lines.join("\n\n")}`), how(kind, text)].join("\n"),
    flags: { companionKind: "dragon", ...flags }
  });
}

export const BLOCK10_FEATS = [
  DRAGON_TAMER,
  companionFeat("DEFLECTING WINGS", {
    how: "offered as a reaction before an attack against a Large or larger dragon is rolled: +2 circumstance to DB against that attack, which removes it (spends the reaction). Offered to the dragon companions only (C4)."
  }),
  companionFeat("DRACONIC SPELL", {
    repeatable: true,
    how: "Use once per copy of the feat: choose an arcane spell; it is added as an innate spell with the Focus trait (one use; Refocus restores it). Take the feat again for another."
  }),
  companionFeat("IMITATE SOUND", {
    kind: "partly",
    how: "+4 circumstance is offered on Deception checks — tick it when the check mimics a sound the dragon has heard. Only the light dragon may take it: another dragon is warned when it is added.",
    flags: { conditionals: [conditional({ kind: "modifier", value: 4, type: "circumstance", label: "Imitate Sound", scope: "Deception to mimic a sound it has heard — tick if so", auto: false, when: { checkTypes: ["skill"], subjects: ["deception"] } })] }
  }),
  companionFeat("TAIL LASH", {
    kind: "partly",
    how: "Use, when a creature in reach of the tail Strikes (target it first): spends the reaction and makes a tail Strike at −2 circumstance. Needs a Large dragon with its Tail Slap (Base +10); the trigger is the table's to call."
  })
];
