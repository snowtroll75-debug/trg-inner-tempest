/**
 * Inner Tempest Block 5 (0.6.0): what the 47 racial feats of Chapter 5 DO,
 * beyond the data on their items.
 *
 * Built on TRG Prime 3.669.0 (Graham's rulings of 24 October 2026, B5-1 to
 * B5-4; docs/INNER_TEMPEST_BLOCK5_AUDIT.md). The core does what it can be
 * told about on the item: conditionals, defence rows, the conviction refund
 * (Adaptive Mind), the fumble reroll (Fortune's Reversal), the daily firsts
 * (Tianzhi Discipline and Meditation), a push made shorter (Immovable
 * Plating), a granted Fly Speed (Wings Unfurled), an ally aura switched on
 * by a Use (Spirit Beacon, Mist Veil). This file does the rest:
 *
 *   - the Uses: Awaken the Animism, the four save techniques (Blinding
 *     Majesty, Celestial Breath, Valley Chill, Web Snare), the strike
 *     techniques (Elemental Infusion, Magma Channel, Serpent's Venom), the
 *     lights (Foxfire's motes, Spirit Beacon), Mist Veil, Spirit Roar,
 *     Wind-Borne Motion, the Elemental spell choices, Draconic Armament;
 *   - what follows a Strike (TRG Prime's `trgPrimeStrikeResolved`): Serpent's
 *     Venom delivered, Paralysing Venom offered, Waiting Blade offered;
 *   - Guardian's Intercession, a reaction to an ally being attacked (TRG
 *     Prime 3.669.0's `forAlly` defence offer);
 *   - what keeps an item in step: Raptorial Refinement's blade, Elemental
 *     Attunement's element.
 *
 * Pure decisions are exported and driven by tools/verify-block5.mjs; the
 * Foundry side reads `game.trgPrime.modules.helpers` at call time.
 */
import { helpers, spendAP, spendReaction, reactionOpen, hasUse, spendUse, landSpeed, owns, missedHere, SYSTEM_ID, MODULE_ID } from "./automations.mjs";
import { SHARED, registerSharedOps } from "./block4-automations.mjs";

const {
  ownedNamed, made, ownEffects, safeDelete, putEffect, untilNextTurn, untilEndOfNextTurn, untilEndOfTurn,
  forRounds, forSeconds, card, focusReady, confirm, tokenOf, actorFrom, targetOnly, pickWeapon, levelOf, offerTo, asOwner, passive, esc, norm, int
} = SHARED;
const h = () => helpers();

/* ------------------------------------------------------------------ */
/* What the book prints, as tables                                      */
/* ------------------------------------------------------------------ */

/**
 * ELEMENTAL POWER, SUPREMACY AND ASCENDANT, as printed ("one of the
 * following PP 2 spells which has a trait that matches your racial
 * element"), and Graham's B5-2: by trait, plus Water Walk and Water
 * Breathing for the Suiryoku, Magic Stone for the Tsuchi and Endure
 * Elements for every element.
 */
export const ELEMENT_SPELL_LISTS = Object.freeze({
  "Elemental Power": Object.freeze({
    pp: 2, names: Object.freeze(["Burning Hands", "Breeze Strike", "Ice Slick", "Magic Stone", "Obscuring Mist", "Restoration", "Self Healing", "Water Bolt"]),
    also: Object.freeze({ Tsuchi: ["Magic Stone"] })
  }),
  "Elemental Supremacy": Object.freeze({
    pp: 4, names: Object.freeze(["Acid Bolt", "Cold Bolt", "Endure Elements", "Fire Bolt", "Icy Spray", "Restore Senses", "Water Breathing", "Whispering Wind"]),
    also: Object.freeze({ Fuukaze: ["Endure Elements"], Hikari: ["Endure Elements"], Kasai: ["Endure Elements"], Suiryoku: ["Water Breathing", "Endure Elements"], Tsuchi: ["Endure Elements"] })
  }),
  "Elemental Ascendant": Object.freeze({
    pp: 6, names: Object.freeze(["Cold Ball", "Crashing Torrent", "Earth Bind", "Fireball", "Line of Lightning", "Remove Disease", "Searing Ray", "Stone Call", "Water Walk", "Wall of Wind"]),
    also: Object.freeze({ Suiryoku: ["Water Walk"] })
  })
});

/** Celestial Breath: "The damage type and additional traits are determined by your heritage". */
export const CELESTIAL_BREATH = Object.freeze({
  Shinryu: Object.freeze({ type: "electricity", traits: Object.freeze(["Air", "Electricity"]) }),
  Zennyo: Object.freeze({ type: "cold", traits: Object.freeze(["Cold", "Water"]) }),
  Fuku: Object.freeze({ type: "acid", traits: Object.freeze(["Acid", "Earth"]) }),
  Kura: Object.freeze({ type: "cold", traits: Object.freeze(["Cold", "Shadow"]) }),
  Zenki: Object.freeze({ type: "fire", traits: Object.freeze(["Fire"]) })
});

/** The light sources this module registers (TRG Prime 3.669.0 `registerLightSources`). */
export const LIGHT_SOURCES = Object.freeze([
  // Living Lantern: "You emit dim light within 10 feet." Dim light is one
  // step, as the core's Ember Of Devotion reads it ("dim light (+1 light
  // level)"); no bright ring is drawn.
  Object.freeze({ key: "living-lantern", label: "Living Lantern", steps: 1, cap: null, magical: false, radiusFeet: 10, brightFeet: 0 }),
  // Spirit Beacon: "bright light within 20 feet and dim light for a further
  // 20 feet". Bright light is three steps, as the core's Luminance prints
  // ("A bright light … increasing the light level by three steps"); the
  // further 20 feet is its own one-step source, so a creature 30 feet away
  // is lit a step and one 10 feet away three (sources do not stack; the
  // brightest wins). The glow is drawn from the bright one, 40 and 20.
  Object.freeze({ key: "spirit-beacon", label: "Spirit Beacon", steps: 3, cap: null, magical: true, radiusFeet: 20, dimFeet: 40, brightFeet: 20 }),
  Object.freeze({ key: "spirit-beacon-dim", label: "Spirit Beacon (dim)", steps: 1, cap: null, magical: true, radiusFeet: 40, brightFeet: 0 })
]);

/* ------------------------------------------------------------------ */
/* Pure decisions                                                       */
/* ------------------------------------------------------------------ */

/** The heritage item's name and its Tianzhi element (`itElement`, Block 1), if any. */
export function heritageOf(items = []) {
  const heritage = Array.from(items ?? []).find((i) => i?.type === "heritage") ?? null;
  const el = heritage?.flags?.[SYSTEM_ID]?.itElement ?? null;
  return {
    name: String(heritage?.name ?? ""),
    element: el ? { element: String(el.element ?? ""), damageType: String(el.damageType ?? ""), spellTraits: (el.spellTraits ?? []).map((t) => norm(t)).filter(Boolean) } : null
  };
}

/**
 * The spell chooser's spec for one of the three Elemental feats: the printed
 * names, those carrying a trait of the element, and Graham's additions.
 */
export function elementSpellSpec(featName, heritageName, element) {
  const list = ELEMENT_SPELL_LISTS[featName];
  if (!list || !element?.spellTraits?.length) return null;
  return {
    names: [...list.names],
    traitsAny: [...element.spellTraits],
    alsoNames: [...(list.also[heritageName] ?? [])],
    innate: true,
    castingAbility: "wisdom",
    note: `${featName}: an innate spell with the Focus trait, cast with Wisdom and costing no PP. Its tradition is your Natural Chi's.`
  };
}

/** Celestial Breath's dice: "1d6 damage per 2-character levels, with a minimum of 2d6". */
export function breathDice(level) {
  return Math.max(2, Math.floor(int(level) / 2));
}

/** Serpent's Venom's Fumble: "1d6 poison damage per 3-character levels (minimum 1d6)". */
export function venomDice(level) {
  return Math.max(1, Math.floor(int(level) / 3));
}

/** Awaken the Animism's benefit by heritage, as effect changes and flags. */
export function awakenBenefit(heritageName) {
  switch (heritageName) {
    case "Kitsune": return {
      line: "<strong>advantage</strong> on Bluff and Feint (Deception)",
      changes: [],
      flags: { conditionals: [{ kind: "advantage", label: "Awaken the Animism (Kitsune)", scope: "Bluff and Feint (Deception)", auto: true, when: { actions: ["bluff", "feint"] } }] }
    };
    case "Mujina": return {
      line: "<strong>Base DR +1</strong>",
      changes: [{ key: "system.combat.naturalArmourBase.natural", mode: 2, value: "1", priority: 30 }],
      flags: {}
    };
    case "Ren": return {
      line: "<strong>Speed +10 feet</strong>, and falls a further 20 feet shorter",
      // A TYPED BONUS TO THE SPEED (0.6.1; found live): the movement entry is
      // an object, so the slot is named, as Block 3's Speed bonuses are.
      changes: [{ key: "system.combat.movement.land.untyped", type: "custom", value: "10", priority: 20 }],
      flags: { fallReduction: { value: 20, label: "Awaken the Animism (Ren)" } }
    };
    case "Byakko": return {
      line: "<strong>+2 damage</strong> on your melee Strikes",
      changes: [],
      flags: { conditionals: [{ kind: "modifier", value: 2, type: "untyped", label: "Awaken the Animism (Byakko)", scope: "Melee Strikes: +2 base damage", auto: true, when: { checkTypes: ["damage"], attackModes: ["melee"] } }] }
    };
    case "Orochi": return {
      line: "<strong>Swim Speed +10 feet</strong>, and <strong>advantage</strong> on Escape and on saves against poison",
      changes: [{ key: "system.combat.movement.swim.untyped", type: "custom", value: "10", priority: 20 }],
      flags: { conditionals: [
        { kind: "advantage", label: "Awaken the Animism (Orochi)", scope: "Escape checks", auto: true, when: { actions: ["escape"] } },
        { kind: "advantage", label: "Awaken the Animism (Orochi)", scope: "Saving throws against poison", auto: true, when: { checkTypes: ["save"], traits: ["poison"] } },
        { kind: "advantage", label: "Awaken the Animism (Orochi)", scope: "Saving throws against poison — tick if this save is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["poison"] } } }
      ] }
    };
    default: return null;
  }
}

/** Elemental Attunement's rows for an element: the Recall Knowledge tick, the innate attack, the save DC. */
export function attunementFlags(element) {
  if (!element?.spellTraits?.length) return null;
  const name = element.element || "your element";
  return {
    conditionals: [
      { kind: "modifier", value: 2, type: "race", label: "Elemental Attunement", scope: `Recall Knowledge about ${name} — tick if this check is one`, auto: false, when: { actions: ["recallKnowledge"] } },
      // INNATE SPELLS ONLY ("innate spell attack checks and innate spell save
      // DCs"): TRG Prime 3.669.0 names an innate spell's attack, and lets a
      // DC bonus ask for innate spells (found in review: the first build
      // reached a Mystic's prepared Fire Bolt too).
      { kind: "modifier", value: 1, type: "race", label: "Elemental Attunement", scope: `Innate spell attacks with a ${element.spellTraits.join(" or ")} spell`, auto: true, when: { checkTypes: ["attack"], actions: ["innateSpellAttack"], traits: [...element.spellTraits] } }
    ],
    spellDCBonus: { label: "Elemental Attunement", value: 1, type: "race", traits: [...element.spellTraits], innateOnly: true }
  };
}

/** A circumstance penalty to Speed (and, for Valley Chill, to Reflex saves). */
export function slowingChanges(feet, reflex = 0) {
  const out = [{ key: "system.combat.movement.land.circumstance", type: "custom", value: String(-Math.abs(int(feet))), priority: 20 }];
  return { changes: out, conditionals: reflex ? [{ kind: "modifier", value: -Math.abs(int(reflex)), type: "circumstance", label: "Valley Chill", scope: "Reflex saving throws", auto: true, when: { checkTypes: ["save"], subjects: ["reflex"] } }] : [] };
}

/** Speed penalties by save degree, and how many rounds each lasts (Graham's round reading). */
export const SPEED_LADDERS = Object.freeze({
  // "Success … -5-foot … until the beginning of its next turn. Partial … -5-foot … until the end of its next turn."
  "Paralysing Venom": Object.freeze({ success: { feet: 5, rounds: 1 }, partial: { feet: 5, rounds: 2 } }),
  // Web Snare: "Success … -5-foot … until the beginning of its next turn. Partial … -10-foot … until the end of its next turn."
  "Web Snare": Object.freeze({ success: { feet: 5, rounds: 1 }, partial: { feet: 10, rounds: 2 } }),
  // Valley Chill: every rung "until the beginning of your next turn".
  "Valley Chill": Object.freeze({ success: { feet: 5, rounds: 1 }, partial: { feet: 10, rounds: 1 }, failure: { feet: 10, reflex: 1, rounds: 1 }, fumble: { feet: 10, reflex: 1, rounds: 1 } })
});

/** A degree read through the ladder's own fallbacks (heroic → critical, blunder → fumble). */
export function ladderRung(ladder = {}, degree = "") {
  const d = norm(degree);
  if (ladder[d]) return ladder[d];
  if (d === "heroic") return ladder.critical ?? null;
  if (d === "blunder") return ladder.fumble ?? null;
  return null;
}

/** The conditions each save technique's ladder applies (rows in TRG Prime's peril shape). */
export const SAVE_LADDERS = Object.freeze({
  "Blinding Majesty": Object.freeze({
    save: "reflex",
    outcomes: { critical: "unaffected.", success: "dazzled until the beginning of its next turn.", partial: "dazzled until the end of its next turn.", failure: "dazzled for 1 minute.", fumble: "blinded until the beginning of its next turn, then dazzled for 1 minute." },
    conditions: { critical: [], success: [{ key: "dazzled", value: null, rounds: 1 }], partial: [{ key: "dazzled", value: null, rounds: 2 }], failure: [{ key: "dazzled", value: null, minutes: 1 }], fumble: [{ key: "blinded", value: null, rounds: 1 }, { key: "dazzled", value: null, minutes: 1 }] }
  }),
  "Valley Chill": Object.freeze({
    save: "fortitude",
    outcomes: { critical: "unaffected.", success: "−5 ft Speed until the beginning of your next turn.", partial: "−10 ft Speed until the beginning of your next turn.", failure: "−10 ft Speed and −1 to Reflex saves until the beginning of your next turn.", fumble: "as Failure, and Slowed 1 until the beginning of your next turn." },
    conditions: { critical: [], success: [], partial: [], failure: [], fumble: [{ key: "slowed", value: 1, rounds: 1 }] }
  }),
  "Paralysing Venom": Object.freeze({
    save: "fortitude",
    outcomes: { critical: "unaffected.", success: "−5 ft Speed until the beginning of its next turn.", partial: "−5 ft Speed until the end of its next turn.", failure: "Slowed 1 until the end of its next turn.", fumble: "Paralysed until the beginning of its next turn, then Slowed 1 until the end of that turn." },
    conditions: { critical: [], success: [], partial: [], failure: [{ key: "slowed", value: 1, rounds: 2 }], fumble: [{ key: "paralyzed", value: null, rounds: 1 }, { key: "slowed", value: 1, rounds: 2 }] }
  }),
  "Serpent's Venom": Object.freeze({
    save: "fortitude",
    outcomes: { critical: "unaffected.", success: "unaffected.", partial: "Sickened 1.", failure: "Sickened 2.", fumble: "Sickened 2, and poison damage." },
    conditions: { critical: [], success: [], partial: [{ key: "sickened", value: 1 }], failure: [{ key: "sickened", value: 2 }], fumble: [{ key: "sickened", value: 2 }] }
  }),
  "Web Snare": Object.freeze({
    save: "reflex",
    outcomes: { critical: "avoids the webbing and is unaffected.", success: "−5 ft Speed until the beginning of its next turn.", partial: "−10 ft Speed until the end of its next turn.", failure: "Immobilised; Escape against your Level DC frees it.", fumble: "Immobilised (Escape against your Level DC) and flat-footed while it remains so." },
    conditions: { critical: [], success: [], partial: [], failure: [], fumble: [] }
  })
});

/** Raptorial Refinement: what the blade becomes ("AR … increases from 1 to 2 … gains the Versatile Piercing trait"). */
export function refinedBlade(system = {}) {
  const armourRending = Math.max(2, int(system.armourRending));
  const traits = String(system.traits ?? "");
  const versatile = /\bversatile\b/i.test(traits) ? traits : [traits.trim(), "Versatile P"].filter(Boolean).join(", ");
  return { armourRending, traits: bladeTraitsWithAR(versatile, armourRending) };
}

/**
 * THE AR ON THE TRAIT LINE (0.6.1; found live). TRG Prime reads a weapon's
 * Armour Rending from its traits ("AR 1"), not from the item's field, so the
 * Raptorial Blade's AR never applied. Any "AR n" already there is replaced.
 */
export function bladeTraitsWithAR(traits, armourRending) {
  const ar = int(armourRending);
  const kept = String(traits ?? "").split(",").map((t) => t.trim()).filter((t) => t && !/^AR\s*\d+$/i.test(t));
  return (ar > 0 ? [...kept, `AR ${ar}`] : kept).join(", ");
}

/**
 * A FEAT THAT RAISES ANOTHER ITEM'S TICK (0.6.1; found live): Forgeheart
 * ("the racial bonus granted by your Zenki heritage … increases from +1 to
 * +2") and Many-Faceted Vigilance (Compound Eyes', likewise). The feat adds
 * no tick of its own; the heritage's or ability's row is raised.
 */
export const RAISED_TICKS = Object.freeze({
  "forgeheart": Object.freeze({ itemType: "heritage", itemName: "Zenki", label: "Zenki", value: 2 }),
  "many-faceted vigilance": Object.freeze({ itemType: "ability", itemName: "Compound Eyes", label: "Compound Eyes", value: 2 })
});

/**
 * The value that deletes the key it is assigned to (0.6.2, found in review):
 * Foundry 14's ForcedDeletion operator, as TRG Prime's deletion.mjs makes it.
 * The older `-=key: null` spelling still works but warns on every use.
 */
function deletionValue() {
  const ForcedDeletion = globalThis.foundry?.data?.operators?.ForcedDeletion;
  return typeof ForcedDeletion === "function" ? new ForcedDeletion() : undefined;
}

/** The item's conditional rows with the labelled tick set to `value` (pure). */
export function raisedTickRows(rows, label, value) {
  return (Array.isArray(rows) ? rows : []).map((r) => (r && r.label === label && r.kind === "modifier" ? { ...r, value } : r));
}

/**
 * WHAT TO WRITE ON THE TICK'S ITEM (0.6.2; found live, pure). Returns the
 * update, or null when the item is already right.
 *
 * WHY IT WAS NOT ENOUGH TO WRITE THE ROW. Compound Eyes is an `ability`
 * copied from this module's abilities pack, and TRG Prime (3.631.0, codex
 * inheritance) lays the pack entry's `flags.trg-prime` over every ability
 * copy of the same name, at prepare time. 0.6.1's +2 was saved on the item
 * and the item the roll reads showed the pack's +1. The core's own answer
 * for "a module that genuinely wants a copy to differ" is
 * `flags.trg-prime.codexInherit: false`, so while the feat is held the copy
 * carries it, and the stash records that this module set it. A heritage
 * (Forgeheart's Zenki) is not inherited, and is only raised.
 *
 * SELF-MENDING. While held, anything not yet right is written: the row on
 * the item, the opt-out, the stash. A Kabuto saved under 0.6.1 (its row
 * raised and its stash set, but still inheriting the pack's +1) is mended.
 *
 * @param {object} opts
 * @param {boolean} opts.held the actor has the feat
 * @param {object} opts.spec a RAISED_TICKS entry
 * @param {boolean} opts.isAbility the target is an ability (codex-inherited)
 * @param {object[]} opts.ownRows the item's own (source) rows
 * @param {*} opts.codexInherit the item's own `flags.trg-prime.codexInherit`
 * @param {object|null} opts.stash the module's record, `{ value, codex? }`
 * @param {string} opts.moduleId
 * @param {string} opts.systemId
 * @param {string} opts.stashKey
 * @param {Function} [opts.deletion] makes the value that deletes a key
 */
export function raisedTickUpdate({ held, spec, isAbility, ownRows, codexInherit, stash, moduleId, systemId, stashKey, deletion = deletionValue }) {
  const row = (Array.isArray(ownRows) ? ownRows : []).find((r) => r?.label === spec?.label && r?.kind === "modifier");
  // NO ROW TO PUT BACK (found in review): the feat gone, the stash and this
  // module's opt-out still go, rather than staying for ever.
  if (!row) {
    if (held || !stash) return null;
    return { [`flags.${moduleId}.${stashKey}`]: deletion(), ...(stash.codex ? { [`flags.${systemId}.codexInherit`]: deletion() } : {}) };
  }
  const update = {};
  if (held) {
    if (row.value !== spec.value) update[`flags.${systemId}.conditionals`] = raisedTickRows(ownRows, spec.label, spec.value);
    // The opt-out, recorded as this module's only when it set it: a copy
    // already opted out by someone else keeps it on removal.
    const setsCodex = Boolean(isAbility) && codexInherit !== false;
    if (setsCodex) update[`flags.${systemId}.codexInherit`] = false;
    const want = { value: stash ? stash.value : row.value, ...((stash?.codex || setsCodex) ? { codex: true } : {}) };
    if (!stash || Boolean(stash.codex) !== Boolean(want.codex)) update[`flags.${moduleId}.${stashKey}`] = want;
  } else if (stash) {
    update[`flags.${systemId}.conditionals`] = raisedTickRows(ownRows, spec.label, stash.value);
    update[`flags.${moduleId}.${stashKey}`] = deletion();
    if (stash.codex) update[`flags.${systemId}.codexInherit`] = deletion();
  }
  return Object.keys(update).length ? update : null;
}

/** Elemental Infusion's rider: "an additional 1d4 damage of your elemental type" on melee Strikes. */
export function infusionFlags(damageType) {
  return { strikeRider: { dice: "1d4", damageType: String(damageType ?? ""), scope: "melee", once: false, label: "Elemental Infusion" } };
}

/** Magma Channel: "an additional 1d6 secondary fire damage and gains the Magical trait", on the next melee hit. */
export const MAGMA_FLAGS = Object.freeze({
  strikeRider: Object.freeze({ dice: "1d6", damageType: "fire", scope: "melee", once: true, spendOnHit: true, label: "Magma Channel" }),
  magicalAttacks: Object.freeze({ label: "Magma Channel" })
});

/** Spirit Beacon's bright light: its light source and the switch for its ally aura (a minute, and a round's grace). */
// IN COMBAT THE EFFECT'S OWN END GOVERNS (0.6.1; found live). With the world
// clock running in real time while the game is unpaused (Simple Calendar), a
// cap in world seconds ran out long before the rounds did, and the next aura
// refresh lifted the switch. In combat the switch is held for an hour and the
// effect's round-based end takes it away; out of combat the seconds stand.
const SWITCH_IN_COMBAT = 3600;
export function beaconFlags(now, inCombat = false) {
  return { lightSource: "spirit-beacon", auraSwitch: { state: "spirit-beacon", until: Math.trunc(Number(now) || 0) + (inCombat ? SWITCH_IN_COMBAT : 66) } };
}

/** Mist Veil's switch: on until its effect ends at the start of your next turn. */
export function mistFlags(now, inCombat = false) {
  return { auraSwitch: { state: "mist-veil", until: Math.trunc(Number(now) || 0) + (inCombat ? SWITCH_IN_COMBAT : 12) } };
}

const inCombatNow = (actor) => Boolean(game.combat?.started && game.combat.combatants?.some?.((c) => c.actor?.id === actor?.id));

/** Web Snare's hold: Immobilised on a Failure, and flat-footed too on a Fumble. */
export function webSnareStatuses(degree) {
  const d = norm(degree);
  if (d === "failure") return ["immobilised"];
  if (d === "fumble" || d === "blunder") return ["immobilised", "flatFooted"];
  return [];
}

/** Foxfire's move: "once each turn thereafter as a Free Action". */
export function foxfireMoveSpent(record, combat) {
  if (!record || !combat) return false;
  return String(record.combatId) === String(combat.id) && int(record.round) === int(combat.round) && int(record.turn) === int(combat.turn);
}

/** Draconic Armament: the attack a copy of the feat may still give, of the two. */
export function draconicOnOffer(ownedAttackNames = [], featCopies = 1) {
  const have = new Set((ownedAttackNames ?? []).map(norm));
  const all = ["Draconic Bite", "Draconic Claw"];
  if (have.size >= Math.min(2, Math.max(1, int(featCopies)))) return [];
  return all.filter((n) => !have.has(norm(n)));
}

/** Spirit Roar: which creatures still answer to it this encounter. */
export function spiritRoarImmune(record, combatId, uuid) {
  return Boolean(record && combatId && String(record.combatId) === String(combatId) && (record.uuids ?? []).includes(uuid));
}

/* ------------------------------------------------------------------ */
/* Small Foundry steps                                                  */
/* ------------------------------------------------------------------ */

const isActingGM = () => Boolean(game.user?.isGM && (!game.users?.activeGM || game.users.activeGM === game.user));

/** "Duration 1 minute": ten rounds of the bearer's turns in combat, sixty seconds out of it. */
const forOneMinute = (actor) => (game.combat?.started ? forRounds(actor, 10) : forSeconds(60));

/** A round-counted clock for a creature that is not the caster (Graham's round reading). */
function forCombatRounds(rounds) {
  if (!game.combat?.started) return forSeconds(6 * rounds);
  return { system: { conditionExpiresRound: int(game.combat.round) + rounds }, module: { combatId: game.combat.id } };
}

/** A technique's opening: its Focus use ready, then the AP, then the use. */
async function techniqueBegins(actor, item, label, ap) {
  if (!(await focusReady(item, label))) return false;
  if (ap > 0 && !(await spendAP(actor, label, ap))) return false;
  return spendUse(item, label);
}

const heritageName = (actor) => heritageOf(actor?.items).name;

/** Creatures within `feet` of the actor's token, their tokens, and how they stand. */
function creaturesWithin(actor, feet) {
  const mine = tokenOf(actor);
  if (!mine || !canvas?.grid) return [];
  const half = (t) => ((Number(t?.document?.width) || 1) - 1) * 2.5;
  return (canvas.tokens?.placeables ?? []).filter((t) => t.actor && t.id !== mine.id && !t.document?.hidden)
    .map((t) => ({ token: t, actor: t.actor, distance: Number(canvas.grid.measurePath?.([mine.center, t.center])?.distance ?? Infinity), disposition: t.document?.disposition }))
    // MEASURED FROM THE SPACES, not the centres: a Large creature's edge.
    .filter((c) => c.distance <= feet + half(mine) + half(c.token));
}

/** Plainly on the other side (friendly against hostile), as the core's auras read it. */
function opposed(a, b) {
  const x = Number(a), y = Number(b);
  return (x === 1 && y === -1) || (x === -1 && y === 1);
}

/** Lay one module effect on a creature, through the GM when it is not ours. */
async function layOn(target, data) {
  return h().createEffectsOn(target, [data]);
}

/** A Speed penalty (and Valley Chill's Reflex) on a creature for a rung. */
async function slowCreature(target, label, rung, img) {
  if (!rung) return "";
  const { changes, conditionals } = slowingChanges(rung.feet, rung.reflex ?? 0);
  await layOn(target, made(`b5:${norm(label)}`, {
    name: `${label}: −${rung.feet} ft Speed${rung.reflex ? ", −1 Reflex" : ""}`, img,
    description: `${label}: a −${rung.feet}-foot circumstance penalty to Speed${rung.reflex ? " and a −1 circumstance penalty to Reflex saving throws" : ""}.`,
    changes, system: conditionals.length ? { conditionals } : {}
  }, forCombatRounds(rung.rounds)));
  return `${esc(target.name)}: −${rung.feet} ft Speed${rung.reflex ? " and −1 Reflex" : ""} (${rung.rounds === 1 ? "a round" : `${rung.rounds} rounds`}).`;
}

/** A save technique through the core's area rail: the lines, and who rolled what. */
async function runSaveTechnique(actor, title, spec, opts = {}) {
  const results = [];
  const lines = await h().runAreaEffect(actor, spec, { title, results, ...opts });
  return { lines: lines ?? [], results };
}

/* ------------------------------------------------------------------ */
/* The Uses                                                             */
/* ------------------------------------------------------------------ */

const awakenTheAnimism = {
  hint: "1 AP (Focus): your ancestral spirit shows for 1 minute — a benefit by heritage.",
  ownsFocusUse: true,
  async use(actor, item) {
    const her = heritageName(actor);
    const benefit = awakenBenefit(her);
    if (!benefit) { ui.notifications.warn(`Awaken the Animism: ${her || "no heritage"} has no benefit printed (Kitsune, Mujina, Ren, Byakko or Orochi).`); return false; }
    if (!(await techniqueBegins(actor, item, "Awaken the Animism", 1))) return false;
    await putEffect(actor, "b5:awaken", made("b5:awaken", {
      name: `Awaken the Animism (${her})`, img: item.img,
      description: `Awaken the Animism (${her}): ${benefit.line.replace(/<[^>]+>/g, "")}. Fluid Form cannot conceal your Animism while it lasts.`,
      changes: benefit.changes, system: benefit.flags
    }, forOneMinute(actor)));
    await card(actor, "Awaken the Animism", [
      `Your ${esc(her)} Animism shows itself for <strong>1 minute</strong>: ${benefit.line}.`,
      "<em>Your appearance unmistakably reveals your Animism; Fluid Form cannot conceal it.</em>",
      "<em>Focus use spent — Refocus restores it.</em>"
    ]);
    return true;
  }
};

/** Blinding Majesty, Valley Chill: an emanation round you. */
function emanation(title, { radiusFeet, ap, enemiesOnly, slowing }) {
  return {
    hint: `${ap} AP (Focus): a ${radiusFeet}-foot emanation; each creature saves against your Level DC.`,
    ownsFocusUse: true,
    async use(actor, item) {
      if (!tokenOf(actor)) { ui.notifications.warn(`${title}: your token must be on the scene.`); return false; }
      if (!(await techniqueBegins(actor, item, title, ap))) return false;
      const ladder = SAVE_LADDERS[title];
      const { lines, results } = await runSaveTechnique(actor, title, { save: ladder.save, radiusFeet, scope: "area", enemiesOnly, outcomes: { ...ladder.outcomes }, conditions: { ...ladder.conditions } });
      const extra = [];
      if (slowing) {
        for (const r of results) {
          const target = await actorFrom(r.uuid);
          const line = target ? await slowCreature(target, title, ladderRung(SPEED_LADDERS[title], r.degree), item.img) : "";
          if (line) extra.push(line);
        }
      }
      await h().postCard(actor, title, [...lines, ...extra.map((l) => h().line(l)), h().line("<em>Focus use spent — Refocus restores it.</em>")]);
      return true;
    }
  };
}

const celestialBreath = {
  hint: "2 AP (Focus): target the creatures in your 15-foot cone — a basic Reflex save against your heritage's breath.",
  ownsFocusUse: true,
  async use(actor, item) {
    const breath = CELESTIAL_BREATH[heritageName(actor)];
    if (!breath) { ui.notifications.warn("Celestial Breath: your heritage prints no breath (Shinryu, Zennyo, Fuku, Kura or Zenki)."); return false; }
    const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter((a) => a && a !== actor);
    if (!targets.length) { ui.notifications.warn("Celestial Breath: target the creatures in your 15-foot cone first."); return false; }
    if (!(await techniqueBegins(actor, item, "Celestial Breath", 2))) return false;
    const dice = breathDice(levelOf(actor));
    const { lines } = await runSaveTechnique(actor, "Celestial Breath", {
      save: "reflex", basic: true, scope: "targets", damage: { formula: `${dice}d6`, type: breath.type },
      intro: `A 15-foot cone of ${breath.type} (${breath.traits.join(", ")}): ${dice}d6, basic Reflex against your Level DC.`
    }, { targets });
    await h().postCard(actor, "Celestial Breath", [...lines, h().line("<em>Focus use spent — Refocus restores it.</em>")]);
    return true;
  }
};

const webSnare = {
  hint: "2 AP (Focus): target one creature within 30 feet — Reflex against your Level DC, or it is slowed or held fast.",
  ownsFocusUse: true,
  async use(actor, item) {
    const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter((a) => a && a !== actor);
    if (targets.length !== 1) { ui.notifications.warn("Web Snare: target exactly one creature within 30 feet."); return false; }
    const [target] = targets;
    if (!(await techniqueBegins(actor, item, "Web Snare", 2))) return false;
    const ladder = SAVE_LADDERS["Web Snare"];
    const { lines, results } = await runSaveTechnique(actor, "Web Snare", { save: "reflex", scope: "targets", outcomes: { ...ladder.outcomes }, conditions: { ...ladder.conditions } }, { targets: [target] });
    const degree = results[0]?.degree ?? "";
    const extra = [];
    const slow = ladderRung(SPEED_LADDERS["Web Snare"], degree);
    if (slow) extra.push(await slowCreature(target, "Web Snare", slow, item.img));
    if (["failure", "fumble", "blunder"].includes(norm(degree))) {
      // ONLY ONE AT A TIME: "any previous Web Snare immediately loses its restraining effect".
      const before = actor.getFlag(MODULE_ID, "webSnare");
      // THE SAME CREATURE SNARED AGAIN takes the new web in place of the old.
      if (before?.uuid) {
        const prior = await actorFrom(before.uuid);
        const ids = Array.from(prior?.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, "webSnareBy") === actor.uuid).map((e) => e.id);
        if (prior && ids.length) { await asOwner(prior, "deleteEffects", { ids }); if (prior.uuid !== target.uuid) extra.push(`${esc(prior.name)}'s webbing loses its hold.`); }
      }
      const dc = h().levelDC(levelOf(actor));
      const flat = norm(degree) !== "failure";
      // THE CORE'S ESCAPE READS `escapeDC` off the effect that holds the
      // creature, and a success removes it — the webbing and the
      // flat-footedness with it ("while it remains Immobilized").
      const web = made("b5:webSnare", {
        name: `Web Snare (Escape DC ${dc})`, img: item.img,
        description: `Immobilised by ${actor.name}'s Web Snare. Escape against DC ${dc} to free yourself${flat ? "; flat-footed while it holds" : ""}.`,
        system: { escapeDC: dc, escapeFrom: "Web Snare" }, module: { webSnareBy: actor.uuid }
      }, {});
      web.statuses = webSnareStatuses(degree);
      await layOn(target, web);
      await actor.setFlag(MODULE_ID, "webSnare", { uuid: target.uuid });
      extra.push(`${esc(target.name)} is <strong>Immobilised</strong>${flat ? " and <strong>flat-footed</strong>" : ""}: Escape against <strong>DC ${dc}</strong> frees it.`);
    }
    await h().postCard(actor, "Web Snare", [...lines, ...extra.filter(Boolean).map((l) => h().line(l)), h().line("<em>Focus use spent — Refocus restores it.</em>")]);
    return true;
  }
};

/** Elemental Infusion: "your melee Strikes inflict an additional 1d4 damage of your elemental type". */
const elementalInfusion = {
  hint: "1 AP (Focus): for 1 minute, your melee Strikes add 1d4 of your element.",
  ownsFocusUse: true,
  async use(actor, item) {
    const el = heritageOf(actor.items).element;
    if (!el?.damageType) { ui.notifications.warn("Elemental Infusion: your heritage has no element (a Tianzhi heritage gives one)."); return false; }
    if (!(await techniqueBegins(actor, item, "Elemental Infusion", 1))) return false;
    await putEffect(actor, "b5:infusion", made("b5:infusion", {
      name: `Elemental Infusion (+1d4 ${el.damageType})`, img: item.img,
      description: `Elemental Infusion: your melee Strikes inflict an additional 1d4 ${el.damageType} damage.`,
      system: infusionFlags(el.damageType)
    }, forOneMinute(actor)));
    await card(actor, "Elemental Infusion", [`For <strong>1 minute</strong> your melee Strikes add <strong>1d4 ${esc(el.damageType)}</strong> (${esc(el.element)}).`, "<em>Focus use spent — Refocus restores it.</em>"]);
    return true;
  }
};

/** Magma Channel: "The next successful melee Strike … an additional 1d6 secondary fire damage and gains the Magical trait." */
const magmaChannel = {
  hint: "1 AP (Focus): your next melee hit this turn adds 1d6 fire and counts as magical.",
  ownsFocusUse: true,
  async use(actor, item) {
    if (!(await techniqueBegins(actor, item, "Magma Channel", 1))) return false;
    await putEffect(actor, "b5:magma", made("b5:magma", {
      name: "Magma Channel (+1d6 fire, magical)", img: item.img,
      description: "Magma Channel: your next successful melee Strike this turn inflicts an additional 1d6 secondary fire damage and gains the Magical trait.",
      system: JSON.parse(JSON.stringify(MAGMA_FLAGS))
    }, untilEndOfTurn(actor)));
    await card(actor, "Magma Channel", ["Your next <strong>melee Strike</strong> this turn that hits adds <strong>1d6 fire</strong> and is <strong>magical</strong>.", "<em>Focus use spent — Refocus restores it.</em>"]);
    return true;
  }
};

/** Serpent's Venom: armed now, delivered by the next melee hit (onStrikeResolvedB5). */
const serpentsVenom = {
  hint: "1 AP (Focus): your next melee hit before the end of your next turn envenoms the target.",
  ownsFocusUse: true,
  async use(actor, item) {
    if (!(await techniqueBegins(actor, item, "Serpent's Venom", 1))) return false;
    await putEffect(actor, "b5:serpent", made("b5:serpent", {
      name: "Serpent's Venom (ready)", img: item.img,
      description: "Serpent's Venom: the next successful melee Strike you make before the technique ends exposes the target to your venom (Fortitude against your Level DC).",
      module: { itSerpentVenom: true }
    }, untilEndOfNextTurn(actor)));
    await card(actor, "Serpent's Venom", ["Venom gathers: your next <strong>melee Strike that hits</strong> before the end of your next turn envenoms the target.", "<em>Focus use spent — Refocus restores it.</em>"]);
    return true;
  }
};

/** Foxfire (B5-4): three motes placed, then moved once a turn. */
const foxfire = {
  hint: "1 AP (Focus): up to three motes of dim light within 60 feet for 1 minute; Use again to move them (Free, once a turn).",
  ownsFocusUse: true,
  async use(actor, item) {
    const live = ownEffects(actor, "b5:foxfire")[0] ?? null;
    if (live) {
      const castId = live.getFlag(MODULE_ID, "foxfireCast");
      const sceneId = live.getFlag(MODULE_ID, "foxfireScene") ?? "";
      // ON ANOTHER SCENE THE MOTES WAIT (found in review): only the scene
      // they were placed on can move them, and the technique is not ended.
      if (sceneId && canvas?.scene?.id !== sceneId) { ui.notifications.warn("Foxfire: your motes are on another scene; view that scene to move them."); return false; }
      const circles = await h().lightCirclesOf(castId, { sceneId });
      if (!circles.length) {
        await safeDelete(actor, [live.id]);
        ui.notifications.info("Foxfire: the motes are gone; the technique is ended.");
        return true;
      }
      const combat = game.combat?.started ? game.combat : null;
      if (foxfireMoveSpent(live.getFlag(MODULE_ID, "foxfireMoved"), combat)) { ui.notifications.warn("Foxfire: you have moved the flames this turn."); return false; }
      const moved = await h().moveLightCircles(actor, { castId, sceneId, maxFeet: 30, rangeFeet: 60, name: "Foxfire" });
      if (combat) await live.setFlag(MODULE_ID, "foxfireMoved", { combatId: combat.id, round: int(combat.round), turn: int(combat.turn) });
      await card(actor, "Foxfire", [`You move ${moved === 1 ? "a flame" : `${moved} flames`} (a Free Action, up to 30 feet each, within 60 feet of you).`]);
      return true;
    }
    if (!tokenOf(actor)) { ui.notifications.warn("Foxfire: your token must be on the scene."); return false; }
    if (!(await techniqueBegins(actor, item, "Foxfire", 1))) return false;
    const castId = foundry.utils.randomID(12);
    const ids = await h().placeLightCircles(actor, { name: "Foxfire", count: 3, radiusFeet: 10, rangeFeet: 60, steps: 1, castId, seconds: 60, rounds: 10 });
    await putEffect(actor, "b5:foxfire", made("b5:foxfire", {
      name: `Foxfire (${ids.length} mote${ids.length === 1 ? "" : "s"})`, img: item.img,
      description: "Foxfire: floating motes of spectral flame, each shedding dim light within 10 feet. Use Foxfire again to move them (a Free Action, once a turn). They produce no heat and cannot ignite objects.",
      module: { foxfireCast: castId, foxfireScene: canvas?.scene?.id ?? "" }
    }, forOneMinute(actor)));
    await card(actor, "Foxfire", [
      ids.length ? `<strong>${ids.length}</strong> mote${ids.length === 1 ? "" : "s"} of spectral flame, each shedding <strong>dim light within 10 feet</strong>, for <strong>1 minute</strong>.` : "No motes were placed.",
      "Use Foxfire again to move them: once each turn, a Free Action, up to 30 feet each, within 60 feet of you.",
      "<em>The flames produce no heat and cannot ignite objects. Focus use spent — Refocus restores it.</em>"
    ]);
    return true;
  }
};

/** Spirit Beacon: the light and the ally aura, for 1 minute. */
const spiritBeacon = {
  hint: "1 AP (Focus): bright light 20 ft and dim 20 ft further for 1 minute; you and allies in the bright light gain two ticks.",
  ownsFocusUse: true,
  async use(actor, item) {
    if (!(await techniqueBegins(actor, item, "Spirit Beacon", 1))) return false;
    const now = Math.trunc(Number(game.time?.worldTime ?? 0));
    const clock = forOneMinute(actor);
    // THE TWO RINGS SHARE AN ID, so the dim one goes with its own bright one
    // and not with a beacon raised again over it (onEffectDeletedB5).
    const beaconId = foundry.utils.randomID(12);
    await putEffect(actor, "b5:beaconDim", made("b5:beaconDim", {
      name: "Spirit Beacon (dim light)", img: item.img,
      description: "Spirit Beacon: dim light for a further 20 feet.",
      system: { lightSource: "spirit-beacon-dim" }, module: { beaconId }
    }, clock));
    await putEffect(actor, "b5:beacon", made("b5:beacon", {
      name: "Spirit Beacon", img: item.img,
      description: "Spirit Beacon: you shed bright light within 20 feet and dim light for a further 20 feet. You and your allies within the bright light gain +2 circumstance on Perception, Occultism and Religion about spirits, haunts and possession, and +1 circumstance on saves against possession and spirits' or haunts' effects.",
      system: beaconFlags(now, inCombatNow(actor)), module: { beaconId }
    }, clock));
    let drawn = true;
    try { await h().refreshTokenLight(actor); } catch (err) { drawn = false; console.warn("Inner Tempest | Spirit Beacon's light", err); }
    await card(actor, "Spirit Beacon", [
      "Your Living Lantern intensifies for <strong>1 minute</strong>: <strong>bright light within 20 feet</strong> and dim light for a further 20.",
      "You and your allies within the bright light: <strong>+2 circumstance</strong> on Perception, Occultism and Religion about spirits, haunts and possession, and <strong>+1 circumstance</strong> on saves against possession and spirits' or haunts' effects (offered as ticks).",
      ...(drawn ? [] : ["<em>The token's own glow could not be set; the light level still counts it.</em>"]),
      "<em>Focus use spent — Refocus restores it.</em>"
    ]);
    return true;
  }
};

/** Mist Veil: a 10-foot bank of mist that moves with you, to the start of your next turn. */
const mistVeil = {
  hint: "2 AP (Focus): creatures within 10 feet of you are concealed until the start of your next turn.",
  ownsFocusUse: true,
  async use(actor, item) {
    if (!(await techniqueBegins(actor, item, "Mist Veil", 2))) return false;
    const now = Math.trunc(Number(game.time?.worldTime ?? 0));
    await putEffect(actor, "b5:mist", made("b5:mist", {
      name: "Mist Veil", img: item.img,
      description: "Mist Veil: a 10-foot emanation of dense mist that moves with you. Creatures within it are concealed, and creatures outside it are concealed to those within.",
      system: mistFlags(now, inCombatNow(actor))
    }, untilNextTurn(actor)));
    await card(actor, "Mist Veil", [
      "A bank of mist gathers round you (10 feet) until the <strong>start of your next turn</strong>, and moves with you: every creature within it is <strong>Concealed</strong>.",
      "<em>Creatures outside the mist are concealed to those within it — the table's. Focus use spent — Refocus restores it.</em>"
    ]);
    return true;
  }
};

/** Spirit Roar: one Demoralise, met by each enemy within 15 feet at its Level DC. */
const spiritRoar = {
  hint: "1 AP (Focus): one Demoralise against each enemy within 15 feet, each at its Level DC.",
  ownsFocusUse: true,
  async use(actor, item) {
    const mine = tokenOf(actor);
    if (!mine) { ui.notifications.warn("Spirit Roar: your token must be on the scene."); return false; }
    const action = h().skillActions.find((a) => a.key === "demoralise");
    if (!action) { ui.notifications.warn("Spirit Roar: the Demoralise action is not available."); return false; }
    const combatId = game.combat?.started ? game.combat.id : "";
    const record = actor.getFlag(MODULE_ID, "spiritRoar");
    const enemies = creaturesWithin(actor, 15).filter((c) => opposed(mine.document?.disposition, c.disposition));
    const fresh = enemies.filter((c) => !spiritRoarImmune(record, combatId, c.actor.uuid));
    if (!fresh.length) { ui.notifications.warn(enemies.length ? "Spirit Roar: every enemy within 15 feet is immune to it this encounter." : "Spirit Roar: no enemy is within 15 feet."); return false; }
    // READY FIRST, PAID ONCE ROLLED (found in review): cancelling the first
    // Demoralise's dialog costs nothing.
    if (!(await focusReady(item, "Spirit Roar"))) return false;
    if (game.combat?.started && int(actor.system?.resources?.ap?.value) < 1) { ui.notifications.warn("Spirit Roar: 1 AP required."); return false; }
    const previous = Array.from(game.user?.targets ?? []);
    const affected = [];
    let dice = null;
    // THE SHARED ROLL'S CONVICTION DIE (0.6.1, TRG Prime 3.669.1): spent on
    // the first enemy's check, met by the rest; none of them is asked again.
    let convictionDie = 0;
    let paid = false;
    for (const [i, c] of fresh.entries()) {
      c.token.setTarget(true, { releaseOthers: true, groupSelection: false });
      const dc = h().levelDC(levelOf(c.actor));
      const check = await h().resolveAction(actor, { ...action, apCost: "0", variantNote: `Spirit Roar: one roll against each enemy within 15 feet (${i + 1} of ${fresh.length}).` },
        { presetDice: dice, presetConvictionDie: convictionDie, dcOverride: dc, dcLabel: `${c.actor.name}'s Level DC`, ignoreActionImmunity: true, ...(i ? { event: { shiftKey: true } } : {}) });
      if (!check) break;
      if (!paid) {
        if (!(await techniqueBegins(actor, item, "Spirit Roar", 1))) break;
        paid = true;
      }
      if (!dice) convictionDie = Math.max(0, Math.trunc(Number(check.convictionDie) || 0));
      dice ??= check.dice ?? null;
      if (check.outcome?.degree?.success) affected.push(c.actor.uuid);
    }
    for (const t of canvas.tokens?.placeables ?? []) t.setTarget(previous.includes(t), { releaseOthers: false, groupSelection: true });
    if (!paid) return false;
    if (combatId && affected.length) {
      const kept = String(record?.combatId) === combatId ? (record?.uuids ?? []) : [];
      await actor.setFlag(MODULE_ID, "spiritRoar", { combatId, uuids: [...new Set([...kept, ...affected])] });
    }
    await card(actor, "Spirit Roar", [
      `The Tiger's voice: one Demoralise met by <strong>${fresh.length}</strong> ${fresh.length === 1 ? "enemy" : "enemies"} within 15 feet, each at its Level DC.`,
      affected.length
        ? (combatId ? `${affected.length} affected — each is immune to your Spirit Roar until this encounter ends (not to your Demoralise).` : `${affected.length} affected. Out of combat, the encounter's immunity is yours to keep.`)
        : "None affected.",
      "<em>Only those that can hear you count — the table's. Focus use spent — Refocus restores it.</em>"
    ]);
    return true;
  }
};

/** Wind-Borne Motion: "You Stride up to your Speed." */
const windBorneMotion = {
  hint: "1 AP (Focus): Stride up to your Speed across liquid, gaps and open space.",
  ownsFocusUse: true,
  async use(actor, item) {
    if (!(await techniqueBegins(actor, item, "Wind-Borne Motion", 1))) return false;
    await h().armMove(actor, { maxFeet: landSpeed(actor), speedKey: "land", provokes: true, note: "Wind-Borne Motion: liquid, gaps and unsupported spaces are solid ground; end on a surface that holds you." }, "Wind-Borne Motion");
    await card(actor, "Wind-Borne Motion", [`Your next token move is armed: a <strong>Stride up to ${landSpeed(actor)} feet</strong>. Liquid surfaces, narrow gaps and unsupported spaces bear you as solid ground.`, "<em>End on a surface capable of supporting you, or fall (the Falling action). Not flight, and not upwards through open air. Focus use spent — Refocus restores it.</em>"]);
    return true;
  }
};

/** Elemental Power, Supremacy, Ascendant: the spell from the list of your element. */
const elementalSpell = {
  hint: "Choose your spell from the list that matches your element: an innate spell with the Focus trait, cast with Wisdom.",
  async use(actor, item) {
    const { name, element } = heritageOf(actor.items);
    const spec = elementSpellSpec(item.name, name, element);
    if (!spec) { ui.notifications.warn(`${item.name}: your heritage has no element (a Tianzhi heritage gives one).`); return false; }
    return h().chooseSpell(actor, item, spec);
  }
};

/** Elemental Attunement: the rows for your element, kept on the feat. */
async function attune(actor, item) {
  const el = heritageOf(actor.items).element;
  const flags = attunementFlags(el);
  if (!flags) return false;
  await h().replaceFeatEffect(actor, item, {
    name: `Elemental Attunement (${el.element})`, img: item.img,
    description: `Elemental Attunement: +2 racial on Recall Knowledge about ${el.element} (a tick); +1 racial to innate spell attacks and save DCs for spells with the ${el.spellTraits.join(" or ")} trait.`,
    flags: { [SYSTEM_ID]: flags }
  });
  return true;
}
const elementalAttunement = {
  hint: "Applied when the feat or your heritage arrives; press Use to apply it again after changing heritage.",
  async use(actor, item) {
    const done = await attune(actor, item);
    if (!done) { ui.notifications.warn("Elemental Attunement: your heritage has no element (a Tianzhi heritage gives one)."); return false; }
    await card(actor, "Elemental Attunement", ["Attuned to your element: +2 racial on Recall Knowledge about it (offered), +1 racial to your innate spell attacks and save DCs with its traits."]);
    return true;
  }
};

/** Draconic Armament: the Bite or the Claw, as a natural attack. */
const draconicArmament = {
  hint: "Choose the Bite or the Claw; taken twice, the other.",
  async use(actor, item) {
    const owned = Array.from(actor.items ?? []).filter((i) => i.type === "weapon" && ["draconic bite", "draconic claw"].includes(norm(i.name))).map((i) => i.name);
    const copies = Array.from(actor.items ?? []).filter((i) => i.type === "feat" && norm(i.name) === "draconic armament").length;
    const offer = draconicOnOffer(owned, copies);
    if (!offer.length) { ui.notifications.info(`Draconic Armament: you already have ${owned.join(" and ")}.`); return false; }
    const pick = offer.length === 1 ? offer[0] : await h().chooseFromList("Draconic Armament", "Natural attack", offer.map((n) => [n, n.replace("Draconic ", "")]));
    if (!pick) return false;
    const pack = game.trgPrime?.modules?.contentPack?.("companions");
    const entry = pack ? Array.from((await pack.getIndex()).values?.() ?? []).find((e) => norm(e.name) === norm(pick)) : null;
    const doc = entry ? await pack.getDocument(entry._id) : null;
    if (!doc) { ui.notifications.warn(`Draconic Armament: ${pick} is not in the natural attacks compendium.`); return false; }
    const data = doc.toObject();
    delete data._id;
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: pick });
    await actor.createEmbeddedDocuments("Item", [data]);
    await card(actor, "Draconic Armament", [`Your celestial ancestry shows: <strong>${esc(pick.replace("Draconic ", ""))}</strong> (${esc(String(data.system?.damage ?? ""))} ${esc(String(data.system?.damageType ?? ""))}; ${esc(String(data.system?.traits ?? ""))}) is added as a natural attack.`]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Guardian's Intercession (TRG Prime 3.669.0, a defence offer for an ally) */
/* ------------------------------------------------------------------ */

/** "Requirements you are able to move", and its Focus use. */
export const CANNOT_MOVE = Object.freeze(["immobilised", "grabbed", "paralyzed", "petrified", "unconscious", "dying", "dead"]);
export function guardianRefusal(actor, item) {
  if (!hasUse(item)) return "expended — Refocus restores it";
  const held = CANNOT_MOVE.find((k) => actor?.hasCondition?.(k));
  return held ? `you are not able to move (${held})` : null;
}

export const BLOCK5_DEFENCE_OFFERS = Object.freeze({
  "Guardian's Intercession": {
    summary: "Become the target of this physical attack, with +1 circumstance to DB and +1 Base DR against it (spends your reaction and its Focus use; Step beside the ally if you must).",
    against: "weapon",
    forAlly: true,
    reachFeet: 5,
    find: (actor) => ownedNamed(actor, "Guardian's Intercession"),
    requires: (actor, item) => guardianRefusal(actor, item),
    use: async (actor, item, attack = {}) => {
      if (!(await spendReaction(actor, "Guardian's Intercession"))) throw new Error("no reaction available this round");
      if (!(await spendUse(item, "Guardian's Intercession"))) throw new Error("its Focus use is expended");
      await putEffect(actor, "b5:guardian", made("b5:guardian", {
        name: "Guardian's Intercession (+1 DB, +1 Base DR)", img: item.img,
        description: "Guardian's Intercession: +1 circumstance to DB and Base DR against the triggering attack; that attack removes it.",
        changes: [
          { key: "system.combat.defence.circumstance", type: "custom", value: "1", priority: 20 },
          { key: "system.combat.naturalArmourBase.natural", mode: 2, value: "1", priority: 30 }
        ],
        system: { oneAttack: { against: "weapon" } }
      }, forSeconds(6)));
      const ally = attack.protectedUuid ? await actorFrom(attack.protectedUuid) : null;
      await card(actor, "Guardian's Intercession", [
        `You interpose yourself${ally ? ` between <strong>${esc(ally.name)}</strong> and the attack` : ""}: <strong>you become its target</strong>, with <strong>+1 circumstance to DB</strong> and <strong>+1 Base DR</strong> against it.`,
        "<em>Step into a position adjacent to the ally if you need to (move your token). Reaction and Focus use spent.</em>"
      ]);
    }
  }
});

/* ------------------------------------------------------------------ */
/* After a Strike (TRG Prime's trgPrimeStrikeResolved)                  */
/* ------------------------------------------------------------------ */

export async function onStrikeResolvedB5(ctx = {}) {
  const { attacker, target, weapon, hits, melee, isReaction, held, damageTaken } = ctx;
  if (!attacker || !target) return;
  if (attacker.isOwner && !held) {
    // SERPENT'S VENOM: "The next successful melee Strike … exposes the target".
    const venom = hits && melee ? ownEffects(attacker, "b5:serpent")[0] : null;
    if (venom) {
      await safeDelete(attacker, [venom.id]);
      await deliverVenom(attacker, target);
    }
    // PARALYSING VENOM: "Free (0 AP); Trigger you damage a creature with your Sting".
    const pv = hits && Number(damageTaken) > 0 && norm(weapon?.name) === "sting" ? ownedNamed(attacker, "Paralysing Venom") : null;
    if (pv && hasUse(pv)) await offerParalysingVenom(attacker, target, pv);
  }
  // WAITING BLADE: "a creature within reach of your Raptorial Blade misses you with a melee Strike".
  // A REACTION'S MISS COUNTS TOO: the book excludes none.
  // NOT AGAINST A STRIKE THAT FORBIDS REACTIONS (0.8.0; Drawn Verdict).
  if (missedHere(ctx) && !held && melee && !ctx.noReactions) {
    const wb = ownedNamed(target, "Waiting Blade");
    const blade = Array.from(target.items ?? []).find((i) => i.type === "weapon" && norm(i.name) === "raptorial blade");
    // ASKED ONLY WHEN THE REACTION COULD BE SPENT (0.6.2), as the spend reads it.
    if (wb && blade && hasUse(wb) && await reactionOpen(target, "Waiting Blade")) await offerTo(target, "b5WaitingBlade", { attackerUuid: attacker.uuid, attackerName: attacker.name });
  }
}

async function deliverVenom(actor, target) {
  const ladder = SAVE_LADDERS["Serpent's Venom"];
  const n = venomDice(levelOf(actor));
  const { lines } = await runSaveTechnique(actor, "Serpent's Venom", {
    save: "fortitude", scope: "targets", outcomes: { ...ladder.outcomes }, conditions: { ...ladder.conditions },
    damageByRung: { fumble: `${n}d6` }, damageType: "poison"
  }, { targets: [target] });
  await h().postCard(actor, "Serpent's Venom", [h().line(`Your venom reaches <strong>${esc(target.name)}</strong>; the technique ends.`), ...lines]);
}

async function offerParalysingVenom(actor, target, item) {
  const yes = await confirm(`Paralysing Venom — ${actor.name}`, `<p>Your Sting damaged <strong>${esc(target.name)}</strong>. Inject <strong>Paralysing Venom</strong> (Free, its Focus use): a Fortitude save against your Level DC?</p>`);
  if (!yes) return;
  if (!(await spendUse(item, "Paralysing Venom"))) return;
  const ladder = SAVE_LADDERS["Paralysing Venom"];
  const { lines, results } = await runSaveTechnique(actor, "Paralysing Venom", { save: "fortitude", scope: "targets", outcomes: { ...ladder.outcomes }, conditions: { ...ladder.conditions } }, { targets: [target] });
  const slow = ladderRung(SPEED_LADDERS["Paralysing Venom"], results[0]?.degree);
  const extra = slow ? [await slowCreature(target, "Paralysing Venom", slow, item.img)] : [];
  await h().postCard(actor, "Paralysing Venom", [...lines, ...extra.filter(Boolean).map((l) => h().line(l)), h().line("<em>Focus use spent — Refocus restores it.</em>")]);
}

/** Waiting Blade, asked of the Kamiri's player. */
async function waitingBladeOffer(actor, { attackerUuid, attackerName }) {
  const item = ownedNamed(actor, "Waiting Blade");
  const blade = Array.from(actor.items ?? []).find((i) => i.type === "weapon" && norm(i.name) === "raptorial blade");
  const attacker = await actorFrom(attackerUuid);
  if (!item || !blade || !attacker || !hasUse(item)) return;
  const yes = await confirm(`Waiting Blade — ${actor.name}`, `<p><strong>${esc(attackerName)}</strong> missed you. Use <strong>Waiting Blade</strong> (your reaction and its Focus use): a Raptorial Blade Strike against it, if it is within your blade's reach?</p>`);
  if (!yes) return;
  if (!(await spendReaction(actor, "Waiting Blade"))) return;
  if (!(await spendUse(item, "Waiting Blade"))) return;
  targetOnly(attacker);
  await h().rollWeaponAttack(actor, blade, { apPaid: true, isReaction: true, skipTargetPrompt: true, optionLabel: "Waiting Blade" });
}

/* ------------------------------------------------------------------ */
/* Predator's Momentum (the Pounce's Strike)                            */
/* ------------------------------------------------------------------ */

/**
 * The Pounce's paid Strike, asked first: "if you Stride at least 20 feet
 * before making the Strike, the Strike gains a +1-circumstance bonus to AB
 * and inflicts an additional 1d6 precision damage". Resolves the Strike's
 * extra options.
 */
export async function predatorsMomentumOptions(actor) {
  if (!ownedNamed(actor, "Predator's Momentum")) return {};
  const yes = await confirm(`Predator's Momentum — ${actor.name}`, "<p>Did you Stride at least <strong>20 feet</strong> before this Strike? (+1 circumstance to the attack and 1d6 precision damage, once.)</p>");
  if (!yes) return {};
  return { extraModifiers: [{ label: "Predator's Momentum", value: 1, type: "circumstance" }], extraPrecisionDice: 1 };
}

/* ------------------------------------------------------------------ */
/* Keeping items in step                                                */
/* ------------------------------------------------------------------ */

const STASH = "raptorialBefore";

/** Raptorial Refinement: the blade sharpened, or put back. */
async function refineBlades(actor, on) {
  for (const blade of Array.from(actor.items ?? []).filter((i) => i.type === "weapon" && norm(i.name) === "raptorial blade")) {
    const before = blade.getFlag(MODULE_ID, STASH);
    if (on && !before) {
      const next = refinedBlade(blade.system);
      await blade.update({ "system.armourRending": next.armourRending, "system.traits": next.traits, [`flags.${MODULE_ID}.${STASH}`]: { armourRending: int(blade.system.armourRending), traits: String(blade.system.traits ?? "") } });
    } else if (!on && before) {
      // PUT BACK WITH ITS AR ON THE TRAIT LINE (0.6.1), even when it was
      // stashed by 0.6.0 without it.
      const ar = int(before.armourRending) || 1;
      await blade.update({ "system.armourRending": ar, "system.traits": bladeTraitsWithAR(String(before.traits ?? ""), ar), [`flags.${MODULE_ID}.${STASH}`]: deletionValue() });
    }
  }
}

/** A Raptorial Blade whose trait line lacks its AR gains it (0.6.1). */
async function bladeARInTraits(actor) {
  for (const blade of Array.from(actor.items ?? []).filter((i) => i.type === "weapon" && norm(i.name) === "raptorial blade")) {
    const ar = int(blade.system.armourRending) || 1;
    const traits = String(blade.system.traits ?? "");
    const fixed = bladeTraitsWithAR(traits, ar);
    if (fixed !== traits) await blade.update({ "system.traits": fixed });
  }
}

const TICK_STASH = "raisedTick";

/** Forgeheart and Many-Faceted Vigilance: the heritage's or ability's tick raised, or put back. */
async function raiseTicks(actor) {
  for (const [featKey, spec] of Object.entries(RAISED_TICKS)) {
    const held = Array.from(actor.items ?? []).some((i) => i.type === "feat" && norm(i.name) === featKey);
    for (const target of Array.from(actor.items ?? []).filter((i) => i.type === spec.itemType && i.name === spec.itemName)) {
      // THE ITEM'S OWN FLAGS (0.6.2), not the prepared ones: an ability's
      // prepared flags carry the pack entry's over its own. See raisedTickUpdate.
      const own = target._source?.flags?.[SYSTEM_ID] ?? target.flags?.[SYSTEM_ID] ?? {};
      const update = raisedTickUpdate({
        held, spec, isAbility: target.type === "ability",
        ownRows: own.conditionals ?? [], codexInherit: own.codexInherit,
        stash: target.getFlag(MODULE_ID, TICK_STASH) ?? null,
        moduleId: MODULE_ID, systemId: SYSTEM_ID, stashKey: TICK_STASH
      });
      if (update) await target.update(update);
    }
    // A 0.6.0 COPY OF THE FEAT carried its own +2 tick beside the heritage's +1.
    for (const feat of Array.from(actor.items ?? []).filter((i) => i.type === "feat" && norm(i.name) === featKey)) {
      const own = feat.flags?.[SYSTEM_ID]?.conditionals;
      if (Array.isArray(own) && own.length) await feat.update({ [`flags.${SYSTEM_ID}.conditionals`]: own.filter((r) => norm(r?.label) !== featKey) });
    }
  }
}

/**
 * KEEPING A CHARACTER IN STEP (0.6.1), run by the acting GM at start-up for
 * every world actor: characters made under 0.6.0 gain the blade's AR on its
 * trait line and the raised ticks. Each step changes nothing when there is
 * nothing to change.
 */
export async function reconcileB5Actor(actor) {
  if (!actor || actor.documentName !== "Actor") return;
  await bladeARInTraits(actor);
  await raiseTicks(actor);
}

const raptorialRefinement = {
  hint: "Works by itself: your Raptorial Blade is AR 2 with Versatile P. Press Use if the blade arrived without it.",
  async use(actor, item) {
    await refineBlades(actor, true);
    await card(actor, "Raptorial Refinement", ["Your <strong>Raptorial Blade</strong> is <strong>AR 2</strong> with <strong>Versatile P</strong>."]);
    return true;
  }
};

/** createItem: a feat or heritage that changes what this file keeps on the sheet. */
export async function onItemCreatedB5(item, options, userId) {
  if (userId !== game.user?.id) return;
  const actor = item?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  const name = norm(item.name);
  if (item.type === "weapon" && name === "raptorial blade") await bladeARInTraits(actor);
  if ((item.type === "feat" && name === "raptorial refinement") || (item.type === "weapon" && name === "raptorial blade" && owns(actor, "Raptorial Refinement"))) await refineBlades(actor, true);
  if ((item.type === "feat" && RAISED_TICKS[name]) || Object.values(RAISED_TICKS).some((s) => s.itemType === item.type && s.itemName === item.name)) await raiseTicks(actor);
  const attunement = Array.from(actor.items ?? []).find((i) => i.type === "feat" && norm(i.name) === "elemental attunement");
  if (attunement && (item === attunement || item.type === "heritage")) await attune(actor, attunement);
}

/**
 * updateItem: the heritage or ability whose tick a held feat raises was
 * rewritten — a compendium refresh replaces its own flags with the pack's,
 * taking the raised row and the opt-out with them (found in review) — so the
 * raise is made again. A second pass writes nothing, so this cannot loop.
 */
export async function onItemUpdatedB5(item, changes, options, userId) {
  if (userId !== game.user?.id) return;
  const actor = item?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  if (!changes?.flags) return;
  if (Object.values(RAISED_TICKS).some((s) => s.itemType === item.type && s.itemName === item.name)) await raiseTicks(actor);
}

/** deleteItem: Raptorial Refinement taken away puts the blade back; Elemental Attunement takes its rows. */
export async function onItemDeletedB5(item, options, userId) {
  if (userId !== game.user?.id) return;
  const actor = item?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  const name = norm(item.name);
  if (item.type === "feat" && name === "raptorial refinement" && !owns(actor, "Raptorial Refinement")) await refineBlades(actor, false);
  if (item.type === "feat" && RAISED_TICKS[name]) await raiseTicks(actor);
  if (item.type === "feat" && name === "elemental attunement") {
    const ids = Array.from(actor.effects ?? []).filter((e) => e.getFlag?.(SYSTEM_ID, "featSource") === item.id).map((e) => e.id);
    if (ids.length) await safeDelete(actor, ids);
  }
}

/** deleteActiveEffect (acting GM): Foxfire's motes and Spirit Beacon's dim ring go with their technique. */
export async function onEffectDeletedB5(effect) {
  if (!isActingGM()) return;
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  const key = effect.getFlag?.(MODULE_ID, "block4");
  if (key === "b5:foxfire") {
    const castId = effect.getFlag(MODULE_ID, "foxfireCast");
    if (castId) await h().removeLightCircles(castId, { sceneId: effect.getFlag(MODULE_ID, "foxfireScene") ?? "" });
  }
  if (key === "b5:beacon") {
    const id = effect.getFlag(MODULE_ID, "beaconId");
    await safeDelete(actor, ownEffects(actor, "b5:beaconDim").filter((e) => e.getFlag(MODULE_ID, "beaconId") === id).map((e) => e.id));
  }
}

/* ------------------------------------------------------------------ */
/* The table                                                            */
/* ------------------------------------------------------------------ */

registerSharedOps({ offers: { b5WaitingBlade: waitingBladeOffer } });

export const BLOCK5_AUTOMATIONS = Object.freeze({
  "awaken the animism": awakenTheAnimism,
  "blinding majesty": emanation("Blinding Majesty", { radiusFeet: 10, ap: 2, enemiesOnly: true, slowing: false }),
  "valley chill": emanation("Valley Chill", { radiusFeet: 10, ap: 2, enemiesOnly: false, slowing: true }),
  "celestial breath": celestialBreath,
  "web snare": webSnare,
  "elemental infusion": elementalInfusion,
  "magma channel": magmaChannel,
  "serpent's venom": serpentsVenom,
  "foxfire": foxfire,
  "spirit beacon": spiritBeacon,
  "mist veil": mistVeil,
  "spirit roar": spiritRoar,
  "wind-borne motion": windBorneMotion,
  "elemental power": elementalSpell,
  "elemental supremacy": elementalSpell,
  "elemental ascendant": elementalSpell,
  "elemental attunement": elementalAttunement,
  "draconic armament": draconicArmament,
  "raptorial refinement": raptorialRefinement,
  "guardian's intercession": passive("Offered when a physical attack targets an adjacent ally: become its target, +1 DB and +1 Base DR (reaction, Focus)."),
  "paralysing venom": passive("Offered when your Sting damages a creature: Fortitude against your Level DC (Free, Focus)."),
  "waiting blade": passive("Offered when a creature misses you with a melee Strike: a Raptorial Blade Strike (reaction, Focus)."),
  "fortune's reversal": passive("Offered when you fumble an attack check, skill check or save: reroll it and use the second result (reaction, Focus)."),
  "predator's momentum": passive("Asked when Predator's Pounce's Strike is pressed: +1 circumstance and 1d6 precision if you Strode 20 feet.")
});

/** Passive rows: the sheet's hint for the feats that work by themselves. */
export const BLOCK5_PASSIVE_HINTS = Object.freeze({
  "adaptive mind": "Works by itself: a conviction point spent on Advantage for a Mental Focus check comes back on a Success or better.",
  "ancestral communion": "Offered: advantage on Spirit Lore Recall Knowledge about spirits (tick).",
  "bear's endurance": "Works by itself: Impact Absorption gives +2 Base DR; +2 against being moved is offered (tick).",
  "forgeheart": "Works by itself: fire resistance; the Zenki's Crafting tick is +2.",
  "fortified carapace": "Works by itself: Base Natural DR +1.",
  "hive coordination": "Offered: +2 racial on Aid for a creature that understands Scree Cant (tick).",
  "hoardkeeper's eye": "Works by itself: Treasure Sense at 60 feet.",
  "immovable plating": "Works by itself: Shove and Trip meet your Fortitude DC +2; pushes are 5 feet shorter.",
  "keeper of endings": "Works by itself: Undead Lore; +2 racial on Occultism and Religion against undead and haunts.",
  "many-faceted vigilance": "Works by itself: +10 racial to initiative; visual Perception's tick is +2.",
  "many tailed cunning": "Offered: two +2 ticks on Bluff.",
  "purifying touch": "Offered: +2 racial on Nature about unsafe water (tick).",
  "silk spinner": "Offered: +2 racial on Crafting with silk (tick).",
  "spiritual resilience": "Works by itself: +2 racial on saves against Soul effects; ticks for possession and Wisdom against spirits.",
  "tianzhi discipline": "Works by itself: +2 racial on Refocus; the first Refocus each day is a Critical.",
  "tianzhi meditation": "Works by itself: +1 racial on Meditation; advantage on the first trance each day.",
  "tianzhi scholar": "Works by itself: +1 racial on Meditation and Nature; +2 on your racial Lores.",
  "weightless footwork": "Works by itself: advantage on Balance.",
  "wings unfurled": "Works by itself: a Fly Speed equal to your land Speed."
});
