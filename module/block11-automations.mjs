/**
 * Inner Tempest Block 11 (1.1.0): what the nine Gymnast expansion feats of
 * v1.4 DO, beyond the data on their items.
 *
 * Built on TRG Prime 3.712.1 and the core's own Gymnast archetype (Graham,
 * 24 November 2026; docs/INNER_TEMPEST_BLOCK11_AUDIT.md). Each piece goes
 * through the core's machinery:
 *
 *   Effortless Motion   a Step leg armed free of AP, once a round; the
 *                       Acrobatics advantage is data (conditionals)
 *   Offensive Momentum  the core's High Jump, Long Jump or Tumble at 0 AP
 *                       (resolveAction), the movement armed free, then a
 *                       card's melee Strike with a d4 precision rider
 *   Perfect Balance     data (conditionals and defenceDC) — no code here
 *   Pinnacle of Motion  the core's Tumble at 0 AP once a round; after any
 *                       successful Tumble, "flat-footed to you" against that
 *                       creature for your attacks only; a critical hit on it
 *                       offers an unarmed reaction Strike at the frozen MAP
 *   Rebound Assault     two melee Strikes at two creatures in reach, the
 *                       first with its MAP frozen and the second counting
 *                       two, so both are made at the penalty that stood
 *   Redirection Stance  the core's stance; a melee miss offers the reaction
 *                       (Flat-Footed until the end of the attacker's next
 *                       turn) and, on a fumble, the core's Trip at 0 AP
 *   Tumbling Reversal   after a successful Tumble, +1 circumstance against
 *                       that creature, and on a critical a one-shot
 *                       advantage, both to the end of your turn
 *   Vaulting Momentum   a skill substitution and an eligibility rule,
 *                       registered (registration.mjs)
 *   Whirlwind Kip       the core's stance; a critical Tumble or Escape offers
 *                       a reaction Strike
 *
 * Pure decisions are exported and driven by tools/verify-block11.mjs; the
 * Foundry side reads `game.trgPrime.modules.helpers` at call time.
 */
import { helpers, spendAP, spendReaction, reactionOpen, firstTarget, landSpeed, missedHere, SYSTEM_ID, MODULE_ID } from "./automations.mjs";
import { SHARED, registerSharedOps, usedThisRound } from "./block4-automations.mjs";
import { flurryWeaponsOf } from "./block3-automations.mjs";

const { made, ownEffects, safeDelete, putEffect, untilEndOfTurn, card, confirm, actorFrom, targetOnly, meleeWeapons, pickWeapon, tokenOf, esc, norm, int } = SHARED;
const h = () => helpers();

/* ------------------------------------------------------------------ */
/* Names and small pure rules                                           */
/* ------------------------------------------------------------------ */

export const B11 = Object.freeze({
  effortless: "Effortless Motion",
  offensive: "Offensive Momentum",
  balance: "Perfect Balance",
  pinnacle: "Pinnacle of Motion",
  rebound: "Rebound Assault",
  redirection: "Redirection Stance",
  reversal: "Tumbling Reversal",
  vaulting: "Vaulting Momentum",
  whirlwind: "Whirlwind Kip"
});

/** The core's degree keys that are a critical ("If your check result is a critical"). */
export const CRITICAL_DEGREES = Object.freeze(["critical", "heroic"]);
/** …and that are a success or better ("If successful", "When you succeed"). */
export const SUCCESS_DEGREES = Object.freeze(["success", "critical", "heroic"]);
export const isCritical = (degree) => CRITICAL_DEGREES.includes(String(degree ?? ""));
export const isSuccess = (degree) => SUCCESS_DEGREES.includes(String(degree ?? ""));

/** The archetype the GYMNAST trait names: the core's own (Chapter 5), never a second one. */
export const GYMNAST_ARCHETYPE = "Gymnast";

/** Does this list of items include the Gymnast archetype feat? */
export function ownsGymnast(items = []) {
  return Array.from(items ?? []).some((i) => i?.type === "feat" && norm(i.system?.category) === "archetype" && norm(i.name) === norm(GYMNAST_ARCHETYPE));
}

/**
 * VAULTING MOMENTUM'S GYMNAST TRAIT. "If a feat has such a trait [an
 * archetype], you must satisfy at least one of these traits" (Chapter 5,
 * Feat Traits). The core's General picker gates no archetype trait, so the
 * rule is registered as the feat's eligibility (TRG Prime 3.684.0
 * `registerFeatEligibility`): the reason, or null.
 */
export function vaultingMomentumRefusal(items = []) {
  return ownsGymnast(items) ? null : "it has the Gymnast trait: take the Gymnast archetype first";
}

/**
 * OFFENSIVE MOMENTUM'S PRECISION DICE: "If you moved at least 10 feet, add
 * +1d4 precision damage. If your check result is a critical, this damage
 * increases to 2d4." The critical raises the damage the 10 feet earned, so
 * without the 10 feet there is none. A creature immune to precision takes
 * none; one resisting it takes half the dice, rounded down (the core's rule
 * for its own precision dice).
 *
 * @returns {number} how many d4
 */
export function offensiveMomentumDice({ movedFeet = 0, degree = "", immune = false, resisted = false } = {}) {
  if (immune || !(Number(movedFeet) >= 10)) return 0;
  const dice = isCritical(degree) ? 2 : 1;
  return resisted ? Math.floor(dice / 2) : dice;
}

/** The three checks Offensive Momentum may be made with ("a Jump or Tumble check"). */
export const OFFENSIVE_CHECKS = Object.freeze(["highJump", "longJump", "tumble"]);

/**
 * How far the action's movement may carry the token, in feet. A Tumble and a
 * High Jump move with the Stride they include (your land Speed); a Long Jump
 * adds the leap, which a success at total T cannot have exceeded (its DC is
 * the feet attempted, doubled without the run-up).
 */
export function offensiveMoveFeet(actionKey, { speed = 0, total = 0 } = {}) {
  const s = Math.max(0, int(speed));
  if (actionKey === "longJump") return s + Math.max(0, int(total));
  return s;
}

/**
 * REBOUND ASSAULT'S REQUIREMENT: "After taking an action with the Movement
 * trait (not a step)", this turn. Read from what the core records of the
 * turn — the drag's pools (`movementPools`: "stride:<speed>", "action:<key>"),
 * the AP spent on Movement-trait actions outside the drag (`movementTraitAp`,
 * keyed by the turn) — and this module's own record of Movement-trait
 * actions resolved this turn, a free one included.
 *
 * A compound leg ("action:compoundLeg") is somebody's ability moving you
 * (Predator's Pounce, Wing Burst, Offensive Momentum) — or a Step that an
 * ability armed (Agile Display, Effortless Motion). The pool cannot say
 * which, so it is `ambiguous` and the player is asked.
 *
 * @returns {{qualifies: boolean, ambiguous: boolean}}
 */
export function reboundEvidence({ pools = {}, traitAp = null, ownRecord = null, turn = null } = {}) {
  const sameTurn = (r) => Boolean(r && turn && String(r.combatId) === String(turn.combatId) && int(r.round) === int(turn.round) && int(r.turn) === int(turn.turn));
  let ambiguous = false;
  for (const [key, pool] of Object.entries(pools ?? {})) {
    if (!(Number(pool?.movedFeet) > 0)) continue;
    if (key === "action:step") continue;
    if (key === "action:compoundLeg") { ambiguous = true; continue; }
    return { qualifies: true, ambiguous: false };
  }
  if (sameTurn(traitAp) && Number(traitAp.ap) > 0) return { qualifies: true, ambiguous: false };
  if (sameTurn(ownRecord) && ownRecord.qualifying === true) return { qualifies: true, ambiguous: false };
  return { qualifies: false, ambiguous };
}

/** Was this resolved action one with the Movement trait, other than a Step? */
export function qualifyingMovementAction(action = {}) {
  if (norm(action?.key) === "step") return false;
  return /\bmove(?:ment)?\b/i.test(String(action?.traits ?? ""));
}

/** "two separate melee attacks against two targets": two creatures, not the same one twice. */
export function reboundTargetsRefusal(a, b) {
  if (!a || !b) return "target two creatures first (both within your reach)";
  if (a === b || (a.uuid && a.uuid === b.uuid)) return "the two attacks must be against two different creatures";
  return "";
}

/**
 * THE DEX AND DODGE A CREATURE LOSES BY BEING FLAT-FOOTED — the core's own
 * figure (combat/strike-options.mjs `flatFootedLoss`), which it pays as a
 * bonus on the attack for "flat-footed to you" (Hidden, Formless Cut).
 */
export function flatFootedLoss(defence = {}) {
  const dex = Math.max(0, Number(defence?.ability) || 0);
  const dodge = Math.max(0, Number(defence?.breakdown?.byType?.dodge) || 0);
  return dex + dodge;
}

/**
 * PINNACLE OF MOTION: "the target becomes Flat-Footed against all your
 * attacks until the end of your turn". Against you alone, so not the
 * condition (which every attacker would read): the core's "flat-footed to
 * you" as a bonus on your attacks against that creature — its Dex and dodge,
 * circumstance as the core types it — and none when it is already
 * flat-footed to you for another reason (the core's `targetStates`).
 */
export function pinnacleFlags(targetUuid, targetName, loss) {
  const value = Math.max(0, int(loss));
  return {
    conditionals: value > 0 ? [{
      kind: "modifier", value, type: "circumstance", label: "Pinnacle of Motion",
      scope: `${targetName} is flat-footed to you (Pinnacle of Motion)`, auto: true,
      when: { checkTypes: ["attack"], targetUuids: [targetUuid], not: { targetStates: ["flatfooted"] } }
    }] : []
  };
}

/**
 * TUMBLING REVERSAL: "+1-circumstance bonus to attack rolls against that
 * creature until the end of your turn", and on a critical "your next attack
 * against that creature gains Advantage" — spent by that attack (a one-shot
 * row deletes the effect carrying it), and gone at the turn's end if unused.
 */
export function reversalFlags(targetUuid, targetName) {
  return { conditionals: [{ kind: "modifier", value: 1, type: "circumstance", label: "Tumbling Reversal", scope: `Attacks against ${targetName}`, auto: true, when: { checkTypes: ["attack"], targetUuids: [targetUuid] } }] };
}
export function reversalAdvantageFlags(targetUuid, targetName) {
  return { conditionals: [{ kind: "advantage", label: "Tumbling Reversal", scope: `Your next attack against ${targetName}`, auto: true, oneShot: true, when: { checkTypes: ["attack"], targetUuids: [targetUuid] } }] };
}

/** WHIRLWIND KIP's trigger: "If you critically succeed on a Tumble or Escape check". */
export function whirlwindTriggered(actionKey, degree) {
  return ["tumble", "escape"].includes(String(actionKey ?? "")) && isCritical(degree);
}

/**
 * REDIRECTION STANCE's trigger: a creature missed the stance-holder with a
 * melee attack it resolved (a reaction's miss counts: the book excludes
 * none), not one that forbids reactions. Returns whether to offer, and
 * whether the Trip is offered too ("If they fumble the attack against you").
 */
export function redirectionTrigger(ctx = {}) {
  if (!ctx.attacker || !ctx.target || ctx.held || !ctx.melee || ctx.noReactions) return { offer: false, trip: false };
  if (!missedHere(ctx)) return { offer: false, trip: false };
  return { offer: true, trip: Boolean(ctx.fumble) };
}

/**
 * PINNACLE OF MOTION's reaction: "If you critically hit a Flat-Footed (from
 * this ability) creature" — a hit that is a critical, against a creature
 * your Pinnacle mark names. "(1/round)" is the caller's.
 */
export function pinnacleTriggered(ctx = {}, markedUuids = []) {
  if (!ctx.attacker || !ctx.target || ctx.held) return false;
  if (!(ctx.hits && ctx.critical)) return false;
  return (markedUuids ?? []).includes(ctx.target.uuid);
}

/** The stances' effects. Neither changes a number while it simply stands. */
export function stanceSpec11(stance) {
  switch (stance) {
    case B11.redirection: return {
      description: "Redirection Stance: when a creature misses you with a melee attack, you may spend your reaction to make it flat-footed until the end of its next turn; if it fumbled, you may also attempt a free Trip against it.",
      changes: [], flags: { itGymnastStance: "redirection" },
      lines: ["When a creature misses you with a melee attack you are asked whether to spend your <strong>reaction</strong>: it is then <strong>flat-footed</strong> until the end of its next turn. On a <strong>fumble</strong> you may also Trip it, free."]
    };
    case B11.whirlwind: return {
      description: "Whirlwind Kip: a critical success on a Tumble or Escape check lets you make a Strike as a reaction; +2 circumstance bonus to DB against attacks of opportunity (added by the GM).",
      changes: [], flags: { itGymnastStance: "whirlwind" },
      lines: [
        "A <strong>critical</strong> Tumble or Escape asks whether to spend your <strong>reaction</strong> on a Strike.",
        "<em>+2 circumstance to your DB against attacks of opportunity: the GM adds it to the attack's DB by hand (the system cannot yet tell an attack of opportunity's DB apart).</em>"
      ]
    };
    default: return null;
  }
}
export const BLOCK11_STANCES = Object.freeze([B11.redirection, B11.whirlwind]);

/** Is a stance of this name up among these effects? */
export function stanceUp11(effects = [], stance) {
  const want = norm(stance);
  return Array.from(effects ?? []).some((e) => !e?.disabled && e?.flags?.[SYSTEM_ID]?.featStance && norm(e.name) === want);
}

/* ------------------------------------------------------------------ */
/* Foundry: small steps                                                 */
/* ------------------------------------------------------------------ */

const owns = (actor, name) => Array.from(actor?.items ?? []).some((i) => ["feat", "ability"].includes(i.type) && norm(i.name) === norm(name));
const combatNow = () => (game.combat?.started ? game.combat : null);
const roundStamp = () => (combatNow() ? { combatId: combatNow().id, round: int(combatNow().round) } : null);
const usedNow = (record) => usedThisRound(record, combatNow()?.id ?? "", combatNow()?.round);
const turnNow = () => (combatNow() ? { combatId: combatNow().id, round: int(combatNow().round), turn: int(combatNow().turn) } : null);

/**
 * A FILE OF THE CORE'S OWN, read at call time where the module API offers no
 * helper (the Step's length, the Trip action, a creature's precision
 * defences). Null when it cannot be reached; every caller has a fallback.
 */
async function core(rel) {
  // A HARNESS MAY POINT THIS AT A CHECKOUT (tools/verify-block11.mjs): a base
  // URL for the system's folder. Foundry serves it at /systems/trg-prime/.
  const base = globalThis.__itSystemBase ?? `/systems/${SYSTEM_ID}`;
  try { return await import(`${base}/module/${rel}`); } catch (err) { console.debug(`Inner Tempest | core file ${rel} unavailable`, err); return null; }
}

/** The Step's length for this creature (Graceful Step, Tiger Stance …), or 5. */
async function stepFeetOf(actor) {
  const mw = await core("combat/movement-workflow.mjs");
  const feet = Number(mw?.stepDistance?.(actor));
  return Number.isFinite(feet) && feet > 0 ? feet : 5;
}

/** The core's Trip Attack, by its key, or null. */
async function tripAction() {
  const data = await core("data/basic-actions.mjs");
  const list = data?.BASIC_ACTIONS ?? data?.default ?? [];
  return Array.from(list).find((a) => a?.key === "tripAttack") ?? null;
}

/** The core's skill action of this key. */
const skillAction = (key) => h().skillActions.find((a) => a.key === key) ?? null;

/** Is this creature immune or resistant to precision damage? The core's own reading where it can be had. */
async function precisionDefences(target) {
  if (!target) return { immune: false, resisted: false, known: false };
  const ct = await core("creature-traits.mjs");
  const df = await core("defences.mjs");
  const ctr = await core("creature-type-rules.mjs");
  if (typeof ct?.actorDefences !== "function" || !df?.IMMUNITY_TOKENS?.precision) return { immune: false, resisted: false, known: false };
  try {
    const d = ct.actorDefences(target.system ?? {}, ctr?.ownedCreatureTypeSystem?.(target) ?? null);
    const token = df.IMMUNITY_TOKENS.precision;
    const immune = Boolean(d?.immunities?.has?.(token));
    return { immune, resisted: !immune && Boolean(d?.resistances?.has?.(token)), known: true };
  } catch (err) {
    console.debug("Inner Tempest | precision defences", err);
    return { immune: false, resisted: false, known: false };
  }
}

/** Measured distance between two creatures' tokens, or null. */
async function feetBetween(a, b) {
  const ta = tokenOf(a), tb = tokenOf(b);
  if (!ta || !tb) return null;
  const geo = await core("combat/geometry.mjs");
  const d = Number(geo?.distanceBetween?.(ta, tb));
  return Number.isFinite(d) ? d : null;
}

/** The weapon's reach in feet: 5, or 10 with the Reach trait (the core's two melee bands). */
function reachFeet(weapon) {
  return /\breach\b/i.test(String(weapon?.system?.traits ?? "")) ? 10 : 5;
}

/* ------------------------------------------------------------------ */
/* Effortless Motion                                                    */
/* ------------------------------------------------------------------ */

const EFFORTLESS_FLAG = "effortlessStep";

const effortlessMotion = {
  hint: "Free Step (0 AP, once a round): drag up to your Step's length on your land Speed, provoking nothing. Advantage on Acrobatics checks made as part of movement is applied by itself.",
  async use(actor) {
    if (!combatNow()) {
      await card(actor, B11.effortless, ["Out of combat there is no AP to save: Step as you please. Your Acrobatics advantage during movement is applied by itself."]);
      return false;
    }
    if (usedNow(actor.getFlag(MODULE_ID, EFFORTLESS_FLAG))) { ui.notifications.warn("Effortless Motion: your free Step has been taken this round."); return false; }
    const feet = await stepFeetOf(actor);
    // A STEP, ARMED AS THE CORE ARMS AGILE DISPLAY'S: a land-Speed leg of the
    // Step's length that provokes nothing and counts as a Step (so it cannot
    // enter difficult terrain). Through the public `armMove` if the core's
    // own leg cannot be reached; that leg provokes nothing either.
    const cw = await core("combat/compound-action-workflow.mjs");
    if (typeof cw?.armCompoundLeg === "function") {
      await cw.armCompoundLeg(actor, { speedKey: "land", maxFeet: feet, provokes: false, countsAs: "step", note: "Effortless Motion's free Step" }, B11.effortless);
    } else {
      await h().armMove(actor, { maxFeet: feet, speedKey: "land", provokes: false, note: "Effortless Motion's free Step" }, B11.effortless);
    }
    await actor.setFlag(MODULE_ID, EFFORTLESS_FLAG, roundStamp());
    await card(actor, B11.effortless, [`<strong>Step:</strong> drag the token up to <strong>${feet} ft</strong> on your land Speed — no AP, no reactions provoked. Once this round.`]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Offensive Momentum                                                   */
/* ------------------------------------------------------------------ */

const OM_KEY = "b11:offensive";
const OM_RIDER = "b11:omRider";

const offensiveMomentum = {
  hint: "Flourish (2 AP): a High Jump, Long Jump or Tumble check; on a success, your movement and then a melee Strike (+1d4 precision after 10 ft, 2d4 on a critical check).",
  async use(actor) {
    const action = { key: "offensivemomentum", name: B11.offensive, traits: "Flourish, Gymnast" };
    if (!(await h().traitGate(actor, action, B11.offensive))) return false;
    if (combatNow() && Number(actor.system?.resources?.ap?.value ?? 0) < 2) { ui.notifications.warn("Offensive Momentum: 2 AP required."); return false; }
    const vaulting = owns(actor, B11.vaulting);
    const options = [
      ["tumble|acrobatics", "Tumble (Acrobatics) — target the creature first"],
      ...(vaulting ? [["highJump|acrobatics", "High Jump (Acrobatics, Vaulting Momentum)"], ["longJump|acrobatics", "Long Jump (Acrobatics, Vaulting Momentum)"]] : []),
      ["highJump|athletics", "High Jump (Athletics)"],
      ["longJump|athletics", "Long Jump (Athletics)"]
    ];
    const pick = await h().chooseFromList(B11.offensive, "Make which check as part of this action?", options);
    if (!pick) return false;
    const [key, skill] = String(pick).split("|");
    const base = skillAction(key);
    if (!base) { ui.notifications.warn(`Offensive Momentum: the system has no ${key} action.`); return false; }
    const feetBefore = Number((await h().movementThisTurn(actor))?.feet ?? 0) || 0;
    // THE TOTAL, for the Long Jump's reach: the core announces it.
    let total = 0;
    const hookId = Hooks.on("trgPrimeActionResolved", (ctx) => { if (ctx?.actor === actor && ctx?.action?.key === key) total = int(ctx.total); });
    let result = null;
    try {
      // THE ACTION'S 2 AP PAY FOR THE CHECK AND ITS MOVEMENT: the check at 0 AP.
      result = await h().resolveAction(actor, { ...base, apCost: "0", variantNote: "Offensive Momentum: made as part of this action (its 2 AP)." }, { invokedSkillKey: skill });
    } finally { Hooks.off("trgPrimeActionResolved", hookId); }
    if (!result) return false; // cancelled before anything was spent
    if (!(await spendAP(actor, B11.offensive, 2))) return false;
    await h().recordTraitUsage(actor, action);
    const degree = String(result.degree ?? "");
    if (!isSuccess(degree)) {
      await card(actor, B11.offensive, [degree ? "The check failed: no Strike." : "The check waits on the GM's DC: if it succeeds, Strike from your sheet (its AP is this action's)."]);
      return true;
    }
    const speed = landSpeed(actor);
    const moveFeet = offensiveMoveFeet(key, { speed, total });
    if (combatNow()) await h().armMove(actor, { maxFeet: moveFeet, speedKey: "land", provokes: true, note: `Offensive Momentum's ${base.name}` }, B11.offensive);
    const target = firstTarget();
    const weapons = meleeWeapons(actor);
    const buttons = weapons.map((w) => `<button type="button" data-it11-action="omStrike" data-weapon="${w.id}">Strike: ${esc(w.name)}</button>`);
    const lines = [
      h().line(`<strong>${esc(base.name)}: ${isCritical(degree) ? "a critical" : "a success"}.</strong> Move now: drag your token up to <strong>${moveFeet} ft</strong>, no further AP.`),
      h().line(`<strong>Then:</strong> a melee Strike for no AP${target ? ` against <strong>${esc(target.name)}</strong> (keep it targeted)` : " (target the creature)"}: <strong>+${isCritical(degree) ? "2d4" : "1d4"} precision</strong> if you moved at least 10 feet during this action.`)
    ];
    if (!buttons.length) lines.push(h().line("<em>No melee weapon is equipped: equip one, and the Strike's AP is still this action's.</em>"));
    else lines.push(`<p style="margin:6px 0 2px">${buttons.join(" ")}</p>`);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${esc(actor.name)}</span><h3>${B11.offensive}</h3></div></header>${lines.join("")}</div>`,
      flags: { [MODULE_ID]: { omStrike: { actorUuid: actor.uuid, degree, feetBefore, used: false, combatId: combatNow()?.id ?? null } } }
    });
    return true;
  }
};

/** The card's Strike: the precision rider set for this one blow, then taken away. */
async function pressOffensiveStrike(message, weaponId) {
  const raw = message.getFlag(MODULE_ID, "omStrike");
  if (!raw || raw.used) return;
  const actor = await actorFrom(raw.actorUuid);
  const weapon = actor?.items?.get?.(weaponId);
  if (!actor || !weapon) { ui.notifications.warn("That creature or weapon is no longer there."); return; }
  const target = firstTarget();
  if (!target) { ui.notifications.warn("Offensive Momentum: target the creature first."); return; }
  const movedFeet = Math.max(0, (Number((await h().movementThisTurn(actor))?.feet ?? 0) || 0) - (Number(raw.feetBefore) || 0));
  const defences = await precisionDefences(target);
  const dice = offensiveMomentumDice({ movedFeet, degree: raw.degree, immune: defences.immune, resisted: defences.resisted });
  await message.setFlag(MODULE_ID, "omStrike", { ...raw, used: true });
  if (dice > 0) {
    await putEffect(actor, OM_RIDER, made(OM_RIDER, {
      name: `Offensive Momentum (+${dice}d4 precision)`,
      description: `Offensive Momentum: +${dice}d4 precision damage on this Strike.`,
      system: { strikeDamageRider: { dice: `${dice}d4`, label: "Offensive Momentum (precision)", targetUuids: [target.uuid] } }
    }, untilEndOfTurn(actor)));
  }
  try {
    await h().rollWeaponAttack(actor, weapon, { apPaid: true, skipTargetPrompt: true, optionLabel: B11.offensive });
  } finally {
    const left = ownEffects(actor, OM_RIDER).map((e) => e.id);
    if (left.length) await safeDelete(actor, left);
  }
  const notes = [];
  if (!(movedFeet >= 10)) notes.push(`You moved ${movedFeet} ft during the action: no precision damage (10 ft needed).`);
  else if (defences.immune) notes.push(`${esc(target.name)} is immune to precision damage.`);
  else if (defences.resisted) notes.push(`${esc(target.name)} resists precision damage: half the dice.`);
  if (!defences.known && dice > 0) notes.push("<em>The system's precision defences could not be read: check the target for precision immunity.</em>");
  if (notes.length) await card(actor, B11.offensive, notes);
}

/* ------------------------------------------------------------------ */
/* Pinnacle of Motion                                                   */
/* ------------------------------------------------------------------ */

const PIN_TUMBLE_FLAG = "pinnacleTumble";
const PIN_STRIKE_FLAG = "pinnacleStrike";
const PIN_KEY = (uuid) => `b11:pinnacle:${uuid}`;

const pinnacleOfMotion = {
  hint: "Free Tumble (0 AP, once a round). After any successful Tumble, the creature is flat-footed to your attacks until the end of your turn; a critical hit on it offers an unarmed reaction Strike.",
  async use(actor) {
    const tumble = skillAction("tumble");
    if (!tumble) { ui.notifications.warn("Pinnacle of Motion: the system has no Tumble action."); return false; }
    if (combatNow() && usedNow(actor.getFlag(MODULE_ID, PIN_TUMBLE_FLAG))) { ui.notifications.warn("Pinnacle of Motion: your free Tumble has been taken this round."); return false; }
    const result = await h().resolveAction(actor, { ...tumble, apCost: "0", variantNote: "Pinnacle of Motion: a free Tumble (once a round)." }, { invokedSkillKey: "acrobatics" });
    if (!result) return false;
    if (combatNow()) await actor.setFlag(MODULE_ID, PIN_TUMBLE_FLAG, roundStamp());
    return true;
  }
};

/** The creatures this actor's Pinnacle marks name now. */
function pinnacleMarks(actor) {
  return Array.from(actor?.effects ?? []).map((e) => e.getFlag?.(MODULE_ID, "pinnacleTarget")).filter(Boolean);
}

async function markPinnacle(actor, target) {
  const loss = flatFootedLoss(target.system?.combat?.defence);
  await putEffect(actor, PIN_KEY(target.uuid), made(PIN_KEY(target.uuid), {
    name: `Pinnacle of Motion: ${target.name} flat-footed to you`,
    description: `Pinnacle of Motion: ${target.name} is flat-footed against your attacks until the end of your turn.`,
    system: pinnacleFlags(target.uuid, target.name, loss),
    module: { pinnacleTarget: target.uuid }
  }, untilEndOfTurn(actor)));
  return loss;
}

async function pinnacleStrikeOffer(actor, { targetUuid, targetName }) {
  const target = await actorFrom(targetUuid);
  if (!target || !owns(actor, B11.pinnacle)) return;
  if (usedNow(actor.getFlag(MODULE_ID, PIN_STRIKE_FLAG))) return;
  const weapons = (await flurryWeaponsOf(actor)).filter((w) => !["missile", "thrown", "ranged"].includes(norm(w.system?.attackMode || "melee")));
  if (!weapons.length) return;
  const yes = await confirm(`Pinnacle of Motion — ${actor.name}`, `<p>You critically hit <strong>${esc(targetName)}</strong> while it is flat-footed to you. Spend your <strong>reaction</strong> on an additional <strong>unarmed Strike</strong> against it, at your current multiple attack penalty?</p>`);
  if (!yes) return;
  const weapon = await pickWeapon(actor, B11.pinnacle, weapons);
  if (!weapon) return;
  if (!(await spendReaction(actor, B11.pinnacle, { traits: "Attack, Gymnast" }))) return;
  await actor.setFlag(MODULE_ID, PIN_STRIKE_FLAG, roundStamp());
  targetOnly(target);
  // "USING YOUR CURRENT MULTIPLE ATTACK PENALTY": the penalty as it stands,
  // the counter not advanced — the core's "frozen" reaction Strike (Cleave:
  // "uses your current multiple attack penalty but does not count towards
  // increasing it further"), paid by the reaction.
  await h().rollWeaponAttack(actor, weapon, { apPaid: true, mapFrozen: true, asReaction: true, skipTargetPrompt: true, optionLabel: B11.pinnacle });
}

/* ------------------------------------------------------------------ */
/* Rebound Assault                                                      */
/* ------------------------------------------------------------------ */

const MOVE_RECORD_FLAG = "movementTaken";

const reboundAssault = {
  hint: "Attack, Flourish (2 AP), after a Movement action this turn (not a Step): two melee Strikes against two creatures in reach, both at the penalty that stood; it then rises by two.",
  async use(actor) {
    const action = { key: "reboundassault", name: B11.rebound, traits: "Attack, Flourish, Gymnast, Movement" };
    const combat = combatNow();
    if (combat) {
      const evidence = reboundEvidence({
        pools: actor.getFlag(SYSTEM_ID, "movementPools") ?? {},
        traitAp: actor.getFlag(SYSTEM_ID, "movementTraitAp") ?? null,
        ownRecord: actor.getFlag(MODULE_ID, MOVE_RECORD_FLAG) ?? null,
        turn: turnNow()
      });
      if (!evidence.qualifies) {
        if (!evidence.ambiguous) { ui.notifications.warn("Rebound Assault: take an action with the Movement trait first this turn (a Stride, a Tumble, a jump … not a Step)."); return false; }
        const yes = await confirm(B11.rebound, "<p>Your only movement this turn was moved by an ability. Was it something other than a <strong>Step</strong> (a Stride, a Pounce, Offensive Momentum's movement …)?</p>");
        if (!yes) return false;
      }
    }
    if (!(await h().traitGate(actor, action, B11.rebound))) return false;
    if (combat && Number(actor.system?.resources?.ap?.value ?? 0) < 2) { ui.notifications.warn("Rebound Assault: 2 AP required."); return false; }
    const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter(Boolean);
    if (targets.length !== 2) { ui.notifications.warn("Rebound Assault: target exactly two creatures, both within your reach."); return false; }
    const refusal = reboundTargetsRefusal(targets[0], targets[1]);
    if (refusal) { ui.notifications.warn(`Rebound Assault: ${refusal}.`); return false; }
    const weapons = meleeWeapons(actor);
    if (!weapons.length) { ui.notifications.warn("Rebound Assault: no melee weapon in hand."); return false; }
    // EACH ATTACK'S WEAPON, then its reach, before anything is spent.
    const plan = [];
    for (const t of targets) {
      const w = await pickWeapon(actor, `${B11.rebound} — against ${t.name}`, weapons);
      if (!w) return false;
      const feet = await feetBetween(actor, t);
      if (feet !== null && feet > reachFeet(w)) { ui.notifications.warn(`Rebound Assault: ${t.name} is ${feet} ft away, beyond ${w.name}'s reach.`); return false; }
      plan.push({ target: t, weapon: w });
    }
    if (!(await spendAP(actor, B11.rebound, 2))) return false;
    await h().recordTraitUsage(actor, action);
    // "THESE ATTACKS EFFECT YOUR MULTIPLE ATTACK PENALTY NORMALLY, BUT NOT
    // UNTIL AFTER THEY HAVE BEEN RESOLVED." The first is rolled with the
    // counter frozen, at the penalty that stands; the second reads the same
    // count (it did not move) and advances it by two, one for each — so both
    // are made at the penalty that stood, and the penalty after is the one
    // two attacks leave. A penalty earned before Rebound Assault stands.
    targetOnly(plan[0].target);
    const first = await h().rollWeaponAttack(actor, plan[0].weapon, { apPaid: true, skipTargetPrompt: true, mapFrozen: true, optionLabel: B11.rebound });
    targetOnly(plan[1].target);
    const second = await h().rollWeaponAttack(actor, plan[1].weapon, { apPaid: true, skipTargetPrompt: true, mapSteps: 2, optionLabel: B11.rebound });
    if (!second && first && combat) {
      // THE SECOND WAS REFUSED AFTER ALL (a reach or a hand the core found):
      // the first still counts, once.
      const count = int(actor.getFlag(SYSTEM_ID, "attackCount"));
      await actor.setFlag(SYSTEM_ID, "attackCount", count + 1);
    }
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* The stances                                                          */
/* ------------------------------------------------------------------ */

function stanceUse11(stance) {
  const spec = stanceSpec11(stance);
  return {
    hint: `Stance (1 AP): ${spec.description.replace(/^[^:]+:\s*/, "")}`,
    async use(actor, item) {
      const fresh = stanceSpec11(stance);
      return h().enterStance(actor, item, {
        name: stance, apCost: 1, description: fresh.description, changes: fresh.changes, flags: fresh.flags,
        extraLines: fresh.lines.map((l) => h().line(l))
      });
    }
  };
}

/** Redirection Stance, asked of the stance-holder's player. */
async function redirectionOffer(actor, { attackerUuid, attackerName, trip }) {
  const attacker = await actorFrom(attackerUuid);
  if (!attacker || !stanceUp11(actor.effects, B11.redirection)) return;
  const yes = await confirm(`Redirection Stance — ${actor.name}`, `<p><strong>${esc(attackerName)}</strong> missed you with a melee attack${trip ? " — a <strong>fumble</strong>" : ""}. Spend your <strong>reaction</strong> to make it <strong>flat-footed</strong> until the end of its next turn${trip ? ", and attempt a free <strong>Trip</strong> against it" : ""}?</p>`);
  if (!yes) return;
  if (!(await spendReaction(actor, B11.redirection, { traits: "Gymnast, Stance" }))) return;
  const combat = combatNow();
  // "UNTIL THE END OF THEIR NEXT TURN": the core's clock for the creature
  // named, passing over the turn now in progress (3.707.2's `endsAtTurnEndOf`).
  const endsAtTurnEndOf = combat ? { of: attacker.uuid, castTurn: `${int(combat.round)}:${String(combat.combatant?.id ?? "")}` } : null;
  const applied = await h().applyConditionTagsTo(attacker, [{ key: "flatFooted", label: "Flat-Footed" }], combat ? { endsAtTurnEndOf } : { duration: { seconds: 12 } });
  const lines = [`<strong>${esc(attacker.name)}</strong> is <strong>flat-footed</strong> until the end of its next turn.`];
  if (!applied) lines.push("<em>The condition could not be applied (its own immunity, or the GM relay): apply Flat-Footed by hand.</em>");
  await card(actor, B11.redirection, lines);
  if (!trip) return;
  // "YOU MAY ALSO ATTEMPT A FREE TRIP CHECK": the core's Trip, at 0 AP and
  // no further reaction, against the attacker.
  const tripBase = await tripAction();
  if (!tripBase) { await card(actor, B11.redirection, ["<em>The system's Trip could not be reached: roll the Trip from the Actions tab — it costs nothing.</em>"]); return; }
  const go = await confirm(`Redirection Stance — ${actor.name}`, `<p>Attempt the free <strong>Trip</strong> against <strong>${esc(attacker.name)}</strong> now?</p>`);
  if (!go) return;
  targetOnly(attacker);
  await h().resolveAction(actor, { ...tripBase, apCost: "0", variantNote: "Redirection Stance: a free Trip against the creature that fumbled." });
}

/** Whirlwind Kip, asked of the stance-holder's player. */
async function whirlwindOffer(actor, { targetUuid, actionName }) {
  if (!stanceUp11(actor.effects, B11.whirlwind)) return;
  const target = targetUuid ? await actorFrom(targetUuid) : null;
  const weapons = meleeWeapons(actor);
  if (!weapons.length) return;
  const yes = await confirm(`Whirlwind Kip — ${actor.name}`, `<p>A critical <strong>${esc(actionName)}</strong>. Spend your <strong>reaction</strong> on a <strong>Strike</strong>${target ? ` (against ${esc(target.name)}, or retarget first)` : " (target the creature first)"}?</p>`);
  if (!yes) return;
  const weapon = await pickWeapon(actor, B11.whirlwind, weapons);
  if (!weapon) return;
  if (!(await spendReaction(actor, B11.whirlwind, { traits: "Attack, Gymnast, Stance" }))) return;
  if (target && !firstTarget()) targetOnly(target);
  // A STRIKE ACTION, MADE WITH THE REACTION: the Strike's normal attack and
  // multiple attack penalty (on your own turn it counts as any Strike does;
  // off your turn the core gives a Strike none), its AP the reaction's.
  await h().rollWeaponAttack(actor, weapon, { apPaid: true, asReaction: true, skipTargetPrompt: Boolean(firstTarget()), optionLabel: B11.whirlwind });
}

/* ------------------------------------------------------------------ */
/* Hooks                                                                */
/* ------------------------------------------------------------------ */

/**
 * trgPrimeActionResolved (the roller's client): the Tumble's riders
 * (Tumbling Reversal, Pinnacle of Motion), Whirlwind Kip's reaction, and
 * this module's record of a Movement-trait action taken this turn.
 */
export async function onActionResolvedB11({ actor, action, resolvedDegree, degree: raw, targetActor } = {}) {
  if (!actor?.isOwner || !action) return;
  const degree = resolvedDegree ?? raw;
  const key = String(action.key ?? "");
  if (combatNow() && qualifyingMovementAction(action)) {
    await actor.setFlag(MODULE_ID, MOVE_RECORD_FLAG, { ...turnNow(), qualifying: true });
  }
  if (key === "tumble" && isSuccess(degree) && targetActor && targetActor !== actor) {
    const lines = [];
    if (owns(actor, B11.reversal)) {
      await putEffect(actor, `b11:reversal:${targetActor.uuid}`, made(`b11:reversal:${targetActor.uuid}`, {
        name: `Tumbling Reversal: +1 against ${targetActor.name}`,
        description: `Tumbling Reversal: +1 circumstance bonus to attack rolls against ${targetActor.name} until the end of your turn.`,
        system: reversalFlags(targetActor.uuid, targetActor.name)
      }, untilEndOfTurn(actor)));
      lines.push(`<strong>Tumbling Reversal:</strong> +1 circumstance to your attacks against ${esc(targetActor.name)} until the end of your turn.`);
      if (isCritical(degree)) {
        await putEffect(actor, `b11:reversalAdv:${targetActor.uuid}`, made(`b11:reversalAdv:${targetActor.uuid}`, {
          name: `Tumbling Reversal: advantage on your next attack against ${targetActor.name}`,
          description: `Tumbling Reversal: your next attack against ${targetActor.name} gains advantage (spent by that attack; gone at the end of your turn).`,
          system: reversalAdvantageFlags(targetActor.uuid, targetActor.name)
        }, untilEndOfTurn(actor)));
        lines.push(`…and <strong>advantage</strong> on your next attack against ${esc(targetActor.name)}.`);
      }
    }
    if (owns(actor, B11.pinnacle)) {
      const loss = await markPinnacle(actor, targetActor);
      lines.push(`<strong>Pinnacle of Motion:</strong> ${esc(targetActor.name)} is flat-footed to <strong>your</strong> attacks until the end of your turn${loss > 0 ? ` (+${loss} on them, its Dexterity and dodge)` : " (it has no Dexterity or dodge to lose)"}.`);
    }
    if (lines.length) await card(actor, "After the Tumble", lines);
  }
  if (whirlwindTriggered(key, degree) && stanceUp11(actor.effects, B11.whirlwind)) {
    if (await reactionOpen(actor, B11.whirlwind, { traits: "Attack, Gymnast, Stance" })) {
      await whirlwindOffer(actor, { targetUuid: targetActor && targetActor !== actor ? targetActor.uuid : null, actionName: action.name ?? key });
    }
  }
}

/** trgPrimeStrikeResolved: Redirection Stance's reaction, Pinnacle of Motion's Strike. */
export async function onStrikeResolvedB11(ctx = {}) {
  const { attacker, target } = ctx;
  if (!attacker || !target) return;
  // REDIRECTION STANCE: asked of the creature missed.
  const redirect = redirectionTrigger(ctx);
  if (redirect.offer && stanceUp11(target.effects, B11.redirection) && await reactionOpen(target, B11.redirection, { traits: "Gymnast, Stance" })) {
    await SHARED.offerTo(target, "b11Redirection", { attackerUuid: attacker.uuid, attackerName: attacker.name, trip: redirect.trip });
  }
  // PINNACLE OF MOTION: asked of the attacker's player (the hook fires on the
  // client that rolled; the offer goes where the creature is played).
  if (pinnacleTriggered(ctx, pinnacleMarks(attacker)) && owns(attacker, B11.pinnacle) && !usedNow(attacker.getFlag(MODULE_ID, PIN_STRIKE_FLAG))
    && await reactionOpen(attacker, B11.pinnacle, { traits: "Attack, Gymnast" })) {
    await SHARED.offerTo(attacker, "b11PinnacleStrike", { targetUuid: target.uuid, targetName: target.name });
  }
}

/** renderChatMessageHTML: Offensive Momentum's Strike buttons. */
export function bindBlock11Buttons(message, html) {
  const flags = message?.flags?.[MODULE_ID];
  if (!flags?.omStrike) return;
  for (const button of html.querySelectorAll?.("[data-it11-action]") ?? []) {
    if (button.dataset.it11Bound) continue;
    button.dataset.it11Bound = "true";
    if (flags.omStrike.used) { button.disabled = true; continue; }
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      button.disabled = true;
      try { await pressOffensiveStrike(message, button.dataset.weapon); } catch (err) { console.warn("Inner Tempest | Offensive Momentum", err); }
    });
  }
}

/* ------------------------------------------------------------------ */
/* The table                                                            */
/* ------------------------------------------------------------------ */

registerSharedOps({ offers: { b11Redirection: redirectionOffer, b11PinnacleStrike: pinnacleStrikeOffer, b11Whirlwind: whirlwindOffer } });

export const BLOCK11_AUTOMATIONS = Object.freeze({
  "effortless motion": effortlessMotion,
  "offensive momentum": offensiveMomentum,
  "pinnacle of motion": pinnacleOfMotion,
  "rebound assault": reboundAssault,
  "redirection stance": stanceUse11(B11.redirection),
  "whirlwind kip": stanceUse11(B11.whirlwind)
});

export const BLOCK11_PASSIVE_HINTS = Object.freeze({
  "perfect balance": "Works by itself: Shove, Trip and Reposition against you are rolled at disadvantage; advantage is offered on your own checks and saves against being knocked prone or moved.",
  "tumbling reversal": "Works by itself: after a successful Tumble, +1 circumstance to your attacks against that creature to the end of your turn; after a critical one, advantage on your next attack against it.",
  "vaulting momentum": "Works by itself: High Jump and Long Jump are offered from your Acrobatics."
});

/** Vaulting Momentum's substitution, in the core's SKILL_SUBSTITUTION_FEATS shape. */
export const BLOCK11_SKILL_SUBSTITUTIONS = Object.freeze({
  "Vaulting Momentum": Object.freeze([Object.freeze({ action: "highJump", skill: "acrobatics" }), Object.freeze({ action: "longJump", skill: "acrobatics" })])
});

/** Registered by registration.mjs. */
export function registerBlock11(api, moduleId) {
  for (const [name, entry] of Object.entries(BLOCK11_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const [name, hint] of Object.entries(BLOCK11_PASSIVE_HINTS)) api.registerPassiveAutomation?.(name, hint, moduleId);
  for (const [name, entries] of Object.entries(BLOCK11_SKILL_SUBSTITUTIONS)) api.registerSkillSubstitution(name, entries.map((e) => ({ ...e })), moduleId);
  api.registerFeatEligibility?.(B11.vaulting, (actor) => vaultingMomentumRefusal(Array.from(actor?.items ?? [])), moduleId);
}

/** The offers and the card's press, for the harness (tools/verify-block11.mjs). */
export const B11_OFFERS = Object.freeze({ b11Redirection: redirectionOffer, b11PinnacleStrike: pinnacleStrikeOffer, b11Whirlwind: whirlwindOffer });
export const B11_PRESS = Object.freeze({ omStrike: pressOffensiveStrike });
