#!/usr/bin/env node
/**
 * mutate-block5 — the mutation half of verify-block5. Each mutation breaks
 * one printed rule, one ruling, one declaration the system reads or one
 * wire of Block 5; verify-block5 must fail on every one. Files are restored
 * after each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block5.mjs
 *
 * The printed text is read from the book extract, never typed, so the
 * mutations here go at what is authored: fields, tables, declarations, the
 * pure decisions and the wiring. The core's Block 5 seams have their own
 * pair in the system (verify/mutate-block5-core).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block5.mjs"), A = f("module", "block5-automations.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json");
const AUTO = f("module", "automations.mjs");
const B3 = f("module", "block3-automations.mjs"), B4 = f("module", "block4-automations.mjs"), SA = f("module", "skill-action-automations.mjs");

const MUTATIONS = [
  // A — the feats, as printed
  { name: "Adaptive Mind keeps the point only on a Critical", file: C, from: "degrees: [\"success\", \"critical\", \"heroic\"]", to: "degrees: [\"critical\", \"heroic\"]" },
  { name: "Fortune's Reversal forgets the saving throw", file: C, from: "checkTypes: [\"attack\", \"skill\", \"save\"], reaction: true", to: "checkTypes: [\"attack\", \"skill\"], reaction: true" },
  { name: "Fortified Carapace gives +2", file: C, from: "NATURAL_DR(1, \"Fortified Carapace\")", to: "NATURAL_DR(2, \"Fortified Carapace\")" },
  { name: "Hoardkeeper's Eye leaves the sense at 30 feet", file: C, from: "fixedFeet: 60,", to: "fixedFeet: 30," },
  { name: "Immovable Plating's push is not shorter", file: C, from: "{ forcedMovementReduction: 5 }", to: "{ forcedMovementReduction: 0 }" },
  { name: "Immovable Plating's DC is +1", file: C, from: "defenceDC: [{ dc: \"fortitudeDC\", value: 2, label: \"Immovable Plating\"", to: "defenceDC: [{ dc: \"fortitudeDC\", value: 1, label: \"Immovable Plating\"" },
  { name: "Keeper of Endings gives no Undead Lore", file: C, from: "      grantedSpecialistSkills: \"Undead Lore\",\n", to: "" },
  { name: "Many-Faceted Vigilance gives +5 to initiative", file: C, from: "effects: [INITIATIVE(10)]\n", to: "effects: [INITIATIVE(5)]\n" },
  { name: "Mist Veil's aura is always on", file: C, from: "radius: 10, includeSelf: true, emitterState: \"mist-veil\",", to: "radius: 10, includeSelf: true," },
  { name: "Spirit Beacon's aura reaches 40 feet", file: C, from: "radius: 20, includeSelf: true, emitterState: \"spirit-beacon\",", to: "radius: 40, includeSelf: true, emitterState: \"spirit-beacon\"," },
  { name: "Tianzhi Discipline keeps a better roll", file: C, from: "set: \"critical\", exact: true,", to: "set: \"critical\"," },
  { name: "Tianzhi Meditation gives one advantage per trance", file: C, from: "slot: \"tianzhiMeditation\", advantage: true,", to: "advantage: true," },
  { name: "Wings Unfurled flies 20 feet", file: C, from: "movement: { key: \"fly\", orLand: true }", to: "movement: { key: \"fly\", feet: 20 }" },
  { name: "Draconic Armament cannot be taken twice", file: C, from: "    repeatable: true,\n    how: \"press Use to choose the Bite", to: "    how: \"press Use to choose the Bite" },
  { name: "a feat keeps only its first prerequisite", file: C, from: "return line.replace(/^\\*\\*Prerequisites\\*\\*\\s*/, \"\").trim();", to: "return line.replace(/^\\*\\*Prerequisites\\*\\*\\s*/, \"\").split(\",\")[0].trim();" },
  { name: "Celestial Breath's table is dropped", file: C, from: "    if (/^\\|/.test(line)) { table.push(line); continue; }", to: "    if (/^\\|/.test(line)) continue;" },
  { name: "the Kornargon is not a race the trait line names", file: C, from: "HUMAN: \"Human\", KORNARGON: \"Kornargon\", ", to: "HUMAN: \"Human\", " },
  { name: "Water Bolt deals 4d6", file: C, from: "damage: { formula: \"4d4\", type: \"bludgeoning\" }", to: "damage: { formula: \"4d6\", type: \"bludgeoning\" }" },
  { name: "the Draconic Bite is 1d8", file: C, from: "name: \"Draconic Bite\", damage: \"1d6\"", to: "name: \"Draconic Bite\", damage: \"1d8\"" },
  { name: "a racial bonus is written \"racial\"", file: C, from: "const C = conditional;", to: "const C = (o) => ({ ...o, ...(o.type ? { type: o.type } : {}) });" },
  // B — the module's tables and decisions
  { name: "the Tsuchi lose Magic Stone (B5-2)", file: A, from: "also: Object.freeze({ Tsuchi: [\"Magic Stone\"] })", to: "also: Object.freeze({})" },
  { name: "the Suiryoku lose Water Walk (B5-2)", file: A, from: "also: Object.freeze({ Suiryoku: [\"Water Walk\"] })", to: "also: Object.freeze({})" },
  { name: "Celestial Breath may roll 1d6", file: A, from: "return Math.max(2, Math.floor(int(level) / 2));", to: "return Math.max(1, Math.floor(int(level) / 2));" },
  { name: "Serpent's Venom counts per 2 levels", file: A, from: "return Math.max(1, Math.floor(int(level) / 3));", to: "return Math.max(1, Math.floor(int(level) / 2));" },
  { name: "the Kura breathes fire", file: A, from: "Kura: Object.freeze({ type: \"cold\"", to: "Kura: Object.freeze({ type: \"fire\"" },
  { name: "the Ren's Speed rises by 5", file: A, from: "{ key: \"system.combat.movement.land.untyped\", type: \"custom\", value: \"10\", priority: 20 }", to: "{ key: \"system.combat.movement.land.untyped\", type: \"custom\", value: \"5\", priority: 20 }" },
  { name: "the Byakko's +2 reaches ranged damage", file: A, from: "when: { checkTypes: [\"damage\"], attackModes: [\"melee\"] }", to: "when: { checkTypes: [\"damage\"] }" },
  { name: "Living Lantern draws a bright ring", file: A, from: "radiusFeet: 10, brightFeet: 0 }),", to: "radiusFeet: 10 })," },
  { name: "Spirit Beacon's bright light is two steps", file: A, from: "key: \"spirit-beacon\", label: \"Spirit Beacon\", steps: 3,", to: "key: \"spirit-beacon\", label: \"Spirit Beacon\", steps: 2," },
  { name: "Web Snare's Partial is −5 feet", file: A, from: "partial: { feet: 10, rounds: 2 } }),", to: "partial: { feet: 5, rounds: 2 } })," },
  { name: "Blinding Majesty's Fumble does not blind", file: A, from: "fumble: [{ key: \"blinded\", value: null, rounds: 1 }, { key: \"dazzled\", value: null, minutes: 1 }]", to: "fumble: [{ key: \"dazzled\", value: null, minutes: 1 }]" },
  { name: "Web Snare's Failure is flat-footed too", file: A, from: "if (d === \"failure\") return [\"immobilised\"];", to: "if (d === \"failure\") return [\"immobilised\", \"flatFooted\"];" },
  { name: "Foxfire's move is once a round", file: A, from: "int(record.round) === int(combat.round) && int(record.turn) === int(combat.turn);", to: "int(record.round) === int(combat.round);" },
  { name: "Draconic Armament gives one attack however often it is taken", file: A, from: "if (have.size >= Math.min(2, Math.max(1, int(featCopies)))) return [];", to: "if (have.size >= 1) return [];" },
  { name: "Spirit Roar's immunity outlasts the encounter", file: A, from: "return Boolean(record && combatId && String(record.combatId) === String(combatId) && (record.uuids ?? []).includes(uuid));", to: "return Boolean(record && combatId && (record.uuids ?? []).includes(uuid));" },
  { name: "Raptorial Refinement leaves the blade at AR 1", file: A, from: "  const armourRending = Math.max(2, int(system.armourRending));\n  const traits = String(system.traits ?? \"\");", to: "  const armourRending = int(system.armourRending);\n  const traits = String(system.traits ?? \"\");" },
  { name: "THE DEFECT: the refined blade's AR is not on its trait line", file: A, from: "  return { armourRending, traits: bladeTraitsWithAR(versatile, armourRending) };", to: "  return { armourRending, traits: versatile };" },
  { name: "an old AR is kept beside the new", file: A, from: ".filter((t) => t && !/^AR\\s*\\d+$/i.test(t));", to: ".filter((t) => t);" },
  { name: "THE DEFECT: Awaken's Speed is a plain add to the object", file: A, from: "changes: [{ key: \"system.combat.movement.land.untyped\", type: \"custom\", value: \"10\", priority: 20 }],", to: "changes: [{ key: \"system.combat.movement.land\", mode: 2, value: \"10\", priority: 20 }]," },
  { name: "THE DEFECT: Awaken's Swim is a plain add to the object", file: A, from: "changes: [{ key: \"system.combat.movement.swim.untyped\", type: \"custom\", value: \"10\", priority: 20 }],", to: "changes: [{ key: \"system.combat.movement.swim\", mode: 2, value: \"10\", priority: 20 }]," },
  { name: "THE DEFECT: the mist's switch runs out on the clock in combat", file: A, from: "until: Math.trunc(Number(now) || 0) + (inCombat ? SWITCH_IN_COMBAT : 12) } };", to: "until: Math.trunc(Number(now) || 0) + 12 } };" },
  { name: "the beacon's switch runs out on the clock in combat", file: A, from: "until: Math.trunc(Number(now) || 0) + (inCombat ? SWITCH_IN_COMBAT : 66) } };", to: "until: Math.trunc(Number(now) || 0) + 66 } };" },
  { name: "the Use never says it is in combat", file: A, from: "      system: mistFlags(now, inCombatNow(actor))", to: "      system: mistFlags(now)" },
  { name: "Forgeheart raises nothing", file: A, from: "  \"forgeheart\": Object.freeze({ itemType: \"heritage\", itemName: \"Zenki\", label: \"Zenki\", value: 2 }),", to: "  \"forgeheart\": Object.freeze({ itemType: \"heritage\", itemName: \"Zenki\", label: \"Zenki\", value: 1 })," },
  { name: "the raise reaches every row", file: A, from: "(r && r.label === label && r.kind === \"modifier\" ? { ...r, value } : r)", to: "(r && r.kind === \"modifier\" ? { ...r, value } : r)" },
  { name: "THE DEFECT: Forgeheart adds its own tick beside the heritage's", file: C, from: "    effects: [(id, n) => resistanceEffect(id, n, \"fire\")]\n  }),", to: "    effects: [(id, n) => resistanceEffect(id, n, \"fire\")],\n    flags: { conditionals: [C({ kind: \"modifier\", value: 2, type: \"racial\", label: \"Forgeheart\", scope: \"x\", auto: false, when: { checkTypes: [\"skill\"], subjects: [\"crafting\"] } })] }\n  })," },
  { name: "the ticks are not raised when the feat arrives", file: A, from: "  if ((item.type === \"feat\" && RAISED_TICKS[name]) || Object.values(RAISED_TICKS).some((s) => s.itemType === item.type && s.itemName === item.name)) await raiseTicks(actor);\n", to: "" },
  { name: "the ticks stay raised when the feat goes", file: A, from: "  if (item.type === \"feat\" && RAISED_TICKS[name]) await raiseTicks(actor);\n  if (item.type === \"feat\" && name === \"elemental attunement\") {", to: "  if (item.type === \"feat\" && name === \"elemental attunement\") {" },
  { name: "a blade arriving keeps its old traits", file: A, from: "  if (item.type === \"weapon\" && name === \"raptorial blade\") await bladeARInTraits(actor);\n", to: "" },
  { name: "a put-back blade loses its AR text", file: A, from: "\"system.traits\": bladeTraitsWithAR(String(before.traits ?? \"\"), ar)", to: "\"system.traits\": String(before.traits ?? \"\")" },
  { name: "a 0.6.0 feat keeps its own tick", file: A, from: "own.filter((r) => norm(r?.label) !== featKey)", to: "own" },
  { name: "old characters are never brought into step", file: SCRIPT, from: "    (async () => { for (const actor of game.actors ?? []) await reconcileB5Actor(actor); })()", to: "    (async () => {})()" },
  { name: "THE DEFECT: a reaction ignores Battle Readiness", file: AUTO, from: "  if (typeof h?.spendReaction === \"function\") {", to: "  if (false) {" },
  { name: "the reaction is spent without its traits", file: AUTO, from: "return Boolean(await h.spendReaction(actor, label, { traits: String(feat?.system?.traits ?? \"\") }));", to: "return Boolean(await h.spendReaction(actor, label));" },
  { name: "THE DEFECT: Spirit Roar's later enemies are asked for conviction", file: A, from: "{ presetDice: dice, presetConvictionDie: convictionDie, dcOverride: dc,", to: "{ presetDice: dice, dcOverride: dc," },
  { name: "the first enemy's die is not taken", file: A, from: "      if (!dice) convictionDie = Math.max(0, Math.trunc(Number(check.convictionDie) || 0));\n", to: "" },
  { name: "Hive Coordination is not asked on Aid Another", file: C, from: "\"aidDefensive\", \"aidAnother\", \"aid\"", to: "\"aidDefensive\", \"aid\"" },
  { name: "Magma Channel is spent by a miss", file: A, from: "once: true, spendOnHit: true, label: \"Magma Channel\"", to: "once: true, label: \"Magma Channel\"" },
  { name: "Magma Channel's Strike is not magical", file: A, from: "  magicalAttacks: Object.freeze({ label: \"Magma Channel\" })\n", to: "" },
  { name: "Elemental Infusion reaches ranged Strikes", file: A, from: "damageType: String(damageType ?? \"\"), scope: \"melee\", once: false", to: "damageType: String(damageType ?? \"\"), scope: \"any\", once: false" },
  { name: "Spirit Beacon's switch lasts a round", file: A, from: "(inCombat ? SWITCH_IN_COMBAT : 66)", to: "(inCombat ? SWITCH_IN_COMBAT : 6)" },
  { name: "Elemental Attunement's DC bonus reaches every spell", file: A, from: "traits: [...element.spellTraits], innateOnly: true }", to: "innateOnly: true }" },
  { name: "Elemental Attunement's DC bonus reaches prepared spells too", file: A, from: "traits: [...element.spellTraits], innateOnly: true }", to: "traits: [...element.spellTraits] }" },
  { name: "Elemental Attunement's attack bonus reaches every spell attack", file: A, from: "checkTypes: [\"attack\"], actions: [\"innateSpellAttack\"], traits:", to: "checkTypes: [\"attack\"], traits:" },
  { name: "Guardian's Intercession is offered when expended", file: A, from: "  if (!hasUse(item)) return \"expended — Refocus restores it\";\n", to: "" },
  { name: "Guardian's Intercession is offered to one held fast", file: A, from: "const CANNOT_MOVE = Object.freeze([\"immobilised\", \"grabbed\", ", to: "const CANNOT_MOVE = Object.freeze([" },
  { name: "Guardian's Intercession never asks whether it can be used", file: A, from: "    requires: (actor, item) => guardianRefusal(actor, item),\n", to: "" },
  { name: "Spirit Roar is paid before its first roll", file: A, from: "    let paid = false;\n", to: "    let paid = await techniqueBegins(actor, item, \"Spirit Roar\", 1);\n" },
  { name: "Spirit Roar is paid for every enemy", file: A, from: "        paid = true;\n      }\n      if (!dice) convictionDie", to: "      }\n      if (!dice) convictionDie" },
  { name: "Waiting Blade waits out a reaction's miss", file: A, from: "  if (missedHere(ctx) && !held && melee && !ctx.noReactions) {\n    const wb", to: "  if (missedHere(ctx) && !held && melee && !ctx.noReactions && !isReaction) {\n    const wb" },
  { name: "Web Snare leaves the old web on the same creature", file: A, from: "      if (before?.uuid) {\n        const prior", to: "      if (before?.uuid && before.uuid !== target.uuid) {\n        const prior" },
  { name: "Foxfire's motes are looked for on the scene in view", file: A, from: "removeLightCircles(castId, { sceneId: effect.getFlag(MODULE_ID, \"foxfireScene\") ?? \"\" })", to: "removeLightCircles(castId)" },
  { name: "Waiting Blade's question never reaches the player", file: A, from: "registerSharedOps({ offers: { b5WaitingBlade: waitingBladeOffer } });", to: "" },
  { name: "Guardian's Intercession is the defender's own reaction", file: A, from: "    forAlly: true,\n    reachFeet: 5,", to: "    reachFeet: 5," },
  { name: "Guardian's Intercession reaches 10 feet", file: A, from: "    forAlly: true,\n    reachFeet: 5,", to: "    forAlly: true,\n    reachFeet: 10," },
  { name: "Awaken the Animism's use is spent twice", file: A, from: "  ownsFocusUse: true,\n  async use(actor, item) {\n    const her = heritageName(actor);", to: "  async use(actor, item) {\n    const her = heritageName(actor);" },
  // C — registration and wiring
  { name: "Bestial Resilience is opened to every Miraku", file: REG, from: "{ name: \"Bestial Resilience\", heritages: [\"Mujina\"] }", to: "\"Bestial Resilience\"" },
  { name: "the lights are never registered", file: REG, from: "  api.registerLightSources?.(LIGHT_SOURCES.map((l) => ({ ...l })), moduleId);\n", to: "" },
  { name: "Block 5's Uses are never registered", file: REG, from: "  for (const [name, entry] of Object.entries(BLOCK5_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);\n", to: "" },
  { name: "FR-48 is never registered", file: REG, from: "  for (const [race, feats] of Object.entries(EXISTING_RACIAL_FEATS)) api.registerFeatAccess?.(\"race\", race, feats, moduleId);\n", to: "" },
  { name: "nothing follows a Strike for Block 5", file: SCRIPT, from: "Hooks.on(\"trgPrimeStrikeResolved\", (ctx) => { onStrikeResolvedB5(ctx)", to: "Hooks.on(\"trgPrimeStrikeRolledB5\", (ctx) => { onStrikeResolvedB5(ctx)" },
  { name: "the module accepts 3.668.2", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.674.2\";", to: "const REQUIRED_SYSTEM = \"3.668.2\";" },
  { name: "the manifest accepts 3.668.2", file: MANIFEST, from: "\"minimum\": \"3.674.2\"", to: "\"minimum\": \"3.668.2\"" },
  { name: "Bear's Endurance changes nothing", file: AUTO, from: "  return bearsEndurance ? 2 : 1;", to: "  return 1;" },
  { name: "Predator's Momentum's answer never reaches the Strike", file: AUTO, from: "{ apPaid: true, extraModifiers: [], ...momentum }", to: "{ apPaid: true, extraModifiers: [] }" },
  { name: "Wing Burst ignores Wings Unfurled", file: AUTO, from: "note: owns(actor, \"Wings Unfurled\")", to: "note: false" },
  { name: "Living Lantern's light is a key nobody registered", file: AUTO, from: "export const LIVING_LANTERN_LIGHT = \"living-lantern\";", to: "export const LIVING_LANTERN_LIGHT = \"lantern\";" },
  // G — 0.6.2: Many-Faceted Vigilance and codex inheritance
  { name: "Compound Eyes is raised but still inherits the pack's +1 (0.6.1's defect)", file: A, from: "    if (setsCodex) update[`flags.${systemId}.codexInherit`] = false;\n", to: "" },
  { name: "the stash does not record the opt-out", file: A, from: "...((stash?.codex || setsCodex) ? { codex: true } : {})", to: "...({})" },
  { name: "removing the feat leaves the copy opted out", file: A, from: "    if (stash.codex) update[`flags.${systemId}.codexInherit`] = deletion();\n", to: "" },
  { name: "the feat gone with no row leaves the stash and the opt-out", file: A, from: "    if (held || !stash) return null;\n    return {", to: "    return null;\n    return {" },
  { name: "the stash is deleted the way Foundry 14 warns about", file: A, from: "    update[`flags.${moduleId}.${stashKey}`] = deletion();", to: "    update[`flags.${moduleId}.-=${stashKey}`] = null;" },
  { name: "a refreshed item is not raised again", file: SCRIPT, from: "Hooks.on(\"updateItem\", (item, changes, options, userId) => { onItemUpdatedB5(item, changes, options, userId)", to: "Hooks.on(\"updateItemB5\", (item, changes, options, userId) => { onItemUpdatedB5(item, changes, options, userId)" },
  { name: "every item update re-raises", file: A, from: "  if (!changes?.flags) return;\n  if (Object.values(RAISED_TICKS)", to: "  if (Object.values(RAISED_TICKS)" },
  { name: "removing the feat takes away someone else's opt-out", file: A, from: "    if (stash.codex) update[", to: "    if (stash) update[" },
  { name: "a heritage is opted out too", file: A, from: "const setsCodex = Boolean(isAbility) && codexInherit !== false;", to: "const setsCodex = codexInherit !== false;" },
  { name: "the raise reads the prepared flags", file: A, from: "const own = target._source?.flags?.[SYSTEM_ID] ?? target.flags?.[SYSTEM_ID] ?? {};", to: "const own = target.flags?.[SYSTEM_ID] ?? {};" },
  { name: "a 0.6.1 stash is never marked", file: A, from: "if (!stash || Boolean(stash.codex) !== Boolean(want.codex)) update[", to: "if (!stash) update[" },
  { name: "the row is rewritten on every pass", file: A, from: "    if (row.value !== spec.value) update[", to: "    update[" },
  // G — 0.6.2: a reaction asked only when it could be spent
  { name: "reactionOpen asks without the feat's traits", file: AUTO, from: "return !(await h.reactionRefusal(actor, String(feat?.system?.traits ?? \"\")));", to: "return !(await h.reactionRefusal(actor, \"\"));" },
  { name: "reactionOpen's fallback ignores the pool", file: AUTO, from: "  return Number(actor?.system?.resources?.reactions?.value ?? 0) > 0;\n}", to: "  return true;\n}" },
  { name: "Waiting Blade is asked whatever the reaction", file: A, from: "hasUse(wb) && await reactionOpen(target, \"Waiting Blade\")", to: "hasUse(wb)" },
  { name: "Form Reversal is asked whatever the reaction", file: B4, from: "activeForm(target) && await reactionOpen(target, \"Form Reversal\")", to: "activeForm(target)" },
  { name: "Shadow Counter is asked whatever the reaction", file: B4, from: "ownedNamed(target, \"Shadow Counter\") && await reactionOpen(target, \"Shadow Counter\")", to: "ownedNamed(target, \"Shadow Counter\")" },
  { name: "Vanishing Retreat is asked whatever the reaction", file: B4, from: "  if (!(await reactionOpen(actor, \"Vanishing Retreat\"))) return;\n", to: "" },
  { name: "Disciplined Flurry is asked whatever the reaction", file: B3, from: "(!inCombat || await reactionOpen(actor, \"Disciplined Flurry\"))", to: "true" },
  { name: "Resist Dying is pressed whatever the reaction", file: SA, from: "if (inCombat && !(await reactionOpen(actor, \"Resist Dying\"))) {", to: "if (false) {" },
  { name: "Resist Dying writes the pool itself again", file: SA, from: "  if (inCombat) await spendReaction(actor, \"Resist Dying\");", to: "  if (inCombat) await actor.update({ \"system.resources.reactions.value\": 0 });" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block5.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block5: verify-block5 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block5: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block5: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
