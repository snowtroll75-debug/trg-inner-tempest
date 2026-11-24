#!/usr/bin/env node
/**
 * extract-book-block11 — the nine Gymnast expansion feats of the Inner
 * Tempest sourcebook (v1.4, Chapter 5 "Class Feats"), cut from pandoc's
 * markdown of the docx into tools/content/book-text-block11.json.
 *
 *   pandoc TRG_Inner_Tempest_1_4.docx -t markdown --wrap=none -o it14.md
 *   node tools/content/extract-book-block11.mjs <it14.md>
 *
 * What it writes:
 *   feats[NAME]  { traits, flavour, lines } for the nine feats: the trait
 *                line under the heading (v1.4 prints it in plain capitals,
 *                not bold), the italic flavour line, then every paragraph as
 *                printed (bullets kept as "- ").
 *
 * Graham, 24 November 2026: "use the updated 1.4 rules as law". The nine
 * sit alphabetically among the class feats, Vaulting Momentum (GENERAL
 * GYMNAST) included. A feat runs from its own heading to the next line that
 * is a heading (a line of capitals alone, not bold). Nothing is reworded:
 * pandoc's "---" is the em dash the book prints, and its stray space before
 * an apostrophe (a run break in the docx) is closed up.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block11.mjs <it14.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

/** The nine, as the book heads them. */
export const BLOCK11 = ["EFFORTLESS MOTION", "OFFENSIVE MOMENTUM", "PERFECT BALANCE", "PINNACLE OF MOTION", "REBOUND ASSAULT",
  "REDIRECTION STANCE", "TUMBLING REVERSAL", "VAULTING MOMENTUM", "WHIRLWIND KIP"];

/** pandoc's text, as the book prints it. */
const tidy = (s) => String(s).trim()
  .replace(/---/g, "—")
  .replace(/(\w) '(s|t|ve|re|ll|d|m)\b/g, "$1'$2")
  .replace(/’/g, "'");

const START = lines.findIndex((l) => /^## CLASS FEATS\s*$/.test(l));
const END = lines.findIndex((l, i) => i > START && /^## GENERAL FEATS\s*$/.test(l));
if (START < 0 || END < 0) throw new Error("class feats section not found");

/** A heading: a line of capitals alone, not bold and not a list item. */
const isHeading = (s) => /^[A-Z][A-Z' \-]{2,}$/.test(String(s).trim());

const feats = {};
for (const name of BLOCK11) {
  const at = lines.findIndex((l, i) => i > START && i < END && l.trim() === name);
  if (at < 0) throw new Error(`feat heading not found: ${name}`);
  if (lines.findIndex((l, i) => i > at && i < END && l.trim() === name) >= 0) throw new Error(`${name} is headed twice`);
  const body = [];
  let i = at + 1;
  // The trait line: the first non-blank line, capitals alone.
  while (i < END && !lines[i].trim()) i += 1;
  if (!isHeading(lines[i])) throw new Error(`${name}: no trait line`);
  const traits = lines[i].trim();
  i += 1;
  for (; i < END; i += 1) {
    const t = lines[i].trim();
    if (!t) continue;
    if (isHeading(t)) break;
    body.push(tidy(t.replace(/^-\s+/, "- ").replace(/^!\[[^\]]*\]\([^)]*\)(\{[^}]*\})?\s*/, "")));
  }
  const flavour = /^\*[^*].*\*$/.test(body[0] ?? "") ? body.shift().replace(/^\*|\*$/g, "") : "";
  feats[name] = { traits, flavour, lines: body.filter(Boolean) };
}

const out = { source: `Inner Tempest v1.4 (pandoc markdown of TRG_Inner_Tempest_1_4.docx; ${path.basename(source)})`, feats };
fs.writeFileSync(path.join(ROOT, "tools", "content", "book-text-block11.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`book-text-block11: ${Object.keys(feats).length} feats.`);
