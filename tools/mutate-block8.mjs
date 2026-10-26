#!/usr/bin/env node
/**
 * mutate-block8 — the mutation half of verify-block8. Each mutation breaks
 * one printed rule, one ruling, one row the system reads or one wire of
 * Block 8; verify-block8 must fail on every one. Files are restored after
 * each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block8.mjs
 *
 * The printed text is read from the book extract, never typed, so the
 * mutations go at what is authored: the fields, the rows, the decisions and
 * the wiring. The core's Block 8 seams have their own pair in the system
 * (verify/mutate-block8-core).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block8.mjs"), A = f("module", "block8-automations.mjs");
const C3 = f("tools", "content", "block3.mjs"), C4 = f("tools", "content", "block4.mjs"), C5 = f("tools", "content", "block5.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json"), STATUS = f("tools", "inventory", "status.json");

const MUTATIONS = [
  // A — the book
  { name: "the category word is kept as a trait", file: C, from: "  const traits = words.filter((w) => w !== category)", to: "  const traits = words" },
  { name: "\"all\" is written as the word", file: C, from: "  const tradition = s.fields.Tradition === \"all\" ? ALL_TRADITIONS : s.fields.Tradition;", to: "  const tradition = s.fields.Tradition;" },
  { name: "a paragraph is dropped from the description", file: C, from: "...s.lines.map((l) => md(l))].join(\"\\n\");", to: "...s.lines.slice(1).map((l) => md(l))].join(\"\\n\");" },
  { name: "the labelled lines are not printed", file: C, from: "...(fields ? [md(fields)] : [])", to: "" },
  { name: "Disrupt Soul's Fortitude is Will", file: C, from: "targets: \"1 living creature\", defence: \"Fortitude\", duration: \"Sustained (1 minute)\"", to: "targets: \"1 living creature\", defence: \"Will\", duration: \"Sustained (1 minute)\"" },
  // B — the rows
  { name: "B8-1 BROKEN: a Partial is unaffected", file: C, from: "onSave: [\"success\", \"partial\"], duration: \"until the end of its next turn\"", to: "onSave: [\"success\"], duration: \"until the end of its next turn\"" },
  { name: "a Fumble lasts a minute", file: C, from: "onSave: [\"fumble\", \"blunder\"], duration: \"1 hour\"", to: "onSave: [\"fumble\", \"blunder\"], duration: \"1 minute\"" },
  { name: "a Failure lasts an hour", file: C, from: "onSave: [\"failure\"], duration: \"1 minute\"", to: "onSave: [\"failure\"], duration: \"1 hour\"" },
  { name: "B8-2 BROKEN: only unarmed hits make the save", file: C, from: "conditionValue: 1, conditionRounds: 0, scope: \"melee\"", to: "conditionValue: 1, conditionRounds: 0, scope: \"unarmed\"" },
  { name: "a Fumble is Sickened 1", file: C, from: "ladder: { failure: 1, fumble: 2, blunder: 2 }", to: "ladder: { failure: 1, fumble: 1, blunder: 2 }" },
  { name: "the acid is once only", file: C, from: "damageType: \"acid\", scope: \"unarmed\", once: false", to: "damageType: \"acid\", scope: \"unarmed\"" },
  { name: "the acid is on every melee Strike", file: C, from: "damageType: \"acid\", scope: \"unarmed\", once: false", to: "damageType: \"acid\", scope: \"melee\", once: false" },
  { name: "Disrupt Soul's save is rolled on casting", file: C, from: "key: \"disruptSoul\", label: \"Disrupt Soul\", saveAtCast: false }", to: "key: \"disruptSoul\", label: \"Disrupt Soul\" }" },
  { name: "Spiritual Distraction's mark is under the wrong key", file: C, from: "key: \"spiritualDistraction\", label: \"Spiritual Distraction\"", to: "key: \"spiritual\", label: \"Spiritual Distraction\"" },
  { name: "Boundless Vision gives no flank immunity", file: C, from: "flags: { creatureAbility: { derives: { cannotBeFlanked: true } } },", to: "flags: { fateDeclare: { label: \"x\" } }," },
  { name: "Flowing Step's terrain is not declared", file: C, from: "        ignoresDifficultTerrain: true,\n", to: "" },
  { name: "Flowing Step's advantage is on every save", file: C, from: "when: { checkTypes: [\"save\"], subjects: [\"reflex\"] }", to: "when: { checkTypes: [\"save\"] }" },
  { name: "Foretell Failure foretells nothing", file: C, from: "flags: { foretell: true },", to: "flags: { fumbleNoReactions: true }," },
  { name: "Tranquil Mastery gives no second ability", file: C, from: "flags: { refocusExtra: true },", to: "flags: { fumbleNoReactions: true }," },
  { name: "Root's Trip is not raised", file: C, from: "label: \"Root\", scope: \"move or trip it\", actions: [\"shoveAttack\", \"tripAttack\", \"reposition\"]", to: "label: \"Root\", scope: \"move or trip it\", actions: [\"shoveAttack\", \"reposition\"]" },
  { name: "LIVE TEST BROKEN AGAIN: Root's Acrobatics row comes back, and a Trip is raised twice", file: C,
    from: "actions: [\"shoveAttack\", \"tripAttack\", \"reposition\"] },\n",
    to: "actions: [\"shoveAttack\", \"tripAttack\", \"reposition\"] },\n      { kind: \"defenceDC\", target: \"targets\", dc: \"skillDC:acrobatics\", value: 2, bonusType: \"circumstance\", label: \"Root\", scope: \"move or trip it\", actions: [\"tripAttack\"] },\n" },
  { name: "Root's scope does not finish the sentence", file: C, from: "label: \"Root\", scope: \"move or trip it\"", to: "label: \"Root\", scope: \"resisting being moved or tripped\"" },
  { name: "LIVE TEST BROKEN AGAIN: Arrows Flight has no row, and the card prints its HTML", file: C, from: "    effects: [{ kind: \"note\", text: \"Choose the projectiles next:", to: "    xeffects: [{ kind: \"note\", text: \"Choose the projectiles next:" },
  { name: "Root's warp has no cap", file: C, from: "mods: { bonusValue: 1, bonusMax: 4 }", to: "mods: { bonusValue: 1 }" },
  { name: "Root's balance tick is offered on every skill (review)", file: C, from: "when: { checkTypes: [\"skill\"], subjects: [\"acrobatics\"] } }] },", to: "when: { checkTypes: [\"skill\"] } }] }," },
  { name: "Root's balance tick does not grow", file: C, from: "type: \"circumstance\", warpBonus: true, label: \"Root\"", to: "type: \"circumstance\", label: \"Root\"" },
  { name: "Arrows Flight asks for creature targets", file: C, from: "    castAP: 2, range: \"touch\", duration: \"10 minutes\",", to: "    castAP: 2, range: \"touch\", targets: \"up to 30 projectiles\", duration: \"10 minutes\"," },
  { name: "the large warp unlocks nothing", file: C, from: "mods: { unlocks: [\"itLargeProjectiles\"] }", to: "mods: {}" },
  { name: "a month is unreadable", file: C, from: "mods: { durationText: \"1 month (30 days)\" }", to: "mods: { durationText: \"1 month\" }" },
  { name: "Water Bolt pushes on any critical", file: C5, from: "onAttack: [\"critical\"], minCriticalSeverity: \"serious\" }", to: "onAttack: [\"critical\"] }" },
  { name: "Burst of Speed's +20 lasts both rounds", file: C3, from: "value: 20, note: \"(first round)\", duration: \"1 round\" }", to: "value: 20, note: \"(first round)\" }" },
  { name: "Timeless Motion's move provokes", file: C3, from: "flags: { firstMoveNoReactions: true },\n        text: \"the first move of each of your turns provokes no reactions\" },", to: "flags: { fumbleNoReactions: true },\n        text: \"the first move of each of your turns provokes no reactions\" }," },
  // C — the decisions
  { name: "a Critical does not end Spiritual Distraction", file: A, from: "    case \"heroic\": case \"critical\": return { ends: true, penalty: 0 };", to: "    case \"heroic\": case \"critical\": return { ends: false, penalty: 0 };" },
  { name: "a Partial is −4", file: A, from: "    case \"partial\": return { ends: false, penalty: -2 };", to: "    case \"partial\": return { ends: false, penalty: -4 };" },
  { name: "a Blunder escapes Spiritual Distraction", file: A, from: "    case \"fumble\": case \"blunder\": return { ends: false, penalty: -10 };", to: "    case \"fumble\": return { ends: false, penalty: -10 };" },
  { name: "B8-5 BROKEN: no PP is counted", file: A, from: ": Math.max(0, int(ppSpent));", to: ": 0;" },
  { name: "no minimum 1d8 for a low level", file: A, from: "const extra = noPP ? Math.max(1, Math.floor(Math.max(0, int(level)) / 4))", to: "const extra = noPP ? Math.floor(Math.max(0, int(level)) / 4)" },
  { name: "a Fumble deals no critical", file: A, from: "if (key === \"fumble\" || key === \"blunder\") return { ends: false, dice: 2 + extra, critical: true };", to: "if (key === \"fumble\" || key === \"blunder\") return { ends: false, dice: 2 + extra, critical: false };" },
  { name: "an innate spell pays per PP", file: A, from: "    noPP: !(Number(ctx.ppSpent) > 0),", to: "    noPP: false," },
  { name: "a cantrip or an item's spell is answered as a paid one (review)", file: A, from: "    noPP: !(Number(ctx.ppSpent) > 0),", to: "    noPP: Boolean(ctx.innate) && !ctx.itemCast," },
  { name: "a refunded cast is answered (review)", file: A, from: "  if (!actor || ctx.refunded) return;", to: "  if (!actor) return;" },
  { name: "a spell's own item counts as a magical Focus use", file: A, from: "  if (!item || item.type === \"spell\") return false;", to: "  if (!item) return false;" },
  { name: "every Focus ability is magical", file: A, from: "  return item.flags?.[SYSTEM_ID]?.itMagical === true || MAGICAL_FOCUS_NAMES.includes(String(item.name ?? \"\").trim());", to: "  return true;" },
  { name: "another client's spent use answers too", file: A, from: "  if (userId !== game.user?.id || !isMagicalFocus(item)) return;", to: "  if (!isMagicalFocus(item)) return;" },
  { name: "B8-3 BROKEN: any projectile without the warp", file: A, from: "    return large || SMALL_PROJECTILE.test(String(item.name ?? \"\"));", to: "    return true;" },
  { name: "a marked stack is offered again", file: A, from: "    if (multiplierActive(item.flags?.[SYSTEM_ID]?.rangeIncrementMultiplier, worldTime)) return false;\n", to: "" },
  { name: "an expired mark blocks the stack for good (review)", file: A, from: "  return !(Number.isFinite(ends) && ends > 0 && Number(worldTime) >= ends);", to: "  return true;" },
  { name: "another creature's arrows are split on a client that cannot (review)", file: A, from: "  else game.socket?.emit(SOCKET, { b8own: \"arrowsFlight\", actorUuid: target.uuid, payload });", to: "  else await enchantProjectiles(target, payload);" },
  { name: "the split leaves the whole stack", file: A, from: "  await stack.update({ \"system.quantity\": have - n });", to: "" },
  { name: "more than 30 split off", file: A, from: "  return Math.max(0, Math.min(30, have, want));", to: "  return Math.max(0, Math.min(have, want));" },
  { name: "Burst's −10 follows an early ending", file: A, from: "  return Number.isFinite(ends) && ends > 0 && Number(round) >= ends;", to: "  return Number.isFinite(ends) && ends > 0;" },
  { name: "the −10 is put on by every client", file: A, from: "  if (game.user !== game.users?.activeGM) return;\n  const actor = effect?.parent;", to: "  const actor = effect?.parent;" },
  { name: "a disabled mark still answers", file: A, from: "    if (!effect || effect.disabled) continue;\n    const record = effect.flags?.[MODULE_ID]?.[key];", to: "    if (!effect) continue;\n    const record = effect.flags?.[MODULE_ID]?.[key];" },
  { name: "the gate never ends the caster's spell", file: A, from: "      lines.push(`<strong>Spiritual Distraction</strong>: ${esc(actor.name)} is unaffected (${esc(label)}), and the spell ends.`);\n      await endMark(effect, record);", to: "      lines.push(`<strong>Spiritual Distraction</strong>: ${esc(actor.name)} is unaffected (${esc(label)}), and the spell ends.`);" },
  { name: "the save is against no DC", file: A, from: "      actor, type: \"save\", save: \"will\", subject: \"will\", dc,", to: "      actor, type: \"save\", save: \"will\", subject: \"will\"," },
  { name: "the critical is not rolled", file: A, from: "          await h().rollCriticalInjury(actor, { targetActor: actor, damageType: \"essence\", severity, attackBonus: dc });\n", to: "" },
  { name: "the caster rolls the critical, from a client that may not own it (review)", file: A, from: "          await h().rollCriticalInjury(actor, { targetActor: actor, damageType: \"essence\", severity, attackBonus: dc });", to: "          await h().rollCriticalInjury({ uuid: record.casterUuid }, { targetActor: actor, damageType: \"essence\", severity, attackBonus: dc });" },
  { name: "a magical item is unmarked", file: C4, from: "Magical (your Ghostwalker tradition).\"), { itMagical: true }),", to: "Magical (your Ghostwalker tradition).\")),"},
  { name: "Inner Blast is not marked magical", file: C3, from: "flags: { itAutomation: \"innerBlast\", itMagical: true }", to: "flags: { itAutomation: \"innerBlast\" }" },
  // D, E — registration and wiring
  { name: "the gate is not registered", file: REG, from: "  api.registerSpellCheckGate?.(\"spiritualDistraction\", spiritualDistractionGate, moduleId);\n", to: "" },
  { name: "Disrupt Soul hears no casting", file: SCRIPT, from: "Hooks.on(\"trgPrimeSpellSettled\", (ctx) => { onSpellSettledB8(ctx)", to: "Hooks.on(\"trgPrimeSpellCast\", (ctx) => { onSpellSettledB8(ctx)" },
  { name: "the use before is never read", file: SCRIPT, from: "Hooks.on(\"preUpdateItem\", (item, changes, options) => { try { onPreUpdateItemB8(item, changes, options);", to: "Hooks.on(\"preUpdateItem\", (item, changes, options) => { try { void 0;" },
  { name: "the module takes TRG Prime 3.671.1", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.672.0\";", to: "const REQUIRED_SYSTEM = \"3.671.1\";" },
  { name: "the manifest accepts 3.671.1", file: MANIFEST, from: "\"minimum\": \"3.672.0\"", to: "\"minimum\": \"3.671.1\"" },
  { name: "the download names the last release", file: MANIFEST, from: "releases/download/v0.9.1/", to: "releases/download/v0.9.0/" },
  { name: "Water Bolt's status line is missing", file: STATUS, from: "  \"SP-25\": {", to: "  \"SP-25x\": {" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block8.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block8: verify-block8 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block8: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block8: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
