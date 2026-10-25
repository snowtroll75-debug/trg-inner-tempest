/**
 * Inner Tempest Block 2 — what the seventeen Chapter 4 skill actions DO once
 * the system has rolled them (module/skill-actions.mjs holds the actions).
 *
 * TWO HOOKS CARRY IT, both the system's own (TRG Prime 3.629.0 / 3.630.0):
 *
 *   trgPrimeActionAttempt   synchronous, before anything is spent: a target
 *                           the action needs, a range, a lockout a Fumble
 *                           left, Read Intent's once a round. Returning
 *                           false refuses the action; the warning says why.
 *   trgPrimeActionResolved  after the card, with the degree: the bonus, the
 *                           movement, the ward, the lockout. It fires a
 *                           second time, with the degree, when the GM sets a
 *                           DC afterwards ("against: none"), so an
 *                           undecided first call does nothing.
 *
 * WHAT A BONUS IS. Every one is an ActiveEffect carrying the system's own
 * declarations, so the system's roll dialog, defence rows and expiry sweeps
 * do the work: `conditionals` (a bonus on your checks, scoped by check type,
 * skill, action, traits or creature), `defenceDC` (a bonus to the DC a named
 * creature rolls against: DB, Fortitude), `oneAttack` (3.666.0: spent by the
 * next attack it answers), `conditionExpiresRound` (gone at the bearer's
 * turn start in that round) and, out of combat, the world clock
 * (`spellEffect` + `spellEffectEnd`). "Before the end of your next turn" is
 * this module's own, on the system's trgPrimeTurnEnded (3.666.0).
 *
 * THE BOOK'S OWN WORDS ARE THE SCOPE. Where the system can tell a check
 * falls inside it (a save against an Emotion effect carries the trait), the
 * row is pre-ticked; where it cannot (a Will save the GM called by hand), a
 * second row is offered unticked with the book's wording, as Spirit Stance
 * does. Both are spent together.
 *
 * Imports nothing from the system: its helpers come from
 * game.trgPrime.modules.helpers at call time, so the harness loads this file
 * without Foundry and drives the pure parts below.
 */

import { SKILL_ACTIONS, SKILL_ACTION_KEYS } from "./skill-actions.mjs";

export const SYSTEM_ID = "trg-prime";
export const MODULE_ID = "trg-inner-tempest";
/** On every effect this file makes: which action made it. */
export const SOURCE_FLAG = "skillAction";
/** On the actor: lockouts a Failure or Fumble left. */
export const LOCKOUT_FLAG = "lockouts";
/** On the actor: Read Intent's "once each round" per creature. */
export const READ_INTENT_FLAG = "readIntentRounds";
/** On an effect: removed when its bearer's turn ends in this combat and round. */
export const TURN_END_FLAG = "endsAfterTurn";
/** On an effect: removed as its bearer's turn begins in this combat and round (0.3.1). */
export const TURN_START_FLAG = "endsAtTurnStart";
/** On an Interpret Style effect: the target and the stances it watches. */
export const INTERPRET_FLAG = "interpretStyle";
/** The temporary ability Read the Elements' Critical grants. */
export const ELEMENTAL_TRACKING = "Elemental Tracking";

const ACTION_BY_KEY = new Map(SKILL_ACTIONS.map((a) => [a.key, a]));

function helpers() {
  const h = globalThis.game?.trgPrime?.modules?.helpers;
  if (!h) throw new Error("Inner Tempest: TRG Prime's module helpers are not available.");
  return h;
}

/* ------------------------------------------------------------------ */
/* Pure decisions                                                       */
/* ------------------------------------------------------------------ */

/**
 * The degree an action's own table answers to: the system's fallback (a
 * Heroic reads the Critical row where there is no Heroic one, a Blunder the
 * Fumble row). The hook hands over the dice's degree.
 */
const FALLBACK = Object.freeze({
  heroic: ["heroic", "critical", "success"],
  critical: ["critical", "success"],
  success: ["success"],
  partial: ["partial", "failure"],
  failure: ["failure"],
  fumble: ["fumble", "failure"],
  blunder: ["blunder", "fumble", "failure"]
});

export function tableDegree(action, degree) {
  const key = String(degree ?? "");
  const chain = FALLBACK[key];
  if (!chain) return key || null;
  const listed = new Set(Object.entries(action?.outcomes ?? {}).filter(([, t]) => String(t ?? "").trim()).map(([k]) => k));
  return chain.find((k) => listed.has(k)) ?? chain[chain.length - 1];
}

/** "Negative results on the Bonus Check table are treated as 0." */
export function positiveBonus(value) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

/** Interpret Style: "divided by 2 (round up)". */
export function halfRoundedUp(value) {
  return Math.ceil(positiveBonus(value) / 2);
}

/**
 * The round in which a creature's next turn starts.
 *
 * Its next turn is in the NEXT round if it is acting now or has acted this
 * round, and in THIS one if its turn is still to come. A creature with no
 * place in the combat is given the next round.
 *
 * @param {{round: number, turn: number, turns: object[]}} combat
 * @param {(combatant: object) => boolean} isBearer
 */
export function nextTurnRound(combat, isBearer) {
  const round = Math.max(0, Number(combat?.round ?? 0));
  const turns = Array.from(combat?.turns ?? []);
  const index = turns.findIndex((c) => isBearer(c));
  if (index < 0) return round + 1;
  return index > Number(combat?.turn ?? 0) ? round : round + 1;
}

/**
 * The flags that end an effect.
 *
 *   "startOfNextTurn"  "until the beginning of your next turn": this
 *                      module's sweep as the bearer's turn begins (0.3.1),
 *                      with the system's round sweep a round later as a
 *                      backstop
 *   "endOfNextTurn"    "before the end of your next turn": this module's
 *                      sweep when the bearer's turn ends
 *   {seconds: n}       the world clock
 *
 * Out of combat there are no turns, so a turn-bounded effect lasts one
 * round of world time (6 seconds) instead.
 *
 * @param {string|{seconds: number}} kind
 * @param {{inCombat: boolean, combatId: string, nextRound: number, worldTime: number}} now
 */
export function expiryFlags(kind, now) {
  const seconds = typeof kind === "object" ? Math.max(1, Math.trunc(Number(kind.seconds) || 0)) : 6;
  // THE BEARER'S OWN TURN, NOT THE ROUND (0.3.1; found live). The system's
  // `conditionExpiresRound` is swept for everybody at the first turn of the
  // round, so a creature acting fourth lost "until the beginning of your
  // next turn" three turns early — Read Intent's +2 DB gone before the
  // enemies acting ahead of it had swung. This module removes it as the
  // bearer's turn begins; the system's sweep, a round later, is the
  // backstop for a turn that never comes (a creature removed from the
  // order).
  if (now?.inCombat && kind === "startOfNextTurn") {
    const combatId = String(now.combatId ?? "");
    return { system: { conditionExpiresRound: Number(now.nextRound) + 1 }, module: { combatId, [TURN_START_FLAG]: { combatId, round: Number(now.nextRound) } } };
  }
  if (now?.inCombat && kind === "endOfNextTurn") {
    return { system: {}, module: { combatId: String(now.combatId ?? ""), [TURN_END_FLAG]: { combatId: String(now.combatId ?? ""), round: Number(now.nextRound) } } };
  }
  return { system: { spellEffect: true, spellEffectEnd: Math.trunc(Number(now?.worldTime ?? 0)) + seconds }, module: {} };
}

/** Does a turn ending now end this effect? */
export function endsWithTurn(flag, combat) {
  if (!flag || !combat) return false;
  return String(flag.combatId) === String(combat.id) && Number(combat.round ?? 0) >= Number(flag.round);
}

/**
 * Is a lockout still in force?
 *
 * @param {object} record {worldTime} | {combatId, round, turn} | {prep: true}
 * @param {{worldTime: number, combat: {id, round, turn}|null}} now
 */
export function lockoutActive(record, now) {
  if (!record) return false;
  if (record.prep) return true;
  if (record.combatId !== undefined) {
    const c = now?.combat;
    if (!c || String(c.id) !== String(record.combatId)) return false;
    const round = Number(c.round ?? 0), turn = Number(c.turn ?? 0);
    return round < Number(record.round) || (round === Number(record.round) && turn < Number(record.turn));
  }
  return Number(now?.worldTime ?? 0) < Number(record.worldTime ?? 0);
}

/**
 * A key a flag object can hold: a uuid's dots are Foundry's path separators,
 * so "Actor.abc" written as a key became {Actor: {abc: …}} and was never
 * found again (0.3.1; found live — a Fumble's lockout against one creature,
 * and Read Intent's once a round, were never enforced).
 */
export function flagKey(text) {
  return String(text ?? "").replace(/\./g, "_");
}

/** The lockout's key: per action, or per action and creature. */
export function lockoutKey(actionKey, targetUuid = "") {
  return targetUuid ? `${actionKey}:${flagKey(targetUuid)}` : String(actionKey);
}

/** Has this item at least one expended use with the Focus trait? */
export function expendedFocus(items, usesMax, usesLeft) {
  return Array.from(items ?? []).some((item) => {
    const traits = String(item?.system?.traits ?? "").toLowerCase().split(/[,;]/).map((t) => t.trim());
    if (!traits.includes("focus")) return false;
    const max = usesMax(item);
    if (max === null || max === Infinity || !(Number(max) > 0)) return false;
    return Number(usesLeft(item)) < Number(max);
  });
}

/* ------------------------------------------------------------------ */
/* The effects                                                          */
/* ------------------------------------------------------------------ */

const ICONS = Object.freeze({
  evade: "icons/svg/wingfoot.svg",
  interpretStyle: "icons/svg/eye.svg",
  rootTheBody: "icons/svg/mountain.svg",
  centredBalance: "icons/svg/sun.svg",
  guideTheBreath: "icons/svg/wing.svg",
  steadyHeart: "icons/svg/heal.svg",
  resistDying: "icons/svg/regen.svg",
  maintainClarity: "icons/svg/aura.svg",
  steelTheMind: "icons/svg/shield.svg",
  observeTechnique: "icons/svg/eye.svg",
  readIntent: "icons/svg/eye.svg",
  readTheElements: "icons/svg/fire.svg"
});

/** An effect's data, with its source and clocks. */
export function effectData(actionKey, { name, description, changes = [], system = {}, module = {}, expiry }) {
  return {
    name,
    img: ICONS[actionKey] ?? "icons/svg/aura.svg",
    description,
    changes,
    flags: {
      [SYSTEM_ID]: { ...system, ...(expiry?.system ?? {}) },
      [MODULE_ID]: { [SOURCE_FLAG]: actionKey, ...module, ...(expiry?.module ?? {}) }
    }
  };
}

/** A check row and its unticked twin, both spent together (see the header). */
function scopedRows({ value, type = "circumstance", label, sure, unsure, when, axis, values, oneShot }) {
  return [
    { kind: "modifier", value, type, label, scope: sure, auto: true, oneShot, when: { ...when, [axis]: values } },
    { kind: "modifier", value, type, label, scope: unsure, auto: false, oneShot, when: { ...when, not: { [axis]: values } } }
  ];
}

/** Evade: "added as Dodge bonus to your DB against the attack". */
export function evadeEffect(n, expiry) {
  return effectData("evade", {
    name: `Evade (+${n} dodge vs one attack)`,
    description: `Evade: +${n} dodge bonus to your DB against the attack you declared it for; that attack removes it.`,
    changes: [{ key: "system.combat.defence.dodge", type: "custom", value: String(n), priority: 20 }],
    system: { oneAttack: true },
    expiry
  });
}

/** Interpret Style: AB and DB against one creature, while it keeps its stance. */
export function interpretStyleEffect(n, target, stanceIds, expiry) {
  const name = target?.name ?? "the target";
  return effectData("interpretStyle", {
    name: `Interpret Style: +${n} AB and DB vs ${name}`,
    description: `You read ${name}'s stance: +${n} circumstance bonus to your AB and DB against it while it keeps that stance, or until the battle ends.`,
    system: {
      conditionals: [{ kind: "modifier", value: n, type: "circumstance", label: "Interpret Style", scope: `Attacks against ${name}`, auto: true, when: { checkTypes: ["attack"], targetUuids: [target.uuid] } }],
      defenceDC: [{ dc: "defence", value: n, label: "Interpret Style", scope: `against ${name}`, when: { sourceUuids: [target.uuid] } }]
    },
    module: { [INTERPRET_FLAG]: { targetUuid: target.uuid, stanceIds: Array.from(stanceIds ?? []) } },
    expiry
  });
}

/** Root the Body: the attacker's DC against a Shove or Trip, or the save or check. */
export const ROOT_ACTIONS = Object.freeze(["shoveAttack", "tripAttack"]);
export function rootTheBodyEffect(n, expiry) {
  return effectData("rootTheBody", {
    name: `Root the Body (+${n})`,
    description: `Root the Body: +${n} circumstance bonus to the triggering check or saving throw to avoid being knocked prone or moved; against a Shove or Trip, the attacker's DC rises by ${n}. One trigger only.`,
    system: {
      // RULED AS STORGAR (Graham, 21 Oct 2026): a Shove or Trip is rolled
      // against your DC, so the bonus raises the DC. A Trip's DC is the
      // higher of two, and a row on either belongs to it (3.666.0).
      defenceDC: [{ dc: "fortitudeDC", value: n, label: "Root the Body", scope: "braced against this Shove or Trip", when: { actions: [...ROOT_ACTIONS] } }],
      oneAttack: { actions: [...ROOT_ACTIONS] },
      conditionals: [{ kind: "modifier", value: n, type: "circumstance", label: "Root the Body", scope: "The check or saving throw to avoid being knocked prone or moved against your will by a physical effect — tick if this is it", auto: false, oneShot: true, when: { checkTypes: ["save", "skill"] } }]
    },
    expiry
  });
}

/** Centred Balance: the next of six named skills. */
export const CENTRED_SKILLS = Object.freeze(["acrobatics", "athletics", "climbing", "mentalFocus", "perception", "senseMotive"]);
export function centredBalanceEffect(n, expiry) {
  return effectData("centredBalance", {
    name: `Centred Balance (+${n})`,
    description: `Centred Balance: +${n} circumstance bonus to your next Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check, made immediately.`,
    system: {
      conditionals: [{ kind: "modifier", value: n, type: "circumstance", label: "Centred Balance", scope: "The check you meditated for, made immediately after", auto: true, oneShot: true, when: { checkTypes: ["skill"], subjects: [...CENTRED_SKILLS] } }]
    },
    expiry
  });
}

/** Guide the Breath: the ally's next Refocus. */
export function guideTheBreathEffect(n, guideName, expiry) {
  return effectData("guideTheBreath", {
    name: `Guide the Breath (+${n} Refocus)`,
    description: `${guideName} guides your breathing: +${n} circumstance bonus to your next Refocus check before the end of your next turn.`,
    system: {
      conditionals: [{ kind: "modifier", value: n, type: "circumstance", label: "Guide the Breath", scope: "Your next Refocus check", auto: true, oneShot: true, when: { actions: ["refocus"] } }]
    },
    expiry
  });
}

const EMOTION_FEAR = Object.freeze(["emotion", "fear"]);

/** Steady Heart's Critical (until your next turn) and Partial (your next such save). */
export function steadyHeartEffect(kind, expiry) {
  const once = kind === "partial";
  return effectData("steadyHeart", {
    name: once ? "Steady Heart (+2 next save vs Emotion or Fear)" : "Steady Heart (+2 saves vs Emotion and Fear)",
    description: once
      ? "Steady Heart: +2 circumstance bonus to your next saving throw against an Emotion or Fear effect before the beginning of your next turn."
      : "Steady Heart: +2 circumstance bonus to saving throws against Emotion and Fear effects until the beginning of your next turn.",
    system: {
      conditionals: scopedRows({
        value: 2, label: "Steady Heart", oneShot: once,
        sure: "Saving throws against Emotion and Fear effects",
        unsure: "A saving throw against an Emotion or Fear effect — tick if this is one",
        when: { checkTypes: ["save"] }, axis: "traits", values: [...EMOTION_FEAR]
      })
    },
    expiry
  });
}

/** Resist Dying: the next Dying Check (its scope, 3.666.0). */
export function resistDyingEffect(n) {
  return effectData("resistDying", {
    name: `Resist Dying (+${n} Dying Check)`,
    description: `Resist Dying: +${n} to your next Dying Check.`,
    system: {
      conditionals: [{ kind: "modifier", value: n, type: "untyped", label: "Resist Dying", scope: "Your next Dying Check", auto: true, oneShot: true, when: { actions: ["dyingCheck"] } }]
    },
    expiry: null
  });
}

const CONCENTRATE_MENTAL = Object.freeze(["concentrate", "mental"]);

/**
 * Maintain Clarity, ruled "offered as a tick" (Graham, 21 Oct 2026): the
 * system cannot tell a distraction penalty from any other, so the points it
 * cancels are offered on Concentrate and Mental checks for the player to
 * take when a distraction penalty applies. The Fumble's −1 is applied.
 */
export const CLARITY_POINTS = Object.freeze({ critical: 4, success: 2, partial: 1 });
export function maintainClarityEffect(degree, expiry) {
  if (degree === "fumble") {
    return effectData("maintainClarity", {
      name: "Maintain Clarity: overwhelmed (−1)",
      description: "Maintain Clarity: the distraction overwhelms you; −1 circumstance penalty to Concentrate and Mental actions until the beginning of your next turn.",
      system: { conditionals: [{ kind: "modifier", value: -1, type: "circumstance", label: "Maintain Clarity (Fumble)", scope: "Concentrate and Mental actions", auto: true, when: { traits: [...CONCENTRATE_MENTAL] } }] },
      expiry
    });
  }
  const n = CLARITY_POINTS[degree];
  if (!n) return null;
  return effectData("maintainClarity", {
    name: `Maintain Clarity (ignore ${n} of distraction)`,
    description: `Maintain Clarity: ignore up to ${n} point${n === 1 ? "" : "s"} of circumstance penalty caused by distraction until the beginning of your next turn.`,
    system: {
      conditionals: [{ kind: "modifier", value: n, type: "untyped", label: "Maintain Clarity", scope: `Cancels up to ${n} point${n === 1 ? "" : "s"} of a distraction penalty — tick when one applies, and no more than that penalty`, auto: false, when: { traits: [...CONCENTRATE_MENTAL] } }]
    },
    expiry
  });
}

/** Steel the Mind: the triggering Will save against an Emotion or Mental effect. */
export function steelTheMindEffect(n, expiry) {
  return effectData("steelTheMind", {
    name: `Steel the Mind (+${n} Will save)`,
    description: `Steel the Mind: +${n} circumstance bonus to the triggering Will saving throw against an Emotion or Mental effect.`,
    system: {
      conditionals: scopedRows({
        value: n, label: "Steel the Mind", oneShot: true,
        sure: "The triggering Will save against an Emotion or Mental effect",
        unsure: "The triggering Will save — tick if it is against an Emotion or Mental effect",
        when: { checkTypes: ["save"], subjects: ["will"] }, axis: "traits", values: ["emotion", "mental"]
      })
    },
    expiry
  });
}

/** Observe Technique's Critical: your next DB or save against that creature. */
export function observeTechniqueEffect(target, expiry) {
  const name = target?.name ?? "the target";
  return effectData("observeTechnique", {
    name: `Observe Technique (+2 vs ${name})`,
    description: `Observe Technique: +2 circumstance bonus to your next DB check or saving throw against ${name}'s observed ability before the end of your next turn. Spent by the first.`,
    system: {
      defenceDC: [{ dc: "defence", value: 2, label: "Observe Technique", scope: `${name}'s next attack on you`, when: { sourceUuids: [target.uuid] } }],
      oneAttack: { against: "attack", fromUuids: [target.uuid] },
      conditionals: [{ kind: "modifier", value: 2, type: "circumstance", label: "Observe Technique", scope: `A saving throw against the ability you observed ${name} use — tick if this is it`, auto: false, oneShot: true, when: { checkTypes: ["save"], sourceUuids: [target.uuid] } }]
    },
    expiry
  });
}

/**
 * Read Intent, by degree: Critical, DB and saves +2; Success, the one chosen;
 * Partial, DB +1; Fumble, DB −1. All against that creature, until the
 * beginning of your next turn.
 */
export function readIntentEffect(degree, target, choice, expiry) {
  const name = target?.name ?? "the target";
  const rows = { defenceDC: [], conditionals: [] };
  const db = (value) => rows.defenceDC.push({ dc: "defence", value, label: "Read Intent", scope: `against ${name}`, when: { sourceUuids: [target.uuid] } });
  const saves = (value) => rows.conditionals.push({ kind: "modifier", value, type: "circumstance", label: "Read Intent", scope: `Saving throws against ${name}`, auto: true, when: { checkTypes: ["save"], sourceUuids: [target.uuid] } });
  let summary;
  if (degree === "critical") { db(2); saves(2); summary = `+2 DB and saves vs ${name}`; }
  else if (degree === "success" && choice === "saves") { saves(2); summary = `+2 saves vs ${name}`; }
  else if (degree === "success") { db(2); summary = `+2 DB vs ${name}`; }
  else if (degree === "partial") { db(1); summary = `+1 DB vs ${name}`; }
  else if (degree === "fumble") { db(-1); summary = `−1 DB vs ${name}`; }
  else return null;
  const system = {};
  if (rows.defenceDC.length) system.defenceDC = rows.defenceDC;
  if (rows.conditionals.length) system.conditionals = rows.conditionals;
  return effectData("readIntent", {
    name: `Read Intent (${summary})`,
    description: `Read Intent: ${summary} until the beginning of your next turn.${degree === "critical" ? ` ${name} cannot provide flanking against you during this time.` : ""}`,
    system,
    expiry
  });
}

/**
 * Elemental Ward, by degree: how long the ward lasts, whether it is a
 * weakness, and the lockout a failure leaves.
 *
 * The Blunder's ward prints no duration of its own: "drawn incorrectly but
 * you fail to realise this", so it is the ward the drawer believes it made,
 * at a Success's 10 minutes.
 */
export const WARD_SECONDS = Object.freeze({ heroic: 8 * 3600, critical: 3600, success: 600, blunder: 600 });
export function elementalWardPlan(degree) {
  const seconds = WARD_SECONDS[degree] ?? 0;
  return {
    seconds,
    weakness: degree === "blunder",
    lock: degree === "failure" ? { seconds: 600 } : degree === "fumble" ? { prep: true } : null
  };
}

/* ------------------------------------------------------------------ */
/* Foundry side: small steps                                            */
/* ------------------------------------------------------------------ */

export function combatFor(actor) {
  const combat = globalThis.game?.combat;
  if (!combat?.started) return null;
  return Array.from(combat.combatants ?? []).some((c) => c.actor === actor || c.actorId === actor?.id) ? combat : null;
}

/** The clock for an effect on `bearer`, now. */
export function expiryFor(kind, bearer) {
  const combat = combatFor(bearer);
  return expiryFlags(kind, {
    inCombat: Boolean(combat),
    combatId: combat?.id ?? "",
    nextRound: combat ? nextTurnRound(combat, (c) => c.actor === bearer || (c.actorId === bearer?.id && bearer?.isToken !== true)) : 0,
    worldTime: Number(globalThis.game?.time?.worldTime ?? 0)
  });
}

/** The actor's own effects this file made for the action. */
function ownEffects(actor, actionKey) {
  return Array.from(actor?.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, SOURCE_FLAG) === actionKey);
}

async function replaceOwn(actor, actionKey, data) {
  const old = ownEffects(actor, actionKey).map((e) => e.id);
  if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
  return helpers().createEffectsOn(actor, [data]);
}

function lockouts(actor) {
  return { ...(actor?.getFlag?.(MODULE_ID, LOCKOUT_FLAG) ?? {}) };
}

function nowState() {
  const combat = globalThis.game?.combat?.started ? globalThis.game.combat : null;
  return { worldTime: Number(globalThis.game?.time?.worldTime ?? 0), combat: combat ? { id: combat.id, round: combat.round, turn: combat.turn } : null };
}

/** Lock the action (or the action against one creature). */
async function lock(actor, actionKey, targetUuid, how) {
  const all = lockouts(actor);
  let record;
  if (how.prep) record = { prep: true };
  else if (how.nextTurn) {
    const combat = combatFor(actor);
    if (combat) {
      const round = nextTurnRound(combat, (c) => c.actor === actor);
      const index = Array.from(combat.turns ?? []).findIndex((c) => c.actor === actor);
      record = { combatId: combat.id, round, turn: Math.max(0, index) };
    } else record = { worldTime: Number(game.time?.worldTime ?? 0) + 6 };
  } else record = { worldTime: Number(game.time?.worldTime ?? 0) + Number(how.seconds) };
  all[lockoutKey(actionKey, targetUuid)] = record;
  await actor.setFlag(MODULE_ID, LOCKOUT_FLAG, all);
}

/** A whole-number distance in feet between two tokens, nearest squares. */
function feetBetween(a, b) {
  try {
    const grid = Number(canvas?.dimensions?.distance ?? 5);
    const measured = canvas.grid.measurePath([{ x: a.center.x, y: a.center.y }, { x: b.center.x, y: b.center.y }]).distance;
    // A creature larger than one square reaches from its nearest square,
    // not its centre: take half of each footprint beyond the first square.
    const reach = ((Math.max(1, Number(a.document?.width ?? 1)) - 1) + (Math.max(1, Number(b.document?.width ?? 1)) - 1)) / 2 * grid;
    return Math.max(0, Math.round(measured - reach));
  } catch {
    return null;
  }
}

function tokenOf(actor) {
  return actor?.getActiveTokens?.()?.[0] ?? null;
}

function ownsName(actor, name) {
  const wanted = String(name).trim().toLowerCase();
  return Array.from(actor?.items ?? []).some((i) => ["feat", "ability"].includes(i.type) && String(i.name).trim().toLowerCase() === wanted);
}

function warn(text) {
  globalThis.ui?.notifications?.warn(text);
  return false;
}

/* ------------------------------------------------------------------ */
/* trgPrimeActionAttempt — synchronous                                  */
/* ------------------------------------------------------------------ */

const NEEDS_TARGET = Object.freeze(["interpretStyle", "guideTheBreath", "observeTechnique", "readIntent"]);
const TARGET_LOCKS = Object.freeze(["recogniseDiscipline", "observeTechnique"]);

export function onActionAttempt({ actor, action, targetActor } = {}) {
  const key = String(action?.key ?? "");
  if (!SKILL_ACTION_KEYS.includes(key) || !actor) return true;
  const own = ACTION_BY_KEY.get(key);
  // THE FEAT, ENFORCED: the system's sheet hides an action whose feat you
  // lack, and that is the only place it looks. A macro or a card button
  // reaches the workflow without the sheet.
  if (own?.requiresFeat && !ownsName(actor, own.requiresFeat)) return warn(`${own.name}: requires the ${own.requiresFeat} feat.`);
  if (NEEDS_TARGET.includes(key) && !targetActor) return warn(`${own.name}: target the creature first.`);
  if (key === "guideTheBreath") {
    if (targetActor === actor || targetActor?.uuid === actor.uuid) return warn("Guide the Breath: you cannot use it upon yourself.");
    const { itemUsesMax, itemUsesRemaining } = helpers();
    if (!expendedFocus(targetActor.items, itemUsesMax, itemUsesRemaining)) return warn(`Guide the Breath: ${targetActor.name} has no expended ability with the Focus trait.`);
    const feet = feetBetween(tokenOf(actor), tokenOf(targetActor));
    if (feet !== null && feet > 10) return warn(`Guide the Breath: ${targetActor.name} is ${feet} ft away (10 ft at most).`);
  }
  if (key === "readIntent") {
    const feet = feetBetween(tokenOf(actor), tokenOf(targetActor));
    if (feet !== null && feet > 30) return warn(`Read Intent: ${targetActor.name} is ${feet} ft away (range 30 ft).`);
    const combat = globalThis.game?.combat?.started ? game.combat : null;
    if (combat) {
      const stamp = `${combat.id}:${combat.round}`;
      if ((actor.getFlag?.(MODULE_ID, READ_INTENT_FLAG) ?? {})[flagKey(targetActor.uuid)] === stamp) return warn(`Read Intent: already used against ${targetActor.name} this round.`);
    }
  }
  if (key === "elementalWard" && !tokenOf(actor)) return warn("Elemental Ward: place your token on the scene first — the ward is drawn around you.");
  const now = nowState();
  const all = lockouts(actor);
  const general = all[lockoutKey(key)];
  if (lockoutActive(general, now)) {
    return warn(general.prep
      ? `${own.name}: you may not try again until after your next daily preparation.`
      : `${own.name}: you cannot try again yet.`);
  }
  if (TARGET_LOCKS.includes(key) && targetActor && lockoutActive(all[lockoutKey(key, targetActor.uuid)], now)) {
    return warn(`${own.name}: you cannot try this against ${targetActor.name} again yet.`);
  }
  return true;
}

/* ------------------------------------------------------------------ */
/* trgPrimeActionResolved                                               */
/* ------------------------------------------------------------------ */

const BONUS_LINE = (n, what) => (n > 0 ? what : "No bonus — nothing to apply.");

/*
 * RESOLUTIONS IN FLIGHT (0.3.3). Found live on 22 October 2026: Evade taken
 * from the system's defence offer gave its +2, but the attack had already
 * read the DB. The system fires `trgPrimeActionResolved` without waiting
 * for its listeners, so `resolveAction` returned (and the attack went on)
 * while this module was still laying the effect. Each resolution is
 * remembered by actor until it settles, so a reaction taken before an
 * attack can wait for its own effect (see defence-offers.mjs).
 */
const IN_FLIGHT = new Map();

/** Remember a resolution until it settles; returns the promise unchanged. */
export function trackActionResolved(ctx, promise) {
  const uuid = String(ctx?.actor?.uuid ?? "");
  if (!uuid) return promise;
  const settled = Promise.resolve(promise).catch(() => {}).finally(() => {
    if (IN_FLIGHT.get(uuid) === settled) IN_FLIGHT.delete(uuid);
  });
  IN_FLIGHT.set(uuid, settled);
  return promise;
}

/** Wait for this actor's resolution in flight, if there is one. */
export async function actionResolutionSettled(actor) {
  const pending = IN_FLIGHT.get(String(actor?.uuid ?? ""));
  if (pending) await pending;
}

export async function onActionResolved({ actor, action, degree, targetActor } = {}) {
  const key = String(action?.key ?? "");
  if (!SKILL_ACTION_KEYS.includes(key) || !actor || !degree) return;
  // ONE CLIENT ACTS: the one that resolved the action, which is where this
  // hook fires (callAll is local). The GM's when the GM set the DC late.
  const own = ACTION_BY_KEY.get(key) ?? action;
  const h = helpers();
  const bonus = positiveBonus(h.bonusCheckModifier(degree));
  const row = tableDegree(own, degree);
  const lines = [];
  const say = (text) => lines.push(h.line(text));

  switch (key) {
    case "evade": {
      if (bonus) await replaceOwn(actor, key, evadeEffect(bonus, expiryFor("startOfNextTurn", actor)));
      say(BONUS_LINE(bonus, `<strong>+${bonus} dodge to DB</strong> against the attack you declared Evade for. That attack removes it.`));
      break;
    }
    case "interpretStyle": {
      const n = halfRoundedUp(h.bonusCheckModifier(degree));
      if (!n || !targetActor) { say(BONUS_LINE(0)); break; }
      const stances = h.activeStances(targetActor).map((e) => e.id);
      // ONE INSTANCE: "If you use the action again, any previous bonuses
      // are lost immediately" — whatever the new roll gives.
      await replaceOwn(actor, key, interpretStyleEffect(n, targetActor, stances, { system: {}, module: { combatId: combatFor(actor)?.id ?? "" } }));
      say(`<strong>+${n} circumstance to AB and DB</strong> against ${targetActor.name}.`);
      say(stances.length
        ? `<em>It ends when ${targetActor.name} leaves that stance, or when the battle ends.</em>`
        : `<em>No stance is recorded on ${targetActor.name}'s sheet: it ends with the battle — remove it by hand if ${targetActor.name} leaves its stance first.</em>`);
      break;
    }
    case "rootTheBody": {
      if (bonus) await replaceOwn(actor, key, rootTheBodyEffect(bonus, expiryFor("startOfNextTurn", actor)));
      say(BONUS_LINE(bonus, `<strong>+${bonus}</strong> braced: a Shove or Trip against you meets a DC ${bonus} higher, applied for you; for a check or saving throw, tick <em>Root the Body</em> on it. One trigger only. <em>Not against teleportation.</em>`));
      break;
    }
    case "wallRun": {
      const speed = landSpeed(actor);
      const feet = row === "critical" ? speed : row === "success" ? Math.floor(speed / 2) : row === "partial" ? 10 : 0;
      if (feet > 0) {
        await h.armMove(actor, { maxFeet: feet, speedKey: "", provokes: true, note: "Along the wall; end on a surface that can support you, or fall." }, "Wall Run");
        say(`<strong>Move:</strong> drag your token up to <strong>${feet} ft</strong> along the surface, no further AP. End on a surface that can support you, or you fall.`);
      } else if (row === "fumble") {
        await h.applyConditionTags(actor, [{ key: "prone", label: "Prone" }]);
        say(`<strong>${actor.name} falls prone</strong> in their starting space.`);
      }
      break;
    }
    case "recogniseDiscipline": {
      if (row === "fumble" && targetActor) {
        await lock(actor, key, targetActor.uuid, { seconds: 600 });
        say(`<em>No Recognise Discipline against ${targetActor.name} for 10 minutes.</em>`);
      } else if (row === "fumble") say("<em>No Recognise Discipline against this evidence for 10 minutes.</em>");
      break;
    }
    case "centredBalance": {
      if (bonus) await replaceOwn(actor, key, centredBalanceEffect(bonus, expiryFor({ seconds: 60 }, actor)));
      say(BONUS_LINE(bonus, `<strong>+${bonus} circumstance</strong> on your next Acrobatics, Athletics, Climbing, Mental Focus, Perception or Sense Motive check — make it now; it is applied for you.`));
      break;
    }
    case "guideTheBreath": {
      if (bonus && targetActor) {
        await h.createEffectsOn(targetActor, [guideTheBreathEffect(bonus, actor.name, expiryFor("endOfNextTurn", targetActor))]);
      }
      say(BONUS_LINE(bonus && targetActor ? bonus : 0, `<strong>+${bonus} circumstance</strong> on ${targetActor?.name}'s next Refocus check before the end of their next turn — applied for them.`));
      break;
    }
    case "steadyHeart": {
      if (row === "critical" || row === "success") {
        const r = await h.reduceCondition(actor, "frightened", row === "critical" ? 2 : 1);
        if (r.from) say(`Frightened <strong>${r.from} → ${r.to}</strong>${r.to === r.floor && r.floor ? ` (held at ${r.floor} by an area)` : ""}.`);
      }
      if (row === "critical" || row === "partial") {
        await replaceOwn(actor, key, steadyHeartEffect(row, expiryFor("startOfNextTurn", actor)));
        say(row === "critical"
          ? "<strong>+2 circumstance</strong> to saves against Emotion and Fear effects until the beginning of your next turn."
          : "<strong>+2 circumstance</strong> to your next save against an Emotion or Fear effect before the beginning of your next turn.");
      }
      if (row === "fumble") {
        await lock(actor, key, "", { nextTurn: true });
        say("<em>No Steady Heart until the beginning of your next turn.</em>");
      }
      break;
    }
    case "resistDying": {
      if (bonus) await replaceOwn(actor, key, resistDyingEffect(bonus));
      say(BONUS_LINE(bonus, `<strong>+${bonus}</strong> to your next Dying Check — applied for you.`));
      break;
    }
    case "maintainClarity": {
      const data = maintainClarityEffect(row, expiryFor("startOfNextTurn", actor));
      if (data) await replaceOwn(actor, key, data);
      if (CLARITY_POINTS[row]) say(`<strong>Ignore up to ${CLARITY_POINTS[row]}</strong> point${CLARITY_POINTS[row] === 1 ? "" : "s"} of distraction penalty until the beginning of your next turn — offered as a tick on your Concentrate and Mental checks.`);
      if (row === "fumble") say("<strong>−1 circumstance</strong> to your Concentrate and Mental actions until the beginning of your next turn — applied.");
      break;
    }
    case "steelTheMind": {
      if (bonus) await replaceOwn(actor, key, steelTheMindEffect(bonus, expiryFor("startOfNextTurn", actor)));
      say(BONUS_LINE(bonus, `<strong>+${bonus} circumstance</strong> to the triggering Will save — applied when it is rolled.`));
      break;
    }
    case "elementalWard": {
      const plan = elementalWardPlan(degree);
      if (plan.seconds) {
        const choice = await h.chooseFromList("Elemental Ward", "The element the ward guards against", [["acid", "Acid"], ["cold", "Cold"], ["electricity", "Electricity"], ["fire", "Fire"]]);
        if (!choice) { say("<em>No element chosen — no ward drawn.</em>"); break; }
        const region = await h.placeWardZone(actor, { label: "Elemental Ward", damageType: choice, weakness: plan.weakness, seconds: plan.seconds });
        say(region
          ? `A 10-ft ward against <strong>${choice}</strong> is drawn around you, for <strong>${durationWords(plan.seconds)}</strong>: every creature inside has ${plan.weakness ? "weakness" : "resistance"} to ${choice} while it stays inside.`
          : "<em>No token of yours on the viewed scene to draw the ward around.</em>");
      } else if (plan.lock) {
        await lock(actor, key, "", plan.lock);
        say(plan.lock.prep ? "<em>No Elemental Ward until after your next daily preparation.</em>" : "<em>You may try again after 10 minutes.</em>");
      } else if (row === "partial") say("<em>You may try again immediately.</em>");
      break;
    }
    case "readTheElements": {
      if (row === "critical") {
        await grantElementalTracking(actor);
        say(`<strong>${ELEMENTAL_TRACKING}</strong>: for the next hour you may Track the creature responsible with Nature instead of Survival — offered from your Nature skill.`);
      }
      if (row === "fumble") say("<em>You cannot Read the Elements here again for 1 hour.</em>");
      break;
    }
    case "readSpiritualEcho":
    case "readDevotion": {
      if (row === "fumble") say("<em>You cannot try this at this location again until after 10 minutes.</em>");
      break;
    }
    case "observeTechnique": {
      if (row === "critical" && targetActor) {
        await replaceOwn(actor, key, observeTechniqueEffect(targetActor, expiryFor("endOfNextTurn", actor)));
        say(`<strong>+2 circumstance</strong> to your next DB or saving throw against ${targetActor.name} before the end of your next turn: on DB applied for you; on a save, tick it.`);
      }
      if (row === "fumble" && targetActor) {
        await lock(actor, key, targetActor.uuid, { nextTurn: true });
        say(`<em>No Observe Technique against ${targetActor.name} until the beginning of your next turn.</em>`);
      }
      break;
    }
    case "readIntent": {
      if (!targetActor) break;
      const combat = globalThis.game?.combat?.started ? game.combat : null;
      if (combat) {
        await actor.setFlag(MODULE_ID, READ_INTENT_FLAG, { ...(actor.getFlag(MODULE_ID, READ_INTENT_FLAG) ?? {}), [flagKey(targetActor.uuid)]: `${combat.id}:${combat.round}` });
      }
      let choice = null;
      if (row === "success") {
        choice = await h.chooseFromList("Read Intent", `Your defence against ${targetActor.name}`, [["db", "DB"], ["saves", "Saving throws"]]);
        if (!choice) choice = "db";
      }
      const data = readIntentEffect(row, targetActor, choice, expiryFor("startOfNextTurn", actor));
      if (data) {
        // Per creature: a new reading of the same creature replaces the old.
        const old = ownEffects(actor, key).filter((e) => JSON.stringify(e.flags?.[SYSTEM_ID] ?? {}).includes(targetActor.uuid)).map((e) => e.id);
        if (old.length) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
        await h.createEffectsOn(actor, [data]);
        say(`${data.description} Applied for you.`);
      }
      if (row === "critical") say(`<em>${targetActor.name} cannot provide flanking against you until the beginning of your next turn — the table applies this.</em>`);
      break;
    }
    default:
      break;
  }
  if (lines.length) await h.postCard(actor, own.name, lines);
}

function landSpeed(actor) {
  const v = actor?.system?.combat?.movement?.land;
  return Math.max(0, Number(typeof v === "object" ? v?.total ?? v?.base : v) || 0);
}

function durationWords(seconds) {
  if (seconds >= 3600) return `${seconds / 3600} hour${seconds === 3600 ? "" : "s"}`;
  return `${Math.round(seconds / 60)} minutes`;
}

/**
 * Read the Elements' Critical: "you may use Nature instead of Survival to
 * Track that creature for the next hour". A temporary ability the system's
 * skill substitution reads (registered under its name), and an effect on
 * the world clock that takes it away after the hour: the system removes an
 * item that `endsWithSpell` with the effect sharing its cast id.
 */
async function grantElementalTracking(actor) {
  const castId = `it-elemental-tracking-${foundry.utils.randomID()}`;
  const old = Array.from(actor.items ?? []).filter((i) => i.name === ELEMENTAL_TRACKING).map((i) => i.id);
  if (old.length) await actor.deleteEmbeddedDocuments("Item", old);
  await actor.createEmbeddedDocuments("Item", [{
    name: ELEMENTAL_TRACKING,
    type: "ability",
    img: ICONS.readTheElements,
    system: { description: "<p>Read the Elements (Critical): for one hour you may use Nature instead of Survival to Track the creature responsible for the elemental traces.</p>" },
    flags: { [SYSTEM_ID]: { castId, endsWithSpell: true }, [MODULE_ID]: { [SOURCE_FLAG]: "readTheElements" } }
  }]);
  const expiry = expiryFlags({ seconds: 3600 }, { inCombat: false, worldTime: Number(game.time?.worldTime ?? 0) });
  await helpers().createEffectsOn(actor, [effectData("readTheElements", {
    name: "Read the Elements: Nature to Track (1 hour)",
    description: "You may use Nature instead of Survival to Track the creature responsible, for one hour.",
    system: { castId },
    expiry
  })]);
}

/* ------------------------------------------------------------------ */
/* Resist Dying: offered when the dying condition arrives               */
/* ------------------------------------------------------------------ */

/** Which client offers: an active player who owns the actor, else the GM. */
function offersHere(actor) {
  const users = Array.from(game.users ?? []).filter((u) => u.active && !u.isGM && actor.testUserPermission?.(u, "OWNER"));
  if (users.length) return users.sort((a, b) => String(a.id).localeCompare(String(b.id)))[0].id === game.user.id;
  return Boolean(game.users?.activeGM?.isSelf);
}

export async function offerResistDying(effect) {
  const actor = effect?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  if (!effect.statuses?.has?.("dying")) return;
  if (!ownsName(actor, "Inner Discipline") || !offersHere(actor)) return;
  const owners = Array.from(game.users ?? []).filter((u) => actor.testUserPermission?.(u, "OWNER")).map((u) => u.id);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: owners,
    content: `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${actor.name}</span><h3>Resist Dying</h3></div></header>`
      + `<p style="margin:2px 0">${actor.name} is dying. <strong>Reaction:</strong> a Mental Focus check against your Level DC; the Bonus Check result is added to your next Dying Check.</p>`
      + "<p style=\"margin:6px 0 2px\"><button type=\"button\" data-it-action=\"resistDying\">Resist Dying</button></p></div>",
    flags: { [MODULE_ID]: { resistDying: { actorUuid: actor.uuid, used: false } } }
  });
}

/**
 * The card's button: the action itself, taken as the creature falls.
 *
 * TAKEN AT THE TRIGGER (0.3.1; found live). Dying leaves a creature
 * unconscious, prone and flat-footed, and the system refuses every Reaction
 * to a flat-footed creature — so the ruled Reaction could never be taken
 * from the card. Graham's ruling puts it at the moment of falling, before
 * those conditions bite: the check is rolled at no cost through the
 * workflow, and the reaction itself is spent here. A creature with no
 * reaction left in combat is still refused.
 *
 * @returns {Promise<boolean>} whether it was used
 */
export async function pressResistDying(message) {
  const raw = message.getFlag(MODULE_ID, "resistDying");
  if (!raw || raw.used) return false;
  const doc = await fromUuid(raw.actorUuid).catch(() => null);
  const actor = doc?.actor ?? doc;
  if (!actor) return false;
  const action = helpers().skillActions.find((a) => a.key === "resistDying");
  if (!action) { ui.notifications.warn("Resist Dying is not registered."); return false; }
  const inCombat = Boolean(combatFor(actor));
  // Read at call time: automations.mjs imports this file.
  const { reactionOpen, spendReaction } = await import("./automations.mjs");
  // THE SAME QUESTION THE SPEND ASKS (0.6.2): none left, or only Battle
  // Readiness's, which Resist Dying (neither Attack nor Martial) cannot take.
  if (inCombat && !(await reactionOpen(actor, "Resist Dying"))) {
    ui.notifications.warn(`Resist Dying: ${actor.name} has no reaction it can spend on this.`);
    return false;
  }
  const check = await helpers().resolveAction(actor, { ...action, apCost: "0", variantNote: "Resist Dying: the Reaction to falling — its reaction is spent by the card." }, { invokedSkillKey: "mentalFocus" });
  if (!check) return false;
  // SPENT THROUGH THE SYSTEM (0.6.2), not written to the pool, so Battle
  // Readiness's record is kept.
  if (inCombat) await spendReaction(actor, "Resist Dying");
  await message.setFlag(MODULE_ID, "resistDying", { ...raw, used: true });
  return true;
}

/* ------------------------------------------------------------------ */
/* Endings the system's sweeps do not cover                             */
/* ------------------------------------------------------------------ */

function isActingGM() {
  return Boolean(globalThis.game?.users?.activeGM?.isSelf);
}

/** Every actor the world holds, linked and unlinked, on every scene. */
function everyActor() {
  const seen = new Set();
  const out = [];
  const add = (a) => { if (a && !seen.has(a.uuid)) { seen.add(a.uuid); out.push(a); } };
  for (const a of game.actors ?? []) add(a);
  for (const scene of game.scenes ?? []) for (const t of scene.tokens ?? []) if (!t.actorLink) add(t.actor);
  return out;
}

/**
 * trgPrimeTurnEnded (acting GM): "before the end of your next turn" for the
 * creature whose turn ended, and "until the beginning of your next turn" for
 * the creature whose turn begins — the system has already moved the combat
 * on when the hook fires (checked live, 21 Oct 2026).
 */
export async function onTurnEnded({ actor, combat } = {}) {
  if (!actor || !combat || !isActingGM()) return;
  const ids = Array.from(actor.effects ?? []).filter((e) => endsWithTurn(e.getFlag?.(MODULE_ID, TURN_END_FLAG), combat)).map((e) => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  const next = combat.combatant?.actor ?? null;
  if (!next) return;
  const starting = Array.from(next.effects ?? []).filter((e) => endsWithTurn(e.getFlag?.(MODULE_ID, TURN_START_FLAG), combat)).map((e) => e.id);
  if (starting.length) await next.deleteEmbeddedDocuments("ActiveEffect", starting);
}

/** deleteCombat (acting GM): Interpret Style's "until the battle ends", and every turn-bounded effect of that combat. */
export async function onCombatDeleted(combat) {
  if (!combat || !isActingGM()) return;
  for (const actor of everyActor()) {
    const ids = Array.from(actor.effects ?? []).filter((e) => {
      const mine = e.flags?.[MODULE_ID];
      return mine?.[SOURCE_FLAG] && (mine.combatId === combat.id || mine[TURN_END_FLAG]?.combatId === combat.id || mine[TURN_START_FLAG]?.combatId === combat.id);
    }).map((e) => e.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/**
 * deleteActiveEffect (acting GM): a stance ending ends every Interpret Style
 * read of it; the dying condition ending takes an unused Resist Dying with it.
 */
export async function onEffectDeleted(effect) {
  if (!isActingGM()) return;
  const parent = effect?.parent;
  if (!parent || parent.documentName !== "Actor") return;
  if (effect.statuses?.has?.("dying")) {
    const ids = ownEffects(parent, "resistDying").map((e) => e.id);
    if (ids.length) await parent.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
  for (const actor of everyActor()) {
    const ids = ownEffects(actor, "interpretStyle").filter((e) => {
      const read = e.getFlag(MODULE_ID, INTERPRET_FLAG);
      return read?.targetUuid === parent.uuid && (read.stanceIds ?? []).includes(effect.id);
    }).map((e) => e.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/** trgPrimeDailyPreparation: Elemental Ward's Fumble lifts. */
export async function onDailyPreparation({ actor } = {}) {
  if (!actor?.isOwner) return;
  const all = lockouts(actor);
  const kept = Object.fromEntries(Object.entries(all).filter(([, r]) => !r?.prep));
  if (Object.keys(kept).length === Object.keys(all).length) return;
  await actor.unsetFlag(MODULE_ID, LOCKOUT_FLAG);
  if (Object.keys(kept).length) await actor.setFlag(MODULE_ID, LOCKOUT_FLAG, kept);
}
