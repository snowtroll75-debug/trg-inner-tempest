#!/usr/bin/env node
/**
 * verify-block8 — Inner Tempest Block 8 (0.9.0): the Grimoire's other
 * thirteen spells (Chapter 8), Disrupt Soul's magical Focus abilities, and
 * Burst of Speed, Timeless Motion and Water Bolt finished (B8-9), checked
 * against the book, against the system that reads them, and by driving the
 * decisions.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block8.mjs
 *
 * Needs TRG Prime 3.672.0 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-block8.json, cut from the v1.2 docx
 *      by tools/content/extract-book-block8.mjs): every paragraph, the trait
 *      line, the labelled lines, the PP, category, traits and tradition
 *   B  The system reads the rows: every kind handled, every duration read,
 *      the declarations, the riders and their ladder, the marks and the save
 *      that waits, Root's rows and its cap, Ability Inversion's rungs, Water
 *      Bolt's push, the warps
 *   C  The decisions: Spiritual Distraction's and Disrupt Soul's ladders, the
 *      magical Focus abilities (and the sentence that makes each magical),
 *      Arrows Flight's projectiles, Burst of Speed's second round
 *   D  Registration and the Foundry half, driven with stand-ins: the gate,
 *      Disrupt Soul's answer, Burst of Speed's −10
 *   E  Wiring: the hooks, versions, packs, status lines
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

const B8 = await import("./content/block8.mjs");
const B3 = await import("./content/block3.mjs");
const B4 = await import("./content/block4.mjs");
const B5 = await import("./content/block5.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const auto8 = await import("../module/block8-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block8.json"), "utf8"));
const book3 = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block3.json"), "utf8"));
const book4 = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block4.json"), "utf8"));

const kinds = await import(sys("module", "magic", "effect-kinds.mjs"));
const duration = await import(sys("module", "magic", "effect-duration.mjs"));
const declared = await import(sys("module", "magic", "declared-effect.mjs"));
const riders = await import(sys("module", "magic", "strike-riders.mjs"));
const marks = await import(sys("module", "magic", "module-mark.mjs"));
const sanctuary = await import(sys("module", "magic", "sanctuary.mjs"));
const defenceDC = await import(sys("module", "combat", "defence-dc.mjs"));
const effects = await import(sys("module", "magic", "spell-effects.mjs"));
const degrees = await import(sys("module", "magic", "spell-degrees.mjs"));
const attackRows = await import(sys("module", "magic", "attack-degree-rows.mjs"));
const warp = await import(sys("module", "magic", "spell-warp.mjs"));
const swap = await import(sys("module", "magic", "ability-swap.mjs"));
const narration = await import(sys("module", "magic", "spell-narration.mjs"));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));

const strip = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const byName = Object.fromEntries(B8.BLOCK8_SPELLS.map((d) => [d.name, d]));
const rows = (name, kind) => byName[name].system.effects.filter((e) => !kind || e.kind === kind);
const F = (doc) => doc.flags?.["trg-prime"] ?? {};

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

equal("A the thirteen the audit names, in the book's order", B8.BLOCK8_SPELL_NAMES, Object.keys(book.spells));
for (const doc of B8.BLOCK8_SPELLS) {
  const entry = book.spells[doc.name];
  const text = strip(doc.system.description);
  equal(`A ${doc.name}: every paragraph the book prints is in its description`, entry.lines.map((l) => strip(md(l))).filter((l) => !text.includes(l)), []);
  ok(`A ${doc.name}: the trait line and every labelled line as printed`, text.startsWith(entry.traits) && Object.entries(entry.fields).every(([k, v]) => text.includes(`${k} ${v}`)));
  const words = entry.traits.split(" ");
  const category = words.find((w) => ["SAVE", "UTILITY", "ATTACK"].includes(w));
  equal(`A ${doc.name}: PP, category and traits from the book`, [doc.system.ppCost, doc.system.category, doc.system.traits],
    [entry.pp, category.toLowerCase(), words.filter((w) => w !== category).map((w) => w[0] + w.slice(1).toLowerCase()).join(", ")]);
  equal(`A ${doc.name}: tradition from the book ("all" is the four)`, doc.system.tradition, entry.fields.Tradition === "all" ? "arcane, divinity, ethereal, verdant" : entry.fields.Tradition);
  ok(`A ${doc.name}: says what TRG Prime does`, /<em>(Automated|Partly automated|Not automated):<\/em>/.test(doc.system.description));
}
equal("A the save each Save spell prints is its defence; a spell that prints none has none",
  B8.BLOCK8_SPELLS.map((d) => [d.name, d.system.defence]).filter(([, v]) => v),
  Object.entries(book.spells).filter(([, s]) => s.fields["Saving Throw"]).map(([n, s]) => [n, s.fields["Saving Throw"]]));

/* ------------------------------------------------------------------ *
 * B. The system reads the rows
 * ------------------------------------------------------------------ */

const all = [...B8.BLOCK8_SPELLS, ...B3.BLOCK3_SPELLS, ...B5.BLOCK5_SPELLS];
equal("B every row is a kind TRG Prime 3.672.0 handles", all.flatMap((d) => d.system.effects.map((e) => e.kind)).filter((k) => !kinds.HANDLED_EFFECT_KINDS.includes(k)), []);
equal("B every row that names its own length is read", all.flatMap((d) => d.system.effects.filter((e) => e.duration).map((e) => [d.name, e.duration])).filter(([, t]) => !duration.parseSpellDuration(t)), []);
equal("B every declared row is one the system accepts",
  all.flatMap((d) => d.system.effects.filter((e) => e.kind === "declare").map((e) => [d.name, Boolean(declared.normaliseDeclaredEffect(e, { spellName: d.name }))])).filter(([, okay]) => !okay), []);
equal("B Boundless Vision, Flowing Step, Foretell Failure, Tranquil Mastery, Timeless Motion declare what their rails read",
  [declared.normaliseDeclaredEffect(rows("Boundless Vision", "declare")[0]).flags, Object.keys(declared.normaliseDeclaredEffect(rows("Flowing Step", "declare")[0]).flags).sort(),
    declared.normaliseDeclaredEffect(rows("Foretell Failure", "declare")[0]).flags, declared.normaliseDeclaredEffect(rows("Tranquil Mastery", "declare")[0]).flags,
    declared.normaliseDeclaredEffect(B3.BLOCK3_SPELLS.find((s) => s.name === "Timeless Motion").system.effects.find((e) => e.kind === "declare")).flags],
  [{ creatureAbility: { derives: { cannotBeFlanked: true } } }, ["conditionals", "ignoresDifficultTerrain"], { foretell: true }, { refocusExtra: true }, { firstMoveNoReactions: true }]);
equal("B Root's balance tick is offered on Acrobatics only (interpretation 3, review)", rows("Root", "declare")[0].flags.conditionals[0].when, { checkTypes: ["skill"], subjects: ["acrobatics"] });
equal("B Flowing Step lasts until the end of your turn; its advantage is on Reflex saves",
  [duration.parseSpellDuration(rows("Flowing Step", "declare")[0].duration)?.rounds, rows("Flowing Step", "declare")[0].flags.conditionals[0].when], [1, { checkTypes: ["save"], subjects: ["reflex"] }]);
{
  const [acid, save] = rows("Acidic Touch", "strikeRider").map((r) => riders.normaliseStrikeRider(r));
  equal("B Acidic Touch: 1d6 acid on every unarmed Strike; a Fortitude save on every melee hit (B8-2)",
    [acid?.dice, acid?.damageType, acid?.scope, acid?.once, save?.scope, save?.once, save?.condition, save?.conditionSave?.save], ["1d6", "acid", "unarmed", false, "melee", false, "sickened", "fortitude"]);
  equal("B …its ladder: unaffected to a Partial, Sickened 1 on a Failure, 2 on a Fumble or Blunder; until removed",
    [["heroic", "critical", "success", "partial", "failure", "fumble", "blunder"].map((k) => riders.riderLadderValue(save, k)), save?.conditionRounds], [[0, 0, 0, 0, 1, 2, 2], null]);
  ok("B …at your spell save DC: the row names none, so the cast stamps it", !save.conditionSave.dc);
}
equal("B the marks are the module's, and a mark rolls no save on casting",
  ["Disrupt Soul", "Spiritual Distraction", "Age Resistance"].map((n) => marks.normaliseModuleMark(rows(n, "moduleMark")[0])),
  [{ module: "trg-inner-tempest", key: "disruptSoul", label: "Disrupt Soul" }, { module: "trg-inner-tempest", key: "spiritualDistraction", label: "Spiritual Distraction" }, { module: "trg-inner-tempest", key: "ageResistance", label: "Age Resistance" }]);
equal("B the saves that wait are not rolled when cast (Acidic Touch, Disrupt Soul, Spiritual Distraction); Ability Inversion's is",
  ["Acidic Touch", "Disrupt Soul", "Spiritual Distraction", "Ability Inversion"].map((n) => sanctuary.spellDefersItsSave(byName[n].system.effects)), [true, true, true, false]);
{
  const inv = rows("Ability Inversion", "abilitySwap");
  const reached = (deg) => inv.map((r, i) => (degrees.effectAppliesOnDegree(r, degrees.effectiveSaveDegree(inv, deg)) ? i : -1)).filter((i) => i >= 0);
  equal("B Ability Inversion: Success and Partial to the end of its next turn, Failure 1 minute, Fumble and Blunder 1 hour; Critical and Heroic unaffected (B8-1, IT-m24)",
    [["heroic", "critical", "success", "partial", "failure", "fumble", "blunder"].map(reached), inv.map((r) => duration.parseSpellDuration(r.duration)?.seconds)],
    [[[], [], [0], [0], [1], [2], [2]], [12, 60, 3600]]);
  equal("B …the totals trade (the system's own reading)", swap.abilitySwapChanges("strength", "dexterity", 5, -2, "custom").map((c) => c.value), ["-7", "7"]);
}
{
  const [fort] = rows("Root", "defenceDC").map((r) => defenceDC.defenceDCRowFrom(r, "Root"));
  equal("B Root: +2 circumstance to the Fortitude DC against Shove, Trip and Reposition (interpretation 3)",
    [fort.error, fort.row?.dc, fort.row?.value, fort.row?.when?.actions],
    [null, "fortitudeDC", 2, ["shoveAttack", "tripAttack", "reposition"]]);
  // DRIVEN THROUGH THE SYSTEM'S OWN READING (0.9.1, found live): every Root
  // row laid on one creature, then each action's DC list asked. A Trip is met
  // at the higher of Acrobatics and Fortitude, raised once; the live test had
  // it raised twice.
  const rooted = { items: [], effects: rows("Root", "defenceDC").map((r, i) => ({ id: `r${i}`, name: "Root", flags: { "trg-prime": { defenceDC: [defenceDC.defenceDCRowFrom(r, "Root").row] } } })) };
  equal("B …a Trip meets the higher of Acrobatics and Fortitude +2 once; a Shove and a Reposition +2; a Disarm nothing (live test)",
    [["skillDC:acrobatics", "fortitudeDC"], "fortitudeDC", "fortitudeDC", "reflexDC"].map((against, i) => defenceDC.defenceDCBonus(rooted, against, ["tripAttack", "shoveAttack", "reposition", "disarm"][i]).total),
    [2, 2, 2, 0]);
  equal("B …its scope finishes the card's sentence (\"anyone rolls against to …\", live test)", rows("Root", "defenceDC")[0].scope, "move or trip it");
  const w = warp.aggregateWarpSelection(byName.Root.system.warps, { "warp-0": 3 });
  equal("B …+1 a PP to +4, and no further, on the DCs and the balance tick (3.672.0 C12, C13)",
    [w.mods.bonusValue, w.mods.bonusMax, effects.defenceDCWarpExtra(2, w.mods.bonusValue, w.mods.bonusMax),
      effects.declaredConditionalsWarped(rows("Root", "declare")[0].flags.conditionals, w.mods.bonusValue, w.mods.bonusMax)[0].value], [3, 4, 2, 4]);
}
{
  const wb = B5.BLOCK5_SPELLS.find((s) => s.name === "Water Bolt").system.effects.find((e) => e.kind === "forcedMove");
  const a = { n: 1 }, b = { n: 2 }, c = { n: 3 }, d = { n: 4 };
  equal("B Water Bolt: pushed 5 feet away on a serious or deadly critical, not a minor one or a hit (B8-9)",
    [wb.feet, wb.direction, attackRows.attackRowRecipients(wb, [a, b, c, d], [{ target: a, critical: true, severity: "minor" }, { target: b, critical: true, severity: "serious" }, { target: c, critical: true, severity: "deadly" }, { target: d, critical: false }]).map((x) => x.n)],
    [5, "away", [2, 3]]);
}
{
  const af = warp.aggregateWarpSelection(byName["Arrows Flight"].system.warps, { "warp-0": 1, "warp-1": 1 });
  equal("B Arrows Flight's warps reach what reads them: the hour, and larger projectiles", [af.mods.durationText, af.mods.unlocks, auto8.arrowsFlightSeconds(af.mods)], ["1 hour", ["itLargeProjectiles"], 3600]);
  const ar = warp.aggregateWarpSelection(byName["Age Resistance"].system.warps, { "warp-0": 1 });
  equal("B Age Resistance: until daily preparation, or a month warped (30 days), or for good",
    [duration.parseSpellDuration(byName["Age Resistance"].system.duration), duration.parseSpellDuration(ar.mods.durationText)?.seconds, byName["Age Resistance"].system.warps[1].mods.durationText], [null, 2592000, "unlimited"]);
}
equal("B Arrows Flight's card carries its own note, so the system does not print the HTML description under the result (live test)",
  [narration.spellHasNoMechanics(byName["Arrows Flight"].system), rows("Arrows Flight").map((e) => e.kind), B8.BLOCK8_SPELLS.filter((d) => narration.spellHasNoMechanics(d.system)).map((d) => d.name)],
  [false, ["note"], []]);
equal("B no creature targets for Arrows Flight; no area placed for Boundless Vision or Skyborne Pathways",
  [byName["Arrows Flight"].system.targets, byName["Boundless Vision"].system.area, byName["Skyborne Pathways"].system.area], ["", "", ""]);
equal("B Burst of Speed: +20 for the first round, its effect named as the second round's watch expects",
  [B3.BLOCK3_SPELLS.find((s) => s.name === "Burst of Speed").system.effects.map((e) => [e.kind, e.value, e.duration]), effects.effectName("Burst of Speed", B3.BLOCK3_SPELLS.find((s) => s.name === "Burst of Speed").system.effects[0].note)],
  [[["bonus", 20, "1 round"]], auto8.BURST_FIRST]);

/* ------------------------------------------------------------------ *
 * C. The decisions
 * ------------------------------------------------------------------ */

equal("C Spiritual Distraction's ladder: Critical (and Heroic) ends it; Success nothing; −2, −4, −10 (Blunder as Fumble)",
  ["heroic", "critical", "success", "partial", "failure", "fumble", "blunder", ""].map((k) => auto8.distractionOutcome(k)),
  [{ ends: true, penalty: 0 }, { ends: true, penalty: 0 }, { ends: false, penalty: 0 }, { ends: false, penalty: -2 }, { ends: false, penalty: -4 }, { ends: false, penalty: -10 }, { ends: false, penalty: -10 }, { ends: false, penalty: 0, unknown: true }]);
equal("C Disrupt Soul: 2d8; a Failure +1d8 a PP actually spent (B8-5), or +1d8 per four levels for no PP (at least 1d8); a Fumble with a critical",
  [auto8.disruptOutcome("success", { ppSpent: 6 }), auto8.disruptOutcome("failure", { ppSpent: 6 }), auto8.disruptOutcome("failure", { ppSpent: 0 }),
    auto8.disruptOutcome("failure", { noPP: true, level: 9 }), auto8.disruptOutcome("failure", { noPP: true, level: 3 }), auto8.disruptOutcome("fumble", { ppSpent: 4 }),
    auto8.disruptOutcome("blunder", { noPP: true, level: 16 }), auto8.disruptOutcome("critical", { ppSpent: 9 })],
  [{ ends: false, dice: 2, critical: false }, { ends: false, dice: 8, critical: false }, { ends: false, dice: 2, critical: false },
    { ends: false, dice: 4, critical: false }, { ends: false, dice: 3, critical: false }, { ends: false, dice: 6, critical: true },
    { ends: false, dice: 6, critical: true }, { ends: true, dice: 0, critical: false }]);
equal("C the magical Focus abilities are the ones the content marks", [...auto8.MAGICAL_FOCUS_NAMES], Object.keys(B8.MAGICAL_FOCUS));
{
  const items = [...B3.BLOCK3_FEATS, ...B3.BLOCK3_ABILITIES, ...B4.BLOCK4_FEATS, ...B4.BLOCK4_ABILITIES];
  for (const [name, sentence] of Object.entries(B8.MAGICAL_FOCUS)) {
    const doc = items.find((d) => d.name === name);
    const printed = [...(book3.sections[name] ?? []), ...(book4.sections[name.toUpperCase()]?.lines ?? [])].join(" ");
    ok(`C ${name}: the book says so ("${sentence}"), and the item is marked magical with the Focus trait`,
      printed.includes(sentence) && F(doc ?? {}).itMagical === true && /\bFocus\b/.test(doc?.system?.traits ?? "") && auto8.isMagicalFocus(doc));
  }
  equal("C no other Focus ability is marked; Inner Strike (whose damage only may be magical) and Smoke Veil (non-magical) are not",
    [items.filter((d) => F(d).itMagical).map((d) => d.name).sort(), auto8.isMagicalFocus(items.find((d) => d.name === "Inner Strike")), auto8.isMagicalFocus(items.find((d) => d.name === "Smoke Veil"))],
    [Object.keys(B8.MAGICAL_FOCUS).sort(), false, false]);
}
equal("C an item made before 0.9.0 is known by name; a spell answers through its casting; no Focus, no answer",
  [auto8.isMagicalFocus({ type: "ability", name: "Veiled Body", system: { traits: "Focus, Shadow" } }), auto8.isMagicalFocus({ type: "spell", name: "Veiled Body", system: { traits: "Focus" }, flags: { "trg-prime": { itMagical: true } } }),
    auto8.isMagicalFocus({ type: "ability", name: "Abundant Step", system: { traits: "Technique" } })], [true, false, false]);
equal("C a use spent is a drop in the count; anything else is not", [auto8.focusUseSpent(2, { system: { usesValue: 1 } }), auto8.focusUseSpent(1, { system: { usesValue: 2 } }), auto8.focusUseSpent(undefined, { system: { usesValue: 0 } }), auto8.focusUseSpent(2, { name: "x" })], [true, false, false, false]);
{
  const stack = (name, type = "ammunition", qty = 40, traits = "", flags = {}) => ({ name, type, system: { quantity: qty, traits }, flags });
  const items = [stack("Arrow"), stack("Crossbow Bolt"), stack("Sling Bullet"), stack("Blowgun Dart"), stack("Javelin", "weapon", 3, "Thrown 30"), stack("Shuriken", "weapon", 10, "Agile, Thrown 10"),
    stack("Empty Arrows", "ammunition", 0), stack("Arrow (Arrows Flight)", "ammunition", 30, "", { "trg-prime": { rangeIncrementMultiplier: { value: 2 } } }), stack("Longsword", "weapon", 1, "Versatile P"),
    stack("Old Arrow", "ammunition", 20, "", { "trg-prime": { rangeIncrementMultiplier: { value: 2, expiresAt: 100 } } })];
  equal("C Arrows Flight: arrows, bolts, sling bullets, darts and shuriken (B8-3); a javelin needs the +4 PP warp; never an empty or already-marked stack",
    [auto8.arrowsFlightCandidates(items, { worldTime: 50 }).map((i) => i.name), auto8.arrowsFlightCandidates(items, { large: true, worldTime: 50 }).map((i) => i.name), auto8.arrowsFlightCandidates(items, { worldTime: 100 }).map((i) => i.name).includes("Old Arrow")],
    [["Arrow", "Crossbow Bolt", "Sling Bullet", "Blowgun Dart", "Shuriken"], ["Arrow", "Crossbow Bolt", "Sling Bullet", "Blowgun Dart", "Javelin", "Shuriken"], true]);
  equal("C up to 30, never more than the stack", [auto8.arrowsFlightCount("", 40), auto8.arrowsFlightCount("12", 40), auto8.arrowsFlightCount("50", 40), auto8.arrowsFlightCount("30", 7), auto8.arrowsFlightCount("x", 5)], [30, 12, 30, 7, 5]);
}
{
  const made = []; const updates = [];
  const stack = { id: "s1", name: "Arrow", system: { quantity: 40 }, toObject: () => ({ _id: "s1", name: "Arrow", system: { quantity: 40 }, flags: {} }), update: async (u) => { updates.push(u); } };
  const actor = { items: { get: (id) => (id === "s1" ? stack : null) }, createEmbeddedDocuments: async (type, docs) => { made.push(...docs); } };
  globalThis.foundry = { utils: { setProperty: (o, k, v) => { const parts = k.split("."); let x = o; for (const p of parts.slice(0, -1)) x = (x[p] ??= {}); x[parts.at(-1)] = v; } } };
  await auto8.enchantProjectiles(actor, { itemId: "s1", count: 30, expiresAt: 700 });
  equal("C Arrows Flight splits 30 of 40 off as their own stack, marked until the spell's time, and leaves 10",
    [made.map((d) => [d.name, d.system.quantity, d.flags["trg-prime"].rangeIncrementMultiplier]), updates], [[["Arrow (Arrows Flight)", 30, { value: 2, expiresAt: 700, label: "Arrows Flight" }]], [{ "system.quantity": 10 }]]);
}
equal("C Burst of Speed: the −10 follows a first round that ran out, not one ended early or another effect",
  [auto8.burstRanOut({ name: auto8.BURST_FIRST, flags: { "trg-prime": { conditionExpiresRound: 4 } } }, 4), auto8.burstRanOut({ name: auto8.BURST_FIRST, flags: { "trg-prime": { conditionExpiresRound: 4 } } }, 3),
    auto8.burstRanOut({ name: "Haste", flags: { "trg-prime": { conditionExpiresRound: 4 } } }, 5), auto8.burstRanOut({ name: auto8.BURST_FIRST, flags: {} }, 5)], [true, false, false, false]);
equal("C a mark is read under its key; a disabled one is not",
  auto8.marksOf([{ flags: { "trg-inner-tempest": { disruptSoul: { dc: 30 } } } }, { disabled: true, flags: { "trg-inner-tempest": { disruptSoul: { dc: 31 } } } }, { flags: { "trg-inner-tempest": { spiritualDistraction: { dc: 20 } } } }], "disruptSoul").map((m) => m.record.dc), [30]);

/* ------------------------------------------------------------------ *
 * D. Registration, and the Foundry half driven with stand-ins
 * ------------------------------------------------------------------ */

const calls = [];
const fake = new Proxy({}, { get: (_, name) => (...args) => { calls.push([name, ...args]); return true; } });
reg.registerContent(fake, "trg-inner-tempest");
equal("D Spiritual Distraction's gate is registered with the system (C5a)",
  calls.filter((c) => c[0] === "registerSpellCheckGate").map((c) => [c[1], c[2] === auto8.spiritualDistractionGate, c[3]]), [["spiritualDistraction", true, "trg-inner-tempest"]]);

const said = { checks: [], damage: [], ended: [], deleted: 0, cards: [], crits: [], created: [] };
let degreeNext = "failure";
const helpersStub = {
  rollCheck: async (config) => { said.checks.push([config.save, config.dc, config.saveSource]); return { outcome: { degree: { key: degreeNext, label: degreeNext }, margin: -12 } }; },
  endSpellOf: async (caster, castId) => { said.ended.push([caster?.uuid, castId]); return { ok: true, result: true }; },
  applyTypedDamage: async (actor, opts) => { said.damage.push([opts.amount, opts.type, opts.isCritical]); return { applied: opts.amount }; },
  basicSaveSeverity: async (degree, margin) => (margin <= -10 ? "minor" : null),
  rollCriticalInjury: async (roller, opts) => { said.crits.push([roller?.uuid, opts.damageType, opts.severity, opts.attackBonus]); },
  postCard: async (actor, title, lines) => { said.cards.push([title, lines.length]); },
  line: (t) => `<p>${t}</p>`,
  createEffectsOn: async (actor, data) => { said.created.push(...data); }
};
globalThis.game = { trgPrime: { modules: { helpers: helpersStub } }, user: { id: "u1" }, users: {}, combat: null };
globalThis.fromUuid = async (uuid) => ({ uuid, name: "Caster" });
globalThis.Roll = class { constructor(f) { this.f = f; } async evaluate() { this.total = 10 * Number(/^(\d+)d8$/.exec(this.f)?.[1] ?? 0); return this; } };
const markOn = (key, record) => ({ name: key, flags: { "trg-inner-tempest": { [key]: record } }, delete: async () => { said.deleted += 1; } });
{
  const actor = { name: "Ana", appliedEffects: [markOn("spiritualDistraction", { dc: 22, casterUuid: "Actor.c", castId: "k1", casterName: "Caster" })] };
  degreeNext = "failure";
  const fail = await auto8.spiritualDistractionGate({ actor, rollsCheck: true });
  degreeNext = "critical";
  const crit = await auto8.spiritualDistractionGate({ actor, rollsCheck: true });
  const none = await auto8.spiritualDistractionGate({ actor: { name: "B", appliedEffects: [] } });
  equal("D the gate: the Will save at the recorded DC; −4 circumstance on a Failure; a Critical ends the caster's spell (B8-4); nobody marked, nothing asked",
    [said.checks, fail.modifiers, crit.modifiers, said.ended, none], [[["will", 22, "Spiritual Distraction"], ["will", 22, "Spiritual Distraction"]], [{ label: "Spiritual Distraction", value: -4, type: "circumstance" }], [], [["Actor.c", "k1"]], null]);
}
{
  said.checks.length = 0; said.ended.length = 0;
  const actor = { name: "Ana", uuid: "Actor.a", system: { identity: { level: 8 } }, appliedEffects: [markOn("disruptSoul", { dc: 30, casterUuid: "Actor.c", castId: "k2" })] };
  degreeNext = "failure";
  await auto8.onSpellSettledB8({ actor, spell: { name: "Bolt", flags: {} }, cast: true, ppSpent: 6, innate: false, itemCast: false, level: 8 });
  degreeNext = "fumble";
  await auto8.onSpellSettledB8({ actor, spell: { name: "Spark", flags: {} }, cast: true, ppSpent: 0, innate: true, itemCast: false, level: 8 });
  degreeNext = "critical";
  await auto8.onSpellSettledB8({ actor, spell: { name: "Bolt", flags: {} }, cast: false, ppSpent: 3, innate: false, itemCast: false, level: 8 });
  equal("D Disrupt Soul at each casting: Fortitude at the recorded DC; 8d8 for 6 PP; an innate 4d8 at 8th and a basic save's critical on a Fumble, rolled by the cursed creature on its own client (review); a Critical ends it",
    [said.checks.map((c) => c[0] + c[1]), said.damage, said.crits, said.ended], [["fortitude30", "fortitude30", "fortitude30"], [[80, "essence", false], [40, "essence", true]], [["Actor.a", "essence", "minor", 30]], [["Actor.c", "k2"]]]);
}
{
  said.checks.length = 0; said.damage.length = 0;
  const actor = { name: "Ana", uuid: "Actor.a", system: { identity: { level: 12 } }, appliedEffects: [markOn("disruptSoul", { dc: 30, casterUuid: "Actor.c", castId: "k2" })] };
  degreeNext = "failure";
  await auto8.onSpellSettledB8({ actor, spell: { name: "Spark", flags: {} }, cast: true, ppSpent: 0, innate: false, itemCast: false, level: 12 });
  await auto8.onSpellSettledB8({ actor, spell: { name: "Scroll", flags: {} }, cast: true, ppSpent: 0, innate: true, itemCast: true, level: 12 });
  await auto8.onSpellSettledB8({ actor, spell: { name: "Bolt", flags: {} }, cast: true, ppSpent: 6, refunded: true, innate: false, level: 12 });
  equal("D a casting that spent no PP (a cantrip, an item's spell) takes the per-four-levels line, 5d8 at 12th (review); a refunded cast is not answered",
    [said.checks.length, said.damage], [2, [[50, "essence", false], [50, "essence", false]]]);
}
{
  said.checks.length = 0;
  const item = { type: "ability", name: "Veiled Body", system: { traits: "Focus, Shadow", usesValue: 1 }, flags: { "trg-prime": { itMagical: true } }, actor: { name: "Ana", system: { identity: { level: 12 } }, appliedEffects: [markOn("disruptSoul", { dc: 25 })] } };
  const options = {};
  auto8.onPreUpdateItemB8(item, { system: { usesValue: 0 } }, options);
  degreeNext = "failure";
  said.damage.length = 0;
  await auto8.onItemUpdatedB8(item, { system: { usesValue: 0 } }, options, "u1");
  await auto8.onItemUpdatedB8(item, { system: { usesValue: 0 } }, options, "someone else");
  equal("D …and at a magical Focus ability's spent use, on the spending client only: 2d8 + 1d8 per four levels (5d8 at 12th)", [options.itUsesBefore, said.checks.length, said.damage], [1, 1, [[50, "essence", false]]]);
}
{
  const gm = { id: "g" };
  globalThis.game.user = gm; globalThis.game.users = { activeGM: gm }; globalThis.game.combat = { started: true, round: 5 };
  const actor = { documentName: "Actor" };
  await auto8.onEffectDeletedB8({ name: auto8.BURST_FIRST, parent: actor, img: "i", origin: "o", flags: { "trg-prime": { conditionExpiresRound: 5, castId: "k3" } } });
  await auto8.onEffectDeletedB8({ name: auto8.BURST_FIRST, parent: actor, flags: { "trg-prime": { conditionExpiresRound: 6 } } });
  globalThis.game.user = { id: "player" };
  await auto8.onEffectDeletedB8({ name: auto8.BURST_FIRST, parent: actor, flags: { "trg-prime": { conditionExpiresRound: 5 } } });
  equal("D Burst of Speed: the second round's −10 ft follows a first round that ran out, once (the acting GM), ending with the spell",
    said.created.map((e) => [e.name, e.changes[0], e.flags["trg-prime"].conditionExpiresRound, e.flags["trg-prime"].castId]),
    [["Burst of Speed (second round)", { key: "system.combat.movement.land.untyped", type: "custom", value: "-10" }, 6, "k3"]]);
}

/* ------------------------------------------------------------------ *
 * E. Wiring
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
ok("E the hooks: a casting paid for, a Focus use's before and after, an effect gone",
  /Hooks\.on\("trgPrimeSpellSettled", \(ctx\) => \{ onSpellSettledB8\(ctx\)/.test(script) && /Hooks\.on\("preUpdateItem", \(item, changes, options\) => \{ try \{ onPreUpdateItemB8\(item, changes, options\);/.test(script)
  && /Hooks\.on\("updateItem", \(item, changes, options, userId\) => \{ onItemUpdatedB8\(item, changes, options, userId\)/.test(script) && /Hooks\.on\("deleteActiveEffect", \(effect\) => \{ onEffectDeletedB8\(effect\)/.test(script));
const auto8src = fs.readFileSync(path.join(ROOT, "module", "block8-automations.mjs"), "utf8");
ok("E Arrows Flight on a creature this client does not own is split on the acting GM's client (review)",
  /if \(target\.isOwner\) await enchantProjectiles\(target, payload\);\n\s*else game\.socket\?\.emit\(SOCKET, \{ b8own: "arrowsFlight", actorUuid: target\.uuid, payload \}\);/.test(auto8src)
  && /if \(data\?\.b8own !== "arrowsFlight" \|\| !isActingGM\(\)\) return;/.test(auto8src) && /  registerBlock8Socket\(\);\n/.test(script));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
equal("E the module is 1.0.3, built for 3.674.2, downloaded from its own release", [manifest.version, manifest.relationships.systems[0].compatibility.minimum, manifest.download],
  ["1.0.3", "3.674.2", "https://github.com/snowtroll75-debug/trg-inner-tempest/releases/download/v1.0.3/trg-inner-tempest.zip"]);
ok("E the script refuses an older system", script.includes('const REQUIRED_SYSTEM = "3.674.2";'));
{
  const [sa, sb] = String(systemJson.version).split(".").map(Number);
  ok("E the system at TRG_PRIME_ROOT is 3.672.0 or later", sa > 3 || (sa === 3 && sb >= 672), systemJson.version);
}
ok("E the it-spells pack carries the thirteen", B8.BLOCK8_SPELLS.every((d) => PACKS.find((p) => p.name === "it-spells").docs.includes(d)));
{
  const dir = path.join(ROOT, "packs-source", "it-spells");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  ok("E the built pack holds them (build-packs ran)", B8.BLOCK8_SPELLS.every((d) => files.some((f) => f.endsWith(`_${d._id}.json`))));
}
{
  const status = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "inventory", "status.json"), "utf8"));
  const ids = ["SP-01", "SP-02", "SP-03", "SP-05", "SP-07", "SP-11", "SP-13", "SP-14", "SP-15", "SP-19", "SP-21", "SP-22", "SP-24", "SP-25", "SP-10", "SP-23"];
  equal("E a status line for each, Water Bolt's included, and Burst of Speed and Timeless Motion raised",
    ids.map((id) => [id, status[id]?.status, status[id]?.achieved]),
    ids.map((id) => [id, "Implemented", { "SP-03": "C", "SP-05": "B", "SP-07": "B", "SP-13": "D", "SP-15": "B", "SP-21": "D", "SP-23": "B" }[id] ?? "A"]));
}

const EXPECTED = 123;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-block8: ${checks} checks — ${failures.length} FAILED\n`); for (const x of failures) console.log(`  ✗ ${x}`); process.exitCode = 1; }
else console.log(`verify-block8: ${checks} checks — all green.`);
