/**
 * Inner Tempest — Chapter 2 and the Chapter 5 General feats (Block 1):
 * the four races, their twenty heritages, the racial abilities and natural
 * attacks they grant, Scree Cant, the eleven backgrounds and the General
 * feats those backgrounds grant.
 *
 * Every number is transcribed from the sourcebook (v1.2, 20 Oct 2026) as
 * corrected by Graham's rulings of the same day (docs/INNER_TEMPEST_RULINGS_
 * 2026-10-20.md). Where a rule is not automated, the item says so in its
 * own description; nothing here is described as automated that is not.
 *
 * FLAGS: every builder writes its `flags` argument under the system's scope
 * (`flags.trg-prime`), which is where TRG Prime reads its declarations. The
 * module's own data — a Tianzhi heritage's element — sits there too, under
 * a key the system does not use (`itElement`).
 */
import fs from "node:fs";
import {
  race, heritage, background, ability, naturalAttack,
  changesEffect, declaredEffect, racialSkillEffect, resistanceEffect, noteEffect, conditional
} from "./builders.mjs";
import { GENERAL_FEATS } from "./feats-general.mjs";
import { BLOCK3_CLASSES, BLOCK3_ABILITIES, BLOCK3_FEATS, BLOCK3_SPELLS } from "./block3.mjs";
import { BLOCK4_CLASSES, BLOCK4_ABILITIES, BLOCK4_FEATS } from "./block4.mjs";
import { BLOCK5_FEATS, BLOCK5_SPELLS, BLOCK5_NATURAL_ATTACKS } from "./block5.mjs";
import { BLOCK6_FEATS, BLOCK6_ABILITIES } from "./block6.mjs";
import { CHAPTER6_WEAPONS } from "./weapons.mjs";
import { md } from "./markdown.mjs";

const text = JSON.parse(fs.readFileSync(new URL("./book-text.json", import.meta.url), "utf8"));

/* ------------------------------------------------------------------ */
/* The Tianzhi elements (v1.2 text box; Graham's ruling IT-C2)          */
/* ------------------------------------------------------------------ */

/**
 * Each Tianzhi heritage's element and damage type, as the v1.2 "Tianzhi
 * Elements" box prints them, stored on the heritage as
 * `flags.trg-prime.itElement` for the Tianzhi element feats (Block 3).
 * `spellTraits`: the spell traits an element pick matches (IT-C2's build
 * note: Hikari's "Spirit" matches Essence, Healing and Soul).
 */
export const TIANZHI_ELEMENTS = Object.freeze({
  Fuukaze: Object.freeze({ element: "Wind", damageType: "electricity", spellTraits: ["air", "electricity"] }),
  Hikari: Object.freeze({ element: "Spirit", damageType: "essence", spellTraits: ["essence", "healing", "soul"] }),
  Kasai: Object.freeze({ element: "Flame", damageType: "fire", spellTraits: ["fire"] }),
  Suiryoku: Object.freeze({ element: "Water", damageType: "cold", spellTraits: ["water", "cold"] }),
  Tsuchi: Object.freeze({ element: "Earth", damageType: "acid", spellTraits: ["earth", "acid"] })
});

/**
 * The Tianzhi's "one language based upon their heritage" (Ch2): the book
 * names none, and Graham ruled on 21 October 2026 — the elementals'
 * tongues for the four elements, and Thanatos for the Hikari.
 */
export const TIANZHI_LANGUAGES = Object.freeze({
  Fuukaze: "Aeolian", Hikari: "Thanatos", Kasai: "Ignic", Suiryoku: "Aqualis", Tsuchi: "Gaian"
});
const tianzhiLanguage = (name) => `*Language:* ${TIANZHI_LANGUAGES[name]}, the heritage's language (Graham's ruling). `;

const element = (name) => ({ itElement: { ...TIANZHI_ELEMENTS[name], spellTraits: [...TIANZHI_ELEMENTS[name].spellTraits] } });

/* ------------------------------------------------------------------ */
/* Effects used more than once                                          */
/* ------------------------------------------------------------------ */

/** A Base DR, in the shape the core companions carry it (scaled by BDB). */
const baseDR = (value, label) => (id, n) => changesEffect(id, `${n}: Base DR ${value}`,
  [{ key: "system.combat.naturalArmourBase.natural", mode: 5, value: String(value), priority: 20 }],
  `${label} grants a Base DR of ${value} (natural armour; scaled by your BDB like any Base DR).`);

const landSpeed = (value) => (id, n) => changesEffect(id, `${n}: Speed ${value > 0 ? "+" : ""}${value}`,
  [{ key: "system.combat.movement.land", mode: 2, value: String(value), priority: 20 }],
  `Your land Speed ${value > 0 ? "increases" : "decreases"} by ${Math.abs(value)} feet.`);

/**
 * A swim or climb Speed; UPGRADE, so a higher one from elsewhere is kept.
 * ON `.base`: the bare key is an object ({base, item, …, total}), and an
 * UPGRADE against an object is ignored — live on 0.1.0 the Zennyo had a
 * swim Speed of 0. `.base` is the number the total is summed from.
 */
const otherSpeed = (kind, value) => (id, n) => changesEffect(id, `${n}: ${kind[0].toUpperCase()}${kind.slice(1)} ${value} ft`,
  [{ key: `system.combat.movement.${kind}.base`, mode: 4, value: String(value), priority: 20 }],
  `A ${kind} Speed of ${value} feet.`);

const initiative = (value) => (id, n) => changesEffect(id, `${n}: Initiative +${value}`,
  [{ key: "system.combat.initiative.race", mode: 0, value: String(value), priority: 20 }],
  `+${value} racial bonus to Initiative checks.`);

/* ------------------------------------------------------------------ */
/* Racial abilities (Chapter 2, OTHER ABILITIES and heritage abilities) */
/* ------------------------------------------------------------------ */

export const ABILITIES = [
  // MIRAKU
  ability({
    name: "Fluid Form", sourceRace: "Miraku", traits: "Concentrate, Morph",
    description: md("**Fluid Form:** You can subtly rearrange your animal features, colouration, hair, voice and apparent age as a 1 AP action with the Concentrate and Morph traits. This cannot change your size, equipment or heritage, and cannot perfectly reproduce a specific individual. You gain advantage on Bluff (Deception) checks made to support a disguise created with this ability.\n\n*Use:* spends 1 AP in combat and puts a \"Fluid Form\" effect on you while the altered appearance lasts. While it is up, advantage is offered on your Bluff (Deception) checks — tick it when the Bluff supports the disguise. Use it again to return to your own appearance (also 1 AP). Your biological age, and so your age modifiers, never change (Appendix).")
  }),
  ability({
    name: "Spirit Awareness", sourceRace: "Miraku",
    description: md("**Spirit Awareness:** You gain a +1 racial bonus to Perception and Occultism checks made to notice, identify or understand spirits, haunts, possession and disturbances between the mortal and spirit worlds.\n\n*Applied automatically* when the check is aimed at a creature with the Spirit or Haunt trait; otherwise offered as a tick in the roll dialog with the book's wording."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Spirit Awareness", scope: "Perception or Occultism checks aimed at a spirit or haunt", auto: true, when: { checkTypes: ["skill"], subjects: ["perception", "occultism"], targetTraits: ["spirit", "haunt"] } }),
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Spirit Awareness", scope: "Perception or Occultism checks to notice, identify or understand spirits, haunts, possession or disturbances between the mortal and spirit worlds — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["perception", "occultism"], not: { targetTraits: ["spirit", "haunt"] } } })
      ]
    }
  }),
  ability({
    name: "Impact Absorption", sourceRace: "Miraku", traits: "Defence, Focus", usesPerDay: "1",
    description: md("**IMPACT ABSORPTION**\n\n**DEFENCE FOCUS**\n\n**Action** R\n\n**Trigger** a targeted physical attack damages you\n\nYou brace and allow your spirit to absorb the impact. Your Base DR increases by 1 against the triggering attack.\n\n*Use (before the damage is applied):* spends your reaction in combat and this ability's Focus use (Refocus restores it), and raises your Base DR by 1 until the end of the current turn — delete the effect once the triggering attack has resolved if the turn goes on. TRG Prime cannot yet offer a reaction before damage (core dependency D8), so you press it.")
  }),
  ability({
    name: "Predator's Pounce", sourceRace: "Miraku", traits: "Attack, Flourish, Focus, Movement", usesPerDay: "1",
    description: md("**PREDATOR'S POUNCE**\n\n**ATTACK FLOURISH FOCUS MOVEMENT**\n\n**Action** 2 AP\n\n**Requirements** you are able to Stride at least 10 feet towards a creature.\n\nStride at least 10 feet (maximum of your speed) and then make a melee Strike against the creature. The target cannot use reactions triggered by your movement.\n\n*Use:* target the creature first. Checks Flourish's once-a-turn limit, spends 2 AP and this ability's Focus use (Refocus restores it), and arms your next token move — up to your land Speed, no further AP. The card then offers the melee Strike with each melee weapon you have equipped; it costs no AP, since the Pounce bought it.")
  }),
  ability({
    name: "Treasure Sense", sourceRace: "Ryukari",
    description: md("**TREASURE SENSE**\n\nWhen you use the Search (Perception) action, you can detect the presence and general direction of precious metals within 30 feet. You cannot determine the exact location, quantity or value. The sense is blocked by 1 foot of stone, 1 inch of common metal or any thickness of lead.\n\n*Listed with your senses* as a tertiary sense. What it finds is the GM's to say."),
    flags: {
      creatureAbility: {
        printedTraits: "", printedAction: "", printedArea: "",
        // NO MODALITY: the sense names no organ, so none is guessed (TRG
        // Prime senses.mjs — Blight Sense's shape). A tertiary sense at a
        // tertiary sense's range, as Graham ruled for granted senses
        // (25 Aug 2026) and Pillars of Faith's Spirit Sense follows.
        derives: { sense: { category: "tertiary", note: "Precious metals: presence and general direction. Blocked by 1 ft of stone, 1 in of common metal or any lead." } },
        source: "Inner Tempest, Chapter 2 (Fuku)"
      }
    }
  }),
  // RYUKARI
  ability({
    name: "Scaled Hide", sourceRace: "Ryukari",
    description: md("**Scaled Hide:** Your draconic scales grant you a Base DR of 1."),
    effects: [baseDR(1, "Scaled Hide")]
  }),
  ability({
    name: "Dragon-Bound Resolve", sourceRace: "Ryukari",
    description: md("**Dragon-Bound Resolve:** You gain a +1 racial bonus to saving throws against fear and effects created by creatures of the Wyrm type.\n\n*Applied automatically* to a save against an effect with the Fear trait or one a Wyrm forced, and offered as a tick on a save whose source the roll cannot see. A Wyrm's fear effect counts once."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Dragon-Bound Resolve", scope: "Saving throws against fear", auto: true, when: { checkTypes: ["save"], traits: ["fear"] } }),
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Dragon-Bound Resolve", scope: "Saving throws against effects created by creatures of the Wyrm type", auto: true, when: { checkTypes: ["save"], sourceTypes: ["wyrm"], not: { traits: ["fear"] } } }),
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Dragon-Bound Resolve", scope: "Saving throws against fear, or an effect created by a Wyrm — tick if this save is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["fear"], sourceTypes: ["*"] } } })
      ]
    }
  }),
  // SCREE
  ability({
    name: "Chitinous Carapace", sourceRace: "Scree",
    description: md("**Chitinous Carapace:** Your exoskeleton grants you Base DR of 2."),
    effects: [baseDR(2, "Chitinous Carapace")]
  }),
  ability({
    name: "Compound Eyes", sourceRace: "Scree",
    description: md("**Compound Eyes:** You gain a +1 racial bonus to all visual Perception checks.\n\n*Offered* in every Perception roll's dialog — tick it when the check relies on sight."),
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Compound Eyes", scope: "Visual Perception checks — tick if this check relies on sight", auto: false, when: { checkTypes: ["skill"], subjects: ["perception"] } })
      ]
    }
  }),
  ability({
    name: "Wing Burst", sourceRace: "Scree", traits: "Flourish, Movement",
    description: md("**WING BURST**\n\n**FLOURISH MOVEMENT**\n\n**Action** 1 AP\n\nYou can Fly up to your Speed. You must end this movement on a surface capable of supporting you; otherwise, you fall normally.\n\n*Use:* checks Flourish's once-a-turn limit, spends 1 AP and arms your next token move — up to your land Speed, by any movement. Ending it in the air is a fall, made through the Falling action as usual.")
  }),
  ability({
    name: "Living Lantern", sourceRace: "Scree", traits: "Concentrate",
    description: md("You emit dim light within 10 feet. You can suppress or reactivate this light as a 1 AP action with the Concentrate trait.\n\n*The Hotaru's light is unnamed in the heritage; Lantern Signal and Spirit Beacon (Chapter 5) call it \"your Living Lantern\", the name used here (audit IT-M21).*\n\n*Use:* lights or suppresses it (1 AP in combat). While lit it is an effect on your sheet, your token glows dim to 10 feet, and the light level within 10 feet rises a step (as a carried light's does).")
  }),
  // TIANZHI
  ability({
    name: "Martial Affinity", sourceRace: "Tianzhi",
    description: md("**Martial Affinity:** You have a deep understanding of all things related to martials arts. You gain a +1 racial bonus to AB and DB when in any combat stance (GM discretion).\n\n*Applied automatically* while any stance is up — an effect entered through a feat or ability with the Stance trait (Graham, 20 Oct 2026: any stance): +1 racial on your attack checks, and +1 to your DB against every attack. Fight Defensively and Full Defence are not stances; their actions carry no Stance trait."),
    flags: {
      stanceConditionals: [
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Martial Affinity", scope: "Attack checks while you are in a stance", auto: true, when: { checkTypes: ["attack"] } })
      ],
      stanceDefenceDC: [{ dc: "defence", value: 1, label: "Martial Affinity", scope: "while in a stance" }]
    }
  }),
  ability({
    name: "Natural Chi", sourceRace: "Tianzhi",
    description: md("**Natural Chi:** You are attuned to the inner current that your people traditionally call chi. Select any one magical cantrip and choose one tradition available to that spell. You gain it as an innate spell with the Focus trait, using Wisdom as your magical ability score. The spell is detected, dispelled and otherwise treated according to its chosen magical tradition; chi itself has no separate rules effect.\n\n*Use:* choose the cantrip. It arrives as an innate spell with the Focus trait, cast with Wisdom; note which of its traditions you chose."),
    flags: { spellChoice: { label: "Any one magical cantrip", ppCost: 0, innate: true, castingAbility: "wisdom", note: "Natural Chi: an innate spell with the Focus trait, cast with Wisdom. It is detected and dispelled as the tradition you chose for it." } }
  })
];

/* ------------------------------------------------------------------ */
/* Natural attacks (the companions pack, where the core keeps them)     */
/* ------------------------------------------------------------------ */

export const NATURAL_ATTACKS = [
  naturalAttack({
    // AR IN THE TRAITS (0.6.1; found live): the system reads Armour Rending
    // from the trait line ("AR 1"), as every core weapon prints it.
    name: "Raptorial Blade", damage: "1d6", damageType: "slashing", traits: "Agile, Finesse, AR 1", armourRending: 1,
    description: "Raptorial Blade – Dam 1d6 S; FDC 5; Traits Agile, Finesse, AR 1\n\nThe Kamiri's blade-like forearms (Inner Tempest, Chapter 2)."
  }),
  naturalAttack({
    name: "Sting", damage: "1d6", damageType: "piercing", traits: "Agile, Finesse",
    description: "Sting – Dam 1d6 P; FDC 5; Traits Agile, Finesse\n\nThe Suzume's retractable abdominal stinger (Inner Tempest, Chapter 2)."
  })
];

/* ------------------------------------------------------------------ */
/* Races                                                                */
/* ------------------------------------------------------------------ */

/** Appendix, RACIAL AGE CATEGORIES. TRG Prime has no age fields; the row is printed. */
export const AGE_ROWS = {
  Miraku: "Adult 18; Middle Aged 110–140, Old 154–196, Venerable 187–238 (by Natural Lifespan); Natural Lifespan 220–280 years.",
  Ryukari: "Adult 25; Middle Aged 175+, Old 245+, Venerable 298+ (with a 350-year lifespan); Natural Lifespan 350+ years.",
  Scree: "Adult 10; Middle Aged 35–50, Old 49–70, Venerable 60–85 (by Natural Lifespan); Natural Lifespan 70–100 years.",
  Tianzhi: "Adult 20; Middle Aged 50; Old 71–90; Venerable 91+; Natural Lifespan not stated (audit IT-m6: the race entry has no age line)."
};

const raceDescription = (name, granted) =>
  `${md(text.races[name])}\n${md(`**AGE** (Appendix, Racial Age Categories)\n\n${AGE_ROWS[name]}`)}\n${md(granted)}`;

export const RACES = [
  race({
    name: "Miraku",
    description: raceDescription("Miraku", "*Granted when the race is added:* Nightvision, Fluid Form and Spirit Awareness as ability items; Miraku Lore and Spirit Lore as specialist skills."),
    abilityModifiers: "Dex +1, Wis +1, Cha +1, Con -1", speed: 30,
    coreLanguages: "Faechant, Low Tongue", additionalLanguages: "common, Wyrmish",
    specialistSkills: "Miraku Lore, Spirit Lore",
    racialAbilities: "Nightvision, Fluid Form, Spirit Awareness"
  }),
  race({
    name: "Ryukari",
    description: raceDescription("Ryukari", "*Granted when the race is added:* Nightvision, Scaled Hide (Base DR 1) and Dragon-Bound Resolve as ability items; Ryukari Lore and Dragon Lore as specialist skills."),
    abilityModifiers: "Str +1, Con +1, Cha +1, Dex -1", speed: 25,
    coreLanguages: "Low Tongue, Wyrmish", additionalLanguages: "common",
    specialistSkills: "Ryukari Lore, Dragon Lore",
    racialAbilities: "Nightvision, Scaled Hide, Dragon-Bound Resolve"
  }),
  race({
    name: "Scree",
    description: raceDescription("Scree", "*Granted when the race is added:* Chitinous Carapace (Base DR 2) and Compound Eyes as ability items; Scree Lore and Insect Lore as specialist skills. Scree Cant is an uncommon language in the language manager."),
    abilityModifiers: "Dex +1, Con +1, Int +1, Cha -1", speed: 30,
    coreLanguages: "Low Tongue, Scree Cant", additionalLanguages: "common, regional",
    specialistSkills: "Scree Lore, Insect Lore",
    racialAbilities: "Chitinous Carapace, Compound Eyes"
  }),
  race({
    name: "Tianzhi",
    description: raceDescription("Tianzhi", "*Granted when the race is added:* Martial Affinity, Nightvision and Natural Chi as ability items (use Natural Chi to choose its cantrip); Elemental Lore and Tianzhi Lore as specialist skills. Low Tongue comes from the race and the second language from the heritage: Aeolian (Fuukaze), Thanatos (Hikari), Ignic (Kasai), Aqualis (Suiryoku) or Gaian (Tsuchi), as Graham ruled on 21 October 2026."),
    abilityModifiers: "Dex +1, Wis +1", speed: 30,
    coreLanguages: "Low Tongue", additionalLanguages: "common, regional",
    specialistSkills: "Elemental Lore, Tianzhi Lore",
    racialAbilities: "Martial Affinity, Nightvision, Natural Chi"
  })
];

/* ------------------------------------------------------------------ */
/* Heritages                                                            */
/* ------------------------------------------------------------------ */

const heritageText = (name, extra) => `${md(text.heritages[name])}\n${md(extra)}`;

export const HERITAGES = [
  // MIRAKU
  heritage({
    name: "Kitsune", sourceRace: "Miraku",
    description: heritageText("Kitsune", "*Granted:* +1 racial Charisma, and Ghost Sound as an innate cantrip with the Focus trait, cast with Charisma."),
    abilityModifiers: "Cha +1",
    grantedSpells: "Ghost Sound",
    flags: { grantInnate: true, grantedSpellAbility: "charisma" }
  }),
  heritage({
    name: "Mujina", sourceRace: "Miraku",
    description: heritageText("Mujina", "*Granted:* Base DR 1, and Impact Absorption as an ability item."),
    racialAbilities: "Impact Absorption",
    effects: [baseDR(1, "Mujina's thick hide")]
  }),
  heritage({
    name: "Ren", sourceRace: "Miraku",
    description: heritageText("Ren", "*Applied automatically:* +5 feet to your land Speed, a +5 racial bonus to Initiative, and every fall entered through the Falling action is treated as 20 feet shorter (the card says so)."),
    effects: [
      landSpeed(5),
      initiative(5),
      declaredEffect("falls 20 ft shorter", "When calculating damage or other consequences from a fall, treat the distance fallen as 20 feet shorter.", { fallReduction: { value: 20, label: "Ren" } })
    ]
  }),
  heritage({
    name: "Byakko", sourceRace: "Miraku",
    description: heritageText("Byakko", "*Applied automatically:* a +1 racial bonus on Sneak and Demoralise checks. Predator's Pounce is granted as an ability item."),
    racialAbilities: "Predator's Pounce",
    flags: {
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Byakko", scope: "Sneak (Stealth) checks", auto: true, when: { checkTypes: ["skill"], actions: ["sneak"] } }),
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Byakko", scope: "Demoralise (Intimidate) checks", auto: true, when: { checkTypes: ["skill"], actions: ["demoralise"] } })
      ]
    }
  }),
  heritage({
    name: "Orochi", sourceRace: "Miraku",
    description: heritageText("Orochi", "*Applied automatically:* resistance to poison and a swim Speed of 15 feet."),
    effects: [(id, n) => resistanceEffect(id, n, "poison"), otherSpeed("swim", 15)]
  }),
  // RYUKARI
  heritage({
    name: "Shinryu", sourceRace: "Ryukari",
    description: heritageText("Shinryu", "*Not automated:* TRG Prime's movement does not know what is under a token. Stride across open air as the text says; a move that does not end on a surface is a fall, made through the Falling action."),
    effects: [(id, n) => noteEffect(id, `${n}: celestial current`, "Whenever you Stride, you may move across unsupported air as though it were solid ground. Begin and end the movement on a surface that can support you, or you fall normally.")]
  }),
  heritage({
    name: "Zennyo", sourceRace: "Ryukari",
    description: heritageText("Zennyo", "*Applied automatically:* a swim Speed of 20 feet, and you breathe water, so holding your breath underwater never starts."),
    effects: [otherSpeed("swim", 20)],
    flags: { creatureAbility: { derives: { breathesWater: true } } }
  }),
  heritage({
    name: "Fuku", sourceRace: "Ryukari",
    description: heritageText("Fuku", "*Applied automatically:* your Conviction Pool's maximum rises by 1; the point is given when the heritage is added and taken back if it is removed. Treasure Sense is granted as an ability item."),
    racialAbilities: "Treasure Sense",
    flags: { convictionPool: 1 }
  }),
  heritage({
    name: "Kura", sourceRace: "Ryukari",
    description: heritageText("Kura", "*Granted:* Darkvision as an ability item, and a +1 racial bonus to all Stealth checks."),
    racialAbilities: "Darkvision",
    effects: [(id, n) => racialSkillEffect(id, n, ["Stealth"], 1)]
  }),
  heritage({
    name: "Zenki", sourceRace: "Ryukari",
    description: heritageText("Zenki", "*Applied automatically:* an Exhaustion check called for Extreme Heat is not made (no damage, no Fatigue). The +1 racial bonus is *offered* on Crafting checks; tick it when the work involves metal, stone or a forge."),
    flags: {
      creatureAbility: { derives: { heatEnvironmentImmune: true } },
      conditionals: [
        conditional({ kind: "modifier", value: 1, type: "racial", label: "Zenki", scope: "Crafting checks involving metal, stone or a forge — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["crafting"] } })
      ]
    }
  }),
  // SCREE
  heritage({
    name: "Kabuto", sourceRace: "Scree",
    description: heritageText("Kabuto", "*Applied automatically:* Base DR +1 (3 with Chitinous Carapace; audit IT-m5 reads \"base natural DR\" and \"Base DR\" as one statistic), land Speed −5 feet, and +50 lb to your weight allowance (5 points of carrying Strength, beside Hauler and a Backpack)."),
    effects: [
      (id, n) => changesEffect(id, `${n}: Base DR +1`,
        [{ key: "system.combat.naturalArmourBase.natural", mode: 2, value: "1", priority: 30 }],
        "Your base natural DR increases by 1."),
      landSpeed(-5)
    ],
    flags: { carryStrength: 5 }
  }),
  heritage({
    name: "Joro", sourceRace: "Scree",
    description: heritageText("Joro", "*Applied automatically:* a climb Speed of 20 feet. Crossing a ceiling with a hand free is yours to declare."),
    effects: [otherSpeed("climb", 20), (id, n) => noteEffect(id, `${n}: ceilings`, "You can traverse ceilings while you have at least one hand free.")]
  }),
  heritage({
    name: "Kamiri", sourceRace: "Scree",
    description: heritageText("Kamiri", "*Granted:* a +5 racial bonus to Initiative, and the Raptorial Blade natural attack as a weapon."),
    grantedWeapons: "Raptorial Blade",
    effects: [initiative(5)]
  }),
  heritage({
    name: "Suzume", sourceRace: "Scree",
    description: heritageText("Suzume", "*Granted:* the Sting natural attack as a weapon, and Wing Burst as an ability item."),
    grantedWeapons: "Sting",
    racialAbilities: "Wing Burst"
  }),
  heritage({
    name: "Hotaru", sourceRace: "Scree",
    description: heritageText("Hotaru", "*Granted:* Living Lantern (the light) as an ability item, and Guidance as an innate cantrip with the Focus trait, cast with Wisdom."),
    racialAbilities: "Living Lantern",
    grantedSpells: "Guidance",
    flags: { grantInnate: true, grantedSpellAbility: "wisdom" }
  }),
  // TIANZHI
  heritage({
    name: "Fuukaze", sourceRace: "Tianzhi", coreLanguages: TIANZHI_LANGUAGES.Fuukaze,
    description: heritageText("Fuukaze", tianzhiLanguage("Fuukaze") + "*Element:* Wind (electricity). *Applied automatically:* a +2 racial bonus to Acrobatics and +5 feet to your land Speed."),
    effects: [(id, n) => racialSkillEffect(id, n, ["Acrobatics"], 2), landSpeed(5)],
    flags: element("Fuukaze")
  }),
  heritage({
    name: "Hikari", sourceRace: "Tianzhi", coreLanguages: TIANZHI_LANGUAGES.Hikari,
    description: heritageText("Hikari", tianzhiLanguage("Hikari") + "*Element:* Spirit (essence). *Granted:* Stabilise as an innate cantrip with the Focus trait, cast with Wisdom. Advantage is *applied automatically* to saves against effects with the Emotion or Fear trait, and offered as a tick on a save whose source the roll cannot see."),
    grantedSpells: "Stabilise",
    flags: {
      ...element("Hikari"),
      grantInnate: true, grantedSpellAbility: "wisdom",
      conditionals: [
        conditional({ kind: "advantage", label: "Hikari", scope: "Saving throws against emotion and fear effects", auto: true, when: { checkTypes: ["save"], traits: ["emotion", "fear"] } }),
        conditional({ kind: "advantage", label: "Hikari", scope: "Saving throws against an emotion or fear effect that carries neither trait — tick if this save is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["emotion", "fear"] } } })
      ]
    }
  }),
  heritage({
    name: "Kasai", sourceRace: "Tianzhi", coreLanguages: TIANZHI_LANGUAGES.Kasai,
    description: heritageText("Kasai", tianzhiLanguage("Kasai") + "*Element:* Flame (fire). *Granted:* resistance to fire, and Orb of Fire as an innate cantrip with the Focus trait, cast with Wisdom."),
    grantedSpells: "Orb Of Fire",
    effects: [(id, n) => resistanceEffect(id, n, "fire")],
    flags: { ...element("Kasai"), grantInnate: true, grantedSpellAbility: "wisdom" }
  }),
  heritage({
    name: "Suiryoku", sourceRace: "Tianzhi", coreLanguages: TIANZHI_LANGUAGES.Suiryoku,
    description: heritageText("Suiryoku", tianzhiLanguage("Suiryoku") + "*Element:* Water (cold). *Applied automatically:* a swim Speed of 20 feet, and five times the breath when you hold it underwater."),
    effects: [otherSpeed("swim", 20)],
    flags: { ...element("Suiryoku"), creatureAbility: { derives: { breathMultiplier: 5 } } }
  }),
  heritage({
    name: "Tsuchi", sourceRace: "Tianzhi", coreLanguages: TIANZHI_LANGUAGES.Tsuchi,
    description: heritageText("Tsuchi", tianzhiLanguage("Tsuchi") + "*Element:* Earth (acid). *Applied automatically:* a +2 racial bonus to Crafting, and to Create checks made with any other skill. Advantage is *offered* on your own checks and saves to avoid being knocked prone or moved against your will; tick it when the roll is one. *Applied automatically:* a Shove or Trip against you is rolled at disadvantage, because you roll nothing against it (Graham's ruling of 21 October 2026); the attacker's card says so."),
    effects: [(id, n) => racialSkillEffect(id, n, ["Crafting"], 2)],
    flags: {
      ...element("Tsuchi"),
      conditionals: [
        conditional({ kind: "modifier", value: 2, type: "racial", label: "Tsuchi", scope: "Create checks made with a skill other than Crafting", auto: true, when: { checkTypes: ["skill"], actions: ["create"], not: { subjects: ["crafting"] } } }),
        conditional({ kind: "advantage", label: "Tsuchi", scope: "Checks and saving throws to avoid being knocked prone or moved against your will — tick if this roll is one", auto: false, when: { checkTypes: ["skill", "save", "attribute"] } })
      ],
      // TRG Prime 3.665.0: a defender's row that gives the attacker's check
      // disadvantage. A Shove or a Trip is rolled against your static DC, so
      // the book's advantage is turned round onto the attacker (Graham).
      defenceDC: [{ kind: "disadvantage", label: "Tsuchi", scope: "a Tsuchi resists being knocked prone or moved against their will", when: { actions: ["shoveAttack", "tripAttack"] } }]
    }
  })
];

/* ------------------------------------------------------------------ */
/* Backgrounds (Chapter 2; wealth from Chapter 6's table)               */
/* ------------------------------------------------------------------ */

/** Chapter 6, BACKGROUND WEALTH. */
export const BACKGROUND_WEALTH = {
  "Ancestral Guardian": 0, "Astral Scholar": 1, "Chi Scholar": 0, "Elemental Guardian": 0,
  "Elemental Harmonist": 0, "Enigmatic Artisan": 2, "Grey Seeker": 1, "Nomad": -1,
  "Radiant Wanderer": 0, "Spirit Warrior": 0, "Spiritwalker": -1
};

/**
 * The book prints most specialist skills as "Lore (Astral)"; TRG Prime's
 * own backgrounds name them "Astral Lore". The core form is used so the
 * Lore reads like every other on the sheet; the book's form stays in the
 * description.
 */
export const SPECIALIST_NAMES = {
  "Ancestor Lore": "Ancestor Lore", "Lore (Astral)": "Astral Lore", "Lore (Chi)": "Chi Lore",
  "Lore (Elemental)": "Elemental Lore", "Lore (Magic Crafting)": "Magic Crafting Lore", "Lore (The Grey)": "Grey Lore",
  "Lore (Nomads)": "Nomad Lore", "Lore (The Radiance)": "Radiance Lore", "Lore (Spirits)": "Spirit Lore"
};

/**
 * A Lore the race already gives (Graham's rulings of 21 October 2026): a
 * Miraku Spirit Warrior or Spiritwalker would gain Spirit Lore twice, and a
 * Tianzhi Elemental Guardian or Elemental Harmonist Elemental Lore twice, so
 * the background offers another Lore instead. TRG Prime 3.665.0 asks for it
 * on the background's Use, only while another item supplies the same Lore —
 * whatever the race; the race named here is only for the description.
 */
export const LORE_ALTERNATIVE_BACKGROUNDS = Object.freeze({
  "Spirit Warrior": "Miraku", "Spiritwalker": "Miraku",
  "Elemental Guardian": "Tianzhi", "Elemental Harmonist": "Tianzhi"
});
export const loreAlternativeFor = (lore) => Object.freeze({
  label: "another Lore",
  prompt: `Your race already gives you ${lore} — name another Lore for this background`,
  placeholder: "e.g. Ancestor Lore",
  suffix: "Lore"
});

export const BACKGROUNDS = Object.entries(text.backgrounds).map(([name, b]) => {
  if (!(name in BACKGROUND_WEALTH)) throw new Error(`No Chapter 6 wealth row for background "${name}"`);
  const specialist = SPECIALIST_NAMES[b.specialist];
  if (!specialist) throw new Error(`No specialist-skill name for "${b.specialist}"`);
  const loreRace = LORE_ALTERNATIVE_BACKGROUNDS[name] ?? null;
  const printed = md(`${b.description}\n\n**BONUS FEAT**\n\n${b.feat}\n\n**SKILL BONUSES**\n\n${b.skills}\n\n**SPECIALIST SKILL**\n\n${b.specialist}${specialist !== b.specialist ? ` (on your sheet as ${specialist})` : ""}\n\n**WEALTH**\n\n${BACKGROUND_WEALTH[name]}`);
  return background({
    name,
    description: loreRace
      ? printed + md(`*Automated:* if your race already gives you ${specialist} (a ${loreRace} does), Apply Grants says so and this background's **Use** asks you to name another Lore instead (Graham's ruling, 21 October 2026).`)
      : printed,
    grantedFeats: b.feat,
    skillBonuses: b.skills,
    specialistSkill: specialist,
    wealth: String(BACKGROUND_WEALTH[name]),
    flags: loreRace ? { specialistAlternative: { ...loreAlternativeFor(specialist) }, itAutomation: "loreAlternative" } : {}
  });
});

/* ------------------------------------------------------------------ */
/* The pack layout                                                      */
/* ------------------------------------------------------------------ */

export const PACKS = [
  { name: "it-races", label: "Inner Tempest: Races", extends: "races", docs: RACES },
  { name: "it-heritages", label: "Inner Tempest: Heritages", extends: "heritages", docs: HERITAGES },
  { name: "it-backgrounds", label: "Inner Tempest: Backgrounds", extends: "backgrounds", docs: BACKGROUNDS },
  { name: "it-abilities", label: "Inner Tempest: Abilities", extends: "abilities", docs: [...ABILITIES, ...BLOCK3_ABILITIES, ...BLOCK4_ABILITIES, ...BLOCK6_ABILITIES] },
  // Block 5 (0.6.0): the 47 racial feats of Chapter 5.
  { name: "it-feats", label: "Inner Tempest: Feats", extends: "feats", docs: [...GENERAL_FEATS, ...BLOCK3_FEATS, ...BLOCK4_FEATS, ...BLOCK5_FEATS, ...BLOCK6_FEATS] },
  // Block 3 (0.4.0): the Disciple and the Mystic, and the Grimoire spells
  // the Mystical Disciplines grant.
  { name: "it-classes", label: "Inner Tempest: Classes", extends: "classes", docs: [...BLOCK3_CLASSES, ...BLOCK4_CLASSES] },
  // Block 5: Water Bolt (Graham's B5-1) and Draconic Armament's Bite and Claw.
  { name: "it-spells", label: "Inner Tempest: Spells", extends: "spells", docs: [...BLOCK3_SPELLS, ...BLOCK5_SPELLS] },
  { name: "it-companions", label: "Inner Tempest: Natural Attacks", extends: "companions", docs: [...NATURAL_ATTACKS, ...BLOCK5_NATURAL_ATTACKS] },
  // 0.5.1: Chapter 6's sixteen weapons (Graham, 23 October 2026).
  { name: "it-weapons", label: "Inner Tempest: Weapons", extends: "weapons", docs: CHAPTER6_WEAPONS }
];
