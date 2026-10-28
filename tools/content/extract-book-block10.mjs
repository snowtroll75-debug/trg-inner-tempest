#!/usr/bin/env node
/**
 * extract-book-block10 — what Block 10 builds, cut from pandoc's markdown of
 * the v1.2 docx into tools/content/book-text-block10.json, so the content is
 * the book's and tools/verify-block10.mjs can hold it against the book
 * without the book itself.
 *
 *   node tools/content/extract-book-block10.mjs <it12.md>
 *
 * What it writes:
 *
 *   tamer                 Dragon Tamer: flavour, prerequisites, special
 *                         prerequisite, its lines, progression
 *   rules.<HEADING>       the chapter's rule paragraphs under each heading
 *                         (ACQUIRING A DRAGON, TRAITS, LEVEL, …)
 *   hpTable               the Dragon Companion HP Table: [size, base HP]
 *   table                 the Dragon Companion Table, one row per level, each
 *                         cell exactly as printed
 *   dragons.<NAME>        each base dragon's block: every labelled field as
 *                         printed, its breath (title, cost, traits, text), its
 *                         attacks, its magic lines, its special-ability table
 *                         and its description
 *   specials.<NAME>       each companion special: traits, fields, lines
 *   feats.<NAME>          each companion feat: fields, lines
 *   highMagic             the High Magic guidelines
 *   losing                LOSING A DRAGON's lines by sub-heading, and BOND FOR LIFE
 *
 * Nothing is reworded. Image tags are dropped.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block10.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const at = (re, from = 0, to = lines.length) => {
  const i = lines.findIndex((l, n) => n >= from && n < to && re.test(l));
  if (i < 0) throw new Error(`not found: ${re}`);
  return i;
};
const noImg = (l) => String(l).replace(/<img [^>]+>\s*/g, "").trim();
const plain = (s) => String(s).replace(/\*\*/g, "").replace(/\\-/g, "-").replace(/\\/g, "").replace(/<sup>(.*?)<\/sup>/g, "$1").trim();
const cells = (row) => row.split("|").slice(1, -1).map((c) => plain(c));
const isTable = (l) => /^\s*\|/.test(l);
const isRule = (l) => /^\s*\|[-| ]+\|\s*$/.test(l);

/* ------------------------------------------------------------------ */
/* Dragon Tamer                                                         */
/* ------------------------------------------------------------------ */
const tStart = at(/^DRAGON TAMER\s*$/);
const tEnd = at(/^FORMBINDER\s*$/, tStart);
const tamer = { flavour: "", prerequisites: "", special: "", lines: [], progression: "" };
for (const raw of lines.slice(tStart + 1, tEnd)) {
  const l = noImg(raw);
  if (!l) continue;
  let m;
  if ((m = /^\*\*Prerequisites\*\*\s+(.*)$/.exec(l))) tamer.prerequisites = plain(m[1]);
  else if ((m = /^\*\*Special Prerequisite\*\*\s+(.*)$/.exec(l))) tamer.special = plain(m[1]);
  else if ((m = /^\*\*Progression Requirements\*\*\s+(.*)$/.exec(l))) tamer.progression = plain(m[1]);
  else if (/^\*[^*].*\*$/.test(l)) tamer.flavour = l.replace(/^\*|\*$/g, "");
  else tamer.lines.push(plain(l));
}

/* ------------------------------------------------------------------ */
/* The chapter                                                          */
/* ------------------------------------------------------------------ */
const cStart = at(/^## DRAGON COMPANIONS\s*$/);
const cEnd = at(/^# CHAPTER 6/, cStart);
const baseAt = at(/^BASE CREATURE\s*$/, cStart, cEnd);
const specialAt = at(/^### COMPANION SPECIAL/, cStart, cEnd);
const featsAt = at(/^### COMPANION FEATS/, cStart, cEnd);
const vsAt = at(/^### DRAGON VS COMPANION/, cStart, cEnd);
const highAt = at(/^\*\*HIGH MAGIC\*\*/, vsAt, cEnd);
const losingAt = at(/LOSING A DRAGON/, highAt, cEnd);

// The rules, by their headings (a line in capitals, bold or not).
const heading = (l) => /^(\*\*)?[A-Z][A-Z /'’-]+(\*\*)?$/.test(l) && !/^\*\*[A-Z][A-Z ]+\*\*\s+\S/.test(l);
const rules = { intro: [] };
let current = "intro";
const hpTable = [];
const table = [];
for (let n = cStart + 1; n < baseAt; n += 1) {
  const l = noImg(lines[n]);
  if (!l) continue;
  if (isTable(l)) {
    if (isRule(l)) continue;
    const c = cells(l);
    if (/DRAGON COMPANION HP TABLE/i.test(c[0]) || /^Size$/i.test(c[0])) continue;
    if (c.length === 2) { hpTable.push([c[0], Number(c[1])]); continue; }
    if (/^(CORE|Level)$/i.test(c[0])) continue;
    table.push(c);
    continue;
  }
  if (heading(l)) { current = plain(l); rules[current] = []; continue; }
  rules[current].push(plain(l));
}

/* ------------------------------------------------------------------ */
/* The base dragons                                                     */
/* ------------------------------------------------------------------ */
const NAMES = ["COLD DRAGON", "EARTH DRAGON", "FIRE DRAGON", "LIGHT DRAGON"];
const format = [];
const dragons = {};
const starts = NAMES.map((name) => at(new RegExp(`\\*\\*${name}\\*\\*`), baseAt, specialAt));
for (let n = baseAt + 1; n < starts[0]; n += 1) { const l = noImg(lines[n]); if (l) format.push(plain(l)); }
NAMES.forEach((name, i) => {
  const from = starts[i];
  const to = i + 1 < starts.length ? starts[i + 1] : specialAt;
  const block = { fields: {}, abilities: {}, skills: "", defence: [], special: [], breath: null, attacks: [], magic: [], levels: [], description: "" };
  let section = "";
  let breathNext = false;
  for (let n = from; n < to; n += 1) {
    let l = noImg(lines[n]);
    if (!l) continue;
    l = l.replace(new RegExp(`^\\*\\*${name}\\*\\*`), "").trim();
    if (!l) continue;
    if (isTable(l)) {
      if (isRule(l)) continue;
      const c = cells(l);
      if (/^Level$/i.test(c[0])) continue;
      block.levels.push([Number(c[0]), c[1]]);
      continue;
    }
    let m;
    if (/^\*\*(ABILITY SCORES|SKILLS|DEFENCE|FEATS\/SPECIAL|ATTACKS|MAGIC)\*\*$/.test(l)) { section = plain(l); continue; }
    if (section === "ABILITY SCORES") {
      for (const [, k, v] of l.matchAll(/\*\*(STR|CON|DEX|INT|WIS|CHA)\*\*\s*(-?\d+)/g)) block.abilities[k] = Number(v);
      section = "";
      continue;
    }
    if (section === "SKILLS") { block.skills = plain(l); section = ""; continue; }
    if (section === "DEFENCE") { block.defence.push(plain(l)); continue; }
    if (section === "FEATS/SPECIAL") {
      if ((m = /^\*\*(.+? Breath)\*\*\s+(\d+) AP \(([^)]*)\)$/.exec(l))) { block.breath = { title: m[1], ap: Number(m[2]), traits: m[3], text: "" }; breathNext = true; continue; }
      if (breathNext) { block.breath.text = plain(l); breathNext = false; continue; }
      block.special.push(plain(l));
      continue;
    }
    if (section === "ATTACKS") { block.attacks.push(plain(l)); continue; }
    if (section === "MAGIC") {
      if (/^\*\*Level\*\*/.test(l)) continue;
      // The description follows the special-ability table.
      if (block.levels.length) { block.description = plain(l); continue; }
      block.magic.push(plain(l));
      continue;
    }
    if ((m = /^\*\*(Size|Initiative|Speed|Senses|Languages)\*\*\s+(.*)$/.exec(l))) { block.fields[m[1]] = plain(m[2]); continue; }
    if ((m = /^\*\*Level\*\*\s+(\d+)\s+\(\*\*EL\*\*\s+(\d+)\);\s*\*\*DC\*\*\s+(\d+)/.exec(l))) { block.fields.Level = Number(m[1]); block.fields.EL = Number(m[2]); block.fields.DC = Number(m[3]); continue; }
  }
  dragons[name] = block;
});

/* ------------------------------------------------------------------ */
/* Specials and feats                                                   */
/* ------------------------------------------------------------------ */
function entries(from, to) {
  const out = { _intro: [] };
  let cur = "_intro";
  for (let n = from + 1; n < to; n += 1) {
    const l = noImg(lines[n]);
    if (!l) continue;
    if (/^[A-Z][A-Z ']+$/.test(l)) { cur = l; out[cur] = { traits: "", fields: {}, lines: [] }; continue; }
    const e = out[cur];
    if (cur === "_intro") { e.push(plain(l)); continue; }
    let m;
    if (!e.traits && !e.lines.length && !Object.keys(e.fields).length && (m = /^\*\*([A-Z][A-Z ]+)\*\*$/.exec(l))) { e.traits = m[1]; continue; }
    // "**Action** 1 AP" / "**Action** Reaction: **Trigger** …" / "**Prerequisites** Large Size"
    if (/^\*\*(Action|Trigger|Prerequisites|Area)\*\*/.test(l)) {
      for (const [, k, v] of l.matchAll(/\*\*(Action|Trigger|Prerequisites|Area)\*\*\s*([^*]*?)(?=;?\s*\*\*|$)/g)) e.fields[k] = plain(v).replace(/[;:]\s*$/, "");
      continue;
    }
    e.lines.push(plain(l));
  }
  return out;
}
const specials = entries(specialAt, featsAt);
const feats = entries(featsAt, vsAt);

/* ------------------------------------------------------------------ */
/* Dragon vs companion, High Magic, losing a dragon                     */
/* ------------------------------------------------------------------ */
const vs = [];
for (let n = vsAt + 1; n < highAt; n += 1) { const l = noImg(lines[n]); if (l) vs.push(plain(l)); }
const highMagic = { intro: "", bullets: [] };
for (let n = highAt + 1; n < losingAt; n += 1) {
  const l = noImg(lines[n]);
  if (!l) continue;
  if (/^-\s+/.test(l)) highMagic.bullets.push(plain(l.replace(/^-\s+/, "")));
  else highMagic.intro = plain(l);
}
const losing = { intro: [] };
let lcur = "intro";
for (let n = losingAt + 1; n < cEnd; n += 1) {
  const l = noImg(lines[n]);
  if (!l) continue;
  if (/^\*\*[A-Z][A-Z ]+\*\*$/.test(l)) { lcur = plain(l); losing[lcur] = []; continue; }
  losing[lcur].push(plain(l));
}

const out = { source: path.basename(source), tamer, rules, hpTable, table, format, dragons, specials, feats, vs, highMagic, losing };
fs.writeFileSync(path.join(ROOT, "tools", "content", "book-text-block10.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`book-text-block10.json: Dragon Tamer, ${Object.keys(rules).length - 1} rule headings, ${hpTable.length} HP rows, ${table.length} table rows, ${Object.keys(dragons).length} dragons, ${Object.keys(specials).length - 1} specials, ${Object.keys(feats).length - 1} feats, ${highMagic.bullets.length} High Magic lines, ${Object.keys(losing).length - 1} losing headings.`);
