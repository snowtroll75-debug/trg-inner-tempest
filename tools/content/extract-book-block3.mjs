#!/usr/bin/env node
/**
 * extract-book-block3 — the passages of the Inner Tempest sourcebook (v1.2)
 * that Block 3 transcribes, cut from pandoc's markdown of the docx into
 * tools/content/book-text-block3.json, so tools/verify-block3.mjs can check
 * every item's printed text against the book without the book itself.
 *
 *   node tools/content/extract-book-block3.mjs <it12.md>
 *
 * What it writes:
 *   text       the passages Block 3 draws on (Chapter 3's classes and
 *              Monastic Paths, Chapter 5's class feats, Chapter 6's wealth,
 *              Chapter 7, Chapter 8), as printed
 *   sections   for each Block 3 item, the book's paragraphs for it (its own
 *              section; fields such as Prerequisites and a spell's Cast line
 *              are in `fields`, not here)
 *   fields     for each item, the labelled lines (Prerequisites, Tradition,
 *              Cast, Range, Area, Saving Throw, Duration…), the trait line,
 *              and a spell's PP from its heading
 *   tables     the two class tables and the five discipline tables, as rows
 *   classes    each class's Key Ability Scores, Proficiencies, Class Skills,
 *              Skill Points, Hit Points and Bonus Feats paragraphs
 *   wealth     Chapter 6's CLASS WEALTH table
 *
 * The cutting is by headings: a section runs from its heading to the next
 * heading. Nothing is reworded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block3.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const plain = (s) => String(s).replace(/^#+\s*/, "").replace(/<[^>]+>/g, "").replace(/\*/g, "").replace(/\\/g, "").trim();
/** A table cell: bold and markup gone, the escaped asterisk (a new spell) kept. */
const cell = (s) => String(s).replace(/<[^>]+>/g, "").replace(/\*\*/g, "").replace(/\\\*/g, "*").trim();
const isCaps = (s) => /^[A-Z][A-Z'’ \-]*[A-Z]$/.test(plain(s));

/** The line index of the first line at or after `from` whose plain text is `heading`. */
function lineOf(heading, from = 0, to = lines.length) {
  for (let i = from; i < to; i += 1) if (plain(lines[i]).toUpperCase() === heading.toUpperCase()) return i;
  throw new Error(`heading not found: ${heading} (from line ${from + 1})`);
}
/** The chapter headings ("# CHAPTER n …") bound each search. */
const chapter = (n) => lines.findIndex((l) => new RegExp(`^# CHAPTER ${n}\\b`).test(l));
const CH3 = chapter(3), CH4 = chapter(4), CH5 = chapter(5), CH6 = chapter(6), CH7 = chapter(7), CH8 = chapter(8);
const APPX = lines.findIndex((l) => /^## APPENDIX/.test(l));
// The "## " section headings (FEAT CATEGORIES also names them in bold).
const CLASS_FEATS = lines.findIndex((l, i) => i > CH5 && /^## CLASS FEATS/.test(l));
const GENERAL_FEATS = lines.findIndex((l, i) => i > CLASS_FEATS && /^## GENERAL FEATS/.test(l));

const text = [
  lines.slice(CH3, CH4).join("\n"),
  lines.slice(CH6, CH7).join("\n"),
  lines.slice(CLASS_FEATS, GENERAL_FEATS).join("\n"),
  lines.slice(CH7, APPX).join("\n")
].join("\n\n");

/** Trait words: a bold all-caps line made only of these is a trait line, not a heading. */
const TRAIT_WORDS = new Set(["FOCUS", "TECHNIQUE", "FLOURISH", "FLOURISHTECHNIQUE", "INSIGHT", "SHADOW", "DISCIPLE", "MYSTIC", "STANCE",
  "TELEPORTATION", "MOVE", "MOVEMENT", "FORCE", "SAVE", "ATTACK"]);
const isTraitLine = (s) => /^\*\*/.test(s.trim()) && plain(s).split(/\s+/).every((w) => TRAIT_WORDS.has(w));

const LABELS = ["Prerequisites", "Special Prerequisite", "Base Damage", "Trigger", "Tradition", "Cast", "Range", "Area", "Saving Throw", "Duration", "Targets", "Target", "Ability Score"];
/**
 * A labelled line: "**Prerequisites** Inner Discipline, Level 8" (once
 * printed without the bold: "Prerequisites Inner Discipline"). Returns each
 * [label, value] it carries — "**Saving Throw** Basic Fortitude; **Base
 * Damage** 1d10" carries two.
 */
function labelOf(line) {
  const t = line.trim();
  let m = /^\*\*([A-Za-z ]+?):?\*\*:?\s*(.*)$/.exec(t);
  if (!m || !LABELS.includes(m[1].trim())) {
    m = /^(Prerequisites)\s+(.*)$/.exec(t);
    if (!m) return null;
  }
  const out = [[m[1].trim(), ""]];
  for (const part of m[2].split(/;\s*/)) {
    const more = /^\*\*([A-Za-z ]+?):?\*\*:?\s*(.*)$/.exec(part.trim());
    if (more) out.push([more[1].trim(), more[2].trim()]);
    else out[out.length - 1][1] = [out[out.length - 1][1], part.trim()].filter(Boolean).join("; ");
  }
  return out;
}

/** A section's paragraphs and fields, from `start` (the heading) to the line before `end`. */
function cut(start, end, { spell = false } = {}) {
  const paras = [];
  const fields = {};
  for (let i = start + 1; i < end; i += 1) {
    const line = lines[i].trim();
    const line2 = line.replace(/^(<img [^>]+>\s*)+/, "");
    if (!line2 || /^#+\s*$/.test(line2) || /^\|/.test(line2)) continue;
    if (isTraitLine(line) && !fields.traits) { fields.traits = plain(line); continue; }
    const label = labelOf(line2);
    if (label) {
      for (const [k, v] of label) fields[k] = plain(v);
      continue;
    }
    paras.push(line2);
  }
  return { paras, fields };
}

/** The next heading after `i`: an all-caps line that is not a trait line, or a structural break. */
function nextHeading(i, limit, { spell = false } = {}) {
  for (let j = i + 1; j < limit; j += 1) {
    const l = lines[j].trim();
    if (!l) continue;
    if (/^#/.test(l)) return j;
    if (spell) { if (/^\*\*[A-Z][A-Z'’ ,\-]+ PP \d+\*\*$/.test(l)) return j; continue; }
    if (/^\|/.test(l)) return j;
    // GREATER MASTERY is part of the feat above it (Bounding Step, Inner
    // Sight, Inner Strike), not a heading of its own.
    if (plain(l) === "GREATER MASTERY") continue;
    if (isCaps(l) && !isTraitLine(l)) return j;
  }
  return limit;
}

const sections = {};
const fields = {};
function item(name, heading, from, to, opts = {}) {
  const start = lineOf(heading, from, to);
  const end = opts.until ? lineOf(opts.until, start + 1, to) : nextHeading(start, to, opts);
  const { paras, fields: f } = cut(start, end, opts);
  sections[name] = paras;
  fields[name] = f;
  return { start, end };
}

/* Chapter 3 — the two classes. */
const DISCIPLE = lineOf("DISCIPLE", CH3 + 1, CH4);
const GHOSTWALKER = lineOf("GHOSTWALKER", DISCIPLE, CH4);
const MYSTIC = lineOf("MYSTIC", GHOSTWALKER, CH4);
const OATHBLADE = lineOf("OATHBLADE", MYSTIC, CH4);
const PATHS_AT = lines.findIndex((l, i) => i > OATHBLADE && /MONASTIC PATHS$/.test(plain(l)));

const classes = {};
const tables = {};
function classBlock(name, from, to) {
  const field = (label) => {
    const at = lineOf(label, from, to);
    const out = [];
    for (let j = at + 1; j < to; j += 1) {
      const l = lines[j].trim();
      const text = l.replace(/^(<img [^>]+>\s*)+/, "");
      if (!text) continue;
      if (isCaps(text) || /^\|/.test(text)) break;
      out.push(text);
    }
    return out;
  };
  classes[name] = {
    classType: field("CLASS TYPE"), description: field("DESCRIPTION"), keyAbilityScores: field("KEY ABILITY SCORES"),
    proficiencies: field("PROFICIENCIES"), classSkills: field("CLASS SKILLS"), skillPoints: field("SKILL POINTS"),
    hitPoints: field("HIT POINTS"), bonusFeats: field("BONUS FEATS"), magicalTradition: field("MAGICAL TRADITION")
  };
  const tableAt = lines.findIndex((l, i) => i > from && i < to && new RegExp(`\\*\\*${name.toUpperCase()} TABLE\\*\\*`).test(l));
  const rows = [];
  for (let j = tableAt; j < to && /^\|/.test(lines[j].trim()); j += 1) {
    const cells = lines[j].split("|").slice(1, -1).map((c) => plain(c));
    if (/^\d+(st|nd|rd|th)$/.test(cells[0])) rows.push(cells.slice(1).map(Number));
  }
  tables[name] = rows;
}
classBlock("Disciple", DISCIPLE, GHOSTWALKER);
classBlock("Mystic", MYSTIC, OATHBLADE);

for (const [name, heading] of [["Powerful Fists", "POWERFUL FISTS"], ["Disciple's Dodge", "DISCIPLES DODGE"], ["Disciple's Resolve", "DISCIPLES RESOLVE"],
  ["Flurry of Blows", "FLURRY OF BLOWS"], ["Deep Focus", "DEEP FOCUS"], ["Monastic Path|Disciple", "MONASTIC PATH"], ["Incredible Movement", "INCREDIBLE MOVEMENT"]]) {
  item(name, heading, DISCIPLE, GHOSTWALKER);
}
for (const [name, heading] of [["Alter the Thread", "ALTER THE THREAD"], ["Mystical Discipline", "MYSTICAL DISCIPLINE"], ["Mystical Power", "MYSTICAL POWER"],
  ["Mystical Resolve", "MYSTICAL RESOLVE"], ["Monastic Path|Mystic", "MONASTIC PATH"]]) {
  item(name, heading, MYSTIC, OATHBLADE);
}
// The Mystical Disciplines' own introduction (Chapter 3): what every discipline gives.
{
  const at = lineOf("MYSTICAL DISCIPLINES", MYSTIC, OATHBLADE);
  const first = lineOf("INNER FLAME", at, OATHBLADE);
  sections["Mystical Disciplines"] = cut(at, first).paras;
}

/* The five disciplines and their special abilities. */
const DISCIPLINES = [["Inner Flame", "Flame Within", "FLAME WITHIN"], ["Dragon Soul", "Dragon's Pulse", "DRAGON’S PULSE"], ["Still Mind", "Centred Awareness", "CENTRED AWARENESS"],
  ["Starborn Flow", "Echoes Beyond", "ECHOES BEYOND"], ["Thousand Reflections", "Echo Form (Thousand Reflections)", "ECHO FORM"]];
for (const [i, [name, ability, abilityHeading]] of DISCIPLINES.entries()) {
  const start = lineOf(name.toUpperCase(), MYSTIC, OATHBLADE);
  const end = i + 1 < DISCIPLINES.length ? lineOf(DISCIPLINES[i + 1][0].toUpperCase(), start + 1, OATHBLADE) : OATHBLADE;
  const abilityAt = lineOf(abilityHeading, start, end);
  const spellsAt = lineOf("ADDITIONAL SPELLS", abilityAt, end);
  sections[ability] = cut(abilityAt, spellsAt).paras;
  fields[ability] = cut(abilityAt, spellsAt).fields;
  // The discipline: its motto and text, "SPECIAL ABILITY", and the paragraph above its table.
  const before = cut(start, abilityAt).paras;
  const after = cut(spellsAt - 1, end).paras;
  sections[name] = [...before, ...after];
  const rows = [];
  for (let j = spellsAt; j < end; j += 1) {
    const l = lines[j].trim();
    if (!/^\|/.test(l)) continue;
    const cells = l.split("|").slice(1, -1).map(cell);
    const m = /^(\d+)(st|nd|rd|th)$/.exec(cells[0]);
    if (m) rows.push([Number(m[1]), cells[1]]);
  }
  tables[name] = rows;
}

/* The four Monastic Paths: Chapter 3's two paragraphs, Chapter 7's line. */
const OTHER = lineOf("OTHER CLASSES", PATHS_AT, CH4);
const CH7_PATHS = lineOf("THE MONASTIC PATHS", CH7, CH8);
const CH7_END = lineOf("FOCUS & MAGIC", CH7_PATHS, CH8);
for (const [i, name] of ["Devoted", "Illuminator", "Primal", "Transcendent"].entries()) {
  const at = lineOf(name.toUpperCase(), PATHS_AT, OTHER);
  const next = i < 3 ? lineOf(["Illuminator", "Primal", "Transcendent"][i].toUpperCase(), at + 1, OTHER) : OTHER;
  const seven = lineOf(name.toUpperCase(), CH7_PATHS, CH7_END);
  const sevenEnd = i < 3 ? lineOf(["Illuminator", "Primal", "Transcendent"][i].toUpperCase(), seven + 1, CH7_END) : CH7_END;
  const ch7 = cut(seven, sevenEnd);
  sections[name] = [...cut(at, next).paras, ...ch7.paras];
  fields[name] = ch7.fields;
}

/* Chapter 5 — Inner Discipline, its three techniques, the eleven Technique feats. */
for (const name of ["Inner Discipline", "Abundant Step", "Action Before Thought", "Bounding Step", "Inner Blast", "Inner Infusion",
  "Inner Mind", "Inner Rush", "Inner Sight", "Inner Stamina", "Inner Strike", "Shadowy Stance"]) {
  item(name, name.toUpperCase(), CLASS_FEATS, GENERAL_FEATS);
}
for (const t of ["Disciplined Flurry", "Burst Step", "Guarded Centre"]) {
  const line = sections["Inner Discipline"].find((p) => plain(p).startsWith(`- ${t} -`) || plain(p).startsWith(`${t} -`));
  if (!line) throw new Error(`Inner Discipline lists no ${t}`);
  sections[t] = [plain(line).replace(new RegExp(`^-?\\s*${t}\\s*-\\s*`), "")];
}

/* Chapter 8 — the eleven spells. */
for (const name of ["Air Step", "Aura of Heat", "Breath of the Dragon", "Burning Stride", "Burst of Speed", "Dragon Fear", "Hand of Tide",
  "Reflective Mind", "Rise of the Phoenix", "Serene Defence", "Timeless Motion"]) {
  const at = lines.findIndex((l, i) => i > CH8 && new RegExp(`^\\*\\*${name.toUpperCase().replace(/ /g, "\\s+")} PP (\\d+)\\*\\*$`).test(l.trim()));
  if (at < 0) throw new Error(`spell not found: ${name}`);
  const pp = Number(/PP (\d+)/.exec(lines[at])[1]);
  const end = nextHeading(at, APPX, { spell: true });
  const { paras, fields: f } = cut(at, end, { spell: true });
  // A spell's trait line is its first bold all-caps line.
  const traitLine = lines.slice(at + 1, end).map((l) => l.trim()).find((l) => /^\*\*[A-Z ]+\*\*$/.test(l));
  sections[name] = paras.filter((p) => p !== traitLine);
  fields[name] = { ...f, pp, traits: traitLine ? plain(traitLine) : "" };
}

/* Chapter 6 — the CLASS WEALTH table. */
const wealth = {};
{
  const at = lines.findIndex((l, i) => i > CH6 && /\*\*CLASS WEALTH\*\*/.test(l));
  for (let j = at; j < CH7 && /^\|/.test(lines[j].trim()); j += 1) {
    const cells = lines[j].split("|").slice(1, -1).map(cell);
    for (let k = 0; k + 1 < cells.length; k += 2) if (/^-?\d+$/.test(cells[k + 1])) wealth[cells[k]] = Number(cells[k + 1]);
  }
}

const out = { source: "Inner Tempest v1.2 (pandoc markdown of TRG_Inner_Tempest_1_2.docx)", text, sections, fields, tables, classes, wealth };
const file = path.join(ROOT, "tools", "content", "book-text-block3.json");
fs.writeFileSync(file, `${JSON.stringify(out, null, 1)}\n`);
console.log(`wrote ${path.relative(ROOT, file)}: ${Object.keys(sections).length} sections, ${Object.keys(tables).length} tables`);
