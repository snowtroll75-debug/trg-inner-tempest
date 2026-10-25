#!/usr/bin/env node
/**
 * mutate-block6 — the mutation half of verify-block6. Each mutation breaks
 * one printed rule, one ruling, one declaration the system reads or one
 * wire of Block 6; verify-block6 must fail on every one. Files are restored
 * after each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block6.mjs
 *
 * The printed text is read from the book extract, never typed, so the
 * mutations here go at what is authored: fields, declarations, the pure
 * decisions and the wiring. The core's Block 6 seams have their own pair in
 * the system (verify/mutate-block6-core).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block6.mjs"), A = f("module", "block6-automations.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json");
const AUTO = f("module", "automations.mjs"), B3 = f("module", "block3-automations.mjs");

const MUTATIONS = [
  // A — the feats, as printed
  { name: "Perfect Strike loses the Disciple", file: C, from: "traits: \"Attack, Fighter, Flourish, Disciple\"", to: "traits: \"Attack, Fighter, Flourish\"" },
  { name: "Perfect Shot drops the Zen Archer (B6-10)", file: C, from: "traits: \"Archer, Attack, Flourish, Ranger, Zen Archer\"", to: "traits: \"Archer, Attack, Flourish, Ranger\"" },
  { name: "Inner Magic forgets Non-Mystic", file: C, from: "prerequisites: \"Inner Discipline, Level 4, Non-Mystic\"", to: "prerequisites: \"Inner Discipline, Level 4\"" },
  { name: "Drunken Stance grants no Drunken Strike", file: C, from: "flags: { itAutomation: \"drunkenStance\" }, grantedAbilities: \"Drunken Strike\" }", to: "flags: { itAutomation: \"drunkenStance\" } }" },
  { name: "Drunken Strike is no Flourish", file: C, from: "name: \"Drunken Strike\", traits: \"Attack, Flourish\",", to: "name: \"Drunken Strike\", traits: \"Attack\"," },
  { name: "FC-55: the Disciple loses Stance Mastery", file: REG, from: "Disciple: [\"Combat Awareness\", \"Combat Grapple\", \"Evasion\", \"Guarded Move\", \"Reactive Stance\", \"Stance Mastery\", \"Superior Evasion\"],", to: "Disciple: [\"Combat Awareness\", \"Combat Grapple\", \"Evasion\", \"Guarded Move\", \"Reactive Stance\", \"Superior Evasion\"]," },
  { name: "FC-55: the Kensai gains Resolve", file: REG, from: "\"Duelling Riposte\", \"Mobility\"],", to: "\"Duelling Riposte\", \"Mobility\", \"Resolve\"]," },
  // B — the stances' declarations
  { name: "Crane Stance's DB is +1", file: A, from: "      changes: [circ(\"system.combat.defence.circumstance\", 2)],\n      flags: { conditionals: [jumpRow(5, \"Crane Stance\")] },", to: "      changes: [circ(\"system.combat.defence.circumstance\", 1)],\n      flags: { conditionals: [jumpRow(5, \"Crane Stance\")] }," },
  { name: "Crane Stance's jump is +2", file: A, from: "jumpRow(5, \"Crane Stance\")", to: "jumpRow(2, \"Crane Stance\")" },
  { name: "the jump rows reach a Climb", file: A, from: "auto: true, when: { actions: [...JUMP_ACTIONS] }", to: "auto: true, when: { actions: [...JUMP_ACTIONS, \"climb\"] }" },
  { name: "the jump rows are ticked by hand", file: A, from: "label, scope: \"High Jump and Long Jump checks\", auto: true,", to: "label, scope: \"High Jump and Long Jump checks\", auto: false," },
  { name: "a stance change is written in ADD mode (it never reaches the pool)", file: A, from: "const circ = (key, value) => ({ key, type: \"custom\", value: String(value) });", to: "const circ = (key, value) => ({ key, type: \"add\", value: String(value) });" },
  { name: "Dragon Stance's bonus is to DB", file: A, from: "changes: [circ(\"system.combat.attack.circumstance\", 2)],", to: "changes: [circ(\"system.combat.defence.circumstance\", 2)]," },
  { name: "Dragon Stance's Sweep reaches every weapon (B6-2)", file: A, from: "weaponTraitGrants: [{ scope: \"unarmed\", trait: \"Sweep\", label: \"Dragon Stance\" }],", to: "weaponTraitGrants: [{ scope: \"any\", trait: \"Sweep\", label: \"Dragon Stance\" }]," },
  { name: "Dragon Stance eases no difficult terrain", file: A, from: "        ignoresFirstDifficultSquare: true\n", to: "\n" },
  { name: "Mantis Stance gives no Deadly", file: A, from: "weaponTraitGrants: [{ scope: \"unarmed\", trait: \"Deadly\", label: \"Mantis Stance\" }],", to: "weaponTraitGrants: []," },
  { name: "Mantis Stance's +2 is to Fortitude", file: A, from: "changes: [circ(\"system.combat.saves.reflex.circumstance\", 2)],", to: "changes: [circ(\"system.combat.saves.fortitude.circumstance\", 2)]," },
  { name: "Mantis Stance's first Move provokes (B6-4)", file: A, from: "        firstMoveNoReactions: true\n", to: "\n" },
  { name: "Monkey Stance forgets Climbing", file: A, from: "circ(\"system.skills.acrobatics.circumstance\", 2), circ(\"system.skills.climbing.circumstance\", 2)", to: "circ(\"system.skills.acrobatics.circumstance\", 2)" },
  { name: "Monkey Stance's 1-AP jump keeps its +2 (B6-5)", file: A, from: "        tradeoffWaivers: [{ actions: [...JUMP_ACTIONS], option: \"forOneAp\", label: \"Monkey Stance\" }]\n", to: "\n" },
  { name: "Tiger Stance's slashing is only offered (B6-1)", file: A, from: "strikeTypeOption: { type: \"slashing\", label: \"Tiger Stance\", scope: [\"unarmed-form\"], replace: true },", to: "strikeTypeOption: { type: \"slashing\", label: \"Tiger Stance\", scope: [\"unarmed-form\"] }," },
  { name: "Wolf Stance's piercing reaches a sword (B6-1)", file: A, from: "strikeTypeOption: { type: \"piercing\", label: \"Wolf Stance\", scope: [\"unarmed-form\"], replace: true },", to: "strikeTypeOption: { type: \"piercing\", label: \"Wolf Stance\", scope: [\"any\"], replace: true }," },
  { name: "Tiger Stance raises no bleeding", file: A, from: "        bleedBonus: { value: 1, label: \"Tiger Stance\" },\n", to: "" },
  { name: "Tiger Stance's Step ignores the Speed", file: A, from: "stepFeet: { feet: 10, minSpeed: 20 }", to: "stepFeet: { feet: 10, minSpeed: 0 }" },
  { name: "Wolf Stance has no Pack Attack", file: A, from: "        creatureAbility: { derives: { packAttack: true } }\n", to: "\n" },
  // C — the pure decisions
  { name: "Crane Stance takes any Path", file: A, from: "  \"Crane Stance\": Object.freeze([\"Devoted\", \"Primal\"]),\n", to: "" },
  { name: "Snake Stance takes the Primal Path", file: A, from: "\"Snake Stance\": Object.freeze([\"Devoted\", \"Illuminator\"])", to: "\"Snake Stance\": Object.freeze([\"Devoted\", \"Illuminator\", \"Primal\"])" },
  { name: "a stance with no Path chosen is entered", file: A, from: "  if (path && wanted.some((p) => norm(p) === norm(path.name))) return \"\";", to: "  if (!path || wanted.some((p) => norm(p) === norm(path.name))) return \"\";" },
  { name: "Stunning Fist on one Strike", file: A, from: "  if (made2.length < 2) return false;", to: "  if (made2.length < 1) return false;" },
  { name: "Stunning Fist on a hit that dealt nothing", file: A, from: "Boolean(c?.attackOutcome?.hits) && Number(c?.damageTaken) > 0)", to: "Boolean(c?.attackOutcome?.hits))" },
  { name: "Stunning Fist spares a Partial", file: A, from: "partial: [{ key: \"stunned\", value: 1 }], failure:", to: "partial: [], failure:" },
  { name: "Stunning Fist's Fumble stuns 1", file: A, from: "fumble: [{ key: \"stunned\", value: 3 }], blunder:", to: "fumble: [{ key: \"stunned\", value: 1 }], blunder:" },
  { name: "Stunning Fist's Blunder is spared (B6-6)", file: A, from: "blunder: [{ key: \"stunned\", value: 3 }]\n", to: "blunder: []\n" },
  { name: "Stunning Fist's save is Reflex", file: A, from: "  save: \"fortitude\",\n  outcomes: Object.freeze({ heroic:", to: "  save: \"reflex\",\n  outcomes: Object.freeze({ heroic:" },
  { name: "Perfect Shot takes a melee weapon", file: A, from: "[\"missile\", \"thrown\"].includes(norm(item.system?.attackMode))", to: "[\"missile\", \"thrown\", \"melee\"].includes(norm(item.system?.attackMode))" },
  { name: "Perfect Shot refuses a javelin (the review's)", file: A, from: "[\"missile\", \"thrown\"].includes(norm(item.system?.attackMode))", to: "[\"missile\", \"ranged\"].includes(norm(item.system?.attackMode))" },
  { name: "the melee pickers take a javelin (the review's)", file: f("module", "block4-automations.mjs"), from: "![\"missile\", \"thrown\", \"ranged\"].includes(norm(i.system?.attackMode || \"melee\"))", to: "![\"missile\", \"ranged\"].includes(norm(i.system?.attackMode || \"melee\"))" },
  { name: "Stunning Fist on Disciplined Flurry's third (the review's)", file: A, from: "  return made2.some((c) =>", to: "  return (checks ?? []).some((c) =>" },
  { name: "a grab is a miss (the review's)", file: AUTO, from: "  return typeof ctx?.missed === \"boolean\" ? ctx.missed : !ctx?.hits;", to: "  return !ctx?.hits;" },
  { name: "a discipline's cantrip is marked (the review's)", file: B3, from: " && !isCantripSpell(data?.system ?? document?.system);", to: ";" },
  { name: "a late Path marks a cantrip", file: B3, from: "{ metamagic: mystic && !isCantripSpell(s.system) }", to: "{ metamagic: mystic }" },
  { name: "a cantrip is told from its PP alone", file: B3, from: "|| 0)) === 0 && /\\bcantrip\\b/i.test(String(spellSystem?.traits ?? \"\"));", to: "|| 0)) === 0;" },
  { name: "Snake Stance strikes with the fists alone (the review's)", file: A, from: "  let weapons = meleeWeapons(actor);", to: "  let weapons = [];" },
  { name: "a cantrip is marked for Metamagic", file: A, from: "      && !(Math.trunc(Number(i.system?.ppCost) || 0) === 0 && /\\bcantrip\\b/i.test(String(i.system?.traits ?? \"\")))\n", to: "\n" },
  { name: "a Disciple's spells are marked for Metamagic", file: A, from: "  if (!isMystic(list)) return [];\n", to: "" },
  { name: "the Mystic is anyone", file: B3, from: "return Array.from(items ?? []).some((i) => i?.type === \"class\" && norm(i.name) === \"mystic\");", to: "return Array.from(items ?? []).some((i) => i?.type === \"class\");" },
  { name: "a disabled stance still counts", file: A, from: "  return Array.from(effects ?? []).some((e) => !e?.disabled && e?.flags?.[SYSTEM_ID]?.featStance && norm(e.name) === want);", to: "  return Array.from(effects ?? []).some((e) => e?.flags?.[SYSTEM_ID]?.featStance && norm(e.name) === want);" },
  // Elemental Fist (Block 3)
  { name: "Elemental Fist's types are anyone's", file: B3, from: "  const elemental = Array.from(items ?? []).some((i) => i?.type === \"feat\" && norm(i.name) === \"elemental fist\");", to: "  const elemental = true;" },
  { name: "Elemental Fist's bludgeoning is Fire", file: B3, from: "Object.freeze([\"bludgeoning\", \"Bludgeoning (Earth trait)\", \"Earth\"]),", to: "Object.freeze([\"bludgeoning\", \"Bludgeoning (Earth trait)\", \"Fire\"])," },
  { name: "Elemental Fist gives no trait", file: B3, from: "    weaponTraitGrants: trait ? [{ scope: \"any\", trait, label: \"Elemental Fist\" }] : [],", to: "    weaponTraitGrants: []," },
  { name: "a press leaves the old element's trait", file: B3, from: "    [`flags.${SYSTEM_ID}.weaponTraitGrants`]: innerStrikeFlags(type).weaponTraitGrants\n", to: "\n" },
  { name: "the chooser offers Inner Strike's four only", file: B3, from: "    const type = await h().chooseFromList(\"Inner Strike\", \"Secondary damage type\", types);", to: "    const type = await h().chooseFromList(\"Inner Strike\", \"Secondary damage type\", INNER_STRIKE_TYPES);" },
  // The Mystic's Metamagic (Block 3)
  { name: "the Path stamp never marks Metamagic", file: B3, from: "  if (metamagic === true) stamp[`flags.${SYSTEM_ID}.innateMetamagic`] = true;\n", to: "" },
  { name: "Mystical Power's spells are not marked", file: B3, from: "pathStamp(path, slot === \"pp2\" ? 1 : 0, { metamagic: slot !== \"cantrip\" })", to: "pathStamp(path, slot === \"pp2\" ? 1 : 0)" },
  { name: "a discipline's spell is not marked", file: B3, from: "  const stamp = pathStamp(magicOf(Array.from(actor.items ?? [])), magic.allowance, { metamagic });", to: "  const stamp = pathStamp(magicOf(Array.from(actor.items ?? [])), magic.allowance);" },
  // D — registration
  { name: "Block 6's Uses are not registered", file: REG, from: "  for (const [name, entry] of Object.entries(BLOCK6_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);\n", to: "" },
  { name: "FC-55 is not registered", file: REG, from: "  for (const [cls, feats] of Object.entries(EXISTING_CLASS_FEATS)) api.registerFeatAccess?.(\"class\", cls, [...feats], moduleId);\n", to: "" },
  { name: "Perfect Strike has no Use", file: A, from: "  \"perfect strike\": perfectStrikeUse(\"Perfect Strike\", { ranged: false }),\n", to: "" },
  { name: "Mystic Essence has no Use", file: A, from: "  \"mystic essence\": mysticEssence,\n", to: "" },
  // E — wiring
  { name: "the stance's Path is not checked", file: A, from: "      if (refusal) { ui.notifications.warn(refusal); return false; }\n", to: "" },
  { name: "the stance's declarations are left off its effect", file: A, from: "        flags: fresh.flags,\n", to: "" },
  { name: "Drunken Strike outside the stance", file: A, from: "    if (!stanceUp(actor.effects, \"Drunken Stance\")) { ui.notifications.warn(\"Drunken Strike: enter Drunken Stance first.\"); return false; }\n", to: "" },
  { name: "Drunken Strike has no −2", file: A, from: "extraModifiers: [{ label: \"Drunken Strike\", value: -2, type: \"circumstance\" }],", to: "extraModifiers: []," },
  { name: "Drunken Strike's Feint is rolled afresh (B6-3)", file: A, from: "{ presetDice: check.dice, presetModifiers: check.modifiers ?? [], event: { shiftKey: true } }", to: "{ event: { shiftKey: true } }" },
  { name: "Drunken Strike feints with no damage", file: A, from: "    if (!(Number(check.damageTaken) > 0)) {", to: "    if (false) {" },
  { name: "Perfect Strike counts once", file: A, from: "{ apPaid: true, skipTargetPrompt: true, mapSteps: 2, optionLabel: name }", to: "{ apPaid: true, skipTargetPrompt: true, optionLabel: name }" },
  { name: "Perfect Strike has no advantage", file: A, from: "kind: \"advantage\", label: name, scope: `This ${name}`, auto: true, oneShot: true,", to: "kind: \"advantage\", label: name, scope: `This ${name}`, auto: false, oneShot: true," },
  { name: "Perfect Strike's advantage outlives it", file: A, from: "        if (left.length) await safeDelete(actor, left);\n", to: "" },
  { name: "Perfect Strike costs 1 AP", file: A, from: "      await spendAP(actor, name, 2);", to: "      await spendAP(actor, name, 1);" },
  { name: "Snake Stance on a hit", file: A, from: "  if (!attacker || !target || !missedHere(ctx) || held || !melee) return;", to: "  if (!attacker || !target || held || !melee) return;" },
  { name: "Snake Stance's reaction is the stance's traits (B6-9)", file: A, from: "export const SNAKE_REACTION_TRAITS = \"Attack, Stance\";", to: "export const SNAKE_REACTION_TRAITS = \"Disciple, Mystic, Stance\";" },
  { name: "Snake Stance asked with no reaction to spend", file: A, from: "  if (!(await reactionOpen(target, \"Snake Stance\", { traits: SNAKE_REACTION_TRAITS }))) return;\n", to: "" },
  { name: "Snake Stance's Strike takes the penalty", file: A, from: "{ apPaid: true, isReaction: true, skipTargetPrompt: true, optionLabel: \"Snake Stance\" }", to: "{ apPaid: true, skipTargetPrompt: true, optionLabel: \"Snake Stance\" }" },
  { name: "reactionOpen ignores the traits given", file: AUTO, from: "  const feat = typeof traits === \"string\" ? { system: { traits } } : Array.from(actor?.items ?? []).find((i) => i.name === label);", to: "  const feat = Array.from(actor?.items ?? []).find((i) => i.name === label);" },
  { name: "spendReaction ignores the traits given", file: AUTO, from: "    const feat = typeof traits === \"string\" ? { system: { traits } } : Array.from(actor.items ?? []).find((i) => i.name === label);", to: "    const feat = Array.from(actor.items ?? []).find((i) => i.name === label);" },
  { name: "the Flurry never calls Stunning Fist", file: B3, from: "      await stunningFist(actor, checks);\n", to: "\n" },
  { name: "Stunning Fist at the Level DC", file: A, from: "save: STUNNING_FIST_LADDER.save, scope: \"targets\", dc,", to: "save: STUNNING_FIST_LADDER.save, scope: \"targets\"," },
  { name: "Inner Magic grants again and again", file: A, from: "  const had = grantedSpellOf(items, item.id);\n  if (had) {", to: "  const had = grantedSpellOf(items, item.id);\n  if (false) {" },
  { name: "Inner Magic grants any spell", file: A, from: "async use(actor, item) { return grantPathSpell(actor, item, { title: \"Inner Magic\", slot: \"cantrip\" }); }", to: "async use(actor, item) { return grantPathSpell(actor, item, { title: \"Inner Magic\", slot: \"eligible\" }); }" },
  { name: "Snake Stance's miss is never heard", file: SCRIPT, from: "Hooks.on(\"trgPrimeStrikeResolved\", (ctx) => { onStrikeResolvedB6(ctx)", to: "Hooks.on(\"trgPrimeStrikeRolled\", (ctx) => { onStrikeResolvedB6(ctx)" },
  { name: "Mystics made before 0.7.0 are left", file: SCRIPT, from: "    (async () => { for (const actor of game.actors ?? []) await reconcileB6Actor(actor); })()", to: "    (async () => {})()" },
  // F — 0.7.1
  { name: "Disciplined Flurry reads \"reactionand\" again", file: B3, from: "${inCombat ? \" (spends your reaction and this technique's use)\" : \" (spends this technique's use)\"}?</p>`,", to: "${inCombat ? \" (spends your reaction\" : \" (\"}and this technique's use)?</p>`," },
  // versions
  { name: "the module accepts 3.669.2", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.671.0\";", to: "const REQUIRED_SYSTEM = \"3.669.2\";" },
  { name: "the manifest accepts 3.669.2", file: MANIFEST, from: "\"minimum\": \"3.671.0\"", to: "\"minimum\": \"3.669.2\"" },
  { name: "the manifest says 0.6.2", file: MANIFEST, from: "\"version\": \"0.8.1\"", to: "\"version\": \"0.6.2\"" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block6.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block6: verify-block6 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block6: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block6: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
