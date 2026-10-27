#!/usr/bin/env node
/**
 * extract-book-block9 — what Block 9 builds, cut from pandoc's markdown of the
 * v1.2 docx into tools/content/book-text-block9.json, so the content is the
 * book's and tools/verify-block9.mjs can hold it against the book without the
 * book itself.
 *
 *   node tools/content/extract-book-block9.mjs <it12.md>
 *
 * What it writes:
 *
 *   armour.rows[]        Chapter 6's Monastic Armour Table, one row per armour,
 *                        each cell exactly as printed, with the table section
 *                        it sits in (LIGHT ARMOUR, MEDIUM ARMOUR, HEAVY ARMOUR,
 *                        OTHER)
 *   armour.descriptions  the paragraphs under each ARMOUR DESCRIPTIONS heading
 *   magic.monastic       Chapter 9's MONASTIC ITEMS: its paragraphs and bullets
 *   magic.<section>      armourRunes, specificArmour, weaponRunes, specificWeapon,
 *                        wondrous: each entry under its printed heading, with
 *                          traits   the bold trait line
 *                          fields   the labelled lines (Level, Price, Usage,
 *                                   Activate, Trigger, Frequency, Requirement,
 *                                   Weight, the statistics lines)
 *                          flavour  the italic line
 *                          lines    every other paragraph, in order
 *                          tiers    each "**NAME I**" sub-heading's fields and lines
 *   appendix.lines       the appendix's prose, by its headings
 *   appendix.categories  the Age Categories table
 *   appendix.effects     the Effects of Aging table
 *   appendix.races       the Racial Age Categories table, and its notes
 *
 * Nothing is reworded. Image tags are dropped (Mindful's text sits on the same
 * line as one: v1.2 does print it).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block9.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const at = (re, from = 0, to = lines.length) => {
  const i = lines.findIndex((l, n) => n >= from && n < to && re.test(l));
  if (i < 0) throw new Error(`not found: ${re}`);
  return i;
};
const cell = (s) => String(s).replace(/\*\*/g, "").replace(/\\-/g, "-").replace(/\\/g, "").trim();
const noImg = (l) => String(l).trim().replace(/<img [^>]+>\s*/g, "").trim();
const tableCells = (l) => l.trim().split("|").slice(1, -1).map(cell);
const isRule = (cells) => cells.every((c) => /^-*$/.test(c));

/* ------------------------------------------------------------------ */
/* Chapter 6: the armour                                                */
/* ------------------------------------------------------------------ */

const CH6 = at(/^# CHAPTER 6\b/);
const ARMOUR = at(/^## ARMOUR\s*$/, CH6);
const DESCS = at(/^### ARMOUR DESCRIPTIONS/, ARMOUR);
const WEAPONS = at(/^## WEAPONS\s*$/, DESCS);

const armourIntro = [];
const rows = [];
let section = "";
for (let i = ARMOUR + 1; i < DESCS; i += 1) {
  const l = lines[i].trim();
  if (!l) continue;
  if (!l.startsWith("|")) { armourIntro.push(l); continue; }
  const cells = tableCells(l);
  if (isRule(cells) || cells.every((c) => !c)) continue;
  if (cells[0] === "MONASTIC ARMOUR TABLE") continue;
  if (/^(LIGHT ARMOUR|MEDIUM ARMOUR|HEAVY ARMOUR|OTHER)$/.test(cells[0]) && cells.slice(1).every((c) => !c)) { section = cells[0]; continue; }
  if (cells[0] === "Armour") {
    if (cells.join("|") !== "Armour|Lvl|Price (gp)|ACP|MAX DEX|DR|HP|Speed|Wt. (lbs)|Traits") throw new Error(`unexpected armour header: ${cells.join("|")}`);
    continue;
  }
  if (!section) throw new Error(`armour row before a section: ${l}`);
  const [name, level, price, acp, maxDex, dr, hp, speed, weight, traits] = cells;
  rows.push({ section, name, level, price, acp, maxDex, dr, hp, speed, weight, traits });
}

const descriptions = {};
let current = null;
for (let i = DESCS + 1; i < WEAPONS; i += 1) {
  const l = noImg(lines[i]);
  if (!l) continue;
  if (/^[A-Z][A-Z \-]+$/.test(l)) { current = l; descriptions[current] = []; continue; }
  if (current) descriptions[current].push(l);
  else if (!/^Each type of armour is described/.test(l)) throw new Error(`text before the first armour heading: ${l}`);
}

/* ------------------------------------------------------------------ */
/* Chapter 9: the magic items                                           */
/* ------------------------------------------------------------------ */

const CH9 = at(/^CHAPTER 9 – MAGIC ITEMS\s*$/);
const APPENDIX = at(/^## APPENDIX\s*$/, CH9);
const MONASTIC = at(/^\*\*MONASTIC ITEMS\*\*$/, CH9, APPENDIX);
const SECTIONS = [
  ["armourRunes", at(/^\*\*ARMOUR RUNES\*\*$/, MONASTIC, APPENDIX)],
  ["specificArmour", at(/^\*\*SPECIFIC ARMOUR\*\*$/, MONASTIC, APPENDIX)],
  ["weaponRunes", at(/^\*\*WEAPON RUNES\*\*$/, MONASTIC, APPENDIX)],
  ["specificWeapon", at(/^\*\*SPECIFIC WEAPON\*\*$/, MONASTIC, APPENDIX)],
  ["wondrous", at(/^\*\*WONDROUS ITEMS\*\*$/, MONASTIC, APPENDIX)]
];

const monastic = [];
for (let i = MONASTIC + 1; i < SECTIONS[0][1]; i += 1) {
  const l = noImg(lines[i]);
  if (l) monastic.push(l);
}

/** The labels a field line may carry, bold or not. */
const LABELS = ["Level", "Price", "Armour Price", "Shield Price", "Usage", "Activate", "Trigger", "Frequency", "Requirement", "Weight",
  "ACP", "MAX DEX", "DR", "DB", "HP", "Traits", "AB", "Damage", "Size", "Fumble"];
/** An unbolded label opens a field line only in these printed shapes. */
const BARE = [/^Requirement\s+\S/, /^Activate\s+(Engage|Command|Interact|Reaction)\b/, /^Traits\s+[A-Z]/];

function fieldsOf(line) {
  const t = line.trim();
  const bold = /^\*\*([A-Za-z .]+?)\*\*\s*(.*)$/.exec(t);
  let parts;
  if (bold && LABELS.includes(bold[1].trim())) parts = t.split(/;\s*/);
  else if (BARE.some((re) => re.test(t))) parts = t.split(/;\s*/);
  else return null;
  const out = [];
  for (const part of parts) {
    const p = part.trim();
    const m = /^\*\*([A-Za-z .]+?)\*\*\s*(.*)$/.exec(p) ?? /^(Requirement|Activate|Traits|Frequency|Trigger|Weight)\s+(.*)$/.exec(p);
    if (m && LABELS.includes(m[1].trim())) out.push([m[1].trim(), cell(m[2])]);
    else if (out.length) out[out.length - 1][1] = `${out[out.length - 1][1]}; ${cell(p)}`;
    else return null;
  }
  return out;
}

const HEADING = /^[A-Z][A-Z' \-]+$/;
const TIER = /^\*\*([A-Z][A-Z' \-]+ (I|II|III))\*\*$/;
const BOLD_CAPS = /^\*\*([A-Z][A-Z' \-]+)\*\*$/;
const magic = { monastic };
for (let s = 0; s < SECTIONS.length; s += 1) {
  const [key, start] = SECTIONS[s];
  const end = s + 1 < SECTIONS.length ? SECTIONS[s + 1][1] : APPENDIX;
  const entries = {};
  let entry = null;
  let target = null;
  const intro = [];
  for (let i = start + 1; i < end; i += 1) {
    const l = noImg(lines[i]);
    if (!l || l === "##" || l === "## ") continue;
    if (HEADING.test(l)) {
      entry = { traits: "", fields: {}, flavour: "", lines: [], tiers: {} };
      entries[l] = entry;
      target = entry;
      continue;
    }
    if (!entry) { intro.push(l); continue; }
    const tier = TIER.exec(l);
    if (tier) { target = { fields: {}, lines: [] }; entry.tiers[tier[1]] = target; continue; }
    const caps = BOLD_CAPS.exec(l);
    if (caps && !entry.traits && target === entry) { entry.traits = caps[1]; continue; }
    const fields = fieldsOf(l);
    if (fields) { for (const [k, v] of fields) target.fields[k] = v; continue; }
    if (/^\*[^*].*[^*]\*$/.test(l) && !entry.flavour && target === entry) { entry.flavour = l.slice(1, -1).trim(); continue; }
    target.lines.push(l);
  }
  magic[key] = { intro, entries };
}

/* ------------------------------------------------------------------ */
/* The appendix: aging                                                  */
/* ------------------------------------------------------------------ */

const prose = {};
let heading = "INTRODUCTION";
prose[heading] = [];
const categories = [];
const effects = [];
const races = [];
const raceNotes = [];
let table = "";
let ended = false;
for (let i = APPENDIX + 1; i < lines.length && !ended; i += 1) {
  const l = noImg(lines[i]);
  if (!l) continue;
  if (l.startsWith("|")) {
    const cells = tableCells(l);
    if (isRule(cells)) continue;
    if (/^AGE CATEGORIES$|^EFFECTS OF AGING$|^RACIAL AGE CATEGORIES$/.test(cells[0])) { table = cells[0]; continue; }
    if (/^(Age Category|Race)$/.test(cells[0])) continue;
    if (table === "AGE CATEGORIES") categories.push({ category: cells[0], age: cells[1] });
    else if (table === "EFFECTS OF AGING") {
      const [category, str, dex, con, int, wis, cha] = cells;
      effects.push({ category, str, dex, con, int, wis, cha });
    } else if (table === "RACIAL AGE CATEGORIES") {
      const [race, adult, middle, old, venerable, lifespan] = cells;
      races.push({ race, adult, middle, old, venerable, lifespan });
    } else throw new Error(`appendix table row outside a table: ${l}`);
    continue;
  }
  // THE INDEX FOLLOWS THE APPENDIX: "ACQUIRING A DRAGON 60".
  if (/^[A-Z][A-Za-z' \-]+ \d+$/.test(l)) { ended = true; continue; }
  if (table === "RACIAL AGE CATEGORIES") { raceNotes.push(l); continue; }
  if (HEADING.test(l)) { heading = l; prose[heading] = []; continue; }
  prose[heading].push(l);
}

const out = {
  source: "Inner Tempest v1.2 (pandoc markdown of TRG_Inner_Tempest_1_2.docx): Chapter 6 armour, Chapter 9, the appendix",
  armour: { intro: armourIntro, rows, descriptions },
  magic,
  appendix: { prose, categories, effects, races, raceNotes }
};
const file = path.join(ROOT, "tools", "content", "book-text-block9.json");
fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
const count = (k) => Object.keys(magic[k].entries).length;
console.log(`wrote ${path.relative(ROOT, file)}: ${rows.length} armour, ${Object.keys(descriptions).length} descriptions; `
  + `runes ${count("armourRunes")}+${count("weaponRunes")}, specific ${count("specificArmour")}+${count("specificWeapon")}, wondrous ${count("wondrous")}; `
  + `${races.length} races`);
