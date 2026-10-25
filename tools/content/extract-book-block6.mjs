#!/usr/bin/env node
/**
 * extract-book-block6 — the class feats of the Inner Tempest sourcebook
 * (v1.2, Chapter 5 "Class Feats") that Block 6 builds, and the lists of core
 * class feats each of the five classes may also take, cut from pandoc's
 * markdown of the docx into tools/content/book-text-block6.json.
 *
 *   node tools/content/extract-book-block6.mjs <it12.md>
 *
 * What it writes:
 *   intro          the section's opening paragraphs
 *   feats[NAME]    { traits, lines } for the fourteen Block 6 feats — the
 *                  bold trait line under the heading ("" where the book
 *                  prints none: Elemental Fist, Inner Magic), then every
 *                  paragraph as printed (images dropped). A feat's own
 *                  action (Drunken Stance's Drunken Strike) stays in its
 *                  lines.
 *   existing[CLASS] the printed list of core class feats, as one line
 *
 * THE HEADINGS ARE KNOWN, NOT GUESSED. The class-feat section is laid out
 * less regularly than the racial one (some feats print no trait line, some
 * trait lines are split over several bold runs, and a feat's own action has
 * an all-capitals heading too), so a feat runs from its own name to the next
 * of the section's 54 feat names. Nothing is reworded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block6.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const plain = (s) => String(s).replace(/^#+\s*/, "").replace(/<[^>]+>/g, "").replace(/\*/g, "").replace(/\\/g, "").replace(/’/g, "'").replace(/\s+/g, " ").trim();

/** The fourteen feats Block 6 builds. */
export const BLOCK6 = ["CRANE STANCE", "DRAGON STANCE", "DRUNKEN STANCE", "ELEMENTAL FIST", "INNER MAGIC", "MANTIS STANCE", "MONKEY STANCE",
  "MYSTIC ESSENCE", "PERFECT SHOT", "PERFECT STRIKE", "SNAKE STANCE", "STUNNING FIST", "TIGER STANCE", "WOLF STANCE"];
/** The forty shipped in Blocks 3 and 4: headings only, so the fourteen stop where the book's next feat starts. */
const SHIPPED = ["ABUNDANT STEP", "ACTION BEFORE THOUGHT", "AMBUSHER'S PATIENCE", "BETWEEN GLANCES", "BLENDED FORM", "BOUNDING STEP",
  "CLAIM THE NEXT FOE", "DANCING LEAF", "DEFLECT ARROW", "DISCIPLINED FOLLOW-THROUGH", "DISTANT HONOUR", "ECHOED FORM", "EXTRA FORM",
  "EXTRA GHOST ART", "FLEETING SHADOW", "FLUID BLENDING", "FORM REVERSAL", "FORMAL DECLARATION", "FORMLESS CUT", "GHOST ART MASTERY",
  "GHOST BLADE", "GUARDED COMMITMENT", "INNER BLAST", "INNER DISCIPLINE", "INNER INFUSION", "INNER MIND", "INNER RUSH", "INNER SIGHT",
  "INNER STAMINA", "INNER STRIKE", "PERFECT TEMPO", "SHADOW COUNTER", "SHADOWY STANCE", "SHADOWY STEP", "SHARED PURPOSE",
  "SHELTER UNDER OATH", "SMOKE EYES", "SOLITARY SUPREMACY", "UNPAID DEBT", "WALK THE EMPTY SPACE"];
const ALL = new Set([...BLOCK6, ...SHIPPED]);

const START = lines.findIndex((l) => /^## CLASS FEATS\s*$/.test(l));
const END = lines.findIndex((l, i) => i > START && /^## GENERAL FEATS\s*$/.test(l));
const EXISTING = lines.findIndex((l, i) => i > START && i < END && /^### EXISTING FEATS\s*$/.test(l));
if (START < 0 || END < 0 || EXISTING < 0) throw new Error("class feats section not found");

const headings = [];
for (let i = START + 1; i < EXISTING; i += 1) if (ALL.has(plain(lines[i])) && !/^\*\*/.test(lines[i].trim())) headings.push(i);
const named = headings.map((i) => plain(lines[i]));
const missing = [...ALL].filter((n) => !named.includes(n));
if (missing.length) throw new Error(`feat headings not found: ${missing.join(", ")}`);
if (new Set(named).size !== named.length) throw new Error("a feat heading appears twice");

const intro = [];
for (let i = START + 1; i < headings[0]; i += 1) { const t = lines[i].trim(); if (t && !/^<img/.test(t)) intro.push(t); }

const isTraitLine = (s) => /^\*\*[A-Z][A-Z \-]*\*\*(\s*\*\*[A-Z][A-Z \-]*\*\*)*$/.test(String(s).trim()) && !/^\*\*(Prerequisites|Action|Trigger)\b/.test(String(s).trim());

const feats = {};
headings.forEach((start, k) => {
  const name = plain(lines[start]);
  if (!BLOCK6.includes(name)) return;
  const end = k + 1 < headings.length ? headings[k + 1] : EXISTING;
  const body = lines.slice(start + 1, end).map((l) => l.trim().replace(/^<img[^>]*>/, "").trim()).filter((l) => l && !/^\|[-| ]+\|$/.test(l));
  const traits = body.length && isTraitLine(body[0]) ? plain(body.shift()) : "";
  feats[name] = { traits, lines: body };
});

const existing = {};
let cls = null;
for (let i = EXISTING + 1; i < END; i += 1) {
  const t = lines[i].trim();
  if (!t || /^The classes in this rulebook/.test(t)) continue;
  if (/^(DISCIPLE|GHOSTWALKER|KENSAI|MYSTIC|OATHBLADE)$/.test(t)) { cls = t; continue; }
  if (!cls) throw new Error(`existing-feats text before a class: ${t}`);
  existing[cls] = t;
}

const out = { source: path.basename(source), intro, feats, existing };
fs.writeFileSync(path.join(ROOT, "tools", "content", "book-text-block6.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`book-text-block6: ${Object.keys(feats).length} feats, ${Object.keys(existing).length} class lists.`);
