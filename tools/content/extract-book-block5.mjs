#!/usr/bin/env node
/**
 * extract-book-block5 — the racial feats of the Inner Tempest sourcebook
 * (v1.2, Chapter 5), and the list of core racial feats each race may also
 * take, cut from pandoc's markdown of the docx into
 * tools/content/book-text-block5.json.
 *
 *   node tools/content/extract-book-block5.mjs <it12.md>
 *
 * What it writes:
 *   intro          the section's opening paragraph
 *   feats[NAME]    { traits, lines } — the bold trait line under the heading,
 *                  then every paragraph as printed (images dropped; a table
 *                  is kept as its markdown rows)
 *   existing[RACE] the printed list of core racial feats, as one line
 *
 * A feat runs from its all-capitals heading to the next one. Nothing is
 * reworded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block5.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const plain = (s) => String(s).replace(/^#+\s*/, "").replace(/<[^>]+>/g, "").replace(/\*/g, "").replace(/\\/g, "").trim();

const TRAIT_WORDS = new Set(["HUMAN", "KORNARGON", "MIRAKU", "RYUKARI", "SCREE", "TIANZHI", "ARCANE", "ETHEREAL", "LIGHT", "SAVE", "MORPH", "CHANCE",
  "DEFENCE", "POISON", "FIRE", "WATER", "COLD", "AUDITORY", "EMOTION", "FEAR", "ATTACK", "MOVEMENT", "FOCUS", "TECHNIQUE"]);
const isTraitLine = (s) => /^\*\*[^*]+\*\*$/.test(String(s).trim()) && plain(s).split(/\s+/).every((w) => TRAIT_WORDS.has(w));

const START = lines.findIndex((l) => /^## RACIAL FEATS\s*$/.test(l));
const END = lines.findIndex((l, i) => i > START && /^## ARCHETYPE FEATS\s*$/.test(l));
const EXISTING = lines.findIndex((l, i) => i > START && i < END && l.trim() === "**EXISTING FEATS**");
if (START < 0 || END < 0 || EXISTING < 0) throw new Error("racial feats section not found");

// A heading: a plain all-capitals line whose next non-blank line is a trait line.
const nextText = (i) => { for (let j = i + 1; j < END; j += 1) if (lines[j].trim() && !/^<img[^>]*>$/.test(lines[j].trim())) return lines[j]; return ""; };
const headings = [];
for (let i = START + 1; i < EXISTING; i += 1) {
  const t = lines[i].trim();
  if (/^[A-Z][A-Z'’ \-]+$/.test(t) && isTraitLine(nextText(i))) headings.push(i);
}

const intro = [];
for (let i = START + 1; i < headings[0]; i += 1) { const t = lines[i].trim(); if (t && !/^<img/.test(t)) intro.push(t); }

const feats = {};
headings.forEach((start, k) => {
  const end = k + 1 < headings.length ? headings[k + 1] : EXISTING;
  const body = lines.slice(start + 1, end).map((l) => l.trim().replace(/^<img[^>]*>/, "").trim()).filter((l) => l && !/^\|[-| ]+\|$/.test(l));
  const traits = plain(body.shift());
  const name = lines[start].trim().replace(/’/g, "'");
  if (feats[name]) throw new Error(`duplicate feat heading ${name}`);
  feats[name] = { traits, lines: body };
});

const existing = {};
let race = null;
for (let i = EXISTING + 1; i < END; i += 1) {
  const t = lines[i].trim();
  if (!t || /^The following racial feats/.test(t)) continue;
  if (/^(MIRAKU|RYUKARI|SCREE|TIANZHI)$/.test(t)) { race = t; continue; }
  if (!race) throw new Error(`existing-feats text before a race: ${t}`);
  existing[race] = t;
}

const out = { source: path.basename(source), intro, feats, existing };
fs.writeFileSync(path.join(ROOT, "tools", "content", "book-text-block5.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`book-text-block5: ${Object.keys(feats).length} feats, ${Object.keys(existing).length} race lists.`);
