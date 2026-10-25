#!/usr/bin/env node
/**
 * extract-book-block7 — the archetype feats of the Inner Tempest sourcebook
 * (v1.2, Chapter 5 "Archetype Feats") that Block 7 builds, and the core
 * archetypes each of the five classes may also take, cut from pandoc's
 * markdown of the docx into tools/content/book-text-block7.json.
 *
 *   node tools/content/extract-book-block7.mjs <it12.md>
 *
 * What it writes:
 *   intro             the section's opening paragraph
 *   archetypes[NAME]  { traits, prerequisites, special, progression, lines }
 *                     traits: the class-trait line under the heading ("" where
 *                     the book prints none: Brawler, Dragon Tamer, Inner Adept,
 *                     Shadowdancer, Tanuki Trickster, Way of the Geisha);
 *                     prerequisites / special / progression: the text after
 *                     the bold label ("" when not printed); lines: every
 *                     paragraph after the trait line, as printed, abilities
 *                     and their headings included.
 *   abilities[NAME]   { archetype, traits, lines } for the nine named
 *                     abilities printed inside an archetype (Powerful Fists,
 *                     Twin Dragon, Drawn Verdict, Restorative Palm, Night
 *                     Lotus Venom, Bound Challenge, Wandering Creed, Turning
 *                     the Blade, Soul-Bound Weapon): the trait line under the
 *                     heading ("" where none is printed) and every paragraph up
 *                     to the next ability, the progression line, or the end.
 *   existing[CLASSES] the printed list of core archetypes, as one line,
 *                     keyed as printed ("DISCIPLE/GHOSTWALKER")
 *
 * THE HEADINGS ARE KNOWN, NOT GUESSED: an archetype runs from its own name to
 * the next of the section's 21 names. One heading is joined to its trait line
 * in the docx itself ("VEILBORN" and "GHOSTWALKER" are runs of one
 * paragraph, which pandoc prints as "VEILBORNGHOSTWALKER"); it is split back
 * into the name and its trait. Nothing is reworded.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = process.argv[2];
if (!source) { console.error("usage: node tools/content/extract-book-block7.mjs <it12.md>"); process.exit(2); }
const lines = fs.readFileSync(source, "utf8").split("\n");

const plain = (s) => String(s).replace(/^#+\s*/, "").replace(/<[^>]+>/g, "").replace(/\*/g, "").replace(/\\/g, "").replace(/’/g, "'").replace(/\s+/g, " ").trim();

/** The 21 archetypes, in the book's order. */
export const BLOCK7 = ["BRAWLER", "DRAGON TAMER", "FORMBINDER", "HARMONY WARDEN", "IAIJUTSU MASTER", "INNER ADEPT", "JADE PHYSICIAN",
  "LOTUS ENCHANTER", "NIGHT LOTUS", "OATHBOUND", "ONMYOJI NECROMANCER", "RONIN", "SHADOWDANCER", "SHUGENJA", "SOUL WEAPON MASTER",
  "STEEL DISCIPLE", "TANUKI TRICKSTER", "TWIN PATH", "VEILBORN", "WAY OF THE GEISHA", "ZEN ARCHER"];
/** The nine abilities printed inside them, with the archetype that prints each. */
export const ABILITIES = {
  "POWERFUL FISTS": "BRAWLER", "TWIN DRAGON": "FORMBINDER", "DRAWN VERDICT": "IAIJUTSU MASTER", "RESTORATIVE PALM": "JADE PHYSICIAN",
  "NIGHT LOTUS VENOM": "NIGHT LOTUS", "BOUND CHALLENGE": "OATHBOUND", "WANDERING CREED": "RONIN", "TURNING THE BLADE": "RONIN",
  "SOUL-BOUND WEAPON": "SOUL WEAPON MASTER",
};
/** The class traits an archetype may print under its name. */
const CLASS_TRAITS = new Set(["ADEPT", "DISCIPLE", "EXPERT", "GHOSTWALKER", "KENSAI", "MARTIAL", "MYSTIC", "OATHBLADE"]);
const JOINED = { VEILBORNGHOSTWALKER: ["VEILBORN", "GHOSTWALKER"] };

const START = lines.findIndex((l) => /^## ARCHETYPE FEATS\s*$/.test(l));
const END = lines.findIndex((l, i) => i > START && /^## CLASS FEATS\s*$/.test(l));
const EXISTING = lines.findIndex((l, i) => i > START && i < END && /^### EXISTING FEATS\s*$/.test(l));
if (START < 0 || END < 0 || EXISTING < 0) throw new Error("archetype feats section not found");

const cleaned = (i) => lines[i].trim().replace(/<img[^>]*>/g, "").trim();
const headings = [];
for (let i = START + 1; i < EXISTING; i += 1) {
  const p = plain(cleaned(i));
  if (BLOCK7.includes(p) || JOINED[p]) headings.push(i);
}
const named = headings.map((i) => JOINED[plain(cleaned(i))]?.[0] ?? plain(cleaned(i)));
const missing = BLOCK7.filter((n) => !named.includes(n));
if (missing.length) throw new Error(`archetype headings not found: ${missing.join(", ")}`);
if (new Set(named).size !== named.length) throw new Error("an archetype heading appears twice");
if (named.join("|") !== BLOCK7.join("|")) throw new Error(`archetypes out of the book's order: ${named.join(", ")}`);

const intro = [];
for (let i = START + 1; i < headings[0]; i += 1) { const t = cleaned(i); if (t) intro.push(t); }

const isClassTraitLine = (s) => { const words = plain(s).split(" "); return words.length > 0 && words.every((w) => CLASS_TRAITS.has(w)); };
const isAbilityTraitLine = (s) => /^[A-Z][A-Z ]+$/.test(plain(s)) && !ABILITIES[plain(s)] && !BLOCK7.includes(plain(s));
const labelled = (body, label) => {
  const row = body.find((l) => new RegExp(`^\\*\\*${label}\\*\\*`).test(l));
  return row ? plain(row.replace(new RegExp(`^\\*\\*${label}\\*\\*`), "")) : "";
};

const archetypes = {};
const abilities = {};
headings.forEach((start, k) => {
  const head = plain(cleaned(start));
  const [name, joinedTrait] = JOINED[head] ?? [head, null];
  const end = k + 1 < headings.length ? headings[k + 1] : EXISTING;
  const body = [];
  for (let i = start + 1; i < end; i += 1) { const t = cleaned(i); if (t && !/^\|[-| ]+\|$/.test(t)) body.push(t); }
  let traits = joinedTrait ?? "";
  if (!traits && body.length && isClassTraitLine(body[0])) traits = plain(body.shift());
  archetypes[name] = {
    traits,
    prerequisites: labelled(body, "Prerequisites"),
    special: labelled(body, "Special Prerequisite"),
    progression: labelled(body, "Progression Requirements"),
    lines: body,
  };
  // The abilities inside this archetype.
  const starts = body.map((l, i) => (ABILITIES[plain(l)] === name ? i : -1)).filter((i) => i >= 0);
  starts.forEach((s, j) => {
    const abilityName = plain(body[s]);
    let e = j + 1 < starts.length ? starts[j + 1] : body.length;
    const prog = body.findIndex((l, i) => i > s && /^\*\*Progression Requirements\*\*/.test(l));
    if (prog >= 0 && prog < e) e = prog;
    const own = body.slice(s + 1, e);
    const abilityTraits = own.length && isAbilityTraitLine(own[0]) && !/^\*\*/.test(own[0]) ? plain(own.shift()) : "";
    abilities[abilityName] = { archetype: name, traits: abilityTraits, lines: own };
  });
});
const missingAbilities = Object.keys(ABILITIES).filter((n) => !abilities[n]);
if (missingAbilities.length) throw new Error(`ability headings not found: ${missingAbilities.join(", ")}`);

const existing = {};
let cls = null;
for (let i = EXISTING + 1; i < END; i += 1) {
  const t = cleaned(i);
  if (!t || /^The classes in this sourcebook/.test(t)) continue;
  if (/^[A-Z]+(\/[A-Z]+)*$/.test(t)) { cls = t; continue; }
  if (!cls) throw new Error(`existing-archetype text before a class: ${t}`);
  existing[cls] = t;
}

const out = { source: path.basename(source), intro, archetypes, abilities, existing };
fs.writeFileSync(path.join(ROOT, "tools", "content", "book-text-block7.json"), `${JSON.stringify(out, null, 1)}\n`);
console.log(`book-text-block7: ${Object.keys(archetypes).length} archetypes, ${Object.keys(abilities).length} abilities, ${Object.keys(existing).length} class lists.`);
