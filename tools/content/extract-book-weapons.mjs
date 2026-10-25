#!/usr/bin/env node
/**
 * extract-book-weapons — Chapter 6's weapons (Inner Tempest sourcebook v1.2):
 * the three weapon tables, the four new weapon traits and the sixteen weapon
 * descriptions, cut from pandoc's markdown of the docx into
 * tools/content/book-text-weapons.json. Graham, 23 October 2026: "Add the
 * weapons from chapter 6" (weapons only).
 *
 *   node tools/content/extract-book-weapons.mjs <it12.md>
 *
 * What it writes:
 *   rows[]          { table, name, price, level, damage, size, fdc, weight, group, traits },
 *                   each cell exactly as printed
 *   traits[name]    the trait's paragraph after its bold name
 *   descriptions[NAME]  the paragraphs under each weapon's heading, as printed
 *
 * Nothing is reworded. The one heading that is not the table's spelling
 * ("KUSIRIGAMA" over the Kusarigama) is kept as printed; the builder maps it.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-weapons.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const CH6 = lines.findIndex((l) => /^# CHAPTER 6\b/.test(l));
const CH7 = lines.findIndex((l) => /^# CHAPTER 7\b/.test(l));
if (CH6 < 0 || CH7 < 0) throw new Error("chapter 6 or 7 heading not found");
const WEAPONS = lines.findIndex((l, i) => i > CH6 && i < CH7 && /^## WEAPONS\s*$/.test(l));
if (WEAPONS < 0) throw new Error("## WEAPONS not found in chapter 6");
const TRAITS = lines.findIndex((l, i) => i > WEAPONS && i < CH7 && l.trim() === "**TRAITS**");
const DESCS = lines.findIndex((l, i) => i > WEAPONS && i < CH7 && /^### WEAPON DESCRIPTIONS\s*$/.test(l));
if (TRAITS < 0 || DESCS < 0) throw new Error("TRAITS or WEAPON DESCRIPTIONS not found");

const cell = (s) => String(s).replace(/\*\*/g, "").replace(/\\-/g, "-").trim();

/* the tables */
const rows = [];
let table = "";
for (let i = WEAPONS; i < TRAITS; i += 1) {
  const l = lines[i].trim();
  if (!l.startsWith("|")) continue;
  const cells = l.split("|").slice(1, -1).map(cell);
  if (cells.every((c) => /^-*$/.test(c))) continue;
  if (/^MELEE (SIMPLE|MARTIAL|EXOTIC) WEAPONS$/.test(cells[0]) && cells.slice(1).every((c) => !c)) { table = cells[0]; continue; }
  if (/^(Name|Exotic Weapons)$/.test(cells[0])) {
    if (cells.join("|") !== `${cells[0]}|Price|Level|Damage|Size|FDC|Weight|Group|Traits`) throw new Error(`unexpected header: ${cells.join("|")}`);
    continue;
  }
  if (cells.every((c) => !c)) continue;
  if (!table) throw new Error(`row before a table heading: ${l}`);
  const [name, price, level, damage, size, fdc, weight, group, traits] = cells;
  rows.push({ table, name, price, level, damage, size, fdc, weight, group, traits });
}

/* the traits */
const traits = {};
for (let i = TRAITS + 1; i < DESCS; i += 1) {
  const m = /^\*\*([A-Za-z ]+):\*\*\s*(.+)$/.exec(lines[i].trim());
  if (m) traits[m[1].trim()] = m[2].trim();
}

/* the descriptions: an all-capitals heading line, then its paragraphs */
const descriptions = {};
let current = null;
for (let i = DESCS + 1; i < CH7; i += 1) {
  const l = lines[i].trim();
  if (!l || /^<img/.test(l)) continue;
  if (/^[A-Z][A-Z ]+$/.test(l)) { current = l; descriptions[current] = []; continue; }
  if (current) descriptions[current].push(l);
  else if (!/^Below you will find/.test(l)) throw new Error(`text before the first weapon heading: ${l}`);
}

const out = { source: path.basename(source), rows, traits, descriptions };
fs.writeFileSync(path.join(ROOT, "tools", "content", "book-text-weapons.json"), `${JSON.stringify(out, null, 2)}\n`);
console.log(`extract-book-weapons: ${rows.length} rows, ${Object.keys(traits).length} traits, ${Object.keys(descriptions).length} descriptions.`);
