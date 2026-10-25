#!/usr/bin/env node
/**
 * verify-block2 — Inner Tempest Block 2: Chapter 4's seventeen skill
 * actions, checked against the book, against the system that runs them, and
 * by driving the real automations with fake actors.
 *
 *   node tools/verify-block2.mjs
 *
 * Needs TRG Prime 3.666.0 at TRG_PRIME_ROOT (default ../core/trg-prime
 * beside this module's parent): the declarations the effects carry are
 * normalised and matched by the system's own functions here, and its
 * outcome readers are run over every row this module prints.
 *
 *   A  The book: every requirement, trigger, outcome row and paragraph is
 *      verbatim; the Bonus Check rows are the table; the rulings
 *   B  The system accepts them: registration, time ladders, outcome readers
 *   C  The pure decisions (degrees, clocks, lockouts, Focus)
 *   D  Each effect, read by the system's own conditional, defence-row and
 *      one-attack code against the checks it should and should not reach
 *   E  The automations themselves, against fake actors and helpers
 *   F  Wiring, versions, Impact Absorption, the two feats
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

const { SKILL_ACTIONS, SKILL_ACTION_KEYS } = await import("../module/skill-actions.mjs");
const sa = await import("../module/skill-action-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-ch4.json"), "utf8"));
const res = await import(sys("module", "dice", "resolution.mjs"));
const gso = await import(sys("module", "general-skill-options.mjs"));
const ep = await import(sys("module", "effect-parser.mjs"));
const oe = await import(sys("module", "outcome-effects.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const coreActions = await import(sys("module", "data", "skill-actions.mjs"));
const cond = await import(sys("module", "conditionals.mjs"));
const ddc = await import(sys("module", "combat", "defence-dc.mjs"));
const oa = await import(sys("module", "combat", "one-attack.mjs"));
const { SKILLS } = await import(sys("module", "config.mjs"));

const byName = Object.fromEntries(SKILL_ACTIONS.map((a) => [a.name, a]));
const byKey = Object.fromEntries(SKILL_ACTIONS.map((a) => [a.key, a]));
const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const DEGREES = ["heroic", "critical", "success", "partial", "failure", "fumble", "blunder"];

/** The book's paragraphs, split the way scripts/parse-ch4 splits them. */
function parse(text) {
  const out = { fields: {}, outcomes: {}, prose: [] };
  for (const para of text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)) {
    const m = /^\*\*(Heroic|Critical|Success|Partial|Failure|Fumble|Blunder)\*\*\s*([\s\S]*)$/.exec(para);
    if (m) { out.outcomes[m[1].toLowerCase()] = m[2].trim(); continue; }
    if (para.startsWith("**")) {
      for (const part of para.split(/;\s*(?=\*\*)/)) {
        const f = /^\*\*([A-Za-z]+)\*\*\s*([\s\S]*)$/.exec(part.trim());
        if (f) out.fields[f[1].toLowerCase()] = f[2].trim();
      }
      continue;
    }
    out.prose.push(para);
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

equal("A1 seventeen actions, in the book's order, one per entry", SKILL_ACTIONS.map((a) => a.name), Object.keys(book));
ok("A1 keys are unique and none is a core action's", new Set(SKILL_ACTION_KEYS).size === 17 && SKILL_ACTION_KEYS.every((k) => !coreActions.SKILL_ACTIONS.some((c) => c.key === k)));
const SKILL_KEY = Object.fromEntries(Object.entries(SKILLS).map(([k, v]) => [v.label, k]));
const BONUS_CHECK = ["Evade", "Interpret Style", "Root the Body", "Centred Balance", "Guide the Breath", "Resist Dying", "Steel the Mind"];
for (const [name, entry] of Object.entries(book)) {
  const a = byName[name];
  const b = parse(entry.text);
  equal(`A2 ${name}: skill and traits as printed`, [a.skills, a.traits.split(", ")], [[SKILL_KEY[entry.skill]], entry.traits.split(/\s+/)]);
  if (b.fields.requirements) equal(`A2 ${name}: requirements verbatim`, a.requirements, b.fields.requirements);
  else ok(`A2 ${name}: no requirements invented`, a.requirements === undefined);
  if (name === "Resist Dying") equal("A2 Resist Dying: the ruled Trigger (Graham, 21 Oct 2026)", [a.trigger, a.apCost], ["You gain the dying condition.", "Reaction"]);
  else if (b.fields.trigger) equal(`A2 ${name}: trigger verbatim`, a.trigger, b.fields.trigger);
  else ok(`A2 ${name}: no trigger invented`, a.trigger === undefined);
  const desc = flat(a.description);
  ok(`A2 ${name}: every paragraph of the book's prose is in the description`, b.prose.every((p) => desc.includes(flat(p))), b.prose.filter((p) => !desc.includes(flat(p))).join(" | "));
  if (b.fields.target) ok(`A2 ${name}: the target is stated`, desc.toLowerCase().includes(`target: ${flat(b.fields.target).toLowerCase().replace(/\.$/, "")}`));
  if (b.fields.range) ok(`A2 ${name}: the range is stated`, desc.includes(`Range: ${b.fields.range}`));
  if (BONUS_CHECK.includes(name)) {
    ok(`A2 ${name}: the book refers it to the Bonus Check table and prints no rows`, !Object.keys(b.outcomes).length && /Bonus Check table/.test(entry.text));
    const half = name === "Interpret Style";
    const got = DEGREES.map((d) => { const m = / of (\d+)/.exec(a.outcomes[d]); return m ? Number(m[1]) : 0; });
    const want = DEGREES.map((d) => { const v = Math.max(0, res.bonusCheckModifier(d)); return half ? Math.ceil(v / 2) : v; });
    equal(`A3 ${name}: each row is the Bonus Check table${half ? " halved, rounded up" : ""}, negatives as 0`, got, want);
  } else {
    equal(`A2 ${name}: every printed outcome row verbatim, and no other`, Object.fromEntries(DEGREES.filter((d) => a.outcomes[d]).map((d) => [d, a.outcomes[d]])), b.outcomes);
  }
}
const FEATS = Object.fromEntries(SKILL_ACTIONS.filter((a) => a.requiresFeat).map((a) => [a.name, a.requiresFeat]));
equal("A4 the feat each Requirement names gates its action, and nothing else is gated", FEATS, { "Evade": "Inner Discipline", "Wall Run": "Inner Discipline", "Centred Balance": "Inner Balance", "Resist Dying": "Inner Discipline", "Steel the Mind": "Inner Discipline", "Elemental Ward": "Elemental Warding" });
equal("A4 the costs as printed (R is a Reaction; Resist Dying as ruled)", Object.fromEntries(SKILL_ACTIONS.map((a) => [a.key, a.apCost])), {
  evade: "Reaction", interpretStyle: "3", rootTheBody: "Reaction", wallRun: "1", recogniseDiscipline: "1", centredBalance: "10 minutes", guideTheBreath: "1", steadyHeart: "1", resistDying: "Reaction", maintainClarity: "1", steelTheMind: "Reaction", elementalWard: "10 minutes", readTheElements: "1 minute", readSpiritualEcho: "1 minute", observeTechnique: "1", readDevotion: "1 minute", readIntent: "1" });
equal("A4 the DC each is rolled against", Object.fromEntries(SKILL_ACTIONS.map((a) => [a.key, a.against + (a.fixedDC ? `:${a.fixedDC}` : "")])), {
  evade: "selfLevelDC", interpretStyle: "levelDC", rootTheBody: "selfLevelDC", wallRun: "none", recogniseDiscipline: "levelDC", centredBalance: "none", guideTheBreath: "levelDC", steadyHeart: "selfLevelDC", resistDying: "selfLevelDC", maintainClarity: "selfLevelDC", steelTheMind: "selfLevelDC", elementalWard: "fixed:20", readTheElements: "none", readSpiritualEcho: "none", observeTechnique: "levelDC", readDevotion: "none", readIntent: "levelDC" });

/* ------------------------------------------------------------------ *
 * B. The system accepts them
 * ------------------------------------------------------------------ */

const calls = { actions: [], subs: {}, other: 0 };
reg.registerContent({
  registerSourcebook() {}, registerLanguage() {}, registerRacialPP() {}, registerFeatAutomation() {}, registerPassiveAutomation() {},
  // Block 3's registrations (0.4.0), accepted and ignored here.
  registerClass() {}, registerFeatGate() {}, registerTraits() {},
  registerSkillSubstitution: (name, entries) => { calls.subs[name] = entries; },
  registerSkillActions: (actions) => { calls.actions.push(...actions); }
}, "trg-inner-tempest");
equal("B1 all seventeen are registered, as copies of the table", [calls.actions.length, calls.actions.every((a, i) => a !== SKILL_ACTIONS[i] && JSON.stringify(a) === JSON.stringify(SKILL_ACTIONS[i]))], [17, true]);
const before = api.queuedSkillActions().length;
equal("B1 the system's registration takes every one, with no problem reported", [api.queueSkillActions(calls.actions, "trg-inner-tempest"), api.queuedSkillActions().length - before, api.registrationProblems().filter((p) => /registerSkillActions/.test(p))], [17, 17, []]);
const added = coreActions.addSkillActions(calls.actions.map((a) => ({ ...a })));
equal("B1 …and its live table appends them all", [added.added.length, added.skipped], [17, []]);
const track = coreActions.SKILL_ACTIONS.find((a) => a.key === "track");
equal("B2 Read the Elements' hour of Nature-for-Track names a real action under its real skill", [calls.subs[sa.ELEMENTAL_TRACKING], track?.skills], [[{ action: "track", skill: "nature" }], ["survival"]]);
const centred = gso.timeLadder("centredBalance", byKey.centredBalance);
const ward = gso.timeLadder("elementalWard", byKey.elementalWard);
equal("B3 Centred Balance's printed time choices, through the system's ladder", centred?.options.map((o) => [o.label, o.modifier]), [["10 minutes", 0], ["1 minute", -2], ["1 round", -5], ["1 AP", -10]]);
equal("B3 Elemental Ward's, defaulting to the printed 10 minutes", [ward?.options.map((o) => [o.label, o.modifier]), ward?.defaultKey], [[["1 minute", -2], ["10 minutes", 0], ["1 hour", 2]], "tenMinutes"]);
const rows = SKILL_ACTIONS.flatMap((a) => DEGREES.filter((d) => a.outcomes[d]).map((d) => [`${a.name} ${d}`, a.outcomes[d]]));
const read = rows.filter(([, t]) => oe.extractModifier(t) || ep.extractHealAmount(t) || ep.extractPushDistance(t) || ep.extractAttitudeShift(t) !== null);
ok("B4 every action declares that this module applies its rows, so the system's text readers leave them (3.666.0)", SKILL_ACTIONS.every((a) => a.outcomesApplied === true));
equal("B4 …which matters for exactly one row: Maintain Clarity's Fumble would be queued a second time, unscoped", read.map(([k]) => k), ["Maintain Clarity fumble"]);

/* ------------------------------------------------------------------ *
 * C. Pure decisions
 * ------------------------------------------------------------------ */

equal("C1 a table's degree falls back as the system's does", [sa.tableDegree(byKey.wallRun, "heroic"), sa.tableDegree(byKey.wallRun, "blunder"), sa.tableDegree(byKey.elementalWard, "blunder"), sa.tableDegree(byKey.readIntent, "partial")], ["critical", "fumble", "blunder", "partial"]);
equal("C2 negatives are 0; Interpret Style halves rounding up", [sa.positiveBonus(-2), sa.positiveBonus(3), sa.halfRoundedUp(3), sa.halfRoundedUp(1), sa.halfRoundedUp(-1)], [0, 3, 2, 1, 0]);
const turns = [{ id: "a" }, { id: "b" }, { id: "c" }];
const at = (turn) => ({ round: 4, turn, turns });
equal("C3 the next turn: this round if still to come, the next if acting now or done", [sa.nextTurnRound(at(0), (c) => c.id === "c"), sa.nextTurnRound(at(2), (c) => c.id === "c"), sa.nextTurnRound(at(2), (c) => c.id === "a"), sa.nextTurnRound(at(0), (c) => c.id === "z")], [4, 5, 5, 5]);
const inC = { inCombat: true, combatId: "C", nextRound: 5, worldTime: 1000 };
equal("C4 the clocks: a turn start, a turn end, the world clock out of combat", [sa.expiryFlags("startOfNextTurn", inC), sa.expiryFlags("endOfNextTurn", inC), sa.expiryFlags("startOfNextTurn", { inCombat: false, worldTime: 1000 }), sa.expiryFlags({ seconds: 3600 }, inC)], [
  { system: { conditionExpiresRound: 6 }, module: { combatId: "C", endsAtTurnStart: { combatId: "C", round: 5 } } },
  { system: {}, module: { combatId: "C", endsAfterTurn: { combatId: "C", round: 5 } } },
  { system: { spellEffect: true, spellEffectEnd: 1006 }, module: {} },
  { system: { spellEffect: true, spellEffectEnd: 4600 }, module: {} }]);
equal("C5 a turn end ends it only in that combat, from that round", [sa.endsWithTurn({ combatId: "C", round: 5 }, { id: "C", round: 4 }), sa.endsWithTurn({ combatId: "C", round: 5 }, { id: "C", round: 5 }), sa.endsWithTurn({ combatId: "C", round: 5 }, { id: "D", round: 9 })], [false, true, false]);
const turnLock = { combatId: "C", round: 5, turn: 1 };
equal("C6 a lockout to your next turn holds until that turn starts, and ends with the combat", [sa.lockoutActive(turnLock, { combat: { id: "C", round: 4, turn: 2 } }), sa.lockoutActive(turnLock, { combat: { id: "C", round: 5, turn: 0 } }), sa.lockoutActive(turnLock, { combat: { id: "C", round: 5, turn: 1 } }), sa.lockoutActive(turnLock, { combat: null })], [true, true, false, false]);
equal("C6 ten minutes on the world clock; a daily preparation lock holds until lifted", [sa.lockoutActive({ worldTime: 600 }, { worldTime: 599 }), sa.lockoutActive({ worldTime: 600 }, { worldTime: 600 }), sa.lockoutActive({ prep: true }, { worldTime: 1e9 })], [true, false, true]);
const usesMax = (i) => i.max, usesLeft = (i) => i.left;
equal("C6 a creature's uuid is a flag key with no dots (Foundry reads a dot as a path)", [sa.flagKey("Scene.s.Token.t.Actor.a"), sa.lockoutKey("observeTechnique", "Actor.abc")], ["Scene_s_Token_t_Actor_a", "observeTechnique:Actor_abc"]);
equal("C7 an expended Focus ability: Focus trait, a tracked use, fewer left than the most", [
  sa.expendedFocus([{ system: { traits: "Concentrate, Focus" }, max: 1, left: 0 }], usesMax, usesLeft),
  sa.expendedFocus([{ system: { traits: "Focus" }, max: 1, left: 1 }], usesMax, usesLeft),
  sa.expendedFocus([{ system: { traits: "Concentrate" }, max: 1, left: 0 }], usesMax, usesLeft),
  sa.expendedFocus([{ system: { traits: "Focus" }, max: null, left: 0 }], usesMax, usesLeft)], [true, false, false, false]);
equal("C8 Elemental Ward by degree: 8 h, 1 h, 10 min; a Blunder's weakness; the two lockouts", ["heroic", "critical", "success", "partial", "failure", "fumble", "blunder"].map((d) => sa.elementalWardPlan(d)), [
  { seconds: 28800, weakness: false, lock: null }, { seconds: 3600, weakness: false, lock: null }, { seconds: 600, weakness: false, lock: null },
  { seconds: 0, weakness: false, lock: null }, { seconds: 0, weakness: false, lock: { seconds: 600 } }, { seconds: 0, weakness: false, lock: { prep: true } }, { seconds: 600, weakness: true, lock: null }]);

/* ------------------------------------------------------------------ *
 * D. Each effect, read by the system
 * ------------------------------------------------------------------ */

const asEffect = (data, id = "E1") => ({ id, name: data.name, flags: data.flags, disabled: false });
const entries = (data) => cond.collectConditionals([], [asEffect(data)]);
const reaches = (data, context) => cond.conditionalRows(entries(data), context).map((r) => [r.value, r.auto]);
const defence = (data, against, actionKey, uuid = "") => ddc.defenceDCBonus({ items: [], appliedEffects: [asEffect(data)] }, against, actionKey, [], uuid).total;
const spentBy = (data, event) => oa.oneAttackUsedBy(oa.oneAttackSpec(data.flags["trg-prime"].oneAttack), event);
const T = { uuid: "Scene.s.Token.t.Actor.foe", name: "Foe" };
const exp = sa.expiryFlags("startOfNextTurn", inC);

const ev = sa.evadeEffect(3, exp);
equal("D1 Evade: +N dodge on DB, spent by the next attack of any kind, gone at your turn otherwise", [ev.changes, spentBy(ev, { kind: "spell" }), spentBy(ev, { kind: "action", actionKey: "shoveAttack" }), ev.flags["trg-inner-tempest"].endsAtTurnStart.round], [[{ key: "system.combat.defence.dodge", type: "custom", value: "3", priority: 20 }], true, false, 5]);
const is = sa.interpretStyleEffect(2, T, ["st1"], { system: {}, module: { combatId: "C" } });
equal("D2 Interpret Style: AB against that creature only, applied; DB against its attacks only", [reaches(is, { checkType: "attack", targetUuid: T.uuid }), reaches(is, { checkType: "attack", targetUuid: "Actor.other" }), defence(is, "defence", "", T.uuid), defence(is, "defence", "", "Actor.other")], [[[2, true]], [], 2, 0]);
equal("D2 …it records the stance it watches", is.flags["trg-inner-tempest"].interpretStyle, { targetUuid: T.uuid, stanceIds: ["st1"] });
const rb = sa.rootTheBodyEffect(2, exp);
equal("D3 Root the Body: a Shove's DC and a Trip's (rolled against two DCs) rise; a Grapple's does not", [defence(rb, "fortitudeDC", "shoveAttack"), defence(rb, ["skillDC:acrobatics", "fortitudeDC"], "tripAttack"), defence(rb, "fortitudeDC", "grappleAttack")], [2, 2, 0]);
equal("D3 …spent by that Shove or Trip and nothing else; offered unticked on a save or check", [spentBy(rb, { kind: "action", actionKey: "tripAttack" }), spentBy(rb, { kind: "weapon" }), reaches(rb, { checkType: "save", subject: "reflex" }), reaches(rb, { checkType: "attack" })], [true, false, [[2, false]], []]);
const cb = sa.centredBalanceEffect(3, exp);
equal("D4 Centred Balance: the six skills, applied, once; not Stealth", [reaches(cb, { checkType: "skill", subject: "climbing" }), reaches(cb, { checkType: "skill", subject: "senseMotive" }), reaches(cb, { checkType: "skill", subject: "stealth" }), entries(cb)[0].oneShot], [[[3, true]], [[3, true]], [], true]);
const gb = sa.guideTheBreathEffect(2, "Guide", sa.expiryFlags("endOfNextTurn", inC));
equal("D5 Guide the Breath: the next Refocus only, applied, once, ending with the ally's next turn", [reaches(gb, { checkType: "skill", subject: "meditation", actionKey: "refocus" }), reaches(gb, { checkType: "skill", subject: "meditation", actionKey: "clearMind" }), entries(gb)[0].oneShot, gb.flags["trg-inner-tempest"].endsAfterTurn], [[[2, true]], [], true, { combatId: "C", round: 5 }]);
const shc = sa.steadyHeartEffect("critical", exp), shp = sa.steadyHeartEffect("partial", exp);
equal("D6 Steady Heart: saves against Emotion or Fear applied; an untagged save offered; an attack untouched", [reaches(shc, { checkType: "save", subject: "will", traits: "Fear, Mental" }), reaches(shc, { checkType: "save", subject: "will", traits: "" }), reaches(shc, { checkType: "attack" })], [[[2, true]], [[2, false]], []]);
equal("D6 …the Critical lasts to your next turn, the Partial is one save", [entries(shc).map((e) => e.oneShot), entries(shp).map((e) => e.oneShot)], [[false, false], [true, true]]);
const rd = sa.resistDyingEffect(3);
equal("D7 Resist Dying: the next Dying Check (its 3.666.0 scope), applied, once; no other flat check or save", [reaches(rd, { checkType: "flat", actionKey: "dyingCheck" }), reaches(rd, { checkType: "flat" }), reaches(rd, { checkType: "save", subject: "fortitude" }), entries(rd)[0].oneShot], [[[3, true]], [], [], true]);
const mcs = sa.maintainClarityEffect("critical", exp), mcf = sa.maintainClarityEffect("fumble", exp);
equal("D8 Maintain Clarity: offered (a tick) on Concentrate and Mental checks; the Fumble's −1 applied", [reaches(mcs, { checkType: "skill", traits: "Concentrate" }), reaches(mcs, { checkType: "skill", traits: "Manipulate" }), reaches(mcf, { checkType: "cast", traits: "Mental, Fire" }), sa.maintainClarityEffect("failure", exp)], [[[4, false]], [], [[-1, true]], null]);
equal("D8 4, 2 and 1 by degree", ["critical", "success", "partial"].map((d) => entries(sa.maintainClarityEffect(d, exp))[0].value), [4, 2, 1]);
const stm = sa.steelTheMindEffect(2, exp);
equal("D9 Steel the Mind: a Will save against Emotion or Mental applied, an untagged Will save offered, a Fortitude save untouched", [reaches(stm, { checkType: "save", subject: "will", traits: "Emotion" }), reaches(stm, { checkType: "save", subject: "will" }), reaches(stm, { checkType: "save", subject: "fortitude", traits: "Emotion" })], [[[2, true]], [[2, false]], []]);
const ot = sa.observeTechniqueEffect(T, sa.expiryFlags("endOfNextTurn", inC));
equal("D10 Observe Technique: DB against that creature, spent by its attack only; a save against it offered", [defence(ot, "defence", "", T.uuid), spentBy(ot, { kind: "weapon", attackerUuid: T.uuid }), spentBy(ot, { kind: "weapon", attackerUuid: "Actor.other" }), reaches(ot, { checkType: "save", sourceUuid: T.uuid }), reaches(ot, { checkType: "save", sourceUuid: "Actor.other" })], [2, true, false, [[2, false]], []]);
const ri = (d, c) => sa.readIntentEffect(d, T, c, exp);
equal("D11 Read Intent: Critical DB and saves +2; Success the one chosen; Partial DB +1; Fumble DB −1; Failure nothing", [
  [defence(ri("critical"), "defence", "", T.uuid), reaches(ri("critical"), { checkType: "save", sourceUuid: T.uuid })],
  [defence(ri("success", "db"), "defence", "", T.uuid), reaches(ri("success", "db"), { checkType: "save", sourceUuid: T.uuid })],
  [defence(ri("success", "saves"), "defence", "", T.uuid), reaches(ri("success", "saves"), { checkType: "save", sourceUuid: T.uuid })],
  [defence(ri("partial"), "defence", "", T.uuid), defence(ri("fumble"), "defence", "", T.uuid), defence(ri("fumble"), "defence", "", "Actor.other")],
  ri("failure")], [[2, [[2, true]]], [2, []], [0, [[2, true]]], [1, -1, 0], null]);
ok("D11 the Critical's flanking clause is said, as ruled (described on the card)", /cannot provide flanking against you/.test(ri("critical").description));
const all = [ev, is, rb, cb, gb, shc, shp, rd, mcs, mcf, stm, ot, ri("critical"), ri("fumble")];
ok("D12 every effect names the action that made it, and every declaration normalises", all.every((d) => d.flags["trg-inner-tempest"].skillAction && (d.flags["trg-prime"].conditionals ?? []).every((c, i) => cond.normaliseConditional(c, { id: "x" }, i)) && (d.flags["trg-prime"].defenceDC ?? []).every((r) => ddc.normaliseDefenceDC(r, { id: "x" }))));

/* ------------------------------------------------------------------ *
 * E. The automations, against fakes
 * ------------------------------------------------------------------ */

let nextId = 0;
const record = { cards: [], warns: [], moves: [], tags: [], wards: [], relayed: [], reduced: [], resolved: [] };
function fakeActor(name, { feats = [], items = [], frightened = 0, x = 0, speed = 30 } = {}) {
  const flags = {};
  const effects = [];
  effects.get = (id) => effects.find((e) => e.id === id);
  const all = [...feats.map((n) => ({ name: n, type: "feat", system: {} })), ...items];
  const actor = {
    name, uuid: `Actor.${name}`, id: name, documentName: "Actor", isOwner: true, items: all, effects, frightened,
    system: { combat: { movement: { land: { total: speed } } }, resources: { reactions: { value: 1 } } },
    token: { center: { x, y: 0 }, document: { width: 1 } },
    getActiveTokens: () => [actor.token],
    // AS FOUNDRY STORES A FLAG: a dot in a key is a path (0.3.1 — a uuid key
    // was split into nested objects live, and the plain-object fake missed it).
    getFlag: (s, k) => flags[s]?.[k], setFlag: async (s, k, v) => { (flags[s] ??= {})[k] = foundryExpand(v); }, unsetFlag: async (s, k) => { delete flags[s]?.[k]; },
    update: async (data) => { for (const [path, value] of Object.entries(data)) { const parts = path.split("."); let o = actor; for (const p of parts.slice(0, -1)) o = o[p] ??= {}; o[parts.at(-1)] = value; } },
    hasCondition: (k) => k === "frightened" && actor.frightened > 0,
    getConditionValue: (k) => (k === "frightened" ? actor.frightened : 0),
    createEmbeddedDocuments: async (type, list) => { if (type === "Item") { all.push(...list); return list; } for (const d of list) effects.push(wrap(d)); return list; },
    deleteEmbeddedDocuments: async (type, ids) => { if (type === "Item") { for (const id of ids) all.splice(all.findIndex((i) => i.id === id), 1); return; } for (const id of ids) effects.splice(effects.findIndex((e) => e.id === id), 1); }
  };
  return actor;
}
function foundryExpand(v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return v;
  const out = {};
  for (const [key, value] of Object.entries(v)) {
    const parts = key.split(".");
    let o = out;
    for (const p of parts.slice(0, -1)) o = o[p] ??= {};
    o[parts.at(-1)] = foundryExpand(value);
  }
  return out;
}
function wrap(d) {
  const e = { ...d, id: `e${++nextId}` };
  e.getFlag = (s, k) => e.flags?.[s]?.[k];
  return e;
}
let choose = null;
const combat = { started: true, id: "C", round: 2, turn: 0, turns: [], combatants: [] };
globalThis.foundry = { utils: { randomID: () => `r${++nextId}` } };
globalThis.ui = { notifications: { warn: (m) => record.warns.push(m) } };
globalThis.canvas = { dimensions: { distance: 5 }, grid: { measurePath: ([a, b]) => ({ distance: Math.hypot(a.x - b.x, a.y - b.y) / 100 * 5 }) } };
globalThis.ChatMessage = { create: async (d) => record.cards.push(d), getSpeaker: () => ({}) };
globalThis.game = {
  combat, time: { worldTime: 1000 }, user: { id: "u1" }, users: { activeGM: { isSelf: true } }, actors: [], scenes: [],
  trgPrime: { modules: { helpers: {
    line: (s) => s,
    postCard: async (actor, title, lines) => { record.cards.push([title, ...lines].join(" ")); },
    bonusCheckModifier: (d) => res.bonusCheckModifier(d),
    createEffectsOn: async (target, list) => { record.relayed.push(target.name); for (const d of list) target.effects.push(wrap(d)); return list; },
    armMove: async (actor, leg, label) => { record.moves.push([actor.name, leg.maxFeet, label]); },
    applyConditionTags: async (actor, tags) => { record.tags.push([actor.name, tags.map((t) => t.key)]); },
    reduceCondition: async (actor, key, by) => { const from = actor.frightened; actor.frightened = Math.max(0, from - by); record.reduced.push([key, by]); return { from, to: actor.frightened, floor: 0 }; },
    chooseFromList: async () => choose,
    placeWardZone: async (actor, opts) => { record.wards.push(opts); return { id: "region" }; },
    activeStances: (actor) => (actor.stances ?? []).map((id) => ({ id })),
    itemUsesMax: (i) => i.max ?? null, itemUsesRemaining: (i) => i.left ?? 0,
    get skillActions() { return SKILL_ACTIONS; },
    resolveAction: async (actor, action) => { record.resolved.push(action.key); (record.resolvedCost ??= []).push(action.apCost); return { total: 15 }; }
  } } }
};
const me = fakeActor("Monk", { feats: ["Inner Discipline", "Inner Balance", "Elemental Warding"], x: 0 });
const ally = fakeActor("Ally", { x: 100, items: [{ id: "f1", name: "Void Step", type: "ability", system: { traits: "Focus, Movement" }, max: 1, left: 0 }] });
const foe = fakeActor("Foe", { x: 500 });
const far = fakeActor("Far", { x: 800 });
foe.stances = ["st9"];
combat.turns = [{ actor: me, actorId: me.id }, { actor: foe, actorId: foe.id }, { actor: ally, actorId: ally.id }];
combat.combatants = combat.turns;
const act = (key) => byKey[key];
const attempt = (key, targetActor = null, actor = me) => sa.onActionAttempt({ actor, action: act(key), targetActor });
const resolve = (key, degree, targetActor = null, actor = me) => sa.onActionResolved({ actor, action: act(key), degree, targetActor });
const mine = (actor, key) => actor.effects.filter((e) => e.flags?.["trg-inner-tempest"]?.skillAction === key);

const novice = fakeActor("Novice");
equal("E1 the feat a Requirement names is enforced in the workflow, not only on the sheet", [attempt("evade", null, novice), attempt("evade"), record.warns.pop()], [false, true, "Evade: requires the Inner Discipline feat."]);
equal("E1 an action aimed at a creature refuses with none targeted", [attempt("interpretStyle"), attempt("observeTechnique"), attempt("readIntent"), attempt("guideTheBreath")], [false, false, false, false]);
record.warns.length = 0;
equal("E2 Guide the Breath: not on yourself (even with a Focus ability spent); only on an ally with one; within 10 ft", [attempt("guideTheBreath", ally, ally), attempt("guideTheBreath", foe), attempt("guideTheBreath", ally)], [false, false, true]);
ally.token.center.x = 400;
equal("E2 …refused at 15 ft", [attempt("guideTheBreath", ally), record.warns.at(-1)], [false, "Guide the Breath: Ally is 20 ft away (10 ft at most)."]);
ally.token.center.x = 100;
equal("E3 Read Intent: within 30 ft only", [attempt("readIntent", foe), attempt("readIntent", far)], [true, false]);

await resolve("evade", null);
equal("E4 nothing happens while the GM's DC is unset (the hook fires again with the degree)", [me.effects.length, record.cards.length], [0, 0]);
await resolve("evade", "critical");
await resolve("evade", "heroic");
equal("E4 Evade: one dodge effect (a second replaces the first), worth the Bonus Check, ending as your next turn begins", [mine(me, "evade").length, mine(me, "evade")[0].changes[0].value, mine(me, "evade")[0].flags["trg-inner-tempest"].endsAtTurnStart.round, mine(me, "evade")[0].flags["trg-prime"].conditionExpiresRound], [1, "4", 3, 4]);
await sa.onTurnEnded({ actor: foe, combat: { id: "C", round: 3, turn: 2, combatant: { actor: ally } } });
const evadeKept = mine(me, "evade").length;
await sa.onTurnEnded({ actor: ally, combat: { id: "C", round: 3, turn: 0, combatant: { actor: me } } });
equal("E4 …gone as that turn begins (round 3, its own turn), not at another's", [evadeKept, mine(me, "evade").length], [1, 0]);
await resolve("evade", "heroic");
await resolve("evade", "fumble");
equal("E4 a negative Bonus Check gives nothing and leaves the earlier dodge", [mine(me, "evade").length, /No bonus/.test(record.cards.at(-1))], [1, true]);

await resolve("interpretStyle", "critical", foe);
await resolve("interpretStyle", "success", foe);
equal("E5 Interpret Style: one instance, its bonus halved (rounded up), the target's stance recorded", [mine(me, "interpretStyle").length, mine(me, "interpretStyle")[0].flags["trg-prime"].conditionals[0].value, mine(me, "interpretStyle")[0].flags["trg-inner-tempest"].interpretStyle.stanceIds], [1, 1, ["st9"]]);
game.actors = [me];
await sa.onEffectDeleted({ id: "other", parent: foe, statuses: new Set() });
const kept = mine(me, "interpretStyle").length;
await sa.onEffectDeleted({ id: "st9", parent: foe, statuses: new Set() });
equal("E5 …it ends when that stance ends, and not when another effect does", [kept, mine(me, "interpretStyle").length], [1, 0]);
await resolve("interpretStyle", "critical", foe);
await sa.onCombatDeleted({ id: "C" });
equal("E5 …and when the battle ends", mine(me, "interpretStyle").length, 0);

await resolve("rootTheBody", "success");
equal("E6 Root the Body: +2 on Shove and Trip DCs, ending at your next turn", [mine(me, "rootTheBody")[0].flags["trg-prime"].defenceDC[0].value, mine(me, "rootTheBody")[0].flags["trg-prime"].oneAttack], [2, { actions: ["shoveAttack", "tripAttack"] }]);

record.moves.length = 0;
for (const d of ["heroic", "success", "partial", "failure"]) await resolve("wallRun", d);
await resolve("wallRun", "blunder");
equal("E7 Wall Run: Speed, half, 10 ft, nothing; a Blunder reads as the Fumble and knocks you prone", [record.moves.map((m) => m[1]), record.tags.at(-1)], [[30, 15, 10], ["Monk", ["prone"]]]);

await resolve("recogniseDiscipline", "blunder", foe);
equal("E8 Recognise Discipline: a Fumble locks that creature out for 10 minutes, not others", [attempt("recogniseDiscipline", foe), attempt("recogniseDiscipline", ally)], [false, true]);
game.time.worldTime = 1600;
equal("E8 …and lifts after them", attempt("recogniseDiscipline", foe), true);

await resolve("centredBalance", "critical");
equal("E9 Centred Balance: +3 on the next of the six skills, a minute on the world clock", [mine(me, "centredBalance")[0].flags["trg-prime"].conditionals[0].value, mine(me, "centredBalance")[0].flags["trg-prime"].spellEffectEnd], [3, 1660]);

await resolve("guideTheBreath", "success", ally);
equal("E10 Guide the Breath: +2 on the ally's next Refocus, laid through the relay, ending with the ally's next turn", [mine(ally, "guideTheBreath")[0].flags["trg-prime"].conditionals[0].value, record.relayed.at(-1), mine(ally, "guideTheBreath")[0].flags["trg-inner-tempest"].endsAfterTurn], [2, "Ally", { combatId: "C", round: 2 }]);
await sa.onTurnEnded({ actor: ally, combat: { id: "C", round: 1 } });
const stillThere = mine(ally, "guideTheBreath").length;
await sa.onTurnEnded({ actor: ally, combat: { id: "C", round: 2 } });
equal("E10 …gone when that turn ends, not before", [stillThere, mine(ally, "guideTheBreath").length], [1, 0]);

me.frightened = 3;
await resolve("steadyHeart", "critical");
equal("E11 Steady Heart Critical: frightened −2, and the saves bonus to your next turn", [me.frightened, mine(me, "steadyHeart").length, mine(me, "steadyHeart")[0].flags["trg-prime"].conditionals[0].oneShot], [1, 1, false]);
await resolve("steadyHeart", "success");
await resolve("steadyHeart", "partial");
equal("E11 Success −1; Partial no reduction but one save's +2 (replacing the Critical's)", [me.frightened, mine(me, "steadyHeart").length, mine(me, "steadyHeart")[0].flags["trg-prime"].conditionals[0].oneShot], [0, 1, true]);
await resolve("steadyHeart", "fumble");
equal("E11 Fumble: no Steady Heart until your next turn", attempt("steadyHeart"), false);
combat.round = 3;
equal("E11 …which comes", attempt("steadyHeart"), true);

await resolve("resistDying", "success");
equal("E12 Resist Dying: +2 on the next Dying Check", mine(me, "resistDying")[0].flags["trg-prime"].conditionals[0].value, 2);
await sa.onEffectDeleted({ id: "dy", parent: me, statuses: new Set(["dying"]) });
equal("E12 …gone with the dying condition if unused", mine(me, "resistDying").length, 0);
const gmOnly = { ...game.users };
game.users = Object.assign([], { activeGM: { isSelf: true } });
await sa.offerResistDying({ parent: me, statuses: new Set(["dying"]) });
const offered = record.cards.at(-1);
await sa.offerResistDying({ parent: novice, statuses: new Set(["dying"]) });
equal("E12 gaining the dying condition offers the Reaction to a holder of Inner Discipline, and to no one else", [/data-it-action="resistDying"/.test(offered?.content ?? ""), record.cards.at(-1) === offered], [true, true]);
game.users = gmOnly;
const msg = { flags: { "trg-inner-tempest": offered.flags["trg-inner-tempest"] }, getFlag: (s, k) => msg.flags[s][k], setFlag: async (s, k, v) => { msg.flags[s][k] = v; } };
globalThis.fromUuid = async () => me;
me.system.resources.reactions.value = 0;
const refused = await sa.pressResistDying(msg);
equal("E12 with no reaction left in combat, the button is refused and stays usable", [refused, record.resolved, msg.flags["trg-inner-tempest"].resistDying.used], [false, [], false]);
me.system.resources.reactions.value = 1;
const pressed = await sa.pressResistDying(msg);
const reactionAfter = me.system.resources.reactions.value;
me.system.resources.reactions.value = 1;
const again = await sa.pressResistDying(msg);
me.system.resources.reactions.value = 0;
equal("E12 its button rolls the action at the trigger (no flat-footed refusal), spends the reaction itself, once", [pressed, reactionAfter, again, record.resolved, record.resolvedCost, msg.flags["trg-inner-tempest"].resistDying.used], [true, 0, false, ["resistDying"], ["0"], true]);

await resolve("maintainClarity", "success");
equal("E13 Maintain Clarity: 2 offered", mine(me, "maintainClarity")[0].flags["trg-prime"].conditionals[0].value, 2);
await resolve("maintainClarity", "fumble");
equal("E13 …a Fumble replaces it with the −1, applied", [mine(me, "maintainClarity").length, mine(me, "maintainClarity")[0].flags["trg-prime"].conditionals[0]], [1, { kind: "modifier", value: -1, type: "circumstance", label: "Maintain Clarity (Fumble)", scope: "Concentrate and Mental actions", auto: true, when: { traits: ["concentrate", "mental"] } }]);

await resolve("steelTheMind", "heroic");
equal("E14 Steel the Mind: +4 on the triggering Will save", mine(me, "steelTheMind")[0].flags["trg-prime"].conditionals.map((c) => c.value), [4, 4]);

choose = "cold";
await resolve("elementalWard", "critical");
equal("E15 Elemental Ward Critical: the element chosen, a ward of resistance for an hour", record.wards.at(-1), { label: "Elemental Ward", damageType: "cold", weakness: false, seconds: 3600 });
await resolve("elementalWard", "blunder");
equal("E15 a Blunder's ward grants weakness", record.wards.at(-1).weakness, true);
const wardsBefore = record.wards.length;
await resolve("elementalWard", "partial");
equal("E15 a Partial draws nothing and locks nothing", [record.wards.length, attempt("elementalWard")], [wardsBefore, true]);
await resolve("elementalWard", "failure");
equal("E15 a Failure: not for 10 minutes", attempt("elementalWard"), false);
game.time.worldTime += 600;
await resolve("elementalWard", "fumble");
const lockedTillPrep = attempt("elementalWard");
game.time.worldTime += 1e6;
const stillLocked = attempt("elementalWard");
await sa.onDailyPreparation({ actor: me });
equal("E15 a Fumble: not until your next daily preparation, however long that is", [lockedTillPrep, stillLocked, attempt("elementalWard")], [false, false, true]);
choose = null;
const noChoice = record.wards.length;
await resolve("elementalWard", "success");
equal("E15 no element chosen, no ward", record.wards.length, noChoice);

await resolve("readTheElements", "critical");
const tracking = me.items.find((i) => i.name === sa.ELEMENTAL_TRACKING);
const trackingClock = mine(me, "readTheElements")[0];
equal("E16 Read the Elements Critical: an hour's Elemental Tracking, removed with its world-clock effect (shared cast id)", [tracking?.type, tracking?.flags["trg-prime"].endsWithSpell, tracking?.flags["trg-prime"].castId === trackingClock?.flags["trg-prime"].castId, trackingClock?.flags["trg-prime"].spellEffectEnd - game.time.worldTime], ["ability", true, true, 3600]);

await resolve("observeTechnique", "critical", foe);
equal("E17 Observe Technique Critical: the effect against that creature, ending with your next turn", [mine(me, "observeTechnique")[0].flags["trg-prime"].oneAttack.fromUuids, mine(me, "observeTechnique")[0].flags["trg-inner-tempest"].endsAfterTurn.round], [[foe.uuid], 4]);
await resolve("observeTechnique", "fumble", foe);
equal("E17 a Fumble locks that creature out until your next turn", [attempt("observeTechnique", foe), attempt("observeTechnique", ally)], [false, true]);

choose = "saves";
await resolve("readIntent", "success", foe);
equal("E18 Read Intent Success: the defence chosen", Object.keys(mine(me, "readIntent")[0].flags["trg-prime"]).filter((k) => k !== "conditionExpiresRound"), ["conditionals"]);
equal("E18 …and only once each round against that creature", [attempt("readIntent", foe), attempt("readIntent", ally)], [false, true]);
combat.round = 4;
await resolve("readIntent", "critical", foe);
equal("E18 the next round, again; a new reading of that creature replaces the old", [mine(me, "readIntent").length, Object.keys(mine(me, "readIntent")[0].flags["trg-prime"]).sort()], [1, ["conditionExpiresRound", "conditionals", "defenceDC"]]);
delete globalThis.game; delete globalThis.ui; delete globalThis.canvas; delete globalThis.ChatMessage; delete globalThis.foundry; delete globalThis.fromUuid;

/* ------------------------------------------------------------------ *
 * F. Wiring, versions, Impact Absorption, the two feats
 * ------------------------------------------------------------------ */

const script = fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8");
ok("F1 trgPrimeActionResolved is answered by onSkillActionResolved, tracked so a reaction can wait for it (0.3.3)", /Hooks\.on\("trgPrimeActionResolved", \(ctx\) => \{ trackActionResolved\(ctx, onSkillActionResolved\(ctx\)\)\.catch\(/.test(script));
for (const [hook, fn] of [["trgPrimeActionAttempt", "onActionAttempt(ctx)"], ["createActiveEffect", "offerResistDying(effect)"], ["trgPrimeTurnEnded", "onTurnEnded(ctx)"], ["deleteCombat", "onCombatDeleted(combat)"], ["deleteActiveEffect", "onEffectDeleted(effect)"], ["trgPrimeDailyPreparation", "onDailyPreparation(ctx)"]]) {
  ok(`F1 ${hook} is answered by ${fn.split("(")[0]}`, new RegExp(`Hooks\\.on\\("${hook}", \\(\\w+\\) => \\{? ?(return )?${fn.replace(/[()]/g, "\\$&")}`).test(script));
}
ok("F1 the attempt handler's answer is returned, so a refusal refuses", /Hooks\.on\("trgPrimeActionAttempt", \(ctx\) => onActionAttempt\(ctx\)\);/.test(script));
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
// THE PIN MOVES WITH EACH BLOCK (re-anchored at 0.4.0, Block 3 on 3.667.0):
// at least 3.666.1, and the script names the manifest's own pin.
{
  const pinned = String(manifest.relationships?.systems?.[0]?.compatibility?.minimum ?? "");
  const [a, b, c] = pinned.split(".").map(Number);
  equal("F2 built for TRG Prime 3.666.1 or later, which carries the seams Block 2 uses and the defence offer", [a > 3 || (a === 3 && (b > 666 || (b === 666 && c >= 1))), script.includes(`const REQUIRED_SYSTEM = "${pinned}";`)], [true, true]);
}
const autoSrc = fs.readFileSync(path.join(ROOT, "module", "automations.mjs"), "utf8");
ok("F3 Impact Absorption lasts one weapon attack, spent by it (Graham: \"fix all three\")", /oneAttack: \{ against: "weapon" \}/.test(autoSrc) && !/const impactAbsorption = \{[\s\S]{0,1500}duration: \{ rounds: 1 \}/.test(autoSrc) && !/delete it once that attack has resolved/.test(autoSrc));
ok("F4 the Resist Dying button is bound, refused once used, and live again after a refused press", /kind === "resistDying" && flags\.resistDying\?\.used/.test(autoSrc) && /else if \(kind === "resistDying" && !\(await pressResistDying\(message\)\)\) button\.disabled = false;/.test(autoSrc));
const { GENERAL_FEATS } = await import("./content/feats-general.mjs");
const featText = Object.fromEntries(GENERAL_FEATS.filter((f) => ["Inner Balance", "Elemental Warding"].includes(f.name)).map((f) => [f.name, f.system.description]));
ok("F5 Inner Balance and Elemental Warding say their action is here now", /Centred Balance appears under Meditation/.test(featText["Inner Balance"]) && /Elemental Ward appears under Nature/.test(featText["Elemental Warding"]) && !/Arrives with Block 2/.test(Object.values(featText).join(" ")));

/* ------------------------------------------------------------------ *
 * G. Evade and Impact Absorption, offered before the attack rolls (0.3.2,
 *    on TRG Prime 3.666.1's defence offer)
 * ------------------------------------------------------------------ */

const dof = await import(sys("module", "combat", "defence-offer.mjs"));
const dfo = await import("../module/defence-offers.mjs");
const offers = [];
reg.registerContent({
  registerSourcebook() {}, registerLanguage() {}, registerRacialPP() {}, registerFeatAutomation() {}, registerPassiveAutomation() {},
  registerSkillSubstitution() {}, registerSkillActions() {}, registerClass() {}, registerFeatGate() {}, registerTraits() {},
  registerDefenceOffer: (name, spec, moduleId) => { offers.push([name, moduleId]); return dof.registerDefenceOffer(name, spec, moduleId); }
}, "trg-inner-tempest");
// BLOCK 2'S TWO (re-anchored at 0.4.0, when Block 3 added Guarded Centre and
// Echo Form, checked in verify-block3): Evade and Impact Absorption.
const inSystem = Object.fromEntries(dof.registeredDefenceOffers().filter((r) => r.moduleId === "trg-inner-tempest" && ["evade", "impact absorption"].includes(r.key)).map((r) => [r.key, r.against]));
equal("G1 both are registered with the system: Evade against any attack, Impact Absorption against a Strike", [offers.map(([n]) => n).filter((n) => ["Evade", "Impact Absorption"].includes(n)), inSystem], [["Evade", "Impact Absorption"], { evade: "attack", "impact absorption": "weapon" }]);
const disciple = { items: [{ type: "feat", name: "Inner Discipline" }] };
equal("G2 Evade is offered to whoever has Inner Discipline, and to nobody else", [dfo.DEFENCE_OFFERS.Evade.find(disciple)?.name ?? null, dfo.DEFENCE_OFFERS.Evade.find({ items: [{ type: "feat", name: "Nimble Dodge" }] })], ["Inner Discipline", null]);
const ran = [];
globalThis.game = { trgPrime: { modules: { helpers: {
  skillActions: [{ key: "evade", name: "Evade (live)" }],
  resolveAction: async (actor, action) => { ran.push([actor, action.name]); return true; },
  itemUsesMax: (item) => item.max, itemUsesRemaining: (item) => item.left
} } } };
await dfo.DEFENCE_OFFERS.Evade.use(disciple);
equal("G3 taking Evade runs the system's own action with the live Evade record", ran, [[disciple, "Evade (live)"]]);
equal("G4 Impact Absorption is held when its Focus use is spent", [dfo.DEFENCE_OFFERS["Impact Absorption"].requires(disciple, { max: 1, left: 0 }), dfo.DEFENCE_OFFERS["Impact Absorption"].requires(disciple, { max: 1, left: 1 })], ["no uses remain — Refocus restores it", null]);
delete globalThis.game;
// G6 (0.3.3, found live): taking Evade waits for this module's own
// resolution, which lays the dodge, before the attack reads the DB.
{
  const order = [];
  let release;
  const slow = new Promise((r) => { release = r; });
  const dodger = { uuid: "Actor.dodger", items: disciple.items };
  globalThis.game = { trgPrime: { modules: { helpers: {
    skillActions: [{ key: "evade", name: "Evade" }],
    resolveAction: async (actor) => { sa.trackActionResolved({ actor }, slow.then(() => order.push("effect laid"))); order.push("roll resolved"); return true; }
  } } } };
  const taking = dfo.DEFENCE_OFFERS.Evade.use(dodger).then(() => order.push("offer returns"));
  await new Promise((r) => setTimeout(r, 20));
  const early = [...order];
  release();
  await taking;
  equal("G6 taking Evade does not return until its dodge is laid, so the attack reads it", [early, order], [["roll resolved"], ["roll resolved", "effect laid", "offer returns"]]);
  delete globalThis.game;
  const after = await Promise.race([sa.actionResolutionSettled(dodger).then(() => "settled"), new Promise((r) => setTimeout(() => r("waited"), 50))]);
  equal("G6 …and once it has settled, nothing is left to wait for", after, "settled");
}
// G7 (0.3.3, found live): Impact Absorption is an ability on the sheet, and
// the system's default lookup finds feats only.
const ryukari = { items: [{ type: "ability", name: "Impact Absorption" }, { type: "ability", name: "Inner Discipline" }] };
equal("G7 Impact Absorption and Inner Discipline are found as abilities as well as feats; nothing else is",
  [dfo.DEFENCE_OFFERS["Impact Absorption"].find(ryukari)?.type, dfo.DEFENCE_OFFERS.Evade.find(ryukari)?.type, dfo.DEFENCE_OFFERS["Impact Absorption"].find({ items: [{ type: "weapon", name: "Impact Absorption" }] })],
  ["ability", "ability", null]);
const cands = [{ key: "evade", label: "Evade", summary: "", against: "attack", has: true }, { key: "impact absorption", label: "Impact Absorption", summary: "", against: "weapon", has: true }];
equal("G5 against a spell only Evade is offered; against a Strike, both", [dof.defenceOffersFor({ candidates: cands, event: { kind: "spell" }, inCombat: true, reactions: 1 }).offered.map((o) => o.key), dof.defenceOffersFor({ candidates: cands, event: { kind: "weapon" }, inCombat: true, reactions: 1 }).offered.map((o) => o.key)], [["evade"], ["evade", "impact absorption"]]);

const EXPECTED = 205;
const total = checks + 1;
if (EXPECTED) equal("Z the suite ran every check it is meant to", total, EXPECTED);
else console.log(`(count: ${total})`);
if (failures.length) { console.log(`verify-block2: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-block2: ${checks} checks — all green.`);
