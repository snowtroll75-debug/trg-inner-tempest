#!/usr/bin/env node
/**
 * verify-block11 — Inner Tempest Block 11 (1.1.0): the nine Gymnast expansion
 * feats of v1.4, checked against the book, against the system that reads
 * them, by driving the pure decisions, and by running the Uses through the
 * real TRG Prime Strike and action workflows in a stubbed Foundry.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-block11.mjs
 *
 * Needs TRG Prime 3.712.1 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-block11.json, cut from the v1.4
 *      docx): every paragraph, the category and traits, the prerequisites,
 *      the action costs; Effortless Motion's name; the Flowing Step spell and
 *      the Oathblade's Challenge untouched; the art
 *   B  Eligibility through the system's own picker, prerequisite reader,
 *      eligibility registry and feat budget, at levels 1, 5, 10, 15 and 20,
 *      with and without the Gymnast archetype
 *   C  The declarations read by the system: Effortless Motion's advantage,
 *      Perfect Balance's rows, Pinnacle's and Tumbling Reversal's rows
 *   D  The pure decisions: precision dice, the Long Jump's reach, Rebound's
 *      evidence and targets, the triggers, the stances
 *   E  Behaviour, through the real workflows: Rebound Assault's MAP, Pinnacle
 *      of Motion's frozen reaction Strike, Whirlwind Kip's normal one,
 *      Effortless Motion's once-a-round Step, Offensive Momentum's 0-AP check
 *      and its precision rider, Redirection Stance's reaction and Trip,
 *      Tumbling Reversal's and Pinnacle's riders after a Tumble
 *   F  Registration and wiring; versions; packs
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM_ROOT = process.env.TRG_PRIME_ROOT ?? path.resolve(ROOT, "..", "core", "trg-prime");
const sys = (...p) => new URL(`file://${path.join(SYSTEM_ROOT, ...p)}`).href;

let checks = 0;
const failures = [];
function ok(label, condition, detail = "") { checks += 1; if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`); }
function equal(label, actual, expected) { ok(label, JSON.stringify(actual) === JSON.stringify(expected), `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`); }

/* ------------------------------------------------------------------ *
 * A stubbed Foundry, before anything that reads it is imported
 * ------------------------------------------------------------------ */

const cards = [];
const warnings = [];
const DialogV2 = { wait: async () => null, confirm: async () => true };
globalThis.foundry = {
  applications: { api: { DialogV2 }, ux: {} },
  utils: {
    getProperty: (o, p) => p.split(".").reduce((a, k) => a?.[k], o), hasProperty: () => false, setProperty: (o, p, v) => { const ks = p.split("."); let at = o; for (const k of ks.slice(0, -1)) at = (at[k] ??= {}); at[ks.at(-1)] = v; },
    mergeObject: (a, b) => Object.assign(a ?? {}, b ?? {}), deepClone: (x) => structuredClone(x), escapeHTML: (x) => String(x), randomID: () => "r1", isNewerVersion: () => false
  }
};
const hookLog = [];
globalThis.Hooks = { on(name, fn) { hookLog.push([name, fn]); return hookLog.length; }, once() {}, off(name, id) { if (typeof id === "number" && hookLog[id - 1]) hookLog[id - 1] = [null, null]; }, callAll(name, ctx) { for (const [n, fn] of hookLog) if (n === name) fn(ctx); }, call() { return true; } };
let rollTotal = 10;
globalThis.Roll = class { constructor(f) { this.formula = f; } async evaluate() { this.total = rollTotal; this.dice = [{ results: [{ result: rollTotal }] }]; this.terms = []; return this; } };
globalThis.renderTemplate = async () => "<div></div>";
globalThis.CONFIG = globalThis.CONFIG ?? {};
globalThis.ChatMessage = { getSpeaker: () => ({}), create: async (d) => { cards.push(d); return { ...d, getFlag: (s, k) => d.flags?.[s]?.[k], setFlag: async (s, k, v) => { d.flags[s][k] = v; } }; }, getWhisperRecipients: () => [], applyMode: () => {} };
globalThis.ui = { notifications: { warn(m) { warnings.push(m); }, info() {}, error() {} } };
globalThis.canvas = { tokens: { placeables: [] }, grid: { size: 100 } };
globalThis.fromUuid = async (uuid) => (globalThis.__uuids ?? new Map()).get(uuid) ?? null;
console.debug = () => {};
globalThis.__itSystemBase = new URL(`file://${SYSTEM_ROOT}`).href;
globalThis.game = { packs: new Map(), settings: { get: () => null }, combat: null, combats: [], user: { id: "u1", isGM: true, targets: new Set() }, actors: [], users: [], i18n: { localize: (s) => s } };

const B11 = await import("./content/block11.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const { stableId } = await import("./content/builders.mjs");
const auto = await import("../module/block11-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-block11.json"), "utf8"));

const cond = await import(sys("module", "conditionals.mjs"));
const dc = await import(sys("module", "combat", "defence-dc.mjs"));
const pickers = await import(sys("module", "picker-filters.mjs"));
const prereq = await import(sys("module", "prerequisites.mjs"));
const feats = await import(sys("module", "feats.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const atk = await import(sys("module", "combat", "attack.mjs"));
const so = await import(sys("module", "combat", "strike-options.mjs"));
const riders = await import(sys("module", "combat", "damage-riders.mjs"));
const mv = await import(sys("module", "combat", "movement.mjs"));
const ed = await import(sys("module", "magic", "effect-duration.mjs"));
const rf = await import(sys("module", "combat", "reaction-feats.mjs"));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));

const strip = (html) => String(html).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const byName = Object.fromEntries(B11.BLOCK11_FEATS.map((d) => [d.name, d]));
const F = (doc) => doc.flags?.["trg-prime"] ?? {};
const sha = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex");

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

const TABLE = {
  "Effortless Motion": ["Class", "Expert", "Acrobatics 10 ranks", ""],
  "Offensive Momentum": ["Class", "Flourish, Gymnast", "Vaulting Momentum, Acrobatics 8 ranks", "2 AP"],
  "Perfect Balance": ["Class", "Expert", "Acrobatics 8 ranks", ""],
  "Pinnacle of Motion": ["Class", "Gymnast", "Acrobatics 16 ranks", ""],
  "Rebound Assault": ["Class", "Attack, Flourish, Gymnast, Movement", "Vaulting Momentum", "2 AP"],
  "Redirection Stance": ["Class", "Gymnast, Stance", "Acrobatics 10 ranks", "1 AP"],
  "Tumbling Reversal": ["Class", "Gymnast", "Acrobatics 4 ranks", ""],
  "Vaulting Momentum": ["General", "Gymnast", "Acrobatics 6 ranks, Athletics 3 ranks", ""],
  "Whirlwind Kip": ["Class", "Gymnast, Stance", "Acrobatics 10 ranks", "1 AP"]
};
equal("A nine feats, as v1.4 prints them, and nine built", [Object.keys(book.feats).length, B11.BLOCK11_FEATS.length, ok.length >= 0], [9, 9, true]);
ok("A the book text is v1.4's", /v1\.4/.test(book.source));
for (const [name, [category, traits, prerequisites, action]] of Object.entries(TABLE)) {
  const doc = byName[name];
  ok(`A ${name}: built`, Boolean(doc));
  if (!doc) continue;
  const KEY = name.toUpperCase();
  const entry = book.feats[KEY];
  const missing = entry.lines.filter((l) => !doc.system.description.includes(md(l)));
  ok(`A ${name}: every paragraph the book prints`, missing.length === 0, missing.join(" / ").slice(0, 160));
  ok(`A ${name}: the flavour line`, doc.system.description.includes(entry.flavour));
  equal(`A ${name}: category, traits, prerequisites (the book's table)`, [doc.system.category, doc.system.traits, doc.system.prerequisites], [category, traits, prerequisites]);
  equal(`A ${name}: the printed action cost`, B11.printedAction(KEY), action);
  ok(`A ${name}: says what the system does`, /(Automated|Partly automated|Not automated):/.test(strip(doc.system.description)));
  equal(`A ${name}: a stable id from its name`, doc._id, stableId(`feats:${name}`));
  equal(`A ${name}: the jade feat art for its category`, doc.img, `modules/trg-inner-tempest/assets/feats/${category.toLowerCase()}.png`);
  ok(`A ${name}: the art is shipped`, fs.existsSync(path.join(ROOT, "assets", "feats", `${category.toLowerCase()}.png`)));
}
equal("A the trait line's category word is not kept as a trait (CLASS sits mid-line on Rebound Assault)", B11.splitTraitLine("ATTACK CLASS FLOURISH GYMNAST MOVEMENT"), { category: "Class", traits: ["Attack", "Flourish", "Gymnast", "Movement"] });
equal("A …and GENERAL is a category", B11.splitTraitLine("GENERAL GYMNAST"), { category: "General", traits: ["Gymnast"] });
{
  const featPack = PACKS.find((p) => p.name === "it-feats");
  const spellPack = PACKS.find((p) => p.name === "it-spells");
  const names = featPack.docs.map((d) => d.name);
  ok("A the new Expert feat is Effortless Motion; no feat is named Flowing Step", names.includes("Effortless Motion") && !names.includes("Flowing Step"));
  const flowing = spellPack.docs.filter((d) => d.name === "Flowing Step");
  equal("A the Grimoire's Flowing Step is still one spell, its id kept", flowing.map((d) => [d._id, d.type]), [["M09qMS86GXEzJZUM", "spell"]]);
  equal("A …byte for byte as Inner Tempest 1.0.5 shipped it", sha("packs-source/it-spells/Flowing-Step_M09qMS86GXEzJZUM.json"), "af29955434e5b87b204eb5c84d331ab984a89253aa22eb533339ea80d870f771");
  equal("A the Oathblade's Challenge is unchanged, byte for byte, and keeps its name", [sha("packs-source/it-abilities/Challenge_M8S2kb3cOyAukqXv.json"), PACKS.find((p) => p.name === "it-abilities").docs.some((d) => d.name === "Challenge"), PACKS.find((p) => p.name === "it-abilities").docs.some((d) => /knight's challenge/i.test(d.name))], ["a0b39770e4e8a17ae35056537baeaceb375bd969c95f92f6a25fd64eecb3c5f9", true, false]);
  const all = PACKS.flatMap((p) => p.docs.map((d) => d._id));
  equal("A every id across the packs is unique", all.length, new Set(all).size);
  equal("A the feats pack: 149 before, 158 now", featPack.docs.length, 158);
  ok("A no second Gymnast archetype in the module", !PACKS.flatMap((p) => p.docs).some((d) => d.name === "Gymnast"));
  const art = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "artwork.json"), "utf8"));
  equal("A the artwork map files the nine as their category's art", B11.BLOCK11_FEATS.map((d) => art[d._id] === d.img), B11.BLOCK11_FEATS.map(() => true));
}

/* ------------------------------------------------------------------ *
 * B. Eligibility, through the system's own readers
 * ------------------------------------------------------------------ */

// The core feats pack's own names, for the reader's feat clauses.
const KNOWN = new Set([...B11.BLOCK11_NAMES, "Gymnast"].map((n) => prereq.prerequisiteNameKey(n)));
const statsFor = ({ acro = 0, athl = 0, owned = [] } = {}) => ({ abilities: {}, skillRanks: { acrobatics: acro, athletics: athl }, ownedNames: new Set(owned.map((n) => prereq.prerequisiteNameKey(n))), knownNames: KNOWN });
const meets = (name, s) => prereq.meetsParseablePrerequisites(byName[name].system.prerequisites, s);
for (const [name, entry] of Object.entries(TABLE)) {
  const clauses = prereq.splitPrerequisiteClauses(entry[2], KNOWN);
  ok(`B ${name}: every prerequisite clause is one the system reads`, clauses.every((c) => KNOWN.has(prereq.prerequisiteNameKey(c)) || prereq.parsePrerequisiteClause(c) || prereq.parseCompoundSkillClause?.(c)), clauses.join(" | "));
}
equal("B the rank thresholds: one rank short refuses, the printed rank admits", [
  meets("Effortless Motion", statsFor({ acro: 9 })), meets("Effortless Motion", statsFor({ acro: 10 })),
  meets("Perfect Balance", statsFor({ acro: 7 })), meets("Perfect Balance", statsFor({ acro: 8 })),
  meets("Pinnacle of Motion", statsFor({ acro: 15 })), meets("Pinnacle of Motion", statsFor({ acro: 16 })),
  meets("Tumbling Reversal", statsFor({ acro: 3 })), meets("Tumbling Reversal", statsFor({ acro: 4 })),
  meets("Redirection Stance", statsFor({ acro: 9 })), meets("Redirection Stance", statsFor({ acro: 10 })),
  meets("Whirlwind Kip", statsFor({ acro: 9 })), meets("Whirlwind Kip", statsFor({ acro: 10 })),
  meets("Vaulting Momentum", statsFor({ acro: 6, athl: 2 })), meets("Vaulting Momentum", statsFor({ acro: 5, athl: 3 })), meets("Vaulting Momentum", statsFor({ acro: 6, athl: 3 }))
], [false, true, false, true, false, true, false, true, false, true, false, true, false, false, true]);
equal("B the feat prerequisites: Offensive Momentum and Rebound Assault need Vaulting Momentum owned", [
  meets("Offensive Momentum", statsFor({ acro: 20 })), meets("Offensive Momentum", statsFor({ acro: 7, owned: ["Vaulting Momentum"] })), meets("Offensive Momentum", statsFor({ acro: 8, owned: ["Vaulting Momentum"] })),
  meets("Rebound Assault", statsFor({ acro: 20 })), meets("Rebound Assault", statsFor({ acro: 0, owned: ["Vaulting Momentum"] }))
], [false, false, true, false, true]);

// The class-feat picker: a tier (Expert) and an archetype (Gymnast) gate.
const classOffer = (ctx, name) => pickers.buildPickerFilter("classFeat", ctx)(byName[name]);
const generalOffer = (ctx, name) => pickers.buildPickerFilter("generalFeat", ctx)(byName[name]);
const ROGUE = { class: "Rogue", ownClass: "Rogue", tier: "Expert", archetypes: "", traitClasses: "" };
const ROGUE_G = { ...ROGUE, archetypes: feats.effectiveArchetypes(["Gymnast"]) };
const FIGHTER = { class: "Fighter", ownClass: "Fighter", tier: "Martial", archetypes: "", traitClasses: "" };
const FIGHTER_G = { ...FIGHTER, archetypes: feats.effectiveArchetypes(["Gymnast"]) };
const GHOST = { class: "Ghostwalker", ownClass: "Ghostwalker", tier: "Expert", archetypes: "", traitClasses: "" };
const KENSAI_G = { class: "Kensai", ownClass: "Kensai", tier: "Martial", archetypes: feats.effectiveArchetypes(["Gymnast"]), traitClasses: "" };
const CLASS9 = B11.BLOCK11_NAMES.filter((n) => n !== "Vaulting Momentum");
equal("B the class picker: Expert feats to an Expert class (Rogue, Ghostwalker), not to a Martial one even with Gymnast",
  [["Effortless Motion", "Perfect Balance"].map((n) => [classOffer(ROGUE, n), classOffer(GHOST, n), classOffer(FIGHTER, n), classOffer(FIGHTER_G, n)])],
  [[[true, true, false, false], [true, true, false, false]]]);
equal("B the class picker: Gymnast feats only to a character with the core Gymnast archetype, whatever the class",
  CLASS9.filter((n) => TABLE[n][1].includes("Gymnast")).map((n) => [n, classOffer(ROGUE, n), classOffer(ROGUE_G, n), classOffer(FIGHTER, n), classOffer(FIGHTER_G, n), classOffer(KENSAI_G, n)]),
  ["Offensive Momentum", "Pinnacle of Motion", "Rebound Assault", "Redirection Stance", "Tumbling Reversal", "Whirlwind Kip"].map((n) => [n, false, true, false, true, true]));
equal("B no class feat of the nine is offered in the General slot, and Vaulting Momentum not in the Class slot",
  [CLASS9.some((n) => generalOffer(FIGHTER_G, n)), classOffer(FIGHTER_G, "Vaulting Momentum")], [false, false]);
ok("B Vaulting Momentum is a General feat the General picker offers (the trait is gated by the registered eligibility)", generalOffer(FIGHTER, "Vaulting Momentum") === true);
{
  // The eligibility, through the core's own registry.
  const calls = [];
  const fakeApi = new Proxy({}, { get: (_, k) => (k === "registerFeatEligibility" ? api.registerFeatEligibility : (...a) => calls.push([k, a[0]])) });
  auto.registerBlock11(fakeApi, "trg-inner-tempest");
  const actor = (items) => ({ name: "Test", items });
  const gym = { type: "feat", name: "Gymnast", system: { category: "Archetype" } };
  equal("B Vaulting Momentum without the Gymnast archetype is refused (picker and creation), with it allowed",
    [Boolean(api.featEligibilityBlock("Vaulting Momentum", actor([]))), api.featEligibilityBlock("Vaulting Momentum", actor([gym])),
      Boolean(api.featEligibilityRefusal("Vaulting Momentum", actor([]))), api.featEligibilityRefusal("Vaulting Momentum", actor([]), { trgAllowIneligibleFeat: true })],
    [true, null, true, null]);
  equal("B a feat NAMED Gymnast of another category is not the archetype", api.featEligibilityBlock("Vaulting Momentum", actor([{ type: "feat", name: "Gymnast", system: { category: "General" } }])) !== null, true);
  equal("B the picker's gate reads it too", pickers.withFeatGates((e) => e.system.category === "General", actor([]), "generalFeat")(byName["Vaulting Momentum"]), false);
  equal("B registerBlock11 registers the six Uses, three passive hints and the substitution", calls.map(([k, n]) => `${k}:${n}`).sort(), [
    "registerFeatAutomation:effortless motion", "registerFeatAutomation:offensive momentum", "registerFeatAutomation:pinnacle of motion", "registerFeatAutomation:rebound assault",
    "registerFeatAutomation:redirection stance", "registerFeatAutomation:whirlwind kip", "registerPassiveAutomation:perfect balance", "registerPassiveAutomation:tumbling reversal",
    "registerPassiveAutomation:vaulting momentum", "registerSkillSubstitution:Vaulting Momentum"].sort());
}

// Levels 1, 5, 10, 15 and 20: ranks are capped at the level (attributes.mjs).
{
  const at = (level, name, owned = []) => meets(name, statsFor({ acro: level, athl: level, owned }));
  const row = (level) => B11.BLOCK11_NAMES.map((n) => at(level, n, ["Vaulting Momentum"]) ? 1 : 0).join("");
  equal("B at levels 1/5/10/15/20, with maxed Acrobatics and Athletics (and Vaulting Momentum owned): EM OM PB PoM RA RS TR VM WK",
    [1, 5, 10, 15, 20].map(row), ["000010000", "000010100", "111011111", "111011111", "111111111"]);
  equal("B …Pinnacle of Motion first at 16", [at(15, "Pinnacle of Motion"), at(16, "Pinnacle of Motion")], [false, true]);
  equal("B the feat picks: class feats spend Class picks, Vaulting Momentum a General pick (featBudget)", (() => {
    const b = feats.featBudget({ level: 10, groups: { classFeats: [{ type: "feat", name: "Tumbling Reversal" }, { type: "feat", name: "Whirlwind Kip" }], generalFeats: [{ type: "feat", name: "Vaulting Momentum" }] } });
    return [b.class.spent, b.general.spent];
  })(), [2, 1]);
  equal("B the picks available at 1/5/10/15/20 (Class, General)", [1, 5, 10, 15, 20].map((l) => [feats.classFeatPicks(l), feats.generalFeatPicks(l)]), [[1, 1], [3, 3], [6, 5], [8, 8], [11, 10]]);
}
ok("B nothing grants the nine: no class, archetype or feat in the packs names one", !PACKS.flatMap((p) => p.docs).some((d) => B11.BLOCK11_NAMES.some((n) => [d.system?.grantedFeats, d.system?.grantedAbilities, d.system?.classAbilities].some((g) => String(g ?? "").includes(n)))));

/* ------------------------------------------------------------------ *
 * C. The declarations, read by the system
 * ------------------------------------------------------------------ */

const condsOf = (doc) => cond.collectConditionals([doc], [], [], {});
const matching = (entries, ctx) => entries.filter((e) => cond.matchesCheck(e, ctx));
{
  const em = condsOf(byName["Effortless Motion"]);
  const tumble = { checkType: "skill", subject: "acrobatics", actionKey: "tumble", traits: "Movement" };
  const jumpAcro = { checkType: "skill", subject: "acrobatics", actionKey: "longJump", traits: "Movement" };
  const plain = { checkType: "skill", subject: "acrobatics", actionKey: "", traits: "" };
  const feint = { checkType: "skill", subject: "acrobatics", actionKey: "feint", traits: "" };
  const athl = { checkType: "skill", subject: "athletics", actionKey: "highJump", traits: "Movement" };
  equal("C Effortless Motion: advantage applied by itself on Acrobatics actions with the Movement trait (Tumble; a jump with Acrobatics)",
    [matching(em, tumble).map((e) => [e.kind, e.auto]), matching(em, jumpAcro).map((e) => [e.kind, e.auto])], [[["advantage", true]], [["advantage", true]]]);
  equal("C …offered unticked on any other Acrobatics check (a judgement); never on Athletics, nor twice", [matching(em, plain).map((e) => e.auto), matching(em, feint).map((e) => e.auto), matching(em, athl).length], [[false], [false], 0]);
  equal("C …and a Tumble rolled the fast way (Shift) still takes the advantage", cond.automaticSelections(em, tumble).kinds, ["advantage"]);
}
{
  const pb = byName["Perfect Balance"];
  const target = { items: [pb], effects: [], appliedEffects: [], system: { combat: { defence: { breakdown: { entries: [] } } } } };
  const vs = (key) => dc.defenceDCBonus(target, ["skillDC:acrobatics", "fortitudeDC"], key);
  equal("C Perfect Balance: a Trip, a Shove and a Reposition against you are rolled at disadvantage; a Feint or a Disarm is not",
    ["tripAttack", "shoveAttack", "reposition", "feint", "disarm"].map((k) => vs(k).disadvantages.length), [1, 1, 1, 0, 0]);
  equal("C …and it raises no DC, only the disadvantage", vs("tripAttack").total, 0);
  const pbc = condsOf(pb);
  equal("C …your own checks and saves offer the advantage as a tick, never applied by itself", [matching(pbc, { checkType: "save", subject: "reflex" }).map((e) => [e.kind, e.auto]), matching(pbc, { checkType: "attack" }).length], [[["advantage", false]], 0]);
}
{
  const flags = auto.pinnacleFlags("Actor.orc", "Orc", 3);
  const eff = { id: "e1", name: "Pinnacle", flags: { "trg-prime": flags }, disabled: false };
  const rows = cond.collectConditionals([], [eff], [], {});
  const at = (ctx) => matching(rows, { checkType: "attack", ...ctx }).map((e) => [e.value, e.type, e.auto]);
  equal("C Pinnacle of Motion: +Dex+dodge (circumstance, automatic) on your attacks against that creature only; none against another; none on its own attacks",
    [at({ targetUuid: "Actor.orc" }), at({ targetUuid: "Actor.goblin" }), matching(rows, { checkType: "save", sourceUuid: "Actor.orc" }).length], [[[3, "circumstance", true]], [], 0]);
  equal("C …and none when it is already flat-footed to you (the core's targetStates)", at({ targetUuid: "Actor.orc", targetStates: ["flatfooted"] }), []);
  equal("C …a creature with no Dexterity or dodge to lose carries no row", auto.pinnacleFlags("Actor.x", "X", 0).conditionals.length, 0);
  equal("C the loss is the core's own figure (strike-options flatFootedLoss)", [[{ ability: 3, breakdown: { byType: { dodge: 1 } } }, {}, { ability: -1 }].map(auto.flatFootedLoss), [{ ability: 3, breakdown: { byType: { dodge: 1 } } }, {}, { ability: -1 }].map(so.flatFootedLoss)], [[4, 0, 0], [4, 0, 0]]);
}
{
  const rev = cond.collectConditionals([], [{ id: "r", name: "TR", flags: { "trg-prime": auto.reversalFlags("Actor.orc", "Orc") } }], [], {});
  const adv = cond.collectConditionals([], [{ id: "a", name: "TRa", flags: { "trg-prime": auto.reversalAdvantageFlags("Actor.orc", "Orc") } }], [], {});
  equal("C Tumbling Reversal: +1 circumstance on attacks against that creature, not another", [matching(rev, { checkType: "attack", targetUuid: "Actor.orc" }).map((e) => [e.value, e.type]), matching(rev, { checkType: "attack", targetUuid: "Actor.gob" }).length], [[[1, "circumstance"]], 0]);
  equal("C …the critical's advantage is one-shot (spent by the attack that takes it), against that creature", matching(adv, { checkType: "attack", targetUuid: "Actor.orc" }).map((e) => [e.kind, e.oneShot, e.auto]), [["advantage", true, true]]);
  equal("C …and the core spends its effect when the attack takes it", cond.automaticSelections(adv, { checkType: "attack", targetUuid: "Actor.orc" }).spent.map((x) => x.sourceId), ["a"]);
  equal("C …but not on an attack against another creature", cond.automaticSelections(adv, { checkType: "attack", targetUuid: "Actor.gob" }).spent, []);
  const both = cond.conditionalRows([...rev, ...matching(cond.collectConditionals([], [{ id: "p", name: "P", flags: { "trg-prime": auto.pinnacleFlags("Actor.orc", "Orc", 3) } }], [], {}), { checkType: "attack", targetUuid: "Actor.orc" })], { checkType: "attack", targetUuid: "Actor.orc" });
  ok("C with Pinnacle's row beside it, both are circumstance — the core's stacking keeps the greater (Appendix 1)", both.filter((r) => r.type === "circumstance").length === 2);
}
{
  const rider = { id: "om", name: "OM", disabled: false, flags: { "trg-prime": { strikeDamageRider: { dice: "2d4", label: "Offensive Momentum (precision)", targetUuids: ["Actor.orc"] } } } };
  const declared = riders.declaredDamageRiders([rider]);
  equal("C Offensive Momentum's rider is read by the core: d4s, against the struck creature only", [declared.map((r) => [r.dice, r.targetUuids]), riders.damageRidersFor(declared, { targetUuid: "Actor.orc" }).length, riders.damageRidersFor(declared, { targetUuid: "Actor.gob" }).length, riders.riderFormula(riders.damageRidersFor(declared, { targetUuid: "Actor.orc" }))], [[["2d4", ["Actor.orc"]]], 1, 0, " + 2d4"]);
}
{
  const subs = feats.substituteSkillActions("acrobatics", ["Vaulting Momentum"], [{ key: "highJump", name: "High Jump", skills: ["athletics"] }, { key: "longJump", name: "Long Jump", skills: ["athletics"] }, { key: "swim", skills: ["athletics"] }]);
  // The core reads a module's substitutions from its registry.
  equal("C Vaulting Momentum's substitution has the core's shape (both jumps, Acrobatics, no modifier)", auto.BLOCK11_SKILL_SUBSTITUTIONS["Vaulting Momentum"].map((e) => [e.action, e.skill, e.modifier ?? null]), [["highJump", "acrobatics", null], ["longJump", "acrobatics", null]]);
  api.registerSkillSubstitution("Vaulting Momentum", auto.BLOCK11_SKILL_SUBSTITUTIONS["Vaulting Momentum"].map((e) => ({ ...e })), "trg-inner-tempest");
  const after = feats.substituteSkillActions("acrobatics", ["Vaulting Momentum"], [{ key: "highJump", name: "High Jump", skills: ["athletics"] }, { key: "longJump", name: "Long Jump", skills: ["athletics"] }, { key: "swim", skills: ["athletics"] }]);
  equal("C …and once registered, the core offers High Jump and Long Jump from Acrobatics — the same action entries, so the same DCs", [subs.length, after.map((a) => a.key), after.every((a) => !a.substitutionModifier)], [0, ["highJump", "longJump"], true]);
  equal("C …not without the feat", feats.substituteSkillActions("acrobatics", ["Gymnast"], [{ key: "highJump", skills: ["athletics"] }]).length, 0);
}

/* ------------------------------------------------------------------ *
 * D. The pure decisions
 * ------------------------------------------------------------------ */

equal("D Offensive Momentum's dice: 10 ft earns 1d4, a critical 2d4; under 10 ft none, critical or not; immune none; resisted half",
  [[0, "success"], [9, "critical"], [10, "success"], [10, "critical"], [30, "heroic"], [10, "partial"]].map(([movedFeet, degree]) => auto.offensiveMomentumDice({ movedFeet, degree }))
    .concat([auto.offensiveMomentumDice({ movedFeet: 15, degree: "critical", immune: true }), auto.offensiveMomentumDice({ movedFeet: 15, degree: "critical", resisted: true }), auto.offensiveMomentumDice({ movedFeet: 15, degree: "success", resisted: true })]),
  [0, 0, 1, 2, 2, 1, 0, 1, 0]);
equal("D the action's movement: a Tumble and a High Jump move with their Stride (Speed); a Long Jump adds the most a success could leap (its total)",
  [auto.offensiveMoveFeet("tumble", { speed: 30, total: 22 }), auto.offensiveMoveFeet("highJump", { speed: 30, total: 22 }), auto.offensiveMoveFeet("longJump", { speed: 30, total: 22 })], [30, 30, 52]);
equal("D the checks it may be made with", [...auto.OFFENSIVE_CHECKS], ["highJump", "longJump", "tumble"]);
{
  const turn = { combatId: "c", round: 2, turn: 1 };
  const ev = (o) => auto.reboundEvidence({ turn, ...o });
  equal("D Rebound Assault: a Stride, a Tumble's AP, a Movement action recorded by the module all qualify; a Step does not; nothing does not",
    [ev({ pools: { "stride:land": { movedFeet: 15 } } }), ev({ traitAp: { ...turn, ap: 1 } }), ev({ ownRecord: { ...turn, qualifying: true } }),
      ev({ pools: { "action:step": { movedFeet: 5 } } }), ev({}), ev({ pools: { "stride:land": { movedFeet: 0 } } })],
    [{ qualifies: true, ambiguous: false }, { qualifies: true, ambiguous: false }, { qualifies: true, ambiguous: false }, { qualifies: false, ambiguous: false }, { qualifies: false, ambiguous: false }, { qualifies: false, ambiguous: false }]);
  equal("D …an ability's leg is asked about (it may have been Agile Display's or Effortless Motion's Step); last turn's records count for nothing",
    [ev({ pools: { "action:compoundLeg": { movedFeet: 5 } } }), ev({ traitAp: { ...turn, round: 1, ap: 2 } }), ev({ ownRecord: { ...turn, turn: 0, qualifying: true } })],
    [{ qualifies: false, ambiguous: true }, { qualifies: false, ambiguous: false }, { qualifies: false, ambiguous: false }]);
  equal("D the pool keys are the core's (movement.mjs movementPoolKey)", [mv.movementPoolKey(null, "land"), mv.movementPoolKey("step", "land"), mv.movementPoolKey("compoundLeg", "land")], ["stride:land", "action:step", "action:compoundLeg"]);
  equal("D a Movement-trait action other than a Step is a qualifying one", [{ key: "tumble", traits: "Movement" }, { key: "stand", traits: "Movement" }, { key: "highJump", traits: "Movement" }, { key: "step", traits: "Movement" }, { key: "feint", traits: "" }].map(auto.qualifyingMovementAction), [true, true, true, false, false]);
  const a = { uuid: "Actor.a" }, b = { uuid: "Actor.b" };
  equal("D two different creatures, both chosen", [auto.reboundTargetsRefusal(a, b), Boolean(auto.reboundTargetsRefusal(a, a)), Boolean(auto.reboundTargetsRefusal(a, { uuid: "Actor.a" })), Boolean(auto.reboundTargetsRefusal(a, null))], ["", true, true, true]);
}
equal("D Whirlwind Kip: a critical (or heroic) Tumble or Escape; not a success, not another action",
  [["tumble", "critical"], ["escape", "heroic"], ["tumble", "success"], ["escape", "success"], ["balance", "critical"], ["highJump", "critical"]].map(([k, d]) => auto.whirlwindTriggered(k, d)), [true, true, false, false, false, false]);
{
  const base = { attacker: { uuid: "A" }, target: { uuid: "T" }, melee: true, resolved: true, missed: true, hits: false };
  equal("D Redirection Stance: a melee miss offers; a fumble offers the Trip too; a hit, a ranged miss, a held blow or a Strike forbidding reactions do not",
    [auto.redirectionTrigger(base), auto.redirectionTrigger({ ...base, fumble: true }), auto.redirectionTrigger({ ...base, missed: false, hits: true }), auto.redirectionTrigger({ ...base, melee: false }), auto.redirectionTrigger({ ...base, held: true }), auto.redirectionTrigger({ ...base, noReactions: true }), auto.redirectionTrigger({ ...base, missed: false, resolved: false })],
    [{ offer: true, trip: false }, { offer: true, trip: true }, { offer: false, trip: false }, { offer: false, trip: false }, { offer: false, trip: false }, { offer: false, trip: false }, { offer: false, trip: false }]);
}
{
  const ctx = { attacker: { uuid: "A" }, target: { uuid: "Actor.orc" }, hits: true, critical: "minor" };
  equal("D Pinnacle of Motion's Strike: a critical hit on a creature your mark names; not a plain hit, not another creature, not a held blow",
    [auto.pinnacleTriggered(ctx, ["Actor.orc"]), auto.pinnacleTriggered({ ...ctx, critical: null }, ["Actor.orc"]), auto.pinnacleTriggered(ctx, ["Actor.gob"]), auto.pinnacleTriggered({ ...ctx, held: true }, ["Actor.orc"]), auto.pinnacleTriggered({ ...ctx, hits: false }, ["Actor.orc"])],
    [true, false, false, false, false]);
}
equal("D the two stances: the core's stance framework, no standing numbers", auto.BLOCK11_STANCES.map((s) => { const x = auto.stanceSpec11(s); return [s, x.changes.length, Object.keys(x.flags)]; }), [["Redirection Stance", 0, ["itGymnastStance"]], ["Whirlwind Kip", 0, ["itGymnastStance"]]]);
equal("D the frozen MAP is the core's reaction-feat 'frozen' (Cleave)", rf.strikeOptionsFor("frozen"), { apPaid: true, mapFrozen: true, skipTargetPrompt: true, asReaction: true });
equal("D the core's MAP ladder the Strikes read", [0, 1, 2, 3].map((i) => atk.mapPenalty(i)), [0, -5, -10, -10]);
equal("D 'until the end of its next turn': the core's turn-end clock passes over the turn in progress",
  [ed.dueAtTurnEnd({ of: "Actor.orc", castTurn: "2:cbOrc" }, { turnOfUuid: "Actor.orc", endingTurn: "2:cbOrc" }), ed.dueAtTurnEnd({ of: "Actor.orc", castTurn: "2:cbOrc" }, { turnOfUuid: "Actor.orc", endingTurn: "3:cbOrc" }), ed.turnKey(2, "cbOrc")],
  [false, true, "2:cbOrc"]);
equal("D the module's critical and success degrees are the core's", [auto.isCritical("critical"), auto.isCritical("heroic"), auto.isCritical("success"), auto.isSuccess("success"), auto.isSuccess("partial"), auto.isSuccess("failure")], [true, true, false, true, false, false]);

/* ------------------------------------------------------------------ *
 * E. Behaviour, through the real workflows
 * ------------------------------------------------------------------ */

const attackWf = await import(sys("module", "combat", "attack-workflow.mjs"));
const actionWf = await import(sys("module", "combat", "action-workflow.mjs"));
const skillActions = (await import(sys("module", "data", "skill-actions.mjs"))).SKILL_ACTIONS;
globalThis.__uuids = new Map();

function mkActor(name, { ap = 3, items = [], acro = 12 } = {}) {
  const a = {
    name, id: name.toLowerCase(), uuid: `Actor.${name.toLowerCase()}`, documentName: "Actor", isOwner: true, inCombat: true,
    items: [], effects: [], appliedEffects: [], statuses: new Set(),
    flags: { "trg-prime": {}, "trg-inner-tempest": {} },
    system: {
      resources: { ap: { value: ap, max: 3 }, reactions: { value: 1, max: 1 }, hp: { value: 30, max: 30 } },
      skills: { acrobatics: { total: acro, ranks: acro, label: "Acrobatics" }, athletics: { total: 3, ranks: 3, label: "Athletics" } },
      attributes: { dexterity: { total: 3 }, strength: { total: 2 } },
      combat: { attack: { total: 5 }, defence: { total: 15, ability: 3, breakdown: { byType: { dodge: 1 }, entries: [] } }, movement: { land: { base: 30, total: 30 } }, saves: { reflex: { total: 4 }, fortitude: { total: 3 } } },
      identity: { level: 12, size: "medium" }
    },
    hasCondition(k) { return this.statuses.has(k); },
    getFlag(sc, k) { return this.flags[sc]?.[k]; },
    async setFlag(sc, k, v) { this.flags[sc] = { ...(this.flags[sc] ?? {}), [k]: v }; },
    async unsetFlag(sc, k) { if (this.flags[sc]) delete this.flags[sc][k]; },
    async update(c) {
      for (const [k, v] of Object.entries(c)) {
        if (k === "system.resources.ap.value") this.system.resources.ap.value = v;
        else if (k === "system.resources.reactions.value") this.system.resources.reactions.value = v;
        else if (k.startsWith("flags.")) foundry.utils.setProperty(this, k, v);
      }
    },
    async createEmbeddedDocuments(kind, docs) {
      const made = docs.map((d, i) => ({ ...structuredClone(d), id: `${kind}${this.effects.length + this.items.length + i}`, disabled: false, getFlag(sc, k) { return this.flags?.[sc]?.[k]; } }));
      if (kind === "ActiveEffect") { this.effects.push(...made); this.appliedEffects = this.effects; } else this.items.push(...made);
      return made;
    },
    async deleteEmbeddedDocuments(kind, ids) { if (kind === "ActiveEffect") { this.effects = this.effects.filter((e) => !ids.includes(e.id)); this.appliedEffects = this.effects; } else this.items = this.items.filter((i) => !ids.includes(i.id)); },
    async toggleStatusEffect(k, { active } = {}) { if (active === false) this.statuses.delete(k); else this.statuses.add(k); },
    getActiveTokens() { return this.token ? [this.token] : []; }
  };
  a.effects.has = (id) => a.effects.some((e) => e.id === id);
  a.items.get = (id) => a.items.find((i) => i.id === id);
  for (const it of items) a.items.push({ ...it, id: it.id ?? `i${a.items.length}` });
  a.token = { id: `t-${a.id}`, name, actor: a, document: { x: 0, y: 0, width: 1, disposition: 1 }, setTarget(on, { releaseOthers } = {}) { if (releaseOthers) game.user.targets.clear(); if (on) game.user.targets.add(this); } };
  globalThis.__uuids.set(a.uuid, a);
  return a;
}
const featItem = (name, category = "Class") => ({ type: "feat", name, system: { category, traits: "" }, flags: {} });
const weaponItem = (name = "Rapier", extra = {}) => ({ id: name.toLowerCase(), name, type: "weapon", system: { traits: "Finesse", damage: "1d6", damageType: "piercing", group: "sword", equipped: true, attackMode: "melee", ...extra }, flags: {}, update: async () => {}, getFlag() {} });

function combatWith(actors, current) {
  const combatants = actors.map((x, i) => ({ id: `cb${i}`, actor: x, actorId: x.id, token: { actorLink: true } }));
  const c = { id: "c", started: true, round: 2, turn: actors.indexOf(current), combatants, combatant: combatants[actors.indexOf(current)] };
  game.combat = c; game.combats = [c];
  return c;
}
const mapRow = (check) => (check?.modifiers ?? []).find((m) => /^Multiple Attack Penalty/.test(m.label))?.value ?? 0;

// The helpers the module reads, over the real workflows.
const helperCalls = [];
game.trgPrime = { modules: { helpers: {
  line: (s) => `<p>${s}</p>`, postCard: async (actor, title, lines) => { cards.push({ title, lines }); },
  chooseFromList: async (title, prompt, options) => { helperCalls.push(["choose", title]); return globalThis.__choose?.(title, options) ?? options[0]?.[0]; },
  traitGate: async () => true, recordTraitUsage: async () => {}, traitCheck: async () => ({}),
  rollWeaponAttack: (...a) => attackWf.rollWeaponAttack(...a),
  resolveAction: (...a) => actionWf.resolveAction(...a),
  get skillActions() { return skillActions; },
  createEffectsOn: async (actor, docs) => actor.createEmbeddedDocuments("ActiveEffect", docs),
  spendReaction: async (actor) => { if (actor.system.resources.reactions.value < 1) return false; actor.system.resources.reactions.value -= 1; return true; },
  reactionRefusal: async (actor) => (actor.system.resources.reactions.value < 1 ? "no reaction" : ""),
  movementThisTurn: async (actor) => ({ feet: Number(actor.__moved ?? 0), apOnMovement: 0 }),
  armMove: async (actor, leg, label) => { helperCalls.push(["armMove", label, leg.maxFeet, leg.provokes]); await actor.setFlag("trg-prime", "compoundLeg", { ...leg, label }); },
  enterStance: async (actor, item, opts) => { helperCalls.push(["enterStance", opts.name, opts.apCost]); await actor.createEmbeddedDocuments("ActiveEffect", [{ name: opts.name, flags: { "trg-prime": { ...opts.flags, featStance: true } }, changes: opts.changes }]); return true; },
  applyConditionTagsTo: async (target, tags, opts) => { helperCalls.push(["condition", target.name, tags.map((t) => t.key), opts]); for (const t of tags) target.statuses.add(t.key); return tags; },
  itemUsesMax: () => null, itemUsesRemaining: () => 0
} } };
const use = (name) => reg && auto.BLOCK11_AUTOMATIONS[name].use;
const reset = () => { cards.length = 0; warnings.length = 0; helperCalls.length = 0; game.user.targets.clear(); };

// E1 — Rebound Assault: MAP deferred, then counted twice.
for (const before of [0, 1]) {
  reset();
  const me = mkActor("Gymnast", { items: [weaponItem(), featItem("Rebound Assault")] });
  const orc = mkActor("Orc"), gob = mkActor("Goblin");
  combatWith([me, orc, gob], me);
  await me.setFlag("trg-prime", "attackCount", before);
  await me.setFlag("trg-prime", "movementPools", { "stride:land": { movedFeet: 20 } });
  orc.token.setTarget(true, { releaseOthers: true }); gob.token.setTarget(true);
  const seen = [];
  const real = game.trgPrime.modules.helpers.rollWeaponAttack;
  game.trgPrime.modules.helpers.rollWeaponAttack = async (a, w, o) => { const check = await real(a, w, o); seen.push([Array.from(game.user.targets)[0]?.actor?.name, mapRow(check), o.mapFrozen ?? false, o.mapSteps ?? 1, a.getFlag("trg-prime", "attackCount")]); return check; };
  const done = await use("rebound assault")(me);
  game.trgPrime.modules.helpers.rollWeaponAttack = real;
  const p = atk.mapPenalty(before);
  equal(`E1 Rebound Assault after ${before} earlier attack(s): two Strikes, at the two creatures, BOTH at the penalty that stood (${p}); the count then rises by two; 2 AP`,
    [done, seen.map((s) => [s[0], s[1]]), me.getFlag("trg-prime", "attackCount"), me.system.resources.ap.value],
    [true, [["Orc", p], ["Goblin", p]], before + 2, 1]);
  if (before === 1) equal("E1 …the next Strike after it takes the third-attack penalty", atk.mapPenalty(me.getFlag("trg-prime", "attackCount")), -10);
}
{
  reset();
  const me = mkActor("Gymnast", { items: [weaponItem(), featItem("Rebound Assault")] });
  const orc = mkActor("Orc"), gob = mkActor("Goblin");
  combatWith([me, orc, gob], me);
  orc.token.setTarget(true, { releaseOthers: true }); gob.token.setTarget(true);
  const noMove = await use("rebound assault")(me);
  await me.setFlag("trg-prime", "movementPools", { "action:step": { movedFeet: 5 } });
  const afterStep = await use("rebound assault")(me);
  await me.setFlag("trg-prime", "movementPools", {});
  game.user.targets.clear(); orc.token.setTarget(true);
  await me.setFlag("trg-inner-tempest", "movementTaken", { combatId: "c", round: 2, turn: 0, qualifying: true });
  const oneTarget = await use("rebound assault")(me);
  const kob = mkActor("Kobold");
  orc.token.setTarget(true, { releaseOthers: true }); gob.token.setTarget(true); kob.token.setTarget(true);
  const threeTargets = await use("rebound assault")(me);
  equal("E1 Rebound Assault is refused without a Movement action this turn, after only a Step, with one creature targeted, and with three — nothing spent",
    [noMove, afterStep, oneTarget, threeTargets, me.system.resources.ap.value, me.getFlag("trg-prime", "attackCount") ?? 0], [false, false, false, false, 3, 0]);
}

// E2 — Pinnacle of Motion: the reaction Strike at the frozen MAP, once a round.
{
  reset();
  const me = mkActor("Gymnast", { items: [weaponItem("Unarmed Strike", { group: "brawling", traits: "Agile, Finesse, Nonlethal", natural: true, category: "unarmed", damageType: "subdual", damage: "1d3" }), featItem("Pinnacle of Motion")] });
  const orc = mkActor("Orc");
  combatWith([me, orc], me);
  await me.setFlag("trg-prime", "attackCount", 1);
  const seen = [];
  const real = game.trgPrime.modules.helpers.rollWeaponAttack;
  game.trgPrime.modules.helpers.rollWeaponAttack = async (a, w, o) => { const check = await real(a, w, o); seen.push([mapRow(check), o.mapFrozen, o.asReaction, o.isReaction ?? false]); return check; };
  await auto.B11_OFFERS.b11PinnacleStrike(me, { targetUuid: orc.uuid, targetName: "Orc" });
  const second = seen.length;
  const reactionsAfterFirst = me.system.resources.reactions.value;
  me.system.resources.reactions.value = 1; // a second reaction this round (Battle Readiness, say): still once a round
  await auto.B11_OFFERS.b11PinnacleStrike(me, { targetUuid: orc.uuid, targetName: "Orc" });
  game.trgPrime.modules.helpers.rollWeaponAttack = real;
  const weaponsAgile = atk.mapPenalty(1, true);
  equal("E2 Pinnacle of Motion's Strike: one unarmed Strike at the current penalty (agile fists: " + weaponsAgile + "), the counter not raised, paid by the reaction; not twice in a round",
    [seen.length, second, seen[0]?.[0], seen[0]?.slice(1), me.getFlag("trg-prime", "attackCount"), reactionsAfterFirst, me.system.resources.reactions.value, me.system.resources.ap.value],
    [1, 1, weaponsAgile, [true, true, false], 1, 0, 1, 3]);
}

// E3 — Whirlwind Kip: a Strike as a reaction, the normal MAP.
{
  reset();
  const me = mkActor("Gymnast", { items: [weaponItem(), featItem("Whirlwind Kip")] });
  const orc = mkActor("Orc");
  combatWith([me, orc], me);
  await me.setFlag("trg-prime", "attackCount", 1);
  await use("whirlwind kip")(me, { id: "wk", name: "Whirlwind Kip" });
  const seen = [];
  const real = game.trgPrime.modules.helpers.rollWeaponAttack;
  game.trgPrime.modules.helpers.rollWeaponAttack = async (a, w, o) => { const check = await real(a, w, o); seen.push([mapRow(check), o.mapFrozen ?? false, o.asReaction, o.apPaid]); return check; };
  orc.token.setTarget(true, { releaseOthers: true });
  await auto.onActionResolvedB11({ actor: me, action: { key: "tumble", name: "Tumble", traits: "Movement" }, resolvedDegree: "critical", targetActor: orc });
  await auto.onActionResolvedB11({ actor: me, action: { key: "escape", name: "Escape", traits: "Attack" }, resolvedDegree: "critical", targetActor: null });
  const noStance = mkActor("Other", { items: [weaponItem(), featItem("Whirlwind Kip")] });
  await auto.onActionResolvedB11({ actor: noStance, action: { key: "tumble", name: "Tumble", traits: "Movement" }, resolvedDegree: "critical", targetActor: orc });
  await auto.onActionResolvedB11({ actor: me, action: { key: "tumble", name: "Tumble", traits: "Movement" }, resolvedDegree: "success", targetActor: orc });
  game.trgPrime.modules.helpers.rollWeaponAttack = real;
  equal("E3 Whirlwind Kip: entered through the core's stances (1 AP); a critical Tumble asks for the reaction Strike at the normal penalty (-5), which counts; the spent reaction then refuses the critical Escape's; nothing outside the stance or on a success",
    [helperCalls.filter((c) => c[0] === "enterStance").map((c) => c.slice(1)), seen, me.getFlag("trg-prime", "attackCount"), me.system.resources.reactions.value],
    [[["Whirlwind Kip", 1]], [[-5, false, true, true]], 2, 0]);
  equal("E3 …and the stance's DB against attacks of opportunity is left to the GM, said on its card (no row the system would misapply)", [auto.stanceSpec11("Whirlwind Kip").changes.length, /GM adds it/.test(auto.stanceSpec11("Whirlwind Kip").lines.join(" "))], [0, true]);
}

// E4 — Tumbling Reversal and Pinnacle of Motion after a Tumble.
{
  reset();
  const me = mkActor("Gymnast", { items: [weaponItem(), featItem("Tumbling Reversal"), featItem("Pinnacle of Motion")] });
  const orc = mkActor("Orc"); const gob = mkActor("Goblin");
  combatWith([me, orc, gob], me);
  await auto.onActionResolvedB11({ actor: me, action: { key: "tumble", name: "Tumble", traits: "Movement" }, resolvedDegree: "success", targetActor: orc });
  const names = () => me.effects.map((e) => e.name).sort();
  const afterSuccess = names();
  const marks = me.effects.filter((e) => e.flags?.["trg-inner-tempest"]?.pinnacleTarget).map((e) => e.flags["trg-inner-tempest"].pinnacleTarget);
  await auto.onActionResolvedB11({ actor: me, action: { key: "tumble", name: "Tumble", traits: "Movement" }, resolvedDegree: "critical", targetActor: gob });
  const afterCrit = names();
  await auto.onActionResolvedB11({ actor: me, action: { key: "tumble", name: "Tumble", traits: "Movement" }, resolvedDegree: "failure", targetActor: orc });
  equal("E4 after a successful Tumble: +1 against that creature and Pinnacle's mark on it; a critical adds the advantage; a failure adds nothing",
    [afterSuccess, marks, afterCrit.length, names().length],
    [["Pinnacle of Motion: Orc flat-footed to you", "Tumbling Reversal: +1 against Orc"], ["Actor.orc"], 5, 5]);
  const ends = me.effects.map((e) => e.flags?.["trg-inner-tempest"]?.endsAfterTurn);
  equal("E4 …every one of them ends with your turn (the module's turn-end clock, this round)", ends.every((x) => x && x.combatId === "c" && x.round === 2), true);
  const pinRow = me.effects.find((e) => /Pinnacle of Motion: Orc/.test(e.name)).flags["trg-prime"].conditionals[0];
  equal("E4 …Pinnacle's row is the Orc's Dexterity and dodge (3 + 1), circumstance, against the Orc only", [pinRow.value, pinRow.type, pinRow.when.targetUuids], [4, "circumstance", ["Actor.orc"]]);
  // Without the feats, nothing.
  const plain = mkActor("Plain");
  await auto.onActionResolvedB11({ actor: plain, action: { key: "tumble", name: "Tumble", traits: "Movement" }, resolvedDegree: "critical", targetActor: orc });
  equal("E4 a character without the feats (or after removing them) gains nothing from a Tumble", plain.effects.length, 0);
  // The Pinnacle offer, through the Strike hook: answered here (this user is
  // the acting GM and nobody else plays the Gymnast), so the Strike is rolled.
  me.items.push({ ...weaponItem("Unarmed Strike", { group: "brawling", traits: "Agile, Finesse, Nonlethal", natural: true, category: "unarmed", damageType: "subdual", damage: "1d3" }), id: "fist" });
  game.users = []; game.users.activeGM = { id: "u1" };
  const struck = [];
  const realRoll = game.trgPrime.modules.helpers.rollWeaponAttack;
  game.trgPrime.modules.helpers.rollWeaponAttack = async (a, w, o) => { struck.push([w.name, o.optionLabel, Array.from(game.user.targets)[0]?.actor?.name]); return { modifiers: [] }; };
  const kobold = mkActor("Kobold");
  await auto.onStrikeResolvedB11({ attacker: me, target: kobold, hits: true, critical: "minor", melee: true, resolved: true, missed: false });
  await auto.onStrikeResolvedB11({ attacker: me, target: orc, hits: true, critical: null, melee: true, resolved: true, missed: false });
  const before = struck.length;
  await auto.onStrikeResolvedB11({ attacker: me, target: orc, hits: true, critical: "minor", melee: true, resolved: true, missed: false });
  await auto.onStrikeResolvedB11({ attacker: me, target: orc, hits: true, critical: "minor", melee: true, resolved: true, missed: false });
  game.trgPrime.modules.helpers.rollWeaponAttack = realRoll;
  equal("E4 through the Strike hook: a critical on an unmarked Kobold, or a plain hit on the Orc, offers nothing; a critical on the marked Orc offers the unarmed Strike once (the second critical that round, nothing)",
    [before, struck], [0, [["Unarmed Strike", "Pinnacle of Motion", "Orc"]]]);
}

// E5 — Effortless Motion: a free Step once a round.
{
  reset();
  const me = mkActor("Gymnast", { items: [featItem("Effortless Motion")] });
  combatWith([me], me);
  const legs = [];
  const first = await use("effortless motion")(me);
  legs.push(structuredClone(me.flags["trg-prime"].compoundLeg ?? null)); delete me.flags["trg-prime"].compoundLeg;
  const second = await use("effortless motion")(me);
  legs.push(structuredClone(me.flags["trg-prime"].compoundLeg ?? null));
  game.combat.round = 3;
  const nextRound = await use("effortless motion")(me);
  const leg = (l) => (l ? [l.speedKey, l.maxFeet, l.provokes, l.countsAs, l.label] : null);
  equal("E5 Effortless Motion: the core's own Step leg (land Speed, the core's Step length 5 ft, provoking nothing, counting as a Step), no AP; once this round, again next round",
    [first, second, nextRound, me.system.resources.ap.value, leg(legs[0]), legs[1], me.flags["trg-prime"].armedMovement, helperCalls.filter((c) => c[0] === "armMove").length],
    [true, false, true, 3, ["land", 5, false, "step", "Effortless Motion"], null, "compoundLeg", 0]);
  const mw = await import(sys("module", "combat", "movement-workflow.mjs"));
  equal("E5 …the length is the core's stepDistance (Graceful Step makes it 10)", [mw.stepDistance(me), mw.stepDistance({ ...me, items: [featItem("Graceful Step")] })], [5, 10]);
  equal("E5 …and the core reads such a leg as a Step (no difficult terrain, Feather Step eases it)", mv.armedMovementKind("compoundLeg", legs[0]), "step");
}

// E6 — Offensive Momentum: the check at 0 AP, the move, the Strike's precision rider.
{
  reset();
  const me = mkActor("Gymnast", { items: [weaponItem(), featItem("Offensive Momentum"), featItem("Vaulting Momentum", "General")] });
  const orc = mkActor("Orc");
  combatWith([me, orc], me);
  orc.token.setTarget(true, { releaseOthers: true });
  const resolved = [];
  const realResolve = game.trgPrime.modules.helpers.resolveAction;
  game.trgPrime.modules.helpers.resolveAction = async (a, action, opts) => { resolved.push([action.key, action.apCost, opts.invokedSkillKey]); Hooks.callAll("trgPrimeActionResolved", { actor: a, action, total: 18 }); return { lines: [], degree: globalThis.__degree ?? "critical" }; };
  globalThis.__choose = (title, options) => options.find((o) => o[0] === "longJump|acrobatics")?.[0] ?? options[0][0];
  const done = await use("offensive momentum")(me);
  globalThis.__choose = null;
  const card = cards.find((c) => c.flags?.["trg-inner-tempest"]?.omStrike);
  equal("E6 Offensive Momentum: a Long Jump with Acrobatics (Vaulting Momentum) at 0 AP, the action's 2 AP spent, the movement armed free (Speed 30 + the leap's 18)",
    [done, resolved, me.system.resources.ap.value, helperCalls.filter((c) => c[0] === "armMove").map((c) => c.slice(2)), Boolean(card)],
    [true, [["longJump", "0", "acrobatics"]], 1, [[48, true]], true]);
  // The Strike: moved 20 ft, the check a critical → 2d4 precision on this Strike only.
  me.__moved = 20;
  let riderSeen = null;
  const realRoll = game.trgPrime.modules.helpers.rollWeaponAttack;
  game.trgPrime.modules.helpers.rollWeaponAttack = async (a, w, o) => { riderSeen = riders.declaredDamageRiders(a.effects).map((r) => [r.dice, r.targetUuids]); return { modifiers: [], o }; };
  const message = { flags: card.flags, getFlag: (s, k) => card.flags[s][k], setFlag: async (s, k, v) => { card.flags[s][k] = v; } };
  const html = { querySelectorAll: () => [] };
  auto.bindBlock11Buttons(message, html);
  await auto.B11_PRESS.omStrike(message, "rapier");
  equal("E6 …its Strike: 20 ft moved and a critical check → 2d4 precision against the Orc, for that Strike only (gone after); the card spent",
    [riderSeen, me.effects.filter((e) => e.flags?.["trg-prime"]?.strikeDamageRider).length, card.flags["trg-inner-tempest"].omStrike.used], [[["2d4", ["Actor.orc"]]], 0, true]);
  await auto.B11_PRESS.omStrike(message, "rapier");
  equal("E6 …a spent card strikes no more", riderSeen.length, 1);
  // Against a creature immune to precision (an Incorporeal one, the core's
  // own reading through creature-traits.mjs), the Strike carries no rider.
  {
    const ghost = mkActor("Ghost"); ghost.system.details = { traits: "Incorporeal, Undead" };
    game.user.targets.clear(); ghost.token.setTarget(true);
    const msg2 = { flags: { "trg-inner-tempest": { omStrike: { actorUuid: me.uuid, degree: "critical", feetBefore: 0, used: false } } } };
    msg2.getFlag = (sc, k) => msg2.flags[sc][k]; msg2.setFlag = async (sc, k, v) => { msg2.flags[sc][k] = v; };
    riderSeen = null; cards.length = 0;
    await auto.B11_PRESS.omStrike(msg2, "rapier");
    equal("E6 against an Incorporeal ghost (immune to precision, read by the core): the Strike is made with no rider, and the card says why", [riderSeen, cards.some((c) => /immune to precision/.test(JSON.stringify(c)))], [[], true]);
    ghost.token.setTarget(false); orc.token.setTarget(true, { releaseOthers: true });
  }
  // A failure: no Strike, the AP still spent.
  reset(); me.system.resources.ap.value = 3; globalThis.__degree = "failure";
  await use("offensive momentum")(me);
  equal("E6 a failed check: no movement, no Strike card, the 2 AP spent", [helperCalls.filter((c) => c[0] === "armMove").length, cards.some((c) => c.flags?.["trg-inner-tempest"]?.omStrike), me.system.resources.ap.value], [0, false, 1]);
  globalThis.__degree = null;
  // Too few AP: refused before anything.
  reset(); me.system.resources.ap.value = 1;
  equal("E6 with 1 AP it is refused before the check (no third check rolled)", [await use("offensive momentum")(me), resolved.length], [false, 2]);
  game.trgPrime.modules.helpers.resolveAction = realResolve;
  game.trgPrime.modules.helpers.rollWeaponAttack = realRoll;
}

// E7 — Redirection Stance: the reaction, the clock, the free Trip.
{
  reset();
  const me = mkActor("Gymnast", { items: [weaponItem(), featItem("Redirection Stance")] });
  const orc = mkActor("Orc");
  combatWith([me, orc], orc);
  await use("redirection stance")(me, { id: "rs", name: "Redirection Stance" });
  const resolved = [];
  const realResolve = game.trgPrime.modules.helpers.resolveAction;
  game.trgPrime.modules.helpers.resolveAction = async (a, action, opts) => { resolved.push([action.key, action.apCost, Array.from(game.user.targets)[0]?.actor?.name]); return { lines: [], degree: "success" }; };
  await auto.B11_OFFERS.b11Redirection(me, { attackerUuid: orc.uuid, attackerName: "Orc", trip: false });
  const cond1 = helperCalls.find((c) => c[0] === "condition");
  equal("E7 Redirection Stance: entered (1 AP); a miss spends the reaction and makes the attacker (only) flat-footed until the end of its next turn (the core's clock, this turn passed over)",
    [helperCalls.find((c) => c[0] === "enterStance")?.slice(1), cond1?.slice(1, 3), cond1?.[3]?.endsAtTurnEndOf, me.system.resources.reactions.value, me.statuses.has("flatFooted")],
    [["Redirection Stance", 1], ["Orc", ["flatFooted"]], { of: "Actor.orc", castTurn: "2:cb1" }, 0, false]);
  await auto.B11_OFFERS.b11Redirection(me, { attackerUuid: orc.uuid, attackerName: "Orc", trip: true });
  equal("E7 …with no reaction left, nothing more (no Trip either)", resolved.length, 0);
  me.system.resources.reactions.value = 1;
  await auto.B11_OFFERS.b11Redirection(me, { attackerUuid: orc.uuid, attackerName: "Orc", trip: true });
  equal("E7 a fumble: the reaction, then the core's own Trip Attack (its data table) at 0 AP against the attacker, no further reaction", [resolved, me.system.resources.reactions.value], [[["tripAttack", "0", "Orc"]], 0]);
  game.trgPrime.modules.helpers.resolveAction = realResolve;
  const outside = mkActor("Plain");
  helperCalls.length = 0;
  await auto.B11_OFFERS.b11Redirection(outside, { attackerUuid: orc.uuid, attackerName: "Orc", trip: false });
  equal("E7 nobody outside the stance is asked", helperCalls.filter((c) => c[0] === "condition").length, 0);
}

/* ------------------------------------------------------------------ *
 * F. Registration, wiring, versions, packs
 * ------------------------------------------------------------------ */

const src = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
ok("F registration calls registerBlock11", /registerBlock11\(api, moduleId\)/.test(src("module/registration.mjs")));
ok("F the hooks are wired: actions, Strikes and the card's buttons", ["Hooks.on(\"trgPrimeActionResolved\", (ctx) => { onActionResolvedB11", "Hooks.on(\"trgPrimeStrikeResolved\", (ctx) => { onStrikeResolvedB11", "bindBlock11Buttons(message, html)"].every((s) => src("scripts/inner-tempest.mjs").includes(s)));
ok("F the module imports nothing from the system statically (the core's files are read at call time, with fallbacks)", !/^import .*systems\//m.test(src("module/block11-automations.mjs")));
equal("F the module is 1.1.0, built for TRG Prime 3.712.1, downloaded from its own release", [manifest.version, manifest.relationships.systems[0].compatibility.minimum, manifest.download], ["1.1.0", "3.712.1", "https://github.com/snowtroll75-debug/trg-inner-tempest/releases/download/v1.1.0/trg-inner-tempest.zip"]);
ok("F the system at TRG_PRIME_ROOT is at least 3.712.1", (() => { const [a, b, c] = systemJson.version.split(".").map(Number); return a > 3 || (a === 3 && (b > 712 || (b === 712 && c >= 1))); })(), systemJson.version);
equal("F the entry script asks for the same system", /REQUIRED_SYSTEM = "3\.712\.1"/.test(src("scripts/inner-tempest.mjs")), true);
equal("F the pack ids are kept (fifteen packs, the folder)", [manifest.packs.length, manifest.packs.map((p) => p.name).includes("it-feats"), manifest.packFolders[0].packs.length], [15, true, 15]);
ok("F the nine are in the compiled feats pack's source", B11.BLOCK11_FEATS.every((d) => fs.existsSync(path.join(ROOT, "packs-source", "it-feats", `${d.name.replace(/[^A-Za-z0-9]+/g, "-")}_${d._id}.json`))));
ok("F the compiled packs hold LevelDB files", fs.readdirSync(path.join(ROOT, "packs", "it-feats")).some((f) => /^CURRENT$/.test(f)));

console.log(`verify-block11: ${checks} checks — ${failures.length ? `${failures.length} FAILED` : "all green"}.`);
for (const f of failures) console.log(`  ✗ ${f}`);
process.exit(failures.length ? 1 : 0);
