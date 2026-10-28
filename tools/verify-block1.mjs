#!/usr/bin/env node
/**
 * verify-block1 — Inner Tempest Block 1: Chapter 2 (races, heritages,
 * racial abilities, natural attacks, Scree Cant, backgrounds) and the
 * Chapter 5 General feats, checked against the book and against the system.
 *
 *   node tools/verify-block1.mjs
 *
 * Needs TRG Prime 3.665.0 at TRG_PRIME_ROOT (default ../core/trg-prime
 * beside this module's parent), because half of what this checks is that
 * the declarations the items carry are ones the system reads, normalised by
 * the system's own functions, and that every name a grant points at exists
 * where the system looks for it.
 *
 *   A  Transcription: the printed numbers, typed below from the v1.2 book
 *      and diffed against the built items (two copies that must agree)
 *   B  Declarations: every conditional, defence row, stance row, daily
 *      first and granted-spell ability normalises in the system's own code
 *   C  Resolution: every grant name resolves (module packs or the core's)
 *   D  Registration and automations, against a fake api and pure helpers
 *   E  Manifest and built packs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM_ROOT = process.env.TRG_PRIME_ROOT ?? path.resolve(ROOT, "..", "core", "trg-prime");
const sys = (...p) => new URL(`file://${path.join(SYSTEM_ROOT, ...p)}`).href;

let checks = 0;
const failures = [];
function ok(label, condition, detail = "") { checks += 1; if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`); }
function equal(label, actual, expected) { ok(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

const { PACKS, RACES, HERITAGES, BACKGROUNDS, ABILITIES, NATURAL_ATTACKS, TIANZHI_ELEMENTS, BACKGROUND_WEALTH } = await import("./content/foundation.mjs");
const { GENERAL_FEATS } = await import("./content/feats-general.mjs");
const reg = await import("../module/registration.mjs");
const auto = await import("../module/automations.mjs");
const cond = await import(sys("module", "conditionals.mjs"));
const ddc = await import(sys("module", "combat", "defence-dc.mjs"));
const fd = await import(sys("module", "focus-declarations.mjs"));
const df = await import(sys("module", "daily-firsts.mjs"));
const ma = await import(sys("module", "combat", "magical-attacks.mjs"));
const atk = await import(sys("module", "combat", "attack.mjs"));
const bonus = await import(sys("module", "bonuses", "registry.mjs"));
const { BONUS_TYPES } = await import(sys("module", "dice", "resolution.mjs"));
const car = await import(sys("module", "creature-ability-rules.mjs"));
const senses = await import(sys("module", "senses.mjs"));
const langs = await import(sys("module", "languages.mjs"));

const byName = (list) => Object.fromEntries(list.map((d) => [d.name, d]));
const races = byName(RACES), heritages = byName(HERITAGES), backgrounds = byName(BACKGROUNDS);
const abilities = byName(ABILITIES), feats = byName(GENERAL_FEATS), naturals = byName(NATURAL_ATTACKS);
const F = (doc) => doc?.flags?.["trg-prime"] ?? {};
const changes = (doc) => (doc?.effects ?? []).flatMap((e) => e.changes ?? []);
const has = (doc, key, value, mode) => changes(doc).some((c) => c.key === key && c.value === String(value) && (mode === undefined || c.mode === mode));
const effectFlags = (doc) => (doc?.effects ?? []).map((e) => e.flags?.["trg-prime"] ?? {});

/* ------------------------------------------------------------------ *
 * A. Transcription — typed from Inner Tempest v1.2, Chapter 2
 * ------------------------------------------------------------------ */

const BOOK_RACES = {
  Miraku: { mods: "Dex +1, Wis +1, Cha +1, Con -1", speed: "30", core: "Faechant, Low Tongue", extra: "common, Wyrmish", lore: "Miraku Lore, Spirit Lore", abilities: "Nightvision, Fluid Form, Spirit Awareness" },
  Ryukari: { mods: "Str +1, Con +1, Cha +1, Dex -1", speed: "25", core: "Low Tongue, Wyrmish", extra: "common", lore: "Ryukari Lore, Dragon Lore", abilities: "Nightvision, Scaled Hide, Dragon-Bound Resolve" },
  Scree: { mods: "Dex +1, Con +1, Int +1, Cha -1", speed: "30", core: "Low Tongue, Scree Cant", extra: "common, regional", lore: "Scree Lore, Insect Lore", abilities: "Chitinous Carapace, Compound Eyes" },
  Tianzhi: { mods: "Dex +1, Wis +1", speed: "30", core: "Low Tongue", extra: "common, regional", lore: "Elemental Lore, Tianzhi Lore", abilities: "Martial Affinity, Nightvision, Natural Chi" }
};
const ATTR = { str: "strength", dex: "dexterity", con: "constitution", int: "intelligence", wis: "wisdom", cha: "charisma" };
for (const [name, book] of Object.entries(BOOK_RACES)) {
  const r = races[name];
  ok(`A ${name} exists`, Boolean(r)); if (!r) continue;
  equal(`A ${name} ability modifiers`, r.system.abilityModifiers, book.mods);
  for (const part of book.mods.split(",")) {
    const [ab, v] = part.trim().split(/\s+/);
    ok(`A ${name} effect carries ${part.trim()}`, has(r, `system.attributes.${ATTR[ab.toLowerCase()]}.racial`, Number(v), 2));
  }
  ok(`A ${name} is Medium at ${book.speed} ft`, has(r, "system.identity.size", "medium") && has(r, "system.combat.movement.land", book.speed, 5));
  equal(`A ${name} languages`, [r.system.coreLanguages, r.system.additionalLanguages], [book.core, book.extra]);
  equal(`A ${name} specialist skills`, r.system.specialistSkills, book.lore);
  equal(`A ${name} racial abilities`, r.system.racialAbilities, book.abilities);
  equal(`A ${name} Power Points 0, registered`, reg.RACIAL_PP[name], 0);
  ok(`A ${name} carries its age row`, /AGE<\/strong> \(Appendix/.test(r.system.description));
}
equal("A four races", RACES.length, 4);
// "Low Tongue, One language based upon their heritage" — Graham's ruling of
// 21 October 2026 names the heritage's language, so the race offers no pick.
equal("A the Tianzhi race speaks Low Tongue and leaves the second language to the heritage", [races.Tianzhi.system.coreLanguages, races.Tianzhi.system.languageChoices], ["Low Tongue", ""]);
equal("A Scree Cant is uncommon, as printed", reg.LANGUAGES["Scree Cant"].rarity, "uncommon");

const BOOK_HERITAGES = {
  Kitsune: ["Miraku", (h) => h.system.abilityModifiers === "Cha +1" && h.system.grantedSpells === "Ghost Sound" && F(h).grantInnate === true && F(h).grantedSpellAbility === "charisma"],
  Mujina: ["Miraku", (h) => has(h, "system.combat.naturalArmourBase.natural", 1, 5) && h.system.racialAbilities === "Impact Absorption"],
  Ren: ["Miraku", (h) => has(h, "system.combat.movement.land", 5, 2) && has(h, "system.combat.initiative.race", 5, 0) && effectFlags(h).some((f) => f.fallReduction?.value === 20)],
  Byakko: ["Miraku", (h) => h.system.racialAbilities === "Predator's Pounce" && ["sneak", "demoralise"].every((a) => F(h).conditionals.some((c) => c.value === 1 && c.type === "race" && c.auto && c.when.actions[0] === a))],
  Orochi: ["Miraku", (h) => has(h, "system.combat.resistances", ", poison", 2) && has(h, "system.combat.movement.swim.base", 15, 4)],
  Shinryu: ["Ryukari", (h) => (h.effects ?? []).some((e) => /unsupported air/.test(e.description))],
  Zennyo: ["Ryukari", (h) => has(h, "system.combat.movement.swim.base", 20, 4) && F(h).creatureAbility?.derives?.breathesWater === true],
  Fuku: ["Ryukari", (h) => F(h).convictionPool === 1 && h.system.racialAbilities === "Treasure Sense"],
  Kura: ["Ryukari", (h) => h.system.racialAbilities === "Darkvision" && has(h, "system.skills.stealth.racial", 1, 2)],
  Zenki: ["Ryukari", (h) => F(h).creatureAbility?.derives?.heatEnvironmentImmune === true && F(h).conditionals.some((c) => c.value === 1 && c.type === "race" && c.when.subjects[0] === "crafting" && !c.auto)],
  Kabuto: ["Scree", (h) => has(h, "system.combat.naturalArmourBase.natural", 1, 2) && has(h, "system.combat.movement.land", -5, 2) && F(h).carryStrength === 5],
  Joro: ["Scree", (h) => has(h, "system.combat.movement.climb.base", 20, 4)],
  Kamiri: ["Scree", (h) => has(h, "system.combat.initiative.race", 5, 0) && h.system.grantedWeapons === "Raptorial Blade"],
  Suzume: ["Scree", (h) => h.system.grantedWeapons === "Sting" && h.system.racialAbilities === "Wing Burst"],
  Hotaru: ["Scree", (h) => h.system.racialAbilities === "Living Lantern" && h.system.grantedSpells === "Guidance" && F(h).grantInnate === true && F(h).grantedSpellAbility === "wisdom"],
  Fuukaze: ["Tianzhi", (h) => has(h, "system.skills.acrobatics.racial", 2, 2) && has(h, "system.combat.movement.land", 5, 2)],
  Hikari: ["Tianzhi", (h) => h.system.grantedSpells === "Stabilise" && F(h).grantInnate === true && F(h).grantedSpellAbility === "wisdom" && F(h).conditionals.some((c) => c.kind === "advantage" && c.auto && c.when.traits.join() === "emotion,fear")],
  Kasai: ["Tianzhi", (h) => has(h, "system.combat.resistances", ", fire", 2) && h.system.grantedSpells === "Orb Of Fire" && F(h).grantedSpellAbility === "wisdom"],
  Suiryoku: ["Tianzhi", (h) => has(h, "system.combat.movement.swim.base", 20, 4) && F(h).creatureAbility?.derives?.breathMultiplier === 5],
  Tsuchi: ["Tianzhi", (h) => has(h, "system.skills.crafting.racial", 2, 2) && F(h).conditionals.some((c) => c.value === 2 && c.when.actions[0] === "create" && c.when.not.subjects[0] === "crafting")]
};
for (const [name, [raceName, test]] of Object.entries(BOOK_HERITAGES)) {
  const h = heritages[name];
  ok(`A heritage ${name} exists`, Boolean(h)); if (!h) continue;
  equal(`A ${name} belongs to ${raceName}`, h.system.sourceRace, raceName);
  ok(`A ${name} carries its printed mechanic`, test(h));
  ok(`A ${name} carries the book's text`, h.system.description.length > 250);
}
equal("A twenty heritages, five per race", Object.values(BOOK_HERITAGES).reduce((m, [r]) => ({ ...m, [r]: (m[r] ?? 0) + 1 }), {}), { Miraku: 5, Ryukari: 5, Scree: 5, Tianzhi: 5 });
equal("A no extra heritages", HERITAGES.length, 20);

// IT-C2: the Tianzhi elements box.
const BOOK_ELEMENTS = { Fuukaze: ["Wind", "electricity"], Hikari: ["Spirit", "essence"], Kasai: ["Flame", "fire"], Suiryoku: ["Water", "cold"], Tsuchi: ["Earth", "acid"] };
for (const [name, [element, type]] of Object.entries(BOOK_ELEMENTS)) {
  equal(`A ${name}'s element (IT-C2)`, [F(heritages[name]).itElement?.element, F(heritages[name]).itElement?.damageType], [element, type]);
}
equal("A Hikari's Spirit matches Essence, Healing and Soul spells (IT-C2)", TIANZHI_ELEMENTS.Hikari.spellTraits, ["essence", "healing", "soul"]);

// Racial abilities: the numbers.
ok("A Scaled Hide is Base DR 1", has(abilities["Scaled Hide"], "system.combat.naturalArmourBase.natural", 1, 5));
ok("A Chitinous Carapace is Base DR 2 (v1.2's Base DR)", has(abilities["Chitinous Carapace"], "system.combat.naturalArmourBase.natural", 2, 5));
ok("A Kabuto's +1 lands after the Base DR it raises", changes(heritages.Kabuto).find((c) => c.key.endsWith("naturalArmourBase.natural")).priority > changes(abilities["Chitinous Carapace"])[0].priority);
equal("A Impact Absorption and Predator's Pounce are Focus with one use", ["Impact Absorption", "Predator's Pounce"].map((n) => [abilities[n].system.traits.includes("Focus"), abilities[n].system.usesPerDay, abilities[n].system.usesValue]), [[true, "1", 1], [true, "1", 1]]);
equal("A Predator's Pounce, Wing Burst traits as printed", [abilities["Predator's Pounce"].system.traits, abilities["Wing Burst"].system.traits], ["Attack, Flourish, Focus, Movement", "Flourish, Movement"]);
equal("A Raptorial Blade: 1d6 slashing, FDC 5, Agile Finesse, AR 1", [naturals["Raptorial Blade"].system.damage, naturals["Raptorial Blade"].system.damageType, naturals["Raptorial Blade"].system.fumbleDC, naturals["Raptorial Blade"].system.traits, naturals["Raptorial Blade"].system.armourRending, naturals["Raptorial Blade"].system.natural], ["1d6", "slashing", 5, "Agile, Finesse, AR 1", 1, true]);
equal("A Sting: 1d6 piercing, FDC 5, Agile Finesse", [naturals.Sting.system.damage, naturals.Sting.system.damageType, naturals.Sting.system.fumbleDC, naturals.Sting.system.traits, naturals.Sting.system.armourRending], ["1d6", "piercing", 5, "Agile, Finesse", 0]);

// Backgrounds: typed from Chapter 2 and Chapter 6's wealth table.
const BOOK_BACKGROUNDS = {
  "Ancestral Guardian": ["Ancestral Guidance", "Culture, Diplomacy, Sense Motive", "Ancestor Lore", "0"],
  "Astral Scholar": ["Astral Insight", "Arcana, Culture, Planes", "Astral Lore", "1"],
  "Chi Scholar": ["Inner Balance", "Culture, Meditation, Power Manipulation", "Chi Lore", "0"],
  "Elemental Guardian": ["Elemental Warding", "Nature, Perception, Survival", "Elemental Lore", "0"],
  "Elemental Harmonist": ["Elemental Balance", "Culture, Meditation, Nature", "Elemental Lore", "0"],
  "Enigmatic Artisan": ["Artisan's Enchantment", "Artistry, Crafting, Meditation", "Magic Crafting Lore", "2"],
  "Grey Seeker": ["Ethereal Sight", "Meditation, Planes", "Grey Lore", "1"],
  "Nomad": ["Linguist", "Culture, Stealth, Survival", "Nomad Lore", "-1"],
  "Radiant Wanderer": ["Radiant Insight", "Arcana, Planes, Religion", "Radiance Lore", "0"],
  "Spirit Warrior": ["Spirit Stance", "Athletics, Meditation, Religion", "Spirit Lore", "0"],
  "Spiritwalker": ["Spirit Whisperer", "Meditation, Perception, Sense Motive", "Spirit Lore", "-1"]
};
for (const [name, [featName, skills, lore, wealth]] of Object.entries(BOOK_BACKGROUNDS)) {
  const b = backgrounds[name];
  ok(`A background ${name} exists`, Boolean(b)); if (!b) continue;
  equal(`A ${name}: feat, skills, specialist, wealth`, [b.system.grantedFeats, b.system.skillBonuses, b.system.specialistSkill, b.system.wealth], [featName, skills, lore, wealth]);
  const skillKeys = skills.split(",").map((s) => s.trim());
  ok(`A ${name}: +1 class to each skill`, skillKeys.length === changes(b).length && changes(b).every((c) => c.mode === 0 && c.value === "1" && /\.class$/.test(c.key)));
}
equal("A eleven backgrounds; the wealth table agrees", [BACKGROUNDS.length, Object.keys(BACKGROUND_WEALTH).length], [11, 11]);

/* ------------------------------------------------------------------ *
 * B. Declarations, normalised by the system's own code
 * ------------------------------------------------------------------ */

const ALL = [...RACES, ...HERITAGES, ...BACKGROUNDS, ...ABILITIES, ...GENERAL_FEATS];
let condCount = 0;
for (const doc of ALL) {
  const sources = [F(doc), ...effectFlags(doc)];
  for (const flags of sources) {
    for (const [key, list] of [["conditionals", flags.conditionals], ["stanceConditionals", flags.stanceConditionals]]) {
      for (const [i, raw] of (Array.isArray(list) ? list : []).entries()) {
        condCount += 1;
        const entry = cond.normaliseConditional(raw, { id: doc._id, name: doc.name }, i);
        ok(`B ${doc.name}: ${key}[${i}] normalises`, entry !== null, JSON.stringify(raw));
        if (entry?.kind === "modifier") ok(`B ${doc.name}: ${key}[${i}] has a type the system knows`, Object.hasOwn(BONUS_TYPES, entry.type), entry.type);
      }
    }
    for (const [i, raw] of (flags.defenceDC ?? []).entries()) ok(`B ${doc.name}: defenceDC[${i}] normalises`, ddc.normaliseDefenceDC(raw, { name: doc.name }) !== null);
    for (const [i, raw] of (flags.stanceDefenceDC ?? []).entries()) {
      ok(`B ${doc.name}: stanceDefenceDC[${i}] normalises as a stance row`, ddc.normaliseDefenceDC(raw, { name: doc.name }, { stanceGated: true }) !== null);
      ok(`B ${doc.name}: stanceDefenceDC[${i}] is refused outside a stance`, ddc.normaliseDefenceDC(raw, { name: doc.name }) === null);
    }
  }
}
equal("B every conditional the block declares was read (21)", condCount, 21);

// Martial Affinity and Tranquil Mind reach the roll only in a stance.
const stance = { name: "Crane Stance", flags: { "trg-prime": { featStance: true } } };
const affinity = cond.collectConditionals([abilities["Martial Affinity"]], [stance]);
equal("B Martial Affinity: +1 racial on an attack in a stance", cond.automaticSelections(affinity, { checkType: "attack" }).modifiers.map((m) => [m.value, m.type]), [[1, "race"]]);
equal("B …and nothing out of one", cond.collectConditionals([abilities["Martial Affinity"]], []).length, 0);
equal("B Martial Affinity's DB +1 in a stance only", [ddc.defenceDCBonus({ items: [abilities["Martial Affinity"]], appliedEffects: [stance] }, "defence", "").total, ddc.defenceDCBonus({ items: [abilities["Martial Affinity"]], appliedEffects: [] }, "defence", "").total], [1, 0]);
equal("B Tranquil Mind reaches nothing out of a stance", cond.collectConditionals([feats["Tranquil Mind"]], []).length, 0);
const aware = cond.collectConditionals([abilities["Spirit Awareness"]], []);
equal("B Spirit Awareness: automatic aimed at a spirit, never at anyone else", [cond.automaticSelections(aware, { checkType: "skill", subject: "perception", targetTraits: ["spirit"] }).modifiers.length, cond.automaticSelections(aware, { checkType: "skill", subject: "perception", targetTraits: ["humanoid"] }).modifiers.length, cond.automaticSelections(aware, { checkType: "skill", subject: "perception" }).modifiers.length], [1, 0, 0]);
equal("B Tranquil Mind: advantage on a fear save in a stance", cond.automaticSelections(cond.collectConditionals([feats["Tranquil Mind"]], [stance]), { checkType: "save", traits: "Fear, Mental" }).kinds, ["advantage"]);

// Spirit Stance's effect (module/automations.mjs).
const spirit = { name: "Spirit Stance", flags: { "trg-prime": { ...auto.SPIRIT_STANCE_FLAGS, featStance: true } } };
equal("B Spirit Stance: +1 circumstance against an incorporeal target, automatically", cond.automaticSelections(cond.collectConditionals([], [spirit]), { checkType: "attack", targetTraits: ["undead", "incorporeal"] }).modifiers.map((m) => [m.value, m.type]), [[1, "circumstance"]]);
equal("B …offered, not applied, against anything else", cond.automaticSelections(cond.collectConditionals([], [spirit]), { checkType: "attack", targetTraits: ["humanoid"] }).modifiers.length, 0);
equal("B Spirit Stance's DB +1 against a spirit's attack only", [ddc.defenceDCBonus({ items: [], appliedEffects: [spirit] }, "defence", "", [], "", [], ["spirit"]).total, ddc.defenceDCBonus({ items: [], appliedEffects: [spirit] }, "defence", "", [], "", [], ["humanoid"]).total], [1, 0]);
equal("B Spirit Stance makes a strike magical against the incorporeal only", [Boolean(ma.magicalAttackSource(ma.declaredMagicalAttacks([spirit]), { targetTraits: ["incorporeal"] })), Boolean(ma.magicalAttackSource(ma.declaredMagicalAttacks([spirit]), { targetTraits: ["undead"] }))], [true, false]);

// Daily firsts, granted-spell abilities, falls, carrying, conviction, derives.
const centredFx = (feats["Centred Recovery"].effects ?? []).map((e) => ({ name: e.name, flags: e.flags }));
equal("B Centred Recovery: first Refocus one degree better, first Power Recovery doubled", [df.dailyFirstDegree(centredFx, "refocus", "failure")?.degree, df.dailyFirstDegree(centredFx, "refocus", "success")?.degree, df.dailyFirstMultiplier(centredFx, "powerRecovery")], ["partial", "critical", 2]);
equal("B the granted cantrips take their printed ability", ["Kitsune", "Hotaru", "Hikari", "Kasai"].map((n) => fd.grantedSpellAbilityFor(heritages[n], heritages[n].system.grantedSpells)), ["charisma", "wisdom", "wisdom", "wisdom"]);
equal("B Natural Chi's chosen cantrip is cast with Wisdom", fd.spellChoiceExtraFlags(F(abilities["Natural Chi"]).spellChoice), { castingAbilityOverride: "wisdom" });
const renFx = (heritages.Ren.effects ?? []).map((e) => ({ name: e.name, flags: e.flags }));
equal("B Ren: falls 20 ft shorter", fd.declaredFallReduction(renFx).feet, 20);
equal("B Kabuto: +50 lb weight allowance is 5 carrying Strength", fd.declaredCarryStrength([heritages.Kabuto]), 5);
equal("B Fuku: +1 Conviction Pool", fd.declaredConvictionBonus([heritages.Fuku]), 1);
equal("B Zenki, Zennyo and Suiryoku derive what they print", [car.heatEnvironmentImmunity([heritages.Zenki], "extremeHeat"), car.breathesWaterSource([heritages.Zennyo]), car.abilityBreathMultiplier([heritages.Suiryoku])], ["Zenki", "Zennyo", 5]);
const sense = senses.sensesOf([abilities["Treasure Sense"]], 2);
equal("B Treasure Sense is a tertiary sense with no organ guessed", [sense.length, sense[0]?.category, sense[0]?.modality], [1, "tertiary", ""]);
const ethereal = (feats["Ethereal Sight"].effects ?? [])[0]?.flags?.["trg-prime"] ?? {};
const zen = (feats["Zen Awareness"].effects ?? [])[0]?.flags?.["trg-prime"] ?? {};
equal("B Ethereal Sight +2 against the hidden; Zen Awareness +1 against hidden and invisible", [atk.missCheckIncreaseFor(ethereal.missCheckDCIncrease, "Hidden"), atk.missCheckIncreaseFor(ethereal.missCheckDCIncrease, "Concealed"), atk.missCheckIncreaseFor(zen.missCheckDCIncrease, "Invisible"), atk.missCheckIncreaseFor(zen.missCheckDCIncrease, "Concealed")], [2, 0, 1, 0]);
equal("B Ethereal Sight's Ghost Touch is for magical attacks only", ethereal.ghostTouch, { magicalOnly: true });

// Every CUSTOM-mode change names a bonus slot the system pools.
for (const doc of ALL) for (const c of changes(doc)) {
  if (c.mode === 0) ok(`B ${doc.name}: ${c.key} is a pooled bonus key`, bonus.parseBonusKey(c.key) !== null);
}

/* ------------------------------------------------------------------ *
 * C. Resolution — every name a grant points at exists
 * ------------------------------------------------------------------ */

async function packNames(pack) {
  const { ClassicLevel } = await import("classic-level");
  const dir = path.join(SYSTEM_ROOT, "packs", pack);
  if (!fs.existsSync(dir)) return null;
  const db = new ClassicLevel(dir, { valueEncoding: "json" });
  const names = new Set();
  try { for await (const [k, v] of db.iterator()) if (k.split("!")[1] && !k.split("!")[1].includes(".")) names.add(String(v.name).toLowerCase()); }
  finally { await db.close(); }
  return names;
}
const list = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const coreAbilities = await packNames("abilities"), coreSpells = await packNames("spells"), coreFeats = await packNames("feats");
ok("C the system's packs were read", Boolean(coreAbilities && coreSpells && coreFeats));
const abilityNames = new Set([...ABILITIES.map((a) => a.name.toLowerCase()), ...(coreAbilities ?? [])]);
const featNames = new Set([...GENERAL_FEATS.map((f) => f.name.toLowerCase()), ...(coreFeats ?? [])]);
const weaponNames = new Set(NATURAL_ATTACKS.map((w) => w.name.toLowerCase()));
for (const doc of [...RACES, ...HERITAGES]) {
  for (const n of list(doc.system.racialAbilities)) ok(`C ${doc.name} → ability ${n}`, abilityNames.has(n.toLowerCase()));
  for (const n of list(doc.system.grantedSpells)) ok(`C ${doc.name} → spell ${n}`, Boolean(coreSpells?.has(n.toLowerCase())));
  for (const n of list(doc.system.grantedWeapons)) ok(`C ${doc.name} → natural attack ${n}`, weaponNames.has(n.toLowerCase()));
}
for (const b of BACKGROUNDS) ok(`C ${b.name} → feat ${b.system.grantedFeats}`, featNames.has(b.system.grantedFeats.toLowerCase()));
ok("C every racial ability is granted by a race or heritage", ABILITIES.every((a) => [...RACES, ...HERITAGES].some((d) => list(d.system.racialAbilities).includes(a.name))));
ok("C every General feat is new (no clash with a core feat of the same name)", GENERAL_FEATS.every((f) => !coreFeats?.has(f.name.toLowerCase())), GENERAL_FEATS.filter((f) => coreFeats?.has(f.name.toLowerCase())).map((f) => f.name).join(", "));
ok("C no racial ability clashes with a core ability", ABILITIES.every((a) => !coreAbilities?.has(a.name.toLowerCase())), ABILITIES.filter((a) => coreAbilities?.has(a.name.toLowerCase())).map((a) => a.name).join(", "));
// Action keys named by conditionals exist in the system's skill/basic actions.
const actionsSrc = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "data", "skill-actions.mjs"), "utf8") + fs.readFileSync(path.join(SYSTEM_ROOT, "module", "data", "basic-actions.mjs"), "utf8");
const actionKeys = new Set([...actionsSrc.matchAll(/key: "([A-Za-z]+)"/g)].map((m) => m[1].toLowerCase()));
const namedActions = new Set();
for (const doc of ALL) for (const flags of [F(doc), ...effectFlags(doc)]) for (const c of [...(flags.conditionals ?? []), ...(flags.stanceConditionals ?? []), ...(flags.defenceDC ?? []), ...(flags.stanceDefenceDC ?? [])]) for (const a of c.when?.actions ?? []) namedActions.add(a);
for (const [, entries] of Object.entries(reg.SKILL_SUBSTITUTIONS)) for (const e of entries) namedActions.add(e.action);
for (const a of namedActions) ok(`C action "${a}" exists in the system`, actionKeys.has(a.toLowerCase()));

/* ------------------------------------------------------------------ *
 * D. Registration and automations
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
const called = (m) => calls.filter((c) => c[0] === m);
equal("D the sourcebook is named", called("registerSourcebook").map((c) => c[2]), ["Inner Tempest"]);
equal("D Scree Cant registered", called("registerLanguage").map((c) => [c[1], c[2].rarity]), [["Scree Cant", "uncommon"]]);
equal("D four races' Power Points", called("registerRacialPP").map((c) => [c[1], c[2]]), [["Miraku", 0], ["Ryukari", 0], ["Scree", 0], ["Tianzhi", 0]]);
equal("D skill substitutions", called("registerSkillSubstitution").map((c) => [c[1], c[2].map((e) => `${e.action}:${e.skill}`).join("|")]), [["Artistic Negotiation", "encourage:artistry|makeAnImpression:artistry"], ["Radiant Insight", "clearMind:religion"], ["Spirit Whisperer", "gatherInformation:meditation"], ["Elemental Tracking", "track:nature"]]);
const automationNames = called("registerFeatAutomation").map((c) => c[1]);
const itemNames = new Set(ALL.map((d) => d.name.toLowerCase()));
// EVERY PACK'S ITEMS (re-anchored at 0.4.0): Block 3's automations name
// classes' abilities, feats and techniques that live in the same packs.
for (const p of PACKS) for (const d of p.docs) itemNames.add(d.name.toLowerCase());
ok("D every automation names an item this module ships", automationNames.every((n) => itemNames.has(n)), automationNames.filter((n) => !itemNames.has(n)).join(", "));
ok("D every automation has a hint and a use()", called("registerFeatAutomation").every((c) => typeof c[2].use === "function" && c[2].hint));
ok("D every item flagged for automation has one", ALL.filter((d) => F(d).itAutomation).every((d) => automationNames.includes(d.name.toLowerCase())));
ok("D every Focus or action ability has a Use", ABILITIES.filter((a) => /focus|flourish|concentrate|morph/i.test(a.system.traits) || F(a).spellChoice).every((a) => automationNames.includes(a.name.toLowerCase())));
ok("D every passive hint names an item this module ships", called("registerPassiveAutomation").every((c) => itemNames.has(c[1])));
equal("D Elemental Balance: Survival's lead over the save, never negative", [auto.elementalBalanceDifference({ skills: { survival: { total: 9 } }, combat: { saves: { reflex: { total: 4 } } } }, "reflex"), auto.elementalBalanceDifference({ skills: { survival: { total: 3 } }, combat: { saves: { reflex: { total: 4 } } } }, "reflex"), auto.elementalBalanceDifference({}, "will")], [5, 0, 0]);
equal("D Ancestral Guidance offers a reroll below a Success, with conviction, once", [
  auto.ancestralRerollOffered({ actionKey: "recallKnowledge", degree: "failure", owned: true, conviction: 1 }),
  auto.ancestralRerollOffered({ actionKey: "create", degree: "partial", owned: true, conviction: 2 }),
  auto.ancestralRerollOffered({ actionKey: "recallKnowledge", degree: "success", owned: true, conviction: 1 }),
  auto.ancestralRerollOffered({ actionKey: "recallKnowledge", degree: "failure", owned: true, conviction: 0 }),
  auto.ancestralRerollOffered({ actionKey: "search", degree: "failure", owned: true, conviction: 1 }),
  auto.ancestralRerollOffered({ actionKey: "recallKnowledge", degree: "failure", owned: true, conviction: 1, pending: true })
], [true, true, false, false, false, false]);
equal("D the point is spent only on a Success or better", ["heroic", "critical", "success", "partial", "failure"].map(auto.ancestralPointSpent), [true, true, true, false, false]);
equal("D the once-a-turn stamp is per combat turn", [auto.turnStamp({ started: true, id: "c", round: 2, turn: 1 }), auto.turnStamp({ started: false })], ["c:2:1", null]);
equal("D only melee weapons are offered for the Pounce's Strike", auto.meleeWeapons({ items: [{ id: "a", type: "weapon", system: { equipped: true, attackMode: "melee" } }, { id: "b", type: "weapon", system: { equipped: true, attackMode: "missile" } }, { id: "c", type: "weapon", system: { equipped: false, attackMode: "melee" } }] }).map((w) => w.id), ["a"]);
const autoSrc = fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8");
ok("D Spirit Stance enters through the core's stance helper", /return helpers\(\)\.enterStance\(actor, item, \{\s*name: "Spirit Stance",\s*apCost: 1,/.test(autoSrc));
ok("D the Pounce and Wing Burst ask Flourish first and record it after", /if \(!\(await traitGate\(actor, action, label\)\)\) return false;/.test(autoSrc) && /await recordTraitUsage\(actor, action\);/.test(autoSrc));
ok("D the paid Strike is rolled with its AP already paid", /rollWeaponAttack\(actor, weapon, \{ apPaid: true/.test(autoSrc));
ok("D the free Stunned Manoeuvre and the reroll cost nothing", (autoSrc.match(/\{ \.\.\.action, apCost: "0"/g) ?? []).length === 2);
const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
ok("D the script wires the hooks", /Hooks\.on\("trgPrimeActionResolved"/.test(script) && /Hooks\.on\("renderChatMessageHTML", \(message, html\) => bindCardButtons\(message, html\)\)/.test(script) && /registerContent\(api, MODULE_ID\)/.test(script));

/* ------------------------------------------------------------------ *
 * E. Manifest and built packs
 * ------------------------------------------------------------------ */

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
for (const pack of PACKS) {
  const entry = manifest.packs.find((p) => p.name === pack.name);
  ok(`E module.json declares ${pack.name} extending ${pack.extends}`, entry?.flags?.["trg-prime"]?.extends === pack.extends && entry?.path === `packs/${pack.name}`);
  const dir = path.join(ROOT, "packs-source", pack.name);
  ok(`E packs-source/${pack.name} holds ${pack.docs.length} files`, fs.existsSync(dir) && fs.readdirSync(dir).length === pack.docs.length);
}
// 3.666.0 since 0.3.0 (Block 2's seams), 3.666.1 since 0.3.2 (the defence
// offer); Block 1 needs 3.665.0 of it.
// THE PIN MOVES WITH EACH BLOCK (re-anchored at 0.4.0, Block 3 on 3.667.0):
// the manifest and the script must name the same system, at least 3.666.1.
{
  const pinned = manifest.relationships.systems[0].compatibility.minimum;
  const [a, b, c] = String(pinned).split(".").map(Number);
  ok("E the manifest needs TRG Prime 3.666.1 or later", a > 3 || (a === 3 && (b > 666 || (b === 666 && c >= 1))), pinned);
  ok("E the script refuses an older system, the manifest's own pin", fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8").includes(`const REQUIRED_SYSTEM = "${pinned}";`));
}
ok("E ids are unique across the module", new Set(PACKS.flatMap((p) => p.docs.map((d) => d._id))).size === PACKS.reduce((n, p) => n + p.docs.length, 0));
// BLOCK 1'S OWN COUNTS (re-anchored at 0.4.0): later blocks add to the
// abilities and feats packs and bring new packs, so Block 1's lists are
// counted, and its packs are still all there.
equal("E Block 1's counts", [["it-races", RACES.length], ["it-heritages", HERITAGES.length], ["it-backgrounds", BACKGROUNDS.length], ["it-abilities", ABILITIES.length], ["it-feats", GENERAL_FEATS.length], ["it-companions", NATURAL_ATTACKS.length], ["packs", ["it-races", "it-heritages", "it-backgrounds", "it-abilities", "it-feats", "it-companions"].every((n) => PACKS.some((p) => p.name === n))]], [["it-races", 4], ["it-heritages", 20], ["it-backgrounds", 11], ["it-abilities", 13], ["it-feats", 23], ["it-companions", 2], ["packs", true]]);

/* ------------------------------------------------------------------ *
 * F. Found live on 0.1.0 (21 October 2026), fixed in 0.1.1
 * ------------------------------------------------------------------ */

// F1. A swim/climb/fly/burrow Speed is an object; UPGRADE on the bare key
// is ignored by Foundry, which left the Zennyo swimming at 0.
const speedChanges = ALL.flatMap((d) => (d.effects ?? []).flatMap((e) => e.changes ?? []))
  .filter((c) => /^system\.combat\.movement\.(swim|climb|fly|burrow)/.test(c.key));
ok("F every non-land Speed change targets a number, not the movement object", speedChanges.length >= 4 && speedChanges.every((c) => /\.base$/.test(c.key) || Number(c.mode) === 5), speedChanges.filter((c) => !/\.base$/.test(c.key)).map((c) => c.key).join(", "));

// F2 and F3 run the real code against a fake actor, a fake game and
// recording helpers.
function fakeActor({ conviction = 1, pending = null, itemNames = [] } = {}) {
  const flags = { [auto.MODULE_ID]: pending ? { ancestralReroll: pending } : {} };
  const items = itemNames.map((name) => {
    const iflags = {};
    return { name, type: "feat", flags: iflags,
      getFlag: (s, k) => iflags[k], setFlag: async (s, k, v) => { iflags[k] = v; }, unsetFlag: async (s, k) => { delete iflags[k]; } };
  });
  const actor = {
    name: "Tester", uuid: "Actor.t", isOwner: true, items,
    system: { resources: { conviction: { value: conviction } } },
    getFlag: (s, k) => flags[s]?.[k], unsetFlag: async (s, k) => { delete flags[s][k]; },
    update: async (data) => { if ("system.resources.conviction.value" in data) actor.system.resources.conviction.value = data["system.resources.conviction.value"]; }
  };
  return actor;
}
const cards = [], resolved = [];
let resolveResult = null;
globalThis.game = { combat: { started: true, id: "c", round: 1, turn: 0 }, trgPrime: { modules: { helpers: {
  line: (s) => s, postCard: async (actor, title, lines) => { cards.push([title, ...lines].join(" ")); },
  skillActions: [{ key: "stunnedManoeuvre", name: "Stunned Manoeuvre", apCost: "Reaction" }],
  resolveAction: async (actor, action) => { resolved.push(action.apCost); return resolveResult; }
} } } };
globalThis.ui = { notifications: { warn: (m) => cards.push(`WARN ${m}`) } };
globalThis.ChatMessage = { create: async (d) => cards.push(d.content), getSpeaker: () => ({}) };

const ag = fakeActor({ conviction: 1, pending: { actionKey: "recallKnowledge" }, itemNames: ["Ancestral Guidance"] });
await auto.onActionResolved({ actor: ag, action: { key: "recallKnowledge", name: "Recall Knowledge" }, degree: null });
equal("F Ancestral Guidance waits while the GM's DC is unset (no card, flag kept, point kept)", [cards.length, Boolean(ag.getFlag(auto.MODULE_ID, "ancestralReroll")), ag.system.resources.conviction.value], [0, true, 1]);
await auto.onActionResolved({ actor: ag, action: { key: "recallKnowledge", name: "Recall Knowledge" }, degree: "success" });
equal("F then settles when the DC arrives: a Success spends the point, once", [cards.length, /one point of conviction is spent/.test(cards[0] ?? ""), Boolean(ag.getFlag(auto.MODULE_ID, "ancestralReroll")), ag.system.resources.conviction.value], [1, true, false, 0]);
cards.length = 0;

const sr = fakeActor({ itemNames: ["Stunning Reflexes"] });
const srItem = sr.items[0];
resolveResult = null;
await auto.AUTOMATIONS["stunning reflexes"].use(sr, srItem);
equal("F Stunning Reflexes: a refused or cancelled check does not use up the turn", [resolved, srItem.getFlag(auto.MODULE_ID, "usedTurn") ?? null], [["0"], null]);
resolveResult = { total: 12 };
await auto.AUTOMATIONS["stunning reflexes"].use(sr, srItem);
await auto.AUTOMATIONS["stunning reflexes"].use(sr, srItem);
equal("F a rolled check uses the turn, and a second stun that turn is refused", [resolved, srItem.getFlag(auto.MODULE_ID, "usedTurn"), cards.filter((c) => /already used/.test(c)).length], [["0", "0"], "c:1:0", 1]);
delete globalThis.game; delete globalThis.ui; delete globalThis.ChatMessage;

/* ------------------------------------------------------------------ *
 * G. Graham's rulings of 21 October 2026 (0.2.0, on TRG Prime 3.665.0)
 * ------------------------------------------------------------------ */

const { TIANZHI_LANGUAGES, LORE_ALTERNATIVE_BACKGROUNDS } = await import("./content/foundation.mjs");
const sg = await import(sys("module", "specialist-grants.mjs"));
const tianzhi = HERITAGES.filter((h) => h.system.sourceRace === "Tianzhi");
equal("G each Tianzhi heritage speaks the language Graham named", Object.fromEntries(tianzhi.map((h) => [h.name, h.system.coreLanguages])), { Fuukaze: "Aeolian", Hikari: "Thanatos", Kasai: "Ignic", Suiryoku: "Aqualis", Tsuchi: "Gaian" });
ok("G …and each is a language the core knows", tianzhi.every((h) => langs.LANGUAGES[h.system.coreLanguages]), tianzhi.map((h) => h.system.coreLanguages).filter((l) => !langs.LANGUAGES[l]).join(", "));
equal("G no other heritage names a language", HERITAGES.filter((h) => h.system.sourceRace !== "Tianzhi" && h.system.coreLanguages).map((h) => h.name), []);
ok("G the table and the heritages agree", tianzhi.every((h) => TIANZHI_LANGUAGES[h.name] === h.system.coreLanguages) && Object.keys(TIANZHI_LANGUAGES).length === 5);

const tsuchi = HERITAGES.find((h) => h.name === "Tsuchi");
const tsuchiActor = { items: [tsuchi], appliedEffects: [] };
const shoved = ddc.defenceDCBonus(tsuchiActor, "fortitudeDC", "shoveAttack");
const tripped = ddc.defenceDCBonus(tsuchiActor, ["skillDC:acrobatics", "fortitudeDC"], "tripAttack");
equal("G a Shove or Trip against a Tsuchi is rolled at disadvantage, and no DC moves", [shoved.disadvantages.map((e) => e.label), shoved.total, tripped.disadvantages.map((e) => e.label)], [["Tsuchi"], 0, ["Tsuchi"]]);
equal("G …a Grapple or a Strike is not", [ddc.defenceDCBonus(tsuchiActor, "fortitudeDC", "grappleAttack").disadvantages.length, ddc.defenceDCBonus(tsuchiActor, "defence", "").disadvantages.length], [0, 0]);
ok("G the Tsuchi's own advantage tick stays for its own checks and saves", (F(tsuchi).conditionals ?? []).some((c) => c.kind === "advantage" && c.auto === false));

const mirakuRace = RACES.find((r) => r.name === "Miraku"), tianzhiRace = RACES.find((r) => r.name === "Tianzhi");
const loreBgs = BACKGROUNDS.filter((b) => F(b).specialistAlternative);
equal("G the four backgrounds whose Lore a race also gives declare an alternative, and only they", loreBgs.map((b) => b.name).sort(), ["Elemental Guardian", "Elemental Harmonist", "Spirit Warrior", "Spiritwalker"]);
const owedBy = Object.fromEntries(loreBgs.map((b) => [b.name, [sg.specialistAlternativeOwed(b, [mirakuRace, b]), sg.specialistAlternativeOwed(b, [tianzhiRace, b])]]));
equal("G a Miraku is owed another Lore for Spirit Lore, a Tianzhi for Elemental Lore, and neither for the other's", owedBy, { "Elemental Guardian": [[], ["Elemental Lore"]], "Elemental Harmonist": [[], ["Elemental Lore"]], "Spirit Warrior": [["Spirit Lore"], []], "Spiritwalker": [["Spirit Lore"], []] });
equal("G the prompt names the Lore that is duplicated", loreBgs.map((b) => /already gives you (\w+ Lore)/.exec(F(b).specialistAlternative.prompt)?.[1] === b.system.specialistSkill), [true, true, true, true]);
equal("G the alternative is asked as a Lore", loreBgs.map((b) => F(b).specialistAlternative.suffix), ["Lore", "Lore", "Lore", "Lore"]);
ok("G their Use runs the core's background chooser", Object.keys(LORE_ALTERNATIVE_BACKGROUNDS).every((n) => automationNames.includes(n.toLowerCase())) && /const loreAlternative = \{[\s\S]{0,200}return helpers\(\)\.useBackground\(actor, item\);/.test(autoSrc));

// Two checks per pack (E above): Block 3 (0.4.0) adds it-classes and
// it-spells, so 374 + 4.
// Two per pack: 0.5.1 added it-weapons (Chapter 6's weapons).
// 390 at 0.10.0: two per-pack checks for each of Block 9's five packs.
// 392 at 1.0.0: two per-pack checks for Block 10's it-dragons.
const EXPECTED = 392;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block1: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-block1: ${checks} checks — all green.`);
