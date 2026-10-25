/**
 * Inner Tempest — Block 3 (0.4.0): the Disciple and the Mystic, the four
 * Monastic Paths, the five Mystical Disciplines and their abilities, Inner
 * Discipline and its three techniques, the eleven Technique class feats and
 * the eleven Grimoire spells the disciplines grant.
 *
 * Transcribed from the sourcebook (v1.2) as ruled by Graham on 20, 21 and
 * 22 October 2026 (docs/INNER_TEMPEST_RULINGS_*.md, docs/INNER_TEMPEST_
 * BLOCK3_AUDIT.md). Each item's description is the book's text followed by
 * what TRG Prime does with it: *Automated*, or *Not automated* and why.
 *
 * FLAGS are written under the system's scope (`flags.trg-prime`), where TRG
 * Prime reads its declarations: `unarmedDamage` and `statBonuses` (3.667.0),
 * `focusExtraUses` (3.664.0), `convictionPool` (3.664.0),
 * `attackRerollConviction` (3.667.0), `grantInnate`, `abilityChoices`. The
 * module's own keys sit beside them: `itPath` (a Monastic Path's tradition,
 * ability and class skill), `itPathMagic` (a grant whose spells use the
 * Path), `itAutomation` (which Use handler acts).
 */
import { classItem, classAbility, ability, feat, spell, classSkillEffect } from "./builders.mjs";
import { md } from "./markdown.mjs";

const auto = (printed, how) => `${md(printed)}\n${md(`*Automated:* ${how}`)}`;
const partly = (printed, how) => `${md(printed)}\n${md(`*Partly automated:* ${how}`)}`;
const manual = (printed, why) => `${md(printed)}\n${md(`*Not automated:* ${why}`)}`;

/* ------------------------------------------------------------------ */
/* The two class tables (Chapter 3), row by row from the book           */
/* ------------------------------------------------------------------ */

/** [BAB, BDB, Fort, Ref, Will, Bonus Feats] per level, as printed. */
const DISCIPLE_TABLE = [
  [1, 1, 3, 6, 3, 1], [2, 2, 4, 7, 4, 1], [3, 3, 5, 8, 5, 2], [4, 4, 6, 9, 6, 2], [5, 5, 7, 10, 7, 2],
  [6, 6, 8, 11, 8, 3], [7, 7, 9, 12, 9, 3], [8, 8, 10, 13, 10, 3], [9, 9, 11, 14, 11, 4], [10, 10, 12, 15, 12, 4],
  [11, 11, 13, 16, 13, 4], [12, 12, 14, 17, 14, 5], [13, 13, 15, 18, 15, 5], [14, 14, 16, 19, 16, 5], [15, 15, 17, 20, 17, 6],
  [16, 16, 18, 21, 18, 6], [17, 17, 19, 22, 19, 6], [18, 18, 20, 23, 20, 7], [19, 19, 21, 24, 21, 7], [20, 20, 22, 25, 22, 7]
];
const MYSTIC_TABLE = [
  [0, 0, 3, 3, 6, 1], [1, 1, 4, 4, 7, 1], [2, 2, 5, 5, 8, 2], [3, 3, 6, 6, 9, 2], [3, 3, 7, 7, 10, 2],
  [4, 4, 8, 8, 11, 3], [5, 5, 9, 9, 12, 3], [6, 6, 10, 10, 13, 3], [6, 6, 11, 11, 14, 4], [7, 7, 12, 12, 15, 4],
  [8, 8, 13, 13, 16, 4], [9, 9, 14, 14, 17, 5], [9, 9, 15, 15, 18, 5], [10, 10, 16, 16, 19, 5], [11, 11, 17, 17, 20, 6],
  [12, 12, 18, 18, 21, 6], [12, 12, 19, 19, 22, 6], [13, 13, 20, 20, 23, 7], [14, 14, 21, 21, 24, 7], [15, 15, 22, 22, 25, 7]
];
/** The builder's row: [bab, bdb, fort, ref, will, bonusFeats, casterLevel, pp, bsb]. No spellcasting progression. */
const rows = (table) => table.map((r) => [...r, 0, 0, 0]);

export const DISCIPLE_ABILITIES = "1: Powerful Fists, 1: Disciple's Dodge, 1: Disciple's Resolve, 1: Flurry of Blows, 1: Deep Focus, 1: Monastic Path, 4: Incredible Movement";
export const MYSTIC_ABILITIES = "1: Alter the Thread, 1: Mystical Discipline, 1: Mystical Power, 1: Mystical Resolve, 1: Monastic Path";

export const CLASSES = [
  classItem({
    name: "Disciple",
    classType: "Martial",
    keyAbilityScores: "Wisdom (min +2), Dexterity, Strength",
    classSkills: "Acrobatics, Artistry, Athletics, Climbing, Culture, Meditation, Mental Focus, Perception, Sense Motive, Stealth",
    proficiencies: "You may use all simple weapons and any weapons that have the monastic trait (see chapter 6).",
    hitPoints: 10,
    skillPoints: 6,
    grantedFeats: "1: Inner Discipline",
    classAbilities: DISCIPLE_ABILITIES,
    wealth: "-2",
    table: rows(DISCIPLE_TABLE),
    description: md("**CLASS TYPE** Martial\n\nFor you, martial skill transcends the battlefield it is a lifestyle, a doctrine, and a state of mind. You search out methods of battle beyond swords and shields, finding weapons within themselves just as capable of crippling or killing as any blade. You elevate your body to become a weapon of war, from battle-minded ascetic to self-taught brawler. You tread the path of discipline, to discover within yourself not what you are, but what you are meant to be.\n\nYou excel at overcoming even the most daunting perils, striking where it’s least expected, and taking advantage of enemy vulnerabilities. Fleet of foot and skilled in combat, you can navigate any battlefield with ease, aiding allies wherever you are needed most.\n\n**MAGICAL TRADITION** You do not gain a normal spellcasting progression. Your Monastic Path determines the magical tradition and magical ability score of any innate spells or magical techniques you gain from Disciple abilities or feats."),
    flags: {
      bonusFeatsNote: "You gain the Inner Discipline feat and may select any one additional class feat with the Technique trait. At 3rd level and then every 3 levels thereafter you may select an additional class feat. This class feat must be one for which you meet the prerequisites or match the appropriate class trait (Martial or Disciple).",
      minimumAbilities: { wisdom: 2 }
    }
  }),
  classItem({
    name: "Mystic",
    classType: "Adept",
    keyAbilityScores: "Wisdom (min +2), Dexterity, Constitution",
    classSkills: "Acrobatics, Artistry, Athletics, Climbing, Culture, Medicine, Meditation, Mental Focus, Perception, Power Manipulation, Sense Motive",
    proficiencies: "You may use all simple weapons, monastic weapons and light armour.",
    hitPoints: 8,
    skillPoints: 8,
    grantedFeats: "1: Inner Discipline",
    classAbilities: MYSTIC_ABILITIES,
    wealth: "-1",
    table: rows(MYSTIC_TABLE),
    description: md("**CLASS TYPE** Adept\n\nMystics follow ancient traditions of meditation, spiritual awareness and inner discipline. Many cultures describe the sensations produced by these practices as chi: a vital current linking body, mind and spirit. In rules terms, however, a Mystic does not possess a chi pool. Their extraordinary abilities are represented by techniques with the Focus trait and by innate spells.\n\nUnlike conventional spellcasters, Mystics do not prepare spells or spend PP on the magic granted by their class. Their meditative disciplines awaken magic as an innate part of the self. These innate spells use the normal TRG Prime rules for innate magic and become expended after use when they possess the Focus trait.\n\n**MAGICAL TRADITION** Your class magic is innate rather than conventional spellcasting. The magical tradition and magical ability score of your Mystic spells are determined by your Monastic Path."),
    flags: {
      bonusFeatsNote: "You gain the Inner Discipline feat and may select any one additional class feat with the Technique trait. At 3rd level and then every 3 levels thereafter you may select an additional class feat. This class feat must be one for which you meet the prerequisites or match the appropriate class trait (Adept or Mystic).",
      minimumAbilities: { wisdom: 2 }
    }
  })
];

/* ------------------------------------------------------------------ */
/* The four Monastic Paths (Chapter 3 and Chapter 7)                    */
/* ------------------------------------------------------------------ */

export const PATHS = Object.freeze({
  Devoted: { tradition: "divinity", ability: "wisdom", skill: "Religion", recall: "Religion is used for Recall Knowledge and other checks concerning the path's divine magic.", text: "You follow the path of the Devoted, interpreting inner discipline through faith, duty and divine harmony. Through meditation and disciplined practice you learn to express supernatural effects as blessings, healing, protection and righteous force. Some Devoted traditions call this inner current chi, while others understand it as devotion made manifest." },
  Illuminator: { tradition: "ethereal", ability: "charisma", skill: "Occultism", recall: "Occultism is used for Recall Knowledge and other checks concerning the path's ethereal magic.", text: "As an Illuminator, you turn your discipline inward, exploring thought, perception and the mysteries of the ethereal. Through meditation and intense mental control you learn to shield the mind, perceive hidden truths, influence thought and project awareness beyond the limits of the body." },
  Primal: { tradition: "verdant", ability: "constitution", skill: "Nature", recall: "Nature is used for Recall Knowledge and other checks concerning the path's verdant magic.", text: "You embrace the path of the Primal, forging a disciplined connection with the living world. Your practices echo the rhythms of element, plant and creature, allowing supernatural abilities to manifest as expressions of natural balance rather than as a separate reserve of power." },
  Transcendent: { tradition: "arcane", ability: "intelligence", skill: "Arcana", recall: "Arcana is used for Recall Knowledge and other checks concerning the path's arcane magic.", text: "You are a Transcendent who approaches inner discipline through arcane principles. Meditation becomes a method of imposing order upon supernatural forces, allowing you to produce effects that resemble arcane magic through precise thought, movement and understanding." }
});

const title = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const PATH_ITEMS = Object.entries(PATHS).map(([name, p]) => {
  const item = ability({
    name,
    // Chapter 3's two paragraphs, then Chapter 7's line for the Path.
    description: auto(`${p.text}\n\nYour magical tradition is ${p.tradition}, your magical ability score is ${title(p.ability)}, and you gain ${p.skill} as a class skill.\n\nMagical Tradition: ${p.tradition}. Magical Ability Score: ${title(p.ability)}. ${p.recall}`,
      `${p.skill} becomes a class skill. Innate spells your Mystic class and disciplines grant, and the magical techniques that name your Monastic Path, are cast as ${p.tradition} with ${title(p.ability)}; a technique that uses your Technique Save DC uses 10 + ${title(p.ability)} + your level.`),
    flags: { itPath: { tradition: p.tradition, ability: p.ability, skill: p.skill } },
    effects: [(id, n) => classSkillEffect(id, n, [p.skill])],
    img: "icons/svg/sun.svg"
  });
  item.system.category = "Monastic Path";
  return item;
});

/* ------------------------------------------------------------------ */
/* Disciple class abilities                                             */
/* ------------------------------------------------------------------ */

const DISCIPLE = "Disciple";
const MYSTIC = "Mystic";
const PATH_CHOICES = Object.keys(PATHS);

const DISCIPLE_ITEMS = [
  classAbility({
    name: "Powerful Fists", sourceClass: DISCIPLE,
    description: auto("You know how to wield your fists as deadly weapons. The damage of your unarmed attacks is 1d6 rather than the usual 1d4 inflicted by an unarmed attack. Additionally, your unarmed attacks gain the versatile bludgeoning trait.\n\nAs you become more experienced, the amount of damage that you inflict with your unarmed strikes also increases. When your BAB becomes 3 and for every 3 it increases thereafter you inflict an additional point of total unarmed damage.\n\nBe aware that this is total unarmed damage and not base. Your base damage die still increase in the usual way.\n\nFinally, your unarmed strikes also gain the ability to overcome various damage types as your combat prowess increases. When your BAB reaches 3, your strikes class as magical. When your BAB reaches 8 your unarmed strikes are treated as cold iron and silver and at BAB 16 they are treated as adamantine.",
      "your Unarmed Strike rolls 1d6 and offers bludgeoning in place of subdual (Versatile B). Every Strike that counts as unarmed (the fists, or a weapon with the Monastic trait) adds +1 total damage per 3 BAB, counts as magical from BAB 3, as cold iron and silver from BAB 8 and as adamantine from BAB 16."),
    flags: { unarmedDamage: { die: "1d6", versatile: "B", perBAB: { every: 3, value: 1 }, countsAs: { magical: 3, "cold iron": 8, silver: 8, adamantine: 16 }, label: "Powerful Fists" } }
  }),
  classAbility({
    name: "Disciple's Dodge", sourceClass: DISCIPLE,
    description: auto("At 1st level you may add your Wisdom ability score as a dodge bonus to your Defence (DB). This bonus is only applied if you are unencumbered and wearing no armour.",
      "your Wisdom is added to your DB as a dodge bonus while you wear no armour and carry no encumbering load. A shield does not stop it. Flat-Footed removes it, as it removes every dodge bonus."),
    flags: { statBonuses: [{ target: "defence", type: "dodge", ability: "wisdom", when: { unarmoured: true, unencumbered: true }, label: "Disciple's Dodge" }] }
  }),
  classAbility({
    name: "Disciple's Resolve", sourceClass: DISCIPLE,
    description: auto("Your training has served you well and gives you that slight edge over others. You may increase your conviction pool and conviction points by 1.", "+1 to your conviction pool and points."),
    flags: { convictionPool: 1 }
  }),
  classAbility({
    name: "Flurry of Blows", sourceClass: DISCIPLE, traits: "Flourish",
    description: auto("**FLOURISH** **Action** 1 AP\n\nMake two unarmed Strikes. If both hit the same creature, apply DR, resistance and weakness only once. Apply your multiple attack penalty to the Strikes normally.\n\nBe aware that you may only inflict one critical injury when using this ability, although you still gain additional critical damage from both strikes.",
      "press Use: 1 AP (a Flourish, once a turn), then two Strikes with your fists or a Monastic weapon, each at your current multiple attack penalty. A creature hit twice meets its DR once, on the first hit; resistance and weakness are applied to each hit, which is the same as once on the total. After one critical injury, a later critical keeps its bonus dice and rolls no injury. If your Disciplined Flurry is ready and you have a reaction, you are asked whether to use it for a third Strike."),
    flags: { itAutomation: "flurryOfBlows" }
  }),
  classAbility({
    name: "Deep Focus", sourceClass: DISCIPLE,
    description: auto("Your training allows you to sustain the concentration required for your techniques longer than others. Each technique you possess with the Focus trait can be used one additional time before it becomes expended and must be restored with Refocus (Mental Focus).\n\nEach technique tracks its uses separately. When you successfully Refocus a technique, all of the uses granted to that technique by Deep Focus are restored.",
      "every ability with both the Focus and Technique traits has one more use, and a successful Refocus restores all of its uses. Spells are not techniques: innate spells keep one use."),
    flags: { focusExtraUses: [{ value: 1, traits: ["technique"], restoresAll: true, label: "Deep Focus" }] }
  }),
  classAbility({
    name: "Monastic Path", sourceClass: DISCIPLE,
    description: auto("As a Disciple you must select one of the Monastic Paths detailed at the end of this chapter. Your Monastic Path determines the magical tradition and magical ability score used by any innate spells or explicitly magical techniques you gain through Inner Tempest, and also grants you a class skill.",
      "press Use to choose Devoted, Illuminator, Primal or Transcendent; the Path is added to your sheet with its class skill."),
    flags: { abilityChoices: [...PATH_CHOICES] }
  }),
  classAbility({
    name: "Incredible Movement", sourceClass: DISCIPLE, level: 4,
    description: auto("At 4th level you learn to move like the wind. You gain a +10-foot status bonus to your Speed whenever you’re not wearing armour. The bonus increases by 5 feet at 10th level and every 6 levels thereafter.",
      "+10 ft status bonus to your land Speed while you wear no armour; +15 ft at 10th level and +20 ft at 16th."),
    flags: { statBonuses: [{ target: "speed", type: "status", byLevel: [{ level: 4, value: 10 }, { level: 10, value: 15 }, { level: 16, value: 20 }], when: { unarmoured: true }, label: "Incredible Movement" }] }
  })
];

/* ------------------------------------------------------------------ */
/* Mystic class abilities                                               */
/* ------------------------------------------------------------------ */

export const DISCIPLINE_NAMES = ["Inner Flame", "Dragon Soul", "Still Mind", "Starborn Flow", "Thousand Reflections"];

const MYSTIC_ITEMS = [
  classAbility({
    name: "Alter the Thread", sourceClass: MYSTIC,
    description: auto("You have the ability to use your fortune and insight to great effect when avoiding harm. You may use Conviction to force an opponent to reroll an attack check against you.\n\nBe aware that a Chaos result cannot be rerolled.",
      "when an attack roll is made against you (a Strike or a spell attack), you are asked once it is rolled and before it resolves whether to spend 1 conviction; on a yes the attacker rolls again and the new roll stands (Graham's ruling B3-5). It counts as your one conviction point this round. Not offered on a Chaos result, or when you have no conviction to spend."),
    flags: { attackRerollConviction: { label: "Alter the Thread" } }
  }),
  classAbility({
    name: "Mystical Discipline", sourceClass: MYSTIC,
    description: auto("At 1st level, you must select one of the mystical disciplines. This discipline is in addition to your Monastic Path (see below). It represents the way in which your inner discipline manifests and determines your special ability and bonus innate spells. Mystical Disciplines are explained in more detail below.\n\n**MYSTICAL DISCIPLINES** You select a mystical discipline from the below list. Your mystical discipline grants you the following abilities:\n\n**SPECIAL ABILITY** Your mystical discipline will grant you a unique special ability.\n\n**ADDITIONAL SPELLS** At 1st level you gain the listed bonus cantrip and base PP 2 spell as innate spells with the Focus trait. At 3rd level and then every two levels thereafter, you gain the next listed spell in the same way. The PP shown in the table is the spell's normal base PP value; it is not a cost you pay to cast it.\n\nBe aware that any spell marked with an asterisk is a new spell which is detailed later in this book.",
      "press Use to choose Inner Flame, Dragon Soul, Still Mind, Starborn Flow or Thousand Reflections. The discipline arrives with its special ability, and its spells arrive as innate spells with the Focus trait as you reach their levels, cast with your Monastic Path's tradition and ability."),
    flags: { abilityChoices: [...DISCIPLINE_NAMES] }
  }),
  classAbility({
    name: "Mystical Power", sourceClass: MYSTIC,
    description: auto("Just like other adepts, you may learn to harness magic, but the spells granted by this class are innate spells rather than prepared or spontaneous spells. They follow the rules in Chapter 7 and the TRG Core Rulebook.\n\nAt 1st level you may select any two cantrips available to the magical tradition of your Monastic Path and any two spells with a base PP of 2. You gain each selected spell as an innate spell with the Focus trait. You do not memorise these spells and they cost no PP to cast. Each time you gain a level, you may add one additional eligible spell to your innate repertoire.\n\nBe aware that an eligible spell is one from your Monastic Path's tradition whose base PP is no greater than your Mystic level.\n\nYou also gain additional innate spells from your Mystical Discipline, and you may expand your repertoire by taking the Mystic Essence feat (see Chapter 5). Each spell is tracked and Refocused separately.",
      "press Use to pick your spells. The picker lists your Monastic Path's spells and counts what you are owed: two cantrips and two base PP 2 spells at 1st level, then one eligible spell (base PP no greater than your level) for each level after. Each arrives as an innate spell with the Focus trait, cast with your Path's tradition and ability. Your 1st-level PP 2 picks may be cast from 1st level (Graham's ruling B3-2). Choose your Monastic Path first."),
    flags: { itAutomation: "mysticalPower" }
  }),
  classAbility({
    name: "Mystical Resolve", sourceClass: MYSTIC,
    description: auto("Your insight and ability to sense what is coming gives you an edge. You may increase your conviction pool and conviction points by 1.", "+1 to your conviction pool and points."),
    flags: { convictionPool: 1 }
  }),
  classAbility({
    name: "Monastic Path", sourceClass: MYSTIC,
    description: auto("As a Mystic you must select one of the Monastic Paths detailed at the end of this chapter. Your Monastic Path determines the magical tradition and magical ability score of your Mystic innate spells and any explicitly magical techniques you learn, and also grants you a class skill.",
      "press Use to choose Devoted, Illuminator, Primal or Transcendent; the Path is added to your sheet with its class skill."),
    flags: { abilityChoices: [...PATH_CHOICES] }
  })
];

/* ------------------------------------------------------------------ */
/* The five Mystical Disciplines                                        */
/* ------------------------------------------------------------------ */

/** Each discipline's spells by Mystic level, in TRG Prime's spell names. */
export const DISCIPLINE_SPELLS = Object.freeze({
  "Inner Flame": [[1, "Orb Of Fire"], [1, "Circle Of Warmth"], [3, "Fire Bolt"], [5, "Fireball"], [7, "Flame Arrow"], [9, "Burning Stride"], [11, "Rise of the Phoenix"], [13, "Aura of Heat"], [15, "Incendiary Cloud"]],
  "Dragon Soul": [[1, "Light"], [1, "Mage Armour"], [3, "Resist Energy"], [5, "Fly"], [7, "Dragon Fear"], [9, "Breath of the Dragon"], [11, "Shape Of The Wyrm"], [13, "True Seeing"], [15, "Wind Walk"]],
  "Still Mind": [[1, "Guidance"], [1, "Anticipate Attack"], [3, "Reflective Mind"], [5, "Stun Relief"], [7, "Nondetection"], [9, "Serene Defence"], [11, "Shared Will"], [13, "Spell Turning"], [15, "Mind Blank"]],
  "Starborn Flow": [[1, "Burst of Speed"], [1, "True Strike"], [3, "Air Step"], [5, "Misty Step"], [7, "Timeless Motion"], [9, "Shadow Walk"], [11, "Teleport"], [13, "Elude Time"], [15, "Moment Of Renewal"]],
  "Thousand Reflections": [[1, "Ghost Sound"], [1, "Cloak Of Greying"], [3, "Invisibility"], [5, "Mirror Image"], [7, "Dimension Door"], [9, "Displacement"], [11, "Mislead"], [13, "Hindsight"], [15, "Hand of Tide"]]
});

/** Each discipline's table as printed: [Mystic level, "Spells (Base PP)"]. */
export const DISCIPLINE_TABLES = Object.freeze({
  "Inner Flame": [[1, "Orb of Fire (0), Circle of Warmth (2)"], [3, "Fire Bolt (4)"], [5, "Fireball (6)"], [7, "Flame Arrow (8)"], [9, "Burning Stride* (10)"], [11, "Rise of the Phoenix* (12)"], [13, "Aura of Heat* (14)"], [15, "Incendiary Cloud (16)"]],
  "Dragon Soul": [[1, "Light (0), Mage Armour (2)"], [3, "Resist Energy (4)"], [5, "Fly (6)"], [7, "Dragon Fear* (8)"], [9, "Breath of the Dragon* (10)"], [11, "Shape of the Wyrm (12)"], [13, "True Seeing (14)"], [15, "Wind Walk (16)"]],
  "Still Mind": [[1, "Guidance (0), Anticipate Attack (2)"], [3, "Reflective Mind* (4)"], [5, "Stun Relief (6)"], [7, "Nondetection (8)"], [9, "Serene Defence* (10)"], [11, "Shared Will (12)"], [13, "Spell Turning (14)"], [15, "Mind Blank (16)"]],
  "Starborn Flow": [[1, "Burst of Speed* (0), True Strike (2)"], [3, "Air Step* (4)"], [5, "Misty Step (6)"], [7, "Timeless Motion* (8)"], [9, "Shadow Walk (10)"], [11, "Teleport (12)"], [13, "Elude Time (14)"], [15, "Moment of Renewal (16)"]],
  "Thousand Reflections": [[1, "Ghost Sound (0), Cloak of Greying (2)"], [3, "Invisibility (4)"], [5, "Mirror Image (6)"], [7, "Dimension Door (8)"], [9, "Displacement (10)"], [11, "Mislead (12)"], [13, "Hindsight (14)"], [15, "Hand of Tide* (16)"]]
});

const ordinal = (n) => `${n}${({ 1: "st", 2: "nd", 3: "rd" })[n] ?? "th"}`;
/** The printed table as the sheet's HTML. */
const disciplineTable = (name) => `<table><thead><tr><th>Mystic Level</th><th>Spells (Base PP)</th></tr></thead><tbody>${DISCIPLINE_TABLES[name].map(([lvl, row]) => `<tr><td>${ordinal(lvl)}</td><td>${row}</td></tr>`).join("")}</tbody></table>`;

const DISCIPLINE_TEXT = {
  "Inner Flame": { ability: "Flame Within", motto: "Ignite the soul, and all shadows burn away.", text: "The path of the Inner Flame is not for the timid. It calls to those whose emotions burn hot and deep—passion, anger, determination, and courage—all are fuel for the focus within. Mystics who follow this discipline have learned to stoke the fire of their soul, letting it blaze through their strikes and manifest as destructive energy. Their focus flares brightest in moments of struggle, when pain and adversity threaten to smother the spirit. But the flame never dies—it reignites, fiercer than before.\n\nMystics of the Inner Flame walk a dangerous edge between power and destruction, learning to burn away weakness and hesitation. In battle, they become living infernos, radiating heat, energy, and relentless force. In stillness, their hearts smoulder with a deep, controlled intensity." },
  "Dragon Soul": { ability: "Dragon's Pulse", motto: "The ancient power coils within your breath, your fists, your will.", text: "This discipline awakens the long slumbering might of the Dragon Soul within the Mystic. Followers of this path are inspired by the timeless, sovereign power of dragons—creatures of myth who embody elemental forces and unshakable will. Through meditative communion with this primal energy, the Mystic cultivates traits of draconic dominance: unmatched presence, overwhelming breath, and inner steel.\n\nMystics of the Dragon Soul grow stronger with each breath drawn into their centre. Their chi becomes a vessel for elemental expression—fire, thunder, wind, or force—and their movements echo the ancient rhythm of dragonkind. To stand against them is to face not just a warrior, but a force of legend." },
  "Still Mind": { ability: "Centred Awareness", motto: "Peace is power, and in stillness, you strike true.", text: "Where others rush toward conflict, the Mystic of the Still Mind stands unmoved. This discipline teaches that true power comes not from the clash of bodies, but from the clarity between moments. By silencing the noise within, the Mystic hears the world more clearly anticipating attacks, resisting corruption, and acting with precise intent.\n\nPractitioners of the Still Mind are masters of inner balance. They channel their focus to deflect distraction, purify emotion, and focus completely on the now. When chaos reigns around them, they remain serene. When others falter, they strike—cleanly, without hesitation." },
  "Starborn Flow": { ability: "Echoes Beyond", motto: "You are a current in the great cosmos—shifting, shimmering, sublime.", text: "To follow the Starborn Flow is to accept that you are part of something greater—something eternal. Mystics of this discipline surrender to the currents of fate, time, and energy that pulse through all existence. Their focus does not resist the tides of reality but rides them, allowing sudden movement, intuitive insight, and improbable escapes.\n\nStarborn Mystics move with eerie timing, often acting just before a threat appears or just after a path opens. Their powers evoke the celestial and strange ribbons of light, pulses of gravity, bends in time. They see the patterns that others miss and move with the grace of starlight through darkness." },
  "Thousand Reflections": { ability: "Echo Form (Thousand Reflections)", motto: "In every mirror, a new self waits to awaken.", text: "Reality is not fixed—it is a hall of mirrors, and the Mystic who embraces this discipline learns to walk between the panes. The Thousand Reflections teaches that identity is fluid, action is mutable, and the self is manifold. Through focused projection and metaphysical awareness, these Mystics summon reflections of themselves, replay moments, or alter the flow of consequences.\n\nMystics of the Thousand Reflections are unsettling to watch. They may move in tandem with illusions, vanish before a blow lands, or act twice in the space of one heartbeat. Their combat style is disorienting and elusive, and their minds teem with divergent paths not yet taken. To them, mastery lies not in certainty—but in choice." }
};

const spellList = (name) => DISCIPLINE_SPELLS[name].map(([lvl, s]) => `${lvl}: ${s}`).join(", ");

const DISCIPLINE_ITEMS = DISCIPLINE_NAMES.map((name) => {
  const d = DISCIPLINE_TEXT[name];
  const item = classAbility({
    name, sourceClass: MYSTIC,
    grantedSpells: spellList(name),
    grantedAbilities: d.ability,
    description: `${md(`*${d.motto}*\n\n${d.text}\n\n**SPECIAL ABILITY** You gain the ${d.ability.replace(/ \(.*\)$/, "")} special ability.\n\n**ADDITIONAL SPELLS** You gain the following spells at the indicated Mystic level as innate spells with the Focus trait. These spells are in addition to any spells that you select with your class picks and don't count towards your total spells known.`)}\n${disciplineTable(name)}\n${md(`*Automated:* ${d.ability.replace(/ \(.*\)$/, "")} is added to your sheet. Each spell arrives as an innate spell with the Focus trait when you reach its level, cast with your Monastic Path's tradition and ability. Each may be cast up to base PP = your level + 1, so it is usable from the level that grants it (Graham's ruling B3-2).`)}`,
    flags: { grantInnate: true, itPathMagic: { allowance: 1 } }
  });
  return item;
});

/* ------------------------------------------------------------------ */
/* The disciplines' special abilities                                   */
/* ------------------------------------------------------------------ */

const DISCIPLINE_ABILITIES = [
  classAbility({
    name: "Flame Within", sourceClass: MYSTIC, traits: "Technique",
    description: auto("**TECHNIQUE** **Actions** Free (0 AP); **Trigger** you take damage.\n\nYou gain a +1-circumstance bonus to attack checks for 1 round (stacking up to +3). This resets when you end your turn without taking or dealing damage.",
      "each time you take damage the bonus on your attack checks rises by 1, to +3, and it stays until you end a turn in which you neither took nor dealt damage (Graham's ruling B3-3). No Focus trait: it is never expended (IT-M3)."),
    flags: { itAutomation: "flameWithin" }
  }),
  classAbility({
    name: "Dragon's Pulse", sourceClass: MYSTIC, traits: "Focus, Technique",
    description: auto("**FOCUS TECHNIQUE** **Actions** Free (0 AP); **Trigger** you strike a foe with a technique that has the Focus trait or with a melee attack.\n\nYou deal additional base damage equal to your Wisdom ability score (min +1). At 6th level and then every 6 levels thereafter, this damage increases by 1.",
      "after your melee Strike damages a creature, you are asked whether to use Dragon's Pulse: it deals your Wisdom (minimum 1), +1 at 6th, 12th and 18th, as further damage of the Strike's type, meeting resistance and weakness but no DR again, and is expended."),
    flags: { itAutomation: "dragonsPulse" }
  }),
  classAbility({
    name: "Centred Awareness", sourceClass: MYSTIC, traits: "Focus, Insight, Technique",
    description: auto("**FOCUS INSIGHT TECHNIQUE** **Actions** Free (0 AP); **Trigger** you make a Cleansing Trance, Clear Mind or Healing Trance check using the Meditation skill.\n\nYou gain advantage on the check.",
      "press Use before the check: your next Cleansing Trance, Clear Mind or Healing Trance check is rolled with advantage, applied for you, and Centred Awareness is expended."),
    flags: { itAutomation: "centredAwareness" }
  }),
  classAbility({
    name: "Echoes Beyond", sourceClass: MYSTIC, traits: "Focus, Insight, Technique",
    description: auto("**FOCUS INSIGHT TECHNIQUE** **Actions** Free (0 AP); **Trigger** you make a d20 check as part of a technique or innate spell that has the Focus trait.\n\nYou gain advantage on the triggering check.",
      "press Use before the check: advantage is offered as a tick on your next attack, save or skill check, to tick when that check is part of a Focus technique or innate spell; it is expended on use."),
    flags: { itAutomation: "echoesBeyond" }
  }),
  classAbility({
    name: "Echo Form (Thousand Reflections)", sourceClass: MYSTIC, traits: "Focus, Shadow, Technique",
    description: auto("**FOCUS SHADOW TECHNIQUE** **Actions** Reaction; **Trigger** you are targeted by an attack which you are aware of.\n\nYou create illusory afterimages of yourself that blur your exact location. This grants you the concealed condition until the beginning of your next turn.",
      "when an attack targets you, you are asked before it is rolled (with your other reactions). A yes spends your reaction and this use, and makes you Concealed until the start of your next turn (6 seconds out of combat)."),
    flags: { itAutomation: "echoForm" }
  })
];

/* ------------------------------------------------------------------ */
/* Inner Discipline and its three techniques (Chapter 5)                */
/* ------------------------------------------------------------------ */

export const INNER_DISCIPLINE_TECHNIQUES = ["Disciplined Flurry", "Burst Step", "Guarded Centre"];

const TECHNIQUE_ABILITIES = [
  ability({
    name: "Disciplined Flurry", traits: "Focus, Technique",
    description: auto("**FOCUS TECHNIQUE** Reaction; **Trigger** you use Flurry of Blows.\n\nMake one additional attack at your highest Combat Bonus as part of the Flurry.",
      "offered by Flurry of Blows when this is ready and you have a reaction: a third Strike, with no multiple attack penalty, that still counts towards the penalty afterwards (Graham's ruling B3-4). It is part of the Flurry: DR once, one critical injury."),
    flags: { itAutomation: "disciplinedFlurry" }
  }),
  ability({
    name: "Burst Step", traits: "Focus, Technique",
    description: auto("**FOCUS TECHNIQUE** Reaction; **Trigger** you take an action with the Movement trait.\n\nIncrease your Speed by 10 feet until the beginning of your next turn.",
      "press Use as you take the move: it spends your reaction (in combat) and this use, and adds +10 ft to your land Speed until the start of your next turn, the move that triggered it included."),
    flags: { itAutomation: "burstStep" }
  }),
  ability({
    name: "Guarded Centre", traits: "Focus, Technique",
    description: auto("**FOCUS TECHNIQUE** Reaction; **Trigger** you are targeted by an attack you are aware of.\n\nGain a +4-dodge bonus to DB until the beginning of your next turn.",
      "when an attack targets you, you are asked before it is rolled. A yes spends your reaction and this use, and gives +4 dodge to your DB until the start of your next turn, against every attack in that time."),
    flags: { itAutomation: "guardedCentre" }
  })
];
for (const t of TECHNIQUE_ABILITIES) t.system.category = "Technique";

/* ------------------------------------------------------------------ */
/* Inner Discipline and the eleven Technique class feats (Chapter 5)    */
/* ------------------------------------------------------------------ */

export const TECHNIQUE_FEAT_NAMES = [
  "Abundant Step", "Action Before Thought", "Bounding Step", "Inner Blast", "Inner Infusion",
  "Inner Mind", "Inner Rush", "Inner Sight", "Inner Stamina", "Inner Strike", "Shadowy Stance"
];

const CLASS = "Class";

const FEATS = [
  feat({
    // THE TECHNIQUE TRAIT, NOT FOCUS: the book's FOCUS TECHNIQUE line is the
    // three techniques' — the feat is never used, so a Focus count on it would
    // be a use with nothing to spend it on. A feat that opens the Technique
    // gate is not kept behind it (TRG Prime's featGateBlock).
    name: "Inner Discipline", category: CLASS, traits: "Technique",
    prerequisites: "Wis 4, Mental Focus 10 ranks. Special: you must have trained with an appropriate mentor (GM discretion).",
    grantedAbilities: INNER_DISCIPLINE_TECHNIQUES.join(", "),
    // STEEL THE MIND (Chapter 4, held over from Block 2): its reaction before
    // a Will save against an Emotion or Mental effect, offered by the system
    // to whoever holds Inner Discipline (TRG Prime 3.666.0's saveBonusReaction).
    flags: { saveBonusReaction: { label: "Steel the Mind", skill: "mentalFocus", saves: ["will"], traits: ["emotion", "mental"], type: "circumstance" } },
    description: auto("**FOCUS TECHNIQUE**\n\nYou have learned to centre body and mind to perform extraordinary techniques. You gain the following three basic techniques. Each is a separate ability with the Focus trait and is tracked and Refocused separately:\n\n**Disciplined Flurry** - Reaction; Trigger you use Flurry of Blows. Make one additional attack at your highest Combat Bonus as part of the Flurry.\n\n**Burst Step** - Reaction; Trigger you take an action with the Movement trait. Increase your Speed by 10 feet until the beginning of your next turn.\n\n**Guarded Centre** - Reaction; Trigger you are targeted by an attack you are aware of. Gain a +4-dodge bonus to DB until the beginning of your next turn.\n\nYou can also select feats with the Technique trait.",
      "Disciplined Flurry, Burst Step and Guarded Centre are added to your sheet as separate Focus abilities. Feats with the Technique trait require this feat. Disciples and Mystics gain it at 1st level, waiving its prerequisites. The feat itself is not used: its techniques are, so it carries the Technique trait without a Focus use. It also opens Evade, Wall Run, Resist Dying and Steel the Mind (Chapter 4).")
  }),
  feat({
    name: "Abundant Step", category: CLASS, traits: "Focus, Flourish, Technique, Teleportation",
    prerequisites: "Inner Discipline, Level 8",
    description: auto("**FOCUS FLOURISH TECHNIQUE TELEPORTATION** **Action** 1 AP\n\nYou can slip magically between spaces. This is a magical technique using the tradition of your Monastic Path. You instantaneously transport yourself to a location within your line of sight, covering a distance up to your Speed. You cannot take other creatures with you.",
      "press Use: 1 AP (a Flourish), and this use. Move your token up to your Speed to a space you can see; the move is a teleport and provokes nothing."),
    flags: { itAutomation: "abundantStep" }
  }),
  feat({
    name: "Action Before Thought", category: CLASS, traits: "Focus, Technique",
    prerequisites: "Inner Discipline, Mental Focus 5 ranks",
    description: auto("**FOCUS TECHNIQUE** **Action** Free (0 AP); **Trigger** you make an initiative check\n\nYou gain advantage on the triggering initiative check.",
      "press Use before initiative is rolled: your next initiative check is rolled with advantage, applied for you, and the technique is expended."),
    flags: { itAutomation: "actionBeforeThought" }
  }),
  feat({
    name: "Bounding Step", category: CLASS, traits: "Focus, Move, Technique",
    prerequisites: "Inner Discipline, Level 5",
    description: auto("**FOCUS MOVE TECHNIQUE** **Action** 2 AP\n\nYou flood your body with controlled momentum, allowing you to leap impossible distances for 1 minute. You gain a Fly Speed equal to your Land Speed, but at the end of each of your turns you must be standing on a surface capable of supporting you or you fall.\n\n**GREATER MASTERY** At 9th level, at the end of your turn you may attempt a DC 25 Acrobatics check to remain in the air. On a success, you do not fall that turn.",
      "press Use: 2 AP and this use. You gain a Fly Speed equal to your land Speed for 1 minute; from 9th level the card reminds you of the DC 25 Acrobatics check. *Not automated:* end each turn on a surface (or, from 9th, roll that check) or use the Falling action."),
    flags: { itAutomation: "boundingStep" }
  }),
  feat({
    name: "Inner Blast", category: CLASS, traits: "Focus, Force, Save, Technique",
    prerequisites: "Inner Discipline, Level 5",
    description: auto("**FOCUS FORCE SAVE TECHNIQUE** **Action** 1 to 3 AP\n\nYou release a concentrated burst of force. If you spend 1 AP, creatures in a 15-foot cone take 2d6 force damage. If you spend 2 AP, the cone is 30 feet and damage is 3d6. If you spend 3 AP, the cone is 60 feet and damage is 4d6. Each creature in the area attempts a basic Fortitude save against your Technique Save DC. This is a magical technique using the tradition of your Monastic Path.",
      "target the creatures in the cone, then press Use and choose 1, 2 or 3 AP. The damage is rolled once, and each target makes a basic Fortitude save against your Technique Save DC (10 + your Monastic Path's ability + your level). The damage is magical force."),
    flags: { itAutomation: "innerBlast" }
  }),
  feat({
    name: "Inner Infusion", category: CLASS, traits: "Focus, Technique",
    prerequisites: "Inner Discipline",
    description: auto("**FOCUS TECHNIQUE** **Action** 1 AP\n\nYou centre your body and temporarily heighten its physical potential. Choose Strength or Dexterity; you gain a +2-status bonus to the chosen ability score for 1 minute.",
      "press Use: 1 AP and this use. Choose Strength or Dexterity; +2 status to it for 1 minute."),
    flags: { itAutomation: "innerInfusion" }
  }),
  feat({
    name: "Inner Mind", category: CLASS, traits: "Disciple, Focus, Mystic, Technique",
    prerequisites: "Inner Discipline, Level 6",
    description: manual("**DISCIPLE FOCUS MYSTIC TECHNIQUE** **Trigger** You succumb to an effect with the fear trait. **Action** Reaction\n\nYou suspend the triggering fear effect for 1 minute, after which it affects you normally for any duration remaining. Inner Mind then becomes expended until restored with Refocus.",
      "TRG Prime has no way to suspend a condition and resume it later. Press Use to spend your reaction and this use; set the fear condition aside by hand for 1 minute."),
    flags: { itAutomation: "innerMind" }
  }),
  feat({
    name: "Inner Rush", category: CLASS, traits: "Flourish, Focus, Movement, Technique",
    prerequisites: "Inner Discipline",
    description: auto("**FOCUS FLOURISH MOVEMENT TECHNIQUE** **Action** 1 AP\n\nYou centre yourself and move with extraordinary speed. As part of this action, you move twice: two Strides, two Steps, or one Stride and one Step in either order. You gain the concealed condition during this movement and until the start of your next turn.",
      "press Use: 1 AP (a Flourish) and this use. Move your token up to twice your Speed (two Strides; a Step counts as 5 ft); you are Concealed until the start of your next turn."),
    flags: { itAutomation: "innerRush" }
  }),
  feat({
    name: "Inner Sight", category: CLASS, traits: "Focus, Technique",
    prerequisites: "Inner Discipline",
    description: auto("**FOCUS TECHNIQUE** **Action** 2 AP\n\nYou heighten your senses for 1 minute. You gain Nightvision, allowing you to see in dim light as though it were bright light, and you ignore concealment caused by dim light.\n\n**GREATER MASTERY** At 8th level, the duration increases to 10 minutes.\n\nAt 12th level, you gain Darkvision rather than Nightvision for the duration.",
      "press Use: 2 AP and this use. You gain Nightvision for 1 minute; for 10 minutes from 8th level, and Darkvision instead from 12th."),
    flags: { itAutomation: "innerSight" }
  }),
  feat({
    name: "Inner Stamina", category: CLASS, traits: "Focus, Technique",
    prerequisites: "Inner Discipline",
    description: auto("**FOCUS TECHNIQUE** **Action** 1 AP\n\nYou regulate breath, posture and pain, enhancing your endurance. You gain a +4-resistance bonus to Fortitude saving throws for 1 minute.",
      "press Use: 1 AP and this use. +4 resistance bonus to Fortitude saves for 1 minute."),
    flags: { itAutomation: "innerStamina" }
  }),
  feat({
    name: "Inner Strike", category: CLASS, traits: "Focus, Technique",
    prerequisites: "Inner Discipline",
    description: auto("**FOCUS TECHNIQUE** **Action** 1 AP\n\nYou channel disciplined force into your unarmed attacks. Until the end of your turn, you gain a +1-status bonus to unarmed attack rolls and your Strikes deal 1d6 extra secondary damage. Choose force, aligned (if you have such a trait), negative or positive each time you Strike. If the chosen damage is magical, the technique uses the tradition of your Monastic Path.\n\n**GREATER MASTERY** The extra damage increases by 1d6 at 8th, 12th and 16th levels, to a maximum of 4d6.",
      "press Use: 1 AP and this use, and choose the damage type. Until the end of your turn, +1 status to unarmed attack rolls (your fists and Monastic weapons) and 1d6 secondary damage of that type on your Strikes (2d6 from 8th, 3d6 from 12th, 4d6 from 16th). Choose the type before each Strike from the buttons on its card, free."),
    flags: { itAutomation: "innerStrike" }
  }),
  feat({
    name: "Shadowy Stance", category: CLASS, traits: "Disciple, Focus, Mystic, Stance, Technique",
    prerequisites: "Inner Discipline, Devoted or Illuminator Monastic Path",
    description: auto("**DISCIPLE FOCUS MYSTIC STANCE TECHNIQUE**\n\nYou learn an ancient stance that cloaks your movements in a shadowy spiritual presence. The stance lasts for 1 minute. Whilst in the stance, your attacks inflict essence damage and you gain a +2 circumstance bonus to all Escape checks. When the stance ends, Shadowy Stance is expended until restored with Refocus.",
      "press Use to enter the stance (the system's stance rules and AP) and spend this use. For 1 minute your Strikes may deal essence damage (chosen on each Strike, as Versatile is), and Escape checks get +2 circumstance."),
    flags: { itAutomation: "shadowyStance" }
  })
];

/* ------------------------------------------------------------------ */
/* The eleven Grimoire spells (Chapter 8)                               */
/* ------------------------------------------------------------------ */

// THE CATEGORY WORD (SAVE, UTILITY, ATTACK) on the book's trait line is
// the spell's `category`, not a trait, as in TRG Prime's own spells pack.
const SC = { somatic: true, verbal: true, material: false, focus: false };

const SPELLS = [
  spell({
    name: "Air Step", tradition: "divinity, verdant", ppCost: 4, castAP: 2, duration: "10 minutes", traits: "Air, Alteration", category: "utility",
    components: SC,
    effects: [
      { kind: "bonus", target: "self", slot: "speed", bonusType: "untyped", value: -10, note: "unstable air" },
      { kind: "bonus", target: "self", slot: "acrobatics", bonusType: "circumstance", value: -4, note: "unstable air" },
      { kind: "bonus", target: "self", slot: "climbing", bonusType: "circumstance", value: -4, note: "unstable air" },
      { kind: "note", text: "You hover a foot above the ground (not over liquid), pass obstacles under a foot tall and weight-triggered mechanisms, and anyone tracking you takes −10 circumstance. Your Speed cannot fall below 5 feet." }
    ],
    description: partly("You gracefully traverse the air, hovering no more than a foot above the ground, with an inability to pass over liquid surfaces. The airy path beneath you is less stable than solid ground. While floating on air, you effortlessly bypass obstacles that are less than a foot in height, evade weight-sensitive mechanisms like pressure plates, and confound any attempts to track your passage with a -10-circumstance penalty imposed upon those who make the attempt. Yet, due to the air's instability, your movement speed decreases by 10 feet, to a minimum of 5 feet, and you take -4 circumstance penalty on Acrobatics, and Climb checks.",
      "−10 ft Speed and −4 circumstance to Acrobatics and Climbing for 10 minutes. The tracking penalty, the 5-foot minimum and what you float over are the GM's.")
  }),
  spell({
    name: "Aura of Heat", tradition: "arcane, verdant", ppCost: 14, castAP: 1, area: "10-foot radius", duration: "Sustained (1 minute)", defence: "Basic Fortitude",
    traits: "Aura, Fire, Invocation", category: "save", baseDamage: "1d10", damage: { formula: "5d10", type: "fire" }, sustained: true, sustainType: "sustain",
    components: { somatic: true, verbal: false, material: false, focus: false },
    effects: [
      { kind: "defence", target: "self", field: "resistance", value: "fire", note: "Aura of Heat" },
      { kind: "note", text: "The light level within 10 feet rises two steps. Each round you sustain the aura, hostile creatures within 10 feet take 5d10 fire (basic Fortitude) — cast it again from the Sustain to deal it. If you gain the Dying condition while it is up, it flares: 6d10 fire to every enemy within 10 feet (basic Fortitude), then you stabilise at 1 HP and are Fatigued 2 — once per casting." }
    ],
    warps: [{ ppCost: 2, text: "increase the radius by 10 feet", mods: {} }, { ppCost: 2, text: "change duration to 1 minute (activates at the beginning of your turn each round as a free action)", mods: {} }],
    description: partly("Your power flares outward, surrounding you in a pulsing field of intense thermal energy. Upon casting the spell and each round when you sustain it, you increase the light level by two steps within your aura and all hostile creatures within 10 feet take 5d10 fire damage. Furthermore, you gain fire resistance while the spell is active. Finally, if you gain the Dying condition while the aura is active, it flares explosively before fading, dealing 6d10 fire damage to all enemies within 10 feet (basic Fort). You then stabilise at 1 HP but are Fatigued 2 (instead of the normal fatigued 1 for leaving the Dying condition). This resurgence only happens once per casting.\n\n**Warping Options** **+2 PP:** increase the radius by 10 feet. **+2 PP:** change duration to 1 minute (the spell activates at the beginning of your turn each round as a free action).",
      "the cast deals 5d10 fire to the creatures targeted in the aura (basic Fortitude) and gives you fire resistance. Each round's repeat, the light and the dying flare are the table's, as the card says.")
  }),
  spell({
    name: "Breath of the Dragon", tradition: "arcane, verdant", ppCost: 10, castAP: 2, area: "30-foot cone", defence: "Basic Reflex",
    traits: "Elemental, Invocation", category: "save", baseDamage: "1d8", damage: { formula: "8d8", type: "fire" },
    components: SC,
    effects: [{ kind: "damageTypeChoice", damageTypes: ["acid", "cold", "electricity", "fire"], label: "Breath of the Dragon", printSource: true }],
    description: auto("Drawing upon your inner dragon, you unleash a powerful blast of elemental power in a cone before you. You exhale a 30-foot cone of energy, dealing 8d8 elemental damage to all creatures in the area. When you cast the spell you must select one of the following damage types: acid, cold, electricity or fire.",
      "choose the damage type as you cast; 8d8 to each creature in the cone, basic Reflex.")
  }),
  spell({
    name: "Burning Stride", tradition: "arcane, verdant", ppCost: 10, castAP: 2, range: "30 feet", targets: "1 living creature", duration: "10 minutes", defence: "Fortitude",
    traits: "Fire, Invocation", category: "save", baseDamage: "1d6", damage: { formula: "4d6", type: "fire" },
    components: SC,
    effects: [
      { kind: "saveLadder", target: "targets", ladder: { critical: "", success: "full", failure: "full", fumble: "full" } },
      { kind: "note", text: "On a Failure or Fumble, each time the target takes an action with the Movement trait it takes 2d6 persistent fire damage (stopped as persistent damage is). On a Fumble it also takes a Light Fire critical each time it takes damage. For 10 minutes." }
    ],
    description: partly("You bond a fire spirit to the target that reacts to their movement based upon their saving throw result.\n\n**Critical** The target is unaffected.\n\n**Success** The target takes 4d6 fire damage.\n\n**Failure** The target takes 4d6 fire damage and an additional 2d6 persistent fire damage each time they take an action with the Movement trait. The fire damage may be stopped in the normal way for persistent damage.\n\n**Fumble** As failure but the target also takes a Light Fire critical each time they take damage.",
      "the save and the 4d6 fire. The persistent fire on movement and the Fumble's criticals are applied by hand, as the card says.")
  }),
  spell({
    name: "Burst of Speed", tradition: "arcane, ethereal", ppCost: 0, castAP: 2, range: "touch", targets: "1 willing creature", duration: "2 rounds (see text)",
    traits: "Cantrip, Translocation", category: "utility",
    components: SC,
    effects: [
      { kind: "bonus", target: "targets", slot: "speed", bonusType: "status", value: 20, note: "until the end of their next turn" },
      { kind: "note", text: "For the 2nd round of the duration the target's Speed is reduced by 10 feet instead." }
    ],
    description: partly("You grant the target a sudden rush of adrenalin which increases their speed by 20 feet until the end of their next turn. This speed is only temporary however and for the 2nd round of this spell’s duration, the targets speed is reduced by 10 feet.",
      "+20 ft status to the target's Speed for the duration; apply the second round's −10 ft by hand.")
  }),
  spell({
    name: "Dragon Fear", tradition: "arcane, divinity, ethereal, verdant", ppCost: 8, castAP: 2, area: "20-foot radius", duration: "1 minute", defence: "Will",
    traits: "Aura, Enchantment, Fear", category: "save",
    components: SC,
    effects: [
      { kind: "condition", target: "targets", condition: "frightened", value: 1, onSave: ["success"] },
      { kind: "condition", target: "targets", condition: "frightened", value: 2, onSave: ["partial"] },
      { kind: "condition", target: "targets", condition: "frightened", value: 3, onSave: ["failure"] },
      { kind: "condition", target: "targets", condition: "fleeing", onSave: ["failure"], duration: "1 round" },
      { kind: "condition", target: "targets", condition: "frightened", value: 4, onSave: ["fumble"] },
      { kind: "condition", target: "targets", condition: "fleeing", onSave: ["fumble"] },
      { kind: "condition", target: "targets", condition: "frightened", value: 5, onSave: ["blunder"] },
      { kind: "condition", target: "targets", condition: "paralyzed", onSave: ["blunder"] },
      { kind: "note", text: "The aura lasts 1 minute: a creature that starts its turn within 20 feet saves then, with these results. Whatever it rolls, it is immune to this spell for 1 minute. Fleeing (Fumble) and Paralyzed (Blunder) last until Frightened is removed." }
    ],
    description: partly("You emanate an aura of fear similar to that of a dragon. At the beginning of their turn, each creature within the radius of the spell must make a saving throw with the following results:\n\n**Critical** The creature is unaffected.\n\n**Success** The creature is frightened 1.\n\n**Partial** The creature is frightened 2.\n\n**Failure** The creature is frightened 3 and fleeing for 1 round.\n\n**Fumble** The creature is frightened 4 and fleeing until the frightened condition is removed.\n\n**Blunder** The creature is frightened 5 and gains the paralyzed condition until the frightened condition is removed.\n\nBe aware that regardless of the result of the saving throw, the creature is temporarily immune to this spell for 1 minute.",
      "the creatures targeted when you cast save, and their conditions are applied. Later saves at the start of each creature's turn, the 1-minute immunity, and ending Fleeing or Paralyzed with Frightened are by hand.")
  }),
  spell({
    name: "Hand of Tide", tradition: "arcane, divinity", ppCost: 16, castAP: 3, area: "100-foot radius", targets: "up to 10 creatures",
    traits: "Translocation", category: "utility",
    components: { somatic: true, verbal: true, material: true, focus: false },
    effects: [{ kind: "note", text: "Move each chosen creature's token to any point within the radius; not into an environmentally dangerous place (such as 100 feet up). An unwilling creature may make a Will save to avoid it." }],
    description: manual("Upon casting this spell, you may instantly teleport any creature from one location to another within the radius of the spell. You cannot transport a creature into an environmentally dangerous situation (such as 100 foot into the air). An unwilling target may make a Will save to avoid the effect.",
      "where each creature goes is the caster's choice on the map; move the tokens, and roll an unwilling creature's Will save, by hand.")
  }),
  spell({
    name: "Reflective Mind", tradition: "arcane, divinity, ethereal", ppCost: 4, castAP: "Reaction", traits: "Warding", category: "utility",
    components: { somatic: false, verbal: true, material: false, focus: false },
    effects: [{ kind: "declare", target: "self", label: "Reflective Mind", rounds: 1, noStack: true,
      flags: { conditionals: [{ kind: "advantage", label: "Reflective Mind", scope: "The saving throw against the mental effect that triggered Reflective Mind", auto: true, oneShot: true, when: { checkTypes: ["save"], traits: ["mental"] } }] },
      text: "advantage on your saving throw against the triggering mental effect" }],
    description: auto("**Cast** R (verbal); **Trigger** you are targeted by a spell or effect which has both the mental and save traits.\n\nYou instinctively throw up a reactive mental barrier which grants you advantage on the triggering saving throw.",
      "cast it as the effect targets you: your next saving throw against a Mental effect, this round, is rolled with advantage, applied for you.")
  }),
  spell({
    name: "Rise of the Phoenix", tradition: "verdant", ppCost: 12, castAP: "1 hour", duration: "unlimited", traits: "Fire, Healing, Translocation", category: "utility",
    components: SC,
    effects: [{ kind: "note", text: "Casting takes 1 hour. The egg links to your soul: if you die, it hatches and you are resurrected at the egg's location with full HP and 0 PP; your gear stays with your corpse. Casting again makes any previous egg crumble to ash." }],
    description: manual("**Cast** 1 hour (somatic, verbal)\n\nYou create an egg-shaped object which creates a link to your soul. Should you die, the egg hatches and you’re resurrected with full hit points and zero power points at the egg’s current location. Your gear remains with your corpse.\n\nBe aware that if you cast this spell again, any previous egg you created crumbles to ash.",
      "the egg is a story object: record where it is, and resurrect the character at it by hand.")
  }),
  spell({
    name: "Serene Defence", tradition: "divinity, ethereal", ppCost: 10, castAP: 2, duration: "Sustained (1 minute)", traits: "Stance, Warding", category: "utility",
    sustained: true, sustainType: "sustain",
    components: SC,
    effects: [{ kind: "declare", target: "self", label: "Serene Defence", noStack: true,
      flags: { statBonuses: [{ target: "defence", type: "dodge", ability: "wisdom", label: "Serene Defence" }] },
      text: "your Wisdom as a dodge bonus to your DB while you sustain it" }],
    description: auto("You enter a serene defensive stance, adding your Wisdom ability score as a dodge bonus to your DB for as long as you sustain the spell.",
      "your Wisdom is added to your DB as a dodge bonus while the spell lasts.")
  }),
  spell({
    name: "Timeless Motion", tradition: "arcane, ethereal", ppCost: 8, castAP: 2, duration: "1 minute", traits: "Alteration", category: "utility",
    components: SC,
    effects: [
      { kind: "condition", target: "self", condition: "quickened", value: 1 },
      { kind: "note", text: "The Quickened action may only be an action with the Movement trait. That movement cannot be perceived and provokes no reactions." }
    ],
    description: partly("Time moves differently for you. You gain the quickened condition which may be used to take any action with the Movement trait each round. When taking this action your movement is imperceivable to those around you and does not provoke reactions.",
      "you are Quickened for 1 minute. Using the extra action only to move, and that move provoking nothing, are by hand.")
  })
];

/* ------------------------------------------------------------------ */
/* What foundation.mjs adds to each pack                                */
/* ------------------------------------------------------------------ */

export const BLOCK3_CLASSES = CLASSES;
export const BLOCK3_ABILITIES = [...PATH_ITEMS, ...DISCIPLE_ITEMS, ...MYSTIC_ITEMS, ...DISCIPLINE_ITEMS, ...DISCIPLINE_ABILITIES, ...TECHNIQUE_ABILITIES];
export const BLOCK3_FEATS = FEATS;
export const BLOCK3_SPELLS = SPELLS;
