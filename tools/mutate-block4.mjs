#!/usr/bin/env node
/**
 * mutate-block4 — the mutation half of verify-block4. Each mutation breaks
 * one printed rule, one ruling, one declaration the system reads or one
 * wire of Block 4; verify-block4 must fail on every one. Files are restored
 * after each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block4.mjs
 *
 * The printed text is read from the book extract, never typed, so the
 * mutations here go at what is authored: fields, tables, declarations, the
 * pure decisions and the wiring.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block4.mjs"), A = f("module", "block4-automations.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json");
const AUTO = f("module", "automations.mjs");

const MUTATIONS = [
  // A — the classes, as printed
  { name: "the Ghostwalker has 6 hit points", file: C, from: "    hitPoints: 8, skillPoints: 8,", to: "    hitPoints: 6, skillPoints: 8," },
  { name: "the Kensai has 6 skill points", file: C, from: "    hitPoints: 10, skillPoints: 4,", to: "    hitPoints: 10, skillPoints: 6," },
  { name: "the Oathblade's wealth is 1", file: C, from: "    wealth: \"2\",", to: "    wealth: \"1\"," },
  { name: "the Kensai forgets its Intelligence minimum", file: C, from: "minimumAbilities: { dexterity: 2, intelligence: 2 }", to: "minimumAbilities: { dexterity: 2 }" },
  { name: "the Oathblade is granted Weapon Finesse", file: C, from: "    grantedFeats: \"1: Quick Draw\",", to: "    grantedFeats: \"1: Weapon Finesse\"," },
  { name: "the class table loses its Bonus Feats column", file: C, from: "const rows = (name) => BOOK.tables[name].map(([, ...r]) => [...r, 0, 0, 0]);", to: "const rows = (name) => BOOK.tables[name].map(([, ...r]) => [...r.slice(0, 5), 0, 0, 0, 0]);" },
  { name: "the Ghostwalker loses Vanishing Retreat", file: C, from: "1: Unseen Assault, 1: Vanishing Retreat, 1: Ghost Arts", to: "1: Unseen Assault, 1: Ghost Arts" },
  { name: "Considered Mind uses Wisdom", file: C, from: "actionAbilityOptions: [{ action: \"refocus\", ability: \"intelligence\", label: \"Considered Mind\" }]", to: "actionAbilityOptions: [{ action: \"refocus\", ability: \"wisdom\", label: \"Considered Mind\" }]" },
  { name: "Oathblade's Resolve gives nothing", file: C, from: "    flags: { convictionPool: 1 }", to: "    flags: {}" },
  { name: "the Kensai's tradition uses Wisdom", file: C, from: "traditionAbility(KS, \"intelligence\", \"Kensai: MAGICAL TRADITION\")", to: "traditionAbility(KS, \"wisdom\", \"Kensai: MAGICAL TRADITION\")" },
  { name: "a feat keeps only its first prerequisite (Formless Cut loses \"any three Kensai feats\")", file: C, from: "line.replace(/^\\*\\*Prerequisites\\*\\*\\s*/, \"\").trim() : \"\";\n  if (prerequisites !== typed)", to: "line.replace(/^\\*\\*Prerequisites\\*\\*\\s*/, \"\").split(\",\")[0].trim() : \"\";\n  if (false)" },
  { name: "Extra Form cannot be taken twice", file: C, from: "  F(\"Extra Form\", { prerequisites: \"Level 3\", sourceClass: KS, repeatable: true,", to: "  F(\"Extra Form\", { prerequisites: \"Level 3\", sourceClass: KS," },
  { name: "the bullet lists lose their lines", file: C, from: "    if (/^-\\s+/.test(line)) { bullets.push(line.replace(/^-\\s+/, \"\")); continue; }", to: "    if (/^-\\s+/.test(line)) continue;" },
  // B — the declarations
  { name: "Unseen Assault is 2d6 at 4th", file: C, from: "{ level: 5, count: 2 }, { level: 9, count: 3 }", to: "{ level: 4, count: 2 }, { level: 9, count: 3 }" },
  { name: "Unseen Assault is not once per round", file: C, from: "die: \"d6\", oncePerRound: true, byLevel", to: "die: \"d6\", oncePerRound: false, byLevel" },
  { name: "Ghost Blade is AR 2 at 6th", file: C, from: "ar: [{ level: 6, value: 1 },", to: "ar: [{ level: 6, value: 2 }," },
  { name: "Ambusher's Patience is not once per creature", file: C, from: "dice: 2, whenUndetected: true, oncePerCreature: true", to: "dice: 2, whenUndetected: true, oncePerCreature: false" },
  { name: "Dread Wolf works against anyone", file: C, from: "when: { checkTypes: [\"attack\"], targetStates: [\"isolated\"] } }),", to: "when: { checkTypes: [\"attack\"] } })," },
  { name: "Flickering Flame loses its minimum", file: C, from: "C({ valueFrom: \"intelligence/2\", valueMin: 1, label: \"Flickering Flame\", scope: \"Reflex saves\"", to: "C({ valueFrom: \"intelligence/2\", label: \"Flickering Flame\", scope: \"Reflex saves\"" },
  { name: "Steel Viper is Int × 3", file: C, from: "valueFrom: \"intelligence*5\"", to: "valueFrom: \"intelligence*3\"" },
  { name: "Stone Serpent works adjacent", file: C, from: "rangeBands: [\"reach\"]", to: "rangeBands: [\"adjacent\"]" },
  { name: "Gale Cutter's row names the actions bare (the system refuses it)", file: C, from: "label: \"Gale Cutter\", when: { actions: [\"grappleAttack\"] } }]", to: "label: \"Gale Cutter\", actions: [\"grappleAttack\"] }]" },
  { name: "Iron Tortoise leaves out the Trip", file: C, from: "when: { actions: [\"shoveAttack\", \"reposition\", \"tripAttack\"] } }]", to: "when: { actions: [\"shoveAttack\", \"reposition\"] } }]" },
  { name: "Ghost Fox's damage applies to any target", file: C, from: "when: { checkTypes: [\"damage\"], targetStates: [\"flatfooted\"] } })", to: "when: { checkTypes: [\"damage\"] } })" },
  { name: "Echoing Crane is a dodge bonus", file: C, from: "target: \"defence\", type: \"class\", valueFrom: \"classBonus-1\", label: \"Echoing Crane\"", to: "target: \"defence\", type: \"dodge\", valueFrom: \"classBonus-1\", label: \"Echoing Crane\"" },
  { name: "a Combat Form's modifiers are circumstance bonuses", file: C, from: "const C = (o) => ({ kind: \"modifier\", type: \"class\", auto: true, ...o });", to: "const C = (o) => ({ kind: \"modifier\", type: \"circumstance\", auto: true, ...o });" },
  { name: "Weapon Discipline is a class bonus again (B4-2)", file: A, from: "{ kind: \"modifier\", valueFrom: \"classBonus-1\", valueMin: 0, type: \"untyped\", label: \"Weapon Discipline\", scope, auto: true, when: { checkTypes: [\"attack\"], attackGroups: [g] } },", to: "{ kind: \"modifier\", valueFrom: \"classBonus-1\", valueMin: 0, type: \"class\", label: \"Weapon Discipline\", scope, auto: true, when: { checkTypes: [\"attack\"], attackGroups: [g] } }," },
  { name: "Weapon Discipline's Finesse in two hands too", file: A, from: "weaponTraitGrants: [{ groups: [g], trait: \"Finesse\", oneHanded: true, label: \"Weapon Discipline\" }]", to: "weaponTraitGrants: [{ groups: [g], trait: \"Finesse\", label: \"Weapon Discipline\" }]" },
  { name: "Challenge applies to every target", file: A, from: "{ kind: \"modifier\", valueFrom: \"classBonus\", type: \"class\", label: \"Challenge\", scope, auto: true, when: { checkTypes: [\"attack\"], attackModes: [\"melee\"], targetUuids: at } },", to: "{ kind: \"modifier\", valueFrom: \"classBonus\", type: \"class\", label: \"Challenge\", scope, auto: true, when: { checkTypes: [\"attack\"], attackModes: [\"melee\"] } }," },
  { name: "Distant Honour reaches past the first increment", file: A, from: "const when = { attackModes: [\"ranged\"], attackGroups: [\"bow\"], rangeBands: [\"first\"], targetUuids: at };", to: "const when = { attackModes: [\"ranged\"], attackGroups: [\"bow\"], targetUuids: at };" },
  { name: "Challenge's penalty is −2 against the target too", file: A, from: "scope: \"against every creature but your challenged target\", not: { sourceUuids: at } }]", to: "scope: \"against every creature but your challenged target\", when: { actions: [\"strike\"] } }]" },
  { name: "Guarded Commitment changes nothing", file: A, from: "value: guarded ? -1 : -2,", to: "value: -2," },
  { name: "Oath of Honour's advantage ignores the allies", file: A, from: "targetUuids: [targetUuid], targetStates: [\"duel\"] } }] };", to: "targetUuids: [targetUuid] } }] };" },
  { name: "Retribution's AR is lost", file: A, from: "  if (rending > 0) out.strikeRending = [{ value: rending, label, when: { targetUuids: at, attackModes: [\"melee\"] } }];", to: "" },
  { name: "Guardianship's penalty hits the Oathblade too", file: A, from: "when: { checkTypes: [\"attack\"], not: { targetUuids: [oathbladeUuid] } } }] };", to: "when: { checkTypes: [\"attack\"] } }] };" },
  { name: "Fealty's charge gains AR 2", file: A, from: "strikeRending: [{ value: 1, label: \"Oath of Fealty\", when: { targetUuids: [targetUuid] } }]", to: "strikeRending: [{ value: 2, label: \"Oath of Fealty\", when: { targetUuids: [targetUuid] } }]" },
  { name: "Shelter Under Oath covers every save", file: A, from: "auto: true, when: { checkTypes: [\"save\"], sourceUuids: [targetUuid] } }] };", to: "auto: true, when: { checkTypes: [\"save\"] } }] };" },
  // C — the pure decisions
  { name: "Ghost Arts: no fourth-level art", file: A, from: "export const GHOST_ARTS_BY_LEVEL = Object.freeze([{ level: 1, count: 2 }, { level: 4, count: 3 },", to: "export const GHOST_ARTS_BY_LEVEL = Object.freeze([{ level: 1, count: 2 }, { level: 5, count: 3 }," },
  { name: "Extra Ghost Art adds nothing", file: A, from: "  return byLevelCount(GHOST_ARTS_BY_LEVEL, level) + Math.max(0, int(extras));", to: "  return byLevelCount(GHOST_ARTS_BY_LEVEL, level);" },
  { name: "Shadow Double is a 4th-level art", file: A, from: "\"Falling Shadow\": 4, \"Caltrop Blossom\": 4, \"Shadow Double\": 8,", to: "\"Falling Shadow\": 4, \"Caltrop Blossom\": 4, \"Shadow Double\": 4," },
  { name: "the picker offers arts above the level", file: A, from: "    .filter(([name, need]) => int(level) >= need && !have.has(norm(name)))", to: "    .filter(([name]) => !have.has(norm(name)))" },
  { name: "Caltrop Blossom grows every 3 levels", file: A, from: "  return `${2 + Math.floor((lvl - 4) / 4)}d6`;", to: "  return `${2 + Math.floor((lvl - 4) / 3)}d6`;" },
  { name: "the Technique DC forgets the level", file: A, from: "  return 10 + int(ability) + Math.max(0, int(level));", to: "  return 10 + int(ability);" },
  { name: "Gale Cutter's Flow Strike is always −5, even when the penalty is smaller", file: A, from: "  return galeCutter ? Math.max(third, -5) : third;", to: "  return galeCutter ? -5 : third;" },
  { name: "Fleeting Shadow adds nothing", file: A, from: "  return fleetingShadow ? 10 : 5;", to: "  return 5;" },
  { name: "Ember Reaver is not capped at Int (B4-4)", file: A, from: "  return Math.min(Math.max(0, int(intelligence)), Math.max(0, int(current)) + 1);", to: "  return Math.max(0, int(current)) + 1;" },
  { name: "a blend keeps only the second form's rows", file: A, from: "      if (Array.isArray(value)) out[key] = [...(Array.isArray(out[key]) ? out[key] : []), ...value];", to: "      if (Array.isArray(value)) out[key] = value;" },
  { name: "once per round forgets the combat", file: A, from: "  return Boolean(record && combatId && String(record.combatId) === String(combatId) && int(record.round) === int(round));", to: "  return Boolean(record && int(record.round) === int(round));" },
  { name: "Unpaid Debt keeps Retribution through a hit that deals nothing … and a miss spends it", file: A, from: "  if (mark.keepOnMiss) return Boolean(hits) && int(damageTaken) > 0;", to: "  if (mark.keepOnMiss) return true;" },
  { name: "a next-Strike bonus goes on a Strike at anyone", file: A, from: "  if (mark.targetUuid && mark.targetUuid !== targetUuid) return false;", to: "" },
  { name: "the GM is asked before the player", file: A, from: "  return player?.id ?? activeGMId ?? null;", to: "  return activeGMId ?? player?.id ?? null;" },
  // D — registration
  { name: "the Kensai may carry a shield", file: REG, from: "      armourCategories: [\"Light\", \"Medium\"], armourNames: [], otherTiers: [\"light\", \"medium\"], armourExclude: [],\n      shieldCategories: [\"buckler\"],", to: "      armourCategories: [\"Light\", \"Medium\"], armourNames: [], otherTiers: [\"light\", \"medium\"], armourExclude: [],\n      shieldCategories: [\"buckler\", \"light\"]," },
  { name: "the Oathblade loses the katana", file: REG, from: "weaponNames: [\"Katana\", \"Wakizashi\"],", to: "weaponNames: [\"Wakizashi\"]," },
  { name: "Block 4's automations are never registered", file: REG, from: "  for (const [name, entry] of Object.entries(BLOCK4_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);\n", to: "" },
  { name: "Shadow Double is not offered when attacked", file: REG, from: "  for (const [name, spec] of Object.entries(BLOCK4_DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);\n", to: "" },
  { name: "Deflect Arrow is offered without Evade", file: A, from: "    find: (actor) => (ownedNamed(actor, \"Inner Discipline\") ? ownedNamed(actor, \"Deflect Arrow\") : null),", to: "    find: (actor) => ownedNamed(actor, \"Deflect Arrow\")," },
  { name: "Dancing Leaf's Use says nothing", file: A, from: "  \"dancing leaf\": passive(", to: "  \"dancing leafs\": passive(" },
  // E — wiring and the core's seams
  { name: "Flow Strike never hears the Strike", file: SCRIPT, from: "Hooks.on(\"trgPrimeStrikeResolved\", (ctx) => { onStrikeResolved(ctx)", to: "Hooks.on(\"trgPrimeStrikeRolled\", (ctx) => { onStrikeResolved(ctx)" },
  { name: "Vanishing Retreat never hears Unseen Assault", file: SCRIPT, from: "Hooks.on(\"trgPrimeAmbushDealt\", (ctx) => { onAmbushDealt(ctx)", to: "Hooks.on(\"trgPrimeAmbushApplied\", (ctx) => { onAmbushDealt(ctx)" },
  { name: "the turn-start work never runs", file: SCRIPT, from: "Hooks.on(\"trgPrimeTurnEnded\", (ctx) => { onTurnEndedB4(ctx)", to: "Hooks.on(\"trgPrimeTurnStarted\", (ctx) => { onTurnEndedB4(ctx)" },
  { name: "Block 4's socket is never registered", file: SCRIPT, from: "  registerBlock4Socket();\n", to: "" },
  { name: "the module accepts 3.667.4", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.674.2\";", to: "const REQUIRED_SYSTEM = \"3.667.4\";" },
  { name: "the manifest says 0.5.0", file: MANIFEST, from: "\"version\": \"1.0.2\"", to: "\"version\": \"0.5.1\"" },
  { name: "Flow Strike is offered after a Flourish was spent", file: A, from: "  const quiet = await h().traitCheck(attacker, action);\n  if (quiet?.blocked) return;\n  const gale", to: "  const gale" },
  { name: "Flow Strike counts towards the penalty", file: A, from: "mapOverride: penalty, mapFrozen: true,", to: "mapOverride: penalty, mapFrozen: false," },
  { name: "Steel Viper deals the miss in full", file: A, from: "preset: { glancing: true, targetToken: tokenOf(target)", to: "preset: { glancing: false, targetToken: tokenOf(target)" },
  { name: "Black Lotus rolls the damage at once", file: A, from: "rollWeaponAttack(actor, weapon, { holdDamage: true, optionLabel: \"Black Lotus\" })", to: "rollWeaponAttack(actor, weapon, { optionLabel: \"Black Lotus\" })" },
  { name: "Form Reversal waits a round like any stance", file: A, from: "{ apCost: 0, waiveWait: true, spendCombatForm: false }", to: "{ apCost: 0, spendCombatForm: false }" },
  { name: "Ghost Art Mastery writes on the feat, which the system never reads", file: A, from: "      name: `Ghost Art Mastery: ${pick}`, img: item.img, transfer: true,", to: "      name: `Ghost Art Mastery: ${pick}`, img: item.img, transfer: false," },
  { name: "a Challenge's partners are never cleaned up", file: A, from: "e.getFlag?.(MODULE_ID, \"itChallengePartner\") === ch.id", to: "e.getFlag?.(MODULE_ID, \"itChallengePartner\") === ch.targetUuid" },
  { name: "Ember Reaver never resets at combat end", file: A, from: "    await stance.update({ [`flags.${SYSTEM_ID}.conditionals`]: rows, [`flags.${MODULE_ID}.emberStacks`]: 0 });", to: "    await stance.update({ [`flags.${SYSTEM_ID}.conditionals`]: rows });" },
  { name: "Steel Viper's miss reads a flag no form declares", file: A, from: "inForm(attacker, \"itSteelViperMiss\")", to: "inForm(attacker, \"itSteelViperMisses\")" },
  { name: "the Land the blow button is never bound", file: AUTO, from: "        else if (kind === \"landHeldStrike\" || kind === \"shadowyStrike\") {", to: "        else if (kind === \"landHeldStrikes\" || kind === \"shadowyStrike\") {" },
  // found in review
  { name: "the GM posts the Land the blow card (its player cannot mark it)", file: A, from: "    await offerTo(attacker, \"heldBlowCard\", { record, nextName: next.name });", to: "    await postHeldBlowCard(attacker, { record, nextName: next.name });" },
  { name: "a stale held blow blocks Black Lotus for good", file: A, from: "    if (pending) await actor.unsetFlag(SYSTEM_ID, \"heldStrike\");", to: "" },
  { name: "Deflect Arrow's +4 after a refused Evade", file: A, from: "      if (!evaded) return;\n", to: "" },
  { name: "more damage to a downed creature drops it again", file: A, from: "  return int(hpAfter) <= 0 && int(hpAfter) + int(amount) > 0;", to: "  return int(hpAfter) <= 0;" },
  { name: "Claim the Next Foe on anyone's blow", file: A, from: "if (dropped && source === oathblade && ownedNamed(oathblade, \"Claim the Next Foe\"))", to: "if (dropped && ownedNamed(oathblade, \"Claim the Next Foe\"))" },
  { name: "Steel Viper adds its whole shift again", file: A, from: "  const delta = int(wanted) - current;", to: "  const delta = int(wanted);" },
  { name: "Honour re-armed when the board cannot say", file: A, from: "  if ((await allyAdjacent(actor, target)) !== false) return false;", to: "  if (await allyAdjacent(actor, target)) return false;" },
  { name: "a helper the system does not offer", file: A, from: "await h().rollWeaponDamage(attacker, weapon,", to: "await h().rollStrikeDamage(attacker, weapon," }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block4.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block4: verify-block4 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block4: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block4: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
