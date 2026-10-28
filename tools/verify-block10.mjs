#!/usr/bin/env node
/**
 * verify-block10 — Inner Tempest Block 10 (1.0.0; 1.0.1's live fixes): the Dragon Companions and
 * Dragon Tamer, checked against the book, against the system that reads them,
 * and by driving the decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block10.mjs
 *
 * Needs TRG Prime 3.674.2 at TRG_PRIME_ROOT (its packs are read for the
 * names the dragons borrow).
 *
 *   A  The book (tools/content/book-text-block10.json, cut from the v1.2 docx
 *      by tools/content/extract-book-block10.mjs): the Dragon Companion Table,
 *      the class's rules, each base dragon's block, the four feats, Dragon
 *      Tamer, High Magic; and each printed block re-derived from the rules
 *   B  The system reads them: the kind and its level (C1, C2), size (C3), the
 *      feats by kind (C4), the breath's dice (C5), the growth effect's keys,
 *      the repertoire (C10), Wing Buffet's fallback (C11), the secondary
 *      damage, the elemental specials, High Magic; every borrowed name is in
 *      the system's packs
 *   C  The decisions: growth by levels gained, specials by level, the egg,
 *      the bond's arithmetic, the feat prerequisites
 *   D  Registration and the Foundry half, driven with stand-ins: growth kept
 *      in step, the hatching, the egg's days, the death and the weekly
 *      recovery, the separation, Deflecting Wings, Draconic Spell, Tail Lash
 *   E  Wiring: the hooks, versions, packs, status lines
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM_ROOT = process.env.TRG_PRIME_ROOT ?? path.resolve(ROOT, "..", "core", "trg-prime");
const sys = (...p) => new URL(`file://${path.join(SYSTEM_ROOT, ...p)}`).href;

let checks = 0;
const failures = [];
function ok(label, condition, detail = "") { checks += 1; if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`); }
function equal(label, actual, expected) { ok(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

const B10 = await import("./content/block10.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const auto = await import("../module/block10-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block10.json"), "utf8"));

const api = await import(sys("module", "module-api.mjs"));
const comp = await import(sys("module", "companion.mjs"));
const compFeats = await import(sys("module", "companion-feats.mjs"));
const picker = await import(sys("module", "picker-filters.mjs"));
const area = await import(sys("module", "creature-area.mjs"));
const rep = await import(sys("module", "magic", "repertoire.mjs"));
const config = await import(sys("module", "config.mjs"));
const creatureBonuses = await import(sys("module", "creature-bonuses.mjs"));
const damage = await import(sys("module", "combat", "damage.mjs"));
const bonusRegistry = await import(sys("module", "bonuses", "registry.mjs"));
const secondary = await import(sys("module", "combat", "creature-secondary.mjs"));
const rules = await import(sys("module", "creature-ability-rules.mjs"));
const soulDrain = await import(sys("module", "conditions", "soul-drain.mjs"));
const codexDecl = await import(sys("tools", "ff30-codex-declarations.mjs"));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));

const strip = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const has = (doc, line) => strip(doc.system.description).includes(strip(md(line)));
const F = (doc) => doc.flags?.["trg-prime"] ?? {};
const byName = (list, name) => list.find((d) => d.name === name);
const clone = (x) => JSON.parse(JSON.stringify(x));

/** The names in one of the system's packs (LevelDB, read from a copy). */
async function packNames(pack) {
  const { ClassicLevel } = await import("classic-level");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "it-b10-"));
  fs.cpSync(path.join(SYSTEM_ROOT, "packs", pack), tmp, { recursive: true });
  fs.rmSync(path.join(tmp, "LOCK"), { force: true });
  const db = new ClassicLevel(tmp, { valueEncoding: "json" });
  const names = new Set();
  try { for await (const [, v] of db.iterator({ gte: "!items!", lt: "!items!~" })) names.add(v.name); } finally { await db.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
  return names;
}

const dragonClass = B10.BLOCK10_DRAGONS.find((d) => d.type === "class");
const races = B10.BLOCK10_DRAGONS.filter((d) => d.type === "race");
const eggs = B10.BLOCK10_DRAGONS.filter((d) => d.type === "gear");
const raceOf = (key) => races.find((r) => F(r).itDragon.key === key);
const dragonOf = (key) => B10.DRAGONS.find((d) => d.key === key);

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

{
  // The harness's own reading of the cells, so a slip in the content's parse is seen.
  const cell = (c) => { const m = /^Base(?: ([+-])(\d+))?$/.exec(c.replace(/\s+/g, " ").replace(/([+-]) /, "$1")); return m ? (m[1] === "-" ? -1 : 1) * Number(m[2] ?? 0) : NaN; };
  const ft = (c) => Number(/^(\d+) ft\.$/.exec(c)?.[1]);
  const mine = book.table.map((c) => ({ gained: cell(c[0]), size: cell(c[1]), land: cell(c[2]), fly: cell(c[3]), str: cell(c[4]), con: cell(c[5]), dex: cell(c[6]), mental: cell(c[7]), attacks: c[8].split(", "), line: ft(c[9]), cone: ft(c[10]) }));
  equal("A the Dragon Companion Table: twenty-one rows, Base to Base +20, every cell as printed", clone(B10.DRAGON_TABLE), mine);
  equal("A …and the class carries it", F(dragonClass).itDragonTable, mine);
  equal("A the table's milestones: Wings at +6, Tail at +10, Crush at +16, Sweep at +20; four size steps; breath 30→120 ft line, 15→60 ft cone",
    [mine.findIndex((r) => r.attacks.includes("Wings")), mine.findIndex((r) => r.attacks.includes("Tail")), mine.findIndex((r) => r.attacks.includes("Crush")), mine.findIndex((r) => r.attacks.includes("Sweep")), mine[20].size, [mine[0].line, mine[20].line], [mine[0].cone, mine[20].cone]],
    [6, 10, 16, 20, 4, [30, 120], [15, 60]]);
}
{
  const s = dragonClass.system;
  equal("A the class: 12 HP, 8 + Int skill points, the fifteen class skills, Minion, arcane instinctive on Charisma, four cantrips",
    [s.hitPoints, s.skillPoints, s.skillPointAbility, s.classSkills, s.traits, s.magicalTradition, s.magicalAbility, s.casterStyle, s.cantripsKnown],
    [12, 8, "intelligence", book.rules["CLASS SKILLS"][1].replace(/\.+$/, ""), "Minion", "arcane", "charisma", "instinctive", 4]);
  const wrong = s.progression.filter((r, i) => {
    const L = i + 1;
    return r.level !== L || r.bab !== L || r.bdb !== L || r.fortitude !== 5 + L || r.reflex !== 5 + L || r.will !== 5 + L || r.bonusFeats !== Math.ceil(L / 2) || r.casterLevel !== (L > 3 ? L - 3 : null) || r.pp !== 4 * L || r.bsb !== L;
  }).map((r) => r.level);
  equal("A thirty rows: BAB = BDB = level, saves 5 + level, a general feat at 1st and every 2 levels, caster level − 3, 4 PP and BSB +1 a level", [s.progression.length, wrong], [30, []]);
  equal("A every rule the chapter prints is in the class's description", ["TRAITS", "LEVEL", "CLASS SKILLS", "SKILL POINTS", "FEATS", "HIT POINTS", "BASE ATTACK/DEFENCE BONUS", "SAVING THROWS", "OTHER ABILITIES", "ABILITY SCORES", "ATTACKS", "BREATH WEAPON"]
    .flatMap((hd) => book.rules[hd]).filter((l) => !has(dragonClass, l)), []);
}

// Each block, re-derived from the chapter's rules and the system's tables.
for (const d of B10.DRAGONS) {
  const b = book.dragons[d.bookName];
  const L = d.level;
  const ab = Object.fromEntries(Object.entries(b.abilities).map(([k, v]) => [k, v]));
  const feats = new Set(d.feats);
  const featSave = (n) => (feats.has(n) ? 2 : 0);
  const sizeHP = config.SIZE_TABLE[d.size].baseHP;
  const derived = {
    hp: sizeHP + (12 + ab.CON) * L,
    fort: 5 + L + ab.CON + featSave("Great Fortitude"), ref: 5 + L + ab.DEX + featSave("Lightning Reflexes"), will: 5 + L + ab.WIS + featSave("Iron Will"),
    dc: L + 14, pp: 4 * L + ab.CHA, dr: d.naturalDR * damage.drMultiplier(L),
    initiative: (ab.DEX + ab.WIS) * 5 + (feats.has("Improved Initiative") ? 20 : 0),
    breath: `${L}${d.breath.die}`
  };
  const printed = { hp: d.printed.hp, fort: d.printed.fort, ref: d.printed.ref, will: d.printed.will, dc: d.dc, pp: Number(/PP (\d+)/.exec(b.magic.join(" "))[1]), dr: d.printed.dr, initiative: d.printed.initiative, breath: /(\d+d\d+)/.exec(b.breath.text)[1] };
  equal(`A ${d.name}: HP, saves, DC, PP, DR, Initiative and breath, derived from the rules, are the block's`, derived, printed);
  // THE PRINTED BLOCK'S DB (Graham, 28 October 2026: "Printed block for dragon db"): the
  // system's Creature Codex rule for companions — half the level as an other bonus, class
  // bonus − 2 as a status bonus — read through the system's own function, and every block matches.
  const creature = creatureBonuses.creatureLevelBonuses({ actorType: "companion", level: L, classBonus: config.classBonusForLevel(L) });
  const db = 10 + L + ab.DEX + creature.defenceOther + creature.defenceStatus;
  equal(`A ${d.name}: the system's DB (10 + BDB + Dex + the creature rule's other and status bonuses) is the printed block's`, [db, d.printed.db], { cold: [19, 19], earth: [19, 19], fire: [23, 23], light: [24, 24] }[d.key]);
  const r = raceOf(d.key);
  equal(`A ${d.name}: every line of its block is on its race item`, [...Object.values(b.fields).map(String), b.skills, ...b.defence, ...b.attacks, ...b.magic, b.breath.text, b.description].filter((l) => !strip(r.system.description).includes(strip(md(l)))), []);
  const f = F(r).itDragon;
  equal(`A ${d.name}: its figures as printed — level, size, speeds, element, breath, specials by level, skills, spells, feats`,
    [f.baseLevel, f.size, f.land, f.fly, f.element, f.breath, f.specials, f.skills, f.spells, [...f.feats, ...f.baseSpecials].sort()],
    [Number(b.fields.Level), b.fields.Size.toLowerCase(), Number(/^(\d+)/.exec(b.fields.Speed)[1]), Number(/Fly (\d+)/.exec(b.fields.Speed)?.[1] ?? 0), b.breath.traits.split(", ").find((t) => ["cold", "acid", "fire", "electricity"].includes(t)),
      { name: b.breath.title, die: `d${/\d+d(\d+)/.exec(b.breath.text)[1]}`, shape: /foot (cone|line)/.exec(b.breath.text)[1], type: b.breath.traits.split(", ").find((t) => ["cold", "acid", "fire", "electricity"].includes(t)) },
      b.levels, Object.fromEntries([...b.skills.matchAll(/([A-Za-z ]+?)\s*\+\d+\((\d+)\)/g)].map(([, n, v]) => [n.trim().replace(/ (\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toLowerCase()), Number(v)])),
      Number(/(\d+) additional spell/.exec(b.magic.join(" "))[1]), b.special.join(" ").split(",").map((s) => s.trim()).filter(Boolean).sort()]);
  const changes = Object.fromEntries(r.effects.flatMap((e) => e.changes).map((c) => [c.key, [c.mode, c.value]]));
  equal(`A ${d.name}: its scores as racial adds over a base of 0, its size and speeds, and its natural armour`,
    [["STR", "strength"], ["CON", "constitution"], ["DEX", "dexterity"], ["INT", "intelligence"], ["WIS", "wisdom"], ["CHA", "charisma"]].map(([k, key]) => [changes[`system.attributes.${key}.base`], changes[`system.attributes.${key}.racial`]])
      .concat([changes["system.identity.size"], changes["system.combat.movement.land"], changes["system.combat.naturalArmourBase.natural"]]),
    [["STR", "strength"], ["CON", "constitution"], ["DEX", "dexterity"], ["INT", "intelligence"], ["WIS", "wisdom"], ["CHA", "charisma"]].map(([k]) => [[5, "0"], [2, String(b.abilities[k])]])
      .concat([[5, d.size], [5, String(f.land)], [5, String(d.printed.dr / damage.drMultiplier(L))]]));
}
{
  const ranks = (key) => Object.values(dragonOf(key).skills).reduce((a, n) => a + n, 0);
  const budget = (key) => (8 + dragonOf(key).abilities.INT) * dragonOf(key).level;
  // The audit counted the light dragon's ranks as 46: they are 45, its budget exactly. Only the fire dragon overspends.
  equal("A the skill ranks ship as printed (B10-7): cold, earth and light spend exactly (8 + Int) × level; the fire dragon's 66 of 48 shows the overspend",
    ["cold", "earth", "fire", "light"].map((k) => [ranks(k), budget(k)]), [[36, 36], [36, 36], [66, 48], [45, 45]]);
  equal("A the feats: the light dragon's fourth (Lightning Reflexes) is the GM's extra, granted free (B10-9); the others are picks made (1st, 3rd, 5th …)",
    ["cold", "earth", "fire", "light"].map((k) => [dragonOf(k).feats.length - dragonOf(k).freeFeats.length, Math.ceil(dragonOf(k).level / 2), dragonOf(k).freeFeats]),
    [[2, 2, []], [2, 2, []], [3, 3, []], [3, 3, ["Lightning Reflexes"]]]);
  equal("A immunities and weakness as printed (the light dragon's missing comma read)", ["cold", "earth", "fire", "light"].map((k) => [dragonOf(k).immunities, dragonOf(k).weaknesses]),
    [["cold, paralysis, sleep", "fire"], ["acid, paralysis, sleep", ""], ["fire, paralysis, sleep", "cold"], ["electricity, paralysis, sleep", ""]]);
  equal("A each egg names its dragon and needs a lunar cycle", eggs.map((e) => [e.name, F(e).itDragonEgg]),
    B10.DRAGONS.map((d) => [`Dragon Egg (${d.name.split(" ")[0]})`, { dragon: d.name, days: 0, required: 28 }]));
  ok("A the egg carries the chapter's ACQUIRING A DRAGON", eggs.every((e) => book.rules["ACQUIRING A DRAGON"].every((l) => has(e, l))));
}
{
  const t = byName(B10.BLOCK10_FEATS, "Dragon Tamer");
  equal("A Dragon Tamer: an archetype, its prerequisites and progression as printed, every line on it",
    [t.system.category, t.system.prerequisites, t.system.progressionRequirements, [book.tamer.flavour, book.tamer.special, ...book.tamer.lines].filter((l) => !strip(t.system.description).includes(strip(md(l))))],
    ["Archetype", book.tamer.prerequisites, book.tamer.progression, []]);
  const four = ["DEFLECTING WINGS", "DRACONIC SPELL", "IMITATE SOUND", "TAIL LASH"];
  equal("A the four Dragon Companion feats: General, Companion-traited, for dragons (C4), their prerequisites and lines as printed; Draconic Spell repeatable",
    four.map((k) => { const d = B10.BLOCK10_FEATS.find((x) => x.name.toUpperCase() === k); return [d.system.category, d.system.traits, F(d).companionKind, d.system.prerequisites, book.feats[k].lines.filter((l) => !has(d, l)), d.system.repeatable]; }),
    four.map((k) => ["General", "Companion", "dragon", book.feats[k].fields.Prerequisites ?? "", [], k === "DRACONIC SPELL"]));
  const hm = byName(B10.BLOCK10_ABILITIES, "High Magic");
  equal("A High Magic: the four guidelines on it", [book.highMagic.bullets.length, book.highMagic.bullets.filter((l) => !strip(hm.system.description).includes(strip(l)))], [4, []]);
}

/* ------------------------------------------------------------------ *
 * B. The system reads them
 * ------------------------------------------------------------------ */

const coreNames = {
  abilities: await packNames("abilities"), codex: await packNames("creature-abilities"), feats: await packNames("feats"), attacks: await packNames("creature-attacks"), types: await packNames("creature-types")
};
{
  const specials = [...new Set(B10.DRAGONS.flatMap((d) => [...d.specials.map(([, n]) => n), ...d.baseSpecials]))];
  const missing = specials.map((n) => auto.specialSource(n)).filter((s) => !(s.pack === "trg-prime.feats" ? coreNames.feats : coreNames.codex).has(s.name)).map((s) => s.name);
  equal("B every special the dragons gain is in the system's Creature Codex (Wild Stride in its feats), the elemental ones by the codex entry their name reads", missing, []);
  equal("B the growth's grants are there too: Wings, Tail Slap, Crush", [coreNames.attacks.has("Wings"), coreNames.attacks.has("Tail Slap"), coreNames.codex.has("Crush")], [true, true, true]);
  equal("B the base feats are the system's", [...new Set(B10.DRAGONS.flatMap((d) => d.feats))].filter((n) => !coreNames.feats.has(n)), []);
  equal("B the senses are the system's abilities, and Wyrm a creature type", [["Darkvision", "Nightvision", "Scent"].filter((n) => !coreNames.abilities.has(n)), coreNames.types.has("Wyrm")], [[], true]);
  const itAbilities = new Set(PACKS.find((p) => p.name === "it-abilities").docs.map((d) => d.name));
  const itAttacks = new Set(PACKS.find((p) => p.name === "it-companions").docs.map((d) => d.name));
  equal("B each race's grants resolve: its breath and High Magic among the module's abilities, its bite and the claws among its natural attacks",
    races.map((r) => [r.system.racialAbilities.split(", ").filter((n) => !itAbilities.has(n) && !coreNames.abilities.has(n)), r.system.grantedWeapons.split(", ").filter((n) => !itAttacks.has(n))]),
    races.map(() => [[], []]));
  equal("B the elemental specials read their energy from the called name", ["Freezing Aura", "Caustic Blood", "Caustic Strikes", "Fiery Blood", "Fiery Aura", "Shocking Aura", "Freezing Blood"].map((n) => [auto.specialSource(n).name, rules.elementOfName(n)]),
    [["Elemental Aura", "cold"], ["Elemental Blood", "acid"], ["Elemental Strikes", "acid"], ["Elemental Blood", "fire"], ["Elemental Aura", "fire"], ["Elemental Aura", "electricity"], ["Elemental Blood", "cold"]]);
  equal("B a renamed Elemental Strikes is the system's: Caustic Strikes, 1d6 acid, doubling the bite's own",
    rules.abilityElementalStrikes([{ type: "ability", name: "Caustic Strikes", flags: { "trg-prime": { creatureAbility: { derives: { elementalStrikes: { dice: "1d6", doublesExisting: true } } } } } }]), { dice: "1d6", type: "acid", doubles: true });
}
{
  // C1, C2 — the kind, through the system's own normaliser and level rule.
  api.registerCompanionKind({ ...auto.DRAGON_KIND_SPEC }, "trg-inner-tempest");
  const spec = comp.companionKindSpec("dragon");
  equal("B the dragon kind: its pack, class and type, no size Str/Dex (C6), no ability points (C7)",
    [spec?.label, spec?.className, spec?.creatureType, spec?.pack, spec?.sizeAbilityMods, spec?.abilityPoints, typeof spec?.levelFrom], ["Dragon Companion", "Dragon Companion", "Wyrm", "trg-inner-tempest.it-dragons", false, false, "function"]);
  const master = { system: { identity: { level: 11 } } };
  const dragon = (base, hatchedAt) => ({ system: { companion: { kind: "dragon" } }, flags: { "trg-inner-tempest": { itDragon: { baseLevel: base, hatchedAt } } } });
  equal("B its level (B10-1): base + the master's levels since it hatched — a cold dragon hatched at 8 is 7 at the master's 11; never below its base; a fire dragon 6 at hatching",
    [comp.expectedCompanionLevel(master, dragon(4, 8)), comp.expectedCompanionLevel({ system: { identity: { level: 8 } } }, dragon(4, 8)), comp.expectedCompanionLevel({ system: { identity: { level: 5 } } }, dragon(4, 8)), comp.expectedCompanionLevel(master, dragon(6, 11))],
    [7, 4, 4, 6]);
  equal("B the class and race live in the dragons' pack, which extends nothing, so no dragon is offered as an animal companion",
    [PACKS.find((p) => p.name === "it-dragons").extends, PACKS.find((p) => p.name === "it-dragons").docs.filter((d) => ["class", "race"].includes(d.type)).map((d) => d.name)],
    [undefined, ["Dragon Companion", "Cold Dragon", "Earth Dragon", "Fire Dragon", "Light Dragon"]]);
}
{
  // C3 — size, through the system's own reading.
  const g = (key, level) => auto.dragonGrowth(F(raceOf(key)).itDragon, B10.DRAGON_TABLE, level);
  equal("B the size the system grows to: a cold dragon Small at 4, Medium at 6, Large at 8, Huge at 18, Gargantuan at 24; an earth dragon Large at 6",
    [[4, 6, 8, 18, 24].map((l) => compFeats.companionCurrentSize({ startingSize: "small", maximumSize: "", featNames: [], grownSize: g("cold", l).size })), compFeats.companionCurrentSize({ startingSize: "medium", grownSize: g("earth", 6).size })],
    [["small", "medium", "large", "huge", "gargantuan"], "large"]);
  // C4 — feats by kind.
  equal("B the four feats are offered to dragons only; an animal companion's to animals (C4)",
    [B10.BLOCK10_FEATS.filter((d) => d.system.category === "General").map((d) => picker.companionFeatKind(d)), picker.companionFeatKind({ system: { traits: "Companion" }, flags: {} }), picker.companionFeatKind(byName(B10.BLOCK10_FEATS, "Dragon Tamer"))],
    [["dragon", "dragon", "dragon", "dragon"], "animal", ""]);
  // C5 — the breath's dice.
  const breaths = B10.BLOCK10_ABILITIES.filter((d) => F(d).creatureAbility?.area?.breath);
  equal("B each breath is rolled at the user's level: 4d8 cold, 4d8 acid, 6d8 fire and 5d10 electricity at the base levels; 9d8 at 9",
    [...breaths.map((d) => area.declaredAreaUse(d, { level: B10.DRAGONS.find((x) => x.breath.name === d.name).level }).spec.damage), area.declaredAreaUse(breaths[0], { level: 9 }).spec.damage.formula],
    [{ type: "cold", formula: "4d8" }, { type: "acid", formula: "4d8" }, { type: "fire", formula: "6d8" }, { type: "electricity", formula: "5d10" }, "9d8"]);
  equal("B each breath is a 2 AP Focus ability, one use, a basic Reflex save, remembered as a breath",
    breaths.map((d) => [F(d).creatureAbility.activation, d.system.usesPerDay, d.system.usesValue, /\bFocus\b/.test(d.system.traits), F(d).creatureAbility.area.save, F(d).creatureAbility.area.basic, area.declaredAreaUse(d, { level: 5 }).breath]),
    breaths.map(() => [{ kind: "action", ap: 2, save: "reflex" }, "1", 1, true, "reflex", true, true]));
}
{
  // The growth effect's keys, through the system's own reader.
  const growth = auto.dragonGrowth(F(raceOf("light")).itDragon, B10.DRAGON_TABLE, 13);
  const changes = auto.growthChanges(growth);
  equal("B the growth effect: every key a pool the system reads, untyped growth, and nothing to DB (the printed block's DB is the system's creature rule)",
    changes.map((c) => [c.type, bonusRegistry.parseBonusKey(c.key), c.value]),
    [["custom", { target: "system.combat.movement.land", type: "untyped" }, "15"], ["custom", { target: "system.combat.movement.fly", type: "untyped" }, "40"],
      ["custom", { target: "system.attributes.strength", type: "untyped" }, "3"], ["custom", { target: "system.attributes.constitution", type: "untyped" }, "3"],
      ["custom", { target: "system.attributes.dexterity", type: "untyped" }, "-2"],
      ["custom", { target: "system.attributes.intelligence", type: "untyped" }, "2"], ["custom", { target: "system.attributes.wisdom", type: "untyped" }, "2"], ["custom", { target: "system.attributes.charisma", type: "untyped" }, "2"]]);
  // C10 — the repertoire.
  const cls = dragonClass;
  const at = (key, level) => rep.repertoirePickCount(level, rep.repertoireSchedule(cls, { flags: { "trg-prime": { repertoire: auto.dragonRepertoire(F(raceOf(key)).itDragon) } } }));
  equal("B spells known (B10-6): the block's own count at its base level, one more a level — cold 2, earth 4, fire 5, light 3; then +1 a level",
    [["cold", 4], ["earth", 4], ["fire", 6], ["light", 5], ["cold", 5], ["cold", 10], ["fire", 9]].map(([k, l]) => at(k, l)), [2, 4, 5, 3, 3, 8, 8]);
  ok("B …and the first picks are not held to PP 2", rep.repertoireState({ level: 4, picked: 0, schedule: rep.repertoireSchedule(cls, { flags: { "trg-prime": { repertoire: auto.dragonRepertoire(F(raceOf("cold")).itDragon) } } }) }).firstPicksOutstanding === false);
  // C11 — Wing Buffet's fallback, on the codex entry itself.
  const buffet = codexDecl.NEW_ENTRIES.find((e) => e.name === "Wing Buffet").flags["trg-prime"].creatureAbility.area;
  const fb = auto.withWingsFallback(buffet);
  equal("B Wing Buffet before the Wings (B10-5): the core Wings at the dragon's size (Medium 1d8, Large 1d10) with its Strength; every wing rung, twice on fumble and blunder",
    [area.resolveAreaDamageSource(fb, [], { strength: 3, size: "medium" }).damageByRung, area.resolveAreaDamageSource(fb, [], { strength: 3, size: "large" }).damageByRung.partial],
    [{ partial: "1d8+3", failure: "1d8+3", fumble: "2*(1d8+3)", blunder: "2*(1d8+3)" }, "1d10+3"]);
  ok("B …and the codex entry itself is left as it was", !JSON.stringify(buffet).includes("fallback"));
  // The bite's secondary damage, through the system.
  const bite = byName(B10.BLOCK10_NATURAL_ATTACKS, "Bite (Cold Dragon)");
  equal("B each bite: 1d8 piercing at Medium (Small 1d6, B10-10) with 1d6 of its element, read as the system reads a creature's secondary",
    [bite.system.damage, bite.system.size, comp.resizedNaturalDamage("1d8", "medium", "small"), secondary.creatureSecondaryPackets(bite).map((p) => [p.dice, p.type]),
      B10.BLOCK10_NATURAL_ATTACKS.filter((d) => /^Bite/.test(d.name)).map((d) => F(d).creatureAttack.secondary.type),
      byName(B10.BLOCK10_NATURAL_ATTACKS, "Claws (Dragon)").system.damage, comp.resizedNaturalDamage("1d6", "medium", "small")],
    ["1d8", "medium", "1d6", [["1d6", "cold"]], ["cold", "acid", "fire", "electricity"], "1d6", "1d5"]);
  // High Magic.
  equal("B High Magic opens every tradition, as the system reads it", rules.castingDerives([byName(B10.BLOCK10_ABILITIES, "High Magic")]).traditions, "any");
}

/* ------------------------------------------------------------------ *
 * C. The decisions
 * ------------------------------------------------------------------ */

{
  const cold = F(raceOf("cold")).itDragon;
  const g = (lvl) => auto.dragonGrowth(cold, B10.DRAGON_TABLE, lvl);
  equal("C growth reads levels gained; specials read the dragon's own level (interpretation 1)",
    [[4, 10, 14, 20, 24].map((l) => g(l).gained), g(4).specials, g(8).specials, g(13).specials],
    [[0, 6, 10, 16, 20], [], ["Snowvision", "Draconic Assault"], ["Snowvision", "Draconic Assault", "Wing Buffet", "Frightful Aura"]]);
  equal("C the grants at +6, +10, +16 and +20: Wings, Tail Slap, Crush, then Sweep on the tail (B10-3)",
    [10, 14, 20, 24].map((l) => auto.wantedGrants(g(l)).filter((w) => !w.key.startsWith("special:") || w.key === "special:Crush").map((w) => [w.name, w.extraTraits ?? []])),
    [[["Wings", []]], [["Wings", []], ["Tail Slap", []]], [["Wings", []], ["Tail Slap", []], ["Crush", []]], [["Wings", []], ["Tail Slap", ["Sweep"]], ["Crush", []]]]);
  equal("C the earth dragon has wings but does not fly (B10-4): its Wings at +6, no fly growth",
    [auto.wantedGrants(auto.dragonGrowth(F(raceOf("earth")).itDragon, B10.DRAGON_TABLE, 10)).some((w) => w.name === "Wings"), auto.dragonGrowth(F(raceOf("earth")).itDragon, B10.DRAGON_TABLE, 10).fly,
      auto.growthChanges(auto.dragonGrowth(F(raceOf("earth")).itDragon, B10.DRAGON_TABLE, 10), 4).some((c) => c.key.includes("fly"))],
    [true, 0, false]);
  equal("C the breath's length follows the table: a cold cone 15 → 30 at +6; a light line 30 → 60 at +6, 120 at +20",
    [g(4).breathFeet, g(10).breathFeet, auto.dragonGrowth(F(raceOf("light")).itDragon, B10.DRAGON_TABLE, 11).breathFeet, auto.dragonGrowth(F(raceOf("light")).itDragon, B10.DRAGON_TABLE, 25).breathFeet, auto.breathIntro("line", 60)],
    [15, 30, 60, 120, "A 60-foot line — target the creatures in it."]);
  equal("C beyond Base +20 the last row holds; sizes clamp at Colossal; a level below the base gains nothing",
    [auto.growthRow(B10.DRAGON_TABLE, 40).gained, auto.sizeAfter("huge", 4), auto.sizeAfter("tiny", -3), g(2).gained], [20, "colossal", "diminutive", 0]);
  equal("C the dragon's level: base + levels gained; a dragon with no record has none; one not yet hatched starts at its base",
    [auto.dragonLevel({ system: { identity: { level: 12 } } }, { flags: { "trg-inner-tempest": { itDragon: { baseLevel: 5, hatchedAt: 9 } } } }), auto.dragonLevel({ system: { identity: { level: 12 } } }, { flags: {} }),
      auto.dragonLevel({ system: { identity: { level: 9 } } }, { flags: { "trg-inner-tempest": { itDragon: { baseLevel: 5 } } } })],
    [8, null, 5]);
  const egg = (days, lastDay, lastTime, required = 28) => ({ flags: { "trg-prime": { itDragonEgg: { dragon: "Cold Dragon", days, required, ...(lastDay === undefined ? {} : { lastDay, lastTime }) } } } });
  const D = 86400;
  equal("C the egg: a day for each daily preparation (interpretation 6) — with no world clock too — but not a second on a day the clock has moved into; ready at 28 (or the GM's number); nothing after",
    [auto.eggBondUpdate(egg(0), D * 3 + 5), auto.eggBondUpdate(egg(4, 3, D * 3 + 5), D * 3 + 50), auto.eggBondUpdate(egg(4, 3, D * 3 + 5), D * 3 + 5), auto.eggBondUpdate(egg(4, 3, D * 3 + 5), D * 4),
      auto.eggReady(egg(27)), auto.eggReady(egg(28)), auto.eggReady(egg(30, 1, 0, 35)), auto.eggBondUpdate(egg(28, 1, D), D * 9)],
    [{ "flags.trg-prime.itDragonEgg.days": 1, "flags.trg-prime.itDragonEgg.lastDay": 3, "flags.trg-prime.itDragonEgg.lastTime": D * 3 + 5 }, null,
      { "flags.trg-prime.itDragonEgg.days": 5, "flags.trg-prime.itDragonEgg.lastDay": 3, "flags.trg-prime.itDragonEgg.lastTime": D * 3 + 5 },
      { "flags.trg-prime.itDragonEgg.days": 5, "flags.trg-prime.itDragonEgg.lastDay": 4, "flags.trg-prime.itDragonEgg.lastTime": D * 4 }, false, true, false, null]);
  equal("C a broken bond's days: the clock's, or the preparations counted, whichever is more; restored in time means within 7",
    [auto.bondDays({ since: 0, preps: 2 }, 9 * D), auto.bondDays({ since: 0, preps: 9 }, 2 * D), [7, 8].map(auto.restoredInTime)], [9, 9, [true, false]]);
  equal("C the bond: a disrupted bond's drain is half the level, rounded up; a broken bond recovers a point each 7 days",
    [[7, 8, 13].map(auto.apartDrain), [0, 6, 7, 20, 21].map((d) => auto.weeksDue(0, d * 86400))], [[4, 4, 7], [0, 0, 1, 2, 3]]);
  const pen = auto.bondPenaltyEffect("Broken Bond");
  equal("C …and Refocus is Hard: −2 on Refocus checks, the same on every degree",
    pen.flags["trg-prime"].conditionals.map((c) => [c.kind, c.value, c.auto, c.when]), [["modifier", -2, true, { actions: ["refocus"] }]]);
  equal("C Dragon Lore (B10-11): the specialist skill by label, however it was gained",
    [auto.hasDragonLore({ system: { specialistSkills: { dragonLore: { label: "Dragon Lore" } } } }), auto.hasDragonLore({ system: { specialistSkills: { dragonLore: {} } } }), auto.hasDragonLore({ system: { specialistSkills: { ryukariLore: { label: "Ryukari Lore" } } } })],
    [true, true, false]);
  const dragonActor = (key, size, extra = []) => ({ type: "companion", system: { companion: { kind: "dragon" }, identity: { size } }, items: [raceOf(key), ...extra] });
  equal("C the prerequisites the core cannot read: Large Size, Tail Attack, Light Dragon — and dragons only",
    [auto.companionFeatWarning("Deflecting Wings", dragonActor("cold", "medium")), auto.companionFeatWarning("Deflecting Wings", dragonActor("cold", "large")),
      auto.companionFeatWarning("Tail Lash", dragonActor("cold", "large")), auto.companionFeatWarning("Tail Lash", dragonActor("cold", "huge", [{ type: "weapon", name: "Tail Slap" }])),
      auto.companionFeatWarning("Imitate Sound", dragonActor("cold", "small")), auto.companionFeatWarning("Imitate Sound", dragonActor("light", "small")),
      auto.companionFeatWarning("Imitate Sound", { type: "character", system: {}, items: [] }), auto.companionFeatWarning("Iron Will", dragonActor("cold", "small"))].map((w) => w.split(" ").slice(0, 3).join(" ")),
    ["Deflecting Wings needs", "", "Tail Lash needs", "", "Imitate Sound needs", "", "Imitate Sound is", ""]);
  equal("C at hatching: the printed ranks, its languages, its immunities and weakness, as fields the GM may edit",
    auto.hatchlingUpdate(F(raceOf("fire")).itDragon),
    { "system.skills.acrobatics.ranks": 4, "system.skills.arcana.ranks": 6, "system.skills.athletics.ranks": 4, "system.skills.climbing.ranks": 4, "system.skills.culture.ranks": 6, "system.skills.deception.ranks": 4, "system.skills.diplomacy.ranks": 4, "system.skills.intimidate.ranks": 4, "system.skills.meditation.ranks": 4, "system.skills.mentalFocus.ranks": 4, "system.skills.nature.ranks": 4, "system.skills.perception.ranks": 4, "system.skills.powerManipulation.ranks": 6, "system.skills.senseMotive.ranks": 4, "system.skills.survival.ranks": 4,
      "system.identity.languages": "Low Tongue, Wyrmish", "system.combat.immunities": "fire, paralysis, sleep", "system.combat.weaknesses": "cold" });
}

/* ------------------------------------------------------------------ *
 * D. Registration, and the Foundry half driven with stand-ins
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
const called = (n) => calls.filter((c) => c[0] === n);
equal("D registration: the dragon kind, Dragon Tamer as an archetype, three Uses and the Deflecting Wings reaction",
  [called("registerCompanionKind").map((c) => [c[1].key, c[1].pack, c[2]]), called("registerArchetype").filter((c) => c[1] === "Dragon Tamer").length,
    called("registerFeatAutomation").map((c) => c[1]).filter((n) => ["dragon tamer", "tail lash", "draconic spell"].includes(n)), called("registerDefenceOffer").filter((c) => c[1] === "Deflecting Wings").map((c) => c[2].against)],
  [[["dragon", "trg-inner-tempest.it-dragons", "trg-inner-tempest"]], 1, ["dragon tamer", "tail lash", "draconic spell"], ["attack"]]);

const said = { cards: [], created: [], deleted: [], updates: [], holds: [], releases: [], effects: [], warned: [], made: [] };
let pick = null;
let deadIds = new Set();
const helpersStub = {
  line: (t) => `<p>${t}</p>`,
  postCard: async (actor, title, lines) => { said.cards.push([title, lines.join(" ")]); },
  chooseFromList: async (title, prompt, options) => { said.offered = options.map((o) => o[1]); return pick; },
  createEffectsOn: async (actor, data) => { said.effects.push(...data); },
  rollWeaponAttack: async (actor, weapon, opts) => { said.made.push(["strike", weapon.name, opts.extraModifiers, opts.isReaction]); },
  isDead: async (actor) => deadIds.has(actor.id)
};
let idn = 0;
const mkDoc = (data, parent) => ({
  id: data.id ?? `i${(idn += 1)}`, ...clone(data), parent,
  getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
  async setFlag(scope, key, v) { this.flags = this.flags ?? {}; this.flags[scope] = { ...(this.flags[scope] ?? {}), [key]: v }; },
  async update(u) { said.updates.push([this.name, u]); for (const [k, v] of Object.entries(u)) setPath(this, k, v); }
});
function setPath(obj, key, v) {
  const parts = key.split(".");
  let o = obj;
  for (const p of parts.slice(0, -1)) { if (p.startsWith("-=")) return; o[p] = o[p] ?? {}; o = o[p]; }
  const last = parts.at(-1);
  if (last.startsWith("-=")) delete o[last.slice(2)]; else o[last] = v;
}
const mkActor = (extra = {}) => {
  const a = {
    id: `a${(idn += 1)}`, name: "Ana", type: "character", documentName: "Actor", isOwner: true, system: { identity: { level: 9 }, skills: {}, specialistSkills: {} }, flags: {}, items: [], effects: [],
    getFlag(scope, key) { return this.flags?.[scope]?.[key]; },
    async setFlag(scope, key, v) { this.flags[scope] = { ...(this.flags[scope] ?? {}), [key]: v }; },
    async unsetFlag(scope, key) { if (this.flags[scope]) delete this.flags[scope][key]; },
    async update(u) { said.updates.push([this.name, u]); for (const [k, v] of Object.entries(u)) setPath(this, k, v); },
    async createEmbeddedDocuments(type, data) {
      said.created.push(...data.map((d) => [this.name, type, d.name]));
      const docs = data.map((d) => mkDoc(d, this));
      if (type === "Item") this.items.push(...docs); else this.effects.push(...docs);
      return docs;
    },
    async deleteEmbeddedDocuments(type, ids) {
      said.deleted.push(...ids);
      if (type === "Item") this.items = this.items.filter((i) => !ids.includes(i.id)); else this.effects = this.effects.filter((e) => !ids.includes(e.id));
    },
    ...extra
  };
  for (const i of a.items) i.parent = a;
  return a;
};
const toPackDoc = (d) => ({ _id: d._id ?? d.name, name: d.name, data: d });
const packs = new Map([
  ["trg-prime.creature-attacks", [{ name: "Wings", type: "weapon", system: { damage: "1d6", size: "small", traits: "Finesse" }, flags: {} }, { name: "Tail Slap", type: "weapon", system: { damage: "1d8", size: "medium", traits: "Agile, Finesse" }, flags: {} }]],
  ["trg-prime.creature-abilities", [...codexDecl.NEW_ENTRIES, ...["Crush", "Snowvision", "Draconic Assault", "Frightful Aura", "Draconic Shifting", "Reflective Scales", "Elemental Aura", "Elemental Blood", "Elemental Strikes", "Ice Climb", "Smokevision", "Slowing Breath", "Spell Resilience", "Flyby Attack"].map((name) => ({ name, type: "ability", system: { traits: "" }, flags: {} }))]],
  ["trg-prime.feats", ["Wild Stride", "Alertness", "Iron Will", "Great Fortitude", "Lightning Reflexes", "Improved Initiative"].map((name) => ({ name, type: "feat", system: { traits: "" }, flags: {} }))],
  ["trg-inner-tempest.it-dragons", clone(B10.BLOCK10_DRAGONS)],
  ["trg-prime.spells", [{ _id: "sp1", name: "Fire Bolt", type: "spell", system: { tradition: "arcane", specialist: false, ppCost: 2, traits: "Attack" }, flags: {} }, { _id: "sp2", name: "Bless", type: "spell", system: { tradition: "divinity", ppCost: 2, traits: "" }, flags: {} }]]
].map(([id, docs]) => [id, docs.map(toPackDoc)]));
globalThis.ui = { notifications: { warn: (m) => said.warned.push(m), info: (m) => said.warned.push(m), error: (m) => said.warned.push(m) } };
globalThis.foundry = { utils: { hasProperty: (o, k) => k.split(".").reduce((x, p) => (x && typeof x === "object" && p in x ? x[p] : undefined), o) !== undefined } };
const holdApi = {
  helpers: helpersStub,
  companionsOf: async (master, kind) => (globalThis.game.actors ?? []).filter((a) => a.type === "companion" && a.system.companion.masterId === master.id && a.system.companion.kind === kind),
  holdSoulDrain: async (actor, source, n) => { said.holds.push([source, n]); const held = actor.flags["trg-prime"]?.soulDrainHeld ?? {}; actor.flags["trg-prime"] = { ...(actor.flags["trg-prime"] ?? {}), soulDrainHeld: { ...held, [source]: (held[source] ?? 0) + n } }; },
  releaseSoulDrain: async (actor, source, { amount = null, heal = false } = {}) => {
    // The system's own arithmetic (TRG Prime 3.674.0, soulDrainRelease).
    const held = actor.flags["trg-prime"]?.soulDrainHeld ?? {};
    const had = held[source] ?? 0;
    if (!had) return 0;
    const current = Object.values(held).reduce((a, x) => a + x, 0);
    const { n, left } = soulDrain.soulDrainRelease({ had, amount, current, heal });
    if (left > 0) held[source] = left; else delete held[source];
    said.releases.push([source, n, heal]);
    return n;
  },
  createCompanionFor: async () => null
};
globalThis.game = {
  trgPrime: { modules: holdApi }, time: { worldTime: 100 * 86400 }, user: { id: "g", isGM: true }, users: { activeGM: { id: "g" } },
  actors: Object.assign([], { get(id) { return this.find((a) => a.id === id) ?? null; } }),
  packs: { get: (id) => (packs.has(id) ? { getIndex: async () => packs.get(id).map((e) => ({ _id: e._id, name: e.name, system: e.data.system })), getDocument: async (eid) => { const e = packs.get(id).find((x) => x._id === eid); return e ? { toObject: () => clone(e.data) } : null; } } : null) }
};

/** A dragon companion as the system builds it: class and race, at a level. */
function mkDragon(key, level, master, { hatchedAt = 8 } = {}) {
  const d = mkActor({ name: `${key} dragon`, type: "companion", system: { identity: { level, classBonus: config.classBonusForLevel(level), size: dragonOf(key).size }, companion: { kind: "dragon", masterId: master?.id ?? "", grownSize: "" }, skills: {} },
    flags: { "trg-inner-tempest": { itDragon: { base: dragonOf(key).name, baseLevel: dragonOf(key).level, hatchedAt } } } });
  d.items.push(mkDoc(dragonClass, d), mkDoc(raceOf(key), d), mkDoc(B10.BLOCK10_ABILITIES.find((a) => a.name === dragonOf(key).breath.name), d));
  return d;
}

{
  // Growth kept in step.
  const master = mkActor({ name: "Rin" });
  const cold = mkDragon("cold", 10, master);
  await auto.reconcileDragon(cold);
  const names = cold.items.map((i) => i.name);
  const effect = cold.effects.find((e) => e.flags?.["trg-inner-tempest"]?.dragonGrowth);
  equal("D a cold dragon at 10 (+6): Large, the growth effect, Wings, its specials to 10, a 30-foot cone, its repertoire and High Magic",
    [cold.system.companion.grownSize, effect?.changes.map((c) => [c.key, c.value]), ["Wings", "Snowvision", "Draconic Assault", "Wing Buffet"].every((n) => names.includes(n)), names.includes("Tail Slap"),
      cold.items.find((i) => i.name === "Cold Dragon Breath").flags["trg-prime"].creatureAbility.area.intro, cold.flags["trg-prime"].repertoire, cold.flags["trg-prime"].highMagic],
    ["large", [["system.combat.movement.land.other", "10"], ["system.combat.movement.fly.other", "30"], ["system.attributes.strength.untyped", "2"], ["system.attributes.constitution.untyped", "2"], ["system.attributes.dexterity.untyped", "-1"],
      ["system.attributes.intelligence.untyped", "2"], ["system.attributes.wisdom.untyped", "2"], ["system.attributes.charisma.untyped", "2"]],
    true, false, "A 30-foot cone — target the creatures in it.", { firstPicks: 2, pickFrom: 5, pickStep: 1, firstPickExact: false }, true]);
  ok("D the breath keeps its own length: it opts out of the system's codex inheritance, which laid the compendium's 15 feet back over it (found live)",
    cold.items.find((i) => i.name === "Cold Dragon Breath").flags["trg-prime"].codexInherit === false);
  equal("D Wing Buffet arrives with the Wings' fallback on every wing rung (B10-5)",
    Object.values(cold.items.find((i) => i.name === "Wing Buffet").flags["trg-prime"].creatureAbility.area.damageByRung).map((r) => r.fallback?.damage), ["1d6", "1d6", "1d6", "1d6"]);
  const before = said.created.length;
  await auto.reconcileDragon(cold);
  ok("D kept in step twice, it changes nothing the second time", said.created.length === before);
  // Up to +20, with Sweep; then down again.
  cold.system.identity.level = 24; cold.system.identity.classBonus = config.classBonusForLevel(24);
  await auto.reconcileDragon(cold);
  const tail = cold.items.find((i) => i.name === "Tail Slap");
  equal("D at +20: gargantuan, Tail Slap with Sweep, Crush, Freezing Aura and Blood by name, Reflective Scales",
    [cold.system.companion.grownSize, /Sweep/.test(tail?.system.traits ?? ""), ["Crush", "Freezing Aura", "Freezing Blood", "Reflective Scales", "Draconic Shifting"].filter((n) => !cold.items.some((i) => i.name === n))],
    ["gargantuan", true, []]);
  cold.system.identity.level = 9; cold.system.identity.classBonus = config.classBonusForLevel(9);
  await auto.reconcileDragon(cold);
  equal("D a lower level takes back what the growth gave (a GM's correction), and leaves what it did not",
    [["Wings", "Tail Slap", "Crush", "Wing Buffet", "Freezing Aura"].filter((n) => cold.items.some((i) => i.name === n)), ["Cold Dragon", "Dragon Companion", "Cold Dragon Breath", "Snowvision", "Draconic Assault"].filter((n) => !cold.items.some((i) => i.name === n)), cold.system.companion.grownSize],
    [[], [], "large"]);
  cold.system.identity.level = 23; cold.system.identity.classBonus = config.classBonusForLevel(23);
  await auto.reconcileDragon(cold);
  const tailBack = cold.items.find((i) => i.name === "Tail Slap");
  cold.system.identity.level = 24;
  await auto.reconcileDragon(cold);
  const swept = cold.items.find((i) => i.name === "Tail Slap").system.traits;
  cold.system.identity.level = 23;
  await auto.reconcileDragon(cold);
  equal("D Sweep comes with +20 and goes below it, leaving the tail's own traits", [tailBack?.system.traits, swept, cold.items.find((i) => i.name === "Tail Slap").system.traits],
    ["Agile, Finesse", "Agile, Finesse, Sweep", "Agile, Finesse"]);
  const twin = mkDragon("fire", 16, master);
  await Promise.all([auto.reconcileDragon(twin), auto.reconcileDragon(twin), auto.reconcileDragon(twin)]);
  equal("D three runs at once on one dragon: one growth effect, one of each grant", [twin.effects.length, ["Wings", "Tail Slap", "Wing Buffet", "Fiery Blood"].map((n) => twin.items.filter((i) => i.name === n).length)], [1, [1, 1, 1, 1]]);
  const earth = mkDragon("earth", 10, master);
  await auto.reconcileDragon(earth);
  const stride = earth.items.find((i) => i.name === "Wild Stride");
  equal("D the earth dragon's Wild Stride is the class's grant (it costs no pick); no fly growth",
    [stride?.flags["trg-prime"]?.grantedBy?.sourceId === earth.items.find((i) => i.type === "class").id, earth.effects[0].changes.some((c) => c.key.includes("fly"))], [true, false]);
  // Only the acting GM, and only when the level moves.
  const quiet = mkDragon("light", 5, master);
  globalThis.game.user = { id: "p", isGM: false };
  await auto.onActorUpdatedB10(quiet, { system: { identity: { level: 5 } } });
  ok("D a player's client leaves the dragon to the GM", !quiet.effects.length);
  globalThis.game.user = { id: "g", isGM: true };
  await auto.onActorUpdatedB10(quiet, { name: "x" });
  ok("D a change that is not the level leaves it alone", !quiet.effects.length);
  await auto.onActorUpdatedB10(quiet, { system: { identity: { level: 5 } } });
  ok("D …and a level change brings it into step", quiet.effects.length === 1);
}
{
  // The hatching.
  const tamer = { name: "Dragon Tamer", id: "t" };
  const lacking = mkActor({ name: "Bo", system: { identity: { level: 9 }, skills: { arcana: { ranks: 7 } }, specialistSkills: {} } });
  said.warned.length = 0;
  ok("D Dragon Tamer refuses without Inner Discipline, 8 Arcana ranks, Dragon Lore and an egg, and says which",
    (await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(lacking, tamer)) === false && /Inner Discipline, Arcana 8 ranks, the Dragon Lore specialist skill, an unhatched dragon egg/.test(said.warned.at(-1)), said.warned.at(-1));
  const egg = mkDoc(eggs.find((e) => e.name === "Dragon Egg (Light)"), null);
  const rin = mkActor({ name: "Rin", system: { identity: { level: 9 }, skills: { arcana: { ranks: 8 } }, specialistSkills: { dragonLore: { label: "Dragon Lore" } } }, items: [{ type: "feat", name: "Inner Discipline", id: "f1" }, egg] });
  egg.flags["trg-prime"].itDragonEgg.days = 20;
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  ok("D an egg still bonding is not ready", /an egg that has finished bonding/.test(said.warned.at(-1)));
  egg.flags["trg-prime"].itDragonEgg.days = 28;
  let asked = null;
  holdApi.createCompanionFor = async (master, feat, options) => {
    asked = clone({ feat: feat.name, ...options });
    const dragon = mkDragon("light", 5, master, { hatchedAt: 9 });
    dragon.flags = { ...dragon.flags, ...clone(options.flags) };
    globalThis.game.actors.push(dragon);
    // The system awaits the kind's setting-up before it writes the card (3.674.1).
    await options.beforeCard?.(dragon);
    said.featsAtCard = dragon.items.filter((i) => i.type === "feat").map((i) => i.name).sort();
    return dragon;
  };
  ok("D with everything, it hatches", (await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer)) === true);
  const dragon = globalThis.game.actors.at(-1);
  equal("D …as the dragon kind, the egg's species only, recording its base level and the master's level at hatching, with High Magic and its spells",
    asked, { feat: "Dragon Tamer", kind: "dragon", only: ["Light Dragon"], title: "Dragon Tamer", flags: { "trg-inner-tempest": { itDragon: { base: "Light Dragon", baseLevel: 5, hatchedAt: 9 } }, "trg-prime": { highMagic: true, repertoire: { firstPicks: 3, pickFrom: 6, pickStep: 1, firstPickExact: false } } } });
  equal("D the printed feats are on the hatchling before the system writes its creation card (found live: Will +12 on the card, +14 on the sheet)",
    said.featsAtCard, ["Alertness", "Improved Initiative", "Iron Will", "Lightning Reflexes"]);
  const lr = dragon.items.find((i) => i.name === "Lightning Reflexes");
  equal("D …with its printed feats (Lightning Reflexes free, B10-9), its ranks and fields, and the egg consumed",
    [["Alertness", "Improved Initiative", "Iron Will", "Lightning Reflexes"].filter((n) => !dragon.items.some((i) => i.name === n)), lr?.flags["trg-prime"]?.grantedBy?.sourceId === dragon.items.find((i) => i.type === "race").id,
      dragon.items.find((i) => i.name === "Iron Will").flags["trg-prime"]?.grantedBy, dragon.system.skills?.acrobatics?.ranks, dragon.system.combat?.immunities, said.deleted.includes(egg.id)],
    [[], true, undefined, 4, "electricity, paralysis, sleep", true]);
  dragon.system.companion.masterId = rin.id;
  globalThis.game.actors.push(rin);
  // The bond: the GM's separation and reunion.
  pick = "apart";
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  equal("D separated (the GM's): Soul Drain half its level, held; Refocus Hard",
    [said.holds.at(-1), rin.flags["trg-inner-tempest"].dragonBond.state, rin.effects.some((e) => e.flags?.["trg-inner-tempest"]?.dragonBond)], [["itDragonApart", 3], "apart", true]);
  pick = "reunited";
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  await auto.onDailyPreparationB10({ actor: rin });
  equal("D reunited, the next daily preparation's hour of meditation restores it: the hold released, unhealed, and the −2 gone",
    [said.releases.at(-1), rin.flags["trg-inner-tempest"].dragonBond, rin.effects.some((e) => e.flags?.["trg-inner-tempest"]?.dragonBond)], [["itDragonApart", 3, false], undefined, false]);
  pick = "apart";
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  pick = "reunited";
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  const holdsThen = said.holds.length;
  pick = "apart";
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  equal("D separated again before the reunion's meditation: still apart, nothing laid twice",
    [rin.flags["trg-inner-tempest"].dragonBond.state, said.holds.length - holdsThen, rin.flags["trg-prime"].soulDrainHeld.itDragonApart, rin.effects.filter((e) => e.flags?.["trg-inner-tempest"]?.dragonBond).length], ["apart", 0, 3, 1]);
  pick = "reunited";
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  await auto.onDailyPreparationB10({ actor: rin });
  globalThis.game.user = { id: "p", isGM: false };
  const n = said.holds.length;
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  ok("D a player cannot mark the separation", said.holds.length === n);
  globalThis.game.user = { id: "g", isGM: true };

  // The death.
  dragon.system.identity.level = 7;
  await auto.onDragonMaybeDied(dragon);
  ok("D alive, nothing happens", !rin.flags["trg-inner-tempest"].dragonBond);
  deadIds.add(dragon.id);
  await Promise.all([auto.onDragonMaybeDied(dragon), auto.onEffectChangedB10({ parent: dragon, statuses: new Set(["dying"]) })]);
  await auto.onCreatureSlainB10({ victim: dragon });
  equal("D dead (asked of the system): Soul Drain equal to its level, held, once however many hooks ask; Refocus Hard; the card",
    [said.holds.filter((x) => x[0] === "itDragonDeath"), rin.flags["trg-inner-tempest"].dragonBond.state, rin.effects.filter((e) => e.flags?.["trg-inner-tempest"]?.dragonBond).length, said.cards.at(-1)[0]],
    [[["itDragonDeath", 7]], "dead", 1, "Dragon Companion — the bond is broken"]);
  globalThis.game.time.worldTime += 6 * 86400;
  await auto.onDailyPreparationB10({ actor: rin });
  ok("D six days on, nothing recovered", !said.releases.some((x) => x[0] === "itDragonDeath"));
  globalThis.game.time.worldTime += 15 * 86400;
  await auto.onDailyPreparationB10({ actor: rin });
  equal("D three weeks on: three points recovered and healed at once", said.releases.filter((x) => x[0] === "itDragonDeath"), [["itDragonDeath", 3, true]]);
  deadIds.delete(dragon.id);
  await auto.onDailyPreparationB10({ actor: rin });
  await auto.onDailyPreparationB10({ actor: rin });
  equal("D restored after the week: it goes insane (said once); the recovery goes on",
    [said.cards.filter((c) => /goes insane/.test(c[1])).length, rin.flags["trg-inner-tempest"].dragonBond.state], [1, "dead"]);
  globalThis.game.time.worldTime += 28 * 86400;
  await auto.onDailyPreparationB10({ actor: rin });
  equal("D every point back: the bond's −2 ends, and the bond is closed for good (one bond per lifetime)", [said.releases.filter((x) => x[0] === "itDragonDeath").reduce((a, x) => a + x[1], 0), rin.flags["trg-inner-tempest"].dragonBond, rin.effects.some((e) => e.flags?.["trg-inner-tempest"]?.dragonBond)], [7, { state: "broken", dragonId: dragon.id }, false]);
  deadIds.add(dragon.id);
  const holdsBefore = said.holds.length;
  await auto.onEffectChangedB10({ parent: dragon, statuses: new Set(["dead"]) });
  pick = "apart";
  said.warned.length = 0;
  await auto.BLOCK10_AUTOMATIONS["dragon tamer"].use(rin, tamer);
  equal("D …so its body dying again lays nothing, and no separation is offered", [said.holds.length - holdsBefore, /broken for good/.test(said.warned.at(-1) ?? "")], [0, true]);

  // Restored within the week.
  const zoe = mkActor({ name: "Zoe" });
  const pup = mkDragon("fire", 6, zoe);
  pup.system.companion.masterId = zoe.id;
  globalThis.game.actors.push(zoe, pup);
  deadIds.add(pup.id);
  await auto.onDragonMaybeDied(pup);
  globalThis.game.time.worldTime += 3 * 86400;
  deadIds.delete(pup.id);
  await auto.onDailyPreparationB10({ actor: zoe });
  equal("D restored within the week: the bond regained as for a temporary loss — the hold released unhealed, the −2 gone",
    [said.releases.at(-1), zoe.flags["trg-inner-tempest"].dragonBond, zoe.effects.length], [["itDragonDeath", 6, false], undefined, 0]);
  // Dead by the skull alone (Fatigue 20, Con −5), restored on day 5, and the master's next preparation only on day 9.
  deadIds.add(pup.id);
  await auto.onEffectChangedB10({ parent: pup, statuses: new Set(["dead"]) });
  ok("D a death that draws only the dead skull breaks the bond too", zoe.flags["trg-inner-tempest"]?.dragonBond?.state === "dead");
  globalThis.game.time.worldTime += 5 * 86400;
  deadIds.delete(pup.id);
  await auto.onEffectChangedB10({ parent: pup, statuses: new Set(["dead"]) });
  equal("D its restoration is recorded when the skull lifts (the acting GM)", zoe.flags["trg-inner-tempest"].dragonBond.restoredDays, 5);
  globalThis.game.time.worldTime += 4 * 86400;
  await auto.onDailyPreparationB10({ actor: zoe });
  equal("D …so a preparation on day 9 still re-bonds a dragon restored on day 5", [zoe.flags["trg-inner-tempest"].dragonBond, said.releases.at(-1)], [undefined, ["itDragonDeath", 6, false]]);
  // A table without a clock: seven daily preparations are a week.
  deadIds.add(pup.id);
  await auto.onDragonMaybeDied(pup);
  for (let i = 0; i < 7; i += 1) await auto.onDailyPreparationB10({ actor: zoe });
  equal("D with the clock never moved, seven daily preparations recover a point", [zoe.flags["trg-inner-tempest"].dragonBond.preps, zoe.flags["trg-prime"].soulDrainHeld.itDragonDeath], [7, 5]);
  const ula = mkActor({ name: "Ula" });
  globalThis.game.actors.push(ula);
  const animal = mkActor({ type: "companion", system: { companion: { kind: "", masterId: ula.id }, identity: { level: 5 } } });
  deadIds.add(animal.id);
  await auto.onDragonMaybeDied(animal);
  ok("D an animal companion's death is not the dragon bond's", !ula.flags["trg-inner-tempest"]?.dragonBond);
}
{
  // The egg at daily preparation.
  const egg = mkDoc(eggs[0], null);
  const kai = mkActor({ name: "Kai", items: [egg] });
  egg.parent = kai;
  globalThis.game.time.worldTime = 200 * 86400 + 10;
  await auto.onDailyPreparationB10({ actor: kai });
  await auto.onDailyPreparationB10({ actor: kai });
  globalThis.game.time.worldTime += 3600;
  await auto.onDailyPreparationB10({ actor: kai });
  globalThis.game.time.worldTime += 86400;
  await auto.onDailyPreparationB10({ actor: kai });
  equal("D the egg counts each daily preparation (the clock unmoved too), refuses a second on a day the clock has moved into, and says each",
    [egg.flags["trg-prime"].itDragonEgg.days, said.cards.filter((c) => /day \d+ of 28/.test(c[1])).length, said.cards.filter((c) => /already counted/.test(c[1])).length], [3, 3, 1]);
}
{
  // The companion feats.
  const big = mkActor({ name: "Wyrm", type: "companion", system: { companion: { kind: "dragon" }, identity: { size: "large" }, resources: {} }, items: [{ type: "feat", name: "Deflecting Wings", img: "w" }, { type: "weapon", name: "Tail Slap", id: "ts" }] });
  const small = mkActor({ name: "Wyrmling", type: "companion", system: { companion: { kind: "dragon" }, identity: { size: "medium" } }, items: [{ type: "feat", name: "Deflecting Wings" }, { type: "weapon", name: "Tail Slap" }] });
  const offer = auto.BLOCK10_DEFENCE_OFFERS["Deflecting Wings"];
  equal("D Deflecting Wings is offered to a Large dragon that has it, not a Medium one", [offer.find(big)?.name, offer.find(small)], ["Deflecting Wings", null]);
  globalThis.game.combat = null;
  await offer.use(big, big.items[0]);
  const fx = said.effects.at(-1);
  equal("D …and lays +2 circumstance to DB for one attack (Deflect Arrow's shape)",
    [fx?.name, fx?.changes, fx?.flags?.["trg-prime"]?.oneAttack], ["Deflecting Wings (+2 vs one attack)", [{ key: "system.combat.defence.circumstance", type: "custom", value: "2", priority: 20 }], true]);
  await auto.BLOCK10_AUTOMATIONS["tail lash"].use(big, { name: "Tail Lash" });
  equal("D Tail Lash: a reaction tail Strike at −2 circumstance", said.made.at(-1), ["strike", "Tail Slap", [{ label: "Tail Lash", value: -2, type: "circumstance" }], true]);
  const m = said.made.length;
  await auto.BLOCK10_AUTOMATIONS["tail lash"].use(small, { name: "Tail Lash" });
  ok("D …refused below Large", said.made.length === m);
  const feat = mkDoc({ name: "Draconic Spell", id: "ds", flags: {} }, big);
  pick = "sp1";
  await auto.BLOCK10_AUTOMATIONS["draconic spell"].use(big, feat);
  const spell = big.items.find((i) => i.name === "Fire Bolt");
  equal("D Draconic Spell: an arcane spell only, added innate with the Focus trait, one use; the feat remembers it",
    [said.offered, spell?.system.innate, spell?.system.traits, spell?.system.usesValue, feat.flags["trg-inner-tempest"].draconicSpell], [["Fire Bolt (PP 2)"], true, "Attack, Focus", 1, "Fire Bolt"]);
}

/* ------------------------------------------------------------------ *
 * E. Wiring
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
ok("E the hooks: a level change, daily preparation, the kill hook, Dying or the skull laid, changed or lifted, a feat taken, and the world on load",
  /Hooks\.on\("updateActor", \(actor, changes\) => \{ onActorUpdatedB10\(actor, changes\)/.test(script) && /Hooks\.on\("trgPrimeDailyPreparation", \(ctx\) => \{ onDailyPreparationB10\(ctx\)/.test(script)
  && /Hooks\.on\("trgPrimeCreatureSlain", \(ctx\) => \{ onCreatureSlainB10\(ctx\)/.test(script) && /for \(const hook of \["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"\]\) Hooks\.on\(hook, \(effect\) => \{ onEffectChangedB10\(effect\)/.test(script)
  && /Hooks\.on\("createItem", \(item, options, userId\) => \{ try \{ onItemCreatedB10\(item, options, userId\);/.test(script) && /reconcileAllDragons\(\)\.catch/.test(script));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("E the module is 1.0.3, built for 3.674.2, downloaded from its own release", [manifest.version, manifest.relationships.systems[0].compatibility.minimum, manifest.download],
  ["1.0.3", "3.674.2", "https://github.com/snowtroll75-debug/trg-inner-tempest/releases/download/v1.0.3/trg-inner-tempest.zip"]);
ok("E the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.674.2";'));
{
  const [sa, sb, sc] = String(systemJson.version).split(".").map(Number);
  ok("E the system at TRG_PRIME_ROOT is 3.674.2 or later", sa > 3 || (sa === 3 && (sb > 674 || (sb === 674 && sc >= 2))), systemJson.version);
}
{
  const m = manifest.packs.find((p) => p.name === "it-dragons");
  const dir = path.join(ROOT, "packs-source", "it-dragons");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  equal("E the dragons' pack: in the manifest extending nothing, built; the others joined to theirs",
    [m?.type, m?.flags?.["trg-prime"]?.extends, B10.BLOCK10_DRAGONS.every((d) => files.some((f) => f.endsWith(`_${d._id}.json`))),
      [["it-abilities", B10.BLOCK10_ABILITIES], ["it-feats", B10.BLOCK10_FEATS], ["it-companions", B10.BLOCK10_NATURAL_ATTACKS]].map(([n, docs]) => docs.every((d) => PACKS.find((p) => p.name === n).docs.includes(d)))],
    ["Item", undefined, true, [true, true, true]]);
}
{
  const status = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "inventory", "status.json"), "utf8"));
  const ids = ["FA-02", ...Array.from({ length: 16 }, (_, i) => `DC-${String(i + 1).padStart(2, "0")}`)];
  const b = new Set(["FA-02", "DC-01", "DC-12", "DC-13", "DC-14", "DC-15", "DC-16"]);
  equal("E a status line for Dragon Tamer and each of the sixteen Dragon Companion lines", ids.map((id) => [id, status[id]?.status, status[id]?.achieved]), ids.map((id) => [id, "Implemented", b.has(id) ? "B" : "A"]));
  ok("E the inventory files the base dragons under it-dragons", /^DC-03\|[^\n]*\|PACK:it-dragons race item\|/m.test(fs.readFileSync(path.join(ROOT, "tools", "inventory", "inventory.txt"), "utf8")));
}

const EXPECTED = 118;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block10: ${checks} checks — ${failures.length} FAILED\n`); for (const x of failures) console.log(`  ✗ ${x}`); process.exitCode = 1; }
else console.log(`verify-block10: ${checks} checks — all green.`);
