/**
 * Everything Inner Tempest registers through TRG Prime's module API.
 * Called once from the `trgPrime.registerContent` hook.
 *
 * Kept apart from the automations so the harness can hand it a fake `api`
 * and assert exactly what was registered, without Foundry.
 *
 * @param {object} api       game.trgPrime.modules as handed to the hook
 * @param {string} moduleId  this module's id
 */
import { AUTOMATIONS, PASSIVE_HINTS } from "./automations.mjs";
import { SKILL_ACTIONS } from "./skill-actions.mjs";
import { ELEMENTAL_TRACKING } from "./skill-action-automations.mjs";
import { DEFENCE_OFFERS } from "./defence-offers.mjs";
import { BLOCK3_AUTOMATIONS, BLOCK3_DEFENCE_OFFERS } from "./block3-automations.mjs";
import { BLOCK4_AUTOMATIONS, BLOCK4_DEFENCE_OFFERS } from "./block4-automations.mjs";
import { BLOCK5_AUTOMATIONS, BLOCK5_PASSIVE_HINTS, BLOCK5_DEFENCE_OFFERS, LIGHT_SOURCES } from "./block5-automations.mjs";
import { BLOCK6_AUTOMATIONS } from "./block6-automations.mjs";
import { BLOCK7_AUTOMATIONS, BLOCK7_CLASS_SKILL_GRANTS, BLOCK7_ARCHETYPES } from "./block7-automations.mjs";
import { spiritualDistractionGate } from "./block8-automations.mjs";
import { registerBlock9 } from "./block9-automations.mjs";
import { registerBlock10 } from "./block10-automations.mjs";

/** Block 3 (0.4.0): the two classes' proficiency and Chapter 6 class wealth. */
export const CLASS_REGISTRATIONS = {
  Disciple: {
    wealth: -2,
    proficiency: {
      label: "Disciple",
      armourCategories: [], armourNames: [], otherTiers: [], armourExclude: [],
      shieldCategories: [], shieldNames: [],
      weaponCategories: ["Simple"], weaponNames: [],
      weaponRules: [{ kind: "trait", value: "Monastic", why: "any weapons that have the monastic trait" }],
      deityWeapons: false
    }
  },
  Mystic: {
    wealth: -1,
    proficiency: {
      label: "Mystic",
      armourCategories: ["Light"], armourNames: [], otherTiers: ["light"], armourExclude: [],
      shieldCategories: [], shieldNames: [],
      weaponCategories: ["Simple"], weaponNames: [],
      weaponRules: [{ kind: "trait", value: "Monastic", why: "monastic weapons" }],
      deityWeapons: false
    }
  },
  // BLOCK 4 (0.5.0): Chapter 3's proficiencies, as printed, and Chapter 6's wealth.
  // "You are proficient with light armour and bucklers. You may use all simple
  // weapons, shortbows and weapons with the Monastic trait. The wakizashi is
  // considered a martial weapon for you rather than an exotic weapon."
  Ghostwalker: {
    wealth: 0,
    proficiency: {
      label: "Ghostwalker",
      armourCategories: ["Light"], armourNames: [], otherTiers: ["light"], armourExclude: [],
      shieldCategories: ["buckler"], shieldNames: [],
      weaponCategories: ["Simple"], weaponNames: ["Short Bow", "Composite Shortbow", "Wakizashi"],
      weaponRules: [{ kind: "trait", value: "Monastic", why: "weapons with the Monastic trait" }],
      deityWeapons: false
    }
  },
  // "all simple and martial weapons … all light armour, medium armour and bucklers."
  Kensai: {
    wealth: 1,
    proficiency: {
      label: "Kensai",
      armourCategories: ["Light", "Medium"], armourNames: [], otherTiers: ["light", "medium"], armourExclude: [],
      shieldCategories: ["buckler"], shieldNames: [],
      weaponCategories: ["Simple", "Martial"], weaponNames: [],
      weaponRules: [],
      deityWeapons: false
    }
  },
  // "all simple and martial weapons and with light, medium and heavy armour.
  // The katana and wakizashi are considered martial weapons for you … You are
  // not automatically proficient with shields."
  Oathblade: {
    wealth: 2,
    proficiency: {
      label: "Oathblade",
      armourCategories: ["Light", "Medium", "Heavy"], armourNames: [], otherTiers: ["light", "medium", "heavy"], armourExclude: [],
      shieldCategories: [], shieldNames: [],
      weaponCategories: ["Simple", "Martial"], weaponNames: ["Katana", "Wakizashi"],
      weaponRules: [],
      deityWeapons: false
    }
  }
};

/** Block 3: the traits Inner Tempest introduces (Chapter 7's Technique, Chapter 6's Monastic). */
export const TRAITS = ["Technique", "Monastic", "Backswing", "Brace", "Twin"];

/** "You can also select feats with the Technique trait" — Inner Discipline opens them. */
export const FEAT_GATES = { Technique: ["Inner Discipline"] };

/** Chapter 2 — Scree Cant, "an uncommon language" (printed). */
export const LANGUAGES = {
  "Scree Cant": { rarity: "uncommon", speakers: "Scree" }
};

/** Chapter 2 — every new race prints "Power Points: 0". */
export const RACIAL_PP = { Miraku: 0, Ryukari: 0, Scree: 0, Tianzhi: 0 };

/**
 * Chapter 5 General feats that let one skill stand in for another on a
 * named action. The core offers the action from the new skill and uses
 * that skill's ranks for its requirement.
 */
export const SKILL_SUBSTITUTIONS = {
  "Artistic Negotiation": [
    { action: "encourage", skill: "artistry" },
    { action: "makeAnImpression", skill: "artistry" }
  ],
  "Radiant Insight": [{ action: "clearMind", skill: "religion" }],
  "Spirit Whisperer": [{ action: "gatherInformation", skill: "meditation" }],
  // Chapter 4, Read the Elements' Critical: "you may use Nature instead of
  // Survival to Track that creature for the next hour" — the hour's
  // temporary ability carries this name.
  [ELEMENTAL_TRACKING]: [{ action: "track", skill: "nature" }]
};

/**
 * BLOCK 5 (0.6.0), FR-48: "Existing racial feats" — the core racial feats
 * Chapter 5 opens to each race, a bracketed heritage limiting one to that
 * heritage (TRG Prime 3.669.0 `registerFeatAccess` with `{ name, heritages }`).
 * The book's own lists (tools/content/book-text-block5.json `existing`),
 * checked against it by tools/verify-block5.mjs.
 */
export const EXISTING_RACIAL_FEATS = Object.freeze({
  Miraku: ["Animal Magic", "Animal Sense", { name: "Bestial Resilience", heritages: ["Mujina"] }, { name: "Ethereal Trick", heritages: ["Kitsune"] }, "Mental Fortress", { name: "Sure Footed", heritages: ["Ren"] }, { name: "Swift Reflexes", heritages: ["Ren"] }, "Voice of the Beast"],
  Ryukari: [{ name: "Darkened Veil", heritages: ["Kura"] }, "Dracoris", { name: "Fire-Like Blood", heritages: ["Zenki"] }, { name: "Stone Wise", heritages: ["Fuku"] }, "Wings of the Wyrm"],
  Scree: [{ name: "Ethereal Trick", heritages: ["Hotaru"] }, "Expert of Aid", "Innate Teamwork", "Master of Aid", { name: "Resilience of Stone", heritages: ["Kabuto"] }, { name: "Stone-Like Endurance", heritages: ["Kabuto"] }, { name: "Sure Footed", heritages: ["Joro"] }, "Swift Reflexes", { name: "Swift Stride", heritages: ["Suzume"] }],
  Tianzhi: [{ name: "Earth Sense", heritages: ["Tsuchi"] }, { name: "Earthbound Might", heritages: ["Tsuchi"] }, { name: "Fire-Like Blood", heritages: ["Kasai"] }, { name: "Graceful Step", heritages: ["Fuukaze"] }, "Mental Fortress", { name: "Mountain Strider", heritages: ["Tsuchi"] }, "Self Aware", { name: "Stone Wise", heritages: ["Tsuchi"] }, { name: "Swift Reflexes", heritages: ["Fuukaze"] }, { name: "Swift Stride", heritages: ["Fuukaze"] }, "Worldly"]
});

/**
 * BLOCK 6 (0.7.0), FC-55: "Existing class feats" — the core class feats
 * Chapter 5 opens to each of the five classes (TRG Prime's
 * `registerFeatAccess("class", …)`). The book's own lists
 * (tools/content/book-text-block6.json `existing`), checked against it by
 * tools/verify-block6.mjs. "Accurate Spell (applies to Mystic innate
 * spells)" is the feat Accurate Spell. "Metamagic Feats where compatible
 * with innate spells" names no feat: the Metamagic feats a Mystic may use
 * are Adept-traited, open to it already, and work on its innate spells
 * through TRG Prime 3.670.0's `innateMetamagic` (Graham's B6-8).
 */
/**
 * FA-22: "The classes in this sourcebook also gain access to the following
 * archetype feats from the TRG Core Rulebook" (TRG Prime 3.671.0
 * `registerFeatAccess("archetype", …)`). The book's own lists
 * (tools/content/book-text-block7.json `existing`), checked against it by
 * tools/verify-block7.mjs. The system's tier rule still opens the Martial,
 * Expert and Adept archetypes besides (Graham's B7-8).
 */
export const EXISTING_ARCHETYPES = Object.freeze({
  Disciple: Object.freeze(["Assassin", "Mastermind"]),
  Ghostwalker: Object.freeze(["Assassin", "Mastermind"]),
  Kensai: Object.freeze(["Mastermind", "Vanguard"]),
  Mystic: Object.freeze(["Mastermind", "Runemage"]),
  Oathblade: Object.freeze(["Archer", "Armour Master", "Cavalier", "Champion"])
});

export const EXISTING_CLASS_FEATS = Object.freeze({
  Disciple: ["Combat Awareness", "Combat Grapple", "Evasion", "Guarded Move", "Reactive Stance", "Stance Mastery", "Superior Evasion"],
  Ghostwalker: ["Combat Awareness", "Distracting Strike", "Evasion", "Mobility", "Nimble Dodge", "Reactive Stance", "Surprise Attack", "Superior Evasion"],
  Kensai: ["Combat Awareness", "Combat Grapple", "Disarm Stance", "Distracting Strike", "Duelling Riposte", "Mobility"],
  Mystic: ["Accurate Spell", "Combat Reflexes", "Injury Relief", "Reactive Stance", "Stance Mastery"],
  Oathblade: ["Combat Awareness", "Disrupting Stance", "Furious Focus", "Lunging Stance", "Reactive Stance", "Resolve", "Superior Resolve"]
});

export function registerContent(api, moduleId) {
  if (!api || typeof api !== "object") throw new Error(`${moduleId}: TRG Prime module API missing`);
  api.registerSourcebook?.(moduleId, "Inner Tempest", moduleId);
  for (const [name, spec] of Object.entries(LANGUAGES)) api.registerLanguage(name, spec, moduleId);
  for (const [name, per] of Object.entries(RACIAL_PP)) api.registerRacialPP(name, per, moduleId);
  for (const [name, entries] of Object.entries(SKILL_SUBSTITUTIONS)) api.registerSkillSubstitution(name, entries, moduleId);
  // Chapter 4's seventeen skill actions (Block 2).
  api.registerSkillActions(SKILL_ACTIONS.map((a) => ({ ...a })), moduleId);
  for (const [name, entry] of Object.entries(AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const [name, hint] of Object.entries(PASSIVE_HINTS)) api.registerPassiveAutomation?.(name, hint, moduleId);
  // Evade and Impact Absorption, offered to the defender before the attack
  // rolls (0.3.2, on TRG Prime 3.666.1). See module/defence-offers.mjs.
  for (const [name, spec] of Object.entries(DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);
  // BLOCK 3 (0.4.0, on TRG Prime 3.667.0): the Disciple and the Mystic.
  api.registerTraits?.(TRAITS, moduleId);
  for (const [name, spec] of Object.entries(CLASS_REGISTRATIONS)) api.registerClass(name, spec, moduleId);
  for (const [trait, feats] of Object.entries(FEAT_GATES)) api.registerFeatGate(trait, feats, moduleId);
  for (const [name, entry] of Object.entries(BLOCK3_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const [name, spec] of Object.entries(BLOCK3_DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);
  // BLOCK 4 (0.5.0, on TRG Prime 3.668.0): the Ghostwalker, the Kensai and the Oathblade.
  for (const [name, entry] of Object.entries(BLOCK4_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const [name, spec] of Object.entries(BLOCK4_DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);
  // BLOCK 5 (0.6.0, on TRG Prime 3.669.0): the racial feats, the core racial
  // feats opened to the four races, and the module's lights.
  for (const [name, entry] of Object.entries(BLOCK5_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const [name, hint] of Object.entries(BLOCK5_PASSIVE_HINTS)) api.registerPassiveAutomation?.(name, hint, moduleId);
  for (const [name, spec] of Object.entries(BLOCK5_DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);
  for (const [race, feats] of Object.entries(EXISTING_RACIAL_FEATS)) api.registerFeatAccess?.("race", race, feats, moduleId);
  api.registerLightSources?.(LIGHT_SOURCES.map((l) => ({ ...l })), moduleId);
  // BLOCK 6 (0.7.0, on TRG Prime 3.670.0): the last fourteen class feats, and
  // the core class feats opened to the five classes.
  for (const [name, entry] of Object.entries(BLOCK6_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const [cls, feats] of Object.entries(EXISTING_CLASS_FEATS)) api.registerFeatAccess?.("class", cls, [...feats], moduleId);
  // BLOCK 7 (0.8.0, on TRG Prime 3.671.0): the twenty archetypes (Dragon
  // Tamer is Block 10's, B7-1), their Uses and class-skill choices, and the
  // core archetypes opened to the five classes (FA-22, C2).
  for (const [name, spec] of Object.entries(BLOCK7_ARCHETYPES)) api.registerArchetype?.(name, { ...spec }, moduleId);
  for (const [name, entry] of Object.entries(BLOCK7_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const grant of BLOCK7_CLASS_SKILL_GRANTS) api.registerClassSkillGrant?.({ ...grant, options: [...grant.options] }, moduleId);
  for (const [cls, archetypes] of Object.entries(EXISTING_ARCHETYPES)) api.registerFeatAccess?.("archetype", cls, [...archetypes], moduleId);
  // BLOCK 8 (0.9.0, on TRG Prime 3.672.0): Spiritual Distraction answers each
  // casting before its spell check (C5a).
  api.registerSpellCheckGate?.("spiritualDistraction", spiritualDistractionGate, moduleId);
  // BLOCK 9 (0.10.0, on TRG Prime 3.673.0): Chapter 9's runes, the wondrous
  // items' Uses and Monastic Items' road to Create.
  registerBlock9(api, moduleId);
  // BLOCK 10 (1.0.0, on TRG Prime 3.674.0): the dragon companion kind (C1),
  // Dragon Tamer, and the companion feats' Uses and reaction.
  registerBlock10(api, moduleId);
}
