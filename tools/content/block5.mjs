/**
 * Inner Tempest — Block 5 (0.6.0): the 47 racial feats of Chapter 5, the
 * core racial feats the book opens to the four races (FR-48), Water Bolt
 * (Graham's B5-1) and the Ryukari's Draconic Armament attacks.
 *
 * As ruled on 24 October 2026 (docs/INNER_TEMPEST_RULINGS_2026-10-24.md and
 * docs/INNER_TEMPEST_BLOCK5_AUDIT.md), on TRG Prime 3.669.0.
 *
 * THE PRINTED TEXT IS THE BOOK'S, read from tools/content/book-text-block5.json
 * (cut from the docx by tools/content/extract-book-block5.mjs), never retyped.
 * Each feat's description is that text followed by what TRG Prime does with
 * it: *Automated*, *Partly automated* or *Not automated*, and why.
 *
 * FLAGS under the system's scope (`flags.trg-prime`) are TRG Prime's
 * declarations: `conditionals`, `defenceDC`, `convictionRefund` and
 * `fumbleReroll` (3.669.0), `dailyFirst`, `forcedMovementReduction`
 * (3.669.0), `grantedSpecialistSkills`, `auras` with `emitterState`
 * (3.669.0), `creatureAbility.derives.movement`. The module's own:
 * `itAutomation` (which Use handler acts). The Elemental feats' printed
 * lists live with their Use (module/block5-automations.mjs).
 */
import fs from "node:fs";
import { feat, spell, naturalAttack, changesEffect, declaredEffect, resistanceEffect, racialSkillEffect, conditional } from "./builders.mjs";
import { md } from "./markdown.mjs";

const BOOK = JSON.parse(fs.readFileSync(new URL("./book-text-block5.json", import.meta.url), "utf8"));

/**
 * The book's text for a feat as HTML: its trait line in bold, then each
 * paragraph as printed. A run of "| … |" lines is the table the book prints
 * (Celestial Breath's heritages), kept as a table.
 */
function printed(key) {
  const s = BOOK.feats[key];
  if (!s) throw new Error(`Block 5: the book has no feat "${key}"`);
  const out = s.traits ? [md(`**${s.traits}**`)] : [];
  let table = [];
  const flush = () => {
    if (!table.length) return;
    const rows = table.map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
    out.push(`<table>${rows.map((r, i) => `<tr>${r.map((c) => (i ? `<td>${md(c).replace(/^<p>|<\/p>$/g, "")}</td>` : `<th>${md(c).replace(/^<p>|<\/p>$/g, "")}</th>`)).join("")}</tr>`).join("")}</table>`);
    table = [];
  };
  for (const line of s.lines) {
    if (/^\|/.test(line)) { table.push(line); continue; }
    flush();
    out.push(md(line));
  }
  flush();
  return out.join("\n");
}

/** The book's trait line as the item's traits ("FOCUS MIRAKU TECHNIQUE" → "Focus, Miraku, Technique"). */
const traitsOf = (key) => (BOOK.feats[key]?.traits ?? "").split(/\s+/).filter(Boolean)
  .map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(", ");

/** The race words the trait line carries, which are the feat's source races. */
const RACES = Object.freeze({ HUMAN: "Human", KORNARGON: "Kornargon", MIRAKU: "Miraku", RYUKARI: "Ryukari", SCREE: "Scree", TIANZHI: "Tianzhi" });
const racesOf = (key) => (BOOK.feats[key]?.traits ?? "").split(/\s+/).filter((w) => RACES[w]).map((w) => RACES[w]).join(", ");

/** "**Prerequisites** Kitsune Heritage" → "Kitsune Heritage". */
function prerequisitesOf(key) {
  const line = (BOOK.feats[key]?.lines ?? []).find((l) => /^\*\*Prerequisites\*\*/.test(l)) ?? "";
  return line.replace(/^\*\*Prerequisites\*\*\s*/, "").trim();
}

const HOW = { auto: "Automated", partly: "Partly automated", manual: "Not automated" };

/**
 * A racial feat from the book: its traits, source race and prerequisites
 * read off the extract, its text printed, and what the system does.
 */
function R(name, { kind = "auto", how, flags = {}, effects = [], repeatable = false, key: keyOverride }) {
  const key = keyOverride ?? name.toUpperCase().replace(/’/g, "'");
  const sourceRace = racesOf(key);
  if (!sourceRace) throw new Error(`Block 5: ${name} names no race in its trait line`);
  const description = `${printed(key)}\n${md(`*${HOW[kind]}:* ${how}`)}`;
  return feat({ name, category: "Racial", traits: traitsOf(key), sourceRace, prerequisites: prerequisitesOf(key), description, flags, effects, repeatable });
}

const C = conditional;
/** "a +2 racial bonus to checks and saving throws made to avoid being knocked prone or moved against your will" */
const PRONE_OR_MOVED = "Checks and saving throws to avoid being knocked prone or moved against your will — tick if this roll is one";

/* ------------------------------------------------------------------ */
/* Water Bolt (Chapter 8, the Grimoire; Graham's B5-1)                  */
/* ------------------------------------------------------------------ */

export const BLOCK5_SPELLS = [
  spell({
    name: "Water Bolt", tradition: "arcane, verdant", ppCost: 2, castAP: 2, range: "30 feet", targets: "1 creature",
    traits: "Attack, Invocation, Water", category: "attack", baseDamage: "1d4", damage: { formula: "4d4", type: "bludgeoning" },
    components: { somatic: true, verbal: true, material: false, focus: false },
    effects: [{ kind: "note", text: "If the spell inflicts a critical injury with a severity of serious or greater, the target is also pushed back 5 feet — move its token (the push is the GM's to place)." }],
    description: `${md("**ATTACK INVOCATION WATER**\n\nYou call forth a powerful blast of pressurized water that bludgeons the target and knocks it back. If the spell attack hits it inflicts 4d4 bludgeoning damage.\n\nIf the spell inflicts a critical injury with a severity of serious or greater, the target is also pushed back 5 feet.")}\n${md("*Partly automated:* the spell attack and its 4d4 bludgeoning. The 5-foot push on a serious or deadly critical injury is named on the card and moved by hand. (Inner Tempest, Chapter 8; brought into Block 5 by Graham's ruling B5-1 for Elemental Power.)")}`
  })
];

/* ------------------------------------------------------------------ */
/* Draconic Armament's natural attacks                                  */
/* ------------------------------------------------------------------ */

export const DRACONIC_ATTACKS = Object.freeze(["Draconic Bite", "Draconic Claw"]);
export const BLOCK5_NATURAL_ATTACKS = [
  naturalAttack({
    name: "Draconic Bite", damage: "1d6", damageType: "piercing", traits: "Finesse, Unarmed",
    description: "Bite – Dam 1d6 P; FDC 5; Traits Finesse, Unarmed\n\nA Ryukari's pronounced fangs, from Draconic Armament (Inner Tempest, Chapter 5)."
  }),
  naturalAttack({
    name: "Draconic Claw", damage: "1d4", damageType: "slashing", traits: "Agile, Finesse, Unarmed",
    description: "Claw – Dam 1d4 S; FDC 5; Traits Agile, Finesse, Unarmed\n\nA Ryukari's pronounced claws, from Draconic Armament (Inner Tempest, Chapter 5)."
  })
];

/* ------------------------------------------------------------------ */
/* The 47 racial feats                                                  */
/* ------------------------------------------------------------------ */

const NATURAL_DR = (value, label) => (id, n) => changesEffect(id, `${n}: Base DR +${value}`,
  [{ key: "system.combat.naturalArmourBase.natural", mode: 2, value: String(value), priority: 30 }],
  `${label}: your Base Natural DR increases by ${value}.`);
const INITIATIVE = (value) => (id, n) => changesEffect(id, `${n}: Initiative +${value}`,
  [{ key: "system.combat.initiative.race", mode: 0, value: String(value), priority: 20 }],
  `+${value} racial bonus to Initiative checks.`);

const FEATS = [
  R("Adaptive Mind", {
    how: "when a conviction point buys Advantage on a Mental Focus check and the result is a Success or better, the point is given back and does not count as this round's spend; the card says so. The core's conviction has no reroll, so this reads it as conviction's Advantage (Graham's ruling B5-3). A DC set after the roll is read when it arrives.",
    flags: { convictionRefund: { skills: ["mentalFocus"], degrees: ["success", "critical", "heroic"], label: "Adaptive Mind" } }
  }),
  R("Ancestral Communion", {
    kind: "partly",
    how: "advantage is offered on your Spirit Lore checks — tick it when the check is Recall Knowledge about spirits, haunts, possession or the boundary between the worlds. What you learn of a creature's origin is the GM's.",
    flags: { conditionals: [C({ kind: "advantage", label: "Ancestral Communion", scope: "Recall Knowledge with Spirit Lore about spirits, haunts, possession or disturbances between the mortal and spirit worlds — tick if this check is one", auto: false, when: { checkTypes: ["specialist"], subjects: ["spiritLore"] } })] }
  }),
  R("Awaken the Animism", {
    how: "press Use: 1 AP and its Focus use. For 1 minute, by your heritage — Kitsune: advantage on Bluff and Feint; Mujina: Base DR +1; Ren: Speed +10 feet and falls a further 20 feet shorter; Byakko: +2 damage on melee Strikes; Orochi: Swim Speed +10 feet, advantage on Escape and on saves against poison (applied when the save names it, offered otherwise). The card says that Fluid Form cannot hide it.",
    flags: { itAutomation: "awakenTheAnimism" }
  }),
  R("Bear's Endurance", {
    how: "your Impact Absorption raises your Base DR by 2 instead of 1 (the book's \"Impact Stance\" is read as Impact Absorption, the Mujina's reaction). The +2 racial bonus against being knocked prone or moved by that attack is offered as a tick on your checks and saves.",
    flags: { conditionals: [C({ kind: "modifier", value: 2, type: "racial", label: "Bear's Endurance", scope: `${PRONE_OR_MOVED}, against an attack you absorbed with Impact Absorption that still damaged you`, auto: false, when: { checkTypes: ["skill", "save", "attribute"] } })] }
  }),
  R("Blinding Majesty", {
    how: "press Use: 2 AP and its Focus use. Every creature within 10 feet other than your allies makes a Reflex save against your Level DC (your allies are left out, as the book allows), and the ladder is applied: dazzled for a round, two rounds or 1 minute; on a Fumble blinded for a round and dazzled for 1 minute.",
    flags: { itAutomation: "blindingMajesty" }
  }),
  R("Celestial Breath", {
    how: "target the creatures in your 15-foot cone, then press Use: 2 AP and its Focus use. A basic Reflex save against your Level DC; 1d6 per two levels (at least 2d6) of your heritage's type — Shinryu electricity, Zennyo and Kura cold, Fuku acid, Zenki fire — with its traits.",
    flags: { itAutomation: "celestialBreath" }
  }),
  R("Celestial Footing", {
    kind: "manual",
    how: "TRG Prime's movement does not know what is under a token (as the Shinryu heritage); the air holds you until the end of your next turn by the table's reckoning."
  }),
  R("Draconic Armament", {
    repeatable: true,
    how: "press Use to choose the Bite (1d6 piercing; Finesse, Unarmed) or the Claw (1d4 slashing; Agile, Finesse, Unarmed); it arrives as a natural attack. Taken a second time, its Use gives the other.",
    flags: { itAutomation: "draconicArmament" }
  }),
  R("Elemental Ascendant", {
    how: "press Use to choose a PP 6 spell from the list whose trait matches your element (Graham's ruling B5-2 adds Water Walk for the Suiryoku). It arrives as an innate spell with the Focus trait, cast with Wisdom and costing no PP; its tradition is your Natural Chi's.",
    flags: { itAutomation: "elementalSpell" }
  }),
  R("Elemental Attunement", {
    kind: "partly",
    how: "+2 racial is offered on Recall Knowledge (tick when it concerns your element), and +1 racial is applied to the attack checks and save DCs of your innate spells with your element's traits (your heritage's), not to spells you prepare or know otherwise.",
    flags: { itAutomation: "elementalAttunement" }
  }),
  R("Elemental Infusion", {
    how: "press Use: 1 AP and its Focus use. For 1 minute your melee Strikes add 1d4 secondary damage of your element's type (Fuukaze electricity, Hikari essence, Kasai fire, Suiryoku cold, Tsuchi acid).",
    flags: { itAutomation: "elementalInfusion" }
  }),
  R("Elemental Power", {
    how: "press Use to choose a PP 2 spell from the list whose trait matches your element (Graham's ruling B5-2: Magic Stone for the Tsuchi; Water Bolt is in the Spells pack, B5-1). It arrives as an innate spell with the Focus trait, cast with Wisdom; its tradition is your Natural Chi's.",
    flags: { itAutomation: "elementalSpell" }
  }),
  R("Elemental Supremacy", {
    how: "press Use to choose a PP 4 spell from the list whose trait matches your element (Graham's ruling B5-2: Water Breathing for the Suiryoku, Endure Elements for every element). It arrives as an innate spell with the Focus trait, cast with Wisdom and costing no PP; its tradition is your Natural Chi's.",
    flags: { itAutomation: "elementalSpell" }
  }),
  R("Fateful Coincidence", {
    kind: "manual",
    how: "a coincidence is the GM's to introduce; once per session is yours to keep count of."
  }),
  R("Forgeheart", {
    how: "resistance to fire, and the Zenki heritage's own Crafting tick (metal, stone or a forge) becomes +2 instead of +1 while you have this feat; removing the feat puts it back.",
    effects: [(id, n) => resistanceEffect(id, n, "fire")]
  }),
  R("Fortified Carapace", {
    how: "Base Natural DR +1.",
    effects: [NATURAL_DR(1, "Fortified Carapace")]
  }),
  R("Fortune's Reversal", {
    how: "when you fumble an attack check (the fumble confirmed, before the fumble table), a skill check or a saving throw, you are asked whether to use it: your reaction in combat and its Focus use, and the check is rerolled and the second result used, even if it is worse.",
    flags: { fumbleReroll: { checkTypes: ["attack", "skill", "save"], reaction: true, label: "Fortune's Reversal" } }
  }),
  R("Foxfire", {
    how: "press Use: 1 AP and its Focus use, then place up to three motes within 60 feet (Escape stops early). Each is a 10-foot circle of dim light on the map that raises the light level by a step where it stands, for 1 minute. While they last, Use again moves them (a Free Action, once a turn): each up to 30 feet, still within 60 feet of you. They are drawn as light circles rather than tokens (see the release notes): a token would be read as a creature.",
    flags: { itAutomation: "foxfire" }
  }),
  R("Guardian's Intercession", {
    how: "when a physical attack you can see targets an ally adjacent to you, you are asked once the attack is committed and before it is rolled (not while you are immobilised, grabbed, paralysed, petrified or unconscious): a yes spends your reaction and its Focus use, makes you the target in the ally's place, and gives you +1 circumstance to DB and +1 Base DR against that attack. Step beside the ally by hand if you need to.",
    flags: { itAutomation: "guardiansIntercession" }
  }),
  R("Hive Coordination", {
    kind: "partly",
    how: "+2 racial is offered on Aid checks (Aid Another, Aid Offensive, Aid Defensive) — tick it when the creature understands Scree Cant and can perceive you.",
    flags: { conditionals: [C({ kind: "modifier", value: 2, type: "racial", label: "Hive Coordination", scope: "Aid for a creature that understands Scree Cant and can perceive your communication — tick if so", auto: false, when: { actions: ["aidOffensive", "aidDefensive", "aidAnother", "aid"] } })] }
  }),
  R("Hoardkeeper's Eye", {
    kind: "partly",
    how: "Treasure Sense's range is 60 feet on your sheet. What it finds within 10 feet is the GM's to say.",
    flags: { creatureAbility: { derives: { sense: { category: "tertiary", fixedFeet: 60, name: "Treasure Sense (Hoardkeeper's Eye)", note: "Precious metals within 60 feet: presence and direction; within 10 feet, exact location and type, and whether one object or several (Hoardkeeper's Eye)." } } } }
  }),
  R("Immovable Plating", {
    how: "a Shove or Trip against you meets your Fortitude DC +2 (as the Storgar's), and the tick is offered on your own checks and saves to avoid being knocked prone or moved. A push that moves you is 5 feet shorter, to a minimum of 0; teleportation is not a push.",
    effects: [declaredEffect("pushes 5 ft shorter", "Whenever a physical effect would forcibly move you, reduce the distance moved by 5 feet, to a minimum of 0 feet.", { forcedMovementReduction: 5 })],
    flags: {
      defenceDC: [{ dc: "fortitudeDC", value: 2, label: "Immovable Plating", scope: "resisting being knocked prone or moved against your will", when: { actions: ["shoveAttack", "tripAttack", "reposition"] } }],
      conditionals: [C({ kind: "modifier", value: 2, type: "racial", label: "Immovable Plating", scope: PRONE_OR_MOVED, auto: false, when: { checkTypes: ["skill", "save", "attribute"] } })]
    }
  }),
  R("Keeper of Endings", {
    how: "Undead Lore is added as a specialist skill. +2 racial on Occultism and Religion is applied when the check is aimed at an undead or a haunt, and offered as a tick otherwise (death or decay).",
    flags: {
      grantedSpecialistSkills: "Undead Lore",
      conditionals: [
        C({ kind: "modifier", value: 2, type: "racial", label: "Keeper of Endings", scope: "Occultism or Religion aimed at an undead", auto: true, when: { checkTypes: ["skill"], subjects: ["occultism", "religion"], targetTypes: ["undead"] } }),
        C({ kind: "modifier", value: 2, type: "racial", label: "Keeper of Endings", scope: "Occultism or Religion aimed at a haunt", auto: true, when: { checkTypes: ["skill"], subjects: ["occultism", "religion"], targetTraits: ["haunt"], not: { targetTypes: ["undead"] } } }),
        C({ kind: "modifier", value: 2, type: "racial", label: "Keeper of Endings", scope: "Occultism or Religion to identify or recall knowledge about undead, haunts or magic of death or decay — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["occultism", "religion"], not: { targetTypes: ["undead"], targetTraits: ["haunt"] } } })
      ]
    }
  }),
  R("Lantern Signal", {
    kind: "manual",
    how: "signalling is the table's; changing your Living Lantern's colour costs no action."
  }),
  R("Magma Channel", {
    how: "press Use: 1 AP and its Focus use. Your next melee Strike this turn that hits adds 1d6 secondary fire damage and counts as magical; a miss keeps it until the turn ends.",
    flags: { itAutomation: "magmaChannel" }
  }),
  R("Many-Faceted Vigilance", {
    how: "+10 racial to initiative, and Compound Eyes' own tick (visual Perception) becomes +2 instead of +1 while you have this feat; removing the feat puts it back.",
    effects: [INITIATIVE(10)]
  }),
  R("Many Tailed Cunning", {
    kind: "partly",
    how: "two ticks on Bluff (Deception): +2 racial when you use Ghost Sound or Fluid Form as part of the deception, and +2 racial against a creature that saw through one of your disguises or illusions this encounter.",
    flags: { conditionals: [
      C({ kind: "modifier", value: 2, type: "racial", label: "Many Tailed Cunning", scope: "You use Ghost Sound or Fluid Form as part of this deception — tick if so", auto: false, when: { actions: ["bluff"] } }),
      C({ kind: "modifier", value: 2, type: "racial", label: "Many Tailed Cunning (seen through)", scope: "This creature saw through one of your disguises or illusions this encounter — tick if so", auto: false, when: { actions: ["bluff"] } })
    ] }
  }),
  R("Mist Veil", {
    kind: "partly",
    how: "press Use: 2 AP and its Focus use. Until the start of your next turn every creature within 10 feet of you (you included) is Concealed, laid and lifted as they come and go, and the mist moves with you. That creatures outside are concealed to those inside is the table's.",
    flags: {
      itAutomation: "mistVeil",
      auras: [{ kind: "ally", name: "Mist Veil", radius: 10, includeSelf: true, emitterState: "mist-veil", allyEffect: { statuses: ["concealed"] }, enemyEffect: { statuses: ["concealed"] } }]
    }
  }),
  R("Paralysing Venom", {
    how: "when your Sting damages a creature you are asked whether to inject it (Free, its Focus use): a Fortitude save against your Level DC — −5 ft Speed for a round, −5 ft for two rounds, Slowed 1 for two rounds, or Paralysed for a round and then Slowed 1.",
    flags: { itAutomation: "paralysingVenom" }
  }),
  R("Perfected Form", {
    kind: "manual",
    how: "Fluid Form's disguise is the table's; its advantage on Bluff is still offered by Fluid Form."
  }),
  R("Predator's Momentum", {
    how: "when Predator's Pounce's Strike is pressed you are asked whether you Strode at least 20 feet: if so it gains +1 circumstance to the attack and 1d6 precision damage, once.",
    flags: { itAutomation: "predatorsMomentum" }
  }),
  R("Purifying Touch", {
    kind: "partly",
    how: "purifying is the table's. +2 racial is offered on Nature checks to identify unsafe water.",
    flags: { conditionals: [C({ kind: "modifier", value: 2, type: "racial", label: "Purifying Touch", scope: "Nature checks to identify contaminated, poisoned or otherwise unsafe water — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["nature"] } })] }
  }),
  R("Raptorial Refinement", {
    how: "your Raptorial Blade becomes AR 2 with Versatile P, on the weapon itself, when the feat or the blade arrives; removing the feat puts the blade back.",
    flags: { itAutomation: "raptorialRefinement" }
  }),
  R("Serpent's Venom", {
    key: "SERPENT'S VENOM",
    how: "press Use: 1 AP and its Focus use. Your next melee Strike that hits before the end of your next turn delivers it: a Fortitude save against your Level DC — Sickened 1 on a Partial, Sickened 2 on a Failure, and on a Fumble Sickened 2 and 1d6 poison per three levels (at least 1d6). Then it ends.",
    flags: { itAutomation: "serpentsVenom" }
  }),
  R("Silk Spinner", {
    kind: "partly",
    how: "the cord is the table's. +2 racial is offered on Crafting with silk, thread, rope or webbing.",
    flags: { conditionals: [C({ kind: "modifier", value: 2, type: "racial", label: "Silk Spinner", scope: "Crafting checks involving silk, thread, rope or woven webbing — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["crafting"] } })] }
  }),
  R("Spirit Beacon", {
    how: "press Use: 1 AP and its Focus use. For 1 minute you shed bright light within 20 feet and dim light 20 feet further (your token's light, and the light level: +3 steps within 20 feet, +1 beyond). You and your allies within 20 feet carry two ticks: +2 circumstance on Perception, Occultism and Religion about spirits, haunts and possession, and +1 circumstance on saves against possession and spirits' or haunts' effects. A save cannot see that its source is a spirit (spirit is a trait, not a creature type), so both are ticks.",
    flags: {
      itAutomation: "spiritBeacon",
      auras: [{
        kind: "ally", name: "Spirit Beacon", radius: 20, includeSelf: true, emitterState: "spirit-beacon",
        allyEffect: { conditionals: [
          { kind: "modifier", value: 2, type: "circumstance", label: "Spirit Beacon", scope: "Perception, Occultism or Religion to detect, identify or understand spirits, haunts, possession or the boundary between the worlds — tick if so", auto: false, when: { checkTypes: ["skill"], subjects: ["perception", "occultism", "religion"] } },
          { kind: "modifier", value: 1, type: "circumstance", label: "Spirit Beacon", scope: "Saving throws against possession or an effect a spirit or haunt created — tick if so", auto: false, when: { checkTypes: ["save"] } }
        ] }
      }]
    }
  }),
  R("Spirit Roar", {
    how: "press Use: 1 AP and its Focus use. One Demoralise check, compared with the Level DC of each enemy within 15 feet; each is resolved as Demoralise against it. Each affected creature is then immune to your Spirit Roar until the encounter ends (your ordinary Demoralise is not). Hearing you is the table's.",
    flags: { itAutomation: "spiritRoar" }
  }),
  R("Spiritual Resilience", {
    how: "+2 racial on saves against effects with the Soul trait (applied) or against possession (tick). On a Fortitude or Reflex save against a spirit, haunt or incorporeal creature, Wisdom stands in for Constitution or Dexterity when it is higher, offered as a tick (a save cannot see that its source is a spirit: spirit and incorporeal are traits, not creature types).",
    flags: { conditionals: [
      C({ kind: "modifier", value: 2, type: "racial", label: "Spiritual Resilience", scope: "Saving throws against effects with the Soul trait", auto: true, when: { checkTypes: ["save"], traits: ["soul"] } }),
      C({ kind: "modifier", value: 2, type: "racial", label: "Spiritual Resilience", scope: "Saving throws against possession — tick if this save is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["soul"] } } }),
      // "IF IT IS HIGHER": the swap is Wisdom − the usual ability, floored at
      // 0 so a lower Wisdom offers nothing (False Face's shape, Block 4).
      { kind: "modifier", valueFrom: "wisdom-constitution", valueMin: 0, type: "untyped", label: "Spiritual Resilience", scope: "Fortitude against an effect a spirit, haunt or incorporeal creature created: Wisdom instead of Constitution — tick if so", auto: false, when: { checkTypes: ["save"], subjects: ["fortitude"] } },
      { kind: "modifier", valueFrom: "wisdom-dexterity", valueMin: 0, type: "untyped", label: "Spiritual Resilience", scope: "Reflex against an effect a spirit, haunt or incorporeal creature created: Wisdom instead of Dexterity — tick if so", auto: false, when: { checkTypes: ["save"], subjects: ["reflex"] } }
    ] }
  }),
  R("Tianzhi Discipline", {
    how: "+2 racial on Refocus (Mental Focus), and the first Refocus each day is a Critical without the need for a roll (the card says so); daily preparation starts the count again.",
    effects: [declaredEffect("the first Refocus each day", "The first Refocus check that you make each day is treated as a Critical result without the need for a roll.", { dailyFirst: [{ action: "refocus", set: "critical", exact: true, label: "Tianzhi Discipline" }] })],
    flags: { conditionals: [C({ kind: "modifier", value: 2, type: "racial", label: "Tianzhi Discipline", scope: "Refocus (Mental Focus) checks", auto: true, when: { actions: ["refocus"] } })] }
  }),
  R("Tianzhi Meditation", {
    how: "+1 racial on Meditation checks, and advantage on your first Cleansing Trance, Clear Mind or Healing Trance each day (one between them); daily preparation starts the count again.",
    effects: [
      (id, n) => racialSkillEffect(id, n, ["Meditation"], 1),
      declaredEffect("the first trance each day", "Advantage on your first Cleansing Trance, Clear Mind or Healing Trance (Meditation) check each day.", { dailyFirst: [{ actions: ["cleansingTrance", "clearMind", "healingTrance"], slot: "tianzhiMeditation", advantage: true, label: "Tianzhi Meditation" }] })
    ]
  }),
  R("Tianzhi Scholar", {
    how: "+1 racial on Meditation and Nature, and +2 racial on your racial specialist skills (Elemental Lore and Tianzhi Lore).",
    effects: [(id, n) => racialSkillEffect(id, n, ["Meditation", "Nature"], 1)],
    flags: { conditionals: [C({ kind: "modifier", value: 2, type: "racial", label: "Tianzhi Scholar", scope: "Your racial specialist skills (Elemental Lore, Tianzhi Lore)", auto: true, when: { checkTypes: ["specialist"], subjects: ["elementalLore", "tianzhiLore"] } })] }
  }),
  R("Valley Chill", {
    how: "press Use: 2 AP and its Focus use. Every other creature within 10 feet makes a Fortitude save against your Level DC: −5 ft Speed, −10 ft Speed, −10 ft Speed and −1 to Reflex saves, and on a Fumble Slowed 1 as well, until the start of your next turn (a round).",
    flags: { itAutomation: "valleyChill" }
  }),
  R("Waiting Blade", {
    how: "when a creature misses you with a melee Strike (a reaction Strike included) and you have a Raptorial Blade, you are asked whether to use it: your reaction and its Focus use, and a Raptorial Blade Strike against it. It is a reaction, so the system applies no multiple attack penalty to it (audit interpretation 7). Being within the blade's reach is yours to confirm.",
    flags: { itAutomation: "waitingBlade" }
  }),
  R("Web Snare", {
    how: "target one creature within 30 feet, then press Use: 2 AP and its Focus use. A Reflex save against your Level DC — −5 ft Speed for a round, −10 ft Speed for two rounds, or Immobilised with Escape against your Level DC (and flat-footed while it lasts, on a Fumble). Only one creature at a time: a new Immobilisation frees the last.",
    flags: { itAutomation: "webSnare" }
  }),
  R("Weightless Footwork", {
    kind: "partly",
    how: "advantage on Balance (Acrobatics). The first 5 feet of difficult terrain each move, and not being flat-footed while Balancing, are the table's.",
    flags: { conditionals: [C({ kind: "advantage", label: "Weightless Footwork", scope: "Balance (Acrobatics) checks", auto: true, when: { actions: ["balance"] } })] }
  }),
  R("Wind-Borne Motion", {
    how: "press Use: 1 AP and its Focus use. Your next token move is armed up to your Speed; crossing liquid, gaps and open space is yours to judge, and you must end on a surface that holds you.",
    flags: { itAutomation: "windBorneMotion" }
  }),
  R("Wings Unfurled", {
    how: "a Fly Speed equal to your land Speed. Wing Burst need not end on a surface (its card says so).",
    flags: { creatureAbility: { derives: { movement: { key: "fly", orLand: true } } } }
  })
];

/* ------------------------------------------------------------------ */
/* FR-48: the core racial feats opened to the four races                */
/* ------------------------------------------------------------------ */

/**
 * "Existing racial feats" (Chapter 5): the core feats each race may also
 * take, a bracketed heritage limiting one to that heritage (TRG Prime 3.669.0
 * `registerFeatAccess` with `{ name, heritages }`). Parsed from the book's
 * own lines, so a misprint shows here rather than being retyped.
 */
export function existingFeatAccess() {
  const out = {};
  for (const [RACE, line] of Object.entries(BOOK.existing)) {
    const race = RACES[RACE];
    const names = String(line).replace(/\.\s*$/, "").split(/,\s*|\s+and\s+/).map((s) => s.trim()).filter(Boolean);
    out[race] = names.map((n) => {
      const m = /^(.+?)\s*\(([^)]+)\)$/.exec(n);
      return m ? { name: m[1].trim(), heritages: [m[2].trim()] } : n;
    });
  }
  return out;
}

export const BLOCK5_FEATS = FEATS;
