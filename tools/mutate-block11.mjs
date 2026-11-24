#!/usr/bin/env node
/**
 * mutate-block11 — the mutation half of verify-block11. Each mutation breaks
 * one printed rule, one reading, one declaration the system reads or one wire
 * of Block 11; verify-block11 must fail on every one. Files are restored after
 * each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block11.mjs
 *
 * The printed text is read from the v1.4 extract, never typed, so the
 * mutations go at what is authored: categories, flags, the pure decisions,
 * the Uses (above all Rebound Assault's and Pinnacle of Motion's multiple
 * attack penalty) and the wiring.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block11.mjs"), A = f("module", "block11-automations.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json");
const FOUND = f("tools", "content", "foundation.mjs"), ART = f("tools", "content", "artwork.json");

const MUTATIONS = [
  // A — the feats, as printed
  { name: "CLASS is kept as a trait", file: C, from: "const rest = words.filter((w) => ![\"CLASS\", \"GENERAL\"].includes(w.toUpperCase()));", to: "const rest = words.filter((w) => ![\"GENERAL\"].includes(w.toUpperCase()));" },
  { name: "Vaulting Momentum is a Class feat", file: C, from: "const category = upper.includes(\"CLASS\") ? \"Class\" : upper.includes(\"GENERAL\") ? \"General\" : \"\";", to: "const category = upper.includes(\"CLASS\") || upper.includes(\"GENERAL\") ? \"Class\" : \"\";" },
  { name: "the Class art for every feat", file: C, from: "flags, img: FEAT_ART[category]", to: "flags, img: FEAT_ART.Class" },
  { name: "the feats are left out of the pack", file: FOUND, from: "...BLOCK10_FEATS, ...BLOCK11_FEATS] },", to: "...BLOCK10_FEATS] }," },
  { name: "Effortless Motion is called Flowing Step", file: C, from: "  F(\"Effortless Motion\", {", to: "  F(\"Flowing Step\", {" },
  // C — the declarations
  { name: "Effortless Motion's advantage on every Acrobatics check", file: C, from: "const ACRO_MOVEMENT = { checkTypes: [\"skill\"], subjects: [\"acrobatics\"], traits: [\"movement\"] };", to: "const ACRO_MOVEMENT = { checkTypes: [\"skill\"], subjects: [\"acrobatics\"] };" },
  { name: "Effortless Motion's advantage must be ticked", file: C, from: "scope: \"Acrobatics checks made as part of movement\", auto: true,", to: "scope: \"Acrobatics checks made as part of movement\", auto: false," },
  { name: "Perfect Balance forgets the Reposition", file: C, from: "[\"shoveAttack\", \"tripAttack\", \"reposition\"]", to: "[\"shoveAttack\", \"tripAttack\"]" },
  { name: "Perfect Balance's tick is applied by itself", file: C, from: "scope: PRONE_OR_MOVED, auto: false,", to: "scope: PRONE_OR_MOVED, auto: true," },
  { name: "Tumbling Reversal's +1 reaches everyone", file: A, from: "scope: `Attacks against ${targetName}`, auto: true, when: { checkTypes: [\"attack\"], targetUuids: [targetUuid] } }] };", to: "scope: `Attacks against ${targetName}`, auto: true, when: { checkTypes: [\"attack\"] } }] };" },
  { name: "Tumbling Reversal's advantage is never spent", file: A, from: "auto: true, oneShot: true, when: { checkTypes: [\"attack\"], targetUuids: [targetUuid] } }] };", to: "auto: true, when: { checkTypes: [\"attack\"], targetUuids: [targetUuid] } }] };" },
  { name: "Vaulting Momentum substitutes only the High Jump", file: A, from: "[Object.freeze({ action: \"highJump\", skill: \"acrobatics\" }), Object.freeze({ action: \"longJump\", skill: \"acrobatics\" })]", to: "[Object.freeze({ action: \"highJump\", skill: \"acrobatics\" })]" },
  { name: "Vaulting Momentum needs no Gymnast", file: A, from: "  return ownsGymnast(items) ? null : \"it has the Gymnast trait: take the Gymnast archetype first\";", to: "  return null;" },
  { name: "any feat named Gymnast is the archetype", file: A, from: "i?.type === \"feat\" && norm(i.system?.category) === \"archetype\" && norm(i.name) === norm(GYMNAST_ARCHETYPE)", to: "i?.type === \"feat\" && norm(i.name) === norm(GYMNAST_ARCHETYPE)" },
  { name: "the eligibility is not registered", file: A, from: "  api.registerFeatEligibility?.(B11.vaulting, (actor) => vaultingMomentumRefusal(Array.from(actor?.items ?? [])), moduleId);\n", to: "" },
  // D — the pure decisions
  { name: "precision with no 10 feet", file: A, from: "  if (immune || !(Number(movedFeet) >= 10)) return 0;", to: "  if (immune) return 0;" },
  { name: "the critical gives 1d4", file: A, from: "  const dice = isCritical(degree) ? 2 : 1;", to: "  const dice = 1;" },
  { name: "precision on an immune creature", file: A, from: "  if (immune || !(Number(movedFeet) >= 10)) return 0;", to: "  if (!(Number(movedFeet) >= 10)) return 0;" },
  { name: "resistance takes nothing", file: A, from: "  return resisted ? Math.floor(dice / 2) : dice;", to: "  return dice;" },
  { name: "the Long Jump's leg has no leap", file: A, from: "  if (actionKey === \"longJump\") return s + Math.max(0, int(total));", to: "  if (actionKey === \"longJump\") return s;" },
  { name: "a Step qualifies for Rebound", file: A, from: "    if (key === \"action:step\") continue;\n", to: "" },
  { name: "an ability's leg qualifies without asking", file: A, from: "    if (key === \"action:compoundLeg\") { ambiguous = true; continue; }", to: "" },
  { name: "last turn's Movement counts", file: A, from: "  const sameTurn = (r) => Boolean(r && turn && String(r.combatId) === String(turn.combatId) && int(r.round) === int(turn.round) && int(r.turn) === int(turn.turn));", to: "  const sameTurn = (r) => Boolean(r);" },
  { name: "a Step is a qualifying action", file: A, from: "  if (norm(action?.key) === \"step\") return false;\n", to: "" },
  { name: "Rebound may strike one creature twice", file: A, from: "  if (a === b || (a.uuid && a.uuid === b.uuid)) return \"the two attacks must be against two different creatures\";\n", to: "" },
  { name: "Whirlwind Kip on a plain success", file: A, from: "  return [\"tumble\", \"escape\"].includes(String(actionKey ?? \"\")) && isCritical(degree);", to: "  return [\"tumble\", \"escape\"].includes(String(actionKey ?? \"\")) && isSuccess(degree);" },
  { name: "Whirlwind Kip on a Balance", file: A, from: "  return [\"tumble\", \"escape\"].includes(String(actionKey ?? \"\")) && isCritical(degree);", to: "  return [\"tumble\", \"escape\", \"balance\"].includes(String(actionKey ?? \"\")) && isCritical(degree);" },
  { name: "Redirection on a ranged miss", file: A, from: "  if (!ctx.attacker || !ctx.target || ctx.held || !ctx.melee || ctx.noReactions) return { offer: false, trip: false };", to: "  if (!ctx.attacker || !ctx.target || ctx.held || ctx.noReactions) return { offer: false, trip: false };" },
  { name: "Redirection on a hit", file: A, from: "  if (!missedHere(ctx)) return { offer: false, trip: false };\n  return { offer: true, trip: Boolean(ctx.fumble) };", to: "  return { offer: true, trip: Boolean(ctx.fumble) };" },
  { name: "Redirection's Trip on every miss", file: A, from: "  return { offer: true, trip: Boolean(ctx.fumble) };", to: "  return { offer: true, trip: true };" },
  { name: "Pinnacle's Strike on a plain hit", file: A, from: "  if (!(ctx.hits && ctx.critical)) return false;", to: "  if (!ctx.hits) return false;" },
  { name: "Pinnacle's Strike against any creature", file: A, from: "  return (markedUuids ?? []).includes(ctx.target.uuid);", to: "  return true;" },
  // E — the Uses
  { name: "REBOUND: the first attack raises the penalty before the second", file: A, from: "{ apPaid: true, skipTargetPrompt: true, mapFrozen: true, optionLabel: B11.rebound }", to: "{ apPaid: true, skipTargetPrompt: true, optionLabel: B11.rebound }" },
  { name: "REBOUND: the two attacks count once", file: A, from: "{ apPaid: true, skipTargetPrompt: true, mapSteps: 2, optionLabel: B11.rebound }", to: "{ apPaid: true, skipTargetPrompt: true, optionLabel: B11.rebound }" },
  { name: "REBOUND: neither attack counts", file: A, from: "{ apPaid: true, skipTargetPrompt: true, mapSteps: 2, optionLabel: B11.rebound }", to: "{ apPaid: true, skipTargetPrompt: true, mapFrozen: true, optionLabel: B11.rebound }" },
  { name: "REBOUND: costs 1 AP", file: A, from: "    if (!(await spendAP(actor, B11.rebound, 2))) return false;", to: "    if (!(await spendAP(actor, B11.rebound, 1))) return false;" },
  { name: "REBOUND: no Movement action needed", file: A, from: "      if (!evidence.qualifies) {", to: "      if (false) {" },
  { name: "REBOUND: one target will do", file: A, from: "    if (targets.length !== 2) {", to: "    if (targets.length < 1) {" },
  { name: "PINNACLE: the reaction Strike ignores the penalty", file: A, from: "{ apPaid: true, mapFrozen: true, asReaction: true, skipTargetPrompt: true, optionLabel: B11.pinnacle }", to: "{ apPaid: true, isReaction: true, skipTargetPrompt: true, optionLabel: B11.pinnacle }" },
  { name: "PINNACLE: the reaction Strike raises the penalty", file: A, from: "{ apPaid: true, mapFrozen: true, asReaction: true, skipTargetPrompt: true, optionLabel: B11.pinnacle }", to: "{ apPaid: true, asReaction: true, skipTargetPrompt: true, optionLabel: B11.pinnacle }" },
  { name: "PINNACLE: the Strike spends no reaction", file: A, from: "  if (!(await spendReaction(actor, B11.pinnacle, { traits: \"Attack, Gymnast\" }))) return;\n  await actor.setFlag(MODULE_ID, PIN_STRIKE_FLAG, roundStamp());", to: "  await actor.setFlag(MODULE_ID, PIN_STRIKE_FLAG, roundStamp());" },
  { name: "PINNACLE: the Strike twice a round", file: A, from: "  if (usedNow(actor.getFlag(MODULE_ID, PIN_STRIKE_FLAG))) return;\n  const weapons = (await flurryWeaponsOf(actor))", to: "  const weapons = (await flurryWeaponsOf(actor))" },
  { name: "PINNACLE: no mark after a Tumble", file: A, from: "    if (owns(actor, B11.pinnacle)) {\n      const mark = await markPinnacle(actor, targetActor);", to: "    if (false) {\n      const mark = await markPinnacle(actor, targetActor);" },
  { name: "OFFENSIVE: a held check not waited for", file: A, from: "      if (!degree) degree = String(await Promise.race([settled, new Promise((resolve) => setTimeout(() => resolve(\"\"), OM_WAIT_MS))]) ?? \"\");", to: "" },
  { name: "OFFENSIVE: a degree-less announcement taken as the answer", file: A, from: "      const d = String(ctx.resolvedDegree ?? ctx.degree ?? \"\");\n      if (!d) return;", to: "      const d = String(ctx.resolvedDegree ?? ctx.degree ?? \"failure\");" },
  { name: "OFFENSIVE: the hook left behind", file: A, from: "    } finally { Hooks.off(\"trgPrimeActionResolved\", hookId); }\n    if (!isSuccess(degree)) {", to: "    } finally { }\n    if (!isSuccess(degree)) {" },
  { name: "OFFENSIVE: another creature's announcement read", file: A, from: "      if (!sameActor(ctx?.actor) || ctx?.action?.key !== key) return;", to: "      if (ctx?.action?.key !== key) return;" },
  { name: "PINNACLE: no condition laid, only the mark", file: A, from: "  const applied = already ? true : Boolean(await h().applyConditionTagsTo(target, [{ key: \"flatFooted\", label: \"Flat-Footed\" }], pinnacleTiming(actor.uuid, Boolean(combatNow()))));", to: "  const applied = true;" },
  { name: "PINNACLE: laid again on a creature already flat-footed", file: A, from: "  const already = Boolean(target.hasCondition?.(\"flatFooted\"));", to: "  const already = false;" },
  { name: "PINNACLE: the condition on the round clock", file: A, from: "  return { endsAtTurnEndOf: { of: String(actorUuid ?? \"\"), castTurn: \"\" } };", to: "  return { expiresRound: 1 };" },
  { name: "PINNACLE: the condition passes over this turn (until the next)", file: A, from: "  return { endsAtTurnEndOf: { of: String(actorUuid ?? \"\"), castTurn: \"\" } };", to: "  return { endsAtTurnEndOf: { of: String(actorUuid ?? \"\"), castTurn: \"2:cGym\" } };" },
  { name: "PINNACLE: the condition out of combat for a minute", file: A, from: "  if (!inCombat) return { duration: { seconds: 6 } };", to: "  if (!inCombat) return { duration: { seconds: 60 } };" },
  { name: "PINNACLE: the mark keeps a bonus row", file: A, from: "    description: `Pinnacle of Motion: ${target.name} is flat-footed against your attacks until the end of your turn.`,\n    system: {},", to: "    description: `Pinnacle of Motion: ${target.name} is flat-footed against your attacks until the end of your turn.`,\n    system: { conditionals: [{ kind: \"modifier\", value: 3 }] }," },
  { name: "PINNACLE: the mark lasts past the turn", file: A, from: "    module: { pinnacleTarget: target.uuid }\n  }, untilEndOfTurn(actor)));", to: "    module: { pinnacleTarget: target.uuid }\n  }, { system: {}, module: {} }));" },
  { name: "WHIRLWIND: the Strike's MAP is frozen", file: A, from: "{ apPaid: true, asReaction: true, skipTargetPrompt: Boolean(firstTarget()), optionLabel: B11.whirlwind }", to: "{ apPaid: true, asReaction: true, mapFrozen: true, skipTargetPrompt: Boolean(firstTarget()), optionLabel: B11.whirlwind }" },
  { name: "a stance counts as up when it is any effect of that name", file: A, from: "  return Array.from(effects ?? []).some((e) => !e?.disabled && e?.flags?.[SYSTEM_ID]?.featStance && norm(e.name) === want);", to: "  return true;" },
  { name: "WHIRLWIND: no reaction spent", file: A, from: "  if (!(await spendReaction(actor, B11.whirlwind, { traits: \"Attack, Gymnast, Stance\" }))) return;\n", to: "" },
  { name: "the stances cost no AP", file: A, from: "        name: stance, apCost: 1, description: fresh.description,", to: "        name: stance, apCost: 0, description: fresh.description," },
  { name: "EFFORTLESS: unlimited free Steps", file: A, from: "    if (usedNow(actor.getFlag(MODULE_ID, EFFORTLESS_FLAG))) { ui.notifications.warn(\"Effortless Motion: your free Step has been taken this round.\"); return false; }\n", to: "" },
  { name: "EFFORTLESS: the Step provokes", file: A, from: "{ speedKey: \"land\", maxFeet: feet, provokes: false, countsAs: \"step\", note: \"Effortless Motion's free Step\" }", to: "{ speedKey: \"land\", maxFeet: feet, provokes: true, countsAs: \"step\", note: \"Effortless Motion's free Step\" }" },
  { name: "EFFORTLESS: the Step is no Step", file: A, from: "{ speedKey: \"land\", maxFeet: feet, provokes: false, countsAs: \"step\", note: \"Effortless Motion's free Step\" }", to: "{ speedKey: \"land\", maxFeet: feet, provokes: false, note: \"Effortless Motion's free Step\" }" },
  { name: "OFFENSIVE: the check is charged its own AP", file: A, from: "result = await h().resolveAction(actor, { ...base, apCost: \"0\", variantNote: \"Offensive Momentum: made as part of this action (its 2 AP).\" }, { invokedSkillKey: skill });", to: "result = await h().resolveAction(actor, { ...base, variantNote: \"Offensive Momentum: made as part of this action (its 2 AP).\" }, { invokedSkillKey: skill });" },
  { name: "OFFENSIVE: costs 1 AP", file: A, from: "    if (!(await spendAP(actor, B11.offensive, 2))) return false;", to: "    if (!(await spendAP(actor, B11.offensive, 1))) return false;" },
  { name: "OFFENSIVE: a Strike after a failure", file: A, from: "    if (!isSuccess(degree)) {", to: "    if (false) {" },
  { name: "OFFENSIVE: Vaulting Momentum's Acrobatics jump not offered", file: A, from: "...(vaulting ? [[\"highJump|acrobatics\", \"High Jump (Acrobatics, Vaulting Momentum)\"], [\"longJump|acrobatics\", \"Long Jump (Acrobatics, Vaulting Momentum)\"]] : []),", to: "" },
  { name: "OFFENSIVE: the rider outlives the Strike", file: A, from: "    const left = ownEffects(actor, OM_RIDER).map((e) => e.id);\n    if (left.length) await safeDelete(actor, left);", to: "    const left = [];" },
  { name: "OFFENSIVE: the card strikes twice", file: A, from: "  if (!raw || raw.used) return;\n  const actor = await actorFrom(raw.actorUuid);\n  const weapon = actor?.items?.get?.(weaponId);", to: "  if (!raw) return;\n  const actor = await actorFrom(raw.actorUuid);\n  const weapon = actor?.items?.get?.(weaponId);" },
  { name: "OFFENSIVE: precision immunity not read", file: A, from: "    return { immune, resisted: !immune && Boolean(d?.resistances?.has?.(token)), known: true };", to: "    return { immune: false, resisted: false, known: true };" },
  { name: "REDIRECTION: Flat-Footed until the end of THIS turn", file: A, from: "const endsAtTurnEndOf = combat ? { of: attacker.uuid, castTurn: `${int(combat.round)}:${String(combat.combatant?.id ?? \"\")}` } : null;", to: "const endsAtTurnEndOf = combat ? { of: attacker.uuid, castTurn: \"\" } : null;" },
  { name: "REDIRECTION: the Trip costs its AP", file: A, from: "await h().resolveAction(actor, { ...tripBase, apCost: \"0\",", to: "await h().resolveAction(actor, { ...tripBase," },
  { name: "REDIRECTION: no reaction spent", file: A, from: "  if (!(await spendReaction(actor, B11.redirection, { traits: \"Gymnast, Stance\" }))) return;\n", to: "" },
  { name: "REDIRECTION: asked outside the stance", file: A, from: "  if (!attacker || !stanceUp11(actor.effects, B11.redirection)) return;", to: "  if (!attacker) return;" },
  { name: "REVERSAL: on a failed Tumble too", file: A, from: "  if (key === \"tumble\" && isSuccess(degree) && targetActor && targetActor !== actor) {", to: "  if (key === \"tumble\" && targetActor && targetActor !== actor) {" },
  { name: "REVERSAL: without the feat", file: A, from: "    if (owns(actor, B11.reversal)) {", to: "    if (true) {" },
  { name: "REVERSAL: no advantage on a critical", file: A, from: "      if (isCritical(degree)) {\n        await putEffect(actor, `b11:reversalAdv:", to: "      if (false) {\n        await putEffect(actor, `b11:reversalAdv:" },
  // F — wiring and versions
  { name: "Block 11 is never registered", file: REG, from: "  registerBlock11(api, moduleId);\n}", to: "}" },
  { name: "the Tumble is never heard", file: SCRIPT, from: "Hooks.on(\"trgPrimeActionResolved\", (ctx) => { onActionResolvedB11(ctx)", to: "Hooks.on(\"trgPrimeActionAttempt\", (ctx) => { onActionResolvedB11(ctx)" },
  { name: "the module accepts 3.674.2", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.712.2\";", to: "const REQUIRED_SYSTEM = \"3.674.2\";" },
  { name: "the manifest accepts 3.674.2", file: MANIFEST, from: "\"minimum\": \"3.712.2\"", to: "\"minimum\": \"3.674.2\"" },
  { name: "the manifest says 1.0.5", file: MANIFEST, from: "\"version\": \"1.1.1\"", to: "\"version\": \"1.0.5\"" },
  { name: "the art map forgets Vaulting Momentum", file: ART, from: "\"CPjiXV0YcTudPaGt\": \"modules/trg-inner-tempest/assets/feats/general.png\"", to: "\"CPjiXV0YcTudPaGt\": \"modules/trg-inner-tempest/assets/feats/class.png\"" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block11.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block11: verify-block11 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block11: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block11: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
