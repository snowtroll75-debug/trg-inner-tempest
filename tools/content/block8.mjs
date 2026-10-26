/**
 * Inner Tempest — Block 8 (0.9.0): the Grimoire's other thirteen spells
 * (Chapter 8), and three of Block 3's spells finished (B8-9).
 *
 * As ruled on 26 October 2026 (B8-1 to B8-9, docs/INNER_TEMPEST_RULINGS_2026-10-26.md;
 * docs/INNER_TEMPEST_BLOCK8_AUDIT.md), on TRG Prime 3.672.0.
 *
 * THE PRINTED TEXT IS THE BOOK'S, read from tools/content/book-text-block8.json
 * (cut from the docx by tools/content/extract-book-block8.mjs), never retyped:
 * the trait line, the labelled lines (Tradition, Cast, Range …) and every
 * paragraph, then what TRG Prime does with it.
 *
 * THE SYSTEM'S ROWS (3.672.0): `abilitySwap` (Ability Inversion, C1), a strike
 * rider's save ladder at the caster's DC (Acidic Touch, C2), `moduleMark`
 * with `saveAtCast: false` (Spiritual Distraction, Disrupt Soul, Age
 * Resistance; C6), declared `creatureAbility` (Boundless Vision, C4),
 * `ignoresDifficultTerrain` (Flowing Step, C9), `foretell` (Foretell Failure,
 * C8), `refocusExtra` (Tranquil Mastery, C7), `defenceDC` with a capped warp
 * and a declared tick that grows with it (Root, C12/C13). The module's own
 * flag: `itSpell`, which of module/block8-automations.mjs's handlers a cast
 * reaches.
 */
import fs from "node:fs";
import { spell } from "./builders.mjs";
import { md } from "./markdown.mjs";

const BOOK = JSON.parse(fs.readFileSync(new URL("./book-text-block8.json", import.meta.url), "utf8"));

const HOW = { auto: "Automated", partly: "Partly automated", manual: "Not automated" };
/** The book's categories, which are the spell's `category` and not a trait. */
const CATEGORIES = Object.freeze(["SAVE", "UTILITY", "ATTACK"]);
/** "all" on the Tradition line is the four traditions, as the core writes it. */
const ALL_TRADITIONS = "arcane, divinity, ethereal, verdant";
/** The order the book's labelled lines are printed in. */
const FIELD_ORDER = Object.freeze(["Tradition", "Cast", "Range", "Targets", "Target", "Area", "Saving Throw", "Base Damage", "Duration"]);

const SC = { somatic: true, verbal: true, material: false, focus: false };
const V = { somatic: false, verbal: true, material: false, focus: false };
const NONE = { somatic: false, verbal: false, material: false, focus: false };

/** The book's entry for a spell. */
export function bookSpell(name) {
  const s = BOOK.spells[name];
  if (!s) throw new Error(`Block 8: the book has no spell "${name}"`);
  return s;
}

/** "ACID INVOCATION SAVE" → { category: "save", traits: "Acid, Invocation" }. */
export function splitTraitLine(line) {
  const words = String(line ?? "").split(/\s+/).filter(Boolean);
  const category = words.find((w) => CATEGORIES.includes(w)) ?? "";
  const traits = words.filter((w) => w !== category).map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(", ");
  return { category: category.toLowerCase(), traits };
}

/** The book's text as HTML: the trait line, the labelled lines, every paragraph. */
export function printedSpell(name) {
  const s = bookSpell(name);
  const fields = FIELD_ORDER.filter((k) => s.fields[k]).map((k) => `**${k}** ${s.fields[k]}`).join("; ");
  return [md(`**${s.traits}**`), ...(fields ? [md(fields)] : []), ...s.lines.map((l) => md(l))].join("\n");
}

/**
 * A Grimoire spell from the book: its PP, category, traits and tradition
 * read from the book and refused when the authored row disagrees; the
 * description is the printed text and then what TRG Prime does.
 */
function G(name, { kind = "auto", how, castAP, range = "", targets = "", area = "", duration = "", defence = "", components = SC,
  effects = [], warps = [], sustained = false, sustainType = "", baseDamage = "", flags = {} }) {
  const s = bookSpell(name);
  const { category, traits } = splitTraitLine(s.traits);
  const tradition = s.fields.Tradition === "all" ? ALL_TRADITIONS : s.fields.Tradition;
  return spell({
    name, tradition, category, ppCost: s.pp, castAP, range, targets, area, duration, defence, traits, components,
    effects, warps, sustained, sustainType, baseDamage, flags,
    description: `${printedSpell(name)}\n${md(`*${HOW[kind]}:* ${how}`)}`
  });
}

const MODULE_ID = "trg-inner-tempest";

export const BLOCK8_SPELLS = [
  G("Ability Inversion", {
    castAP: 2, range: "60 feet", targets: "1 creature", defence: "Will", duration: "varies",
    // ONE ROW A RUNG, each with the book's length (B8-1). A Partial reads as
    // the Success row (IT-m24) and a Blunder as the Fumble row; a Critical, or
    // a Heroic beside it, is unaffected — no row.
    effects: [
      { kind: "abilitySwap", target: "targets", label: "Ability Inversion", onSave: ["success", "partial"], duration: "until the end of its next turn" },
      { kind: "abilitySwap", target: "targets", label: "Ability Inversion", onSave: ["failure"], duration: "1 minute" },
      { kind: "abilitySwap", target: "targets", label: "Ability Inversion", onSave: ["fumble", "blunder"], duration: "1 hour" }
    ],
    how: "the target saves Will against your spell save DC. On a Success or Partial its highest and lowest ability scores are switched until the end of its next turn, on a Failure for 1 minute, on a Fumble or Blunder for 1 hour; a Critical leaves it unaffected. The totals switch (base and bonuses together, B8-1), so everything they feed follows, and a bonus it gains afterwards adds on top. When two scores tie for highest or lowest you are asked which."
  }),
  G("Acidic Touch", {
    castAP: 2, duration: "1 minute", defence: "Fortitude", baseDamage: "1d6",
    // TWO RIDERS: the acid is on unarmed Strikes; the save follows ANY melee
    // Strike that hits (B8-2), at your spell save DC, once per hit.
    effects: [
      { kind: "strikeRider", target: "self", label: "Acidic Touch", dice: "1d6", damageType: "acid", scope: "unarmed", once: false, saveAtCast: false },
      { kind: "strikeRider", target: "self", label: "Acidic Touch (Fortitude)", condition: "sickened", conditionValue: 1, conditionRounds: 0, scope: "melee", once: false,
        conditionSave: { save: "fortitude", ladder: { failure: 1, fumble: 2, blunder: 2 } }, saveAtCast: false }
    ],
    how: "for 1 minute your unarmed Strikes deal 1d6 secondary acid damage, and every melee Strike you hit with makes the target save Fortitude against your spell save DC (B8-2): Success or Partial unaffected, Failure Sickened 1, Fumble or Blunder Sickened 2. Sickened stays until it is removed. Nothing is rolled when you cast it."
  }),
  G("Age Resistance", {
    kind: "partly", castAP: 2, duration: "until next daily preparation",
    effects: [{ kind: "moduleMark", target: "self", module: MODULE_ID, key: "ageResistance", label: "Age Resistance" }],
    warps: [
      { ppCost: 4, text: "increase the duration to 1 month", mods: { durationText: "1 month (30 days)" } },
      { ppCost: 10, text: "increase the duration to unlimited", mods: { durationText: "unlimited" } }
    ],
    how: "you are marked as resisting age until your next daily preparation (a month or for good, warped). The aging rules come with the appendix (Block 9) and read this mark (B8-8); until then, set aside the physical aging penalties by hand while it lasts."
  }),
  G("Arrows Flight", {
    // NO CREATURE TARGETS: the projectiles are chosen from your gear once the
    // cast succeeds, so the cast asks for no tokens.
    castAP: 2, range: "touch", duration: "10 minutes",
    flags: { itSpell: "arrowsFlight" },
    // A NOTE FOR THE CARD (0.9.1, found live). With no row at all the system
    // took the spell for one it cannot automate and printed its description
    // under the result, and the module's description is HTML, so the card
    // showed the tags as text. The choice itself follows the card.
    effects: [{ kind: "note", text: "Choose the projectiles next: a stack of arrows, bolts, sling bullets, darts or shuriken (any ammunition or thrown weapon, warped), up to 30. They are split off as their own stack, with their range increments doubled for the spell's duration. Target an ally to enchant theirs." }],
    warps: [
      { ppCost: 2, text: "increase the duration to 1 hour", mods: { durationText: "1 hour" } },
      { ppCost: 4, text: "affect projectiles of up to a large size", mods: { unlocks: ["itLargeProjectiles"] } }
    ],
    how: "when the cast succeeds you choose a stack of arrows, bolts, sling bullets, darts or shuriken (B8-3; with the +4 PP warp, any ammunition or thrown weapon) and how many, up to 30. They are split off as their own stack, and its range increments are doubled until the spell's time is up."
  }),
  G("Boundless Vision", {
    kind: "partly", castAP: 3, duration: "Sustained (1 minute)", components: V, sustained: true, sustainType: "sustain",
    effects: [{ kind: "declare", target: "self", label: "Boundless Vision", noStack: true,
      flags: { creatureAbility: { derives: { cannotBeFlanked: true } } },
      text: "you cannot be flanked while you sustain it" }],
    how: "you cannot be flanked while you sustain it. What you can see within 100 feet in line of sight is the table's (interpretation 1); no area is placed."
  }),
  G("Disrupt Soul", {
    castAP: 2, range: "30 feet", targets: "1 living creature", defence: "Fortitude", duration: "Sustained (1 minute)", sustained: true, sustainType: "sustain",
    effects: [{ kind: "moduleMark", target: "targets", module: MODULE_ID, key: "disruptSoul", label: "Disrupt Soul", saveAtCast: false }],
    how: "the target is marked with your spell save DC (B8-4). Each time it casts a spell, once the casting is paid for, or uses a magical Focus ability, it saves Fortitude, rolled for it: Critical unaffected and Disrupt Soul ends; Success 2d8 essence; Failure 2d8 essence plus 1d8 per PP it spent (B8-5; a casting that spent no PP — an innate spell, an item's, a cantrip — or a magical Focus ability, 1d8 per four levels, at least 1d8); Fumble or Blunder as a Failure, and an essence critical injury of a basic save's severity (interpretation 5)."
  }),
  G("False Future", {
    kind: "manual", castAP: 2, range: "touch", targets: "1 living creature", duration: "until the next time you make your daily preparations",
    effects: [{ kind: "note", text: "Divinations about the target see the future you describe instead, until your next daily preparations. The target may attempt a Will save to avoid it; a creature using a divination gets a Will save to disbelieve. Sense Magic to detect it is Incredibly Hard (DC +10)." }],
    how: "what a divination reveals is the GM's. The target's Will save and a diviner's are rolled by hand."
  }),
  G("Flowing Step", {
    castAP: 1, duration: "end of your turn", components: V,
    effects: [{ kind: "declare", target: "self", label: "Flowing Step", noStack: true, duration: "until the end of your turn",
      flags: {
        ignoresDifficultTerrain: true,
        conditionals: [{ kind: "advantage", label: "Flowing Step", scope: "Reflex saving throws", auto: true, when: { checkTypes: ["save"], subjects: ["reflex"] } }]
      },
      text: "advantage on Reflex saves; difficult terrain costs you nothing extra and formidable terrain counts as difficult" }],
    how: "until the end of your turn your Reflex saves are rolled with advantage, difficult terrain costs you nothing extra and formidable terrain costs as difficult (interpretation 2: a zone's own Speed penalty still applies)."
  }),
  G("Foretell Failure", {
    castAP: 1, components: V,
    effects: [{ kind: "declare", target: "self", label: "Foretell Failure", noStack: true, rounds: 1, flags: { foretell: true },
      text: "before your next d20 check you learn whether a 10 on the die would succeed" }],
    how: "your next d20 check says first whether a 10 on the die would succeed, with every modifier it has. A skill action is asked before it spends anything: if a 10 would succeed it is taken; if not, you may take a different action and nothing is spent, and a DC the GM sets afterwards is put to the GM while the action waits (B8-6). A Strike, a save or a casting's check is told at its roll, where it is already under way."
  }),
  G("Root", {
    castAP: 2, range: "touch", targets: "1 creature", duration: "1 minute",
    effects: [
      // ONE ROW, NOT TWO (0.9.1, found live). The system meets a Trip at the
      // higher of the target's Acrobatics and Fortitude DCs, and a row naming
      // either DC raises that Trip once. The +2 to both of them is therefore
      // this one row: a Trip meets the higher DC +2. A second row on the
      // Acrobatics DC was counted again, so a Trip met the DC +4 (+8 warped).
      // The scope finishes the card's "anyone rolls against to …".
      { kind: "defenceDC", target: "targets", dc: "fortitudeDC", value: 2, bonusType: "circumstance", label: "Root", scope: "move or trip it", actions: ["shoveAttack", "tripAttack", "reposition"] },
      { kind: "declare", target: "targets", label: "Root (balance)", noStack: true,
        flags: { conditionals: [{ kind: "modifier", value: 2, type: "circumstance", warpBonus: true, label: "Root", scope: "checks to balance or remain standing on earth, sand, stone or similar rocky ground", auto: false, when: { checkTypes: ["skill"], subjects: ["acrobatics"] } }] },
        text: "a circumstance bonus to balance or stay standing on earth, sand or stone, ticked when the ground is" }
    ],
    warps: [
      { ppCost: 1, text: "increase bonus by +1 (max +4)", mods: { bonusValue: 1, bonusMax: 4 } },
      { ppCost: 2, text: "increase duration to 10 minutes", mods: { durationText: "10 minutes" } }
    ],
    how: "a Shove, Trip or Reposition against the target meets its Fortitude DC +2 circumstance, and a Trip the higher of its Acrobatics and Fortitude DCs +2, once (interpretation 3); +1 for each +1 PP bought, to +4. The same bonus is a tick-box on its Acrobatics checks to balance or stay standing on earth, sand or stone (interpretation 3), because the ground is the GM's call."
  }),
  G("Skyborne Pathways", {
    kind: "manual", castAP: 2, duration: "8 hours",
    effects: [{ kind: "note", text: "For 8 hours you can follow the aerial tracks of creatures that flew through the 50-foot radius within the past day, without penalty for poor light; the Track (Survival) DC is soft terrain's. Others may follow only with you." }],
    warps: [
      { ppCost: 1, text: "increase the time since the tracks were made by 1 day", mods: {} },
      { ppCost: 2, text: "increase the time since the tracks were made to one week; the +1 PP warping option then adds weeks rather than days", mods: {} }
    ],
    how: "tracking is the GM's: roll Track (Survival) at soft terrain's DC. No area is placed."
  }),
  G("Spiritual Distraction", {
    castAP: 2, range: "30 feet", targets: "1 living creature", defence: "Will", duration: "Sustained (1 minute)", sustained: true, sustainType: "sustain",
    effects: [{ kind: "moduleMark", target: "targets", module: MODULE_ID, key: "spiritualDistraction", label: "Spiritual Distraction", saveAtCast: false }],
    how: "the target is marked with your spell save DC (B8-4). Each time it casts a spell it saves Will, rolled for it before its spell check: Critical unaffected and Spiritual Distraction ends; Success unaffected; Partial −2, Failure −4, Fumble or Blunder −10 circumstance to that spell check."
  }),
  G("Tranquil Mastery", {
    castAP: "10 minutes", range: "touch", targets: "1 willing creature", duration: "1 hour", components: NONE,
    effects: [{ kind: "declare", target: "targets", label: "Tranquil Mastery", noStack: true, flags: { refocusExtra: true },
      text: "a successful Refocus may restore a second expended Focus ability, chosen with the first" }],
    how: "for 1 hour, when the target uses Refocus it is asked for a second expended Focus ability as it names the first, before the roll (B8-7). A Critical restores both now, a Success both at the beginning of its next turn; a lower result touches only the first."
  })
];

/** The thirteen, by name, in the book's order. */
export const BLOCK8_SPELL_NAMES = Object.freeze(BLOCK8_SPELLS.map((s) => s.name));

/**
 * THE FOCUS ABILITIES THE BOOK CALLS MAGICAL (for Disrupt Soul), each with
 * the sentence that says so: Chapter 1, "If an ability is magical, it
 * possesses the appropriate tradition or magical traits"; the Ghost Arts,
 * "Unless an art specifically states that it is magical, it is treated as a
 * mundane technique". Inner Strike is left out: only its damage may be
 * magical ("If the chosen damage is magical"), not the technique.
 */
export const MAGICAL_FOCUS = Object.freeze({
  "Abundant Step": "This is a magical technique using the tradition of your Monastic Path.",
  "Inner Blast": "This is a magical technique using the tradition of your Monastic Path.",
  "Shadow Double": "This Ghost Art is magical.",
  "Veiled Body": "This Ghost Art is magical.",
  "Body of Mist": "This Ghost Art is magical.",
  "Shadow Passage": "This Ghost Art is magical.",
  "Empty Presence": "This Ghost Art is magical."
});
