#!/usr/bin/env node
/**
 * verify-block6 — Inner Tempest Block 6 (0.7.0): the last fourteen class
 * feats of Chapter 5, Drunken Stance's own action and the core class feats
 * opened to the five classes (FC-55), checked against the book, against the
 * system that reads them, and by driving the pure decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block6.mjs
 *
 * Needs TRG Prime 3.670.0 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-block6.json, cut from the v1.2
 *      docx by tools/content/extract-book-block6.mjs): every paragraph each
 *      feat prints, its traits and prerequisites; Drunken Strike; the
 *      "Existing class feats" lists
 *   B  The system reads the declarations: each stance's changes, tick-boxes,
 *      unarmed traits, set damage types, bleed, Step, difficult terrain,
 *      Pack Attack, the free first Move, the 1-AP jump; Elemental Fist's
 *      types and traits; Stunning Fist's ladder; Inner Magic's class access;
 *      the Mystic's Metamagic mark; the prerequisites
 *   C  The pure decisions: the Paths the stances ask for, Stunning Fist's
 *      trigger, the weapons, the one-pick spells, the Mystics' spells
 *   D  Registration: every Use, FC-55 through the system's own access test
 *   E  Wiring: the hooks, the helpers, the Strikes, the reaction's traits,
 *      versions, packs
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

const B6 = await import("./content/block6.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const auto6 = await import("../module/block6-automations.mjs");
const auto3 = await import("../module/block3-automations.mjs");
const auto1 = await import("../module/automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block6.json"), "utf8"));

const cond = await import(sys("module", "conditionals.mjs"));
const bonuses = await import(sys("module", "bonuses", "registry.mjs"));
const so = await import(sys("module", "combat", "strike-options.mjs"));
const sto = await import(sys("module", "combat", "strike-type-options.mjs"));
const bleed = await import(sys("module", "combat", "bleed-bonus.mjs"));
const feats = await import(sys("module", "feats.mjs"));
const pf = await import(sys("module", "combat", "passive-feats.mjs"));
const dt = await import(sys("module", "difficulty-tradeoffs.mjs"));
const riders = await import(sys("module", "magic", "strike-riders.mjs"));
const pe = await import(sys("module", "peril-effect.mjs"));
const prereq = await import(sys("module", "prerequisites.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const warp = await import(sys("module", "magic", "spell-warp.mjs"));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));
const template = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "template.json"), "utf8"));

const F = (doc) => doc.flags?.["trg-prime"] ?? {};
const byName = Object.fromEntries(B6.BLOCK6_FEATS.map((d) => [d.name, d]));
const strip = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

equal("A fourteen class feats, as the audit counts them", [B6.BLOCK6_FEATS.length, Object.keys(book.feats).length], [14, 14]);
for (const [KEY, entry] of Object.entries(book.feats)) {
  const doc = B6.BLOCK6_FEATS.find((d) => d.name.toUpperCase().replace(/’/g, "'") === KEY);
  ok(`A ${KEY}: built`, Boolean(doc));
  if (!doc) continue;
  const desc = doc.system.description;
  const missing = entry.lines.filter((l) => !desc.includes(md(l)));
  ok(`A ${doc.name}: every paragraph the book prints`, missing.length === 0, missing.join(" / ").slice(0, 160));
  equal(`A ${doc.name}: the trait line`, doc.system.traits.toUpperCase().split(", ").join(" "), entry.traits);
  ok(`A ${doc.name}: a class feat`, doc.system.category === "Class");
  ok(`A ${doc.name}: says what the system does`, /(Automated|Partly automated|Not automated):/.test(strip(desc)));
}
equal("A the prerequisites, as the system reads them", B6.BLOCK6_FEATS.map((d) => [d.name, d.system.prerequisites]), [
  ["Crane Stance", "Devoted or Primal Monastic Path"], ["Dragon Stance", "Primal or Transcendent Monastic Path"], ["Drunken Stance", "Devoted or Primal Monastic Path"],
  ["Elemental Fist", "Inner Strike"], ["Inner Magic", "Inner Discipline, Level 4, Non-Mystic"], ["Mantis Stance", ""], ["Monkey Stance", ""], ["Mystic Essence", ""],
  ["Perfect Shot", "Dex +1, Wis +1, BAB +8"], ["Perfect Strike", "Dex +1, Wis +1, BAB +8"], ["Snake Stance", "Inner Discipline, Devoted or Illuminator Monastic Path"],
  ["Stunning Fist", ""], ["Tiger Stance", ""], ["Wolf Stance", ""]
]);
equal("A Perfect Shot and Perfect Strike print \"Dex 1, Wis 1\"; the book's line is kept in the description", ["Perfect Shot", "Perfect Strike"].map((n) => byName[n].system.description.includes("Dex 1, Wis 1, BAB +8")), [true, true]);
equal("A the Zen Archer trait is kept (B6-10)", byName["Perfect Shot"].system.traits, "Archer, Attack, Flourish, Ranger, Zen Archer");
{
  const ds = B6.BLOCK6_ABILITIES.find((a) => a.name === "Drunken Strike");
  ok("A Drunken Strike is an ability, Attack and Flourish, a class one", ds && ds.type === "ability" && ds.system.traits === "Attack, Flourish" && ds.system.category === "Class");
  const printed = book.feats["DRUNKEN STANCE"].lines;
  const at = printed.indexOf("**DRUNKEN STRIKE**");
  ok("A …with the action's paragraphs as the book prints them", ds && at >= 0 && printed.slice(at + 1).every((l) => ds.system.description.includes(md(l))));
  equal("A Drunken Stance grants it", byName["Drunken Stance"].system.grantedAbilities, "Drunken Strike");
}
equal("A FC-55: the registration is the book's \"Existing class feats\", parsed", Object.fromEntries(Object.entries(reg.EXISTING_CLASS_FEATS).map(([k, v]) => [k, [...v]])), B6.existingClassFeatAccess());
equal("A FC-55: 33 entries, 21 distinct feats (the Mystic's Metamagic line names no feat)", (() => {
  const all = Object.values(reg.EXISTING_CLASS_FEATS).flat();
  return [all.length, new Set(all).size];
})(), [33, 21]);
ok("A FC-55: the Mystic's printed line names Accurate Spell and the Metamagic feats", /Accurate Spell \(applies to Mystic innate spells\)/.test(book.existing.MYSTIC) && /Metamagic Feats where compatible with innate spells/.test(book.existing.MYSTIC));

/* ------------------------------------------------------------------ *
 * B. The system reads the declarations
 * ------------------------------------------------------------------ */

const actorTemplate = (() => {
  const t = template.Actor;
  const out = {};
  for (const name of t.character.templates ?? []) Object.assign(out, t.templates[name]);
  return out;
})();
const slotExists = (target) => target.replace(/^system\./, "").split(".").reduce((o, k) => (o && typeof o === "object" ? o[k] : undefined), actorTemplate) !== undefined;

const specs = Object.fromEntries(auto6.BLOCK6_STANCES.map((s) => [s, auto6.stanceSpec(s)]));
equal("B eight stances, each with an effect", auto6.BLOCK6_STANCES.filter((s) => specs[s]), ["Crane Stance", "Dragon Stance", "Drunken Stance", "Mantis Stance", "Monkey Stance", "Snake Stance", "Tiger Stance", "Wolf Stance"]);
ok("B …and every stance feat has the Stance trait, so Reactive Stance offers it", auto6.BLOCK6_STANCES.every((s) => /\bStance\b/.test(byName[s].system.traits)));
for (const [stance, spec] of Object.entries(specs)) {
  for (const ch of spec.changes) {
    const parsed = bonuses.parseBonusKey(ch.key);
    ok(`B ${stance}: ${ch.key} is a typed bonus the pool takes, on a slot the actor has`, ch.type === "custom" && parsed?.type === "circumstance" && slotExists(parsed.target) && Number(ch.value) > 0);
  }
  for (const [i, raw] of (spec.flags.conditionals ?? []).entries()) ok(`B ${stance}: tick-box ${i + 1} is one the system accepts`, Boolean(cond.normaliseConditional(raw, { id: "s", name: stance }, i)));
}
equal("B the changes: Crane DB +2; Dragon AB +2; Drunken DB +2; Mantis Reflex +2; Monkey Acrobatics and Climbing +2", auto6.BLOCK6_STANCES.map((s) => specs[s].changes.map((c) => [c.key.replace(/^system\./, ""), Number(c.value)])), [
  [["combat.defence.circumstance", 2]], [["combat.attack.circumstance", 2]], [["combat.defence.circumstance", 2]], [["combat.saves.reflex.circumstance", 2]],
  [["skills.acrobatics.circumstance", 2], ["skills.climbing.circumstance", 2]], [], [], []
]);
{
  const row = (s) => cond.normaliseConditional(specs[s].flags.conditionals[0], { id: "s", name: s }, 0);
  const crane = row("Crane Stance"), monkey = row("Monkey Stance");
  const on = (r, actionKey, checkType = "skill") => cond.matchesCheck(r, { checkType, subject: "athletics", actionKey });
  equal("B Crane's +5 and Monkey's +2, circumstance, applied for you on High Jump and Long Jump, and not on a Climb or a bare Athletics roll",
    [crane.value, crane.type, crane.auto, monkey.value, monkey.type, monkey.auto, on(crane, "highJump"), on(crane, "longJump"), on(crane, "climb"), on(crane, ""), on(monkey, "highJump"), on(monkey, "longJump"), on(monkey, "swim")],
    [5, "circumstance", true, 2, "circumstance", true, true, true, false, false, true, true, false]);
}
const effectOf = (s, extra = {}) => ({ name: s, disabled: false, flags: { "trg-prime": { ...specs[s].flags, featStance: true } }, ...extra });
const fist = { natural: true, category: "unarmed", damageType: "subdual", traits: "Agile, Unarmed" };
const monastic = { category: "simple", damageType: "bludgeoning", traits: "Monastic, Reach", group: "staff" };
const gauntlet = { category: "simple", damageType: "bludgeoning", unarmed: true, traits: "", group: "brawling" };
const claw = { natural: true, category: "natural", damageType: "slashing", traits: "Unarmed", group: "brawling" };
const sword = { category: "martial", damageType: "slashing", traits: "Versatile P", group: "sword" };
{
  const grant = (s, w) => so.traitsWithGroupGrants(w.traits, [effectOf(s)], { group: w.group ?? "", unarmed: w.natural && w.category === "unarmed" ? true : (w.unarmed === true || /monastic/i.test(w.traits)) });
  equal("B Dragon Stance's Sweep and Mantis Stance's Deadly reach the fists and a Monastic weapon, not a sword (B6-2)",
    [grant("Dragon Stance", fist), grant("Dragon Stance", monastic), grant("Dragon Stance", sword), grant("Mantis Stance", fist), grant("Mantis Stance", gauntlet), grant("Mantis Stance", sword)],
    ["Agile, Unarmed, Sweep", "Monastic, Reach, Sweep", "Versatile P", "Agile, Unarmed, Deadly", "Deadly", "Versatile P"]);
  equal("B …and a disabled stance gives nothing", so.traitsWithGroupGrants("", [effectOf("Dragon Stance", { disabled: true })], { unarmed: true }), "");
}
{
  const opts = (s) => sto.declaredStrikeTypeOptions([effectOf(s)]);
  const forced = (s, w) => sto.forcedStrikeTypes(w, opts(s)).map((t) => t.type);
  equal("B Tiger Stance sets slashing and Wolf Stance piercing, without asking, on the fists, a gauntlet and a Monastic weapon — not a claw or a sword (B6-1)",
    [forced("Tiger Stance", fist), forced("Tiger Stance", gauntlet), forced("Tiger Stance", monastic), forced("Tiger Stance", claw), forced("Tiger Stance", sword), forced("Wolf Stance", fist), forced("Wolf Stance", sword)],
    [["slashing"], ["slashing"], ["slashing"], [], [], ["piercing"], []]);
  equal("B …a set type, not an offered one", opts("Tiger Stance").map((o) => [o.replace, o.scope]), [[true, ["unarmed-form"]]]);
  equal("B …and the two stances held together (Stance Mastery) are asked between", sto.forcedStrikeTypes(fist, sto.declaredStrikeTypeOptions([effectOf("Tiger Stance"), effectOf("Wolf Stance")])).map((t) => t.type), ["slashing", "piercing"]);
}
equal("B Tiger Stance: bleeding you inflict +1, and only bleeding", [bleed.declaredBleedBonus([effectOf("Tiger Stance")]).value, bleed.withBleedBonus([{ key: "bleeding", value: 2 }, { key: "prone", value: null }], 1)], [1, [{ key: "bleeding", value: 3 }, { key: "prone", value: null }]]);
equal("B Tiger Stance: Step 10 feet while Speed is at least 20 (5 feet more), not at 15", [feats.declaredStepBonus([effectOf("Tiger Stance")], 30), feats.declaredStepBonus([effectOf("Tiger Stance")], 20), feats.declaredStepBonus([effectOf("Tiger Stance")], 15)], [5, 5, 0]);
equal("B Dragon Stance: the first square of difficult terrain eased; nothing without it", [pf.ignoresFirstDifficultSquare({ items: [], appliedEffects: [effectOf("Dragon Stance")] }), pf.ignoresFirstDifficultSquare({ items: [], appliedEffects: [effectOf("Crane Stance")] })], ["Dragon Stance", null]);
equal("B Mantis Stance: the first Move of each turn provokes nothing (B6-4); not without it", [pf.declaresFirstMoveNoReactions({ items: [], appliedEffects: [effectOf("Mantis Stance")] }), pf.declaresFirstMoveNoReactions({ items: [], appliedEffects: [effectOf("Monkey Stance")] }), pf.firstMoveIsFree(true, null, "c:1:0"), pf.firstMoveIsFree(true, "c:1:0", "c:1:0")], [true, false, true, false]);
equal("B Monkey Stance: the 1-AP jump carries no +2 (B6-5), on the two jumps only", [dt.declaredTradeoffWaivers([effectOf("Monkey Stance")], "highJump"), dt.declaredTradeoffWaivers([effectOf("Monkey Stance")], "longJump"), dt.declaredTradeoffWaivers([effectOf("Monkey Stance")], "climb")], [{ forOneAp: { dc: 0 } }, { forOneAp: { dc: 0 } }, {}]);
ok("B …the option it waives is the jumps' own", dt.DIFFICULTY_TRADEOFFS ? ["highJump", "longJump"].every((k) => (dt.DIFFICULTY_TRADEOFFS[k] ?? []).some((o) => o.key === "forOneAp")) : /highJump: Object\.freeze\(\[\n\s*opt\("forOneAp"/.test(fs.readFileSync(path.join(SYSTEM_ROOT, "module", "difficulty-tradeoffs.mjs"), "utf8")));
equal("B Wolf Stance: Pack Attack declared the way the system reads it from an effect", specs["Wolf Stance"].flags.creatureAbility, { derives: { packAttack: true } });
ok("B …which the system reads off an applied effect (3.670.0)", /Array\.from\(effects \?\? \[\]\)\.some\(\(e\) => !e\?\.disabled && e\?\.flags\?\.\[SYSTEM_ID\]\?\.creatureAbility\?\.derives\?\.packAttack === true\)/.test(fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "pack-attack.mjs"), "utf8")));
equal("B Snake and Drunken Stance declare nothing beyond their effect (their Uses act)", [specs["Snake Stance"].flags, specs["Drunken Stance"].flags], [{}, {}]);
// Elemental Fist
equal("B Elemental Fist: Inner Strike's types gain the four elements only when it is held", [auto3.innerStrikeTypes([]).map(([k]) => k), auto3.innerStrikeTypes([{ type: "feat", name: "Elemental Fist" }]).map(([k]) => k)],
  [["force", "aligned", "negative", "positive"], ["force", "aligned", "negative", "positive", "electricity", "bludgeoning", "fire", "cold"]]);
for (const [type, trait] of [["electricity", "Air"], ["bludgeoning", "Earth"], ["fire", "Fire"], ["cold", "Water"]]) {
  const f = auto3.innerStrikeFlags(type, 8);
  const rider = riders.normaliseStrikeRider(f.strikeRider);
  equal(`B Elemental Fist (${type}): the rider is ${type}, and every attack has the ${trait} trait while it lasts`, [rider?.damageType, rider?.dice, so.traitsWithGroupGrants("Finesse", [{ flags: { "trg-prime": f } }], { group: "sword" }), so.traitsWithGroupGrants("", [{ flags: { "trg-prime": f } }], { unarmed: true })], [type, "2d6", `Finesse, ${trait}`, trait]);
}
equal("B …and Inner Strike's own four give no trait", ["force", "aligned", "negative", "positive"].map((t) => so.traitsWithGroupGrants("Agile", [{ flags: { "trg-prime": auto3.innerStrikeFlags(t) } }], { unarmed: true })), ["Agile", "Agile", "Agile", "Agile"]);
// Stunning Fist
{
  const spec = pe.perilEffectSpec({ save: auto6.STUNNING_FIST_LADDER.save, scope: "targets", dc: 21, outcomes: { ...auto6.STUNNING_FIST_LADDER.outcomes }, conditions: { ...auto6.STUNNING_FIST_LADDER.conditions } });
  const tagsAt = (d) => pe.perilEffectOutcome(spec, d).tags.map((t) => `${t.key} ${t.value}`);
  equal("B Stunning Fist through the system's ladder: unaffected on a Success or better; stunned 1 on a Partial or Failure; stunned 3 on a Fumble or Blunder (B6-6)",
    ["heroic", "critical", "success", "partial", "failure", "fumble", "blunder"].map(tagsAt), [[], [], [], ["stunned 1"], ["stunned 1"], ["stunned 3"], ["stunned 3"]]);
  equal("B …a Fortitude save against the Technique DC given", [spec.save, spec.dc, spec.scope], ["fortitude", 21, "targets"]);
}
equal("B the Technique DC: 10 + the Path's ability + level (B6-6)", [auto3.techniqueSaveDC(4, 7), auto3.techniqueSaveDC(2, 12)], [21, 24]);
// Inner Magic
equal("B Inner Magic opens the Mystic's feats (B6-7), read from the feat as the system reads it", feats.declaredClassFeatAccess([byName["Inner Magic"], { type: "feat", name: "Other" }]), ["Mystic"]);
equal("B …and only Inner Magic declares it", B6.BLOCK6_FEATS.filter((d) => F(d).classFeatAccess).map((d) => d.name), ["Inner Magic"]);
// The Mystic's Metamagic
equal("B the Path stamp marks a Mystic's spell for its Metamagic feats when asked, and not otherwise",
  [auto3.pathStamp({ name: "Devoted", tradition: "divinity", ability: "wisdom" }, 1, { metamagic: true })["flags.trg-prime.innateMetamagic"], auto3.pathStamp({ name: "Devoted", tradition: "divinity", ability: "wisdom" }, 1)["flags.trg-prime.innateMetamagic"]], [true, undefined]);
equal("B …and the system takes the Metamagic box from the free budget only for a marked spell", [warp.innateWarpFits({ ppSpent: 3, rawPP: 2 }, 2, { countRaw: true }).ok, warp.innateWarpFits({ ppSpent: 3, rawPP: 2 }, 2).spent], [false, 1]);
// Prerequisites
equal("B the prerequisites the system can read: Perfect Shot's Dex +1, Wis +1, BAB +8; Inner Magic's Level 4",
  ["Dex +1", "Wis +1", "BAB +8", "Level 4"].map((c) => prereq.parsePrerequisiteClause(c)), [{ type: "ability", key: "dexterity", min: 1 }, { type: "ability", key: "wisdom", min: 1 }, { type: "bab", min: 8 }, { type: "level", min: 4 }]);
equal("B …and a Path clause it leaves to the stance's Use (it is no feat)", prereq.parsePrerequisiteClause("Devoted or Primal Monastic Path"), null);

/* ------------------------------------------------------------------ *
 * C. The pure decisions
 * ------------------------------------------------------------------ */

const path_ = (name) => ({ name, tradition: "x", ability: "wisdom" });
equal("C the Paths the stances ask for: Crane Devoted or Primal; Dragon Primal or Transcendent; Drunken Devoted or Primal; Snake Devoted or Illuminator; the rest none",
  ["Crane Stance", "Dragon Stance", "Drunken Stance", "Snake Stance", "Mantis Stance", "Tiger Stance"].map((s) => ["Devoted", "Primal", "Transcendent", "Illuminator"].filter((p) => !auto6.stancePathRefusal(s, path_(p)))),
  [["Devoted", "Primal"], ["Primal", "Transcendent"], ["Devoted", "Primal"], ["Devoted", "Illuminator"], ["Devoted", "Primal", "Transcendent", "Illuminator"], ["Devoted", "Primal", "Transcendent", "Illuminator"]]);
equal("C …with no Path, refused and told to choose one; a stance that asks none is entered anyway", [auto6.stancePathRefusal("Crane Stance", null), auto6.stancePathRefusal("Wolf Stance", null)], ["Crane Stance needs the Devoted or Primal Monastic Path (choose yours first).", ""]);
{
  const hit = (dmg) => ({ attackOutcome: { hits: true }, damageTaken: dmg });
  const miss = { attackOutcome: { hits: false }, damageTaken: 0 };
  equal("C Stunning Fist: both Strikes made and either hit and dealt damage; not a hit that dealt none; not a Flurry cut short; not Disciplined Flurry's third alone (found in review)",
    [auto6.stunningFistApplies([hit(4), miss]), auto6.stunningFistApplies([miss, hit(1)]), auto6.stunningFistApplies([hit(0), hit(0)]), auto6.stunningFistApplies([miss, miss]), auto6.stunningFistApplies([hit(5), null]), auto6.stunningFistApplies([hit(5)]), auto6.stunningFistApplies([miss, miss, hit(3)])],
    [true, true, false, false, false, false, false]);
}
equal("C the weapons: Perfect Shot's ranged — the system's missile and thrown modes, not a melee weapon (found in review: a javelin was refused)",
  [auto6.isRangedWeapon({ type: "weapon", system: { attackMode: "thrown" } }), auto6.isRangedWeapon({ type: "weapon", system: { attackMode: "missile" } }), auto6.isRangedWeapon({ type: "weapon", system: { attackMode: "melee", traits: "Thrown" } })],
  [true, true, false]);
{
  const { SHARED } = await import("../module/block4-automations.mjs");
  const w = (name, attackMode) => ({ type: "weapon", name, system: { equipped: true, attackMode } });
  equal("C …and the melee Strikes (Perfect Strike, Drunken Strike, Snake Stance) never take a thrown-mode or missile weapon; a sword they do (Snake Stance: \"a melee strike\", found in review)",
    SHARED.meleeWeapons({ items: [w("Sword", "melee"), w("Javelin", "thrown"), w("Bow", "missile"), w("Dagger", "")] }).map((x) => x.name), ["Sword", "Dagger"]);
}
equal("C a miss is the system's (resolved, not a hit); a non-hit on an older system",
  [auto1.missedHere({ hits: false, missed: true }), auto1.missedHere({ hits: false, missed: false }), auto1.missedHere({ hits: false }), auto1.missedHere({ hits: true })], [true, false, true, false]);
equal("C a one-pick feat's spell, found by the feat that granted it", [auto6.grantedSpellOf([{ type: "spell", name: "Daze", flags: { "trg-prime": { grantedBy: { sourceId: "F1" } } } }], "F1")?.name, auto6.grantedSpellOf([{ type: "spell", name: "Daze", flags: { "trg-prime": { grantedBy: { sourceId: "F2" } } } }], "F1")], ["Daze", null]);
{
  const spell = (id, extra = {}) => ({ id, type: "spell", system: { innate: true, ppCost: 2, traits: "Evocation", ...(extra.system ?? {}) }, flags: { "trg-inner-tempest": { pathStamped: "Devoted" }, "trg-prime": {}, ...(extra.flags ?? {}) } });
  const mystic = { type: "class", name: "Mystic" };
  const items = [mystic, spell("a"), spell("b", { system: { ppCost: 0, traits: "Cantrip" } }), spell("c", { flags: { "trg-prime": { innateMetamagic: true } } }), { ...spell("d"), flags: { "trg-prime": {} } }, spell("e", { system: { innate: false } })];
  equal("C the Mystic's Path-stamped innate spells take the mark (not a cantrip, not one marked, not one the Path did not stamp, not a learned one); a Disciple's none",
    [auto6.innateMetamagicUpdates(items), auto6.innateMetamagicUpdates(items.slice(1)), auto3.isMystic([mystic]), auto3.isMystic([{ type: "class", name: "Disciple" }])],
    [[{ _id: "a", "flags.trg-prime.innateMetamagic": true }], [], true, false]);
}
equal("C the stance in hand: up by name, while enabled", [auto6.stanceUp([{ name: "Drunken Stance", flags: { "trg-prime": { featStance: true } } }], "Drunken Stance"), auto6.stanceUp([{ name: "Drunken Stance", disabled: true, flags: { "trg-prime": { featStance: true } } }], "Drunken Stance"), auto6.stanceUp([{ name: "Drunken Stance", flags: {} }], "Drunken Stance")], [true, false, false]);

/* ------------------------------------------------------------------ *
 * D. Registration
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
const called = (n) => calls.filter((c) => c[0] === n);
for (const doc of [...B6.BLOCK6_FEATS, ...B6.BLOCK6_ABILITIES]) {
  const k = doc.name.toLowerCase();
  const entry = auto6.BLOCK6_AUTOMATIONS[k];
  ok(`D ${doc.name}: its Use is registered`, Boolean(entry) && called("registerFeatAutomation").some((c) => c[1] === k && c[2] === entry));
}
ok("D every Use the content names is one registered", [...B6.BLOCK6_FEATS, ...B6.BLOCK6_ABILITIES].filter((d) => F(d).itAutomation).every((d) => Boolean(auto6.BLOCK6_AUTOMATIONS[d.name.toLowerCase()])));
ok("D no Block 6 automation shadows an earlier one", Object.keys(auto6.BLOCK6_AUTOMATIONS).every((k) => called("registerFeatAutomation").filter((c) => c[1] === k).length === 1));
ok("D the stances, Inner Magic, Mystic Essence and the Strikes act; Elemental Fist and Stunning Fist say where they are read",
  auto6.BLOCK6_STANCES.every((s) => /^Stance \(1 AP\)/.test(auto6.BLOCK6_AUTOMATIONS[s.toLowerCase()].hint))
  && /^Read by Inner Strike/.test(auto6.BLOCK6_AUTOMATIONS["elemental fist"].hint) && /^Read by Flurry of Blows/.test(auto6.BLOCK6_AUTOMATIONS["stunning fist"].hint));
{
  equal("D FC-55 registered through registerFeatAccess, class by class", called("registerFeatAccess").filter((c) => c[1] === "class").map((c) => [c[2], c[3].length]), [["Disciple", 7], ["Ghostwalker", 8], ["Kensai", 6], ["Mystic", 5], ["Oathblade", 7]]);
  api.resetModuleRegistry();
  for (const [cls, list] of Object.entries(reg.EXISTING_CLASS_FEATS)) api.registerFeatAccess("class", cls, [...list], "trg-inner-tempest");
  const can = (cls, feat) => api.hasRegisteredFeatAccess("class", cls, feat);
  equal("D the system's own test: Stance Mastery for a Disciple and a Mystic, not a Kensai; Duelling Riposte for a Kensai only; Resolve for an Oathblade",
    [can("Disciple", "Stance Mastery"), can("Mystic", "Stance Mastery"), can("Kensai", "Stance Mastery"), can("Kensai", "Duelling Riposte"), can("Disciple", "Duelling Riposte"), can("Oathblade", "Resolve"), can("Ghostwalker", "Surprise Attack")],
    [true, true, false, true, false, true, true]);
  ok("D …with no problem reported", api.registrationProblems().length === 0, JSON.stringify(api.registrationProblems()));
  // INNER MAGIC OPENS THE MYSTIC TRAIT, NOT THE MYSTIC'S LIST (B6-7; found
  // in review: a Disciple with it was offered the Mystic's core feats).
  api.registerClass("Mystic", reg.CLASS_REGISTRATIONS.Mystic, "trg-inner-tempest");
  const pickers = await import(sys("module", "picker-filters.mjs"));
  const featsMod = await import(sys("module", "feats.mjs"));
  const disciple = { class: "Disciple", traitClasses: featsMod.declaredClassFeatAccess([byName["Inner Magic"]]).join(", "), ownClass: "Disciple", tier: "Martial" };
  const offered = (ctx, entry) => pickers.buildPickerFilter("classFeat", ctx)(entry);
  const essence = { name: "Mystic Essence", system: byName["Mystic Essence"].system };
  const combatReflexes = { name: "Combat Reflexes", system: { category: "Class", traits: "Martial", sourceClass: "" } };
  const injuryRelief = { name: "Injury Relief", system: { category: "Class", traits: "Bard, Focus", sourceClass: "" } };
  equal("D Inner Magic: a Disciple is offered Mystic Essence, not Injury Relief (the Mystic's list); a Mystic both; a Disciple without it neither",
    [offered(disciple, essence), offered(disciple, injuryRelief), offered({ class: "Mystic", ownClass: "Mystic", tier: "Adept" }, essence), offered({ class: "Mystic", ownClass: "Mystic", tier: "Adept" }, injuryRelief), offered({ ...disciple, traitClasses: "" }, essence)],
    [true, false, true, true, false]);
  ok("D …and Combat Reflexes reaches the Disciple by its own tier, not through Inner Magic", offered(disciple, combatReflexes) === offered({ ...disciple, traitClasses: "" }, combatReflexes));
  api.resetModuleRegistry();
}
{
  const { ClassicLevel } = await import("classic-level");
  const dir = path.join(SYSTEM_ROOT, "packs", "feats");
  const coreFeats = [];
  if (fs.existsSync(dir)) {
    const db = new ClassicLevel(dir, { valueEncoding: "json" });
    try { for await (const [k, v] of db.iterator()) if (k.split("!")[1] && !k.split("!")[1].includes(".")) coreFeats.push(v); } finally { await db.close(); }
  }
  ok("D the system's feats were read", coreFeats.length > 0);
  const coreNames = new Map(coreFeats.map((f) => [String(f.name).toLowerCase(), f]));
  const names = [...new Set(Object.values(reg.EXISTING_CLASS_FEATS).flat())];
  equal("D every opened feat is a core class feat", names.filter((n) => coreNames.get(n.toLowerCase())?.system?.category !== "Class"), []);
  const metamagic = coreFeats.filter((f) => /\bMetamagic\b/.test(String(f.system?.traits ?? "")) && f.system?.category === "Class");
  equal("D the Metamagic feats a Mystic may use are Adept feats, open to it already (the Bard's and Cleric's are their classes')",
    metamagic.filter((f) => !/\bAdept\b/.test(f.system.traits)).map((f) => f.name).sort(), ["Conductive Healing", "Echoing Performance", "Lingering Performance"]);
  equal("D no Block 6 feat shares a name with a core feat", B6.BLOCK6_FEATS.filter((d) => coreNames.has(d.name.toLowerCase())).map((d) => d.name), []);
}

/* ------------------------------------------------------------------ *
 * E. Wiring
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
for (const [hook, fn] of [["trgPrimeStrikeResolved", "onStrikeResolvedB6"], ["createItem", "onItemCreatedB6"]]) {
  ok(`E ${hook} reaches ${fn}`, new RegExp(`Hooks\\.on\\("${hook}", \\([^)]*\\) => \\{ ${fn}\\(`).test(script));
}
ok("E a Mystic's spells made before 0.7.0 are brought into step by the acting GM at start-up", /\(async \(\) => \{ for \(const actor of game\.actors \?\? \[\]\) await reconcileB6Actor\(actor\); \}\)\(\)/.test(script));
const src6 = fs.readFileSync(path.join(ROOT, "module", "block6-automations.mjs"), "utf8");
const src3 = fs.readFileSync(path.join(ROOT, "module", "block3-automations.mjs"), "utf8");
const srcA = fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8");
const apiSrc = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "module-api-workflow.mjs"), "utf8");
const mh = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "feats-workflow.mjs"), "utf8");
const used = [...new Set([...src6.matchAll(/\bh\(\)\.([a-zA-Z]+)/g)].map((m) => m[1]))];
const missingHelpers = used.filter((n) => !new RegExp(`\\b${n}\\b\\s*[:(,]`).test(apiSrc) && !new RegExp(`MODULE_HELPERS = Object\\.freeze\\(\\{[\\s\\S]*?\\b${n}\\b`).test(mh));
equal("E every helper the automations call is one the system hands over", missingHelpers, []);
ok("E each stance is entered through the system's stance rules, its declarations on its effect, its Path checked first",
  /const refusal = stancePathRefusal\(stance, pathOf\(Array\.from\(actor\.items \?\? \[\]\)\)\);\n\s*if \(refusal\) \{ ui\.notifications\.warn\(refusal\); return false; \}/.test(src6)
  && /return h\(\)\.enterStance\(actor, item, \{\n\s*name: stance,\n\s*apCost: 1,\n\s*description: fresh\.description,\n\s*changes: fresh\.changes,\n\s*flags: fresh\.flags,/.test(src6));
ok("E Drunken Strike: in the stance, a Strike at −2 circumstance, and on damage its own dice and modifiers stand as the Feint (B6-3)",
  /if \(!stanceUp\(actor\.effects, "Drunken Stance"\)\)/.test(src6)
  && /extraModifiers: \[\{ label: "Drunken Strike", value: -2, type: "circumstance" \}\]/.test(src6)
  && /if \(!\(Number\(check\.damageTaken\) > 0\)\) \{/.test(src6)
  && /\{ presetDice: check\.dice, presetModifiers: check\.modifiers \?\? \[\], event: \{ shiftKey: true \} \}/.test(src6)
  && /const feint = h\(\)\.skillActions\.find\(\(a\) => a\.key === "feint"\);/.test(src6));
ok("E Perfect Shot and Strike: 2 AP, a Strike counted twice, with a one-shot advantage taken away after it",
  /check = await h\(\)\.rollWeaponAttack\(actor, weapon, \{ apPaid: true, skipTargetPrompt: true, mapSteps: 2, optionLabel: name \}\);/.test(src6)
  && /kind: "advantage", label: name, scope: `This \$\{name\}`, auto: true, oneShot: true, when: \{ checkTypes: \["attack"\] \}/.test(src6)
  && /\} finally \{\n\s*const left = ownEffects\(actor, "b6:perfect"\)\.map\(\(e\) => e\.id\);\n\s*if \(left\.length\) await safeDelete\(actor, left\);/.test(src6)
  && /if \(!check\) return false;\n\s*await spendAP\(actor, name, 2\);/.test(src6));
ok("E the Strikes are Attack and Flourish, through the system's trait rules", (src6.match(/traits: "Attack, Flourish" \};/g) ?? []).length === 2 && (src6.match(/await h\(\)\.recordTraitUsage\(actor, action\);/g) ?? []).length === 2 && (src6.match(/if \(!\(await h\(\)\.traitGate\(actor, action, /g) ?? []).length === 2);
ok("E Snake Stance: offered on a melee miss against the stance-holder, asked only when an Attack reaction could be spent (B6-9), and struck with no penalty",
  /if \(!attacker \|\| !target \|\| !missedHere\(ctx\) \|\| held \|\| !melee\) return;/.test(src6)
  && /let weapons = meleeWeapons\(actor\);/.test(src6)
  && /if \(!\(await reactionOpen\(target, "Snake Stance", \{ traits: SNAKE_REACTION_TRAITS \}\)\)\) return;/.test(src6)
  && /if \(!\(await spendReaction\(actor, "Snake Stance", \{ traits: SNAKE_REACTION_TRAITS \}\)\)\) return;/.test(src6)
  && /rollWeaponAttack\(actor, weapon, \{ apPaid: true, isReaction: true, skipTargetPrompt: true, optionLabel: "Snake Stance" \}\)/.test(src6)
  && auto6.SNAKE_REACTION_TRAITS === "Attack, Stance"
  && /registerSharedOps\(\{ offers: \{ b6SnakeStrike: snakeStrikeOffer \} \}\)/.test(src6) && /offerTo\(target, "b6SnakeStrike"/.test(src6));
{
  const saved = globalThis.game;
  const asked = [];
  const actor = { items: [{ name: "Snake Stance", system: { traits: "Disciple, Mystic, Stance" } }], system: { resources: { reactions: { value: 1 } } } };
  try {
    globalThis.game = { combat: { started: true }, trgPrime: { modules: { helpers: { reactionRefusal: async (_a, traits) => { asked.push(traits); return /Attack|Martial/.test(traits) ? "" : "Only your Battle Readiness reaction remains"; }, spendReaction: async (_a, _l, { traits }) => { asked.push(`spend ${traits}`); return /Attack/.test(traits); } } } } };
    const own = await auto1.reactionOpen(actor, "Snake Stance");
    const asAttack = await auto1.reactionOpen(actor, "Snake Stance", { traits: auto6.SNAKE_REACTION_TRAITS });
    const spent = await auto1.spendReaction(actor, "Snake Stance", { traits: auto6.SNAKE_REACTION_TRAITS });
    equal("E the reaction read with the traits given: the stance's own would be refused Battle Readiness's, the Attack reaction is not (B6-9)",
      [own, asAttack, spent, asked], [false, true, true, ["Disciple, Mystic, Stance", "Attack, Stance", "spend Attack, Stance"]]);
  } finally { globalThis.game = saved; }
}
ok("E Stunning Fist: the Flurry calls it when held, after its Strikes; the save goes through the system's ladder at the Technique DC",
  /if \(ownedNamed\(actor, "Stunning Fist"\)\) \{\n\s*const \{ stunningFist \} = await import\("\.\/block6-automations\.mjs"\);\n\s*await stunningFist\(actor, checks\);/.test(src3)
  && src3.indexOf("await stunningFist(actor, checks);") > src3.indexOf("const { checks } = await h().runStrikeSeries(actor, strikes, { label: \"Flurry of Blows\", apPaid: true });")
  && /const dc = techniqueSaveDC\(actor\.system\?\.attributes\?\.\[ability\]\?\.total, actor\.system\?\.identity\?\.level\);/.test(src6)
  && /save: STUNNING_FIST_LADDER\.save, scope: "targets", dc,/.test(src6));
ok("E Elemental Fist: Inner Strike's chooser and card offer its types, and a press re-types the rider and the trait together",
  /const types = innerStrikeTypes\(Array\.from\(actor\.items \?\? \[\]\)\);\n\s*const type = await h\(\)\.chooseFromList\("Inner Strike", "Secondary damage type", types\);/.test(src3)
  && /if \(!innerStrikeTypes\(Array\.from\(actor\.items \?\? \[\]\)\)\.some\(\(\[key\]\) => key === type\)\) return false;/.test(src3)
  && /\[`flags\.\$\{SYSTEM_ID\}\.weaponTraitGrants`\]: innerStrikeFlags\(type\)\.weaponTraitGrants/.test(src3));
ok("E the Mystic's spells are marked for its Metamagic feats: Mystical Power's (not a cantrip), a discipline's, a Path arriving late, Mystic Essence's",
  /pathStamp\(path, slot === "pp2" \? 1 : 0, \{ metamagic: slot !== "cantrip" \}\)/.test(src3)
  && /const metamagic = isMystic\(Array\.from\(actor\.items \?\? \[\]\)\) && !isCantripSpell\(data\?\.system \?\? document\?\.system\);\n\s*const stamp = pathStamp\(pathOf\(Array\.from\(actor\.items \?\? \[\]\)\), magic\.allowance, \{ metamagic \}\);/.test(src3)
  && /pathStamp\(path, s\.getFlag\(SYSTEM_ID, "innatePPAllowance"\), \{ metamagic: mystic && !isCantripSpell\(s\.system\) \}\)/.test(src3)
  && /pathStamp\(path, 0, \{ metamagic: slot !== "cantrip" && isMystic\(items\) \}\)/.test(src6));
equal("E a cantrip, read as the system's choosers read it (found in review: a discipline's cantrip was marked)",
  [auto3.isCantripSpell({ ppCost: 0, traits: "Cantrip" }), auto3.isCantripSpell({ ppCost: 0, traits: "" }), auto3.isCantripSpell({ ppCost: 1, traits: "Cantrip" })], [true, false, false]);
ok("E the system reads the mark: an innate spell flagged innateMetamagic is offered the caster's Metamagic feats (3.670.0)",
  /const innateMetamagic = isInnate && !isItemCast && !isCantrip && !innateCantripOf\(spellData\) && spell\.getFlag\?\.\(SYSTEM_ID, "innateMetamagic"\) === true;/.test(fs.readFileSync(path.join(SYSTEM_ROOT, "module", "magic", "cast-workflow.mjs"), "utf8")));
ok("E Inner Magic and Mystic Essence grant one spell each, through Block 3's index and fit, refusing a second", /async use\(actor, item\) \{ return grantPathSpell\(actor, item, \{ title: "Inner Magic", slot: "cantrip" \}\); \}/.test(src6)
  && /async use\(actor, item\) \{ return grantPathSpell\(actor, item, \{ title: "Mystic Essence", slot: "eligible" \}\); \}/.test(src6)
  && /const had = grantedSpellOf\(items, item\.id\);\n\s*if \(had\) \{/.test(src6)
  && /\(await spellIndex\(\)\)\.filter\(\(e\) => !known\.has\(norm\(e\.name\)\) && mysticalPowerFits\(e\.system, slot, \{ tradition: path\.tradition, level \}\)\)/.test(src6));
ok("E reactionOpen and spendReaction take the reaction's own traits", /export async function reactionOpen\(actor, label, \{ traits \} = \{\}\) \{/.test(srcA) && /export async function spendReaction\(actor, label, \{ traits \} = \{\}\) \{/.test(srcA)
  && (srcA.match(/const feat = typeof traits === "string" \? \{ system: \{ traits \} \} : Array\.from\(actor(\?)?\.items \?\? \[\]\)\.find\(\(i\) => i\.name === label\);/g) ?? []).length === 2);
const [sa, sb] = String(systemJson.version).split(".").map(Number);
ok("E the system at TRG_PRIME_ROOT is 3.670.0 or later", sa > 3 || (sa === 3 && sb >= 670), systemJson.version);
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("E the module is 0.7.1, built for 3.670.1", [manifest.version, manifest.relationships.systems[0].compatibility.minimum], ["0.7.1", "3.670.1"]);
ok("E the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.670.1";'));
for (const [name, docs] of [["it-feats", B6.BLOCK6_FEATS], ["it-abilities", B6.BLOCK6_ABILITIES]]) {
  const dir = path.join(ROOT, "packs-source", name);
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
  ok(`E packs-source/${name} carries every Block 6 ${name.slice(3)}`, docs.every((d) => files.some((f) => f._id === d._id && f.name === d.name)));
}
const allIds = PACKS.flatMap((p) => p.docs.map((d) => d._id));
ok("E every id across the module is unique", new Set(allIds).size === allIds.length);

/* ------------------------------------------------------------------ */
/* F  0.7.1: what the live test of 0.7.0 found                          */
/* ------------------------------------------------------------------ */

ok("F1 Disciplined Flurry's question reads \"spends your reaction and this technique's use\" (found live: \"reactionand\")",
  src3.includes(`\${inCombat ? " (spends your reaction and this technique's use)" : " (spends this technique's use)"}?</p>`) && !/reaction" : " \("\}and/.test(src3));
ok("F2 Drunken Strike's Feint needs no Deception training: TRG Prime 3.670.1 asks none when another check's result stands as the Feint (found live)",
  /const presetResult = Boolean\(presetDice\) && Array\.isArray\(presetModifiers\);\n\s*const exempt = presetResult \|\|/.test(fs.readFileSync(path.join(SYSTEM_ROOT, "module", "combat", "action-workflow.mjs"), "utf8"))
  && /\{ presetDice: check\.dice, presetModifiers: check\.modifiers \?\? \[\], event: \{ shiftKey: true \} \}/.test(src6));

/* ------------------------------------------------------------------ */

const EXPECTED = 183;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block6: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-block6: ${checks} checks — all green.`);
