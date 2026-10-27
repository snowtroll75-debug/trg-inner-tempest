#!/usr/bin/env node
/**
 * mutate-block9 — the mutation half of verify-block9. Each mutation breaks
 * one printed rule, one ruling, one row the system reads or one wire of
 * Block 9; verify-block9 must fail on every one. Files are restored after
 * each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-block9.mjs
 *
 * The printed text and numbers are read from the book extract, never typed,
 * so the mutations go at what is authored: the readings, the rows, the
 * decisions and the wiring. The core's Block 9 seams have their own pair in
 * the system (verify/mutate-block9-core).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const C = f("tools", "content", "block9.mjs"), A = f("module", "block9-automations.mjs"), AG = f("module", "aging.mjs"), AW = f("module", "aging-workflow.mjs");
const REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs"), MANIFEST = f("module.json"), STATUS = f("tools", "inventory", "status.json"),
  FOUND = f("tools", "content", "foundation.mjs"), INV = f("tools", "inventory", "inventory.txt");

const MUTATIONS = [
  // A — the book, as read
  { name: "the armour's Max Dex dash is a cap of 0", file: C, from: "    maxDexBonus: number(row.maxDex) ?? -1,", to: "    maxDexBonus: number(row.maxDex) ?? 0," },
  { name: "the ACP is not read", file: C, from: "    penalty: number(row.acp) ?? 0,", to: "    penalty: 0," },
  { name: "the Speed is not read", file: C, from: "    speedPenalty: number(row.speed) ?? 0,", to: "    speedPenalty: 0," },
  { name: "an armour paragraph is dropped", file: C, from: "...paragraphs.map((p) => md(p))", to: "...paragraphs.slice(1).map((p) => md(p))" },
  { name: "a rune's tier lines are dropped", file: C, from: "md(fieldsLine(tier.fields, [\"Level\", \"Price\"])), ...tier.lines.map((l) => md(l))", to: "md(fieldsLine(tier.fields, [\"Level\", \"Price\"]))" },
  { name: "Centred armour's II costs the weapon's", file: A, from: "{ tier: \"II\", level: 8, price: 4200 }", to: "{ tier: \"II\", level: 8, price: 1400 }" },
  { name: "Harmony's shield price is its armour price", file: A, from: "armourPrice: 11000, shieldPrice: 7700,", to: "armourPrice: 11000, shieldPrice: 11000," },
  { name: "Guarded is level 8", file: A, from: "on: [\"armour\"], level: 7, price: 3000,", to: "on: [\"armour\"], level: 8, price: 3000," },
  { name: "Staunching III is 18,000 gp", file: A, from: "{ tier: \"III\", level: 18, price: 180000 }", to: "{ tier: \"III\", level: 18, price: 18000 }" },
  { name: "Mindful's activation is a Command", file: A, from: "key: \"mindful\", name: \"Mindful\", traits: \"Focus, Invested, Invocation\", on: [\"weapon\"], level: 10, price: 6000,\n    activate: \"Engage (1 AP)\"", to: "key: \"mindful\", name: \"Mindful\", traits: \"Focus, Invested, Invocation\", on: [\"weapon\"], level: 10, price: 6000,\n    activate: \"Command (1 AP)\"" },
  { name: "Centred's items share a name", file: C, from: "${both ? ` (${kindWord})` : \"\"}", to: "" },
  { name: "the Do-maru's printed figures are the base's", file: C, from: "    penalty: number(e.fields.ACP), maxDexBonus: number(e.fields[\"MAX DEX\"]), dr: number(e.fields.DR),", to: "" },
  { name: "the Spiritblade's +2 is kept on the die", file: C, from: "    damage: \"1d10\", quality: \"master\"", to: "    damage: \"1d10+2\", quality: \"master\"" },
  { name: "the Spiritblade's Fear is dropped", file: C, from: ",\n      onCritical: { spell: \"Fear\", dc: 20, ap: 1 } }", to: " }" },
  { name: "a wondrous paragraph is dropped", file: C, from: "    ...e.lines.map((l) => md(l)),\n    how(sheet[0], sheet[1])", to: "    ...e.lines.slice(1).map((l) => md(l)),\n    how(sheet[0], sheet[1])" },
  { name: "Incense costs nothing", file: C, from: "price: number(/(\\d+) gp/.exec(incenseLine)[1])", to: "price: 0" },
  { name: "the Old row is −1", file: AG, from: "  old: Object.freeze({ strength: -2, dexterity: -2, constitution: -2, intelligence: 2, wisdom: 2, charisma: 2 }),", to: "  old: Object.freeze({ strength: -1, dexterity: -2, constitution: -2, intelligence: 2, wisdom: 2, charisma: 2 })," },
  { name: "a Juvenile's Dexterity is a penalty", file: AG, from: "juvenile: Object.freeze({ strength: -1, dexterity: 1,", to: "juvenile: Object.freeze({ strength: -1, dexterity: -1," },
  { name: "Venerable begins at 80%", file: AG, from: "venerable: 0.85 }", to: "venerable: 0.8 }" },
  { name: "the Dwarf's Old threshold is moved", file: AG, from: "middleAged: 175, old: 245, venerable: 298", to: "middleAged: 175, old: 250, venerable: 298" },
  { name: "Elves are mortal", file: AG, from: "  Elf: Object.freeze({ adult: 20, immortal: true, lifespan: null }),", to: "  Elf: Object.freeze({ adult: 20, lifespan: 750 })," },
  { name: "Humans are adult at 16", file: AG, from: "  Human: Object.freeze({ adult: 15,", to: "  Human: Object.freeze({ adult: 16," },
  // B — what the system reads
  { name: "Centred is a flat +1", file: A, from: "kind: \"modifier\", value: [1, 2, 3], type: \"item\", label: \"Centred\"", to: "kind: \"modifier\", value: 1, type: \"item\", label: \"Centred\"" },
  { name: "Centred is only offered", file: A, from: "  auto: true, when: { actions: [\"refocus\"] }", to: "  auto: false, when: { actions: [\"refocus\"] }" },
  { name: "C3 BROKEN: Harmony's +3 is lost", file: A, from: "{ key: \"system.combat.defence.dodge\", type: \"custom\", value: \"2\", classValue: DISCIPLE_OR_MYSTIC(3) },", to: "{ key: \"system.combat.defence.dodge\", type: \"custom\", value: \"2\" }," },
  { name: "Harmony is once a day, not Focus", file: A, from: "        verb: \"Engage\", apCost: 1, frequency: \"focus\", durationSeconds: 60,", to: "        verb: \"Engage\", apCost: 1, frequency: \"daily\", durationSeconds: 60," },
  { name: "Graceful Wind's speed is untyped", file: A, from: "{ key: \"system.combat.movement.land.status\", type: \"custom\", value: \"30\" },", to: "{ key: \"system.combat.movement.land.untyped\", type: \"custom\", value: \"30\" }," },
  { name: "Karmic Resilience is not asked of its own player", file: A, from: "label: \"Karmic Resilience\", offer: true, reaction: true, askOwner: true,", to: "label: \"Karmic Resilience\", offer: true, reaction: true," },
  { name: "Karmic Resilience answers massive damage", file: A, from: "frequency: \"daily\", notOutright: true,", to: "frequency: \"daily\"," },
  { name: "the dying-check bonus is +4 for everyone", file: A, from: "conditionals: [{ kind: \"modifier\", value: 2, type: \"circumstance\", label: \"Karmic Resilience\"", to: "conditionals: [{ kind: \"modifier\", value: 4, type: \"circumstance\", label: \"Karmic Resilience\"" },
  { name: "Staunching II reaches any band", file: A, from: "bleedReduceCheck: [null, { dc: 16, bands: \"moderate\" }, { dc: 16, bands: \"any\" }]", to: "bleedReduceCheck: [null, { dc: 16, bands: \"any\" }, { dc: 16, bands: \"any\" }]" },
  { name: "Staunching eases by 1, 2, 3", file: A, from: "bleedFlatCheckReduction: [2, 3, 4],", to: "bleedFlatCheckReduction: [1, 2, 3]," },
  { name: "Guarded is not declared", file: A, from: "    declares: { criticalGuard: { frequency: \"daily\" } }", to: "    declares: {}" },
  { name: "Harmony Edge is at will", file: A, from: "    declares: { criticalAdvantage: { frequency: \"daily\" } }", to: "    declares: { criticalAdvantage: { frequency: \"atWill\" } }" },
  { name: "B9-2 BROKEN: Soulful II's critical is −3 on the d100", file: A, from: "{ dice: \"2d6\", secondaryCritical: -40 }", to: "{ dice: \"2d6\", secondaryCritical: -3 }" },
  { name: "Mindful waits past the next turn", file: A, from: "          untilTurnStart: true,\n", to: "" },
  { name: "Mindful is pre-ticked on any attack", file: A, from: "            auto: false, oneShot: true, when: { checkTypes: [\"attack\"] } }]", to: "            auto: true, oneShot: true, when: { checkTypes: [\"attack\"] } }]" },
  { name: "Mindful adds Strength", file: A, from: "valueFrom: \"wisdom\", type: \"untyped\", label: \"Mindful\"", to: "valueFrom: \"strength\", type: \"untyped\", label: \"Mindful\"" },
  { name: "Tranquil Quiver reaches melee", file: A, from: "when: { checkTypes: [\"attack\"], attackModes: [\"ranged\"] } }],", to: "when: { checkTypes: [\"attack\"] } }]," },
  { name: "Tranquil Quiver's rider is at any distance", file: A, from: "precision: true, beyondFeet: 30, label: \"Tranquil Quiver\"", to: "precision: true, label: \"Tranquil Quiver\"" },
  { name: "B9-1 BROKEN: the Do-maru covers the arms", file: C, from: "    coversArms: body && full && row.name !== \"Do-maru\",", to: "    coversArms: body && full," },
  { name: "the Jingasa is no helmet", file: C, from: "const HELMETS = new Set([\"Oni-Mask\", \"Jingasa\"]);", to: "const HELMETS = new Set([\"Oni-Mask\"]);" },
  { name: "Shozoku's bonus is lost", file: C, from: "  Shozoku: [{ kind: \"modifier\", value: 2, type: \"circumstance\", label: \"Shozoku\"", to: "  Shozo: [{ kind: \"modifier\", value: 2, type: \"circumstance\", label: \"Shozoku\"" },
  { name: "the Oni-Mask's bonus is pre-ticked on every Intimidate", file: C, from: "label: \"Oni-Mask\", scope: \"Visual based Intimidate checks\", auto: false,", to: "label: \"Oni-Mask\", scope: \"Visual based Intimidate checks\", auto: true," },
  { name: "the Beads' Wisdom is an item bonus", file: C, from: "{ kind: \"stat\", value: 1, bonusType: \"status\", stat: \"wisdom\"", to: "{ kind: \"stat\", value: 1, bonusType: \"item\", stat: \"wisdom\"" },
  { name: "the Sash's DB is a status bonus", file: C, from: "{ kind: \"dbBonus\", value: 1, bonusType: \"dodge\"", to: "{ kind: \"dbBonus\", value: 1, bonusType: \"status\"" },
  { name: "the Robe takes no runes", file: C, from: "    extraFlags: { runeBearing: \"armour\" },\n", to: "" },
  { name: "the Robe gives no DR", file: C, from: "    abilities: [{ kind: \"baseDR\", value: 1, label: \"Monastic Robe of Resilience\" }],", to: "    abilities: [{ kind: \"note\", value: 0, reported: true, label: \"Monastic Robe of Resilience\", note: \"\" }]," },
  { name: "the Sash's fear bonus is taken on every save", file: C, from: "label: \"Sash of Serenity\", scope: \"Saving throws against fear effects\", auto: true, when: SAVE_VS([\"fear\"]) },", to: "label: \"Sash of Serenity\", scope: \"Saving throws against fear effects\", auto: true, when: { checkTypes: [\"save\"] } }," },
  { name: "C9 BROKEN: the burner's aura runs unlit", file: A, from: "outcomes: {}, immunitySeconds: 0, whileState: \"lit\", includeSelf: true,", to: "outcomes: {}, immunitySeconds: 0, includeSelf: true," },
  { name: "B9-7 BROKEN: the burner reaches only allies", file: A, from: "    allyEffect: grants, enemyEffect: grants\n", to: "    allyEffect: grants\n" },
  { name: "the burner's radius is 20 feet", file: A, from: "id: \"mystic-incense-burner\", name, kind: \"ally\", radius: 30,", to: "id: \"mystic-incense-burner\", name, kind: \"ally\", radius: 20," },
  { name: "B9-5 BROKEN: Monastic Items need no Inner Discipline", file: A, from: "  requires: [\"Inner Discipline\"],\n  dcStep: 2,", to: "  requires: [\"Flurry of Blows\"],\n  dcStep: 2," },
  { name: "Monastic Items are not Hard", file: A, from: "  requires: [\"Inner Discipline\"],\n  dcStep: 2,", to: "  requires: [\"Inner Discipline\"],\n  dcStep: 0," },
  { name: "Tranquil Quiver goes on any weapon", file: A, from: "    usage: { ranged: true, text: \"any ranged weapon\" },\n", to: "", breaks: "B" },
  // C — the decisions
  { name: "a fleeing from elsewhere is ended", file: A, from: "if (statuses.includes(\"frightened\") || traits.includes(\"fear\") || traits.includes(\"charm\")) out.push(String(row.id));", to: "if (statuses.includes(\"frightened\") || statuses.includes(\"fleeing\") || traits.includes(\"fear\") || traits.includes(\"charm\")) out.push(String(row.id));" },
  { name: "a charm is not ended", file: A, from: " || traits.includes(\"charm\")) out.push(String(row.id));", to: ") out.push(String(row.id));" },
  { name: "the Lotus's advantage is taken on every save", file: A, from: "{ kind: \"advantage\", label, scope: \"Saving throws against fear and charm effects\", auto: true, when: { checkTypes: [\"save\"], traits: [\"fear\", \"charm\"] } },", to: "{ kind: \"advantage\", label, scope: \"Saving throws against fear and charm effects\", auto: true, when: { checkTypes: [\"save\"] } }," },
  { name: "the Sash's choice is ignored", file: A, from: "    when: { checkTypes: [\"save\"], ...(any ? {} : { subjects: [which[0]] }) }", to: "    when: { checkTypes: [\"save\"] }" },
  { name: "the Sash's advantage is never spent", file: A, from: "    auto: !any, oneShot: true,", to: "    auto: !any," },
  { name: "an empty Incense still burns", file: A, from: "/^incense$/i.test(String(i?.name ?? \"\").trim()) && int(i?.system?.quantity) > 0", to: "/^incense$/i.test(String(i?.name ?? \"\").trim())" },
  { name: "a printed row never moves with the GM's lifespan", file: AG, from: "(row.lifespan === null || !gmSet || Number(chosen) === Number(row.lifespan))", to: "true" },
  { name: "a range's lifespan is its low end", file: AG, from: "  if (Array.isArray(row.lifespan)) return round((row.lifespan[0] + row.lifespan[1]) / 2);", to: "  if (Array.isArray(row.lifespan)) return row.lifespan[0];" },
  { name: "thresholds round down", file: AG, from: "const round = (n) => Math.floor(Number(n) + 0.5);", to: "const round = (n) => Math.floor(Number(n));" },
  { name: "the category boundary is inclusive the wrong way", file: AG, from: "  if (thresholds.middleAged === null || a < thresholds.middleAged) return \"adult\";", to: "  if (thresholds.middleAged === null || a <= thresholds.middleAged) return \"adult\";" },
  { name: "interpretation 8 BROKEN: Age Resistance lifts the bonuses too", file: AG, from: "    if (resisted && value < 0 && PHYSICAL.includes(ability)) continue;", to: "    if (resisted && PHYSICAL.includes(ability)) continue;" },
  // D — the Foundry half
  { name: "the second elixir has no price", file: A, from: "      if (actor.getFlag(MODULE_ID, LOTUS_FLAG)) {", to: "      if (false) {" },
  { name: "the temp HP is the level halved", file: A, from: "      const temp = await grantTempHP(actor, level);", to: "      const temp = await grantTempHP(actor, Math.floor(level / 2));" },
  { name: "the Lotus's hour is a minute", file: A, from: "      const timing = effectTiming(3600);", to: "      const timing = effectTiming(60);" },
  { name: "no Incense is burned", file: A, from: "      if (left > 0) await incense.update({ \"system.quantity\": left });\n      else await incense.delete();", to: "" },
  { name: "the burner may be lit twice", file: A, from: "      if (item.flags?.[SYSTEM_ID]?.runeState?.lit) {\n        const out", to: "      if (false) {\n        const out" },
  { name: "the lit burner's Use burns another Incense", file: A, from: "        if (out === \"out\") await game.trgPrime.modules.stopItemTimer(actor, item, \"incense\");\n        return false;", to: "        if (out === \"out\") await game.trgPrime.modules.stopItemTimer(actor, item, \"incense\");", breaks: "D" },
  { name: "the Mat costs the user PP", file: A, from: "{ name: pick, pp: MAT_PP }, { apPaid: true }", to: "{ name: pick, pp: 0 }, { apPaid: true }" },
  { name: "the day does not begin again", file: A, from: "  if (actor.getFlag?.(MODULE_ID, LOTUS_FLAG)) await actor.unsetFlag(MODULE_ID, LOTUS_FLAG);\n", to: "" },
  { name: "the Beads' advantage never lapses", file: A, from: "  if (kept.length !== pending.length) await actor.setFlag(SYSTEM_ID, \"pendingModifiers\", kept);", to: "" },
  { name: "the age effect is not marked as age (C10)", file: AW, from: "        [SYSTEM_ID]: { age: wanted.category },\n", to: "" },
  { name: "every client writes the age effect", file: AW, from: "  if (!actor || !actingGM()) return;", to: "  if (!actor) return;" },
  { name: "the setting is ignored", file: AW, from: "  const state = agingOn() ? agingFor({", to: "  const state = true ? agingFor({" },
  { name: "the GM is told every time", file: AW, from: "  if (Number(noticed) === Number(state.lifespan)) return;\n", to: "" },
  { name: "Age Resistance is never read", file: AW, from: "const resistedNow = (actor) => Array.from(actor?.effects ?? []).some((e) => !e.disabled && e.flags?.[MODULE_ID]?.ageResistance);", to: "const resistedNow = () => false;" },
  { name: "the effect is laid again every time", file: AW, from: "  const keep = existing.find(same) ?? null;", to: "  const keep = null;" },
  // E — wiring
  { name: "Block 9 is not registered", file: REG, from: "  registerBlock9(api, moduleId);\n", to: "" },
  { name: "the daily preparation is not heard", file: SCRIPT, from: "Hooks.on(\"trgPrimeDailyPreparation\", (ctx) => { onDailyPreparationB9(ctx)", to: "Hooks.on(\"trgPrimeDailyPreparationX\", (ctx) => { onDailyPreparationB9(ctx)" },
  { name: "the setting is never registered", file: SCRIPT, from: "Hooks.once(\"init\", () => registerAgingSetting());", to: "" },
  { name: "the sheet's age change is not heard", file: SCRIPT, from: "Hooks.on(\"updateActor\", (actor, changes) => { onActorUpdatedAging(actor, changes)", to: "Hooks.on(\"updateActorX\", (actor, changes) => { onActorUpdatedAging(actor, changes)" },
  { name: "the module accepts 3.672.1", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.673.0\";", to: "const REQUIRED_SYSTEM = \"3.672.1\";" },
  { name: "the manifest accepts 3.672.1", file: MANIFEST, from: "\"minimum\": \"3.673.0\"", to: "\"minimum\": \"3.672.1\"" },
  { name: "the manifest says 0.9.1", file: MANIFEST, from: "\"version\": \"0.10.2\"", to: "\"version\": \"0.9.1\"" },
  { name: "the wondrous pack extends the gear pack", file: FOUND, from: "extends: \"wondrous\", docs: BLOCK9_WONDROUS", to: "extends: \"gear\", docs: BLOCK9_WONDROUS" },
  { name: "Monastic Items' status line is missing", file: STATUS, from: "\"MI-20\": {", to: "\"MI-20X\": {" },
  { name: "Monastic Items' inventory line is missing", file: INV, from: "MI-20|Ch9 p79|Monastic Items (crafting)|", to: "MI-2O|Ch9 p79|Monastic Items (crafting)|" },
  // L2 — 0.10.2, Graham's answers
  { name: "the Do-maru's note still offers to remove Potency I", file: C, from: "Graham ruled on 27 October 2026 that the DB is +1: Potency I applies, as the sheet shows.", to: "The rune is applied as printed, so the sheet shows +1; the GM may remove Potency I to match the printed DB." },
  { name: "the Spiritblade's note leaves its fumble DC unsaid", file: C, from: " Graham ruled on 27 October 2026 that Balanced still takes 1 from it, so the fumble DC is 11.", to: "" },
  // L — 0.10.1, found live (F1)
  { name: "THE DEFECT: a chosen kind stays a tick-box, never asked on a forced save", file: A, from: "    auto: !any, oneShot: true,", to: "    auto: false, oneShot: true," },
  { name: "\"any\" is taken on the first save, unasked", file: A, from: "    auto: !any, oneShot: true,", to: "    auto: true, oneShot: true," },
  { name: "the card still says to tick it", file: A, from: "          : \"<em>Taken on that save, forced or rolled from the sheet, and then spent.</em>\")", to: "          : \"<em>Offered on each save in the minute; tick it on the one you choose, and it is spent.</em>\")" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block9.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block9: verify-block9 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block9: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block9: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
