#!/usr/bin/env node
/**
 * extract-book-block8 — the thirteen Grimoire spells (Chapter 8) Block 8
 * builds, cut from pandoc's markdown of the v1.2 docx into
 * tools/content/book-text-block8.json, so tools/verify-block8.mjs can check
 * every spell's printed text against the book without the book itself.
 *
 *   node tools/content/extract-book-block8.mjs <it12.md>
 *
 * What it writes, per spell:
 *   pp        the PP from its heading
 *   traits    its trait line (the category word, SAVE, UTILITY or ATTACK,
 *             included, as printed)
 *   fields    the labelled lines (Tradition, Cast, Range, Targets, Area,
 *             Saving Throw, Base Damage, Duration)
 *   lines     every other paragraph, in order: the text, the outcome
 *             ladder and the warping options
 *
 * A spell runs from its heading ("**NAME PP n**") to the next one. Nothing
 * is reworded; image tags are dropped.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block8.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

export const BLOCK8 = Object.freeze(["Ability Inversion", "Acidic Touch", "Age Resistance", "Arrows Flight", "Boundless Vision", "Disrupt Soul",
  "False Future", "Flowing Step", "Foretell Failure", "Root", "Skyborne Pathways", "Spiritual Distraction", "Tranquil Mastery"]);

const plain = (s) => String(s).replace(/^#+\s*/, "").replace(/<[^>]+>/g, "").replace(/\*/g, "").replace(/\\/g, "").trim();
const CH8 = lines.findIndex((l) => /^# CHAPTER 8\b/.test(l));
const CH9 = lines.findIndex((l, i) => i > CH8 && /CHAPTER 9/.test(l));
const HEADING = /^\*\*([A-Z][A-Z'’ ,\-]+) PP (\d+)\*\*$/;
const LABELS = ["Tradition", "Cast", "Range", "Targets", "Target", "Area", "Saving Throw", "Base Damage", "Duration", "Trigger"];

/** "**Range** touch; Target up to 30 projectiles" carries two labels; the second may be unbolded. */
function labelled(line) {
  const t = line.trim();
  const m = /^\*\*([A-Za-z ]+?)\*\*\s*(.*)$/.exec(t);
  if (!m || !LABELS.includes(m[1].trim())) return null;
  const out = [[m[1].trim(), ""]];
  for (const part of m[2].split(/;\s*/)) {
    const more = /^\*\*([A-Za-z ]+?)\*\*\s*(.*)$/.exec(part.trim()) ?? /^(Targets?)\s+(.*)$/.exec(part.trim());
    if (more && LABELS.includes(more[1].trim())) out.push([more[1].trim(), more[2].trim()]);
    else out[out.length - 1][1] = [out[out.length - 1][1], part.trim()].filter(Boolean).join("; ");
  }
  return out.map(([k, v]) => [k, plain(v)]);
}

const spells = {};
for (const name of BLOCK8) {
  const want = name.toUpperCase();
  const at = lines.findIndex((l, i) => i > CH8 && i < CH9 && HEADING.exec(l.trim())?.[1] === want);
  if (at < 0) throw new Error(`spell not found: ${name}`);
  const pp = Number(HEADING.exec(lines[at].trim())[2]);
  let end = lines.findIndex((l, i) => i > at && (HEADING.test(l.trim()) || i >= CH9));
  if (end < 0) end = CH9;
  let traits = "";
  const fields = {};
  const body = [];
  for (let i = at + 1; i < end; i += 1) {
    const raw = lines[i].trim().replace(/^(<img [^>]+>\s*)+/, "");
    if (!raw) continue;
    if (!traits && /^\*\*[A-Z ]+\*\*$/.test(raw)) { traits = plain(raw); continue; }
    const lab = labelled(raw);
    if (lab) { for (const [k, v] of lab) fields[k] = v; continue; }
    body.push(raw);
  }
  spells[name] = { pp, traits, fields, lines: body };
}

const out = { source: "Inner Tempest v1.2 (pandoc markdown of TRG_Inner_Tempest_1_2.docx), Chapter 8", spells };
const file = path.join(ROOT, "tools", "content", "book-text-block8.json");
fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
console.log(`wrote ${path.relative(ROOT, file)}: ${Object.keys(spells).length} spells`);
