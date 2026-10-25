/**
 * Inner Tempest — Chapter 4, Skills & Actions (v1.2): the seventeen skill
 * actions, in the exact shape TRG Prime's own SKILL_ACTIONS holds,
 * registered through `api.registerSkillActions`.
 *
 * BOOK TEXT IS VERBATIM. Requirements, triggers, outcome rows and the
 * descriptions are copied from tools/content/book-text-ch4.json (pandoc's
 * markdown of the v1.2 docx), and verify-block2 holds every one against it.
 *
 * `outcomesApplied: true` (TRG Prime 3.666.0) on every one: this module
 * applies each row itself (module/skill-action-automations.mjs), with the
 * scope and the clock the row names, so the system's generic outcome
 * readers leave the text alone. Maintain Clarity's Fumble ("an additional
 * -1 circumstance penalty to Concentrate and Mental actions") is the row
 * they would otherwise have read, as an unscoped second copy.
 *
 * THE BONUS CHECK ACTIONS (Evade, Interpret Style, Root the Body, Centred
 * Balance, Guide the Breath, Resist Dying, Steel the Mind) print no table of
 * their own: "compare the result to the Bonus Check table (CRB pg. 63)".
 * Their rows are that table worked out (Heroic 4 … Blunder −2, negatives
 * treated as 0), so the card says what the roll gave; written "a … bonus of
 * N" so the outcome reader leaves them alone.
 *
 * AS RULED BY GRAHAM ON 21 OCTOBER 2026 (docs/INNER_TEMPEST_BLOCK2_AUDIT.md):
 *   - Resist Dying is a Reaction whose Trigger is gaining the dying
 *     condition (the book's 1 AP predates the current dying rules).
 *   - Evade, Root the Body and Steel the Mind are declared when the
 *     trigger arrives, before the attack or save is rolled.
 *   - Centred Balance and Elemental Ward offer their printed time choices
 *     through the system's time ladder (3.666.0).
 *
 * `against`: "selfLevelDC" for "against your Level DC"; "levelDC" for "the
 * target's Level DC" (target the creature first); "none" where the GM sets
 * the DC (the Climb DC, the responsible creature's level); "fixed" for
 * Elemental Ward's printed 20.
 */

const ladder = (o) => ({ heroic: "", critical: "", success: "", partial: "", failure: "", fumble: "", blunder: "", ...o });

export const SKILL_ACTIONS = Object.freeze([
  {
    key: "evade",
    name: "Evade",
    skills: ["acrobatics"],
    traits: "Defence",
    apCost: "Reaction",
    checkType: "skill",
    outcomesApplied: true,
    against: "selfLevelDC",
    requiresFeat: "Inner Discipline",
    trigger: "You are targeted by an attack that you are aware of.",
    requirements: "You have the Inner Discipline feat.",
    outcomes: ladder({
      heroic: "Bonus Check 4: a dodge bonus of 4 to your DB against the triggering attack.",
      critical: "Bonus Check 3: a dodge bonus of 3 to your DB against the triggering attack.",
      success: "Bonus Check 2: a dodge bonus of 2 to your DB against the triggering attack.",
      partial: "Bonus Check 1: a dodge bonus of 1 to your DB against the triggering attack.",
      failure: "Bonus Check 0: no bonus.",
      fumble: "Bonus Check −1, treated as 0: no bonus.",
      blunder: "Bonus Check −2, treated as 0: no bonus."
    }),
    description: "Your honed reflexes and purpose of mind allows you to react to attacks quickly and efficiently. When attacked you may make an evade check against your Level DC and compare the result to the Bonus Check table (CRB pg. 63). Any positive result is added as Dodge bonus to your DB against the attack. Be aware that negative results on the Bonus Check table are treated as 0. (Inner Tempest, Chapter 4)"
  },
  {
    key: "interpretStyle",
    name: "Interpret Style",
    skills: ["artistry"],
    traits: "Concentrate, Mental",
    apCost: "3",
    checkType: "skill",
    outcomesApplied: true,
    against: "levelDC",
    outcomes: ladder({
      heroic: "Bonus Check 4 (halved, rounded up): a circumstance bonus of 2 to your AB and DB against the target while it uses the stance, or until the battle ends.",
      critical: "Bonus Check 3 (halved, rounded up): a circumstance bonus of 2 to your AB and DB against the target while it uses the stance, or until the battle ends.",
      success: "Bonus Check 2 (halved, rounded up): a circumstance bonus of 1 to your AB and DB against the target while it uses the stance, or until the battle ends.",
      partial: "Bonus Check 1 (halved, rounded up): a circumstance bonus of 1 to your AB and DB against the target while it uses the stance, or until the battle ends.",
      failure: "Bonus Check 0: no bonus.",
      fumble: "Bonus Check −1, treated as 0: no bonus.",
      blunder: "Bonus Check −2, treated as 0: no bonus."
    }),
    description: "Target: A creature you saw attack or move while in a stance since your last turn. You make a check against the targets Level DC and compare the results to the Bonus Check table (CRB pg. 63). Any positive result is divided by 2 (round up) and added as circumstance bonus to both your AB and DB against the target whilst they are using the stance (or until the battle ends). Be aware that you may only have one instance of this action in use at any one time. If you use the action again, any previous bonuses are lost immediately. (Inner Tempest, Chapter 4)"
  },
  {
    key: "rootTheBody",
    name: "Root the Body",
    skills: ["athletics"],
    traits: "Defence",
    apCost: "Reaction",
    checkType: "skill",
    outcomesApplied: true,
    against: "selfLevelDC",
    trigger: "you are required to make a check or saving throw to avoid being knocked prone or moved against your will by a physical effect.",
    requirements: "you are standing upon a surface capable of supporting you and are not immobilised",
    outcomes: ladder({
      heroic: "Bonus Check 4: a circumstance bonus of 4 to the triggering check or saving throw; against a Shove or Trip, the attacker's DC rises by 4 instead.",
      critical: "Bonus Check 3: a circumstance bonus of 3 to the triggering check or saving throw; against a Shove or Trip, the attacker's DC rises by 3 instead.",
      success: "Bonus Check 2: a circumstance bonus of 2 to the triggering check or saving throw; against a Shove or Trip, the attacker's DC rises by 2 instead.",
      partial: "Bonus Check 1: a circumstance bonus of 1 to the triggering check or saving throw; against a Shove or Trip, the attacker's DC rises by 1 instead.",
      failure: "Bonus Check 0: no bonus.",
      fumble: "Bonus Check −1, treated as 0: no bonus.",
      blunder: "Bonus Check −2, treated as 0: no bonus."
    }),
    description: "You lower your centre of gravity, brace your stance and redirect the incoming force through the ground. Make an Athletics check against your Level DC and compare the result to the Bonus Check table. Any positive result is added as a circumstance bonus to the triggering check or saving throw. Negative results on the Bonus Check table are treated as 0. Be aware that Root the Body cannot be used against teleportation or other effects that relocate you without physically moving you. (Inner Tempest, Chapter 4)"
  },
  {
    key: "wallRun",
    name: "Wall Run",
    skills: ["climbing"],
    traits: "Flourish, Movement",
    apCost: "1",
    checkType: "skill",
    outcomesApplied: true,
    against: "none",
    requiresFeat: "Inner Discipline",
    requirements: "you have the Inner Discipline feat; you begin your movement adjacent to a solid vertical surface",
    outcomes: ladder({
      critical: "You may move along the surface up to your Speed.",
      success: "You may move along the surface up to half your Speed.",
      partial: "You may move up to 10 feet along the surface.",
      failure: "You fail to gain sufficient momentum and do not move.",
      fumble: "You lose your footing and fall prone in your starting space."
    }),
    description: "You attempt to run along or briefly ascend a wall without climbing it normally. Make a Climbing check against the normal Climb DC of the surface. You do not require a free hand while using Wall Run. Your movement must end upon a surface capable of supporting you. If it does not, you fall normally. Be aware that Wall Run does not allow you to remain standing upon a vertical surface after the action ends. (Inner Tempest, Chapter 4)"
  },
  {
    key: "recogniseDiscipline",
    name: "Recognise Discipline",
    skills: ["culture"],
    traits: "Concentrate",
    apCost: "1",
    checkType: "skill",
    outcomesApplied: true,
    against: "levelDC",
    outcomes: ladder({
      critical: "You identify the exact stance, Combat Form, monastic school or recognisable discipline being used, where such information is reasonably available. You also learn one relevant piece of information about its philosophy, customary tactics or origin.",
      success: "You identify the general martial tradition and its likely culture, region or philosophical origin.",
      partial: "You identify whether the technique belongs to a formal martial tradition and broadly what sort of tradition it represents.",
      failure: "You cannot determine anything useful.",
      fumble: "You cannot attempt to Recognise Discipline against this creature or evidence again for 10 minutes."
    }),
    description: "Target: One creature that you can observe using a stance, Combat Form or martial technique, or physical evidence left by such a creature. You attempt to identify the martial tradition, school or discipline represented by the target. Make a Culture check against the target's Level DC. When examining tracks, damage, training equipment or similar evidence, the GM determines the Level DC of the creature responsible. Be aware that Recognise Discipline does not provide the combat bonuses granted by Interpret Style (Artistry). (Inner Tempest, Chapter 4)"
  },
  {
    key: "centredBalance",
    name: "Centred Balance",
    skills: ["meditation"],
    traits: "Concentrate, Mental",
    apCost: "10 minutes",
    checkType: "skill",
    outcomesApplied: true,
    against: "none",
    requiresFeat: "Inner Balance",
    requirements: "You have the Inner Balance feat.",
    timeLadder: { options: [{ key: "tenMinutes", label: "10 minutes", modifier: 0, apCost: "10 minutes" }, { key: "minute", label: "1 minute", modifier: -2, apCost: "1 minute" }, { key: "round", label: "1 round", modifier: -5, apCost: "1 round" }, { key: "action", label: "1 AP", modifier: -10, apCost: "1" }], defaultKey: "tenMinutes", hint: "How long do you meditate? Less time costs accuracy." },
    outcomes: ladder({
      heroic: "Bonus Check 4: a circumstance bonus of 4 to the Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check you make next.",
      critical: "Bonus Check 3: a circumstance bonus of 3 to the Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check you make next.",
      success: "Bonus Check 2: a circumstance bonus of 2 to the Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check you make next.",
      partial: "Bonus Check 1: a circumstance bonus of 1 to the Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check you make next.",
      failure: "Bonus Check 0: no bonus.",
      fumble: "Bonus Check −1, treated as 0: no bonus.",
      blunder: "Bonus Check −2, treated as 0: no bonus."
    }),
    description: "You may meditate to grant yourself a bonus to either an Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check. You make a skill check (DC equal to that of the check that you are performing) and compare the result to the Bonus Check table. Any positive result is granted as a circumstance bonus to the one of the above checks, which must be made immediately after this check. You may spend less time meditating which offers the following modifiers. 1 minute -2, 1 round -5, 1 AP -10. (Inner Tempest, Chapter 4)"
  },
  {
    key: "guideTheBreath",
    name: "Guide the Breath",
    skills: ["meditation"],
    traits: "Concentrate, Mental",
    apCost: "1",
    checkType: "skill",
    outcomesApplied: true,
    against: "levelDC",
    requirements: "the target has at least one expended ability with the Focus trait",
    outcomes: ladder({
      heroic: "Bonus Check 4: a circumstance bonus of 4 to the target's next Refocus check before the end of their next turn.",
      critical: "Bonus Check 3: a circumstance bonus of 3 to the target's next Refocus check before the end of their next turn.",
      success: "Bonus Check 2: a circumstance bonus of 2 to the target's next Refocus check before the end of their next turn.",
      partial: "Bonus Check 1: a circumstance bonus of 1 to the target's next Refocus check before the end of their next turn.",
      failure: "Bonus Check 0: no bonus.",
      fumble: "Bonus Check −1, treated as 0: no bonus.",
      blunder: "Bonus Check −2, treated as 0: no bonus."
    }),
    description: "Target: One willing creature within 10 feet that can hear or otherwise perceive your guidance. Through a word, gesture, breathing cadence or other meditative technique, you help the target regain their concentration. Make a Meditation check against the target's Level DC and compare the result to the Bonus Check table. Any positive result is granted as a circumstance bonus to the target's next Refocus check made before the end of their next turn. Negative results are treated as 0. You cannot use Guide the Breath upon yourself. A creature can benefit from only one use of Guide the Breath on any single Refocus check. (Inner Tempest, Chapter 4)"
  },
  {
    key: "steadyHeart",
    name: "Steady Heart",
    skills: ["meditation"],
    traits: "Concentrate, Mental",
    apCost: "1",
    checkType: "skill",
    outcomesApplied: true,
    against: "selfLevelDC",
    requirements: "you are affected by the frightened condition or an effect with the Emotion or Fear trait",
    outcomes: ladder({
      critical: "Reduce your frightened condition by 2. You also gain a +2-circumstance bonus to saving throws against Emotion and Fear effects until the beginning of your next turn.",
      success: "Reduce your frightened condition by 1.",
      partial: "You do not reduce your frightened condition but gain a +2-circumstance bonus to your next saving throw against an Emotion or Fear effect before the beginning of your next turn.",
      failure: "You fail to regain your composure.",
      fumble: "You fail to regain your composure and cannot use Steady Heart again until the beginning of your next turn."
    }),
    description: "You control your breathing and steady your thoughts, refusing to allow panic to dictate your actions. Make a Meditation check against your Level DC. If you are not frightened but are affected by another Emotion or Fear effect, the Critical result grants the saving throw bonus but does not otherwise remove that effect. (Inner Tempest, Chapter 4)"
  },
  {
    key: "resistDying",
    name: "Resist Dying",
    skills: ["mentalFocus"],
    traits: "Concentrate, Mental",
    apCost: "Reaction",
    checkType: "skill",
    outcomesApplied: true,
    against: "selfLevelDC",
    requiresFeat: "Inner Discipline",
    trigger: "You gain the dying condition.",
    requirements: "you have the Inner Discipline feat.",
    outcomes: ladder({
      heroic: "Bonus Check 4: a bonus of 4 to your next Dying Check.",
      critical: "Bonus Check 3: a bonus of 3 to your next Dying Check.",
      success: "Bonus Check 2: a bonus of 2 to your next Dying Check.",
      partial: "Bonus Check 1: a bonus of 1 to your next Dying Check.",
      failure: "Bonus Check 0: no bonus.",
      fumble: "Bonus Check −1, treated as 0: no bonus.",
      blunder: "Bonus Check −2, treated as 0: no bonus."
    }),
    description: "You can use your inner self discipline to gain a bonus to Dying Checks. You may make a Resist Dying check against your Level DC and compare the result to the Bonus Check table (CRB pg. 63). Any positive result is added as a bonus to your Dying Check. Be aware that negative results on the Bonus Check table are treated as 0. (Inner Tempest, Chapter 4)"
  },
  {
    key: "maintainClarity",
    name: "Maintain Clarity",
    skills: ["mentalFocus"],
    traits: "Concentrate, Mental",
    apCost: "1",
    checkType: "skill",
    outcomesApplied: true,
    against: "selfLevelDC",
    requirements: "you are suffering a penalty to a Concentrate or Mental action because of environmental distraction, noise or similar interference",
    outcomes: ladder({
      critical: "ignore up to 4 points of circumstance penalties caused by distraction until the beginning of your next turn.",
      success: "ignore up to 2 points of circumstance penalties caused by distraction until the beginning of your next turn.",
      partial: "ignore 1 point of circumstance penalty caused by distraction until the beginning of your next turn.",
      failure: "you fail to shut out the distraction.",
      fumble: "the distraction overwhelms you and you take an additional -1 circumstance penalty to Concentrate and Mental actions until the beginning of your next turn."
    }),
    description: "You shut out everything that does not matter. Make a Mental Focus check against your Level DC. Be aware that Maintain Clarity cannot remove penalties caused directly by conditions unless the condition specifically represents distraction or interference. (Inner Tempest, Chapter 4)"
  },
  {
    key: "steelTheMind",
    name: "Steel the Mind",
    skills: ["mentalFocus"],
    traits: "Concentrate, Defence, Mental",
    apCost: "Reaction",
    checkType: "skill",
    outcomesApplied: true,
    against: "selfLevelDC",
    requiresFeat: "Inner Discipline",
    trigger: "you are required to make a Will saving throw against an effect with the Emotion or Mental trait",
    requirements: "you have the Inner Discipline feat.",
    outcomes: ladder({
      heroic: "Bonus Check 4: a circumstance bonus of 4 to the triggering Will saving throw.",
      critical: "Bonus Check 3: a circumstance bonus of 3 to the triggering Will saving throw.",
      success: "Bonus Check 2: a circumstance bonus of 2 to the triggering Will saving throw.",
      partial: "Bonus Check 1: a circumstance bonus of 1 to the triggering Will saving throw.",
      failure: "Bonus Check 0: no bonus.",
      fumble: "Bonus Check −1, treated as 0: no bonus.",
      blunder: "Bonus Check −2, treated as 0: no bonus."
    }),
    description: "You force your thoughts into order before the hostile influence can take hold. Make a Mental Focus check against your Level DC and compare the result to the Bonus Check table. Any positive result is added as a circumstance bonus to the triggering Will saving throw. Negative results are treated as 0. Steel the Mind must be declared before the triggering saving throw is rolled. (Inner Tempest, Chapter 4)"
  },
  {
    key: "elementalWard",
    name: "Elemental Ward",
    skills: ["nature"],
    traits: "Concentrate, Warding",
    apCost: "10 minutes",
    checkType: "skill",
    outcomesApplied: true,
    against: "fixed",
    fixedDC: 20,
    requiresFeat: "Elemental Warding",
    requirements: "You have the Elemental Warding feat.",
    timeLadder: { options: [{ key: "minute", label: "1 minute", modifier: -2, apCost: "1 minute" }, { key: "tenMinutes", label: "10 minutes", modifier: 0, apCost: "10 minutes" }, { key: "hour", label: "1 hour", modifier: 2, apCost: "1 hour" }], defaultKey: "tenMinutes", hint: "How long do you spend drawing the ward? Rushing costs accuracy; taking an hour helps." },
    outcomes: ladder({
      heroic: "The ward lasts for 8 hours.",
      critical: "The ward lasts for 1 hour.",
      success: "The ward lasts for 10 minutes.",
      partial: "The ward is drawn incorrectly but you may immediately try again.",
      failure: "The ward is drawn incorrectly but you may attempt to draw it again after 10 minutes.",
      fumble: "The ward is drawn incorrectly and you may not attempt to draw it again until after your next daily preparation.",
      blunder: "The ward is drawn incorrectly but you fail to realise this. The ward grants Weakness instead of Resistance."
    }),
    description: "You may draw a 10’ radius circle in the dirt which provides all creatures inside Resistance to either Acid, Cold, Electricity or Fire damage. You must be able to clearly mark the circle and if you are on a solid surface (such as wood or stone) must use something such as chalk to mark the circle. The ward lasts until physically disrupted or its duration expires. The DC to create the ward is 20 and its duration is based upon the result of your skill check: You may spend more or less time constructing the ward which offers the following modifiers. 1 minute -2, 1 hour +2 (Inner Tempest, Chapter 4)"
  },
  {
    key: "readTheElements",
    name: "Read the Elements",
    skills: ["nature"],
    traits: "Concentrate",
    apCost: "1 minute",
    checkType: "skill",
    outcomesApplied: true,
    against: "none",
    outcomes: ladder({
      critical: "you identify the element involved, whether the phenomenon was natural or magical, its approximate age and the direction from which it originated or travelled. If the effect was created by a creature, you may use Nature instead of Survival to Track that creature for the next hour.",
      success: "you identify the element, whether it was natural or magical and its general direction of origin.",
      partial: "you identify the element involved and whether the effect appears natural or unnatural.",
      failure: "you cannot determine anything useful.",
      fumble: "the traces are too confused to interpret and you cannot attempt to Read the Elements here again for 1 hour."
    }),
    description: "Target: An area, object or other evidence affected by elemental forces. You study traces of elemental activity. Make a Nature check against the Level DC of the creature or effect responsible. If no level is known, the GM determines an appropriate level-based DC. Typical elements include Air, Acid, Cold, Earth, Electricity, Fire and Water. (Inner Tempest, Chapter 4)"
  },
  {
    key: "readSpiritualEcho",
    name: "Read Spiritual Echo",
    skills: ["occultism"],
    traits: "Concentrate, Mental",
    apCost: "1 minute",
    checkType: "skill",
    outcomesApplied: true,
    against: "none",
    outcomes: ladder({
      critical: "you determine the nature of the manifestation, its approximate level, the direction in which its creator departed and whether the effect was created deliberately or involuntarily.",
      success: "you determine the general nature and approximate strength of the manifestation.",
      partial: "you determine only whether the spiritual echo was harmful, protective or otherwise neutral in intent.",
      failure: "you detect nothing useful.",
      fumble: "the impressions become confused and you cannot attempt to Read Spiritual Echo at this location again until after 10 minutes."
    }),
    description: "Target: An area or object upon which an ethereal innate spell, magical technique, haunt or spiritual manifestation occurred within the last hour. You examine the lingering spiritual impression. Make an Occultism check against the Level DC of the effect or creature responsible. Be aware that this action does not itself detect an active magical effect and does not replace Sense Magic. (Inner Tempest, Chapter 4)"
  },
  {
    key: "observeTechnique",
    name: "Observe Technique",
    skills: ["perception"],
    traits: "Concentrate",
    apCost: "1",
    checkType: "skill",
    outcomesApplied: true,
    against: "levelDC",
    requirements: "the target has entered a stance or Combat Form, or used a technique or ability with the Focus trait since the beginning of your previous turn",
    outcomes: ladder({
      critical: "you identify the ability being used, determine whether it is magical or non-magical and recognise its observable traits. If it possesses the Focus trait, you can also determine whether that particular ability is currently ready or expended. You gain a +2-circumstance bonus to your next DB check or saving throw against that ability before the end of your next turn.",
      success: "you identify the ability being used and determine whether it is magical or non-magical. If it possesses the Focus trait, you can determine whether it is currently ready or expended.",
      partial: "you determine only the general nature of the ability, such as a stance, martial technique, magical technique or innate spell.",
      failure: "you fail to read anything useful from the target's movements.",
      fumble: "you misread the target's rhythm and cannot use Observe Technique against them again until the beginning of your next turn."
    }),
    description: "Target: One creature you can clearly perceive. Make a Perception check against the target's Level DC. Observe Technique reveals only information that could reasonably be inferred from observing the target. It does not reveal hidden prerequisites, feats or abilities that have not been demonstrated. (Inner Tempest, Chapter 4)"
  },
  {
    key: "readDevotion",
    name: "Read Devotion",
    skills: ["religion"],
    traits: "Concentrate, Mental",
    apCost: "1 minute",
    checkType: "skill",
    outcomesApplied: true,
    against: "none",
    outcomes: ladder({
      critical: "identify the tradition responsible, the general purpose of the effect and the strength of the conviction behind it. If the effect was associated with a recognised Aspect, oath, order or monastic tradition, you also identify that connection.",
      success: "you identify whether the effect was protective, restorative, harmful or otherwise purposeful and recognise its divinity nature.",
      partial: "you recognise that a divinity or spiritually devoted effect occurred here but learn nothing further.",
      failure: "you cannot interpret the spiritual residue.",
      fumble: "you cannot attempt to Read Devotion at the same location again until after 10 minutes."
    }),
    description: "Target: A shrine, sacred object or location where a divinity spell or magical technique has been used within the previous day. You examine the spiritual resonance left behind. Make a Religion check against the Level DC of the creature or effect responsible. (Inner Tempest, Chapter 4)"
  },
  {
    key: "readIntent",
    name: "Read Intent",
    skills: ["senseMotive"],
    traits: "Concentrate",
    apCost: "1",
    checkType: "skill",
    outcomesApplied: true,
    against: "levelDC",
    outcomes: ladder({
      critical: "you gain a +2-circumstance bonus to DB and saving throws against the target until the beginning of your next turn. The target also cannot provide flanking against you during this time.",
      success: "choose either DB or saving throws. You gain a +2-circumstance bonus to the chosen defence against the target until the beginning of your next turn.",
      partial: "you gain a +1-circumstance bonus to DB against the target until the beginning of your next turn.",
      failure: "you fail to anticipate the target.",
      fumble: "you misread the target and suffer a -1-circumstance penalty to DB against them until the beginning of your next turn."
    }),
    description: "Range: 30 feet. Target: One creature you can clearly observe. You watch the target's posture, breathing and attention, attempting to anticipate their next hostile movement. Make a Sense Motive check against the target's Level DC. You may use Read Intent against the same creature only once each round. (Inner Tempest, Chapter 4)"
  }
]);

/** The keys, for the automations' dispatch. */
export const SKILL_ACTION_KEYS = Object.freeze(SKILL_ACTIONS.map((a) => a.key));
