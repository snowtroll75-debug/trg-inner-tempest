/**
 * Inner Tempest's reactions to being attacked, offered before the roll.
 *
 * NEW at 0.3.2, on TRG Prime 3.666.1's defence offer (combat/defence-offer.mjs
 * in the system). Graham, 22 October 2026, of core's Nimble Dodge: "still
 * isn't giving any option for the player to use." Evade and Impact
 * Absorption had the same gap: both are declared "when you are targeted"
 * (Graham's ruling of 21 October 2026), and the attack is rolled on the
 * attacker's client, so the defender's player was never asked in time.
 *
 * Registered here, the system asks the defender's player before every attack
 * these answer, and a yes runs the module's own action on that player's
 * client: Evade's Acrobatics check against the Level DC, or Impact
 * Absorption's Use. Each spends its own reaction, as before.
 */
import { SKILL_ACTIONS } from "./skill-actions.mjs";
import { hasUse, helpers } from "./automations.mjs";
import { actionResolutionSettled } from "./skill-action-automations.mjs";

const norm = (v) => String(v ?? "").trim().toLowerCase();
const EVADE = SKILL_ACTIONS.find((a) => a.key === "evade");

/*
 * A FEAT OR AN ABILITY (0.3.3, found live). Impact Absorption is an ability
 * on the sheet (the Ryukari's racial ability), and the system's default
 * lookup finds feats only, so it was never offered. Both are read here by
 * name, as the system's Use does: abilities and feats share its table.
 */
const GRANTING_TYPES = Object.freeze(["feat", "ability"]);

/** The feat or ability of this name on the actor, or null. */
export function ownedByName(actor, name) {
  const need = norm(name);
  return Array.from(actor?.items ?? []).find((i) => GRANTING_TYPES.includes(i.type) && norm(i.name) === need) ?? null;
}

/** The Inner Discipline that opens Evade, or null. */
export function evadeOpenedBy(actor) {
  return ownedByName(actor, EVADE?.requiresFeat ?? "Inner Discipline");
}

export const DEFENCE_OFFERS = Object.freeze({
  Evade: {
    summary: "Acrobatics against your Level DC; the Bonus Check is a dodge bonus to your DB against this attack (spends your reaction).",
    against: "attack",
    find: (actor) => evadeOpenedBy(actor),
    // THE MODULE'S OWN ACTION, through the system's action workflow: the
    // registered record (traits, gates, the outcome automation) as the
    // sheet's Evade button runs it.
    //
    // AND WAITS FOR ITS OWN EFFECT (0.3.3, found live): the dodge is laid by
    // this module's resolution listener, which the system does not await, so
    // without the wait the attack read the DB before the +2 arrived.
    use: async (actor) => {
      const action = helpers().skillActions.find((a) => a.key === "evade") ?? EVADE;
      const result = await helpers().resolveAction(actor, action);
      await actionResolutionSettled(actor);
      return result;
    }
  },
  "Impact Absorption": {
    summary: "+1 Base DR (+2 with Bear's Endurance) against this physical attack (spends your reaction and a Focus use).",
    against: "weapon",
    find: (actor) => ownedByName(actor, "Impact Absorption"),
    requires: (actor, item) => (hasUse(item) ? null : "no uses remain — Refocus restores it")
  }
});
