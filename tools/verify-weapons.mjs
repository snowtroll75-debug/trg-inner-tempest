#!/usr/bin/env node
/**
 * verify-weapons — Inner Tempest 0.5.1: Chapter 6's sixteen weapons (Graham,
 * 23 October 2026: "Add the weapons from chapter 6", weapons only), and the
 * three fixes the 0.5.0 live test asked for (Combat Form's learning step,
 * Misdirecting Whisper's refused Feint) with Graham's Trip ruling for Iron
 * Tortoise.
 *
 *   TRG_PRIME_ROOT=../core/trg-prime node tools/verify-weapons.mjs
 *
 * Needs TRG Prime 3.668.1 at TRG_PRIME_ROOT.
 *
 *   A  The book (tools/content/book-text-weapons.json, cut from the v1.2
 *      docx by tools/content/extract-book-weapons.mjs): every cell of every
 *      row read into its field, every description and trait paragraph
 *      printed, nothing added
 *   B  The system reads them: reach, versatile, Monastic, AR, the three new
 *      traits, and who is proficient
 *   C  The 0.5.1 fixes
 *   D  The pack, the traits registered, versions
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

const { CHAPTER6_WEAPONS } = await import("./content/weapons.mjs");
const { PACKS } = await import("./content/foundation.mjs");
const { md } = await import("./content/markdown.mjs");
const B4 = await import("./content/block4.mjs");
const auto4 = await import("../module/block4-automations.mjs");
const reg = await import("../module/registration.mjs");
const book = JSON.parse(fs.readFileSync(path.join(ROOT, "tools", "content", "book-text-weapons.json"), "utf8"));

const atk = await import(sys("module", "combat", "attack.mjs"));
const unarmed = await import(sys("module", "combat", "unarmed-profile.mjs"));
const t6 = await import(sys("module", "combat", "weapon-chapter6-traits.mjs"));
const api = await import(sys("module", "module-api.mjs"));
const prof = await import(sys("module", "proficiency-rules.mjs"));

const W = (name) => CHAPTER6_WEAPONS.find((w) => w.name === name);

/* ------------------------------------------------------------------ *
 * A. The book
 * ------------------------------------------------------------------ */

equal("A the extract holds the three tables' sixteen rows", [book.rows.length, [...new Set(book.rows.map((r) => r.table))]], [16, ["MELEE SIMPLE WEAPONS", "MELEE MARTIAL WEAPONS", "MELEE EXOTIC WEAPONS"]]);
equal("A …the four traits Chapter 6 describes", Object.keys(book.traits).sort(), ["Backswing", "Brace", "Monastic", "Twin"]);
equal("A …and sixteen descriptions", Object.keys(book.descriptions).length, 16);
equal("A one weapon per row, in the table's order", CHAPTER6_WEAPONS.map((w) => w.name), book.rows.map((r) => r.name));

const CATEGORY = { "MELEE SIMPLE WEAPONS": "Simple", "MELEE MARTIAL WEAPONS": "Martial", "MELEE EXOTIC WEAPONS": "Exotic" };
const SIZES = { T: "tiny", S: "small", M: "medium", L: "large" };
const TYPES = { B: "bludgeoning", P: "piercing", S: "slashing" };
const asTrait = (t) => t.replace(/^Versatile\s*-?\s*([BPS])$/, "Versatile $1").replace(/^Reach \(\d+ ft\.\)$/, "Reach");
for (const row of book.rows) {
  const w = W(row.name);
  if (!w) { ok(`A ${row.name} is built`, false); continue; }
  const s = w.system;
  const [die, letter] = row.damage.split(" ");
  equal(`A ${row.name}: price, level, damage, size, FDC, weight, group and category as printed`,
    [s.price, s.itemLevel, s.damage, s.damageType, s.size, s.fumbleDC, s.weight, s.group, s.category],
    [Number(row.price.replace(/ gp$/, "")), Number(row.level), die, TYPES[letter], SIZES[row.size], Number(row.fdc), row.weight === "-" ? 0 : Number(row.weight.replace(/ lbs?$/, "")), row.group, CATEGORY[row.table]]);
  const printedTraits = row.traits.split(",").map((t) => asTrait(t.trim()));
  const expected = CATEGORY[row.table] === "Exotic" ? [...printedTraits, "Exotic"] : printedTraits;
  equal(`A ${row.name}: its traits, as the system writes them${CATEGORY[row.table] === "Exotic" ? " (and Exotic, as the core pack marks one)" : ""}`, s.traits.split(", ").sort(), [...new Set(expected)].sort());
  const heading = row.name === "Kusarigama" ? "KUSIRIGAMA" : row.name.toUpperCase();
  const paras = book.descriptions[heading] ?? [];
  ok(`A ${row.name}: every paragraph of its description is printed`, paras.length > 0 && paras.every((p) => s.description.includes(md(p))));
  const own = row.traits.split(",").map((t) => t.trim().split(" ")[0]).filter((t) => book.traits[t]);
  ok(`A ${row.name}: and the book's text for each Chapter 6 trait it carries${own.length ? ` (${own.join(", ")})` : ""}`, own.every((t) => s.description.includes(md(`**${t}:** ${book.traits[t]}`))));
  const bookParas = [...paras.map((p) => md(p)), ...own.map((t) => md(`**${t}:** ${book.traits[t]}`))];
  const others = s.description.split("\n").filter((p) => !bookParas.includes(p));
  ok(`A ${row.name}: nothing else claims to be printed (each other paragraph is the system's note, in italics)`, others.every((p) => /^<p><em>[^<]+:<\/em> /.test(p)), others.join(" | "));
}
// Typed from the book's page, as a second reading of the extract.
equal("A the Nodachi: 300 gp, level 2, 1d10 slashing, large, Brace", [W("Nodachi").system.price, W("Nodachi").system.itemLevel, W("Nodachi").system.damage, W("Nodachi").system.size, t6.hasWeaponTrait(W("Nodachi").system, "brace")], [300, 2, "1d10", "large", true]);
equal("A the Meteor Hammer's reach is 15 feet; the Naginata and Tetsubo are AR 2", [W("Meteor Hammer").system.reachFeet, W("Naginata").system.armourRending, W("Tetsubo").system.armourRending, W("Bo Staff").system.reachFeet], [15, 2, 2, undefined]);
equal("A the Fighting Fan prints no weight", [book.rows.find((r) => r.name === "Fighting Fan").weight, W("Fighting Fan").system.weight], ["-", 0]);
ok("A the Butterfly Sword says it is one sword, and what is the GM's", /The pack item is one sword: Double Slice and Twin need two on the character\./.test(W("Butterfly Sword").system.description));

/* ------------------------------------------------------------------ *
 * B. The system reads them
 * ------------------------------------------------------------------ */

equal("B reach: the Meteor Hammer reaches 10 feet further, the Bo Staff, Kusarigama and Naginata 5", ["Meteor Hammer", "Bo Staff", "Kusarigama", "Naginata", "Sai"].map((n) => atk.weaponReachExtension(W(n).system)), [10, 5, 5, 5, 0]);
equal("B versatile: the Jutte slashing, the Kusarigama bludgeoning, the Nodachi and Wakizashi piercing", ["Jutte", "Kusarigama", "Nodachi", "Wakizashi", "Hanbo"].map((n) => atk.extractVersatileType(W(n).system.traits)), ["slashing", "bludgeoning", "piercing", "piercing", null]);
const monastic = CHAPTER6_WEAPONS.filter((w) => unarmed.countsAsUnarmed(w.system)).map((w) => w.name);
equal("B Monastic: the twelve that print it count for the rules an unarmed strike uses", monastic, book.rows.filter((r) => /\bMonastic\b/.test(r.traits)).map((r) => r.name));
equal("B the three new traits, read by the system", [
  t6.braceApplies({ weaponSystem: W("Nodachi").system, readied: true, targetMounted: true }),
  t6.backswingRefund({ weaponSystem: W("Nunchaku").system, resolved: true, hits: false }),
  t6.twinBonus({ first: { weaponSystem: W("Tonfa").system, hits: true, damageTaken: 2 }, second: { weaponSystem: W("Butterfly Sword").system, hits: true, damageTaken: 1 } })],
[{ attackBonus: 2, extraDice: 1 }, true, 1]);
equal("B …and only these weapons carry them", ["backswing", "brace", "twin"].map((t) => CHAPTER6_WEAPONS.filter((w) => t6.hasWeaponTrait(w.system, t)).map((w) => w.name)), [["Nunchaku"], ["Nodachi"], ["Tonfa", "Butterfly Sword"]]);
reg.registerContent({ ...Object.fromEntries(Object.keys(api).filter((k) => typeof api[k] === "function").map((k) => [k, api[k]])), registerFeatAutomation() {}, registerPassiveAutomation() {}, registerDefenceOffer() {}, registerSkillActions() {} }, "trg-inner-tempest");
const CLASSES = PACKS.find((p) => p.name === "it-classes").docs;
const proficientWith = (cls) => {
  const profile = prof.proficiencyProfile({ items: [CLASSES.find((c) => c.name === cls)], system: { identity: {} } });
  return CHAPTER6_WEAPONS.filter((w) => prof.proficiencyOf(profile, w).proficient).map((w) => w.name);
};
const simpleMartial = book.rows.filter((r) => r.table !== "MELEE EXOTIC WEAPONS").map((r) => r.name);
const monasticExotic = book.rows.filter((r) => r.table === "MELEE EXOTIC WEAPONS" && /\bMonastic\b/.test(r.traits)).map((r) => r.name);
equal("B the Ghostwalker: simple and Monastic weapons, and the wakizashi", proficientWith("Ghostwalker"), [...simpleMartial, ...monasticExotic, "Wakizashi"]);
equal("B the Disciple and the Mystic: simple and Monastic weapons", [proficientWith("Disciple"), proficientWith("Mystic")], [[...simpleMartial, ...monasticExotic], [...simpleMartial, ...monasticExotic]]);
equal("B the Kensai: simple and martial, no exotic", proficientWith("Kensai"), simpleMartial);
equal("B the Oathblade: simple and martial, and the wakizashi", proficientWith("Oathblade"), [...simpleMartial, "Wakizashi"]);

/* ------------------------------------------------------------------ *
 * C. The 0.5.1 fixes
 * ------------------------------------------------------------------ */

const src = fs.readFileSync(path.join(ROOT, "module", "block4-automations.mjs"), "utf8");
equal("C Combat Form keeps its own Focus use (learning is free); no other Use declares it", Object.entries(auto4.BLOCK4_AUTOMATIONS).filter(([, e]) => e.ownsFocusUse === true).map(([k]) => k), ["combat form"]);
const cf = src.slice(src.indexOf("const combatForm = {"), src.indexOf("/** A form's own Use"));
ok("C …and gates entering on the use itself, which enterForm spends", /if \(owed > 0\) return learnForm\(actor, item, owed\);[\s\S]*if \(!\(await focusReady\(item, "Combat Form"\)\)\) return false;/.test(cf)
  && /if \(spendCombatForm\) await spendUse\(combatForm, "Combat Form"\);/.test(src));
const coreFw = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "feats-workflow.mjs"), "utf8");
ok("C …which the system honours (3.668.1)", /if \(ownsFocusUse\(item\)\) return run\(\);/.test(coreFw));
const mw = src.slice(src.indexOf("const misdirectingWhisper = {"), src.indexOf("/** Thrown weapons on the actor"));
const at = (re) => { const m = re.exec(mw); return m ? m.index : -1; };
const roll = at(/const check = await h\(\)\.resolveAction\(actor, \{ \.\.\.action, apCost: "0"/), spendAp = at(/await spendAP\(actor, "Misdirecting Whisper", 1\)/), spendU = at(/await spendUse\(item, "Misdirecting Whisper"\)/);
ok("C Misdirecting Whisper rolls first, then spends the AP and the use", roll > 0 && spendAp > roll && spendU > spendAp, `${roll} ${spendAp} ${spendU}`);
ok("C …a refused roll spends nothing and takes the advantage away", /if \(!check\) \{\n\s*await safeDelete\(actor, ownEffects\(actor, "misdirectingWhisper"\)\.map\(\(e\) => e\.id\)\);\n\s*return false;\n\s*\}/.test(mw));
ok("C …and the AP is checked before the roll", at(/int\(actor\.system\?\.resources\?\.ap\?\.value\) < 1\) \{ ui\.notifications\.warn\("Misdirecting Whisper: 1 AP required\."\); return false; \}/) > 0 && at(/int\(actor\.system/) < roll);
const tortoise = auto4.mergeFormFlags(B4.BLOCK4_ABILITIES.find((d) => d.name === "Iron Tortoise").flags["trg-prime"].itForm.parts);
equal("C Iron Tortoise: a Trip is an attempt to move you (Graham, 23 October 2026)", tortoise.defenceDC?.[0]?.when?.actions, ["shoveAttack", "reposition", "tripAttack"]);
ok("C …and its text says so", /Shove, Reposition and Trip against you are rolled at disadvantage/.test(B4.BLOCK4_ABILITIES.find((d) => d.name === "Iron Tortoise").system.description));
const coreActions = fs.readFileSync(path.join(SYSTEM_ROOT, "module", "data", "basic-actions.mjs"), "utf8");
ok("C …the three are the system's own action keys", ["shoveAttack", "reposition", "tripAttack"].every((k) => coreActions.includes(`key: "${k}"`)));

/* ------------------------------------------------------------------ *
 * D. The pack, the traits, versions
 * ------------------------------------------------------------------ */

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "module.json"), "utf8"));
const declared = manifest.packs.find((p) => p.name === "it-weapons");
equal("D module.json declares the weapons pack, extending the system's", declared && [declared.type, declared.path, declared.flags?.["trg-prime"]?.extends], ["Item", "packs/it-weapons", "weapons"]);
const pack = PACKS.find((p) => p.name === "it-weapons");
ok("D the build lays the sixteen into it", pack && pack.extends === "weapons" && pack.docs === CHAPTER6_WEAPONS);
const dir = path.join(ROOT, "packs-source", "it-weapons");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) : [];
ok("D packs-source/it-weapons carries every weapon, as built", files.length === 16 && CHAPTER6_WEAPONS.every((d) => files.some((f) => f._id === d._id && JSON.stringify(f.system) === JSON.stringify(d.system))));
ok("D …and the compiled pack is there", fs.existsSync(path.join(ROOT, "packs", "it-weapons")));
ok("D every weapon is a weapon, with an image from the system's own", CHAPTER6_WEAPONS.every((w) => w.type === "weapon" && w.system.attackMode === "melee" && w.system.hands === 1 && fs.existsSync(path.join(SYSTEM_ROOT, w.img.replace(/^systems\/trg-prime\//, "")))));
const allIds = PACKS.flatMap((p) => p.docs.map((d) => d._id));
ok("D every id across the module is unique", new Set(allIds).size === allIds.length);
ok("D Backswing, Brace and Twin are registered as traits", ["backswing", "brace", "twin"].every((t) => api.registeredTraits().includes(t)));
// Re-pinned at 0.6.0 (Block 5, on 3.669.0).
equal("D the module is 1.0.4, built for 3.674.2", [manifest.version, manifest.relationships.systems[0].compatibility.minimum], ["1.0.4", "3.674.2"]);
ok("D the script refuses an older system", fs.readFileSync(path.join(ROOT, "scripts", "inner-tempest.mjs"), "utf8").includes('const REQUIRED_SYSTEM = "3.674.2";'));
const systemJson = JSON.parse(fs.readFileSync(path.join(SYSTEM_ROOT, "system.json"), "utf8"));
const [sa, sb, sc] = String(systemJson.version).split(".").map(Number);
ok("D the system at TRG_PRIME_ROOT is 3.669.0 or later", sa > 3 || (sa === 3 && sb >= 669), systemJson.version);

/* ------------------------------------------------------------------ */

const EXPECTED = 117;
equal("Z the suite ran every check it is meant to", checks + 1, EXPECTED);
if (failures.length) { console.log(`verify-weapons: ${checks} checks — ${failures.length} FAILED\n`); for (const f of failures) console.log(`  ✗ ${f}`); process.exitCode = 1; }
else console.log(`verify-weapons: ${checks} checks — all green.`);
