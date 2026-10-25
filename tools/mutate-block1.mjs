#!/usr/bin/env node
/**
 * mutate-block1 — the mutation half of verify-block1. Each mutation breaks
 * one printed rule or one wire; verify-block1 must fail on every one.
 * Files are restored after each run, and on any exit.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const f = (...p) => path.join(ROOT, ...p);
const FOUND = f("tools", "content", "foundation.mjs"), FEATS = f("tools", "content", "feats-general.mjs");
const BUILD = f("tools", "content", "builders.mjs");
const AUTO = f("module", "automations.mjs"), REG = f("module", "registration.mjs"), SCRIPT = f("scripts", "inner-tempest.mjs");

const MUTATIONS = [
  { name: "Miraku loses its Con penalty", file: FOUND, from: "abilityModifiers: \"Dex +1, Wis +1, Cha +1, Con -1\", speed: 30,", to: "abilityModifiers: \"Dex +1, Wis +1, Cha +1\", speed: 30," },
  { name: "Ryukari runs at 30", file: FOUND, from: "abilityModifiers: \"Str +1, Con +1, Cha +1, Dex -1\", speed: 25,", to: "abilityModifiers: \"Str +1, Con +1, Cha +1, Dex -1\", speed: 30," },
  { name: "Scree Cant is dropped", file: FOUND, from: "coreLanguages: \"Low Tongue, Scree Cant\"", to: "coreLanguages: \"Low Tongue\"" },
  { name: "Kitsune casts with the actor's ability", file: FOUND, from: "flags: { grantInnate: true, grantedSpellAbility: \"charisma\" }", to: "flags: { grantInnate: true }" },
  { name: "Ren's falls are full length", file: FOUND, from: "{ fallReduction: { value: 20, label: \"Ren\" } }", to: "{ fallReduction: { value: 0, label: \"Ren\" } }" },
  { name: "Byakko's Sneak bonus is a tick", file: FOUND, from: "scope: \"Sneak (Stealth) checks\", auto: true,", to: "scope: \"Sneak (Stealth) checks\", auto: false," },
  { name: "Orochi swims at 20", file: FOUND, from: "otherSpeed(\"swim\", 15)", to: "otherSpeed(\"swim\", 20)" },
  { name: "Zennyo holds its breath", file: FOUND, from: "flags: { creatureAbility: { derives: { breathesWater: true } } }", to: "flags: {}" },
  { name: "Fuku's pool is unchanged", file: FOUND, from: "flags: { convictionPool: 1 }", to: "flags: {}" },
  { name: "Kabuto's DR lands before the base", file: FOUND, from: "mode: 2, value: \"1\", priority: 30 }],\n        \"Your base natural DR increases by 1.\")", to: "mode: 2, value: \"1\", priority: 10 }],\n        \"Your base natural DR increases by 1.\")" },
  { name: "Kabuto carries nothing extra", file: FOUND, from: "flags: { carryStrength: 5 }", to: "flags: {}" },
  { name: "Kamiri loses its blade", file: FOUND, from: "grantedWeapons: \"Raptorial Blade\",", to: "grantedWeapons: \"\"," },
  { name: "the Raptorial Blade loses AR 1", file: FOUND, from: "traits: \"Agile, Finesse, AR 1\", armourRending: 1,", to: "traits: \"Agile, Finesse, AR 1\"," },
  { name: "THE DEFECT: the blade's AR is not on its trait line", file: FOUND, from: "traits: \"Agile, Finesse, AR 1\", armourRending: 1,", to: "traits: \"Agile, Finesse\", armourRending: 1," },
  { name: "Chitinous Carapace is Base DR 1", file: FOUND, from: "effects: [baseDR(2, \"Chitinous Carapace\")]", to: "effects: [baseDR(1, \"Chitinous Carapace\")]" },
  { name: "Martial Affinity applies out of a stance", file: FOUND, from: "      stanceConditionals: [\n        conditional({ kind: \"modifier\", value: 1, type: \"racial\", label: \"Martial Affinity\"", to: "      conditionals: [\n        conditional({ kind: \"modifier\", value: 1, type: \"racial\", label: \"Martial Affinity\"" },
  { name: "Martial Affinity's DB row is unscoped and ungated", file: FOUND, from: "stanceDefenceDC: [{ dc: \"defence\", value: 1, label: \"Martial Affinity\"", to: "defenceDC: [{ dc: \"defence\", value: 1, label: \"Martial Affinity\"" },
  { name: "Natural Chi casts with the actor's ability", file: FOUND, from: "innate: true, castingAbility: \"wisdom\", note:", to: "innate: true, note:" },
  { name: "Hikari's advantage is never applied", file: FOUND, from: "scope: \"Saving throws against emotion and fear effects\", auto: true,", to: "scope: \"Saving throws against emotion and fear effects\", auto: false," },
  { name: "a Tianzhi element is wrong", file: FOUND, from: "Kasai: Object.freeze({ element: \"Flame\", damageType: \"fire\"", to: "Kasai: Object.freeze({ element: \"Flame\", damageType: \"cold\"" },
  { name: "Nomad's wealth is 0", file: FOUND, from: "\"Grey Seeker\": 1, \"Nomad\": -1,", to: "\"Grey Seeker\": 1, \"Nomad\": 0," },
  { name: "a Lore keeps the book's bracket form", file: FOUND, from: "\"Lore (Astral)\": \"Astral Lore\"", to: "\"Lore (Astral)\": \"Lore (Astral)\"" },
  { name: "Spirit Awareness applies to every Perception check", file: FOUND, from: "subjects: [\"perception\", \"occultism\"], targetTraits: [\"spirit\", \"haunt\"] } }),", to: "subjects: [\"perception\", \"occultism\"] } })," },
  { name: "Centred Recovery's first Refocus is unchanged", file: FEATS, from: "{ action: \"refocus\", improve: 1, max: \"critical\", label: \"Centred Recovery\" },", to: "" },
  { name: "Ethereal Sight's increase reaches the concealed", file: FEATS, from: "missCheckDCIncrease: { value: 2, conditions: [\"hidden\"] }", to: "missCheckDCIncrease: 2" },
  { name: "Tranquil Mind applies out of a stance", file: FEATS, from: "    flags: {\n      stanceConditionals: [\n        conditional({ kind: \"advantage\", label: \"Tranquil Mind\"", to: "    flags: {\n      conditionals: [\n        conditional({ kind: \"advantage\", label: \"Tranquil Mind\"" },
  { name: "Spirit Stance hits everything harder", file: AUTO, from: "auto: true, when: { checkTypes: [\"attack\"], targetTraits: [...SPIRIT_TARGETS] } },", to: "auto: true, when: { checkTypes: [\"attack\"] } }," },
  { name: "Spirit Stance's strikes are magical against all", file: AUTO, from: "magicalAttacks: { label: \"Spirit Stance\", targetTraits: [...SPIRIT_TARGETS] }", to: "magicalAttacks: { label: \"Spirit Stance\" }" },
  { name: "Spirit Stance is not a core stance", file: AUTO, from: "    return helpers().enterStance(actor, item, {", to: "    return helpers().replaceFeatEffect(actor, item, {" },
  { name: "Flourish is never asked", file: AUTO, from: "  if (!(await traitGate(actor, action, label))) return false;\n", to: "" },
  { name: "the paid Strike costs AP", file: AUTO, from: "rollWeaponAttack(actor, weapon, { apPaid: true, extraModifiers: [], ...momentum })", to: "rollWeaponAttack(actor, weapon, { extraModifiers: [], ...momentum })" },
  { name: "Elemental Balance can lower a save", file: AUTO, from: "  return Math.max(0, Math.trunc(survival - save));", to: "  return Math.trunc(survival - save);" },
  { name: "Ancestral Guidance spends on a Partial", file: AUTO, from: "const SUCCESSES = Object.freeze([\"heroic\", \"critical\", \"success\"]);", to: "const SUCCESSES = Object.freeze([\"heroic\", \"critical\", \"success\", \"partial\"]);" },
  { name: "Ancestral Guidance needs no conviction", file: AUTO, from: "  return Number(conviction) >= 1;", to: "  return true;" },
  { name: "a ranged weapon is offered for the Pounce", file: AUTO, from: "    && ![\"missile\", \"thrown\", \"ranged\"].includes(String(i.system?.attackMode ?? \"melee\")));", to: ");" },
  { name: "Radiant Insight substitutes nothing", file: REG, from: "  \"Radiant Insight\": [{ action: \"clearMind\", skill: \"religion\" }],\n", to: "" },
  { name: "Scree Cant is common", file: REG, from: "  \"Scree Cant\": { rarity: \"uncommon\", speakers: \"Scree\" }", to: "  \"Scree Cant\": { rarity: \"common\", speakers: \"Scree\" }" },
  { name: "a swim Speed upgrades the movement object (0.1.0's live bug)", file: FOUND, from: "key: `system.combat.movement.${kind}.base`, mode: 4,", to: "key: `system.combat.movement.${kind}`, mode: 4," },
  { name: "Ancestral Guidance settles before the DC is set", file: AUTO, from: "    if (!degree) return;\n    await actor.unsetFlag(MODULE_ID, PENDING_FLAG);", to: "    await actor.unsetFlag(MODULE_ID, PENDING_FLAG);" },
  { name: "a refused Stunning Reflexes keeps the turn's stamp", file: AUTO, from: "    if (!check && stamp && item.getFlag(MODULE_ID, \"usedTurn\") === stamp) await item.unsetFlag(MODULE_ID, \"usedTurn\");\n", to: "" },
  { name: "Stunning Reflexes is never stamped", file: AUTO, from: "    if (stamp) await item.setFlag(MODULE_ID, \"usedTurn\", stamp);\n", to: "" },
  { name: "the Tianzhi race keeps an open language pick", file: FOUND, from: "    coreLanguages: \"Low Tongue\", additionalLanguages: \"common, regional\",\n    specialistSkills: \"Elemental Lore, Tianzhi Lore\",", to: "    coreLanguages: \"Low Tongue\", additionalLanguages: \"common, regional\",\n    languageChoices: \"1 common|uncommon|regional\",\n    specialistSkills: \"Elemental Lore, Tianzhi Lore\"," },
  { name: "Hikari speaks Celestial", file: FOUND, from: "Fuukaze: \"Aeolian\", Hikari: \"Thanatos\",", to: "Fuukaze: \"Aeolian\", Hikari: \"Celestial\"," },
  { name: "the heritage language never reaches the item", file: BUILD, from: "as a race's is.\n      coreLanguages,\n", to: "as a race's is.\n      coreLanguages: \"\",\n" },
  { name: "Tsuchi's row moves a DC instead", file: FOUND, from: "defenceDC: [{ kind: \"disadvantage\", label: \"Tsuchi\",", to: "defenceDC: [{ dc: \"fortitudeDC\", value: 2, label: \"Tsuchi\"," },
  { name: "Tsuchi resists a Grapple too", file: FOUND, from: "when: { actions: [\"shoveAttack\", \"tripAttack\"] } }]", to: "when: { actions: [\"shoveAttack\", \"tripAttack\", \"grappleAttack\"] } }]" },
  { name: "Tsuchi resists a Shove only", file: FOUND, from: "when: { actions: [\"shoveAttack\", \"tripAttack\"] } }]", to: "when: { actions: [\"shoveAttack\"] } }]" },
  { name: "Spiritwalker gets no alternative", file: FOUND, from: "  \"Spirit Warrior\": \"Miraku\", \"Spiritwalker\": \"Miraku\",", to: "  \"Spirit Warrior\": \"Miraku\"," },
  { name: "the Elemental Lore backgrounds get no alternative", file: FOUND, from: "  \"Elemental Guardian\": \"Tianzhi\", \"Elemental Harmonist\": \"Tianzhi\"\n", to: "" },
  { name: "every prompt says Spirit Lore", file: FOUND, from: "  prompt: `Your race already gives you ${lore} — name another Lore for this background`,", to: "  prompt: \"Your race already gives you Spirit Lore — name another Lore for this background\"," },
  { name: "the Elemental Lore backgrounds have no Use", file: AUTO, from: "  \"elemental harmonist\": loreAlternative,\n", to: "" },
  { name: "the alternative is any skill, not a Lore", file: FOUND, from: "  placeholder: \"e.g. Ancestor Lore\",\n  suffix: \"Lore\"\n", to: "  placeholder: \"e.g. Ancestor Lore\",\n  suffix: \"\"\n" },
  { name: "the Spirit Lore backgrounds have no Use", file: AUTO, from: "  \"spirit warrior\": loreAlternative,\n", to: "" },
  { name: "the module accepts the old system", file: SCRIPT, from: "const REQUIRED_SYSTEM = \"3.671.0\";", to: "const REQUIRED_SYSTEM = \"3.666.0\";" },
  { name: "the card buttons are never bound", file: SCRIPT, from: "Hooks.on(\"renderChatMessageHTML\", (message, html) => bindCardButtons(message, html));", to: "" }
];

const originals = new Map();
for (const m of MUTATIONS) if (!originals.has(m.file)) originals.set(m.file, fs.readFileSync(m.file, "utf8"));
const restore = () => { for (const [file, text] of originals) fs.writeFileSync(file, text); };
process.on("SIGINT", () => { restore(); process.exit(130); });
process.on("SIGTERM", () => { restore(); process.exit(143); });

function run() {
  try { execFileSync(process.execPath, [f("tools", "verify-block1.mjs")], { stdio: ["ignore", "pipe", "pipe"], env: process.env }); return true; }
  catch { return false; }
}

const results = [];
try {
  if (!run()) { console.error("mutate-block1: verify-block1 already fails on an unmodified tree."); process.exit(2); }
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
console.log(bad.length ? `\nmutate-block1: FAILED — ${bad.length} of ${results.length} not caught.` : `\nmutate-block1: OK — all ${results.length} mutations caught, tree restored.`);
if (bad.length) process.exitCode = 1;
