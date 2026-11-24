/**
 * Inner Tempest — Block 11 (1.1.0): the nine Gymnast expansion feats of
 * Chapter 5, added to the sourcebook at v1.4.
 *
 * Graham, 24 November 2026: build them as working content on the core's own
 * Gymnast archetype (no second Gymnast), "use the updated 1.4 rules as law".
 * See docs/INNER_TEMPEST_BLOCK11_AUDIT.md for the audit, the readings taken
 * and the rulings still wanted.
 *
 * THE PRINTED TEXT IS THE BOOK'S, read from tools/content/book-text-block11.json
 * (cut from the v1.4 docx by tools/content/extract-book-block11.mjs), never
 * retyped. Each feat's description is that text followed by what TRG Prime
 * does with it.
 *
 * NAMES. The new Expert feat is Effortless Motion, as v1.4 prints it (its
 * working name was Flowing Step). The Grimoire's spell Flowing Step (PP 4,
 * Block 8) is a different document in a different pack and keeps its name;
 * nothing here touches it.
 *
 * CATEGORIES AND TRAITS, as printed: "CLASS EXPERT" is a Class feat with the
 * Expert trait (the core's tier gate); "CLASS GYMNAST" a Class feat with the
 * Gymnast trait (the core's archetype gate: owning the core Gymnast);
 * "GENERAL GYMNAST" a General feat with the Gymnast trait, which the core's
 * General picker does not gate, so Vaulting Momentum's eligibility is
 * registered (module/block11-automations.mjs `vaultingMomentumRefusal`).
 *
 * FLAGS under the system's scope (`flags.trg-prime`): `itAutomation` (which
 * Use acts), `conditionals` (the tick-boxes and the automatic rows),
 * `defenceDC` (Perfect Balance's attacker-side disadvantage, as the Tsuchi's).
 */
import fs from "node:fs";
import { feat, conditional } from "./builders.mjs";
import { md } from "./markdown.mjs";

const BOOK = JSON.parse(fs.readFileSync(new URL("./book-text-block11.json", import.meta.url), "utf8"));

const HOW = { auto: "Automated", partly: "Partly automated", manual: "Not automated" };

/**
 * The category word on the v1.4 trait line, and the traits beside it. The
 * line is alphabetical ("ATTACK CLASS FLOURISH GYMNAST MOVEMENT"), so CLASS
 * or GENERAL may stand anywhere in it; it is the feat's category, not a trait.
 */
export function splitTraitLine(line) {
  const words = String(line ?? "").trim().split(/\s+/).filter(Boolean);
  const upper = words.map((w) => w.toUpperCase());
  const category = upper.includes("CLASS") ? "Class" : upper.includes("GENERAL") ? "General" : "";
  const rest = words.filter((w) => !["CLASS", "GENERAL"].includes(w.toUpperCase()));
  const traits = rest.map((w) => w.charAt(0) + w.slice(1).toLowerCase()).sort((a, b) => a.localeCompare(b));
  return { category, traits };
}

/** The book's text for a feat as HTML: the trait line in bold, the flavour in italics, each paragraph as printed. */
function printed(key) {
  const s = BOOK.feats[key];
  if (!s) throw new Error(`Block 11: the book has no feat "${key}"`);
  return [md(`**${s.traits}**`), ...(s.flavour ? [md(`*${s.flavour}*`)] : []), ...s.lines.map((l) => md(l))].join("\n");
}

/** "**Prerequisites** Acrobatics 10 ranks" → "Acrobatics 10 ranks". */
export function printedPrerequisites(key) {
  const line = (BOOK.feats[key]?.lines ?? []).find((l) => /^\*\*Prerequisites\*\*\s/.test(l)) ?? "";
  return line.replace(/^\*\*Prerequisites\*\*\s*/, "").trim();
}

/** The printed action cost ("2 AP"), or "". */
export function printedAction(key) {
  const line = (BOOK.feats[key]?.lines ?? []).find((l) => /^\*\*Action\*\*\s/.test(l)) ?? "";
  return line.replace(/^\*\*Action\*\*\s*/, "").trim();
}

/** The feats' art, as Inner Tempest 1.0.5's jade set files it: by category. */
export const FEAT_ART = Object.freeze({
  Class: "modules/trg-inner-tempest/assets/feats/class.png",
  General: "modules/trg-inner-tempest/assets/feats/general.png"
});

/**
 * A feat from the book. The category and traits come from the printed trait
 * line; the prerequisites are the printed line, which the core's parser reads
 * as it stands (skill ranks and a feat's name).
 */
function F(name, { kind = "auto", how, flags = {} }) {
  const key = name.toUpperCase();
  const book = BOOK.feats[key];
  if (!book) throw new Error(`Block 11: the book has no feat "${key}"`);
  const { category, traits } = splitTraitLine(book.traits);
  if (!category) throw new Error(`Block 11: ${name}'s trait line names no category ("${book.traits}")`);
  const description = `${printed(key)}\n${md(`*${HOW[kind]}:* ${how}`)}`;
  return feat({
    name, category, traits: traits.join(", "), prerequisites: printedPrerequisites(key), description,
    flags, img: FEAT_ART[category]
  });
}

/** The Acrobatics checks made as part of movement: an Acrobatics action with the Movement trait. */
const ACRO_MOVEMENT = { checkTypes: ["skill"], subjects: ["acrobatics"], traits: ["movement"] };

/**
 * PERFECT BALANCE's defender rows, in the Tsuchi's shape (Graham's ruling of
 * 21 October 2026): "Advantage on checks and saves against being knocked
 * prone or moved". Your own rolls take the tick; a Shove, a Trip or a
 * Reposition against you is rolled at disadvantage, because you roll nothing
 * against it.
 */
export const PERFECT_BALANCE_ACTIONS = Object.freeze(["shoveAttack", "tripAttack", "reposition"]);
export const PRONE_OR_MOVED = "Checks and saving throws against being knocked prone or moved — tick if this roll is one";

export const BLOCK11_FEATS = [
  F("Effortless Motion", {
    kind: "auto",
    how: "press **Use** for your free Step: once a round in combat, no AP, provoking no reactions, at your Step's length on your land Speed (drag the token). Advantage is applied for you on every Acrobatics action with the Movement trait (Tumble, Balance, a jump made with Acrobatics …), and offered as a tick on any other Acrobatics check made during movement.",
    flags: {
      itAutomation: "effortlessMotion",
      conditionals: [
        conditional({ kind: "advantage", label: "Effortless Motion", scope: "Acrobatics checks made as part of movement", auto: true, when: { ...ACRO_MOVEMENT } }),
        conditional({ kind: "advantage", label: "Effortless Motion", scope: "An Acrobatics check made during movement — tick if this one is", auto: false, when: { checkTypes: ["skill"], subjects: ["acrobatics"], not: { traits: ["movement"] } } })
      ]
    }
  }),
  F("Offensive Momentum", {
    kind: "auto",
    how: "press **Use** (2 AP, the whole action): choose High Jump, Long Jump or Tumble and make the check, no further AP. On a Success or better the movement is armed free of AP — drag your token — and the card offers the melee Strike (no AP) for when you have moved: +1d4 precision damage if you moved at least 10 feet during the action, 2d4 if the check was a critical. A creature immune to precision takes none of it; one resisting it, half the dice.",
    flags: { itAutomation: "offensiveMomentum" }
  }),
  F("Perfect Balance", {
    kind: "partly",
    how: "a Shove, Trip or Reposition against you is rolled at **disadvantage** (you roll nothing against it), and advantage is offered as a tick on your own checks and saves against being knocked prone or moved. Ignoring narrow surfaces, unstable footing and magically shifting terrain on Acrobatics checks is the GM's to apply: the system does not yet say what those surfaces change on such a check (see the Block 11 audit, B11-2).",
    flags: {
      conditionals: [conditional({ kind: "advantage", label: "Perfect Balance", scope: PRONE_OR_MOVED, auto: false, when: { checkTypes: ["skill", "save", "attribute"] } })],
      defenceDC: [{ kind: "disadvantage", label: "Perfect Balance", scope: "resists being knocked prone or moved", when: { actions: [...PERFECT_BALANCE_ACTIONS] } }]
    }
  }),
  F("Pinnacle of Motion", {
    kind: "auto",
    how: "press **Use** for your free Tumble: once a round in combat, no AP (target the creature first). After any successful Tumble, the creature gains the **Flat-Footed** condition until the end of your turn (unless it already has it), so everything that reads Flat-Footed, such as sneak attack, sees it. When you critically hit it while that lasts, you are asked whether to spend your reaction on one unarmed Strike against it (once a round), at your current multiple attack penalty, which it does not raise.",
    flags: { itAutomation: "pinnacleOfMotion" }
  }),
  F("Rebound Assault", {
    kind: "auto",
    how: "press **Use** after a Movement action this turn other than a Step (a Stride, a Tumble, a jump …): 2 AP for two melee Strikes against two different creatures, both within your reach. Both are made at the multiple attack penalty that stands when you use it; the penalty then rises by two.",
    flags: { itAutomation: "reboundAssault" }
  }),
  F("Redirection Stance", {
    kind: "auto",
    how: "press **Use** to enter the stance: 1 AP, under the system's stance rules (one stance at a time, two with Stance Mastery). While in it, when a creature misses you with a melee attack you are asked whether to spend your reaction: it is then flat-footed until the end of its next turn. If the attack was a fumble you may also make a Trip against it, free (no AP, no further reaction), through the system's own Trip.",
    flags: { itAutomation: "redirectionStance" }
  }),
  F("Tumbling Reversal", {
    kind: "auto",
    how: "after a successful Tumble against a creature: +1 circumstance to your attacks against it until the end of your turn; after a critical one, advantage on your next attack against it as well, spent by that attack. Both applied for you, and gone at the end of your turn.",
    flags: {}
  }),
  F("Vaulting Momentum", {
    kind: "auto",
    how: "High Jump and Long Jump are offered from your Acrobatics as well as Athletics, with the same DCs, distances and trade-offs. A General feat: taken with a General feat pick, by a character who has the Gymnast archetype.",
    flags: {}
  }),
  F("Whirlwind Kip", {
    kind: "partly",
    how: "press **Use** to enter the stance: 1 AP, under the system's stance rules. While in it, a critical success on a Tumble or Escape check asks whether to spend your reaction on a Strike (the multiple attack penalty as for any Strike on your turn). The +2 circumstance to your DB against attacks of opportunity is for the GM to add by hand: the system's defence rows cannot yet tell an attack of opportunity from another Strike (Block 11 audit, B11-6).",
    flags: { itAutomation: "whirlwindKip" }
  })
];

/** The nine, by name. */
export const BLOCK11_NAMES = Object.freeze(BLOCK11_FEATS.map((d) => d.name));
