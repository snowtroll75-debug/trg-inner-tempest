/**
 * Inner Tempest Block 6 (0.7.0): what the last fourteen class feats of
 * Chapter 5 DO, beyond the data on their items.
 *
 * Built on TRG Prime 3.670.0 (Graham's rulings of 24 October 2026, B6-1 to
 * B6-10; docs/INNER_TEMPEST_BLOCK6_AUDIT.md). The core reads what a stance
 * declares on its effect, and 3.670.0 added the declarations these need:
 * a trait on every unarmed attack (Dragon's Sweep, Mantis's Deadly), a damage
 * type set rather than offered (Tiger, Wolf), bleeding raised (Tiger), a
 * longer Step (Tiger), the first square of difficult terrain (Dragon), Pack
 * Attack from an effect (Wolf), the first Move of a turn free of reactions
 * (Mantis), the 1-AP jump without its penalty (Monkey), a Strike counted
 * twice (Perfect Shot and Strike), a Feint met by an attack's total (Drunken
 * Strike), a feat opening a class's feats (Inner Magic) and Metamagic on an
 * innate spell (the Mystic). This file does the rest:
 *
 *   - the eight stances' Uses, each entered through the core's stance rules
 *     with its declarations on its effect, the Path checked where the book
 *     asks for one;
 *   - Drunken Strike, Perfect Shot and Perfect Strike;
 *   - Inner Magic's cantrip and Mystic Essence's spell, through Block 3's
 *     Path stamp;
 *   - Snake Stance's reaction, offered after a melee miss (TRG Prime's
 *     `trgPrimeStrikeResolved`);
 *   - Stunning Fist, called by Block 3's Flurry of Blows;
 *   - the Mystic's innate spells brought into step for B6-8.
 *
 * Elemental Fist is read by Block 3's Inner Strike.
 *
 * Pure decisions are exported and driven by tools/verify-block6.mjs; the
 * Foundry side reads `game.trgPrime.modules.helpers` at call time.
 */
import { helpers, spendAP, spendReaction, reactionOpen, firstTarget, missedHere, SYSTEM_ID, MODULE_ID } from "./automations.mjs";
import { SHARED, registerSharedOps } from "./block4-automations.mjs";
import {
  pathOf, techniqueAbility, techniqueSaveDC, mysticalPowerFits, pathStamp, isMystic,
  flurryWeaponsOf, spellIndex
} from "./block3-automations.mjs";

const { made, ownEffects, safeDelete, putEffect, untilEndOfTurn, card, confirm, actorFrom, targetOnly, meleeWeapons, pickWeapon, levelOf, offerTo, passive, esc, norm } = SHARED;
const h = () => helpers();

/* ------------------------------------------------------------------ */
/* The stances, as declarations                                         */
/* ------------------------------------------------------------------ */

/** The jumps a stance helps: TRG Prime's High Jump and Long Jump (Athletics). */
export const JUMP_ACTIONS = Object.freeze(["highJump", "longJump"]);

/**
 * The Monastic Path each stance asks for ("Prerequisites Devoted or Primal
 * Monastic Path"). A Path is not a feat, so the system's prerequisite reader
 * cannot see it; it is checked when the stance is entered, as Shadowy
 * Stance's is (Block 3).
 */
export const STANCE_PATHS = Object.freeze({
  "Crane Stance": Object.freeze(["Devoted", "Primal"]),
  "Dragon Stance": Object.freeze(["Primal", "Transcendent"]),
  "Drunken Stance": Object.freeze(["Devoted", "Primal"]),
  "Snake Stance": Object.freeze(["Devoted", "Illuminator"])
});

/** Why this Path cannot enter this stance, or "" when it may (or the stance asks for none). */
export function stancePathRefusal(stance, path) {
  const wanted = STANCE_PATHS[stance];
  if (!wanted) return "";
  if (path && wanted.some((p) => norm(p) === norm(path.name))) return "";
  return `${stance} needs the ${wanted.join(" or ")} Monastic Path${path ? ` (yours is ${path.name})` : " (choose yours first)"}.`;
}

/** A circumstance change, in the CUSTOM mode the system's stances write (it reaches the typed pool). */
const circ = (key, value) => ({ key, type: "custom", value: String(value) });

/** A jump bonus, applied for you on High Jump and Long Jump. */
const jumpRow = (value, label) => ({
  kind: "modifier", value, type: "circumstance", label, scope: "High Jump and Long Jump checks", auto: true, when: { actions: [...JUMP_ACTIONS] }
});

/**
 * Each stance's effect: what it changes, what it declares, and the line its
 * card adds. Pure, so the harness can hand every declaration to the
 * system's own readers.
 *
 * @param {string} stance the feat's name
 * @returns {{description: string, changes: object[], flags: object, lines: string[]}|null}
 */
export function stanceSpec(stance) {
  switch (stance) {
    case "Crane Stance": return {
      // "a +2-circumstance bonus to DB … reduce the difficulty for High Jump
      // and Long Jump (Athletics) checks by 5" — the jump DC is computed from
      // the distance, so a +5 on the check is the same arithmetic.
      description: "Crane Stance: +2 circumstance bonus to DB; +5 to High Jump and Long Jump checks (the difficulty reduced by 5).",
      changes: [circ("system.combat.defence.circumstance", 2)],
      flags: { conditionals: [jumpRow(5, "Crane Stance")] },
      lines: ["<strong>+2 circumstance</strong> to your DB, and <strong>+5</strong> on High Jump and Long Jump — applied for you."]
    };
    case "Dragon Stance": return {
      // B6-2: the Sweep is on your unarmed attacks.
      description: "Dragon Stance: +2 circumstance bonus to attack rolls; your unarmed attacks have the Sweep trait; the first square of difficult terrain on each Stride costs nothing extra.",
      changes: [circ("system.combat.attack.circumstance", 2)],
      flags: {
        weaponTraitGrants: [{ scope: "unarmed", trait: "Sweep", label: "Dragon Stance" }],
        ignoresFirstDifficultSquare: true
      },
      lines: ["<strong>+2 circumstance</strong> to your attack rolls; your fists, gauntlets and Monastic weapons have <strong>Sweep</strong>; on each Stride the first square of difficult terrain costs nothing extra."]
    };
    case "Drunken Stance": return {
      description: "Drunken Stance: +2 circumstance bonus to DB; Drunken Strike may be used.",
      changes: [circ("system.combat.defence.circumstance", 2)],
      flags: {},
      lines: ["<strong>+2 circumstance</strong> to your DB. <strong>Drunken Strike</strong> (your abilities) may be used while you hold the stance."]
    };
    case "Mantis Stance": return {
      // B6-4: the first Move action of each turn provokes nothing, by itself.
      description: "Mantis Stance: your unarmed attacks have the Deadly trait; +2 circumstance bonus to Reflex saves; the first Move action of each of your turns triggers no reactions.",
      changes: [circ("system.combat.saves.reflex.circumstance", 2)],
      flags: {
        weaponTraitGrants: [{ scope: "unarmed", trait: "Deadly", label: "Mantis Stance" }],
        firstMoveNoReactions: true
      },
      lines: ["Your fists, gauntlets and Monastic weapons have <strong>Deadly</strong>; <strong>+2 circumstance</strong> to Reflex saves; the first Move action of each of your turns triggers no reactions."]
    };
    case "Monkey Stance": return {
      // B6-5: "take no penalty for using these actions for 1 AP" — the 1-AP
      // jump's +2 to its DC is waived.
      description: "Monkey Stance: +2 circumstance bonus to Acrobatics and Climbing checks and to High Jump and Long Jump checks; a 1-AP High Jump or Long Jump carries no +2 to its DC.",
      changes: [circ("system.skills.acrobatics.circumstance", 2), circ("system.skills.climbing.circumstance", 2)],
      flags: {
        conditionals: [jumpRow(2, "Monkey Stance")],
        tradeoffWaivers: [{ actions: [...JUMP_ACTIONS], option: "forOneAp", label: "Monkey Stance" }]
      },
      lines: ["<strong>+2 circumstance</strong> to Acrobatics, Climbing, High Jump and Long Jump; a jump for 1 AP carries no +2 to its DC."]
    };
    case "Snake Stance": return {
      description: "Snake Stance: when a creature misses you with a melee Strike, you may use your reaction to make a melee Strike against it, ignoring your multiple attack penalty.",
      changes: [],
      flags: {},
      lines: ["When a creature misses you with a melee Strike, you are asked whether to strike back with your <strong>reaction</strong> (a melee Strike; no multiple attack penalty)."]
    };
    case "Tiger Stance": return {
      // B6-1: your unarmed attacks deal slashing, without asking.
      description: "Tiger Stance: your unarmed attacks deal slashing damage; bleeding you inflict is increased by 1; while your Speed is at least 20 feet, your Step is 10 feet.",
      changes: [],
      flags: {
        strikeTypeOption: { type: "slashing", label: "Tiger Stance", scope: ["unarmed-form"], replace: true },
        bleedBonus: { value: 1, label: "Tiger Stance" },
        stepFeet: { feet: 10, minSpeed: 20 }
      },
      lines: ["Your fists, gauntlets and Monastic weapons deal <strong>slashing</strong> damage; bleeding you inflict is <strong>+1</strong>; your Step is <strong>10 feet</strong> while your Speed is at least 20 feet."]
    };
    case "Wolf Stance": return {
      description: "Wolf Stance: your unarmed attacks deal piercing damage; you have Pack Attack (+1d6 precision damage when at least two allies threaten the target).",
      changes: [],
      flags: {
        strikeTypeOption: { type: "piercing", label: "Wolf Stance", scope: ["unarmed-form"], replace: true },
        creatureAbility: { derives: { packAttack: true } }
      },
      lines: ["Your fists, gauntlets and Monastic weapons deal <strong>piercing</strong> damage; <strong>Pack Attack</strong>: +1d6 precision when at least two of your allies threaten the target."]
    };
    default: return null;
  }
}

/** The eight stances, by name. */
export const BLOCK6_STANCES = Object.freeze(["Crane Stance", "Dragon Stance", "Drunken Stance", "Mantis Stance", "Monkey Stance", "Snake Stance", "Tiger Stance", "Wolf Stance"]);

/** Is a stance of this name up among these effects? */
export function stanceUp(effects = [], stance) {
  const want = norm(stance);
  return Array.from(effects ?? []).some((e) => !e?.disabled && e?.flags?.[SYSTEM_ID]?.featStance && norm(e.name) === want);
}

/* ------------------------------------------------------------------ */
/* Other pure decisions                                                 */
/* ------------------------------------------------------------------ */

/**
 * STUNNING FIST: "When you target the same creature with two Strikes from
 * your Flurry of Blows … If either Strike hits and deals damage". The
 * Flurry's later Strikes keep the first one's target (TRG Prime's strike
 * series), so two Strikes made are two at one creature.
 *
 * @param {Array} checks the series' checks, in order
 */
export function stunningFistApplies(checks = []) {
  const made2 = (checks ?? []).slice(0, 2).filter(Boolean);
  if (made2.length < 2) return false;
  // "If either Strike hits": the Flurry's two. Disciplined Flurry's third is
  // not one of them (found in review).
  return made2.some((c) => Boolean(c?.attackOutcome?.hits) && Number(c?.damageTaken) > 0);
}

/**
 * Stunning Fist's ladder: "must succeed at a Fortitude save … or be stunned
 * 1 (or stunned 3 on a fumble)". A Partial is not a success in TRG Prime, so
 * it stuns as a Failure does; a Blunder stuns 3, as a Fumble does (B6-6).
 */
export const STUNNING_FIST_LADDER = Object.freeze({
  save: "fortitude",
  outcomes: Object.freeze({ heroic: "unaffected.", critical: "unaffected.", success: "unaffected.", partial: "stunned 1.", failure: "stunned 1.", fumble: "stunned 3.", blunder: "stunned 3." }),
  conditions: Object.freeze({
    heroic: [], critical: [], success: [],
    partial: [{ key: "stunned", value: 1 }], failure: [{ key: "stunned", value: 1 }],
    fumble: [{ key: "stunned", value: 3 }], blunder: [{ key: "stunned", value: 3 }]
  })
});

/**
 * A ranged weapon, for Perfect Shot: TRG Prime's ranged modes, "missile" (a
 * bow) and "thrown" (a javelin). A melee weapon with the Thrown trait (a
 * dagger) is not offered: it is thrown only when its target is beyond
 * reach, so it is no ranged Strike for certain.
 */
export function isRangedWeapon(item) {
  return item?.type === "weapon" && ["missile", "thrown"].includes(norm(item.system?.attackMode));
}

/**
 * The spell a one-pick feat (Inner Magic, Mystic Essence) already granted,
 * or null: delete it and the feat may choose again.
 */
export function grantedSpellOf(items = [], featId = "") {
  return Array.from(items ?? []).find((i) => i?.type === "spell" && featId && i.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === featId) ?? null;
}

/**
 * A MYSTIC'S INNATE SPELLS IN STEP (B6-8): each Path-stamped spell (Mystical
 * Power's, Mystic Essence's, a discipline's) that is not a cantrip takes the
 * Mystic's Metamagic feats. The updates a Mystic's spells need, [] otherwise.
 */
export function innateMetamagicUpdates(items = []) {
  const list = Array.from(items ?? []);
  if (!isMystic(list)) return [];
  return list.filter((i) => i?.type === "spell" && i.system?.innate === true
      && i.flags?.[MODULE_ID]?.pathStamped
      && !(Math.trunc(Number(i.system?.ppCost) || 0) === 0 && /\bcantrip\b/i.test(String(i.system?.traits ?? "")))
      && i.flags?.[SYSTEM_ID]?.innateMetamagic !== true)
    .map((i) => ({ _id: i.id, [`flags.${SYSTEM_ID}.innateMetamagic`]: true }));
}

/* ------------------------------------------------------------------ */
/* The stances' Uses                                                    */
/* ------------------------------------------------------------------ */

function stanceUse(stance) {
  const spec = stanceSpec(stance);
  return {
    hint: `Stance (1 AP): ${spec.description.replace(/^[^:]+:\s*/, "")}`,
    async use(actor, item) {
      const refusal = stancePathRefusal(stance, pathOf(Array.from(actor.items ?? [])));
      if (refusal) { ui.notifications.warn(refusal); return false; }
      const fresh = stanceSpec(stance);
      return h().enterStance(actor, item, {
        name: stance,
        apCost: 1,
        description: fresh.description,
        changes: fresh.changes,
        flags: fresh.flags,
        extraLines: fresh.lines.map((l) => h().line(l))
      });
    }
  };
}

/* ------------------------------------------------------------------ */
/* Drunken Strike                                                       */
/* ------------------------------------------------------------------ */

const drunkenStrike = {
  hint: "Attack, Flourish (1 AP), in Drunken Stance: a melee Strike at −2; if it deals damage, its total stands as a Feint against the target.",
  async use(actor) {
    if (!stanceUp(actor.effects, "Drunken Stance")) { ui.notifications.warn("Drunken Strike: enter Drunken Stance first."); return false; }
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Drunken Strike: target the creature first."); return false; }
    const action = { key: "drunkenstrike", name: "Drunken Strike", traits: "Attack, Flourish" };
    if (!(await h().traitGate(actor, action, "Drunken Strike"))) return false;
    const weapon = await pickWeapon(actor, "Drunken Strike", meleeWeapons(actor));
    if (!weapon) return false;
    // The Strike's own 1 AP is the action's.
    const check = await h().rollWeaponAttack(actor, weapon, {
      skipTargetPrompt: true,
      extraModifiers: [{ label: "Drunken Strike", value: -2, type: "circumstance" }],
      optionLabel: "Drunken Strike"
    });
    if (!check) return false;
    await h().recordTraitUsage(actor, action);
    if (!(Number(check.damageTaken) > 0)) {
      await card(actor, "Drunken Strike", ["It dealt no damage, so it is no Feint."]);
      return true;
    }
    // B6-3: the attack's total stands as the Feint check, against the
    // target's own Feint DC; Feint's degrees apply.
    const feint = h().skillActions.find((a) => a.key === "feint");
    if (!feint || !targetOnly(target)) return true;
    await h().resolveAction(actor, { ...feint, apCost: "0", variantNote: "Drunken Strike: your attack total stands as the Feint check (no new roll)." },
      { presetDice: check.dice, presetModifiers: check.modifiers ?? [], event: { shiftKey: true } });
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Perfect Shot and Perfect Strike                                      */
/* ------------------------------------------------------------------ */

function perfectStrikeUse(name, { ranged }) {
  const word = ranged ? "ranged" : "melee";
  return {
    hint: `Attack, Flourish (2 AP): a ${word} Strike with advantage that counts as two attacks for your multiple attack penalty.`,
    async use(actor) {
      if (!firstTarget()) { ui.notifications.warn(`${name}: target the creature first.`); return false; }
      const action = { key: norm(name).replace(/\s+/g, ""), name, traits: "Attack, Flourish" };
      if (!(await h().traitGate(actor, action, name))) return false;
      const weapons = ranged
        ? Array.from(actor.items ?? []).filter((i) => isRangedWeapon(i) && (i.system?.equipped || i.system?.natural))
        : meleeWeapons(actor);
      const weapon = await pickWeapon(actor, name, weapons);
      if (!weapon) return false;
      if (game.combat?.started && Number(actor.system?.resources?.ap?.value ?? 0) < 2) { ui.notifications.warn(`${name}: 2 AP required.`); return false; }
      // "You gain advantage on the attack": spent by this Strike, and taken
      // away after it whatever happened.
      await putEffect(actor, "b6:perfect", made("b6:perfect", {
        name: `${name} (advantage)`,
        description: `${name}: advantage on this Strike.`,
        system: { conditionals: [{ kind: "advantage", label: name, scope: `This ${name}`, auto: true, oneShot: true, when: { checkTypes: ["attack"] } }] }
      }, untilEndOfTurn(actor)));
      let check = null;
      try {
        check = await h().rollWeaponAttack(actor, weapon, { apPaid: true, skipTargetPrompt: true, mapSteps: 2, optionLabel: name });
      } finally {
        const left = ownEffects(actor, "b6:perfect").map((e) => e.id);
        if (left.length) await safeDelete(actor, left);
      }
      if (!check) return false;
      await spendAP(actor, name, 2);
      await h().recordTraitUsage(actor, action);
      return true;
    }
  };
}

/* ------------------------------------------------------------------ */
/* Inner Magic and Mystic Essence                                       */
/* ------------------------------------------------------------------ */

const SLOT_WORDS = { cantrip: "a cantrip", eligible: "a spell whose base PP is no greater than your level" };

/** One spell of the Path's tradition, innate, stamped with the Path (Block 3's stamp). */
async function grantPathSpell(actor, item, { title, slot }) {
  const items = Array.from(actor.items ?? []);
  const path = pathOf(items);
  if (!path) { ui.notifications.warn(`${title}: choose your Monastic Path first (its Use button).`); return false; }
  const had = grantedSpellOf(items, item.id);
  if (had) {
    await card(actor, title, [`Already chosen: <strong>${esc(had.name)}</strong>. Delete that spell to choose again.`]);
    return false;
  }
  const level = levelOf(actor);
  const known = new Set(items.filter((i) => i.type === "spell").map((i) => norm(i.name)));
  const choices = (await spellIndex()).filter((e) => !known.has(norm(e.name)) && mysticalPowerFits(e.system, slot, { tradition: path.tradition, level }));
  if (!choices.length) { ui.notifications.warn(`${title}: no ${path.tradition} spell fits (${SLOT_WORDS[slot]}).`); return false; }
  const pick = await h().chooseFromList(`${title} — ${path.name}`, `Choose ${SLOT_WORDS[slot]} of the ${path.tradition} tradition`,
    choices.map((e) => [`${e.pack}|${e.id}`, `${e.name} (PP ${Number(e.system.ppCost) || 0})`]));
  if (!pick) return false;
  const [packId, docId] = String(pick).split("|");
  const doc = await game.packs.get(packId)?.getDocument(docId);
  if (!doc) return false;
  const data = doc.toObject();
  delete data._id;
  data.system.innate = true;
  data.system.prepared = true;
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: true });
  // A MYSTIC'S takes its Metamagic feats (B6-8); a cantrip never does.
  for (const [k, v] of Object.entries(pathStamp(path, 0, { metamagic: slot !== "cantrip" && isMystic(items) }))) foundry.utils.setProperty(data, k, v);
  await actor.createEmbeddedDocuments("Item", [data]);
  await card(actor, title, [
    `<strong>${esc(doc.name)}</strong> joins your innate repertoire: an innate spell with the Focus trait, cast as ${esc(path.tradition)} with ${esc(path.ability)}.`
  ]);
  return true;
}

const innerMagic = {
  hint: "Choose one cantrip of your Monastic Path's tradition: an innate spell with the Focus trait. Feats with the Mystic trait are open to you.",
  async use(actor, item) { return grantPathSpell(actor, item, { title: "Inner Magic", slot: "cantrip" }); }
};

const mysticEssence = {
  hint: "Choose one spell of your Monastic Path's tradition with base PP no greater than your level: an innate spell with the Focus trait.",
  async use(actor, item) { return grantPathSpell(actor, item, { title: "Mystic Essence", slot: "eligible" }); }
};

/* ------------------------------------------------------------------ */
/* Stunning Fist (called by Block 3's Flurry of Blows)                  */
/* ------------------------------------------------------------------ */

/**
 * After a Flurry: the save, when both Strikes were made and either hit and
 * dealt damage. Against the Technique DC, 10 + the Path's ability + level
 * (B6-6).
 */
export async function stunningFist(actor, checks = []) {
  if (!stunningFistApplies(checks)) return false;
  const target = firstTarget();
  if (!target || target === actor) return false;
  const ability = techniqueAbility(Array.from(actor.items ?? []), actor.system?.magic?.castingAbility);
  const dc = techniqueSaveDC(actor.system?.attributes?.[ability]?.total, actor.system?.identity?.level);
  const results = [];
  const lines = await h().runAreaEffect(actor, {
    save: STUNNING_FIST_LADDER.save, scope: "targets", dc,
    outcomes: { ...STUNNING_FIST_LADDER.outcomes }, conditions: { ...STUNNING_FIST_LADDER.conditions }
  }, { title: "Stunning Fist", results, targets: [target] });
  await h().postCard(actor, "Stunning Fist", [
    h().line(`Your Flurry struck home: <strong>${esc(target.name)}</strong> saves Fortitude against your Technique DC <strong>${dc}</strong>.`),
    ...(lines ?? [])
  ]);
  return true;
}

/* ------------------------------------------------------------------ */
/* Snake Stance's reaction (TRG Prime's trgPrimeStrikeResolved)         */
/* ------------------------------------------------------------------ */

/** B6-9: the Strike is an Attack reaction, so Battle Readiness's may take it. */
export const SNAKE_REACTION_TRAITS = "Attack, Stance";

export async function onStrikeResolvedB6(ctx = {}) {
  const { attacker, target, melee, held } = ctx;
  // A MISS, AS THE SYSTEM ANNOUNCES IT (TRG Prime 3.670.0's `missed`): an
  // attack resolved and not a hit. An attack never resolved, or a hit that
  // lands nothing (a grab), is no miss (found in review).
  if (!attacker || !target || !missedHere(ctx) || held || !melee) return;
  // "a target that misses you … with their own melee strike". A reaction's
  // miss counts too: the book excludes none.
  if (!stanceUp(target.effects, "Snake Stance")) return;
  if (!(await reactionOpen(target, "Snake Stance", { traits: SNAKE_REACTION_TRAITS }))) return;
  await offerTo(target, "b6SnakeStrike", { attackerUuid: attacker.uuid, attackerName: attacker.name });
}

/** Snake Stance, asked of the stance-holder's player. */
async function snakeStrikeOffer(actor, { attackerUuid, attackerName }) {
  const attacker = await actorFrom(attackerUuid);
  if (!attacker || !stanceUp(actor.effects, "Snake Stance")) return;
  // "a melee strike": any weapon in hand, the fists included (found in
  // review: it was the fists and Monastic weapons only, B6-1's reading).
  let weapons = meleeWeapons(actor);
  if (!weapons.length) weapons = (await flurryWeaponsOf(actor)).filter((w) => !isRangedWeapon(w));
  if (!weapons.length) return;
  const yes = await confirm(`Snake Stance — ${actor.name}`, `<p><strong>${esc(attackerName)}</strong> missed you. Use your <strong>reaction</strong> for a melee Strike against it, ignoring your multiple attack penalty?</p>`);
  if (!yes) return;
  const weapon = await pickWeapon(actor, "Snake Stance", weapons);
  if (!weapon) return;
  if (!(await spendReaction(actor, "Snake Stance", { traits: SNAKE_REACTION_TRAITS }))) return;
  targetOnly(attacker);
  await h().rollWeaponAttack(actor, weapon, { apPaid: true, isReaction: true, skipTargetPrompt: true, optionLabel: "Snake Stance" });
}

/* ------------------------------------------------------------------ */
/* Keeping a Mystic's spells in step                                    */
/* ------------------------------------------------------------------ */

/**
 * CHARACTERS MADE BEFORE 0.7.0 (B6-8): a Mystic's Path-stamped innate spells
 * take the Metamagic mark. Run by the acting GM at start-up, and when a
 * class arrives; nothing changes when nothing needs to.
 */
export async function reconcileB6Actor(actor) {
  if (!actor || actor.documentName !== "Actor") return;
  const updates = innateMetamagicUpdates(Array.from(actor.items ?? []));
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates);
}

/** createItem: a Mystic class arriving marks the spells already there. */
export async function onItemCreatedB6(item, options, userId) {
  if (userId !== game.user?.id) return;
  const actor = item?.parent;
  if (!actor || actor.documentName !== "Actor" || item.type !== "class") return;
  await reconcileB6Actor(actor);
}

/* ------------------------------------------------------------------ */
/* The table                                                            */
/* ------------------------------------------------------------------ */

registerSharedOps({ offers: { b6SnakeStrike: snakeStrikeOffer } });

export const BLOCK6_AUTOMATIONS = Object.freeze({
  ...Object.fromEntries(BLOCK6_STANCES.map((s) => [norm(s), stanceUse(s)])),
  "drunken strike": drunkenStrike,
  "perfect shot": perfectStrikeUse("Perfect Shot", { ranged: true }),
  "perfect strike": perfectStrikeUse("Perfect Strike", { ranged: false }),
  "inner magic": innerMagic,
  "mystic essence": mysticEssence,
  "elemental fist": passive("Read by Inner Strike: its types gain electricity (Air), bludgeoning (Earth), fire (Fire) and cold (Water), the element's trait on your attacks while it lasts."),
  "stunning fist": passive("Read by Flurry of Blows: when both Strikes are made at one creature and either deals damage, it saves Fortitude against your Technique DC or is stunned.")
});
