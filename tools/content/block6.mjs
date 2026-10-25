/**
 * Inner Tempest — Block 6 (0.7.0): the fourteen class feats of Chapter 5
 * left after Blocks 3 and 4 (the eight Disciple and Mystic stances, Elemental
 * Fist, Inner Magic, Mystic Essence, Perfect Shot, Perfect Strike and
 * Stunning Fist), Drunken Stance's own action, and the core class feats the
 * book opens to the five classes (FC-55).
 *
 * As ruled on 24 October 2026 (B6-1 to B6-10, docs/INNER_TEMPEST_RULINGS_2026-10-24.md;
 * docs/INNER_TEMPEST_BLOCK6_AUDIT.md), on TRG Prime 3.670.0.
 *
 * THE PRINTED TEXT IS THE BOOK'S, read from tools/content/book-text-block6.json
 * (cut from the docx by tools/content/extract-book-block6.mjs), never retyped.
 * Each feat's description is that text followed by what TRG Prime does with
 * it.
 *
 * FLAGS under the system's scope (`flags.trg-prime`): `itAutomation` (which
 * Use acts), `classFeatAccess` (3.670.0; Inner Magic). A stance's own
 * declarations are made on its effect when it is entered
 * (module/block6-automations.mjs), so they last exactly as long as it does.
 */
import fs from "node:fs";
import { feat, ability } from "./builders.mjs";
import { md } from "./markdown.mjs";

const BOOK = JSON.parse(fs.readFileSync(new URL("./book-text-block6.json", import.meta.url), "utf8"));

/** The book's text for a feat as HTML: its trait line in bold, then each paragraph as printed. */
function printed(key) {
  const s = BOOK.feats[key];
  if (!s) throw new Error(`Block 6: the book has no feat "${key}"`);
  return [...(s.traits ? [md(`**${s.traits}**`)] : []), ...s.lines.map((l) => md(l))].join("\n");
}

/** "**Prerequisites** Devoted or Primal Monastic Path" (or unbolded, as Inner Magic prints it). */
function printedPrerequisites(key) {
  const line = (BOOK.feats[key]?.lines ?? []).find((l) => /^(\*\*)?Prerequisites(\*\*)?\s/.test(l)) ?? "";
  return line.replace(/^(\*\*)?Prerequisites(\*\*)?\s*/, "").trim();
}

const HOW = { auto: "Automated", partly: "Partly automated", manual: "Not automated" };
const CLASS = "Class";

/**
 * A class feat from the book. `traits` is written out (the book's trait line
 * runs class names together: "ZEN ARCHER" is one trait). `prerequisites` is
 * what the core's parser reads; where it differs from the book's line, the
 * book's is checked against `printedAs`.
 */
function F(name, { traits, prerequisites, printedAs, kind = "auto", how, flags = {}, grantedAbilities = "" }) {
  const key = name.toUpperCase().replace(/’/g, "'");
  const book = printedPrerequisites(key);
  if (book !== (printedAs ?? prerequisites)) throw new Error(`Block 6: ${name}'s prerequisites are "${book}" in the book`);
  const description = `${printed(key)}\n${md(`*${HOW[kind]}:* ${how}`)}`;
  return feat({ name, category: CLASS, traits, prerequisites, description, flags, grantedAbilities });
}

const STANCE = "Disciple, Mystic, Stance";
const STANCE_USE = "press Use to enter the stance: 1 AP, under the system's stance rules (one stance at a time, or two with Stance Mastery; Reactive Stance enters it free at initiative). It lasts until you enter another stance or delete its effect.";

const FEATS = [
  F("Crane Stance", { traits: STANCE, prerequisites: "Devoted or Primal Monastic Path",
    how: `${STANCE_USE} While in it: +2 circumstance to your DB, and +5 to High Jump and Long Jump checks (the book's "reduce the difficulty by 5", as a bonus of the same size). The Path is checked when you enter it.`,
    flags: { itAutomation: "craneStance" } }),
  F("Dragon Stance", { traits: STANCE, prerequisites: "Primal or Transcendent Monastic Path",
    how: `${STANCE_USE} While in it: +2 circumstance to your attack rolls; your unarmed attacks (fists, gauntlets, Monastic weapons) have the Sweep trait (Graham's B6-2); and on each Stride the first square of difficult terrain costs you nothing extra. The Path is checked when you enter it.`,
    flags: { itAutomation: "dragonStance" } }),
  F("Drunken Stance", { traits: STANCE, prerequisites: "Devoted or Primal Monastic Path",
    how: `${STANCE_USE} While in it: +2 circumstance to your DB, and **Drunken Strike** (added to your abilities) may be used: a melee Strike at −2 circumstance; if it deals damage, your attack total stands as a Feint check against the target's Feint DC, and the Feint's own result applies (Graham's B6-3). The Path is checked when you enter it.`,
    flags: { itAutomation: "drunkenStance" }, grantedAbilities: "Drunken Strike" }),
  F("Elemental Fist", { traits: "", prerequisites: "Inner Strike",
    how: "read by Inner Strike: its damage types gain electricity (with the Air trait), bludgeoning (Earth), fire (Fire) and cold (Water). The chosen element's trait is on your attacks while that Inner Strike lasts; change the type on its card, free, as before.",
    flags: {} }),
  F("Inner Magic", { traits: "", prerequisites: "Inner Discipline, Level 4, Non-Mystic",
    how: "press Use to choose a cantrip of your Monastic Path's tradition: it is added as an innate spell with the Focus trait, cast with your Path's ability. While you have this feat, feats with the Mystic trait are offered to you (Graham's B6-7).",
    flags: { itAutomation: "innerMagic", classFeatAccess: ["Mystic"] } }),
  F("Mantis Stance", { traits: STANCE, prerequisites: "",
    how: `${STANCE_USE} While in it: your unarmed attacks (fists, gauntlets, Monastic weapons) have the Deadly trait; +2 circumstance to Reflex saves; and the first Move action of each of your turns triggers no reactions (Graham's B6-4).`,
    flags: { itAutomation: "mantisStance" } }),
  F("Monkey Stance", { traits: STANCE, prerequisites: "",
    how: `${STANCE_USE} While in it: +2 circumstance to Acrobatics and Climbing checks and to High Jump and Long Jump checks, and a High Jump or Long Jump for 1 AP carries no +2 to its DC (Graham's B6-5).`,
    flags: { itAutomation: "monkeyStance" } }),
  F("Mystic Essence", { traits: "Mystic", prerequisites: "",
    how: "press Use to choose a spell of your Monastic Path's tradition whose base PP is no greater than your level: it is added as an innate spell with the Focus trait, cast with your Path's ability, and it takes your Metamagic feats (Graham's B6-8).",
    flags: { itAutomation: "mysticEssence" } }),
  F("Perfect Shot", { traits: "Archer, Attack, Flourish, Ranger, Zen Archer", prerequisites: "Dex +1, Wis +1, BAB +8", printedAs: "Dex 1, Wis 1, BAB +8",
    how: "press Use (2 AP): a ranged Strike with advantage, which counts as two attacks for your multiple attack penalty. Open to the Archer archetype and the Ranger now, and to the Zen Archer when Block 7 adds it (Graham's B6-10). The prerequisites are written as the system reads them (\"Dex +1, Wis +1\").",
    flags: { itAutomation: "perfectShot" } }),
  F("Perfect Strike", { traits: "Attack, Fighter, Flourish, Disciple", prerequisites: "Dex +1, Wis +1, BAB +8", printedAs: "Dex 1, Wis 1, BAB +8",
    how: "press Use (2 AP): a melee Strike with advantage, which counts as two attacks for your multiple attack penalty. The prerequisites are written as the system reads them (\"Dex +1, Wis +1\").",
    flags: { itAutomation: "perfectStrike" } }),
  F("Snake Stance", { traits: STANCE, prerequisites: "Inner Discipline, Devoted or Illuminator Monastic Path",
    how: `${STANCE_USE} While in it, when a creature misses you with a melee Strike you are asked whether to use your reaction for a melee Strike against it, at no multiple attack penalty. The reaction counts as an Attack reaction, so Battle Readiness's may take it (Graham's B6-9). The Path is checked when you enter it.`,
    flags: { itAutomation: "snakeStance" } }),
  F("Stunning Fist", { traits: "Disciple", prerequisites: "",
    how: "read by Flurry of Blows: when both of its Strikes were at one creature and either hit and dealt damage, that creature saves Fortitude against your Technique DC (10 + your Monastic Path's ability + your level; Graham's B6-6): stunned 1 on a Partial or Failure (a Partial is not a success), stunned 3 on a Fumble or Blunder. A Success or better has no effect.",
    flags: {} }),
  F("Tiger Stance", { traits: STANCE, prerequisites: "",
    how: `${STANCE_USE} While in it: your unarmed attacks (fists, gauntlets, Monastic weapons) deal slashing damage, without asking (Graham's B6-1); bleeding you inflict is increased by 1; and while your Speed is at least 20 feet your Step is 10 feet.`,
    flags: { itAutomation: "tigerStance" } }),
  F("Wolf Stance", { traits: STANCE, prerequisites: "",
    how: `${STANCE_USE} While in it: your unarmed attacks (fists, gauntlets, Monastic weapons) deal piercing damage, without asking (Graham's B6-1), and you have Pack Attack: +1d6 precision damage when at least two of your allies threaten the target.`,
    flags: { itAutomation: "wolfStance" } })
];

/* ------------------------------------------------------------------ */
/* Drunken Stance's own action                                          */
/* ------------------------------------------------------------------ */

const drunkenStrike = ability({
  name: "Drunken Strike", traits: "Attack, Flourish",
  description: [
    md("**ATTACK FLOURISH**"), md("**Action** 1 AP"),
    md("You make a melee attack against your target with a -2-circumstance penalty. If the attack inflicts damage, it is classed as a feint against your target using your total Attack Roll as the Feint DC."),
    md("*Automated:* press Use while in Drunken Stance: 1 AP and a melee Strike at −2 circumstance. If it deals damage, your attack total stands as your Feint check against the target's Feint DC (the higher of its Level DC and its Sense Motive DC, Hard), and the Feint's own result applies: a Success leaves the target flat-footed (Graham's B6-3).")
  ].join("\n"),
  flags: { itAutomation: "drunkenStrike" }
});
drunkenStrike.system.category = "Class";

export const BLOCK6_FEATS = FEATS;
export const BLOCK6_ABILITIES = [drunkenStrike];

/* ------------------------------------------------------------------ */
/* FC-55: the core class feats each class may also take                 */
/* ------------------------------------------------------------------ */

/**
 * The printed lists, as `registerFeatAccess("class", …)` takes them. "Accurate
 * Spell (applies to Mystic innate spells)" is the feat Accurate Spell (it
 * applies to every spell attack, innate ones included). "Metamagic Feats
 * where compatible with innate spells" is not one feat: every Metamagic feat
 * a Mystic may take is Adept-traited, and the Mystic is an Adept, so they
 * are open to it already; their use on its innate spells is 3.670.0's
 * `innateMetamagic` (B6-8).
 */
export function existingClassFeatAccess() {
  const out = {};
  const names = { DISCIPLE: "Disciple", GHOSTWALKER: "Ghostwalker", KENSAI: "Kensai", MYSTIC: "Mystic", OATHBLADE: "Oathblade" };
  for (const [key, line] of Object.entries(BOOK.existing)) {
    out[names[key]] = line.replace(/\.$/, "").replace(/ and /g, ", ").split(/,\s*/).map((s) => s.trim())
      .filter((s) => s && !/^Metamagic Feats/.test(s))
      .map((s) => s.replace(/\s*\(.*\)$/, ""));
  }
  return out;
}
