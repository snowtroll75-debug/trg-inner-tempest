/**
 * Use-driven automations for Inner Tempest's Block 1: the racial abilities
 * that act (Fluid Form, Impact Absorption, Predator's Pounce, Wing Burst,
 * Living Lantern, Natural Chi) and the General feats that act (Spirit
 * Stance, Elemental Balance, Stunning Reflexes, Ancestral Guidance).
 *
 * Each entry is the `{ hint, use(actor, item) }` shape TRG Prime's
 * FEAT_AUTOMATION holds, keyed by the item's lowercased name and registered
 * through `registerFeatAutomation`. System helpers come from
 * `game.trgPrime.modules.helpers` at call time, so this file imports nothing
 * from the system and a harness can load it without Foundry.
 *
 * Everything a race, heritage or feat grants unconditionally lives on the
 * pack item as data (effects, conditionals, declarations); only choices and
 * activations are here.
 */

import { pressResistDying } from "./skill-action-automations.mjs";

export const SYSTEM_ID = "trg-prime";
export const MODULE_ID = "trg-inner-tempest";
export const FEAT_SOURCE_FLAG = "featSource";

export function helpers() {
  const h = globalThis.game?.trgPrime?.modules?.helpers;
  if (!h) throw new Error("Inner Tempest: TRG Prime's module helpers are not available.");
  return h;
}

/* ------------------------------------------------------------------ */
/* Small shared steps                                                   */
/* ------------------------------------------------------------------ */

/** Spend AP in combat, refusing if there is not enough. */
export async function spendAP(actor, label, ap = 1) {
  if (!game.combat?.started || ap <= 0) return true;
  const have = Number(actor.system.resources?.ap?.value ?? 0);
  if (have < ap) {
    ui.notifications.warn(`${label}: ${ap} AP required.`);
    return false;
  }
  await actor.update({ "system.resources.ap.value": have - ap });
  return true;
}

/**
 * Spend the reaction in combat, refusing if none remains this round.
 * `traits` (0.7.0) reads the reaction with these traits instead of the
 * feat's own: Snake Stance's Strike is an Attack reaction (Graham's B6-9)
 * though the stance's traits are Disciple, Mystic, Stance.
 */
export async function spendReaction(actor, label, { traits } = {}) {
  if (!game.combat?.started) return true;
  // THROUGH THE SYSTEM (0.6.1; found live): TRG Prime 3.669.1 spends the
  // reaction with Battle Readiness's rule (its extra reaction only for an
  // Attack or Martial reaction), read from the traits of the feat named.
  const h = globalThis.game?.trgPrime?.modules?.helpers;
  if (typeof h?.spendReaction === "function") {
    const feat = typeof traits === "string" ? { system: { traits } } : Array.from(actor.items ?? []).find((i) => i.name === label);
    return Boolean(await h.spendReaction(actor, label, { traits: String(feat?.system?.traits ?? "") }));
  }
  const have = Number(actor.system.resources?.reactions?.value ?? 0);
  if (have <= 0) {
    ui.notifications.warn(`${label}: no reaction available this round.`);
    return false;
  }
  await actor.update({ "system.resources.reactions.value": have - 1 });
  return true;
}

/**
 * MAY THIS REACTION BE ASKED? (0.6.2; found live.) The same question the
 * spend asks, put before the offer: a Fighter whose only reaction left is
 * Battle Readiness's (an Attack or Martial reaction only) was asked about a
 * reaction the spend then refused. Read with the traits of the feat named;
 * true out of combat.
 *
 * @param {Actor} actor
 * @param {string} label the feat's name
 * @param {{traits?: string}} [opts] the reaction's own traits, when not the feat's (0.7.0)
 * @returns {Promise<boolean>}
 */
export async function reactionOpen(actor, label, { traits } = {}) {
  if (!game.combat?.started) return true;
  const h = globalThis.game?.trgPrime?.modules?.helpers;
  const feat = typeof traits === "string" ? { system: { traits } } : Array.from(actor?.items ?? []).find((i) => i.name === label);
  if (typeof h?.reactionRefusal === "function") return !(await h.reactionRefusal(actor, String(feat?.system?.traits ?? "")));
  return Number(actor?.system?.resources?.reactions?.value ?? 0) > 0;
}

/**
 * DID THE STRIKE MISS? (0.7.0, found in review.) TRG Prime 3.670.0 says so
 * on `trgPrimeStrikeResolved` (`missed`: resolved, and not a hit). `hits` is
 * false too for an attack never resolved and for a hit that lands nothing
 * (a grab), and neither is a miss to answer. On an older system, a non-hit.
 */
export function missedHere(ctx = {}) {
  return typeof ctx?.missed === "boolean" ? ctx.missed : !ctx?.hits;
}

/** Whether a tracked use remains (Focus: restored by Refocus). */
export function hasUse(item) {
  const { itemUsesMax, itemUsesRemaining } = helpers();
  const max = itemUsesMax(item);
  if (max === null || max === Infinity) return true;
  return itemUsesRemaining(item) > 0;
}

/** Spend one tracked use; warns and returns false when none remain. */
export async function spendUse(item, label) {
  const { itemUsesMax, itemUsesRemaining } = helpers();
  const max = itemUsesMax(item);
  if (max === null || max === Infinity) return true;
  const remaining = itemUsesRemaining(item);
  if (remaining <= 0) {
    ui.notifications.warn(`${label}: no uses remain — Refocus or daily preparation restores it.`);
    return false;
  }
  await item.update({ "system.usesValue": remaining - 1 });
  return true;
}

/** The first targeted token's actor, or null. */
export function firstTarget() {
  const token = Array.from(game.user?.targets ?? [])[0];
  return token?.actor ?? null;
}

/** A land Speed as a number, whatever shape the sheet holds it in. */
export function landSpeed(actor) {
  const v = actor?.system?.combat?.movement?.land;
  return Math.max(0, Number(typeof v === "object" ? v?.total ?? v?.base : v) || 0);
}

/** Has the actor a feat or ability of this name? */
export function owns(actor, name) {
  const wanted = String(name).trim().toLowerCase();
  return Array.from(actor?.items ?? []).some((i) => ["feat", "ability"].includes(i.type) && String(i.name).trim().toLowerCase() === wanted);
}

/** The effects this item placed on the actor. */
function effectsFrom(actor, item) {
  return Array.from(actor?.effects ?? []).filter((e) => e.getFlag?.(SYSTEM_ID, FEAT_SOURCE_FLAG) === item.id);
}

/** Equipped melee weapons, natural ones included. */
export function meleeWeapons(actor) {
  return Array.from(actor?.items ?? []).filter((i) => i.type === "weapon" && i.system?.equipped
    && !["missile", "thrown", "ranged"].includes(String(i.system?.attackMode ?? "melee")));
}

/* ------------------------------------------------------------------ */
/* Spirit Stance's effect (Chapter 5, supplied in v1.2; IT-C1)          */
/* ------------------------------------------------------------------ */

const SPIRIT_TARGETS = Object.freeze(["spirit", "incorporeal"]);

/**
 * "+1-circumstance bonus to AB and DB against spirits, incorporeal creatures
 * and creatures possessing another creature … your physical Strikes are
 * treated as magical for the purpose of overcoming the defences of
 * incorporeal creatures and spirits." Carried on the stance's own effect,
 * so it lasts exactly as long as the stance (TRG Prime 3.664.0).
 */
export const SPIRIT_STANCE_FLAGS = Object.freeze({
  conditionals: [
    { kind: "modifier", value: 1, type: "circumstance", label: "Spirit Stance", scope: "Attacks against spirits and incorporeal creatures", auto: true, when: { checkTypes: ["attack"], targetTraits: [...SPIRIT_TARGETS] } },
    { kind: "modifier", value: 1, type: "circumstance", label: "Spirit Stance", scope: "Attacks against a creature possessing another creature — tick if the target is one", auto: false, when: { checkTypes: ["attack"], not: { targetTraits: [...SPIRIT_TARGETS] } } }
  ],
  defenceDC: [{ dc: "defence", value: 1, label: "Spirit Stance", scope: "against spirits and incorporeal creatures", when: { sourceTraits: [...SPIRIT_TARGETS] } }],
  magicalAttacks: { label: "Spirit Stance", targetTraits: [...SPIRIT_TARGETS] }
});

const spiritStance = {
  hint: "Stance (1 AP): +1 circumstance to AB and DB against spirits and incorporeal creatures; your physical Strikes are magical against them.",
  async use(actor, item) {
    return helpers().enterStance(actor, item, {
      name: "Spirit Stance",
      apCost: 1,
      description: "+1 circumstance bonus to AB and DB against spirits, incorporeal creatures and creatures possessing another creature; physical Strikes count as magical against incorporeal creatures and spirits.",
      flags: foundry.utils.deepClone(SPIRIT_STANCE_FLAGS),
      extraLines: [
        helpers().line("Against a creature with the Spirit or Incorporeal trait: <strong>+1 circumstance</strong> on your attacks and to your DB, and your physical Strikes are magical — all applied for you."),
        helpers().line("<em>A creature possessing another is offered as a tick on your attacks; against its attacks, add the +1 DB by hand.</em>")
      ]
    });
  }
};

/* ------------------------------------------------------------------ */
/* Racial abilities                                                     */
/* ------------------------------------------------------------------ */

const fluidForm = {
  hint: "1 AP (Concentrate, Morph): take on, or drop, a subtly altered appearance; advantage is offered on Bluff checks supporting it.",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    const current = effectsFrom(actor, item);
    if (!(await spendAP(actor, "Fluid Form"))) return;
    if (current.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", current.map((e) => e.id));
      await postCard(actor, "Fluid Form", [line("Your own features return.")]);
      return;
    }
    await replaceFeatEffect(actor, item, {
      name: "Fluid Form: altered appearance",
      img: item.img,
      description: "Your features, colouring, hair, voice and apparent age are subtly rearranged (not your size, equipment or heritage, and never a specific individual). Advantage on Bluff (Deception) checks supporting this disguise.",
      flags: {
        [SYSTEM_ID]: {
          conditionals: [{ kind: "advantage", label: "Fluid Form", scope: "Bluff (Deception) checks supporting your Fluid Form disguise — tick if this Bluff does", auto: false, when: { checkTypes: ["skill"], actions: ["bluff"] } }]
        }
      }
    });
    await postCard(actor, "Fluid Form", [
      line("Your features shift into a <strong>new appearance</strong>. Advantage is offered on Bluff (Deception) checks that support it."),
      line("<em>Size, equipment and heritage are unchanged, and you cannot copy a specific person. Use Fluid Form again to return to your own appearance.</em>")
    ]);
  }
};

/** Impact Absorption's Base DR: 1, or 2 with Bear's Endurance (Block 5). */
export function impactAbsorptionDR(bearsEndurance = false) {
  return bearsEndurance ? 2 : 1;
}

const impactAbsorption = {
  hint: "Reaction (Focus), declared when a physical attack targets you: +1 Base DR against that attack, which removes it.",
  async use(actor, item) {
    const { line, postCard } = helpers();
    if (!hasUse(item)) { ui.notifications.warn("Impact Absorption: no uses remain — Refocus restores it."); return; }
    if (!(await spendReaction(actor, "Impact Absorption"))) return;
    if (!(await spendUse(item, "Impact Absorption"))) return;
    // BEAR'S ENDURANCE (Block 5, 0.6.0): "your Base DR increases by 2 against
    // the triggering attack rather than 1".
    const dr = impactAbsorptionDR(owns(actor, "Bear's Endurance"));
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: `Impact Absorption: Base DR +${dr}`,
      img: item.img,
      origin: item.uuid,
      description: `Your Base DR increases by ${dr} against the triggering attack; that attack removes it.`,
      changes: [{ key: "system.combat.naturalArmourBase.natural", mode: 2, value: String(dr), priority: 30 }],
      // ONE ATTACK (TRG Prime 3.666.0; Graham's ruling of 21 October 2026,
      // "fix all three"): declared when you are targeted, spent by the
      // weapon attack it answers, damage included. It used to last the
      // round and ask to be deleted by hand.
      flags: { [SYSTEM_ID]: { [FEAT_SOURCE_FLAG]: item.id, oneAttack: { against: "weapon" } } }
    }]);
    await postCard(actor, "Impact Absorption", [
      line(`You brace and let your spirit take the blow: <strong>Base DR +${dr}</strong> against the physical attack targeting you. That attack removes it.`),
      ...(dr > 1 ? [line("<em>Bear's Endurance: +2 instead of +1. If the attack still damages you, +2 racial is offered on your checks and saves against being knocked prone or moved by it.</em>")] : []),
      ...(game.combat?.started ? [line("Reaction spent.")] : []),
      line("<em>Focus use spent — Refocus restores it.</em>")
    ]);
  }
};

/** A move armed free of AP, then (optionally) a strike card. */
async function moveAndMaybeStrike(actor, item, { label, ap, traits, strike, note, speedKey }) {
  const { line, postCard, traitGate, recordTraitUsage, armMove } = helpers();
  const action = { key: String(label).toLowerCase().replace(/[^a-z]/g, ""), name: label, traits };
  if (!(await traitGate(actor, action, label))) return false;
  if (strike && !firstTarget()) { ui.notifications.warn(`${label}: target the creature first.`); return false; }
  if (!hasUse(item)) { ui.notifications.warn(`${label}: no uses remain — Refocus restores it.`); return false; }
  if (!(await spendAP(actor, label, ap))) return false;
  if (!(await spendUse(item, label))) return false;
  const speed = landSpeed(actor);
  await armMove(actor, { maxFeet: speed, speedKey, provokes: true, note }, label);
  await recordTraitUsage(actor, action);
  const lines = [
    line(`<strong>Cost:</strong> ${ap} AP${/focus/i.test(traits) ? ", and this ability's Focus use (Refocus restores it)" : ""}.`),
    line(`<strong>Move:</strong> drag your token — up to <strong>${speed} ft</strong>, no further AP. ${note}`)
  ];
  if (!strike) {
    await postCard(actor, label, lines);
    return true;
  }
  const target = firstTarget();
  const weapons = meleeWeapons(actor);
  if (!weapons.length) lines.push(line(`<em>No melee weapon is equipped — equip one and Strike from your sheet; the Strike's AP was paid by ${label}.</em>`));
  const buttons = weapons.map((w) => `<button type="button" data-it-action="paidStrike" data-weapon="${w.id}">Strike: ${w.name}</button>`);
  if (buttons.length) {
    lines.push(line(`<strong>Then:</strong> one melee Strike against <strong>${target?.name ?? "the target"}</strong>, no AP — keep it targeted and press a weapon.`));
    lines.push(`<p style="margin:6px 0 2px">${buttons.join(" ")}</p>`);
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${actor.name}</span><h3>${label}</h3></div></header>${lines.join("")}</div>`,
    flags: { [MODULE_ID]: { paidStrike: { actorUuid: actor.uuid, label, used: false } } }
  });
  return true;
}

const predatorsPounce = {
  hint: "2 AP (Attack, Flourish, Focus, Movement): Stride up to your Speed towards the target, then a melee Strike for no further AP.",
  async use(actor, item) {
    return moveAndMaybeStrike(actor, item, {
      label: "Predator's Pounce", ap: 2, traits: "Attack, Flourish, Focus, Movement", strike: true, speedKey: "land",
      note: "Stride at least 10 feet towards the creature; it cannot use reactions triggered by this movement."
    });
  }
};

const wingBurst = {
  hint: "1 AP (Flourish, Movement): fly up to your Speed; end on a surface or fall.",
  async use(actor, item) {
    return moveAndMaybeStrike(actor, item, {
      label: "Wing Burst", ap: 1, traits: "Flourish, Movement", strike: false, speedKey: "",
      // WINGS UNFURLED (Block 5): "You no longer need to end the movement
      // granted by Wing Burst upon a surface capable of supporting you."
      note: owns(actor, "Wings Unfurled")
        ? "You fly (Wings Unfurled): you may end the move in the air."
        : "You fly: end the move on a surface that can support you, or fall (use the Falling action)."
    });
  }
};

/** The light sources this module registers (TRG Prime 3.669.0 `registerLightSources`). */
export const LIVING_LANTERN_LIGHT = "living-lantern";

const livingLantern = {
  hint: "1 AP (Concentrate): light or suppress your dim light (10 ft).",
  async use(actor, item) {
    const { line, postCard, replaceFeatEffect } = helpers();
    const lit = effectsFrom(actor, item);
    if (!(await spendAP(actor, "Living Lantern"))) return;
    if (lit.length) {
      await actor.deleteEmbeddedDocuments("ActiveEffect", lit.map((e) => e.id));
      await postCard(actor, "Living Lantern", [line("Your light is <strong>suppressed</strong>.")]);
      return;
    }
    // THE LIGHT ITSELF (0.6.0, on TRG Prime 3.669.0): a light source this
    // module registers ("living-lantern", registration.mjs), so the token
    // glows dim to 10 feet and the light level rises a step there, as a
    // carried light's does. Suppressing it deletes the effect, and the
    // system's own cleanup puts the token's light back.
    await replaceFeatEffect(actor, item, {
      name: "Living Lantern: dim light (10 ft)",
      img: item.img,
      description: "You emit dim light within 10 feet. Use Living Lantern again to suppress it.",
      flags: { [SYSTEM_ID]: { lightSource: LIVING_LANTERN_LIGHT } }
    });
    let drawn = true;
    try { await helpers().refreshTokenLight?.(actor); } catch (err) { drawn = false; console.warn("Inner Tempest | Living Lantern's light", err); }
    await postCard(actor, "Living Lantern", [
      line("You emit <strong>dim light within 10 feet</strong> — use it again to suppress."),
      ...(drawn ? [] : [line("<em>The token's own glow could not be set; the light level still counts it.</em>")])
    ]);
  }
};

/**
 * Spirit Warrior and Spiritwalker (Spirit Lore, a Miraku's), Elemental
 * Guardian and Elemental Harmonist (Elemental Lore, a Tianzhi's): another
 * Lore when the race already gives it (Graham, 21 Oct 2026). The background declares
 * `specialistAlternative`; the core's background chooser (3.665.0) asks for
 * it only while it is owed and records it as the background's own.
 */
const loreAlternative = {
  hint: "If your race already gives you this background's Lore, name another Lore for it.",
  async use(actor, item) {
    return helpers().useBackground(actor, item);
  }
};

const naturalChi = {
  hint: "Choose your cantrip: an innate spell with the Focus trait, cast with Wisdom.",
  async use(actor, item) {
    return helpers().useBackground(actor, item);
  }
};

/* ------------------------------------------------------------------ */
/* General feats                                                        */
/* ------------------------------------------------------------------ */

const SAVE_KEYS = Object.freeze([["fortitude", "Fortitude"], ["reflex", "Reflex"], ["will", "Will"]]);

/** Survival's total minus the save's, or 0 when Survival is not higher. */
export function elementalBalanceDifference(system, saveKey) {
  const survival = Number(system?.skills?.survival?.total ?? NaN);
  const save = Number(system?.combat?.saves?.[saveKey]?.total ?? NaN);
  if (!Number.isFinite(survival) || !Number.isFinite(save)) return 0;
  return Math.max(0, Math.trunc(survival - save));
}

const elementalBalance = {
  hint: "Free, when an Elemental save is called for: roll it at your Survival bonus if that is higher.",
  async use(actor) {
    const { line, postCard, chooseFromList, addPendingModifier } = helpers();
    const saveKey = await chooseFromList("Elemental Balance", "The saving throw against the Elemental effect", SAVE_KEYS);
    if (!saveKey) return;
    const label = SAVE_KEYS.find(([k]) => k === saveKey)?.[1] ?? saveKey;
    const diff = elementalBalanceDifference(actor.system, saveKey);
    if (!diff) {
      await postCard(actor, "Elemental Balance", [line(`Your ${label} save is already as good as your Survival — roll it as usual.`)]);
      return;
    }
    await addPendingModifier(actor, {
      value: diff, type: "untyped", label: "Elemental Balance (Survival)",
      scope: `Your next ${label} save, against an effect or spell with the Elemental trait — it is rolled at your Survival bonus`,
      oneShot: true, auto: true, checkTypes: ["save"]
    });
    await postCard(actor, "Elemental Balance", [
      line(`Survival replaces your ${label} save: <strong>+${diff}</strong> is queued for your next saving throw, so it is rolled at your Survival bonus.`),
      line("<em>Only against an effect or spell with the Elemental trait.</em>")
    ]);
  }
};

/** The round/turn stamp a once-a-turn limit is kept against. */
export function turnStamp(combat) {
  if (!combat?.started) return null;
  return `${combat.id}:${combat.round}:${combat.turn}`;
}

const stunningReflexes = {
  hint: "Free (0 AP), the first time a stun affects you each turn: a Stunned Manoeuvre (Mental Focus) check without spending your reaction.",
  async use(actor, item) {
    const { skillActions, resolveAction } = helpers();
    const stamp = turnStamp(game.combat);
    if (stamp && item.getFlag(MODULE_ID, "usedTurn") === stamp) {
      ui.notifications.warn("Stunning Reflexes: already used for a stun this turn.");
      return;
    }
    const action = skillActions.find((a) => a.key === "stunnedManoeuvre");
    if (!action) { ui.notifications.warn("Stunning Reflexes: Stunned Manoeuvre is not available."); return; }
    // STAMPED FIRST, so a second press while the dialog is open is refused;
    // TAKEN BACK when the core refuses or the dialog is cancelled (resolveAction
    // returns null), so a refusal does not use up the turn's stun (live, 0.1.0).
    if (stamp) await item.setFlag(MODULE_ID, "usedTurn", stamp);
    // THE ACTION ITSELF, AT NO COST: a copy whose cost is 0 AP, so neither
    // the reaction nor any AP is spent, and everything else (the Very Hard
    // DC, the outcome rows) is the core's own.
    const check = await resolveAction(actor, { ...action, apCost: "0", variantNote: "Stunning Reflexes: a free action, the first stun this turn." }, { invokedSkillKey: "mentalFocus" });
    if (!check && stamp && item.getFlag(MODULE_ID, "usedTurn") === stamp) await item.unsetFlag(MODULE_ID, "usedTurn");
  }
};

/* ------------------------------------------------------------------ */
/* Ancestral Guidance: offered on the card after the check              */
/* ------------------------------------------------------------------ */

export const ANCESTRAL_ACTIONS = Object.freeze(["recallKnowledge", "create"]);
const SUCCESSES = Object.freeze(["heroic", "critical", "success"]);
const PENDING_FLAG = "ancestralReroll";

/** Is this resolution one Ancestral Guidance may reroll? */
export function ancestralRerollOffered({ actionKey, degree, owned, conviction, pending }) {
  if (!owned || pending) return false;
  if (!ANCESTRAL_ACTIONS.includes(String(actionKey ?? ""))) return false;
  if (!degree || SUCCESSES.includes(String(degree))) return false;
  return Number(conviction) >= 1;
}

/** After the reroll: is the point spent? Only on a Success or better. */
export function ancestralPointSpent(degree) {
  return SUCCESSES.includes(String(degree ?? ""));
}

const ancestralGuidance = {
  hint: "After a Recall Knowledge or Create check below a Success, the card offers a reroll; conviction is spent only on a Success or better.",
  async use(actor) {
    const { line, postCard } = helpers();
    await postCard(actor, "Ancestral Guidance", [line("Roll Recall Knowledge or Create as usual. If the result is below a Success, the card that follows offers <strong>Ancestral Guidance — reroll</strong>.")]);
  }
};

/** trgPrimeActionResolved: settle a pending reroll, or offer one. */
export async function onActionResolved({ actor, action, degree, invokedSkillKey } = {}) {
  if (!actor?.isOwner || !owns(actor, "Ancestral Guidance")) return;
  const key = String(action?.key ?? "");
  if (!ANCESTRAL_ACTIONS.includes(key)) return;
  const { line, postCard } = helpers();
  const pending = actor.getFlag(MODULE_ID, PENDING_FLAG);
  if (pending && pending.actionKey === key) {
    // NOT YET KNOWN: a reroll whose DC the GM sets afterwards resolves with
    // no degree; the core resolves it again, with the degree, when the DC is
    // set (resumeActionOutcome). Settle then, not now (live, 0.1.0: the
    // point was declared unspent before the DC existed).
    if (!degree) return;
    await actor.unsetFlag(MODULE_ID, PENDING_FLAG);
    const spent = ancestralPointSpent(degree);
    if (spent) {
      const have = Number(actor.system?.resources?.conviction?.value ?? 0);
      await actor.update({ "system.resources.conviction.value": Math.max(0, have - 1) });
    }
    await postCard(actor, "Ancestral Guidance", [line(spent
      ? "Your ancestors' guidance held: a <strong>Success or better</strong>, and one point of conviction is spent."
      : "The reroll fell short: <strong>no conviction is spent</strong>.")]);
    return;
  }
  const conviction = Number(actor.system?.resources?.conviction?.value ?? 0);
  if (!ancestralRerollOffered({ actionKey: key, degree, owned: true, conviction, pending: Boolean(pending) })) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${actor.name}</span><h3>Ancestral Guidance</h3></div></header>`
      + `<p style="margin:2px 0">Call on your ancestors: reroll that ${action.name ?? key} check. A point of conviction is spent only if the new result is a Success or better.</p>`
      + `<p style="margin:6px 0 2px"><button type="button" data-it-action="ancestralReroll">Ancestral Guidance — reroll</button></p></div>`,
    flags: { [MODULE_ID]: { ancestralReroll: { actorUuid: actor.uuid, actionKey: key, invokedSkillKey: invokedSkillKey ?? null, used: false } } }
  });
}

/* ------------------------------------------------------------------ */
/* The card buttons                                                     */
/* ------------------------------------------------------------------ */

async function actorFrom(uuid) {
  const doc = await fromUuid(uuid).catch(() => null);
  return doc?.actor ?? doc ?? null;
}

async function pressPaidStrike(message, weaponId) {
  const raw = message.getFlag(MODULE_ID, "paidStrike");
  if (!raw || raw.used) return;
  const actor = await actorFrom(raw.actorUuid);
  const weapon = actor?.items?.get?.(weaponId);
  if (!actor || !weapon) { ui.notifications.warn("That creature or weapon is no longer there."); return; }
  await message.setFlag(MODULE_ID, "paidStrike", { ...raw, used: true });
  // PREDATOR'S MOMENTUM (Block 5): asked before the Pounce's Strike rolls.
  const { predatorsMomentumOptions } = await import("./block5-automations.mjs");
  const momentum = await predatorsMomentumOptions(actor);
  await helpers().rollWeaponAttack(actor, weapon, { apPaid: true, extraModifiers: [], ...momentum });
}

async function pressAncestralReroll(message) {
  const raw = message.getFlag(MODULE_ID, "ancestralReroll");
  if (!raw || raw.used) return;
  const actor = await actorFrom(raw.actorUuid);
  if (!actor) return;
  const { skillActions, resolveAction, line, postCard } = helpers();
  if (Number(actor.system?.resources?.conviction?.value ?? 0) < 1) { ui.notifications.warn("Ancestral Guidance: you need a point of conviction to call on."); return; }
  await message.setFlag(MODULE_ID, "ancestralReroll", { ...raw, used: true });
  await actor.setFlag(MODULE_ID, PENDING_FLAG, { actionKey: raw.actionKey });
  const action = skillActions.find((a) => a.key === raw.actionKey);
  if (raw.actionKey === "create" || !action) {
    // A Create check continues a project with its own setup; roll it again
    // from the project and the reroll is settled when it resolves.
    await postCard(actor, "Ancestral Guidance", [line("Roll the <strong>Create</strong> check again from your project. Conviction is spent only if it is a Success or better.")]);
    return;
  }
  // THE SAME CHECK, NO FURTHER AP: a copy of the action at 0 AP.
  await resolveAction(actor, { ...action, apCost: "0", variantNote: "Ancestral Guidance: a reroll." }, { invokedSkillKey: raw.invokedSkillKey });
}

/** renderChatMessageHTML: bind this module's buttons. */
export function bindCardButtons(message, html) {
  const flags = message?.flags?.[MODULE_ID];
  if (!flags) return;
  for (const button of html.querySelectorAll?.("[data-it-action]") ?? []) {
    if (button.dataset.itBound) continue;
    button.dataset.itBound = "true";
    const kind = button.dataset.itAction;
    const used = (kind === "paidStrike" && flags.paidStrike?.used) || (kind === "ancestralReroll" && flags.ancestralReroll?.used)
      || (kind === "resistDying" && flags.resistDying?.used)
      || (kind === "landHeldStrike" && flags.landHeldStrike?.used) || (kind === "shadowyStrike" && flags.shadowyStrike?.used);
    if (used) { button.disabled = true; continue; }
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      button.disabled = true;
      try {
        if (kind === "paidStrike") await pressPaidStrike(message, button.dataset.weapon);
        else if (kind === "ancestralReroll") await pressAncestralReroll(message);
        // A REFUSED PRESS LEAVES THE BUTTON LIVE (0.3.1; found live): no
        // reaction left, or a cancelled dialog, used nothing.
        else if (kind === "resistDying" && !(await pressResistDying(message))) button.disabled = false;
        // Inner Strike's type (0.4.1): pressed as often as wanted.
        // Block 4 (0.5.0): Black Lotus's held blow, Shadowy Step's Strike. A
        // refused press (not the owner) leaves the button live.
        else if (kind === "landHeldStrike" || kind === "shadowyStrike") {
          const b4 = await import("./block4-automations.mjs");
          const done = kind === "landHeldStrike" ? await b4.pressLandHeldStrike(message) : await b4.pressShadowyStrike(message);
          if (!done) button.disabled = false;
        }
        else if (kind === "innerStrikeType") {
          const { pressInnerStrikeType } = await import("./block3-automations.mjs");
          await pressInnerStrikeType(message, button.dataset.type);
          button.disabled = false;
        }
      } catch (err) {
        button.disabled = false;
        throw err;
      }
    });
  }
}

/* ------------------------------------------------------------------ */
/* The table                                                            */
/* ------------------------------------------------------------------ */

export const AUTOMATIONS = Object.freeze({
  "fluid form": fluidForm,
  "impact absorption": impactAbsorption,
  "predator's pounce": predatorsPounce,
  "wing burst": wingBurst,
  "living lantern": livingLantern,
  "natural chi": naturalChi,
  "spirit warrior": loreAlternative,
  "spiritwalker": loreAlternative,
  "elemental guardian": loreAlternative,
  "elemental harmonist": loreAlternative,
  "spirit stance": spiritStance,
  "elemental balance": elementalBalance,
  "stunning reflexes": stunningReflexes,
  "ancestral guidance": ancestralGuidance
});

/** Passive rows: the sheet's hint for items that work by themselves. */
export const PASSIVE_HINTS = Object.freeze({
  "spirit awareness": "Works automatically: +1 racial on Perception and Occultism aimed at a spirit or haunt; a tick otherwise.",
  "scaled hide": "Works automatically: Base DR 1.",
  "chitinous carapace": "Works automatically: Base DR 2.",
  "dragon-bound resolve": "Works automatically: +1 racial on saves against fear or a Wyrm's effects.",
  "compound eyes": "Offered: +1 racial on visual Perception checks (tick).",
  "treasure sense": "A tertiary sense, listed with your senses.",
  "martial affinity": "Works automatically while you are in a stance: +1 racial on attacks and +1 DB.",
  "centred cleansing": "Works automatically: advantage on Cleansing Trance.",
  "centred recovery": "Works automatically: your first Refocus each day is one degree better; your first Power Recovery doubles its PP.",
  "spatial balance": "Works automatically: advantage on Spatial Awareness.",
  "tranquil mind": "Works automatically while you are in a stance: advantage on saves against emotion and fear.",
  "ethereal sight": "Works automatically: magical Strikes affect the incorporeal normally; hidden targets' flat checks are 2 harder.",
  "zen awareness": "Works automatically: hidden or invisible targets' flat checks are 1 harder; advantage offered on locating them.",
  "artistic negotiation": "Encourage and Make an Impression are offered from Artistry.",
  "radiant insight": "Clear Mind is offered from Religion.",
  "spirit whisperer": "Gather Information is offered from Meditation."
});
