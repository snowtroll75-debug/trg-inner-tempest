#!/usr/bin/env node
/**
 * verify-block7 — Inner Tempest Block 7 (0.8.0): the twenty archetypes of
 * Chapter 5 (Dragon Tamer is Block 10's, B7-1), the seven abilities they
 * print as items, and the core archetypes opened to the five classes
 * (FA-22), checked against the book, against the system that reads them,
 * and by driving the pure decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block7.mjs
 *
 * Needs TRG Prime 3.671.0 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-block7.json, cut from the v1.2
 *      docx by tools/content/extract-book-block7.mjs): every paragraph each
 *      archetype and ability prints, its traits, prerequisites and
 *      progression line; the "Existing feats" lists
 *   B  The system reads the declarations: the progression lines, Brawler's
 *      fists, the class-trait access, the class skills, the conditionals
 *      (Jade Physician, Harmony Warden, Iaijutsu Master, Veilborn), the
 *      katana and the bows, the resistance and the skill bonuses, "Learned
 *      Caster", the granted feats, abilities and spells
 *   C  The pure decisions: Harmony Warden's spell, Shugenja's, Mystic
 *      Essence's opened specialists and their bonus, Restorative Palm,
 *      Night Lotus Venom's ladder and bearer, the Soul-Bound Weapon,
 *      Formbinder's merge, Twin Path's spells, the class tradition fallback
 *   D  Registration: the archetypes (Zen Archer counting as Archer), every
 *      Use, the class-skill choices, FA-22 through the system's own picker
 *   E  Wiring: the hooks, Block 3, 4, 5 and 6's changes, versions, packs
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

const B7 = await import("./content/block7.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const auto7 = await import("../module/block7-automations.mjs");
const auto4 = await import("../module/block4-automations.mjs");
const auto3 = await import("../module/block3-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block7.json"), "utf8"));

const progression = await import(sys("module", "archetype-progression.mjs"));
const cond = await import(sys("module", "conditionals.mjs"));
const unarmed = await import(sys("module", "combat", "unarmed-profile.mjs"));
const feats = await import(sys("module", "feats.mjs"));
const classSkills = await import(sys("module", "class-skills.mjs"));
const classDerive = await import(sys("module", "class-derive.mjs"));
const prof = await import(sys("module", "proficiency-rules.mjs"));
const prereq = await import(sys("module", "prerequisites.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const pickers = await import(sys("module", "picker-filters.mjs"));
const pe = await import(sys("module", "peril-effect.mjs"));
const resolution = await import(sys("module", "dice", "resolution.mjs"));
const sheathed = await import(sys("module", "combat", "sheathed.mjs"));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));

const F = (doc) => doc.flags?.["trg-prime"] ?? {};
const byName = Object.fromEntries([...B7.BLOCK7_FEATS, ...B7.BLOCK7_ABILITIES].map((d) => [d.name, d]));
const strip = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const src = (f) => fs.readFileSync(path.join(ROOT, "module", f), "utf8");

/** A core pack's documents, read from a copy so the system's own folder is untouched. */
async function corePack(name) {
  const from = path.join(SYSTEM_ROOT, "packs", name);
  if (!fs.existsSync(from)) return [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `it7-${name}-`));
  fs.cpSync(from, dir, { recursive: true });
  try { fs.rmSync(path.join(dir, "LOCK"), { force: true }); } catch { /* none */ }
  const { ClassicLevel } = await import("classic-level");
  const out = [];
  const db = new ClassicLevel(dir, { valueEncoding: "json" });
  try { for await (const [k, v] of db.iterator()) if (k.split("!")[1] && !k.split("!")[1].includes(".")) out.push(v); } finally { await db.close(); fs.rmSync(dir, { recursive: true, force: true }); }
  return out;
}

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

const ALL = Object.keys(book.archetypes);
equal("A twenty-one archetypes printed; twenty built (Dragon Tamer with the Dragon Companions, B7-1)", [ALL.length, B7.BLOCK7_FEATS.length, ALL.filter((k) => !B7.BLOCK7_FEATS.some((d) => d.name.toUpperCase() === k)).join()], [21, 20, "DRAGON TAMER"]);
for (const doc of B7.BLOCK7_FEATS) {
  const KEY = doc.name.toUpperCase();
  const entry = book.archetypes[KEY];
  const text = strip(doc.system.description);
  const missing = entry.lines.map((l) => strip(md(String(l).replace(/<\/?sup>/g, "")))).filter((l) => !text.includes(l));
  equal(`A ${doc.name}: every paragraph the book prints is in its description`, missing, []);
  equal(`A ${doc.name}: an archetype, with the book's progression line verbatim`, [doc.type, doc.system.category, doc.system.progressionRequirements], ["feat", "Archetype", entry.progression]);
  equal(`A ${doc.name}: its class traits as printed`, doc.system.traits, entry.traits.split(" ").filter(Boolean).map((t) => t[0] + t.slice(1).toLowerCase()).join(", "));
  ok(`A ${doc.name}: its prerequisites as printed`, doc.system.prerequisites === entry.prerequisites);
}
for (const KEY of Object.keys(book.abilities)) {
  const entry = book.abilities[KEY];
  const name = KEY.split(" ").map((w) => (w === "THE" ? "the" : w[0] + w.slice(1).toLowerCase())).join(" ").replace("Soul-bound", "Soul-Bound");
  const doc = byName[name];
  if (["POWERFUL FISTS", "SOUL-BOUND WEAPON"].includes(KEY)) {
    // Printed inside the archetype and built there.
    const owner = byName[entry.archetype.split(" ").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ")];
    ok(`A ${name} is printed in full in ${owner?.name}'s description`, Boolean(owner) && entry.lines.every((l) => strip(owner.system.description).includes(strip(md(l)))));
    continue;
  }
  ok(`A ${name}: an ability item`, Boolean(doc) && doc.type === "ability", name);
  if (!doc) continue;
  const text = strip(doc.system.description);
  equal(`A ${name}: every paragraph the book prints`, entry.lines.map((l) => strip(md(l))).filter((l) => !text.includes(l)), []);
  equal(`A ${name}: its traits as printed`, doc.system.traits, entry.traits.split(" ").filter(Boolean).map((t) => t[0] + t.slice(1).toLowerCase()).join(", "));
}
equal("A FA-22: the book's lists, class by class, are the ones registered", B7.existingArchetypeAccess(), Object.fromEntries(Object.entries(reg.EXISTING_ARCHETYPES).map(([k, v]) => [k, [...v]])));

/* ------------------------------------------------------------------ *
 * B. The system reads the declarations
 * ------------------------------------------------------------------ */

equal("B every progression line is read by TRG Prime 3.671.0 (C1)", B7.BLOCK7_FEATS.filter((d) => progression.parseProgressionClause(d.system.progressionRequirements) === null).map((d) => d.name), []);
equal("B …Brawler's \"Level +10\" is character level 10 (B7-2); Inner Adept's is its own class skill; Shugenja's needs all three",
  [progression.parseProgressionClause(byName.Brawler.system.progressionRequirements), progression.parseProgressionClause(byName["Inner Adept"].system.progressionRequirements)?.type, progression.parseProgressionClause(byName.Shugenja.system.progressionRequirements)],
  [{ type: "level", min: 10 }, "grantedClassSkill", { type: "skillAll", keys: ["arcana", "nature", "religion"], min: 10 }]);
{
  const rows = unarmed.declaredUnarmedRows([byName.Brawler]);
  const fists = unarmed.unarmedProfile({ natural: true, category: "Unarmed", damageType: "subdual", damage: "1d4" }, rows, 9);
  equal("B Brawler's fists: 1d6, Versatile B, +3 at BAB 9, magical, cold iron and silver", [fists?.damage, fists?.versatile, fists?.flat, fists?.magical, fists?.materials], ["1d6", "B", 3, true, ["cold iron", "silver"]]);
  equal("B …and nothing on a sword", unarmed.unarmedProfile({ group: "sword", damage: "1d8" }, rows, 9), null);
  const at = (bab) => unarmed.unarmedProfile({ natural: true, category: "Unarmed", damageType: "subdual", damage: "1d4" }, rows, bab);
  equal("B …magical from BAB 3, not before; adamantine at 16", [at(2)?.magical, at(3)?.magical, at(15)?.materials, at(16)?.materials], [false, true, ["cold iron", "silver"], ["cold iron", "silver", "adamantine"]]);
}
equal("B class-trait access (B7-3): Brawler and Inner Adept open the Disciple's trait, Steel Disciple the Kensai's",
  [feats.declaredClassFeatAccess([byName.Brawler]), feats.declaredClassFeatAccess([byName["Inner Adept"]]), feats.declaredClassFeatAccess([byName["Steel Disciple"]])], [["Disciple"], ["Disciple"], ["Kensai"]]);
{
  api.resetModuleRegistry();
  for (const [name, spec] of Object.entries(reg.CLASS_REGISTRATIONS)) api.registerClass(name, spec, "trg-inner-tempest");
  const filter = pickers.buildPickerFilter("classFeat", { class: "Fighter", ownClass: "Fighter", tier: "Martial", traitClasses: feats.declaredClassFeatAccess([byName.Brawler]).join(", "), archetypes: "Brawler" });
  const plain = pickers.buildPickerFilter("classFeat", { class: "Fighter", ownClass: "Fighter", tier: "Martial", traitClasses: "", archetypes: "" });
  const discipleFeat = { name: "Stunning Fist", system: { category: "Class", traits: "Disciple", prerequisites: "" } };
  const mysticFeat = { name: "Mystic Essence", system: { category: "Class", traits: "Mystic", prerequisites: "" } };
  equal("B …so a Fighter Brawler is offered a Disciple-trait feat and a plain Fighter is not; a Mystic-trait feat is not opened",
    [filter(discipleFeat), plain(discipleFeat), filter(mysticFeat)], [true, false, false]);
  api.resetModuleRegistry();
}
{
  const carriers = ["Jade Physician", "Night Lotus", "Oathbound", "Ronin"].map((n) => ({ ...byName[n], id: n }));
  const declared = classDerive.declaredClassSkills(carriers);
  const skills = { medicine: { label: "Medicine" }, mentalFocus: { label: "Mental Focus" }, deception: { label: "Deception" } };
  const found = classSkills.classSkillSources({ skills, declared });
  equal("B the class skills each archetype gives (C4): Medicine twice, Mental Focus, Deception", [...found].map(([k, v]) => [k, v.length]).sort(), [["deception", 1], ["medicine", 2], ["mentalFocus", 1]]);
}
{
  const entries = (name) => cond.collectConditionals([{ ...byName[name], id: name }], [], [], {});
  const jade = entries("Jade Physician");
  equal("B Jade Physician: +2 class on Treat Injury, Toxin and Wounds, applied; not on a Medicine check besides",
    [cond.automaticSelections(jade, { checkType: "skill", subject: "medicine", actionKey: "treatToxin" }).modifiers, cond.automaticSelections(jade, { checkType: "skill", subject: "medicine", actionKey: "firstAid" }).modifiers],
    [[{ label: "Jade Physician", value: 2, type: "class" }], []]);
  const warden = entries("Harmony Warden");
  equal("B Harmony Warden: +4 class offered as a tick on Refocus, Healing Trance and Power Recovery, never applied unasked",
    [["refocus", "healingTrance", "powerRecovery", "recallKnowledge"].map((a) => cond.conditionalRows(warden, { checkType: "skill", actionKey: a }).length), cond.automaticSelections(warden, { checkType: "skill", actionKey: "refocus" }).modifiers.length],
    [[1, 1, 1, 0], 0]);
  const rows = cond.conditionalRows(warden, { checkType: "skill", actionKey: "healingTrance" });
  equal("B …ticked, it is +4 class", cond.applyConditionalSelections(rows, rows.map((r) => r.id)).modifiers, [{ label: "Harmony Warden", value: 4, type: "class" }]);
  const iai = entries("Iaijutsu Master");
  equal("B Iaijutsu Master: +25 class to Initiative with a sword sheathed (B7-5), not with it drawn",
    [cond.automaticSelections(iai, { checkType: "initiative", sheathedGroups: sheathed.sheathedGroups([{ type: "weapon", system: { group: "sword", quantity: 1 } }]) }).modifiers, cond.automaticSelections(iai, { checkType: "initiative", sheathedGroups: sheathed.sheathedGroups([{ type: "weapon", system: { group: "sword", equipped: true } }]) }).modifiers],
    [[{ label: "Iaijutsu Master", value: 25, type: "class" }], []]);
  const veil = entries("Veilborn");
  equal("B Veilborn: +2 class to Refocus a Ghost Art, not another item",
    [cond.automaticSelections(veil, { checkType: "skill", actionKey: "refocus", restores: ["Ghost Art", "Veiled Body"] }).modifiers, cond.automaticSelections(veil, { checkType: "skill", actionKey: "refocus", restores: ["Combat Form", "Iron Tortoise"] }).modifiers],
    [[{ label: "Veilborn", value: 2, type: "class" }], []]);
}
{
  const effects = (name) => byName[name].effects.map((e) => ({ ...e, getFlag: (s, k) => e.flags?.[s]?.[k] }));
  const oath = prof.proficiencyProfile({ items: [], effects: effects("Oathbound") });
  equal("B Oathbound: the katana and the wakizashi are martial for it; a nunchaku is not", [prof.effectiveWeaponCategory(oath, { name: "Katana", system: { category: "Exotic" } }), prof.effectiveWeaponCategory(oath, { name: "Wakizashi", system: { category: "Exotic" } }), prof.effectiveWeaponCategory(oath, { name: "Nunchaku", system: { category: "Exotic" } })], ["Martial", "Martial", "Exotic"]);
  const zen = prof.proficiencyProfile({ items: [], effects: effects("Zen Archer") });
  equal("B Zen Archer: proficient with the four bows by name", [...zen.weaponNames].sort(), ["compositelongbow", "compositeshortbow", "longbow", "shortbow"]);
  const c = [byName["Zen Archer"]];
  equal("B …and its unarmed abilities reach a bow, not a crossbow (C6, B7-6)", [unarmed.declaresUnarmedAbilities(c, { id: "a", name: "Longbow", system: { group: "Bow" } }), unarmed.declaresUnarmedAbilities(c, { id: "b", name: "Short Bow", system: { group: "Bow" } }), unarmed.declaresUnarmedAbilities(c, { id: "c", name: "Light Crossbow", system: { group: "Bow" } })], [true, true, false]);
  equal("B Night Lotus resists poison", byName["Night Lotus"].effects.flatMap((e) => e.changes).map((ch) => [ch.key, ch.value]), [["system.combat.resistances", ", poison"]]);
  equal("B +2 class: Shadowdancer's Stealth, Tanuki Trickster's Deception, the Geisha's Artistry, Diplomacy and Perform",
    ["Shadowdancer", "Tanuki Trickster", "Way of the Geisha"].map((n) => byName[n].effects.flatMap((e) => e.changes).map((ch) => `${ch.key}=${ch.value}`)),
    [["system.skills.stealth.class=2"], ["system.skills.deception.class=2"], ["system.skills.artistry.class=2", "system.skills.diplomacy.class=2", "system.skills.perform.class=2"]]);
}
{
  const pre = byName.Shugenja.system.prerequisites;
  const st = (casterStyle) => ({ casterStyle, skillRanks: { arcana: 2, nature: 2, religion: 2 } });
  equal("B Shugenja: learned casters only (IT-C9; C16)", [prereq.meetsParseablePrerequisites(pre, st("learned")), prereq.meetsParseablePrerequisites(pre, st("instinctive")), prereq.meetsParseablePrerequisites(pre, st(""))], [true, false, false]);
}
{
  const [coreFeats, coreSpells] = [await corePack("feats"), await corePack("spells")];
  ok("B the system's feats and spells were read", coreFeats.length > 0 && coreSpells.length > 0);
  const featNames = new Set([...coreFeats.map((f) => f.name), ...PACKS.find((p) => p.name === "it-feats").docs.map((d) => d.name)]);
  const abilityNames = new Set(PACKS.find((p) => p.name === "it-abilities").docs.map((d) => d.name));
  const spellNames = new Set(coreSpells.map((s) => s.name));
  const list = (v) => String(v ?? "").split(/,\s*/).map((x) => x.trim()).filter(Boolean);
  equal("B every granted feat exists (Inner Discipline, Stealthy Strike, Shadowy Step, Affable, Perfect Shot)", B7.BLOCK7_FEATS.flatMap((d) => list(d.system.grantedFeats)).filter((n) => !featNames.has(n)), []);
  equal("B every granted ability is one this module ships", B7.BLOCK7_FEATS.flatMap((d) => list(d.system.grantedAbilities)).filter((n) => !abilityNames.has(n)), []);
  equal("B Tanuki Trickster's spells are the system's own (IT-C8 as answered)", list(byName["Tanuki Trickster"].system.grantedSpells).filter((n) => !spellNames.has(n)), []);
  equal("B no Block 7 item shares a name with a core feat", B7.BLOCK7_FEATS.filter((d) => coreFeats.some((f) => f.name.toLowerCase() === d.name.toLowerCase())).map((d) => d.name), []);
  const weapons = await corePack("weapons");
  equal("B …all four, each of the Bow group", B7.ZEN_ARCHER_BOWS.map((n) => weapons.find((w) => w.name === n)?.system?.group ?? null), ["Bow", "Bow", "Bow", "Bow"]);
  const spellsOf = coreSpells.map((s) => ({ name: s.name, system: s.system }));
  ok("B Harmony Warden finds Verdant Utility spells at 1st level", spellsOf.some((s) => auto7.harmonyWardenFits(s.system, 1)));
  ok("B Shugenja finds spells for each element", Object.keys(auto7.SHUGENJA_ELEMENTS).every((el) => spellsOf.some((s) => auto7.shugenjaFits(s.system, el))));
  ok("B Lotus Enchanter and Onmyoji open specialist spells that exist", spellsOf.some((s) => auto7.essenceOpens(s.system, ["enchantment"], 20)) && spellsOf.some((s) => auto7.essenceOpens(s.system, ["soul"], 20)));
}
{
  const twin = byName["Twin Dragon"];
  equal("B Twin Dragon is a Combat Form an archetype gives: its two parts, entered through Combat Form, not on the table",
    [twin.system.category, twin.system.sourceClass, F(twin).itForm.parts.map((p) => Object.keys(p.flags)[0]), F(twin).itAutomation, F(twin).itFormExtra],
    ["Combat Form", "Kensai", ["itTwinDragonStrike", "itTwinDragonAvoid"], "combatFormItem", "Formbinder"]);
}

/* ------------------------------------------------------------------ *
 * C. The pure decisions
 * ------------------------------------------------------------------ */

equal("C Harmony Warden's ceiling: 2, 4 at 5th, 6 at 10th (B7-4)", [1, 4, 5, 9, 10, 15].map(auto7.harmonyWardenCeiling), [2, 2, 4, 4, 6, 8]);
equal("C …a Verdant Utility spell under it; not a save spell, not arcane, not a specialist, not too large",
  [auto7.harmonyWardenFits({ tradition: "verdant", category: "utility", ppCost: 2 }, 1), auto7.harmonyWardenFits({ tradition: "verdant", category: "save", ppCost: 2 }, 1),
    auto7.harmonyWardenFits({ tradition: "arcane", category: "utility", ppCost: 2 }, 1), auto7.harmonyWardenFits({ tradition: "verdant", category: "utility", ppCost: 2, specialist: true }, 1),
    auto7.harmonyWardenFits({ tradition: "verdant", category: "utility", ppCost: 4 }, 4), auto7.harmonyWardenFits({ tradition: "arcane, verdant", category: "utility", ppCost: 4 }, 5)],
  [true, false, false, false, false, true]);
equal("C Shugenja: the book's table", Object.fromEntries(Object.entries(auto7.SHUGENJA_ELEMENTS).map(([k, v]) => [k, [...v]])), { Air: ["Air", "Electricity"], Earth: ["Acid", "Earth"], Fire: ["Fire", "Light"], Water: ["Cold", "Water"] });
equal("C …a spell with either trait, any tradition; never a specialist (interpretation 1)",
  [auto7.shugenjaFits({ traits: "Electricity, Evocation" }, "Air"), auto7.shugenjaFits({ traits: "Light" }, "Fire"), auto7.shugenjaFits({ traits: "Fire" }, "Water"), auto7.shugenjaFits({ traits: "Fire", specialist: true }, "Fire")],
  [true, true, false, false]);
{
  const items = [byName["Lotus Enchanter"], { name: "Mystic Essence", flags: {} }];
  equal("C Lotus Enchanter opens Enchantment specialists (within Mystic Essence's PP); Onmyoji Soul ones",
    [auto7.essenceTraitsOf(items), auto7.essenceOpens({ specialist: true, traits: "Enchantment, Mental", ppCost: 4 }, ["enchantment"], 4), auto7.essenceOpens({ specialist: true, traits: "Enchantment", ppCost: 6 }, ["enchantment"], 4),
      auto7.essenceOpens({ specialist: false, traits: "Enchantment", ppCost: 2 }, ["enchantment"], 4), auto7.essenceTraitsOf([byName["Onmyoji Necromancer"]])],
    [["enchantment"], true, false, false, ["soul"]]);
  equal("C …and an Enchantment spell it gives carries +1 class to attack and DC; another spell does not",
    [auto7.essenceBonus({ traits: "Enchantment" }, items), auto7.essenceBonus({ traits: "Fire" }, items)], [{ attack: 1, dc: 1, type: "class", label: "Lotus Enchanter" }, null]);
  ok("C the core reads that bonus off the spell (C14)", JSON.stringify((await import(sys("module", "magic", "spell-own-bonus.mjs"))).spellOwnBonus({ flags: { "trg-prime": { spellBonus: auto7.essenceBonus({ traits: "Enchantment" }, items) } } })) === JSON.stringify({ attack: 1, dc: 1, type: "class", label: "Lotus Enchanter" }));
}
equal("C Restorative Palm: 4 HP per level; Bleeding 1 per two levels (at least 1); not a construct or undead",
  [auto7.restorativePalmHealing(5), auto7.restorativePalmBleeding(1), auto7.restorativePalmBleeding(7), auto7.livingAnatomy("Humanoid"), auto7.livingAnatomy("Undead, Medium"), auto7.livingAnatomy(auto7.creatureTraitLine({ details: { creatureType: "Construct" } }))],
  [20, 1, 3, true, false, false]);
{
  const spec = pe.perilEffectSpec({ ...auto7.NIGHT_LOTUS_LADDER, scope: "targets", outcomes: { ...auto7.NIGHT_LOTUS_LADDER.outcomes }, conditions: { ...auto7.NIGHT_LOTUS_LADDER.conditions } });
  const tags = (d) => pe.perilEffectOutcome(spec, d, { combatRound: 3, worldTime: 0 }).tags.map((t) => t.key ?? t.condition ?? t.id).filter(Boolean);
  equal("C Night Lotus Venom's ladder through the system's rail: Fortitude; Failure Slowed; Fumble Paralyzed then Slowed; Critical and Success no condition (Success's Speed is laid on by the module)",
    [spec.save, tags("critical"), tags("success"), tags("failure"), tags("fumble")], ["fortitude", [], [], ["slowed"], ["paralyzed", "slowed"]]);
  equal("C …a Partial is the Success row (IT-m24)", [auto7.NIGHT_LOTUS_LADDER.outcomes.partial === auto7.NIGHT_LOTUS_LADDER.outcomes.success, [...auto7.NIGHT_LOTUS_SPEED_RUNGS]], [true, ["success", "partial"]]);
  equal("C …and its bearer: a piercing or slashing weapon in hand, Versatile P or S, or ammunition; not a club, not one carried",
    [auto7.venomBearer({ type: "weapon", system: { equipped: true, damageType: "piercing" } }), auto7.venomBearer({ type: "weapon", system: { equipped: true, damageType: "bludgeoning", traits: "Versatile S" } }),
      auto7.venomBearer({ type: "ammunition", system: {} }), auto7.venomBearer({ type: "weapon", system: { equipped: true, damageType: "bludgeoning" } }), auto7.venomBearer({ type: "weapon", system: { equipped: false, damageType: "slashing" } })],
    [true, true, true, false, false]);
}
{
  const f = auto7.soulBondFlags("w1");
  const carriers = [{ name: "Soul Weapon Master", flags: { "trg-prime": f } }];
  equal("C the Soul-Bound Weapon through the system: +2 and cold iron at BAB 8 for that weapon only, and the unarmed abilities with it (C6, C7)",
    [unarmed.weaponScalingProfile(carriers, { id: "w1" }, 8)?.flat, unarmed.weaponScalingProfile(carriers, { id: "w1" }, 8)?.materials, unarmed.weaponScalingProfile(carriers, { id: "w2" }, 8), unarmed.declaresUnarmedAbilities(carriers, { id: "w1", name: "Katana" })],
    [2, ["cold iron", "silver"], null, true]);
  equal("C …magical from BAB 3, not before", [unarmed.weaponScalingProfile(carriers, { id: "w1" }, 2)?.magical ?? false, unarmed.weaponScalingProfile(carriers, { id: "w1" }, 3)?.magical], [false, true]);
  equal("C …and Zen Archer's by the bow's name, not the group (a crossbow is a Bow too)",
    [auto3.declaredAbilityWeapon([byName["Zen Archer"]], { type: "weapon", id: "x", name: "Composite Longbow", system: { group: "Bow" } }), auto3.declaredAbilityWeapon([byName["Zen Archer"]], { type: "weapon", id: "y", name: "Light Crossbow", system: { group: "Bow" } })], [true, false]);
  equal("C the module's Flurry reads the same declaration", [auto3.abilityStrikeWeapon({ items: carriers, effects: [] }, { type: "weapon", id: "w1", name: "Katana", system: {} }), auto3.abilityStrikeWeapon({ items: carriers, effects: [] }, { type: "weapon", id: "w9", name: "Club", system: {} })], [true, false]);
}
{
  const parts = (name) => (name === "Twin Dragon" ? F(byName["Twin Dragon"]).itForm.parts : null);
  // Two forms' rows, as Block 4 ships them: Echoing Crane's DB and Iron Tortoise's DB.
  const crane = [{ label: "DB", flags: { statBonuses: [{ target: "defence", type: "class", valueFrom: "classBonus-1", label: "Echoing Crane" }] } }];
  const tortoise = [{ label: "DB", flags: { statBonuses: [{ target: "defence", type: "class", valueFrom: "intelligence/2", valueMin: 1, label: "Iron Tortoise" }] } }];
  const wolf = [{ label: "dmg", flags: { conditionals: [{ kind: "modifier", type: "class", valueFrom: "intelligence", label: "Dread Wolf", auto: true, when: { checkTypes: ["damage"], targetStates: ["isolated"] } }] } }];
  const fox = [{ label: "dmg", flags: { conditionals: [{ kind: "modifier", type: "class", valueFrom: "intelligence", label: "Ghost Fox", auto: true, when: { checkTypes: ["damage"], targetStates: ["flatfooted"] } }, { kind: "modifier", type: "class", valueFrom: "intelligence", label: "Ghost Fox", auto: true, when: { checkTypes: ["skill"], subjects: ["stealth"] } }] } }];
  const merged = auto4.formbinderFlags([crane, tortoise]);
  equal("C Formbinder: two forms' DB rows share one group, so only the greater applies (C15)", merged.statBonuses.map((r) => r.stackGroup), ["formbinder:stat:defence", "formbinder:stat:defence"]);
  const dmg = auto4.formbinderFlags([wolf, fox]).conditionals;
  equal("C …two damage rows share a group; Stealth has its own", dmg.map((c) => c.stackGroup), ["formbinder:modifier:damage||", "formbinder:modifier:damage||", "formbinder:modifier:skill|stealth|"]);
  const stacked = resolution.applyStacking([{ label: "Echoing Crane", value: 4, type: "class", stackGroup: merged.statBonuses[0].stackGroup }, { label: "Iron Tortoise", value: 2, type: "class", stackGroup: merged.statBonuses[1].stackGroup }, { label: "Shield", value: 1, type: "class" }]);
  equal("C …and the system then keeps the greater: 4 + 1, not 7", stacked.total, 5);
  equal("C …a single form is merged as before, no group", JSON.stringify(auto4.mergeFormFlags(crane)).includes("stackGroup"), false);
  equal("C Formbinder's stance is named for it; a blend as before", [auto4.formStanceName(["A", "B"], { formbinder: true }), auto4.formStanceName(["A", "B"]), auto4.formStanceName(["A"])], ["Formbinder: A + B", "Blended Form: A + B", "Combat Form: A"]);
  const kensai = { items: [{ name: "Iron Tortoise", flags: { "trg-prime": { itForm: { parts: tortoise } } } }, { name: "Twin Dragon", flags: { "trg-prime": F(byName["Twin Dragon"]) } }] };
  equal("C an archetype's form is known but not counted against the table", [auto4.knownForms(kensai).length, auto4.learnedForms(kensai).map((i) => i.name)], [2, ["Iron Tortoise"]]);
  ok("C Twin Dragon's parts carry no bonus row of their own (its effects are laid on by the hook)", parts("Twin Dragon").every((p) => !p.flags.conditionals && !p.flags.statBonuses));
}
equal("C Twin Path: a discipline's 1st-level spells only", [auto7.spellsAtLevel("1: Produce Flame, 1: Burning Hands, 3: Scorching Ray, 5: Fireball", 1), auto7.spellsAtLevel("1: A, 3: B", 3), auto7.spellsAtLevel("", 1)], [["Produce Flame", "Burning Hands"], ["B"], []]);
equal("C the disciplines Twin Path offers are Block 3's", [...auto7.DISCIPLINE_NAMES], ["Inner Flame", "Dragon Soul", "Still Mind", "Starborn Flow", "Thousand Reflections"]);
{
  const path = { name: "Inner Adept", flags: { "trg-prime": { itPath: { name: "Devoted", tradition: "divinity", ability: "wisdom", skill: "" } } } };
  const kensai = { name: "Magical Tradition", flags: { "trg-prime": { itTradition: { ability: "intelligence", tradition: "ethereal" } } } };
  const unchosen = { name: "Magical Tradition", flags: { "trg-prime": { itTradition: { ability: "intelligence", tradition: "" } } } };
  equal("C Inner Adept's Path is read with the Path's own name (Shadowy Stance asks it by name)", auto3.pathOf([path]), { name: "Devoted", tradition: "divinity", ability: "wisdom", skill: "" });
  equal("C IT-M6's fallback: the Path, else a class's chosen tradition, else nothing",
    [auto3.magicOf([path, kensai])?.tradition, auto3.magicOf([kensai])?.tradition, auto3.magicOf([kensai])?.ability, auto3.magicOf([unchosen])], ["divinity", "ethereal", "intelligence", null]);
}
equal("C Mystical Power, Inner Magic and Mystic Essence never offer a specialist spell (they are a class's list)",
  [auto3.mysticalPowerFits({ tradition: "arcane", ppCost: 2, traits: "" }, "pp2", { tradition: "arcane", level: 1 }), auto3.mysticalPowerFits({ tradition: "arcane", ppCost: 2, traits: "", specialist: true }, "pp2", { tradition: "arcane", level: 1 })], [true, false]);
equal("C the turn's key reads a combat's round and turn", [auto7.turnKeyOf({ id: "c", round: 2, turn: 3 }), auto7.turnKeyOf(null)], ["c:2:3", null]);
equal("C the four Sworn Oaths Wandering Creed offers", [...auto7.OATH_NAMES], ["Oath of Honour", "Oath of Guardianship", "Oath of Vengeance", "Oath of Fealty"]);
equal("C Veilborn's DB follows the arts that conceal, make invisible or teleport", [...auto4.VEILBORN_ARTS], ["Shadow Double", "Veiled Body", "Empty Presence", "Shadow Passage", "Smoke Veil"]);

/* ------------------------------------------------------------------ *
 * D. Registration
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
const called = (n) => calls.filter((c) => c[0] === n);
equal("D the twenty archetypes registered; Zen Archer counts as Archer (C3)",
  [called("registerArchetype").length, called("registerArchetype").filter((c) => c[2]?.countsAs?.length).map((c) => [c[1], c[2].countsAs])], [20, [["Zen Archer", ["Archer"]]]]);
equal("D …by the names the items carry", called("registerArchetype").map((c) => c[1]).sort(), B7.BLOCK7_FEATS.map((d) => d.name).sort());
for (const doc of [...B7.BLOCK7_FEATS, ...B7.BLOCK7_ABILITIES].filter((d) => F(d).itAutomation && F(d).itAutomation !== "combatFormItem" || d.name === "Twin Dragon")) {
  const k = doc.name.toLowerCase();
  const entry = auto7.BLOCK7_AUTOMATIONS[k];
  ok(`D ${doc.name}: its Use is registered, with a hint`, Boolean(entry?.use) && typeof entry.hint === "string" && called("registerFeatAutomation").some((c) => c[1] === k && c[2] === entry));
}
ok("D every Block 7 Use names an item Block 7 ships", Object.keys(auto7.BLOCK7_AUTOMATIONS).every((k) => [...B7.BLOCK7_FEATS, ...B7.BLOCK7_ABILITIES].some((d) => d.name.toLowerCase() === k)));
ok("D no Block 7 automation shadows an earlier one", Object.keys(auto7.BLOCK7_AUTOMATIONS).every((k) => called("registerFeatAutomation").filter((c) => c[1] === k).length === 1));
equal("D the two class-skill choices (C1's \"Gained class skill\")", called("registerClassSkillGrant").filter((c) => ["inner adept", "steel disciple"].includes(c[1].name)).map((c) => [c[1].name, c[1].flag, c[1].options]),
  [["inner adept", "itInnerAdeptSkill", ["meditation", "mentalFocus"]], ["steel disciple", "itSteelDiscipleSkill", ["acrobatics", "athletics", "meditation", "mentalFocus"]]]);
{
  equal("D FA-22 registered as archetype access, class by class (C2)", called("registerFeatAccess").filter((c) => c[1] === "archetype").map((c) => [c[2], c[3]]), Object.entries(reg.EXISTING_ARCHETYPES).map(([k, v]) => [k, [...v]]));
  api.resetModuleRegistry();
  for (const [name, spec] of Object.entries(reg.CLASS_REGISTRATIONS)) api.registerClass(name, spec, "trg-inner-tempest");
  for (const [cls, list] of Object.entries(reg.EXISTING_ARCHETYPES)) api.registerFeatAccess("archetype", cls, [...list], "trg-inner-tempest");
  const archetypes = await corePack("feats").then((all) => all.filter((f) => f.system?.category === "Archetype"));
  const byN = (n) => archetypes.find((a) => a.name === n);
  const offered = (cls, tier, name) => pickers.buildPickerFilter("archetypeFeat", { class: cls, ownClass: cls, tier })(byN(name));
  equal("D the system's own picker: Vanguard for a Kensai, not a Mystic; Runemage for a Mystic; Mastermind for a Ghostwalker; Assassin for a Disciple",
    [offered("Kensai", "Martial", "Vanguard"), offered("Mystic", "Adept", "Vanguard"), offered("Mystic", "Adept", "Runemage"), offered("Ghostwalker", "Expert", "Mastermind"), offered("Disciple", "Martial", "Assassin")],
    [true, false, true, true, true]);
  equal("D …the tier rule still stands (B7-8): Armour Master and Cavalier for a Kensai", [offered("Kensai", "Martial", "Armour Master"), offered("Kensai", "Martial", "Cavalier")], [true, true]);
  equal("D every name in FA-22 is a core archetype", Object.values(reg.EXISTING_ARCHETYPES).flat().filter((n) => !byN(n)), []);
  ok("D …with no problem reported", api.registrationProblems().length === 0, JSON.stringify(api.registrationProblems()));
  api.registerArchetype("Zen Archer", { countsAs: ["Archer"] }, "trg-inner-tempest");
  const perfectShot = { name: "Perfect Shot", system: { category: "Class", traits: "Archer, Attack, Flourish, Ranger, Zen Archer", prerequisites: "" } };
  const archer = pickers.buildPickerFilter("classFeat", { class: "Fighter", ownClass: "Fighter", tier: "Martial", archetypes: feats.effectiveArchetypes(["Zen Archer"]) });
  equal("D a Zen Archer is offered Perfect Shot (B6-10) and the Archer's own feats", [archer(perfectShot), archer({ name: "Double Shot", system: { category: "Class", traits: "Archer, Flourish", prerequisites: "" } })], [true, true]);
  api.resetModuleRegistry();
}

/* ------------------------------------------------------------------ *
 * E. Wiring
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
for (const [hook, fn] of [["trgPrimeAmbushDealt", "onAmbushDealtB7"], ["trgPrimeStrikeResolved", "onStrikeResolvedB7"], ["trgPrimeDamageApplied", "onDamageAppliedB7"], ["trgPrimeDailyPreparation", "onDailyPreparationB7"], ["trgPrimeTurnEnded", "onTurnEndedB7"]]) {
  ok(`E ${fn} listens on ${hook}`, new RegExp(`Hooks\\.on\\("${hook}", \\(ctx\\) => \\{ (?:try \\{ )?${fn}\\(ctx\\)`).test(script));
}
const b4 = src("block4-automations.mjs");
ok("E Challenge may be paid with conviction (Bound Challenge) or nothing (Turning the Blade), and refuses with no conviction left",
  /if \(spend === "conviction" && int\(actor\.system\?\.resources\?\.conviction\?\.value\) <= 0\) \{ ui\.notifications\.warn/.test(b4)
  && /if \(spend === "focus" && !\(await spendUse\(item, "Challenge"\)\)\) return false;/.test(b4)
  && /if \(spend === "conviction"\) await actor\.update\(\{ "system\.resources\.conviction\.value": int\(actor\.system\?\.resources\?\.conviction\?\.value\) - 1 \}\);/.test(b4));
ok("E Formbinder: a second form joins the first, a blend fills both (B7-7), one activation a turn",
  /if \(ownedNamed\(actor, "Formbinder"\) && current\.length === 1 && names\.length === 1 && norm\(current\[0\]\) !== norm\(names\[0\]\) && !activeForm\(actor\)\?\.flags\?\.\[SYSTEM_ID\]\?\.itFormbinder\) \{/.test(b4)
  && /const done = await enterForm\(actor, \[current\[0\], names\[0\]\], \{ formbinder: true \}\);/.test(b4)
  && /if \(!formbinderTurnFree\(actor\)\) \{ ui\.notifications\.warn\("Formbinder: you have already activated a form this turn\."\); return false; \}/.test(b4)
  && /const merged = formbinder \? formbinderFlags\(forms\.map\(\(f\) => f\.flags\[SYSTEM_ID\]\.itForm\.parts\)\) : mergeFormFlags\(parts\);/.test(b4));
ok("E an archetype's form or art is not counted against the class's table", (b4.match(/- learnedForms\(actor\)\.length;/g) ?? []).length === 2
  && /const learned = Array\.from\(actor\.items \?\? \[\]\)\.filter\(\(i\) => i\.flags\?\.\[SYSTEM_ID\]\?\.itArtLevel && !i\.flags\?\.\[SYSTEM_ID\]\?\.itArtExtra\)\.length;/.test(b4));
ok("E Steel Disciple's form is entered as a stance with no Combat Form", /if \(item\?\.flags\?\.\[SYSTEM_ID\]\?\.itFormExtra === "Steel Disciple" && !ownedNamed\(actor, "Combat Form"\)\) return enterForm\(actor, \[name\], \{ spendCombatForm: false \}\);/.test(b4));
equal("E Veilborn's DB is asked after each of its five arts", ["Shadow Double", "Veiled Body", "Empty Presence", "Smoke Veil"].map((a) => b4.includes(`await veilbornAfterArt(actor, "${a}");`)).concat([b4.includes("await veilbornAfterArt(actor, label);")]), [true, true, true, true, true]);
ok("E a Strike its target cannot react to offers no Form Reversal, Shadow Counter, Waiting Blade or Snake Stance",
  /if \(!ctx\.noReactions && melee && ownedNamed\(target, "Form Reversal"\)/.test(b4) && /if \(!ctx\.noReactions && ownedNamed\(target, "Shadow Counter"\)/.test(b4)
  && /if \(missedHere\(ctx\) && !held && melee && !ctx\.noReactions\) \{/.test(src("block5-automations.mjs")) && /if \(ctx\.noReactions\) return;/.test(src("block6-automations.mjs")));
ok("E a class's Magical Tradition, once chosen, stamps the spells waiting for one (IT-M6)", /await stampOwedSpells\(actor\);/.test(b4) && /const stamp = pathStamp\(magicOf\(Array\.from\(actor\.items \?\? \[\]\)\), magic\.allowance, \{ metamagic \}\);/.test(src("block3-automations.mjs")));
ok("E Flurry of Blows reaches a declared weapon", /\.filter\(\(i\) => abilityStrikeWeapon\(actor, i\) && \(i\.system\?\.natural \|\| i\.system\?\.equipped\)\)/.test(src("block3-automations.mjs")));
{
  const b6 = src("block6-automations.mjs");
  ok("E Mystic Essence offers the opened specialists and marks their bonus; Inner Magic does not",
    /const opened = slot === "eligible" && norm\(item\.name\) === "mystic essence" \? essenceTraitsOf\(items\) : \[\];/.test(b6)
    && /\|\| essenceOpens\(e\.system, opened, level\)\)\);/.test(b6)
    && /const bonus = norm\(item\.name\) === "mystic essence" \? essenceBonus\(data\.system, items\) : null;\n\s*if \(bonus\) foundry\.utils\.setProperty\(data, `flags\.\$\{SYSTEM_ID\}\.spellBonus`, bonus\);/.test(b6));
}
{
  const b7 = src("block7-automations.mjs");
  ok("E Drawn Verdict: Challenge, a sheathed sword, reach, the Strike with noReactions, then the target's reactions taken on damage, and the sheathe at turn end",
    /const sheathed = await h\(\)\.sheathedWeapons\(actor, "sword"\);/.test(b7) && /noReactions: true, optionLabel: "Drawn Verdict"/.test(b7)
    && /if \(done\?\.damage > 0\) \{\n\s*await h\(\)\.createEffectsOn\(target, \[made\("drawnVerdictNoReactions", \{/.test(b7) && /system: \{ noReactions: true \}/.test(b7)
    && /await offerTo\(actor, "b7Sheathe", \{ weaponId: dv\.weaponId \}\);/.test(b7));
  ok("E Restorative Palm: living, touch, immunity asked and granted for an hour, through the system's helpers",
    /const immune = await h\(\)\.temporaryImmunityRefusal\(target, "Restorative Palm"\);/.test(b7) && /await h\(\)\.grantTemporaryImmunity\(target, "Restorative Palm", 3600\);/.test(b7)
    && /await h\(\)\.healActor\(target, restorativePalmHealing\(level\), \{ magical: false \}\);/.test(b7) && /await h\(\)\.rollAfflictionSave\(target, aff\);/.test(b7));
  ok("E Night Lotus Venom: the Level DC, +1 (the save's −1) after Unseen Assault, delivered once", /const dc = h\(\)\.levelDC\(levelOf\(attacker\)\) \+ \(unseen \? 1 : 0\);/.test(b7) && /await safeDelete\(attacker, \[fx\.id\]\);/.test(b7));
  ok("E Turning the Blade: a Strike's damage by another creature, the reaction asked first", /if \(context\?\.kind !== "strike"\) return;/.test(b7) && /if \(challengedUuid\(victim\) === sourceUuid \|\| victim\.uuid === sourceUuid\) return;/.test(b7) && /if \(!\(await reactionOpen\(victim, "Turning the Blade"\)\)\) return;/.test(b7));
  ok("E Harmony Warden casts through the system once, the trance kept on a refused cast", /const cast = await h\(\)\.castInnateOnce\(actor, data, \{ ability, tradition: "verdant" \}\);/.test(b7) && /if \(cast === null \|\| cast === undefined \|\| cast === false\) return false;/.test(b7));
}

/* ------------------------------------------------------------------ *
 * F. Found in review (0.8.0, before release)
 * ------------------------------------------------------------------ */
{
  const b7 = src("block7-automations.mjs");
  const b4f = src("block4-automations.mjs");
  equal("F distanceBetween is awaited: Drawn Verdict's reach and Restorative Palm's touch refuse a creature too far", [(b7.match(/Number\(await h\(\)\.distanceBetween\(mine, theirs\)\)/g) ?? []).length, /Number\(h\(\)\.distanceBetween/.test(b7)], [2, false]);
  ok("F Restorative Palm's writes to the target go to its owner (the GM for another player's character), who posts the card",
    /await asOwner\(target, "b7Palm", \{ healerUuid: actor\.uuid, pick, level \}\);/.test(b7) && /ownerOps: \{ b7Palm: palmOnTarget \}/.test(b7)
    && /async function palmOnTarget\(target, \{ healerUuid, pick, level \}\) \{/.test(b7) && /await card\(healer \?\? target, "Restorative Palm", lines\);/.test(b7));
  ok("F Drawn Verdict spends its AP and use on a Strike made; a cancelled one puts the sword back",
    /if \(!check\) \{ await sword\.update\(\{ "system\.equipped": false \}\); return false; \}\n\s*await spendAP\(actor, "Drawn Verdict", 1\);\n\s*await spendUse\(item, "Drawn Verdict"\);/.test(b7)
    && !/if \(!\(await spendAP\(actor, "Drawn Verdict", 1\)\)\) return false;/.test(b7));
  ok("F Wandering Creed grants the oath as Sworn Oath's choice, so Sworn Oath grants no second one",
    /const granted = await grantAbility\(actor, ownedNamed\(actor, "Sworn Oath"\) \?\? item, pick, "Oathblade"\);/.test(b7));
  ok("F a Ronin's Oath of Fealty is asked for its Sworn Charge after the creed, not by Block 4's question at the same time",
    /if \(ownedNamed\(actor, "Wandering Creed"\)\) return null;/.test(b4f) && /const fealty = fealtyAskedHere\(actor\);/.test(b4f) && /const asks = Boolean\(fealtyAskedHere\(actor\)\)/.test(b4f)
    && /if \(granted\.flags\?\.\[SYSTEM_ID\]\?\.itOath === "Oath of Fealty"\) await fealtyChargeQuestion\(actor, granted\);/.test(b7)
    && /if \(current\[0\]\.flags\?\.\[SYSTEM_ID\]\?\.itOath === "Oath of Fealty"\) await fealtyChargeQuestion\(actor, current\[0\]\);/.test(b7));
  ok("F a lost Soul-Bound Weapon is not replaced before the next daily preparation, whatever day it was bonded", /\n  if \(bondedId\) \{ ui\.notifications\.warn\("Soul Weapon Master: your bonded weapon is lost;/.test(b7) && !/getFlag\(MODULE_ID, "bondDay"\) === dayKey\(\)/.test(b7));
  equal("F Night Lotus Venom rides the weapon coated (a missile Strike for ammunition), not every Strike",
    [auto7.venomRides({ coatedId: "w1" }, { id: "w1", system: {} }), auto7.venomRides({ coatedId: "w1" }, { id: "w2", system: {} }), auto7.venomRides({ ammo: true }, { id: "b", system: { attackMode: "missile" } }),
      auto7.venomRides({ ammo: true }, { id: "s", system: { attackMode: "melee" } }), auto7.venomRides({ coatedId: "w1" }, null), auto7.venomAmmo({ type: "ammunition" }), auto7.venomAmmo({ type: "weapon", system: {} })],
    [true, false, true, false, false, true, false]);
  ok("F …the coating records it, and the hook and the delivery both ask", /module: \{ nightLotus: true, coatedId: coated\.id, coatedName: coated\.name, ammo: venomAmmo\(coated\) \}/.test(b7)
    && (b7.match(/venomRides\(e\.flags\?\.\[MODULE_ID\] \?\? \{\}, weapon\)/g) ?? []).length === 2);
  ok("F Harmony Warden's card follows a cast made", (b7.match(/await card\(actor, "Harmony Warden"/g) ?? []).length === 1 && /if \(cast === null \|\| cast === undefined \|\| cast === false\) return false;\n\s*await item\.setFlag\(MODULE_ID, "tranceUsed", dayKey\(\)\);\n\s*await card\(actor, "Harmony Warden"/.test(b7));
  ok("F a form's own Use asks Formbinder's question too (live test: it replaced the held form unasked)",
    /return enterChosenForm\(actor, String\(pick\)\.split\("\|"\)\);/.test(b4f) && /if \(owed > 0\) \{ ui\.notifications\.info\("Combat Form: learn the forms you are owed first \(Combat Form's Use\)\."\); return false; \}\n\s*return enterChosenForm\(actor, \[name\]\);/.test(b4f));
  // Found in the live test (0.8.0): the sheathe was never offered.
  const dvRec = { combatId: "c1", combatantId: "k1", further: false };
  equal("F Drawn Verdict's sheathe is owed at the end of that combatant's turn, read by the combatant, not by the combat's (already advanced) turn",
    [auto7.sheatheOwed(dvRec, { id: "c1", round: 3, turn: 4 }, { id: "k1" }), auto7.sheatheOwed({ ...dvRec, further: true }, { id: "c1" }, { id: "k1" }),
      auto7.sheatheOwed(dvRec, { id: "c1" }, { id: "k2" }), auto7.sheatheOwed(dvRec, { id: "c2" }, { id: "k1" }), auto7.sheatheOwed({ ...dvRec, combatantId: null }, { id: "c1" }, { id: "k1" })],
    [true, false, false, false, false]);
  ok("F …the record names them, and the hook asks", /combatId: combat\.id, combatantId: combat\.combatant\?\.id \?\? null,/.test(b7) && /if \(!sheatheOwed\(dv, combat, combatant\)\) return;/.test(b7) && /export async function onTurnEndedB7\(\{ actor, combatant, combat \} = \{\}\)/.test(b7));
  api.resetModuleRegistry();
  for (const [name, spec] of Object.entries(reg.CLASS_REGISTRATIONS)) api.registerClass(name, spec, "trg-inner-tempest");
  const itFeats = PACKS.find((p) => p.name === "it-feats").docs;
  const feat = (n) => itFeats.find((d) => d.name === n);
  const steel = pickers.buildPickerFilter("classFeat", { class: "Fighter", ownClass: "Fighter", tier: "Martial", traitClasses: feats.declaredClassFeatAccess([byName["Steel Disciple"]]).join(", "), archetypes: "Steel Disciple" });
  const brawler = pickers.buildPickerFilter("classFeat", { class: "Fighter", ownClass: "Fighter", tier: "Martial", traitClasses: feats.declaredClassFeatAccess([byName.Brawler]).join(", "), archetypes: "Brawler" });
  equal("F through the system's picker: a Steel Disciple is offered the Kensai's own feats (source-tagged Kensai), a Brawler Dancing Leaf and Shadowy Step (B7-3)",
    [steel(feat("Blended Form")), steel(feat("Form Reversal")), brawler(feat("Dancing Leaf")), brawler(feat("Shadowy Step"))], [true, true, true, true]);
  equal("F …but not a feat tagged Kensai without the Kensai trait, nor a Mystic feat",
    [steel({ name: "X", system: { category: "Class", traits: "Martial", sourceClass: "Kensai", prerequisites: "" } }), brawler(feat("Alter the Thread") ?? { name: "Y", system: { category: "Class", traits: "Mystic", sourceClass: "Mystic", prerequisites: "" } })], [false, false]);
  api.resetModuleRegistry();
}

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("E the module is 0.9.1, built for 3.672.0", [manifest.version, manifest.relationships.systems[0].compatibility.minimum], ["0.9.1", "3.672.0"]);
ok("E the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.672.0";'));
{
  const [sa, sb] = String(systemJson.version).split(".").map(Number);
  ok("E the system at TRG_PRIME_ROOT is 3.671.0 or later", sa > 3 || (sa === 3 && sb >= 671), systemJson.version);
}
equal("E the packs carry Block 7: the twenty archetypes in it-feats, the seven abilities in it-abilities",
  [B7.BLOCK7_FEATS.every((d) => PACKS.find((p) => p.name === "it-feats").docs.includes(d)), B7.BLOCK7_ABILITIES.every((d) => PACKS.find((p) => p.name === "it-abilities").docs.includes(d))], [true, true]);
{
  const sourceDir = path.join(ROOT, "packs-source", "it-feats");
  const files = fs.existsSync(sourceDir) ? fs.readdirSync(sourceDir) : [];
  ok("E the built packs hold them (build-packs ran)", B7.BLOCK7_FEATS.every((d) => files.some((f) => f.endsWith(`_${d._id}.json`))));
}

const EXPECTED = 228;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block7: ${checks} checks — ${failures.length} FAILED\n`); for (const x of failures) console.log(`  ✗ ${x}`); process.exitCode = 1; }
else console.log(`verify-block7: ${checks} checks — all green.`);
