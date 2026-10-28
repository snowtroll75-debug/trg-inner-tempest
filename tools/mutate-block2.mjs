#!/usr/bin/env node
/**
 * mutate-block2 — the mutation half of verify-block2. Each mutation breaks
 * one printed rule, one ruling or one wire of Chapter 4's skill actions;
 * verify-block2 must fail on every one. Files are restored after each run,
 * and on any exit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const DATA = f("module", "skill-actions.mjs"), SA = f("module", "skill-action-automations.mjs");
const AUTO = f("module", "automations.mjs"), REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs");
const DFO = f("module", "defence-offers.mjs"), SAA = f("module", "skill-action-automations.mjs");
const FEATS = f("tools", "content", "feats-general.mjs"), MANIFEST = f("module.json");

const MUTATIONS = [
  // The defence offer (G, 0.3.2)
  { name: "THE GAP: Evade and Impact Absorption are never offered before the roll", file: REG, from: "  for (const [name, spec] of Object.entries(DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);\n", to: "" },
  { name: "Impact Absorption is offered against a spell", file: DFO, from: "    against: \"weapon\",", to: "    against: \"attack\"," },
  { name: "Evade is offered to anyone", file: DFO, from: "  return ownedByName(actor, EVADE?.requiresFeat ?? \"Inner Discipline\");", to: "  return Array.from(actor?.items ?? [])[0] ?? null;" },
  { name: "LIVE 22 OCT: taking Evade returns before its dodge is laid", file: DFO, from: "      await actionResolutionSettled(actor);\n", to: "" },
  { name: "the resolution is never tracked", file: SCRIPT, from: "trackActionResolved(ctx, onSkillActionResolved(ctx))", to: "onSkillActionResolved(ctx)" },
  { name: "what is remembered is not the resolution itself", file: SAA, from: "  IN_FLIGHT.set(uuid, settled);", to: "  IN_FLIGHT.set(uuid, Promise.resolve());" },
  { name: "LIVE 22 OCT: Impact Absorption, an ability, is never found", file: DFO, from: "    find: (actor) => ownedByName(actor, \"Impact Absorption\"),\n", to: "" },
  { name: "abilities are not read at all", file: DFO, from: "const GRANTING_TYPES = Object.freeze([\"feat\", \"ability\"]);", to: "const GRANTING_TYPES = Object.freeze([\"feat\"]);" },
  { name: "any item of the name will do", file: DFO, from: "find((i) => GRANTING_TYPES.includes(i.type) && norm(i.name) === need)", to: "find((i) => norm(i.name) === need)" },
  { name: "taking Evade runs a stale record", file: DFO, from: "      const action = helpers().skillActions.find((a) => a.key === \"evade\") ?? EVADE;", to: "      const action = EVADE;" },
  { name: "Impact Absorption is offered with no Focus use left", file: DFO, from: "    requires: (actor, item) => (hasUse(item) ? null : \"no uses remain — Refocus restores it\")", to: "    requires: () => null" },
  // The book and the rulings (A)
  { name: "Wall Run's Critical is half Speed", file: DATA, from: "      critical: \"You may move along the surface up to your Speed.\",", to: "      critical: \"You may move along the surface up to half your Speed.\"," },
  { name: "Steady Heart's Fumble row is dropped", file: DATA, from: "      fumble: \"You fail to regain your composure and cannot use Steady Heart again until the beginning of your next turn.\"", to: "      fumble: \"\"" },
  { name: "Evade's Heroic is worth 3", file: DATA, from: "      heroic: \"Bonus Check 4: a dodge bonus of 4 to your DB against the triggering attack.\",", to: "      heroic: \"Bonus Check 4: a dodge bonus of 3 to your DB against the triggering attack.\"," },
  { name: "Interpret Style is not halved", file: DATA, from: "      critical: \"Bonus Check 3 (halved, rounded up): a circumstance bonus of 2 to your AB and DB", to: "      critical: \"Bonus Check 3 (halved, rounded up): a circumstance bonus of 3 to your AB and DB" },
  { name: "Root the Body loses its teleport sentence", file: DATA, from: " Be aware that Root the Body cannot be used against teleportation or other effects that relocate you without physically moving you.", to: "" },
  { name: "Guide the Breath loses its requirement", file: DATA, from: "    requirements: \"the target has at least one expended ability with the Focus trait\",\n", to: "" },
  { name: "Read Intent loses its range", file: DATA, from: "\"Range: 30 feet. Target:", to: "\"Target:" },
  { name: "Resist Dying keeps the book's 1 AP", file: DATA, from: "    key: \"resistDying\",\n    name: \"Resist Dying\",\n    skills: [\"mentalFocus\"],\n    traits: \"Concentrate, Mental\",\n    apCost: \"Reaction\",", to: "    key: \"resistDying\",\n    name: \"Resist Dying\",\n    skills: [\"mentalFocus\"],\n    traits: \"Concentrate, Mental\",\n    apCost: \"1\"," },
  { name: "Wall Run is ungated", file: DATA, from: "    against: \"none\",\n    requiresFeat: \"Inner Discipline\",\n    requirements: \"you have the Inner Discipline feat; you begin", to: "    against: \"none\",\n    requirements: \"you have the Inner Discipline feat; you begin" },
  { name: "Elemental Ward's DC is 15", file: DATA, from: "    fixedDC: 20,", to: "    fixedDC: 15," },
  { name: "Steel the Mind is rolled against the target", file: DATA, from: "    traits: \"Concentrate, Defence, Mental\",\n    apCost: \"Reaction\",\n    checkType: \"skill\",\n    outcomesApplied: true,\n    against: \"selfLevelDC\",", to: "    traits: \"Concentrate, Defence, Mental\",\n    apCost: \"Reaction\",\n    checkType: \"skill\",\n    outcomesApplied: true,\n    against: \"levelDC\"," },
  // The system accepts them (B)
  { name: "Centred Balance's 1 round is −2", file: DATA, from: "{ key: \"round\", label: \"1 round\", modifier: -5, apCost: \"1 round\" }", to: "{ key: \"round\", label: \"1 round\", modifier: -2, apCost: \"1 round\" }" },
  { name: "Elemental Ward defaults to 1 minute", file: DATA, from: "defaultKey: \"tenMinutes\", hint: \"How long do you spend drawing", to: "defaultKey: \"minute\", hint: \"How long do you spend drawing" },
  { name: "Maintain Clarity lets the system read its Fumble too", file: DATA, from: "    key: \"maintainClarity\",\n    name: \"Maintain Clarity\",\n    skills: [\"mentalFocus\"],\n    traits: \"Concentrate, Mental\",\n    apCost: \"1\",\n    checkType: \"skill\",\n    outcomesApplied: true,\n", to: "    key: \"maintainClarity\",\n    name: \"Maintain Clarity\",\n    skills: [\"mentalFocus\"],\n    traits: \"Concentrate, Mental\",\n    apCost: \"1\",\n    checkType: \"skill\",\n" },
  { name: "the actions are never registered", file: REG, from: "  api.registerSkillActions(SKILL_ACTIONS.map((a) => ({ ...a })), moduleId);", to: "" },
  { name: "Read the Elements' tracking opens nothing", file: REG, from: "  [ELEMENTAL_TRACKING]: [{ action: \"track\", skill: \"nature\" }]", to: "  [ELEMENTAL_TRACKING]: [{ action: \"track\", skill: \"survival\" }]" },
  // Pure decisions (C)
  { name: "a Blunder reads its own empty row", file: SA, from: "  blunder: [\"blunder\", \"fumble\", \"failure\"]", to: "  blunder: [\"blunder\", \"failure\"]" },
  { name: "negatives subtract", file: SA, from: "  return Math.max(0, Math.trunc(Number(value) || 0));", to: "  return Math.trunc(Number(value) || 0);" },
  { name: "halved rounding down", file: SA, from: "  return Math.ceil(positiveBonus(value) / 2);", to: "  return Math.floor(positiveBonus(value) / 2);" },
  { name: "the next turn is always next round", file: SA, from: "  return index > Number(combat?.turn ?? 0) ? round : round + 1;", to: "  return round + 1;" },
  { name: "out of combat it lasts for ever", file: SA, from: "  return { system: { spellEffect: true, spellEffectEnd: Math.trunc(Number(now?.worldTime ?? 0)) + seconds }, module: {} };", to: "  return { system: {}, module: {} };" },
  { name: "a turn end in any combat ends it", file: SA, from: "  return String(flag.combatId) === String(combat.id) && Number(combat.round ?? 0) >= Number(flag.round);", to: "  return Number(combat.round ?? 0) >= Number(flag.round);" },
  { name: "a turn lockout outlives its turn", file: SA, from: "    return round < Number(record.round) || (round === Number(record.round) && turn < Number(record.turn));", to: "    return round <= Number(record.round);" },
  { name: "a daily-preparation lock lifts by itself", file: SA, from: "  if (record.prep) return true;\n", to: "" },
  { name: "any Focus ability counts as expended", file: SA, from: "    return Number(usesLeft(item)) < Number(max);", to: "    return true;" },
  { name: "the Blunder's ward is resistance", file: SA, from: "    weakness: degree === \"blunder\",", to: "    weakness: false," },
  // Effects (D)
  { name: "Evade lasts beyond its attack", file: SA, from: "    system: { oneAttack: true },\n", to: "" },
  { name: "Interpret Style's AB reaches everyone", file: SA, from: "auto: true, when: { checkTypes: [\"attack\"], targetUuids: [target.uuid] } }],", to: "auto: true, when: { checkTypes: [\"attack\"] } }]," },
  { name: "Root the Body raises a Grapple's DC", file: SA, from: "export const ROOT_ACTIONS = Object.freeze([\"shoveAttack\", \"tripAttack\"]);", to: "export const ROOT_ACTIONS = Object.freeze([\"shoveAttack\", \"tripAttack\", \"grappleAttack\"]);" },
  { name: "Centred Balance reaches Stealth", file: SA, from: "export const CENTRED_SKILLS = Object.freeze([\"acrobatics\", \"athletics\", \"climbing\", \"mentalFocus\", \"perception\", \"senseMotive\"]);", to: "export const CENTRED_SKILLS = Object.freeze([\"acrobatics\", \"athletics\", \"climbing\", \"mentalFocus\", \"perception\", \"senseMotive\", \"stealth\"]);" },
  { name: "Guide the Breath lasts beyond one Refocus", file: SA, from: "label: \"Guide the Breath\", scope: \"Your next Refocus check\", auto: true, oneShot: true,", to: "label: \"Guide the Breath\", scope: \"Your next Refocus check\", auto: true," },
  { name: "Steady Heart's untagged twin is applied unasked", file: SA, from: "    { kind: \"modifier\", value, type, label, scope: unsure, auto: false, oneShot, when: { ...when, not: { [axis]: values } } }", to: "    { kind: \"modifier\", value, type, label, scope: unsure, auto: true, oneShot, when: { ...when, not: { [axis]: values } } }" },
  { name: "Resist Dying reaches every flat check", file: SA, from: "auto: true, oneShot: true, when: { actions: [\"dyingCheck\"] } }]", to: "auto: true, oneShot: true, when: { checkTypes: [\"flat\"] } }]" },
  { name: "Maintain Clarity's points are applied unasked", file: SA, from: "of a distraction penalty — tick when one applies, and no more than that penalty`, auto: false,", to: "of a distraction penalty — tick when one applies, and no more than that penalty`, auto: true," },
  { name: "Steel the Mind reaches Fortitude", file: SA, from: "when: { checkTypes: [\"save\"], subjects: [\"will\"] }, axis: \"traits\", values: [\"emotion\", \"mental\"]", to: "when: { checkTypes: [\"save\"] }, axis: \"traits\", values: [\"emotion\", \"mental\"]" },
  { name: "Observe Technique is spent by anyone's attack", file: SA, from: "      oneAttack: { against: \"attack\", fromUuids: [target.uuid] },", to: "      oneAttack: { against: \"attack\" }," },
  { name: "Read Intent's Success ignores the choice", file: SA, from: "  else if (degree === \"success\" && choice === \"saves\") { saves(2); summary = `+2 saves vs ${name}`; }\n", to: "" },
  { name: "Read Intent's Fumble is a bonus", file: SA, from: "  else if (degree === \"fumble\") { db(-1);", to: "  else if (degree === \"fumble\") { db(1);" },
  { name: "the flanking clause is not said", file: SA, from: "${degree === \"critical\" ? ` ${name} cannot provide flanking against you during this time.` : \"\"}", to: "" },
  // Automations (E)
  { name: "the feat is left to the sheet", file: SA, from: "  if (own?.requiresFeat && !ownsName(actor, own.requiresFeat)) return warn(`${own.name}: requires the ${own.requiresFeat} feat.`);\n", to: "" },
  { name: "a targeted action runs with no target", file: SA, from: "  if (NEEDS_TARGET.includes(key) && !targetActor) return warn(`${own.name}: target the creature first.`);\n", to: "" },
  { name: "Guide the Breath on yourself", file: SA, from: "    if (targetActor === actor || targetActor?.uuid === actor.uuid) return warn(\"Guide the Breath: you cannot use it upon yourself.\");\n", to: "" },
  { name: "Guide the Breath at any range", file: SA, from: "    if (feet !== null && feet > 10) return warn(", to: "    if (feet !== null && feet > 100) return warn(" },
  { name: "Read Intent at any range", file: SA, from: "    if (feet !== null && feet > 30) return warn(", to: "    if (feet !== null && feet > 300) return warn(" },
  { name: "Read Intent twice a round", file: SA, from: "      if ((actor.getFlag?.(MODULE_ID, READ_INTENT_FLAG) ?? {})[flagKey(targetActor.uuid)] === stamp) return warn(", to: "      if (false) return warn(" },
  { name: "THE LIVE DEFECT: a uuid key is split by its dots", file: SA, from: "  return String(text ?? \"\").replace(/\\./g, \"_\");", to: "  return String(text ?? \"\");" },
  { name: "the turn-start sweep never runs", file: SA, from: "  if (starting.length) await next.deleteEmbeddedDocuments(\"ActiveEffect\", starting);", to: "" },
  { name: "THE LIVE DEFECT: a turn's effect ends at the round, before the bearer's turn", file: SA, from: "    return { system: { conditionExpiresRound: Number(now.nextRound) + 1 }, module: { combatId, [TURN_START_FLAG]: { combatId, round: Number(now.nextRound) } } };", to: "    return { system: { conditionExpiresRound: Number(now.nextRound) }, module: { combatId } };" },
  { name: "THE LIVE DEFECT: Resist Dying meets the flat-footed refusal", file: SA, from: "{ ...action, apCost: \"0\", variantNote:", to: "{ ...action, variantNote:" },
  { name: "Resist Dying spends no reaction", file: SA, from: "  if (inCombat) await spendReaction(actor, \"Resist Dying\");\n", to: "" },
  { name: "Resist Dying with no reaction left", file: SA, from: "  if (inCombat && !(await reactionOpen(actor, \"Resist Dying\"))) {\n    ui.notifications.warn(`Resist Dying: ${actor.name} has no reaction it can spend on this.`);\n    return false;\n  }\n", to: "" },
  { name: "a target's lockout is never asked", file: SA, from: "  if (TARGET_LOCKS.includes(key) && targetActor && lockoutActive(all[lockoutKey(key, targetActor.uuid)], now)) {", to: "  if (false) {" },
  { name: "an undecided degree is acted on", file: SA, from: "  if (!SKILL_ACTION_KEYS.includes(key) || !actor || !degree) return;", to: "  if (!SKILL_ACTION_KEYS.includes(key) || !actor) return;" },
  { name: "Evade stacks with itself", file: SA, from: "      if (bonus) await replaceOwn(actor, key, evadeEffect(bonus, expiryFor(\"startOfNextTurn\", actor)));", to: "      if (bonus) await helpers().createEffectsOn(actor, [evadeEffect(bonus, expiryFor(\"startOfNextTurn\", actor))]);" },
  { name: "Interpret Style keeps the old instance", file: SA, from: "      await replaceOwn(actor, key, interpretStyleEffect(", to: "      await helpers().createEffectsOn(actor, [interpretStyleEffect(" },
  { name: "a stance ending ends nothing", file: SA, from: "      return read?.targetUuid === parent.uuid && (read.stanceIds ?? []).includes(effect.id);", to: "      return false;" },
  { name: "the battle ending ends nothing", file: SA, from: "      return mine?.[SOURCE_FLAG] && (mine.combatId === combat.id || mine[TURN_END_FLAG]?.combatId === combat.id || mine[TURN_START_FLAG]?.combatId === combat.id);", to: "      return false;" },
  { name: "Wall Run's Partial goes nowhere", file: SA, from: ": row === \"partial\" ? 10 : 0;", to: ": 0;" },
  { name: "Wall Run's Fumble stays standing", file: SA, from: "        await h.applyConditionTags(actor, [{ key: \"prone\", label: \"Prone\" }]);\n", to: "" },
  { name: "Recognise Discipline's Fumble locks nothing", file: SA, from: "        await lock(actor, key, targetActor.uuid, { seconds: 600 });\n", to: "" },
  { name: "Guide the Breath lands on the guide", file: SA, from: "        await h.createEffectsOn(targetActor, [guideTheBreathEffect(bonus, actor.name, expiryFor(\"endOfNextTurn\", targetActor))]);", to: "        await h.createEffectsOn(actor, [guideTheBreathEffect(bonus, actor.name, expiryFor(\"endOfNextTurn\", targetActor))]);" },
  { name: "a turn ending ends nothing", file: SA, from: "  const ids = Array.from(actor.effects ?? []).filter((e) => endsWithTurn(e.getFlag?.(MODULE_ID, TURN_END_FLAG), combat)).map((e) => e.id);\n  if (ids.length) await actor.deleteEmbeddedDocuments(\"ActiveEffect\", ids);\n", to: "" },
  { name: "Steady Heart's Critical reduces by 1", file: SA, from: "row === \"critical\" ? 2 : 1);", to: "row === \"critical\" ? 1 : 1);" },
  { name: "Steady Heart's Fumble locks nothing", file: SA, from: "        await lock(actor, key, \"\", { nextTurn: true });\n        say(\"<em>No Steady Heart until the beginning of your next turn.</em>\");", to: "        say(\"<em>No Steady Heart until the beginning of your next turn.</em>\");" },
  { name: "Resist Dying lingers after dying ends", file: SA, from: "    const ids = ownEffects(parent, \"resistDying\").map((e) => e.id);\n    if (ids.length) await parent.deleteEmbeddedDocuments(\"ActiveEffect\", ids);", to: "    void parent;" },
  { name: "Resist Dying is offered without the feat", file: SA, from: "  if (!ownsName(actor, \"Inner Discipline\") || !offersHere(actor)) return;", to: "  if (!offersHere(actor)) return;" },
  { name: "the Resist Dying button works twice", file: SA, from: "  if (!raw || raw.used) return false;\n  const doc = await fromUuid(raw.actorUuid)", to: "  if (!raw) return false;\n  const doc = await fromUuid(raw.actorUuid)" },
  { name: "Elemental Ward asks no element", file: SA, from: "        if (!choice) { say(\"<em>No element chosen — no ward drawn.</em>\"); break; }\n", to: "" },
  { name: "Elemental Ward's Failure locks nothing", file: SA, from: "        await lock(actor, key, \"\", plan.lock);\n", to: "" },
  { name: "daily preparation lifts nothing", file: SA, from: "  const kept = Object.fromEntries(Object.entries(all).filter(([, r]) => !r?.prep));", to: "  const kept = all;" },
  { name: "Elemental Tracking never ends", file: SA, from: "    flags: { [SYSTEM_ID]: { castId, endsWithSpell: true }, [MODULE_ID]: { [SOURCE_FLAG]: \"readTheElements\" } }", to: "    flags: { [SYSTEM_ID]: { castId }, [MODULE_ID]: { [SOURCE_FLAG]: \"readTheElements\" } }" },
  { name: "Observe Technique's Fumble locks nothing", file: SA, from: "        await lock(actor, key, targetActor.uuid, { nextTurn: true });\n        say(`<em>No Observe Technique", to: "        say(`<em>No Observe Technique" },
  { name: "Read Intent never records its round", file: SA, from: "        await actor.setFlag(MODULE_ID, READ_INTENT_FLAG, { ...(actor.getFlag(MODULE_ID, READ_INTENT_FLAG) ?? {}), [flagKey(targetActor.uuid)]: `${combat.id}:${combat.round}` });\n", to: "" },
  // Wiring (F)
  { name: "a refusal is not returned", file: SCRIPT, from: "Hooks.on(\"trgPrimeActionAttempt\", (ctx) => onActionAttempt(ctx));", to: "Hooks.on(\"trgPrimeActionAttempt\", (ctx) => { onActionAttempt(ctx); });" },
  { name: "nothing happens after the roll", file: SCRIPT, from: "Hooks.on(\"trgPrimeActionResolved\", (ctx) => { trackActionResolved(", to: "Hooks.on(\"trgPrimeActionResolvedX\", (ctx) => { trackActionResolved(" },
  { name: "dying offers nothing", file: SCRIPT, from: "Hooks.on(\"createActiveEffect\", (effect) => { offerResistDying(effect)", to: "Hooks.on(\"createItem\", (effect) => { offerResistDying(effect)" },
  { name: "the module accepts 3.666.0, before the defence offer", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.674.1\";", to: "const REQUIRED_SYSTEM = \"3.666.0\";" },
  { name: "the manifest accepts 3.666.0", file: MANIFEST, from: "\"minimum\": \"3.674.1\"", to: "\"minimum\": \"3.666.0\"" },
  { name: "Impact Absorption lasts the round again", file: AUTO, from: "flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: item.id, oneAttack: { against: \"weapon\" } } }", to: "flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: item.id } }" },
  { name: "the Resist Dying button is never bound", file: AUTO, from: "        else if (kind === \"resistDying\" && !(await pressResistDying(message))) button.disabled = false;\n", to: "" },
  { name: "a refused press leaves the button dead", file: AUTO, from: "        else if (kind === \"resistDying\" && !(await pressResistDying(message))) button.disabled = false;\n", to: "        else if (kind === \"resistDying\") await pressResistDying(message);\n" },
  { name: "Inner Balance still says Block 2 is coming", file: FEATS, from: "\"*Automated:* Centred Balance appears under Meditation", to: "\"*Arrives with Block 2:* Centred Balance appears under Meditation" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block2.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block2: verify-block2 already fails on an unmodified tree."); process.exit(2); }
  for (const m of MUTATIONS) {
    const original = originals.get(m.file);
    const n = original.split(m.from).length - 1;
    if (n !== 1) { results.push({ name: m.name, state: n ? `ANCHOR AMBIGUOUS (${n})` : "ANCHOR MISSING" }); continue; }
    fs.writeFileSync(m.file, original.replace(m.from, m.to));
    const survived = run();
    fs.writeFileSync(m.file, original);
    results.push({ name: m.name, state: survived ? "SURVIVED" : "caught" });
  }
} finally { restore(); }
const bad = results.filter((r) => r.state !== "caught");
for (const r of results) console.log(`  ${r.state === "caught" ? "caught  " : r.state.padEnd(8)}  ${r.name}`);
console.log(bad.length ? `\nmutate-block2: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block2: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
