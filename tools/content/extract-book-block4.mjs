#!/usr/bin/env node
/**
 * extract-book-block4 — the passages of the Inner Tempest sourcebook (v1.2)
 * that Block 4 transcribes (the Ghostwalker, the Kensai, the Oathblade, their
 * Ghost Arts, Combat Forms and Sworn Oaths, and the 28 class feats Graham's
 * ruling B4-1 brought in), cut from pandoc's markdown of the docx into
 * tools/content/book-text-block4.json.
 *
 *   node tools/content/extract-book-block4.mjs <it12.md>
 *
 * What it writes, for each item by name:
 *   sections[name]  { traits, lines } — the bold or plain trait line under its
 *                   heading, and its paragraphs as printed (images dropped)
 *   classes[name]   { type, description, keyAbilityScores, proficiencies,
 *                   classSkills, skillPoints, hitPoints }
 *   tables[name]    the class table's rows: [level, BAB, BDB, Fort, Ref, Will, Bonus Feats]
 *
 * The cutting is by the headings named below: a section runs from its
 * heading to the next one named, or to the class table, or to the next
 * chapter-level heading. Nothing is reworded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block4.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const plain = (s) => String(s).replace(/^#+\s*/, "").replace(/<[^>]+>/g, "").replace(/\*/g, "").replace(/\\/g, "").replace(/<sup>|<\/sup>/g, "").trim();
const norm = (s) => plain(s).toUpperCase().replace(/[’']/g, "'");

/** The first line in [from, to) whose plain text is the heading. */
function lineOf(heading, from = 0, to = lines.length) {
  const want = heading.toUpperCase().replace(/[’']/g, "'");
  for (let i = from; i < to; i += 1) if (norm(lines[i]) === want) return i;
  throw new Error(`heading not found: ${heading} (from line ${from + 1})`);
}

/** The words a trait line is made of. */
const TRAIT_WORDS = new Set(["FOCUS", "TECHNIQUE", "FLOURISH", "MOVEMENT", "MOVE", "CONCENTRATE", "MENTAL", "ATTACK", "MANIPULATE", "SHADOW",
  "TRANSLOCATION", "TELEPORTATION", "STANCE", "GHOSTWALKER", "KENSAI", "OATHBLADE", "DISCIPLE", "MYSTIC"]);
const isTraitLine = (s) => { const w = plain(s).split(/\s+/).filter(Boolean); return w.length > 0 && w.every((x) => TRAIT_WORDS.has(x)); };

/**
 * Cut the named sections out of [from, to): each runs to the next named
 * heading (or a stop line). The first trait line directly under a heading is
 * kept as its traits.
 */
function cut(names, from, to, stop = () => false) {
  const at = names.map((n) => [n, lineOf(n, from, to)]).sort((a, b) => a[1] - b[1]);
  const out = {};
  at.forEach(([name, start], k) => {
    let end = k + 1 < at.length ? at[k + 1][1] : to;
    for (let i = start + 1; i < end; i += 1) if (stop(lines[i])) { end = i; break; }
    const body = lines.slice(start + 1, end).map((l) => l.trim()).filter((l) => l && !/^<img/.test(l));
    let traits = "";
    if (body.length && isTraitLine(body[0])) traits = plain(body.shift());
    out[name] = { traits, lines: body };
  });
  return out;
}

const tableStop = (l) => /^\|/.test(l.trim());
const CH3 = lines.findIndex((l) => /^# CHAPTER 3\b/.test(l));
const CH4 = lines.findIndex((l) => /^# CHAPTER 4\b/.test(l));
const GW = lineOf("GHOSTWALKER", CH3, CH4), KS = lineOf("KENSAI", GW, CH4), MY = lineOf("MYSTIC", KS, CH4), OB = lineOf("OATHBLADE", MY, CH4);
const PATHS = lineOf("MONASTIC PATHS", OB, CH4);

/* ---------------- the classes ---------------- */

const INFO = ["CLASS TYPE", "DESCRIPTION", "KEY ABILITY SCORES", "PROFICIENCIES", "CLASS SKILLS", "SKILL POINTS", "HIT POINTS"];
function classInfo(from, to) {
  const s = cut(INFO, from, to, (l) => norm(l) === "CLASS ABILITIES");
  const one = (k) => s[k].lines.join("\n\n");
  return { type: one("CLASS TYPE"), description: one("DESCRIPTION"), keyAbilityScores: one("KEY ABILITY SCORES"), proficiencies: one("PROFICIENCIES"), classSkills: one("CLASS SKILLS"), skillPoints: one("SKILL POINTS"), hitPoints: one("HIT POINTS") };
}
function classTable(from, to) {
  const rows = [];
  for (let i = from; i < to; i += 1) {
    const cells = lines[i].split("|").map((c) => plain(c)).filter((c) => c !== "");
    if (cells.length >= 7 && /^\d+(st|nd|rd|th)$/.test(cells[0].replace(/\s/g, ""))) rows.push([parseInt(cells[0], 10), ...cells.slice(1, 7).map(Number)]);
  }
  return rows;
}

const classes = { Ghostwalker: classInfo(GW, KS), Kensai: classInfo(KS, MY), Oathblade: classInfo(OB, PATHS) };
const tables = { Ghostwalker: classTable(GW, KS), Kensai: classTable(KS, MY), Oathblade: classTable(OB, PATHS) };

/* ---------------- the class abilities, arts, forms and oaths ---------------- */

const GW_ARTS_START = lineOf("GHOST ARTS", lineOf("MAGICAL TRADITION", GW, KS), KS);
const sections = {
  ...cut(["GHOSTWALK", "UNSEEN ASSAULT", "VANISHING RETREAT", "GHOST ARTS", "BONUS FEATS", "MAGICAL TRADITION"], GW, GW_ARTS_START),
  ...prefix("Ghost Arts: ", cut(["GHOST ARTS"], GW_ARTS_START, GW_ARTS_START + 6)),
  ...cut(["FALSE FACE", "GHOST STEP", "HOLLOW BREATH", "MISDIRECTING WHISPER", "NO TRACE", "SILENT NEEDLES", "SMOKE VEIL", "SPIDER PATH",
    "FALLING SHADOW", "CALTROP BLOSSOM", "SHADOW DOUBLE", "VEILED BODY", "BODY OF MIST", "SHADOW PASSAGE", "EMPTY PRESENCE"], GW_ARTS_START + 1, KS, tableStop),
  ...prefix("Kensai: ", cut(["COMBAT FORM", "FLOW STRIKE", "CONSIDERED MIND", "WEAPON DISCIPLINE", "BONUS FEATS", "MAGICAL TRADITION", "COMBAT FORMS"], KS, lineOf("BLACK LOTUS", KS, MY))),
  ...cut(["BLACK LOTUS", "CRASHING TIDE", "DREAD WOLF", "ECHOING CRANE", "EMBER REAVER", "FLICKERING FLAME", "GHOST FOX", "GALE CUTTER", "IRON TORTOISE",
    "RISING PHOENIX", "STEEL VIPER", "STONE SERPENT"], KS, MY, tableStop),
  ...prefix("Oathblade: ", cut(["BONUS FEATS", "CHALLENGE", "SWORN OATH", "UNWAVERING PURPOSE", "OATHBLADE'S RESOLVE", "MAGICAL TRADITION", "SWORN OATHS"], OB, lineOf("OATH OF HONOUR", OB, PATHS))),
  ...cut(["OATH OF HONOUR", "OATH OF GUARDIANSHIP", "OATH OF VENGEANCE", "OATH OF FEALTY"], OB, PATHS, tableStop)
};
function prefix(p, obj) { return Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${p}${k}`, v])); }
// The Ghostwalker's own BONUS FEATS and MAGICAL TRADITION are kept under
// their class's name too, beside the Kensai's and the Oathblade's.
sections["Ghostwalker: BONUS FEATS"] = sections["BONUS FEATS"]; delete sections["BONUS FEATS"];
sections["Ghostwalker: MAGICAL TRADITION"] = sections["MAGICAL TRADITION"]; delete sections["MAGICAL TRADITION"];
sections["Ghostwalker: GHOST ARTS"] = sections["GHOST ARTS"]; delete sections["GHOST ARTS"];

/* ---------------- the 28 class feats (B4-1) ---------------- */

export const BLOCK4_FEAT_HEADINGS = ["AMBUSHER'S PATIENCE", "BETWEEN GLANCES", "BLENDED FORM", "CLAIM THE NEXT FOE", "DANCING LEAF", "DEFLECT ARROW",
  "DISCIPLINED FOLLOW-THROUGH", "DISTANT HONOUR", "ECHOED FORM", "EXTRA FORM", "EXTRA GHOST ART", "FLEETING SHADOW", "FLUID BLENDING", "FORM REVERSAL",
  "FORMAL DECLARATION", "FORMLESS CUT", "GHOST ART MASTERY", "GHOST BLADE", "GUARDED COMMITMENT", "PERFECT TEMPO", "SHADOW COUNTER", "SHADOWY STEP",
  "SHARED PURPOSE", "SHELTER UNDER OATH", "SMOKE EYES", "SOLITARY SUPREMACY", "UNPAID DEBT", "WALK THE EMPTY SPACE"];
const CF = lines.findIndex((l, i) => i > CH4 && /^## CLASS FEATS/.test(l));
const GF = lines.findIndex((l, i) => i > CF && /^## GENERAL FEATS/.test(l));
// Every feat heading in the section bounds its neighbours, so a feat runs
// only to the next feat of any kind: the all-caps line followed (after a
// blank) by a trait line or a Prerequisites/Action line.
const featHeadingLines = [];
for (let i = CF + 1; i < GF; i += 1) {
  const t = plain(lines[i]);
  if (!t || /[a-z]/.test(t) || t.length > 40 || isTraitLine(lines[i]) || /^(EXISTING FEATS|CLASS FEATS)$/.test(t)) continue;
  if (!/^[A-Z][A-Z'’ \-]+$/.test(t)) continue;
  featHeadingLines.push(i);
}
const feats = {};
for (const name of BLOCK4_FEAT_HEADINGS) {
  const start = featHeadingLines.find((i) => norm(lines[i]) === name);
  if (start === undefined) throw new Error(`feat heading not found: ${name}`);
  const end = featHeadingLines.find((i) => i > start) ?? GF;
  const body = lines.slice(start + 1, end).map((l) => l.trim()).filter((l) => l && !/^<img/.test(l)).map((l) => l.replace(/^<img[^>]*>/, ""));
  let traits = "";
  if (body.length && isTraitLine(body[0])) traits = plain(body.shift());
  feats[name] = { traits, lines: body };
}

const out = { source: path.basename(source), classes, tables, sections, feats };
fs.writeFileSync(path.join(ROOT, "tools", "content", "book-text-block4.json"), JSON.stringify(out, null, 1) + "\n");
console.log(`book-text-block4: ${Object.keys(classes).length} classes, ${Object.keys(sections).length} sections, ${Object.keys(feats).length} feats.`);
