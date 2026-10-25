#!/usr/bin/env node
/**
 * mutate-weapons — the mutation half of verify-weapons. Each mutation breaks
 * one reading of Chapter 6's table, one printed paragraph, one wire, or one
 * of the 0.5.1 fixes; verify-weapons must fail on every one. Files are
 * restored after each run, and on any exit.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/mutate-weapons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const WP = f("tools", "content", "weapons.mjs"), BLD = f("tools", "content", "builders.mjs"), FND = f("tools", "content", "foundation.mjs");
const BOOK = f("tools", "content", "book-text-weapons.json");
const B4C = f("tools", "content", "block4.mjs"), A = f("module", "block4-automations.mjs"), REG = f("module", "registration.mjs");
const MANIFEST = f("module.json"), SCRIPT = f("scripts", "inner-tempest.mjs");

const MUTATIONS = [
  // A — reading the table
  { name: "B is read as piercing", file: WP, from: "const DAMAGE_TYPE = { B: \"bludgeoning\", P: \"piercing\", S: \"slashing\" };", to: "const DAMAGE_TYPE = { B: \"piercing\", P: \"piercing\", S: \"slashing\" };" },
  { name: "S is medium", file: WP, from: "const SIZE = { T: \"tiny\", S: \"small\", M: \"medium\", L: \"large\" };", to: "const SIZE = { T: \"tiny\", S: \"medium\", M: \"medium\", L: \"large\" };" },
  { name: "the martial table is simple", file: WP, from: "\"MELEE MARTIAL WEAPONS\": \"Martial\"", to: "\"MELEE MARTIAL WEAPONS\": \"Simple\"" },
  { name: "the level is not read", file: WP, from: "    itemLevel: Number(row.level),", to: "    itemLevel: 0," },
  { name: "the fumble DC is not read", file: WP, from: "    fumbleDC: Number(row.fdc),", to: "    fumbleDC: 10," },
  { name: "the group is not read", file: WP, from: "    group: row.group,", to: "    group: \"Club\"," },
  { name: "a weightless weapon weighs 1", file: WP, from: "  if (t === \"-\") return 0;", to: "  if (t === \"-\") return 1;" },
  { name: "the price is in silver", file: WP, from: "    price: number(row.price, \"gp\"),", to: "    price: number(row.price, \"gp\") / 10," },
  { name: "Versatile keeps its dash", file: WP, from: ".replace(/^Versatile\\s*-?\\s*([BPS])$/, \"Versatile $1\")", to: "" },
  { name: "Reach keeps its brackets", file: WP, from: ".replace(/^Reach \\((\\d+) ft\\.\\)$/, \"Reach\")", to: "" },
  { name: "the printed reach is lost", file: WP, from: "    reachFeet: reach ? Number(reach[1]) : null,", to: "    reachFeet: null," },
  { name: "AR is not the weapon's armour rending", file: WP, from: "    armourRending: ar ? Number(ar[1]) : 0,", to: "    armourRending: 0," },
  { name: "an exotic weapon is not marked Exotic", file: WP, from: "  if (category === \"Exotic\" && !traits.includes(\"Exotic\")) traits = [...traits, \"Exotic\"].sort((a, b) => a.localeCompare(b));", to: "" },
  { name: "the Kusarigama's description is not found", file: WP, from: "const HEADING = { Kusarigama: \"KUSIRIGAMA\" };", to: "const HEADING = {};" },
  { name: "a description loses its last paragraph", file: WP, from: "    ...paragraphs.map((p) => md(p)),", to: "    ...paragraphs.slice(0, -1).map((p) => md(p))," },
  { name: "the trait text is dropped", file: WP, from: "    ...own.flatMap((t) => [md(`**${t}:** ${BOOK.traits[t]}`), md(TRAIT_AUTOMATION[t])]),", to: "    ...own.flatMap((t) => [md(TRAIT_AUTOMATION[t])])," },
  { name: "a note claims to be printed", file: WP, from: "  if (row.name === \"Wakizashi\") notes.push(\"*Proficiency:*", to: "  if (row.name === \"Wakizashi\") notes.push(\"Proficiency:" },
  { name: "the Butterfly Sword does not say it is one sword", file: WP, from: " The pack item is one sword: Double Slice and Twin need two on the character.", to: "" },
  { name: "the extract loses a row", file: BOOK, from: "    {\n      \"table\": \"MELEE MARTIAL WEAPONS\",\n      \"name\": \"Sai\",", to: "    {\n      \"table\": \"MELEE MARTIAL WEAPONS\",\n      \"name\": \"Sai \"," },
  { name: "a weapon holds two hands", file: BLD, from: "      attackBonus: 0, damage, damageType, baseDamage: 0, hands: 1, range: \"\", armourRending, proficiency: \"\",\n      fumbleDC, attackMode: \"melee\", rangeIncrement: 0, group, category, size, itemLevel,", to: "      attackBonus: 0, damage, damageType, baseDamage: 0, hands: 2, range: \"\", armourRending, proficiency: \"\",\n      fumbleDC, attackMode: \"melee\", rangeIncrement: 0, group, category, size, itemLevel," },
  { name: "an icon that does not exist", file: WP, from: "Tetsubo: \"greatclub\"", to: "Tetsubo: \"tetsubo\"" },
  // D — the pack and the registration
  { name: "the pack is left out of the build", file: FND, from: ",\n  // 0.5.1: Chapter 6's sixteen weapons (Graham, 23 October 2026).\n  { name: \"it-weapons\", label: \"Inner Tempest: Weapons\", extends: \"weapons\", docs: CHAPTER6_WEAPONS }", to: "" },
  { name: "the pack extends gear", file: MANIFEST, from: "\"extends\": \"weapons\"", to: "\"extends\": \"gear\"" },
  { name: "the new traits are not registered", file: REG, from: "export const TRAITS = [\"Technique\", \"Monastic\", \"Backswing\", \"Brace\", \"Twin\"];", to: "export const TRAITS = [\"Technique\", \"Monastic\"];" },
  { name: "the manifest accepts 3.668.0", file: MANIFEST, from: "\"minimum\": \"3.670.1\"", to: "\"minimum\": \"3.668.0\"" },
  { name: "the script accepts 3.668.0", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.670.1\";", to: "const REQUIRED_SYSTEM = \"3.668.0\";" },
  // C — the fixes
  { name: "THE DEFECT: Combat Form lets the system spend its use", file: A, from: "  ownsFocusUse: true,\n  async use(actor, item) {\n    const owed = combatFormsOwed(", to: "  async use(actor, item) {\n    const owed = combatFormsOwed(" },
  { name: "Combat Form no longer gates entering", file: A, from: "    if (!(await focusReady(item, \"Combat Form\"))) return false;\n    const pick = await h().chooseFromList(\"Combat Form\", \"Enter a form (1 AP)\", options);", to: "    const pick = await h().chooseFromList(\"Combat Form\", \"Enter a form (1 AP)\", options);" },
  { name: "THE DEFECT: Misdirecting Whisper spends before the roll", file: A, from: "    const check = await h().resolveAction(actor, { ...action, apCost: \"0\", variantNote: \"Misdirecting Whisper: 1 AP, rolled with advantage.\" });\n    if (!check) {\n      await safeDelete(actor, ownEffects(actor, \"misdirectingWhisper\").map((e) => e.id));\n      return false;\n    }\n    if (!(await spendAP(actor, \"Misdirecting Whisper\", 1))) return false;\n    if (!(await spendUse(item, \"Misdirecting Whisper\"))) return false;", to: "    if (!(await spendAP(actor, \"Misdirecting Whisper\", 1))) return false;\n    if (!(await spendUse(item, \"Misdirecting Whisper\"))) return false;\n    const check = await h().resolveAction(actor, { ...action, apCost: \"0\", variantNote: \"Misdirecting Whisper: 1 AP, rolled with advantage.\" });\n    if (!check) {\n      await safeDelete(actor, ownEffects(actor, \"misdirectingWhisper\").map((e) => e.id));\n      return false;\n    }" },
  { name: "a refused Feint leaves the advantage", file: A, from: "      await safeDelete(actor, ownEffects(actor, \"misdirectingWhisper\").map((e) => e.id));\n      return false;", to: "      return false;" },
  { name: "the AP is not checked before the roll", file: A, from: "    if (game.combat?.started && int(actor.system?.resources?.ap?.value) < 1) { ui.notifications.warn(\"Misdirecting Whisper: 1 AP required.\"); return false; }\n", to: "" },
  { name: "Iron Tortoise leaves out the Trip again", file: B4C, from: "when: { actions: [\"shoveAttack\", \"reposition\", \"tripAttack\"] } }]", to: "when: { actions: [\"shoveAttack\", \"reposition\"] } }]" },
  { name: "Iron Tortoise's text still says a Trip is not included", file: B4C, from: "Shove, Reposition and Trip against you are rolled at disadvantage", to: "Shove and Reposition against you are rolled at disadvantage" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-weapons.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-weapons: verify-weapons already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-weapons: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-weapons: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
