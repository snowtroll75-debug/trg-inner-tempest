/**
 * Inner Tempest — Block 4 (0.5.0): the Ghostwalker, the Kensai and the
 * Oathblade, their Ghost Arts, Combat Forms and Sworn Oaths, and the 28
 * class feats Graham's ruling B4-1 brought in.
 *
 * As ruled on 23 October 2026 (docs/INNER_TEMPEST_RULINGS_2026-10-23.md and
 * docs/INNER_TEMPEST_BLOCK4_AUDIT.md), on TRG Prime 3.668.0.
 *
 * THE PRINTED TEXT IS THE BOOK'S, read from tools/content/book-text-block4.json
 * (cut from the docx by tools/content/extract-book-block4.mjs), never retyped.
 * Each item's description is that text followed by what TRG Prime does with
 * it: *Automated*, *Partly automated* or *Not automated*, and why.
 *
 * FLAGS under the system's scope (`flags.trg-prime`) are TRG Prime's
 * declarations: `ambushDice` and `ambushExtras` (3.668.0), `conditionals`,
 * `statBonuses`, `defenceDC`, `strikeRending`, `reactionAttackPenalty`,
 * `weaponTraitGrants`, `focusExtraUses`, `convictionPool`,
 * `actionAbilityOptions`, `abilityChoices`. The module's own: `itAutomation`
 * (which Use handler acts), `itForm` (a Combat Form's two benefits),
 * `itTradition` (a class's magical-tradition ability), `itOath`.
 */
import fs from "node:fs";
import { classItem, classAbility, ability, feat } from "./builders.mjs";
import { md } from "./markdown.mjs";

const BOOK = JSON.parse(fs.readFileSync(new URL("./book-text-block4.json", import.meta.url), "utf8"));
/** The docx's ordinals come through as <sup>: "1<sup>st</sup>" is printed "1st". */
const clean = (t) => String(t).replace(/<\/?sup>/g, "");

/**
 * The book's text for a section (or a feat) as HTML: its trait line first in
 * bold, each paragraph as printed, and a run of "- " lines as the bulleted
 * list the book prints.
 */
function printed(key, from = "sections") {
  const s = BOOK[from][key];
  if (!s) throw new Error(`Block 4: the book has no ${from} entry "${key}"`);
  const out = s.traits ? [md(`**${s.traits}**`)] : [];
  let bullets = [];
  const flush = () => { if (bullets.length) out.push(`<ul>${bullets.map((b) => `<li>${md(b).replace(/^<p>|<\/p>$/g, "")}</li>`).join("")}</ul>`); bullets = []; };
  for (const line of s.lines.map(clean)) {
    if (/^-\s+/.test(line)) { bullets.push(line.replace(/^-\s+/, "")); continue; }
    flush();
    out.push(md(line));
  }
  flush();
  return out.join("\n");
}
const auto = (key, how, from) => `${printed(key, from)}\n${md(`*Automated:* ${how}`)}`;
const partly = (key, how, from) => `${printed(key, from)}\n${md(`*Partly automated:* ${how}`)}`;
const manual = (key, why, from) => `${printed(key, from)}\n${md(`*Not automated:* ${why}`)}`;
/** The book's trait line as the item's traits ("FOCUS MOVEMENT TECHNIQUE" → "Focus, Movement, Technique"). */
const traitsOf = (key, from = "sections") => (BOOK[from][key]?.traits ?? "").split(/\s+/).filter(Boolean)
  .map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(", ");

/* ------------------------------------------------------------------ */
/* The three classes (Chapter 3)                                        */
/* ------------------------------------------------------------------ */

/** The builder's row: [bab, bdb, fort, ref, will, bonusFeats, casterLevel, pp, bsb]. No spellcasting progression. */
const rows = (name) => BOOK.tables[name].map(([, ...r]) => [...r, 0, 0, 0]);
const classText = (name, extra) => md(`**CLASS TYPE** ${BOOK.classes[name].type}\n\n${BOOK.classes[name].description}\n\n${extra}`);

export const GHOSTWALKER_ABILITIES = "1: Ghostwalk, 1: Unseen Assault, 1: Vanishing Retreat, 1: Ghost Arts, 1: Magical Tradition";
export const KENSAI_ABILITIES = "1: Combat Form, 1: Flow Strike, 1: Considered Mind, 1: Weapon Discipline, 1: Magical Tradition";
export const OATHBLADE_ABILITIES = "1: Challenge, 1: Sworn Oath, 1: Unwavering Purpose, 1: Oathblade's Resolve, 1: Magical Tradition";

export const CLASSES = [
  classItem({
    name: "Ghostwalker", classType: "Expert",
    keyAbilityScores: BOOK.classes.Ghostwalker.keyAbilityScores,
    classSkills: BOOK.classes.Ghostwalker.classSkills,
    proficiencies: BOOK.classes.Ghostwalker.proficiencies,
    hitPoints: 8, skillPoints: 8,
    grantedFeats: "1: Weapon Finesse",
    classAbilities: GHOSTWALKER_ABILITIES,
    wealth: "0",
    table: rows("Ghostwalker"),
    description: classText("Ghostwalker", `**MAGICAL TRADITION** ${BOOK.sections["Ghostwalker: MAGICAL TRADITION"].lines.join(" ")}`),
    flags: { bonusFeatsNote: clean(BOOK.sections["Ghostwalker: BONUS FEATS"].lines.join(" ")), minimumAbilities: { dexterity: 2 } }
  }),
  classItem({
    name: "Kensai", classType: "Martial",
    keyAbilityScores: BOOK.classes.Kensai.keyAbilityScores,
    classSkills: BOOK.classes.Kensai.classSkills,
    proficiencies: BOOK.classes.Kensai.proficiencies,
    hitPoints: 10, skillPoints: 4,
    grantedFeats: "1: Weapon Finesse",
    classAbilities: KENSAI_ABILITIES,
    wealth: "1",
    table: rows("Kensai"),
    description: classText("Kensai", `**MAGICAL TRADITION** ${BOOK.sections["Kensai: MAGICAL TRADITION"].lines.join(" ")}`),
    flags: { bonusFeatsNote: clean(BOOK.sections["Kensai: BONUS FEATS"].lines.join(" ")), minimumAbilities: { dexterity: 2, intelligence: 2 } }
  }),
  classItem({
    name: "Oathblade", classType: "Martial",
    keyAbilityScores: BOOK.classes.Oathblade.keyAbilityScores,
    classSkills: BOOK.classes.Oathblade.classSkills,
    proficiencies: BOOK.classes.Oathblade.proficiencies,
    hitPoints: 10, skillPoints: 6,
    grantedFeats: "1: Quick Draw",
    classAbilities: OATHBLADE_ABILITIES,
    wealth: "2",
    table: rows("Oathblade"),
    description: classText("Oathblade", `**MAGICAL TRADITION** ${BOOK.sections["Oathblade: MAGICAL TRADITION"].lines.join(" ")}`),
    flags: { bonusFeatsNote: clean(BOOK.sections["Oathblade: BONUS FEATS"].lines.join(" ")), minimumAbilities: { charisma: 2 } }
  })
];

/* ------------------------------------------------------------------ */
/* Magical Tradition (each class): a tradition chosen at 1st            */
/* ------------------------------------------------------------------ */

export const TRADITIONS = ["arcane", "divinity", "ethereal", "verdant"];
const traditionAbility = (cls, ability, key) => classAbility({
  name: "Magical Tradition", sourceClass: cls,
  description: auto(key, `press Use to choose arcane, divinity, ethereal or verdant. It is recorded on this ability and names the tradition (with ${ability.charAt(0).toUpperCase() + ability.slice(1)}) of any magical ${cls} technique on its card. Focus is not magical, so nothing else changes.`),
  flags: { itTradition: { ability, tradition: "" }, itAutomation: "magicalTradition" }
});

/* ------------------------------------------------------------------ */
/* Ghostwalker                                                          */
/* ------------------------------------------------------------------ */

const GW = "Ghostwalker";
export const GHOST_ART_NAMES = ["False Face", "Ghost Step", "Hollow Breath", "Misdirecting Whisper", "No Trace", "Silent Needles", "Smoke Veil", "Spider Path",
  "Falling Shadow", "Caltrop Blossom", "Shadow Double", "Veiled Body", "Body of Mist", "Shadow Passage", "Empty Presence"];
/** Unseen Assault: "1d6 … increases by 1d6 at 5th level and every 4 levels thereafter". */
export const UNSEEN_ASSAULT_DICE = [{ level: 1, count: 1 }, { level: 5, count: 2 }, { level: 9, count: 3 }, { level: 13, count: 4 }, { level: 17, count: 5 }];
/** Ghost Arts known: "two … at 1st level … one additional Ghost Art at 4th level and then every 4 levels thereafter". */
export const GHOST_ARTS_BY_LEVEL = [{ level: 1, count: 2 }, { level: 4, count: 3 }, { level: 8, count: 4 }, { level: 12, count: 5 }, { level: 16, count: 6 }, { level: 20, count: 7 }];

const GHOSTWALKER_ITEMS = [
  classAbility({
    name: "Ghostwalk", sourceClass: GW,
    description: manual("GHOSTWALK", "the system's Sneak action does not measure how far you move; with Ghostwalk you may move up to your Speed with it. You still need cover or concealment to Hide or Sneak.")
  }),
  classAbility({
    name: "Unseen Assault", sourceClass: GW,
    description: auto("UNSEEN ASSAULT", "on a Strike that hits, once per round: +1d6 precision (2d6 at 5th, 3d6 at 9th, 4d6 at 13th, 5d6 at 17th) with an agile or finesse melee weapon, a thrown weapon, or a ranged weapon within its first range increment, against a target flat-footed to you. It applies by itself when you are hidden from or undetected by the target, or it is flat-footed from your own Feint; when it is flat-footed for another reason you are asked on the hit (never with Shift). Flanking alone never counts (Graham's ruling B4-3)."),
    flags: { ambushDice: { label: "Unseen Assault", die: "d6", oncePerRound: true, byLevel: UNSEEN_ASSAULT_DICE } }
  }),
  classAbility({
    name: "Vanishing Retreat", sourceClass: GW, traits: "Movement",
    description: auto("VANISHING RETREAT", "after your Unseen Assault deals its damage you are asked whether to use it: it spends your reaction (in combat) and lets you Step 5 feet (10 with Fleeting Shadow), which provokes nothing. Move your token."),
    flags: { itAutomation: "vanishingRetreat" }
  }),
  classAbility({
    name: "Ghost Arts", sourceClass: GW,
    description: auto("Ghostwalker: GHOST ARTS", "press Use to learn your Ghost Arts: two at 1st level, one more at 4th, 8th, 12th, 16th and 20th, and one more for each Extra Ghost Art. The picker lists the arts whose level you meet and that you do not know. Each arrives as its own ability; a Focus art has its own use, restored by its own Refocus."),
    flags: { itAutomation: "ghostArts" }
  }),
  traditionAbility(GW, "wisdom", "Ghostwalker: MAGICAL TRADITION")
];

/** The Ghost Arts (Chapter 3), with each one's level and what TRG Prime does. */
const ART = (name, level, body, flags = {}) => {
  const key = name.toUpperCase();
  const item = ability({ name, traits: traitsOf(key), description: body(key), flags: { itAutomation: `ghostArt:${name}`, itArtLevel: level, ...flags } });
  item.system.category = "Ghost Art";
  item.system.sourceClass = GW;
  return item;
};
const GHOST_ARTS = [
  ART("False Face", 1, (k) => partly(k, "your Intelligence replaces Charisma on Disguise (Deception) checks, applied for you when it is higher. Preparing a disguise in 1 minute is the GM's."), {
    conditionals: [{ kind: "modifier", valueFrom: "intelligence-charisma", valueMin: 0, type: "untyped", label: "False Face", scope: "Disguise checks: Intelligence instead of Charisma", auto: true, when: { actions: ["disguise"] } }]
  }),
  ART("Ghost Step", 1, (k) => auto(k, "press Use: 1 AP and this art's use. Your next token move is armed up to your Speed and provokes nothing; the card offers Hide if you end in cover or concealment.")),
  ART("Hollow Breath", 1, (k) => partly(k, "press Use: 1 AP. An effect records your stillness, with its −5 to creatures hearing or seeing you move and breath held five times as long; it ends when you next Strike or take an action other than Awareness or Search. Applying the −5 to another creature's Perception is the GM's.")),
  ART("Misdirecting Whisper", 1, (k) => auto(k, "press Use: 1 AP and this art's use. Choose Feint or Create a Diversion: it is rolled with advantage, at no further AP, against your target, and the card reminds you of the 5-foot Step.")),
  ART("No Trace", 1, (k) => manual(k, "the system does not track trails; Track checks against you are one difficulty harder, by the GM.")),
  ART("Silent Needles", 1, (k) => auto(k, "target one or two creatures, then press Use: 1 AP (a Flourish) and this art's use. Two thrown Strikes, each at your multiple attack penalty; a creature hit twice meets its DR once. You need two thrown weapons.")),
  ART("Smoke Veil", 1, (k) => partly(k, "press Use: 1 AP and this art's use. A 10-foot burst is placed where you aim (within 30 ft) for 1 minute and named on the card; creatures inside are concealed and may Hide. Making those inside Concealed is by hand.")),
  ART("Spider Path", 1, (k) => auto(k, "press Use: 1 AP and this art's use. Your next token move is armed up to your Speed; the walls are yours to walk on, and you must end on a surface that holds you.")),
  ART("Falling Shadow", 4, (k) => partly(k, "press Use when you fall 10 feet or more: it spends your reaction and this art's use, and the card says to treat the fall as 30 feet shorter (apply the falling damage for the shorter fall) and that you may Hide.")),
  ART("Caltrop Blossom", 4, (k) => partly(k, "press Use: 1 AP and this art's use. The card names the 10-foot burst (within 20 ft), your Level DC and the damage at your level (2d6, +1d6 at 8th and every 4 levels after) for the Reflex save a creature makes the first time each turn it moves through it.")),
  ART("Shadow Double", 8, (k) => auto(k, "when an attack targets you, you are asked before it is rolled. A yes spends your reaction and this art's use and makes you Concealed until the start of your next turn; Step 5 feet by hand if it does not damage you. Magical (your Ghostwalker tradition).")),
  ART("Veiled Body", 8, (k) => auto(k, "press Use: 1 AP and this art's use. You are Invisible until the start of your next turn; the effect ends when you Strike or cast a spell. Magical.")),
  ART("Body of Mist", 12, (k) => auto(k, "press Use: 1 AP and this art's use. Your next token move is armed up to your Speed as flight that provokes nothing; the card lists what you cannot do. Magical.")),
  ART("Shadow Passage", 12, (k) => auto(k, "press Use in dim light or darkness: 1 AP and this art's use. Your next token move is armed up to your Speed as a teleport that provokes nothing. Magical.")),
  ART("Empty Presence", 16, (k) => auto(k, "press Use: 1 AP and this art's use. You are Invisible for 1 minute; after a Strike or a spell you are Concealed instead until the end of that turn, then Invisible again. Magical."))
];

/* ------------------------------------------------------------------ */
/* Kensai                                                               */
/* ------------------------------------------------------------------ */

const KS = "Kensai";
export const COMBAT_FORM_NAMES = ["Black Lotus", "Crashing Tide", "Dread Wolf", "Echoing Crane", "Ember Reaver", "Flickering Flame", "Gale Cutter", "Ghost Fox",
  "Iron Tortoise", "Rising Phoenix", "Steel Viper", "Stone Serpent"];
/** Forms known: "two combat forms … an additional combat form at 4th level and then every 4 levels thereafter". */
export const COMBAT_FORMS_BY_LEVEL = [{ level: 1, count: 2 }, { level: 4, count: 3 }, { level: 8, count: 4 }, { level: 12, count: 5 }, { level: 16, count: 6 }, { level: 20, count: 7 }];
export const WEAPON_DISCIPLINE_GROUPS = ["Axe", "Brawling", "Club", "Knife", "Spear", "Polearm", "Sword", "Flail", "Hammer", "Pick", "Dart"];

const KENSAI_ITEMS = [
  classAbility({
    name: "Combat Form", sourceClass: KS, traits: "Concentrate, Focus, Stance",
    description: auto("Kensai: COMBAT FORM", "press Use. While you know fewer forms than you are owed (two at 1st, one more at 4th, 8th, 12th, 16th and 20th, and one per Extra Form), it offers the forms to learn. Otherwise it offers your known forms (and a Blended Form): 1 AP enters the chosen form as a stance and expends Combat Form. You stay in the form; you cannot change form until a Refocus restores Combat Form."),
    flags: { itAutomation: "combatForm" }
  }),
  classAbility({
    name: "Flow Strike", sourceClass: KS, traits: "Attack, Flourish",
    description: auto("Kensai: FLOW STRIKE", "when your melee or thrown Strike hits and you may still use a Flourish this turn, you are asked whether to use Flow Strike: another Strike against the same target at your third-attack penalty (−10, −8 agile; −5 in Gale Cutter), which does not count towards your multiple attack penalty. 0 AP."),
    flags: { itAutomation: "flowStrike" }
  }),
  classAbility({
    name: "Considered Mind", sourceClass: KS,
    description: auto("Kensai: CONSIDERED MIND", "your Refocus (Mental Focus) checks use Intelligence when it is higher than Wisdom. Your other Mental Focus checks are unchanged."),
    flags: { actionAbilityOptions: [{ action: "refocus", ability: "intelligence", label: "Considered Mind" }] }
  }),
  classAbility({
    name: "Weapon Discipline", sourceClass: KS,
    description: auto("Kensai: WEAPON DISCIPLINE", "press Use to choose your group. With a weapon of that group your attack and damage rolls gain your class bonus − 1 (untyped, so a Combat Form's class bonuses add to it: Graham's ruling B4-2), and the weapon gains Finesse while wielded in one hand. *Not automated:* the free hand for Disarm and Shove, which the system does not check."),
    flags: { itAutomation: "weaponDiscipline" }
  }),
  traditionAbility(KS, "intelligence", "Kensai: MAGICAL TRADITION")
];

/**
 * THE TWELVE FORMS. Each is two benefits, as printed, so Echoed Form can keep
 * one: `itForm.parts[i] = { label, flags }`. A form's stance carries both
 * parts' flags merged. Values are the book's "class bonus" type unless the
 * line says otherwise ("+1 luck bonus").
 */
const C = (o) => ({ kind: "modifier", type: "class", auto: true, ...o });
const FORM_PARTS = {
  "Black Lotus": [
    { label: "Delay damage and critical", flags: { itBlackLotus: true } },
    { label: "+Int to Feint", flags: { conditionals: [C({ valueFrom: "intelligence", label: "Black Lotus", scope: "Feint (Deception) checks", when: { actions: ["feint"] } })] } }
  ],
  "Crashing Tide": [
    { label: "+1 attack, +Int damage after moving 10 feet", flags: { conditionals: [
      C({ value: 1, auto: false, label: "Crashing Tide", scope: "You moved 10 feet or more before this attack — tick if so", when: { checkTypes: ["attack"] } }),
      C({ valueFrom: "intelligence", auto: false, label: "Crashing Tide", scope: "You moved 10 feet or more before this attack — tick if so", when: { checkTypes: ["damage"] } })] } },
    { label: "Push 5 feet on a critical", flags: { itCrashingTide: true } }
  ],
  "Dread Wolf": [
    { label: "+1 attack, +Int damage against a lone creature", flags: { conditionals: [
      C({ value: 1, label: "Dread Wolf", scope: "A creature with none of its allies adjacent", when: { checkTypes: ["attack"], targetStates: ["isolated"] } }),
      C({ valueFrom: "intelligence", label: "Dread Wolf", scope: "A creature with none of its allies adjacent", when: { checkTypes: ["damage"], targetStates: ["isolated"] } })] } },
    { label: "+1 luck DB after dropping an enemy", flags: { itDreadWolf: true } }
  ],
  "Echoing Crane": [
    { label: "Class bonus − 1 to DB", flags: { statBonuses: [{ target: "defence", type: "class", valueFrom: "classBonus-1", label: "Echoing Crane" }] } },
    { label: "+1 to the next attack after avoiding one", flags: { itEchoingCrane: true } }
  ],
  "Ember Reaver": [
    { label: "+Int fire on the second hit in a round", flags: { itEmberSecondHit: true } },
    { label: "+1 weapon damage each round in the form (to your Int)", flags: { itEmberEscalation: true } }
  ],
  "Flickering Flame": [
    { label: "+1 per 2 Int to Reflex and Acrobatics", flags: { conditionals: [
      C({ valueFrom: "intelligence/2", valueMin: 1, label: "Flickering Flame", scope: "Reflex saves", when: { checkTypes: ["save"], subjects: ["reflex"] } }),
      C({ valueFrom: "intelligence/2", valueMin: 1, label: "Flickering Flame", scope: "Acrobatics checks", when: { checkTypes: ["skill"], subjects: ["acrobatics"] } })] } },
    { label: "−5 to reaction attacks against you", flags: { reactionAttackPenalty: { value: -5, label: "Flickering Flame" } } }
  ],
  "Gale Cutter": [
    { label: "Flow Strike at −5", flags: { itGaleCutter: true } },
    { label: "Grapples against you at disadvantage", flags: {
      defenceDC: [{ kind: "disadvantage", dc: "any", label: "Gale Cutter", when: { actions: ["grappleAttack"] } }],
      conditionals: [{ kind: "advantage", label: "Gale Cutter", scope: "Escape checks, and saves to resist a grab or restraint — tick on a save", auto: true, when: { actions: ["escape"] } },
        { kind: "advantage", label: "Gale Cutter", scope: "A saving throw to resist being grabbed or restrained — tick if this is one", auto: false, when: { checkTypes: ["save"] } }] } }
  ],
  "Ghost Fox": [
    { label: "+Int to Stealth", flags: { conditionals: [C({ valueFrom: "intelligence", label: "Ghost Fox", scope: "Stealth checks", when: { checkTypes: ["skill"], subjects: ["stealth"] } })] } },
    { label: "+Int damage against a flat-footed target", flags: { conditionals: [C({ valueFrom: "intelligence", label: "Ghost Fox", scope: "A target flat-footed to you", when: { checkTypes: ["damage"], targetStates: ["flatfooted"] } })] } }
  ],
  "Iron Tortoise": [
    { label: "+1 DB per 2 Int", flags: { statBonuses: [{ target: "defence", type: "class", valueFrom: "intelligence/2", valueMin: 1, label: "Iron Tortoise" }] } },
    { label: "Moving you at disadvantage", flags: {
      defenceDC: [{ kind: "disadvantage", dc: "any", label: "Iron Tortoise", when: { actions: ["shoveAttack", "reposition", "tripAttack"] } }],
      conditionals: [{ kind: "advantage", label: "Iron Tortoise", scope: "A saving throw to avoid being moved — tick if this is one", auto: false, when: { checkTypes: ["save"] } }] } }
  ],
  "Rising Phoenix": [
    { label: "+2 per Int to Climb and Jump", flags: { conditionals: [
      C({ valueFrom: "intelligence*2", label: "Rising Phoenix", scope: "Climbing checks", when: { checkTypes: ["skill"], subjects: ["climbing"] } }),
      C({ valueFrom: "intelligence*2", label: "Rising Phoenix", scope: "High Jump and Long Jump", when: { actions: ["highJump", "longJump"] } })] } },
    { label: "+Int damage after jumping into melee", flags: { conditionals: [C({ valueFrom: "intelligence", auto: false, label: "Rising Phoenix", scope: "Your first attack after you Jumped into melee — tick if so", when: { checkTypes: ["damage"] } })] } }
  ],
  "Steel Viper": [
    { label: "+5 × Int to initiative", flags: { conditionals: [C({ valueFrom: "intelligence*5", label: "Steel Viper", scope: "Initiative", when: { checkTypes: ["initiative"] } })], itSteelViperInitiative: true } },
    { label: "Half damage on a miss, once a round", flags: { itSteelViperMiss: true } }
  ],
  "Stone Serpent": [
    { label: "+Int precision damage from reach", flags: { conditionals: [C({ valueFrom: "intelligence", label: "Stone Serpent", scope: "A melee Strike beyond 5 feet", when: { checkTypes: ["damage"], rangeBands: ["reach"] } })] } },
    { label: "Advantage on Kip Up", flags: { conditionals: [{ kind: "advantage", label: "Stone Serpent", scope: "Kip Up", auto: true, when: { actions: ["kipUp"] } }] } }
  ]
};

const FORM_HOW = {
  "Black Lotus": "the Feint bonus is applied for you. Once per round, press Black Lotus's Use while in the form to Strike holding the blow: on a hit nothing is rolled yet, and at the start of the target's turn a card offers Land the blow, which rolls the critical and the damage (Graham's ruling of 23 October). What the Strike alone adds (riders, precision dice, Armour Rending) is not carried.",
  "Crashing Tide": "the +1 attack and +Int damage are offered as tick-boxes (you moved 10 feet). On a critical the card offers the push: a Fortitude save against your Technique DC (10 + Int + level) negates.",
  "Dread Wolf": "+1 attack and +Int damage are applied against a creature with none of its allies adjacent (read off the board). When you drop an enemy to 0 HP you gain +1 luck to DB until the end of the next round.",
  "Echoing Crane": "your class bonus − 1 is added to your DB. When an attack against you misses, your next weapon attack this round gains +1.",
  "Ember Reaver": "after your first hit in a round, your next hit that round adds your Int as fire secondary damage. At the start of each of your turns in the form, weapon damage rises by 1, up to your Int, and resets when you change form or combat ends (Graham's ruling B4-4).",
  "Flickering Flame": "+1 per 2 Int (minimum +1) to Reflex saves and Acrobatics checks, and reaction attacks against you take −5.",
  "Gale Cutter": "your Flow Strike is at −5. Grapples against you are rolled at disadvantage, and you have advantage on Escape (and, ticked, on a save to resist being grabbed or restrained).",
  "Ghost Fox": "+Int to Stealth checks, and +Int damage against a target flat-footed to you.",
  "Iron Tortoise": "+1 DB per 2 Int (minimum +1). Shove, Reposition and Trip against you are rolled at disadvantage (Graham, 23 October 2026: a Trip is an attempt to move you); a save to avoid being moved is offered advantage as a tick.",
  "Rising Phoenix": "+2 per Int to Climbing checks and to High Jump and Long Jump; +Int damage is offered as a tick on your first attack after jumping into melee.",
  "Steel Viper": "+5 × Int to initiative; entering the form in combat raises your current initiative by that much, and leaving it lowers it again. Once per round, when your Strike misses, you are asked whether to deal its damage halved.",
  "Stone Serpent": "+Int damage on a melee Strike beyond 5 feet (applied as damage, which a creature immune to precision still takes), and advantage on Kip Up."
};

export const COMBAT_FORMS = COMBAT_FORM_NAMES.map((name) => {
  const key = name.toUpperCase();
  const item = ability({
    name,
    description: auto(key, `press Combat Form's Use to enter it (1 AP, a stance). ${FORM_HOW[name]} All its modifiers are class bonuses.`),
    flags: { itForm: { parts: FORM_PARTS[name] }, itAutomation: "combatFormItem" }
  });
  item.system.category = "Combat Form";
  item.system.sourceClass = KS;
  return item;
});

/* ------------------------------------------------------------------ */
/* Oathblade                                                            */
/* ------------------------------------------------------------------ */

const OB = "Oathblade";
export const OATH_NAMES = ["Oath of Honour", "Oath of Guardianship", "Oath of Vengeance", "Oath of Fealty"];

const OATHBLADE_ITEMS = [
  classAbility({
    name: "Challenge", sourceClass: OB, traits: "Flourish, Focus, Mental, Technique",
    description: auto("Oathblade: CHALLENGE", "target the creature, then press Use: 1 AP (a Flourish) and this use. Against it, your melee attacks gain your class bonus to attack and to damage and Armour Rending equal to your class bonus; every other creature's attacks against you meet −2 to your DB. One target at a time; it ends when the target is killed, drops to 0 HP or unconscious, the combat ends, or you Challenge another. A surrender is ended by hand (delete the effect). Your Sworn Oath's benefits run with it."),
    flags: { itAutomation: "challenge" }
  }),
  classAbility({
    name: "Sworn Oath", sourceClass: OB,
    description: auto("Oathblade: SWORN OATH", "press Use to choose Honour, Guardianship, Vengeance or Fealty; the oath is added to your sheet. Changing it is the GM's: delete it and choose again."),
    flags: { abilityChoices: [...OATH_NAMES] }
  }),
  classAbility({
    name: "Unwavering Purpose", sourceClass: OB,
    description: auto("Oathblade: UNWAVERING PURPOSE", "your Refocus (Mental Focus) checks use Charisma when it is higher than Wisdom. Your other Mental Focus checks are unchanged."),
    flags: { actionAbilityOptions: [{ action: "refocus", ability: "charisma", label: "Unwavering Purpose" }] }
  }),
  classAbility({
    name: "Oathblade's Resolve", sourceClass: OB,
    description: auto("Oathblade: OATHBLADE'S RESOLVE", "+1 to your conviction pool and points."),
    flags: { convictionPool: 1 }
  }),
  traditionAbility(OB, "charisma", "Oathblade: MAGICAL TRADITION")
];

const OATH_HOW = {
  "Oath of Honour": "while your Challenge is up and none of your allies is adjacent to the target (read off the board): +2 circumstance to your DB against it, and advantage on your first melee Strike against it each round. When an ally attacks it or steps beside it, the oath is suppressed until the start of your next turn. *Not automated:* the target cannot gain the benefits of flanking you.",
  "Oath of Guardianship": "while your Challenge is up the target takes −2 circumstance on attacks against anyone but you. The first time each round it damages one of your allies, your next melee Strike against it before the end of your next turn has advantage and adds your Charisma (minimum 1) as damage.",
  "Oath of Vengeance": "while your Challenge is up, the first time each round the target damages you or an ally, you gain Retribution until the end of your next turn: your next melee Strike against it has advantage, adds your Charisma as damage and +2 Armour Rending, and Retribution ends with that Strike, hit or miss. With Unpaid Debt a miss keeps it, until you damage the target or it expires.",
  "Oath of Fealty": "at daily preparation you are asked for your Sworn Charge. While your Challenge is up and the charge is within 30 feet, the charge has +1 circumstance and AR 1 against the target; when either of you damages the target, the other's next attack on it before the end of their next turn has +2 circumstance (one at a time each)."
};

const OATHS = OATH_NAMES.map((name) => {
  const item = ability({ name, description: auto(name.toUpperCase(), OATH_HOW[name]), flags: { itOath: name } });
  item.system.category = "Sworn Oath";
  item.system.sourceClass = OB;
  return item;
});

/* ------------------------------------------------------------------ */
/* The 28 class feats (Chapter 5; B4-1)                                 */
/* ------------------------------------------------------------------ */

const CLASS = "Class";
/** A class feat from the book: its traits and prerequisites read off the extract. */
function F(name, { prerequisites: typed = "", how, kind = "auto", flags = {}, repeatable = false, sourceClass = "" }) {
  const key = name.toUpperCase().replace(/’/g, "'");
  const traits = traitsOf(key, "feats");
  const line = BOOK.feats[key]?.lines?.[0] ?? "";
  const prerequisites = /^\*\*Prerequisites\*\*/.test(line) ? line.replace(/^\*\*Prerequisites\*\*\s*/, "").trim() : "";
  if (prerequisites !== typed) throw new Error(`Block 4: ${name}'s prerequisites are "${prerequisites}" in the book`);
  const body = { auto, partly, manual }[kind](key, how, "feats");
  return feat({ name, category: CLASS, traits, prerequisites, sourceClass, description: body, repeatable, flags });
}

const FEATS = [
  F("Ambusher's Patience", { prerequisites: "Level 5, Stealth 5 ranks", sourceClass: GW, how: "+2d6 precision on the first Unseen Assault against each creature in an encounter, when it had not detected you. It applies by itself when you are undetected by it, and is asked otherwise.",
    flags: { ambushExtras: [{ label: "Ambusher's Patience", dice: 2, whenUndetected: true, oncePerCreature: true }] } }),
  F("Between Glances", { prerequisites: "Level 7", sourceClass: GW, kind: "manual", how: "what observers notice is the GM's; the card reminds you that Ghostwalk may cross 20 feet of open ground." }),
  F("Blended Form", { prerequisites: "Level 8", sourceClass: KS, how: "press Use to choose two of your known forms. Combat Form then also offers the blend, a stance with both forms' benefits. With Fluid Blending you may choose again (at daily preparation, by the GM's leave).",
    flags: { itAutomation: "blendedForm" } }),
  F("Claim the Next Foe", { prerequisites: "Level 8", sourceClass: OB, how: "when your challenged target is killed, drops to 0 HP or falls unconscious, you are asked whether to claim the next: Challenge is restored and you Challenge your current target at no AP (it expends Challenge again). A surrender: press Use.",
    flags: { itAutomation: "claimTheNextFoe" } }),
  F("Dancing Leaf", { sourceClass: "Disciple, Ghostwalker", kind: "partly", how: "+5 feet is added to a High Jump or Long Jump you succeed at, on the card; falling while adjacent to a wall is the GM's." }),
  F("Deflect Arrow", { prerequisites: "Dex 2", sourceClass: "Disciple, Kensai, Oathblade", how: "when you take Evade against a ranged attack with a hand free, you are asked whether to add Deflect Arrow: +4 circumstance to your DB against that attack. Free; not against massive projectiles (the GM's).",
    flags: { itAutomation: "deflectArrow" } }),
  F("Disciplined Follow-Through", { sourceClass: KS, how: "your Flow Strike adds +2 damage when it hits." }),
  F("Distant Honour", { prerequisites: "Level 5", sourceClass: OB, how: "your Challenge's attack, damage and Armour Rending also apply to bow attacks against the target within the first range increment." }),
  F("Echoed Form", { prerequisites: "Level 12, Blended Form", sourceClass: KS, how: "when you change form through Combat Form, you are asked which of the previous form's two benefits to keep for 3 rounds." }),
  F("Extra Form", { prerequisites: "Level 3", sourceClass: KS, repeatable: true, how: "one more form to learn through Combat Form's Use. Once per 3 levels." }),
  F("Extra Ghost Art", { prerequisites: "Level 3", sourceClass: GW, repeatable: true, how: "one more art to learn through Ghost Arts' Use. Once per 3 levels." }),
  F("Fleeting Shadow", { prerequisites: "Level 11", sourceClass: GW, how: "Vanishing Retreat's Step is 10 feet, and its card offers the Hide." }),
  F("Fluid Blending", { prerequisites: "Level 12, Blended Form", sourceClass: KS, how: "Blended Form's Use lets you choose its two forms again." }),
  F("Form Reversal", { prerequisites: "Level 6", sourceClass: KS, how: "when a melee attack misses you, you are asked whether to change form: your reaction, no AP, and Combat Form is neither needed nor expended. The one-round wait between stances does not apply. *Not automated:* its Flourish trait is not counted against your turn's Flourish, as it comes on another creature's turn.",
    flags: { itAutomation: "formReversal" } }),
  F("Formal Declaration", { sourceClass: OB, how: "after a Challenge you are asked whether to Demoralise the target at once (+2 circumstance if it can hear and understand you, ticked). The target is then immune to it until the encounter ends." }),
  F("Formless Cut", { prerequisites: "Level 14, any three Kensai feats", sourceClass: KS, how: "target, then press Use: 1 AP (a Flourish). One melee Strike with +4, the target's stance and form bonuses to DB ignored, +Int damage, and the target treated as flat-footed.",
    flags: { itAutomation: "formlessCut" } }),
  F("Ghost Art Mastery", { prerequisites: "Level 14", sourceClass: GW, repeatable: true, how: "press Use to choose a Focus Ghost Art: it gains a second use, and a Refocus restores both.",
    flags: { itAutomation: "ghostArtMastery" } }),
  F("Ghost Blade", { prerequisites: "Level 6", sourceClass: GW, how: "a Strike that deals Unseen Assault gains AR 1, AR 2 from 12th and AR 3 from 18th.",
    flags: { ambushExtras: [{ label: "Ghost Blade", ar: [{ level: 6, value: 1 }, { level: 12, value: 2 }, { level: 18, value: 3 }] }] } }),
  F("Guarded Commitment", { sourceClass: OB, how: "your Challenge's penalty to DB against other creatures is −1." }),
  F("Perfect Tempo", { prerequisites: "Level 10, Disciplined Follow-Through", sourceClass: KS, how: "when your Flow Strike hits, the card offers the Step, and your next attack this turn against a different enemy you end beside is offered +1 (ticked)." }),
  F("Shadow Counter", { prerequisites: "Level 9, Deception 5 ranks", sourceClass: GW, how: "when an attack misses you, you are asked whether to use it: your reaction, a 5-foot Step that provokes nothing (move your token), and a Feint against the attacker at no AP. A Feint that lands counts as your own Deception, so it enables Unseen Assault.",
    flags: { itAutomation: "shadowCounter" } }),
  F("Shadowy Step", { prerequisites: "Stealth 5 ranks", sourceClass: "Disciple, Ghostwalker, Mystic", how: "target, then press Use: 2 AP. Step (move your token), then a melee Strike against the target, which is considered flanked.",
    flags: { itAutomation: "shadowyStep" } }),
  F("Shared Purpose", { prerequisites: "Level 10, Oath of Fealty", sourceClass: OB, how: "once per round, when you or your Sworn Charge score a critical hit on the challenged target, the other is offered the free Step (move by hand) and advantage on their next attack on it before the end of their next turn." }),
  F("Shelter Under Oath", { prerequisites: "Level 10, Oath of Guardianship", sourceClass: OB, kind: "partly", how: "while your Challenge is up, your allies' saves against the challenged target's effects are offered +2 circumstance, when the save names its source. Being within 30 feet of you is the GM's." }),
  F("Smoke Eyes", { prerequisites: "Smoke Veil", sourceClass: GW, kind: "manual", how: "concealment from your own Smoke Veil is by hand, so ignoring it is too." }),
  F("Solitary Supremacy", { prerequisites: "Level 10, Oath of Honour", sourceClass: OB, kind: "manual", how: "the system does not know which DB bonuses come from the target's allies; the card reminds you." }),
  F("Unpaid Debt", { prerequisites: "Level 10, Oath of Vengeance", sourceClass: OB, how: "a missed Retribution Strike no longer ends Retribution; it lasts until you damage the target or it expires." }),
  F("Walk the Empty Space", { prerequisites: "Level 15, Between Glances", sourceClass: GW, kind: "manual", how: "as Between Glances, 40 feet; what observers notice is the GM's." })
];

/* ------------------------------------------------------------------ */
/* What foundation.mjs adds to each pack                                */
/* ------------------------------------------------------------------ */

export const BLOCK4_CLASSES = CLASSES;
export const BLOCK4_ABILITIES = [...GHOSTWALKER_ITEMS, ...GHOST_ARTS, ...KENSAI_ITEMS, ...COMBAT_FORMS, ...OATHBLADE_ITEMS, ...OATHS];
export const BLOCK4_FEATS = FEATS;
