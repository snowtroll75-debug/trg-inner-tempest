/**
 * Inner Tempest — Block 7 (0.8.0): the archetypes' Uses, reactions and
 * hooks. Built on TRG Prime 3.671.0 (C1–C16, docs/INNER_TEMPEST_BLOCK7_AUDIT.md)
 * and Graham's rulings B7-1 to B7-8 (docs/INNER_TEMPEST_RULINGS_2026-10-25.md).
 *
 * What the system reads off the items' own declarations (tools/content/
 * block7.mjs) needs nothing here: Brawler's fists, the class skills, Jade
 * Physician's and Iaijutsu Master's bonuses, Night Lotus's resistance,
 * Oathbound's katana, Zen Archer's bows, Veilborn's Refocus bonus, the
 * skill bonuses and the granted feats. Formbinder's second form, Steel
 * Disciple's stance and Veilborn's DB live with the forms and arts in
 * module/block4-automations.mjs.
 *
 * Pure decisions are exported and driven by tools/verify-block7.mjs; the
 * Foundry side reads `game.trgPrime.modules.helpers` at call time.
 */
import { helpers, spendAP, spendReaction, reactionOpen, hasUse, spendUse, firstTarget, SYSTEM_ID, MODULE_ID } from "./automations.mjs";
import {
  SHARED, registerSharedOps, challengeTarget, challengeOf, challengedUuid, grantAbility, artsOnOffer, inForm, activeForm,
  formItemUse, COMBAT_FORM_NAMES, GHOST_ART_LEVELS, fealtyChargeQuestion, asOwner
} from "./block4-automations.mjs";
import { pathOf, magicOf, techniqueAbility, spellIndex, stampOwedSpells, isCantripSpell } from "./block3-automations.mjs";
import { slowingChanges } from "./block5-automations.mjs";

const { ownedNamed, made, putEffect, untilNextTurn, untilEndOfNextTurn, card, focusReady, confirm, tokenOf, actorFrom, targetOnly,
  pickWeapon, levelOf, offerTo, esc, norm, int, ownEffects, safeDelete } = SHARED;
const h = () => helpers();

/* ------------------------------------------------------------------ */
/* Pure decisions                                                       */
/* ------------------------------------------------------------------ */

/**
 * HARMONY WARDEN (B7-4): the trance's spell. "any one PP 2 Verdant spell
 * which has the utility trait … At 5th level and every 5 levels thereafter
 * the PP of the spell increases by two" — a Verdant spell of the Utility
 * category, base PP up to 2, 4 at 5th, 6 at 10th.
 */
export function harmonyWardenCeiling(level) {
  return 2 + 2 * Math.floor(Math.max(0, int(level)) / 5);
}
export function harmonyWardenFits(spellSystem, level) {
  const traditions = String(spellSystem?.tradition ?? "").split(/[,;]/).map(norm);
  if (!(traditions.includes("verdant") || traditions.includes("all"))) return false;
  if (norm(spellSystem?.category) !== "utility") return false;
  if (spellSystem?.specialist === true) return false;
  const pp = Math.max(0, int(spellSystem?.ppCost));
  return pp <= harmonyWardenCeiling(level);
}

/** SHUGENJA: each element's traits, as the book's table prints them. */
export const SHUGENJA_ELEMENTS = Object.freeze({
  Air: Object.freeze(["Air", "Electricity"]),
  Earth: Object.freeze(["Acid", "Earth"]),
  Fire: Object.freeze(["Fire", "Light"]),
  Water: Object.freeze(["Cold", "Water"])
});
/** A spell the Shugenja may choose: any tradition, one of the element's traits, not a specialist spell (interpretation 1). */
export function shugenjaFits(spellSystem, element) {
  const want = (SHUGENJA_ELEMENTS[element] ?? []).map(norm);
  if (!want.length || spellSystem?.specialist === true) return false;
  const traits = String(spellSystem?.traits ?? "").split(/,\s*/).map(norm);
  return want.some((t) => traits.includes(t));
}

/**
 * LOTUS ENCHANTER, ONMYOJI NECROMANCER: "You may add all specialist spells
 * with the Enchantment [Soul] trait to the list of spells available when
 * selecting the Mystic Essence feat." The traits the owned archetypes open.
 */
export function essenceTraitsOf(items = []) {
  const out = new Set();
  for (const item of items ?? []) for (const t of item?.flags?.[SYSTEM_ID]?.itEssenceTraits ?? []) out.add(norm(t));
  return [...out];
}
/** Is this a specialist spell those traits open (base PP within Mystic Essence's limit)? */
export function essenceOpens(spellSystem, traits = [], level = 1) {
  if (spellSystem?.specialist !== true || !traits.length) return false;
  const have = String(spellSystem?.traits ?? "").split(/,\s*/).map(norm);
  if (!traits.some((t) => have.includes(t))) return false;
  return Math.max(0, int(spellSystem?.ppCost)) <= Math.max(0, int(level));
}
/** "+1 class bonus to its innate spell attack checks and save DCs" when the spell has one of those traits. */
export function essenceBonus(spellSystem, items = []) {
  const have = String(spellSystem?.traits ?? "").split(/,\s*/).map(norm);
  for (const item of items ?? []) {
    const opened = (item?.flags?.[SYSTEM_ID]?.itEssenceTraits ?? []).map(norm);
    if (opened.some((t) => have.includes(t))) return { attack: 1, dc: 1, type: "class", label: item.name };
  }
  return null;
}

/** A creature's traits as the system reads them: its trait line, its type, and what it was granted (creature-traits.mjs). */
export function creatureTraitLine(system = {}) {
  return [system?.details?.traits, system?.details?.creatureType, system?.details?.grantedTraits].map((v) => String(v ?? "")).filter(Boolean).join(", ");
}

/** RESTORATIVE PALM: "4 Hit Points per character level … Bleeding equal to 1 per two-character levels". */
export function restorativePalmHealing(level) { return 4 * Math.max(1, int(level)); }
export function restorativePalmBleeding(level) { return Math.max(1, Math.floor(Math.max(1, int(level)) / 2)); }
/** "It has no effect on Constructs, Undead or other creatures without a living anatomy." */
export function livingAnatomy(creatureTraits = "") {
  const t = String(creatureTraits ?? "").toLowerCase();
  return !/\b(construct|undead)\b/.test(t);
}

/**
 * NIGHT LOTUS VENOM: the ladder. A Partial is the Success row (IT-m24, the
 * book prints none); a Blunder is the Fumble row.
 */
export const NIGHT_LOTUS_LADDER = Object.freeze({
  save: "fortitude",
  outcomes: Object.freeze({
    critical: "unaffected.",
    success: "a −5-foot circumstance penalty to Speed until the beginning of the poisoner's next turn.",
    partial: "a −5-foot circumstance penalty to Speed until the beginning of the poisoner's next turn.",
    failure: "Slowed 1 until the end of its next turn.",
    fumble: "Paralyzed until the beginning of its next turn, and then Slowed 1 until the end of that turn."
  }),
  conditions: Object.freeze({
    critical: [], success: [], partial: [],
    failure: [{ key: "slowed", value: 1, rounds: 2 }],
    fumble: [{ key: "paralyzed", value: null, rounds: 1 }, { key: "slowed", value: 1, rounds: 2 }]
  })
});
/** The rungs that carry the Speed penalty. */
export const NIGHT_LOTUS_SPEED_RUNGS = Object.freeze(["success", "partial"]);

/** "You are wielding a piercing or slashing weapon, or a piece of ammunition." */
export function venomBearer(item) {
  if (!item) return false;
  if (item.type === "ammunition" || norm(item.system?.category) === "ammunition") return true;
  if (item.type !== "weapon" || !(item.system?.equipped || item.system?.natural)) return false;
  const type = norm(item.system?.damageType);
  if (["piercing", "slashing"].includes(type)) return true;
  // Versatile P or S is a piercing or slashing weapon too.
  return /\bversatile\s*[ps]\b/i.test(String(item.system?.traits ?? ""));
}

/** Is the coated thing ammunition (its venom rides a missile Strike)? */
export function venomAmmo(item) {
  return item?.type === "ammunition" || norm(item?.system?.category) === "ammunition";
}
/** Does this Strike's weapon carry the coating the effect records? */
export function venomRides(coating = {}, weapon = null) {
  if (!weapon) return false;
  if (coating.ammo) return norm(weapon.system?.attackMode) === "missile";
  return Boolean(coating.coatedId) && String(weapon.id ?? weapon._id ?? "") === String(coating.coatedId);
}

/** Drawn Verdict's sheathe at a turn's end: that combat, that combatant's turn, no Strike after it. */
export function sheatheOwed(dv, combat, combatant) {
  if (!dv || dv.further || !combat || !combatant) return false;
  return dv.combatId === combat.id && Boolean(dv.combatantId) && dv.combatantId === combatant.id;
}

/** A turn's key in a combat: the same turn reads the same. */
export function turnKeyOf(combat) {
  return combat ? `${combat.id}:${int(combat.round)}:${int(combat.turn)}` : null;
}

/** The Mystical Disciplines a Mystic may hold, as Block 3 names them. */
export const DISCIPLINE_NAMES = Object.freeze(["Inner Flame", "Dragon Soul", "Still Mind", "Starborn Flow", "Thousand Reflections"]);
/** "1: Fireball, 3: …" — the entries a discipline grants at one Mystic level. */
export function spellsAtLevel(grantedSpells = "", level = 1) {
  return String(grantedSpells ?? "").split(/,\s*/).map((e) => e.trim()).filter(Boolean)
    .map((e) => { const m = /^(\d+)\s*:\s*(.+)$/.exec(e); return m ? { level: int(m[1]), name: m[2].trim() } : { level: 1, name: e }; })
    .filter((e) => e.level === int(level)).map((e) => e.name);
}

/* ------------------------------------------------------------------ */
/* Small Foundry steps                                                  */
/* ------------------------------------------------------------------ */

/** A pack's documents of a type, the module's and the system's, by a flag predicate. */
async function abilitiesWhere(test) {
  const pack = game.trgPrime?.modules?.contentPack?.("abilities");
  if (!pack) return [];
  const docs = await pack.getDocuments();
  return docs.filter(test);
}

/** A spell index with what the Block 7 pickers read. */
async function spellIndexFull() {
  const out = [];
  for (const id of ["trg-prime.spells", `${MODULE_ID}.it-spells`]) {
    const pack = game.packs.get(id);
    if (!pack) continue;
    const index = await pack.getIndex({ fields: ["system.tradition", "system.ppCost", "system.traits", "system.category", "system.specialist"] });
    for (const e of index) out.push({ pack: id, id: e._id, name: e.name, system: e.system ?? {} });
  }
  return out.sort((a, b) => (int(a.system.ppCost) - int(b.system.ppCost)) || a.name.localeCompare(b.name));
}

/** A spell's data from an index entry, ready to grant. */
async function spellData(entry) {
  const doc = await game.packs.get(entry.pack)?.getDocument(entry.id);
  if (!doc) return null;
  const data = doc.toObject();
  delete data._id;
  return data;
}

/** The traits with Focus added, as the system's granted Focus innate spells carry it. */
const withFocus = (traits) => (/\bfocus\b/i.test(String(traits ?? "")) ? String(traits ?? "") : [String(traits ?? "").trim(), "Focus"].filter(Boolean).join(", "));

const dayKey = () => String(Math.floor(Number(game.time?.worldTime ?? 0) / 86400));

/* ------------------------------------------------------------------ */
/* Harmony Warden                                                       */
/* ------------------------------------------------------------------ */

const harmonyWarden = {
  hint: "Once a day: a 10-minute trance, then a Verdant Utility spell (base PP 2, +2 at 5th and every 5 levels) cast as an innate spell.",
  async use(actor, item) {
    if (item.getFlag(MODULE_ID, "tranceUsed")) { ui.notifications.warn("Harmony Warden: the trance is used until your next daily preparation."); return false; }
    const level = levelOf(actor);
    const ceiling = harmonyWardenCeiling(level);
    const known = (await spellIndexFull()).filter((e) => harmonyWardenFits(e.system, level));
    if (!known.length) { ui.notifications.warn("Harmony Warden: no Verdant Utility spell fits."); return false; }
    const pick = await h().chooseFromList("Harmony Warden — trance (10 minutes)", `Cast one Verdant Utility spell, base PP up to ${ceiling}, as an innate spell`,
      known.map((e) => [`${e.pack}|${e.id}`, `${e.name} (PP ${int(e.system.ppCost)})`]));
    if (!pick) return false;
    const [pack, id] = String(pick).split("|");
    const data = await spellData({ pack, id });
    if (!data) return false;
    const items = Array.from(actor.items ?? []);
    const magic = magicOf(items);
    const ability = magic?.ability ?? techniqueAbility(items, actor.system?.magic?.castingAbility);
    const cast = await h().castInnateOnce(actor, data, { ability, tradition: "verdant" });
    // A REFUSED CAST (the innate limit, a cancelled dialog) keeps the trance.
    if (cast === null || cast === undefined || cast === false) return false;
    await item.setFlag(MODULE_ID, "tranceUsed", dayKey());
    await card(actor, "Harmony Warden", [`After ten minutes' trance you cast <strong>${esc(data.name)}</strong> as an innate spell (verdant, with ${esc(ability)}).`, "<em>The trance is used until your next daily preparation.</em>"]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Iaijutsu Master: Drawn Verdict                                       */
/* ------------------------------------------------------------------ */

/** The Strike Drawn Verdict is making, so its resolution can be read back. */
let drawnVerdictStrike = null;

const drawnVerdict = {
  hint: "1 AP, with your Challenge on the target, a sword sheathed and the target in reach: draw and Strike; it cannot react, and on damage loses its reactions until its next turn.",
  async use(actor, item) {
    const ch = challengeOf(actor);
    const target = ch ? await actorFrom(challengedUuid(actor)) : null;
    if (!target) { ui.notifications.warn("Drawn Verdict: your Challenge must be active on a creature."); return false; }
    const sheathed = await h().sheathedWeapons(actor, "sword");
    if (!sheathed.length) { ui.notifications.warn("Drawn Verdict: you need a sword sheathed (carried, not wielded)."); return false; }
    const action = { key: "drawnverdict", name: "Drawn Verdict", traits: item.system?.traits ?? "Attack, Flourish, Focus, Technique" };
    if (!(await h().traitGate(actor, action, "Drawn Verdict"))) return false;
    if (!(await focusReady(item, "Drawn Verdict"))) return false;
    const sword = await pickWeapon(actor, "Drawn Verdict", sheathed);
    if (!sword) return false;
    const mine = tokenOf(actor), theirs = tokenOf(target);
    if (mine && theirs) {
      const reach = Number(sword.system?.reachFeet) || (/\breach\b/i.test(String(sword.system?.traits ?? "")) ? 10 : 5);
      const distance = Number(await h().distanceBetween(mine, theirs));
      if (Number.isFinite(distance) && distance > reach) { ui.notifications.warn(`Drawn Verdict: ${target.name} is not within your sword's reach (${reach} ft).`); return false; }
    }
    // THE AP AND THE USE ARE SPENT ON A STRIKE MADE (as Perfect Shot's):
    // a cancelled attack dialog puts the sword back and costs nothing.
    if (game.combat?.started && Number(actor.system?.resources?.ap?.value ?? 0) < 1) { ui.notifications.warn("Drawn Verdict: 1 AP required."); return false; }
    await sword.update({ "system.equipped": true });
    targetOnly(target);
    drawnVerdictStrike = { attackerUuid: actor.uuid, targetUuid: target.uuid, damage: 0, resolved: false };
    let check = null, done = null;
    try {
      check = await h().rollWeaponAttack(actor, sword, { apPaid: true, skipTargetPrompt: true, noReactions: true, optionLabel: "Drawn Verdict" });
    } finally {
      done = drawnVerdictStrike;
      drawnVerdictStrike = null;
    }
    if (!check) { await sword.update({ "system.equipped": false }); return false; }
    await spendAP(actor, "Drawn Verdict", 1);
    await spendUse(item, "Drawn Verdict");
    await h().recordTraitUsage(actor, action);
    const lines = [`You draw <strong>${esc(sword.name)}</strong> and strike <strong>${esc(target.name)}</strong>: it may use no reaction triggered by the draw or the Strike.`];
    if (done?.damage > 0) {
      await h().createEffectsOn(target, [made("drawnVerdictNoReactions", {
        name: "Drawn Verdict: no reactions", description: `Drawn Verdict (${actor.name}): this creature cannot use reactions until the beginning of its next turn.`,
        system: { noReactions: true }, img: item.img
      }, untilNextTurn(target))]);
      lines.push(`It took damage: <strong>${esc(target.name)} cannot use reactions</strong> until the beginning of its next turn.`);
    }
    const combat = game.combat?.started ? game.combat : null;
    if (combat) await actor.setFlag(MODULE_ID, "drawnVerdict", { turn: turnKeyOf(combat), combatId: combat.id, combatantId: combat.combatant?.id ?? null, weaponId: sword.id, further: false });
    lines.push("<em>1 AP and Drawn Verdict's use spent. At the end of your turn, if you made no further Strike, you are asked whether to sheathe it.</em>");
    await card(actor, "Drawn Verdict", lines);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Jade Physician: Restorative Palm                                     */
/* ------------------------------------------------------------------ */

const restorativePalm = {
  hint: "2 AP, touch a living creature other than you: 4 HP per level, or Bleeding −1 per two levels, or a new save against one poison or disease; then it is immune for 1 hour.",
  async use(actor, item) {
    const target = firstTarget();
    if (!target || target === actor) { ui.notifications.warn("Restorative Palm: target a creature other than yourself, within reach."); return false; }
    if (!livingAnatomy(creatureTraitLine(target.system))) { ui.notifications.warn(`Restorative Palm: ${target.name} has no living anatomy (construct or undead).`); return false; }
    const mine = tokenOf(actor), theirs = tokenOf(target);
    if (mine && theirs && Number(await h().distanceBetween(mine, theirs)) > 5) { ui.notifications.warn("Restorative Palm: the target must be within touch (5 feet)."); return false; }
    const immune = await h().temporaryImmunityRefusal(target, "Restorative Palm");
    if (immune) { ui.notifications.warn(`Restorative Palm: ${immune}`); return false; }
    if (!(await focusReady(item, "Restorative Palm"))) return false;
    const level = levelOf(actor);
    const afflictions = Array.from(target.items ?? []).filter((i) => i.type === "affliction" && /\b(poison|disease)\b/i.test(String(i.system?.traits ?? "")));
    const bleeding = Number(target.getConditionValue?.("bleeding") ?? 0);
    const options = [["heal", `Restore ${restorativePalmHealing(level)} Hit Points`]];
    if (bleeding > 0) options.push(["bleed", `Stop ${restorativePalmBleeding(level)} Bleeding (it has ${bleeding})`]);
    for (const a of afflictions) options.push([`aff|${a.id}`, `A new save against ${a.name}`]);
    const pick = await h().chooseFromList("Restorative Palm", `${target.name}: choose what the palm restores (2 AP)`, options);
    if (!pick) return false;
    if (!(await spendAP(actor, "Restorative Palm", 2))) return false;
    if (!(await spendUse(item, "Restorative Palm"))) return false;
    // ON THE TARGET'S OWNER (usually another player's character): the
    // Bleeding, the affliction's save and the hour's immunity are writes to
    // it, made where they are allowed — here when this user owns it,
    // otherwise by the acting GM, who posts the card.
    await asOwner(target, "b7Palm", { healerUuid: actor.uuid, pick, level });
    return true;
  }
};

/** Restorative Palm's effect, run by whoever may write to the target. */
async function palmOnTarget(target, { healerUuid, pick, level }) {
  const healer = await actorFrom(healerUuid);
  const lines = [];
  if (pick === "heal") {
    await h().healActor(target, restorativePalmHealing(level), { magical: false });
    lines.push(`<strong>${esc(target.name)}</strong> regains <strong>${restorativePalmHealing(level)} Hit Points</strong> (4 per level).`);
  } else if (pick === "bleed") {
    const r = await h().reduceCondition(target, "bleeding", restorativePalmBleeding(level));
    lines.push(`<strong>${esc(target.name)}</strong>'s Bleeding falls from ${r.from} to <strong>${r.to}</strong>.`);
  } else {
    const aff = target.items.get(String(pick).split("|")[1]);
    if (aff) {
      const result = await h().rollAfflictionSave(target, aff);
      lines.push(result?.ended ? `${esc(aff.name)} ends.` : result ? `${esc(aff.name)}: now stage ${int(result.stage)}.` : `${esc(aff.name)} is still incubating: no save yet.`);
    }
  }
  await h().grantTemporaryImmunity(target, "Restorative Palm", 3600);
  lines.push(`<em>Martial, not magical. ${esc(target.name)} is immune to Restorative Palm for 1 hour. 2 AP and its use spent.</em>`);
  await card(healer ?? target, "Restorative Palm", lines);
}

/* ------------------------------------------------------------------ */
/* Night Lotus: Night Lotus Venom                                       */
/* ------------------------------------------------------------------ */

const nightLotusVenom = {
  hint: "1 AP with a piercing or slashing weapon (or ammunition): coat it until the end of your next turn or the first damage. Fortitude against your Level DC.",
  async use(actor, item) {
    const weapons = Array.from(actor.items ?? []).filter((i) => venomBearer(i));
    if (!weapons.length) { ui.notifications.warn("Night Lotus Venom: wield a piercing or slashing weapon, or hold ammunition."); return false; }
    const action = { key: "nightlotusvenom", name: "Night Lotus Venom", traits: item.system?.traits ?? "Focus, Manipulate, Poison, Technique" };
    if (!(await h().traitGate(actor, action, "Night Lotus Venom"))) return false;
    if (!(await focusReady(item, "Night Lotus Venom"))) return false;
    // THE COATED THING: the venom rides that weapon (or that ammunition's
    // Strikes), not every Strike you make.
    const coated = await pickWeapon(actor, "Night Lotus Venom", weapons);
    if (!coated) return false;
    if (!(await spendAP(actor, "Night Lotus Venom", 1))) return false;
    if (!(await spendUse(item, "Night Lotus Venom"))) return false;
    await putEffect(actor, "nightLotusVenom", made("nightLotusVenom", {
      name: "Night Lotus Venom (coated)", description: "Night Lotus Venom: the next creature your coated weapon damages saves Fortitude against your Level DC. Lasts until the end of your next turn.",
      module: { nightLotus: true, coatedId: coated.id, coatedName: coated.name, ammo: venomAmmo(coated) }, img: item.img
    }, untilEndOfNextTurn(actor)));
    await h().recordTraitUsage(actor, action);
    await card(actor, "Night Lotus Venom", [`You coat <strong>${esc(coated.name)}</strong> with a fast-acting paralysing toxin, until the end of your next turn or until it damages a creature.`, "<em>1 AP and its use spent.</em>"]);
    return true;
  }
};

/** The last Unseen Assault each attacker dealt, by target, for Night Lotus Venom's −1. */
const ambushes = new Map();
export function onAmbushDealtB7({ actor, target } = {}) {
  if (actor && target) ambushes.set(`${actor.uuid}>${target.uuid}`, Date.now());
}

async function deliverNightLotus(attacker, target, weapon) {
  const fx = ownEffects(attacker, "nightLotusVenom").find((e) => !e.disabled && venomRides(e.flags?.[MODULE_ID] ?? {}, weapon));
  if (!fx) return;
  const key = `${attacker.uuid}>${target.uuid}`;
  const unseen = Date.now() - (ambushes.get(key) ?? 0) < 15000;
  ambushes.delete(key);
  const dc = h().levelDC(levelOf(attacker)) + (unseen ? 1 : 0);
  const results = [];
  const lines = await h().runAreaEffect(attacker, {
    save: NIGHT_LOTUS_LADDER.save, scope: "targets", dc,
    outcomes: { ...NIGHT_LOTUS_LADDER.outcomes }, conditions: { ...NIGHT_LOTUS_LADDER.conditions }
  }, { title: "Night Lotus Venom", results, targets: [target] }) ?? [];
  const degree = norm(results[0]?.degree);
  const extra = [];
  if (NIGHT_LOTUS_SPEED_RUNGS.includes(degree)) {
    const { changes } = slowingChanges(5, 0);
    await h().createEffectsOn(target, [made("nightLotusSlow", {
      name: "Night Lotus Venom: −5 ft Speed", description: `Night Lotus Venom (${attacker.name}): a −5-foot circumstance penalty to Speed until the beginning of ${attacker.name}'s next turn.`, changes
    }, untilNextTurn(attacker))]);
    extra.push(`${esc(target.name)}: −5 ft Speed until the beginning of your next turn.`);
  }
  await safeDelete(attacker, [fx.id]);
  await h().postCard(attacker, "Night Lotus Venom", [h().line(`Your venom reaches <strong>${esc(target.name)}</strong>${unseen ? " (Unseen Assault: −1 to its save, as the DC's +1)" : ""}; the coating is spent.`), ...lines, ...extra.map((l) => h().line(l))]);
}

/* ------------------------------------------------------------------ */
/* Oathbound and Ronin                                                  */
/* ------------------------------------------------------------------ */

const boundChallenge = {
  hint: "Flourish (1 AP) and a conviction point: challenge a creature you can see, as the Oathblade's Challenge.",
  async use(actor, item) {
    const target = firstTarget();
    if (!target || target === actor) { ui.notifications.warn("Bound Challenge: target the creature you challenge first."); return false; }
    const action = { key: "boundchallenge", name: "Bound Challenge", traits: item.system?.traits ?? "Flourish, Mental" };
    if (!(await h().traitGate(actor, action, "Bound Challenge"))) return false;
    const done = await challengeTarget(actor, target, { spend: "conviction", label: "Bound Challenge", item });
    if (done) await h().recordTraitUsage(actor, action);
    return done;
  }
};

/** The four Sworn Oaths, as Block 4 names them. */
export const OATH_NAMES = Object.freeze(["Oath of Honour", "Oath of Guardianship", "Oath of Vengeance", "Oath of Fealty"]);

async function chooseCreed(actor, item) {
  const current = Array.from(actor.items ?? []).filter((i) => i.flags?.[SYSTEM_ID]?.itOath);
  const pick = await h().chooseFromList("Wandering Creed", `Your Sworn Oath until your next daily preparation${current.length ? ` (now ${current.map((i) => i.name).join(", ")})` : ""}`,
    OATH_NAMES.map((n) => [n, n]));
  if (!pick) return false;
  if (current.length === 1 && norm(current[0].name) === norm(pick)) {
    await card(actor, "Wandering Creed", [`You keep <strong>${esc(pick)}</strong>.`]);
    if (current[0].flags?.[SYSTEM_ID]?.itOath === "Oath of Fealty") await fealtyChargeQuestion(actor, current[0]);
    return true;
  }
  if (current.length) await actor.deleteEmbeddedDocuments("Item", current.map((i) => i.id));
  // GRANTED AS SWORN OATH'S CHOICE where the Oathblade has it, so Sworn
  // Oath reads as answered ("Chosen: …") and its Use grants no second oath
  // beside this one; the oath leaves with it, as a chosen one does.
  const granted = await grantAbility(actor, ownedNamed(actor, "Sworn Oath") ?? item, pick, "Oathblade");
  if (!granted) return false;
  await card(actor, "Wandering Creed", [`Your Sworn Oath until your next daily preparation is <strong>${esc(pick)}</strong>. One oath at a time; no narrative change is needed.`]);
  // OATH OF FEALTY names its Sworn Charge now (Block 4's daily question,
  // asked here for a Ronin, after the oath it is about).
  if (granted.flags?.[SYSTEM_ID]?.itOath === "Oath of Fealty") await fealtyChargeQuestion(actor, granted);
  return true;
}

const wanderingCreed = {
  hint: "Choose your Sworn Oath until your next daily preparation (asked at each daily preparation).",
  async use(actor, item) { return chooseCreed(actor, item); }
};

const turningTheBlade = SHARED.passive("Offered when a creature other than your challenged target damages you with a Strike: your reaction moves your Challenge to it, free.");

async function turningBladeOffer(actor, { sourceUuid, sourceName }) {
  const item = ownedNamed(actor, "Turning the Blade");
  const source = await actorFrom(sourceUuid);
  if (!item || !source || !challengeOf(actor)) return;
  const traits = item.system?.traits ?? "Flourish, Mental, Technique";
  const action = { key: "turningtheblade", name: "Turning the Blade", traits };
  const quiet = await h().traitCheck(actor, action);
  if (quiet?.blocked) return;
  const yes = await confirm(`Turning the Blade — ${actor.name}`, `<p><strong>${esc(sourceName)}</strong> struck you. Use <strong>Turning the Blade</strong> (your reaction): your Challenge ends and ${esc(sourceName)} becomes your challenged target, with your Sworn Oath, at no cost?</p>`);
  if (!yes || !(await spendReaction(actor, "Turning the Blade", { traits }))) return;
  const done = await challengeTarget(actor, source, { apCost: 0, spend: "none", label: "Turning the Blade", item });
  if (done) await h().recordTraitUsage(actor, action);
}

/* ------------------------------------------------------------------ */
/* Inner Adept and Steel Disciple: the class skill, and the choice      */
/* ------------------------------------------------------------------ */

/** The class's own tradition, when it has one (a Kensai's chosen one, a core caster's). */
function classTradition(actor) {
  const items = Array.from(actor.items ?? []);
  for (const i of items) { const t = i.flags?.[SYSTEM_ID]?.itTradition; if (t?.tradition) return norm(t.tradition); }
  return norm(actor.system?.magic?.tradition ?? "");
}

const innerAdept = {
  hint: "Choose your class skill (Meditation or Mental Focus) and a Monastic Path for your innate spells and magical techniques.",
  async use(actor, item) {
    const skillFlag = actor.getFlag(SYSTEM_ID, "itInnerAdeptSkill");
    if (!skillFlag?.skill) {
      await h().useClassSkillGrant(actor, item);
      if (!actor.getFlag(SYSTEM_ID, "itInnerAdeptSkill")?.skill) return false;
    }
    if (item.flags?.[SYSTEM_ID]?.itPath?.tradition) { await card(actor, "Inner Adept", [`Your Monastic Path is <strong>${esc(item.flags[SYSTEM_ID].itPath.name)}</strong>.`]); return false; }
    const paths = (await abilitiesWhere((d) => d.flags?.[SYSTEM_ID]?.itPath?.tradition)).map((d) => ({ name: d.name, ...d.flags[SYSTEM_ID].itPath }));
    const mine = classTradition(actor);
    const offer = paths.filter((p) => !mine || norm(p.tradition) === mine);
    if (!offer.length) { ui.notifications.warn(`Inner Adept: no Monastic Path is of your tradition (${mine}).`); return false; }
    const pick = await h().chooseFromList("Inner Adept", `Choose a Monastic Path${mine ? ` of your tradition (${mine})` : ""}`, offer.map((p) => [p.name, `${p.name} (${p.tradition}, ${p.ability})`]));
    const p = offer.find((x) => x.name === pick);
    if (!p) return false;
    // ITS TRADITION AND ABILITY, NOT ITS CLASS SKILL ("you do not gain the
    // path's class skill"): recorded on this feat, where Block 3's `pathOf`
    // reads a Path.
    await item.update({ [`flags.${SYSTEM_ID}.itPath`]: { name: p.name, tradition: p.tradition, ability: p.ability, skill: "" } });
    await stampOwedSpells(actor);
    await card(actor, "Inner Adept", [`Your Monastic Path is <strong>${esc(p.name)}</strong>: your innate spells and magical techniques use ${esc(p.tradition)} with ${esc(p.ability)}. You do not gain its class skill.`]);
    return true;
  }
};

const steelDisciple = {
  hint: "Choose your class skill (Acrobatics, Athletics, Meditation or Mental Focus) and one Kensai Combat Form, used as a stance.",
  async use(actor, item) {
    if (!actor.getFlag(SYSTEM_ID, "itSteelDiscipleSkill")?.skill) {
      await h().useClassSkillGrant(actor, item);
      if (!actor.getFlag(SYSTEM_ID, "itSteelDiscipleSkill")?.skill) return false;
    }
    const had = Array.from(actor.items ?? []).find((i) => i.flags?.[SYSTEM_ID]?.itFormExtra === "Steel Disciple");
    if (had) { await card(actor, "Steel Disciple", [`Your form is <strong>${esc(had.name)}</strong>: press its Use to enter it as a stance (1 AP).`]); return false; }
    const known = new Set(Array.from(actor.items ?? []).map((i) => norm(i.name)));
    const offer = COMBAT_FORM_NAMES.filter((n) => !known.has(norm(n)));
    const pick = await h().chooseFromList("Steel Disciple", "Choose one Kensai Combat Form, to use as a stance", offer.map((n) => [n, n]));
    if (!pick) return false;
    const granted = await grantAbility(actor, item, pick, "Kensai");
    if (!granted) return false;
    await granted.update({ [`flags.${SYSTEM_ID}.itFormExtra`]: "Steel Disciple" });
    await card(actor, "Steel Disciple", [`You learn <strong>${esc(pick)}</strong>. Press its Use to enter it as a stance: 1 AP, under the system's stance rules; no Combat Form is expended.`]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Shugenja                                                             */
/* ------------------------------------------------------------------ */

async function shugenjaPicks(actor, item) {
  const element = item.getFlag(MODULE_ID, "element");
  if (!element) return false;
  const old = Array.from(actor.items ?? []).filter((i) => i.type === "spell" && i.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === item.id);
  if (old.length) await actor.deleteEmbeddedDocuments("Item", old.map((i) => i.id));
  const known = new Set(Array.from(actor.items ?? []).filter((i) => i.type === "spell").map((i) => norm(i.name)));
  const pool = (await spellIndexFull()).filter((e) => shugenjaFits(e.system, element) && !known.has(norm(e.name)));
  if (!pool.length) { ui.notifications.warn(`Shugenja: no ${element} spell is available.`); return false; }
  const chosen = [];
  for (let n = 1; n <= 2; n += 1) {
    const left = pool.filter((e) => !chosen.some((c) => c.id === e.id));
    const pick = await h().chooseFromList(`Shugenja — ${element}`, `Today's spell ${n} of 2 (${SHUGENJA_ELEMENTS[element].join(" or ")} trait)`, left.map((e) => [`${e.pack}|${e.id}`, `${e.name} (PP ${int(e.system.ppCost)})`]));
    if (!pick) break;
    const [pack, id] = String(pick).split("|");
    chosen.push({ pack, id });
  }
  const datas = [];
  for (const c of chosen) {
    const data = await spellData(c);
    if (!data) continue;
    data.system.innate = true;
    data.system.prepared = true;
    data.system.traits = withFocus(data.system.traits);
    foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: true });
    foundry.utils.setProperty(data, `flags.${MODULE_ID}.shugenjaDay`, dayKey());
    datas.push(data);
  }
  if (datas.length) await actor.createEmbeddedDocuments("Item", datas);
  await card(actor, "Shugenja", [datas.length ? `Until your next daily preparation: <strong>${datas.map((d) => esc(d.name)).join("</strong> and <strong>")}</strong>, innate spells with the Focus trait.` : "No spell chosen today."]);
  return datas.length > 0;
}

const shugenja = {
  hint: "Choose your element once; at each daily preparation, two spells with its traits, innate with the Focus trait.",
  async use(actor, item) {
    if (!item.getFlag(MODULE_ID, "element")) {
      const pick = await h().chooseFromList("Shugenja", "Choose your element (once)", Object.keys(SHUGENJA_ELEMENTS).map((e) => [e, `${e} (${SHUGENJA_ELEMENTS[e].join(", ")})`]));
      if (!pick) return false;
      await item.setFlag(MODULE_ID, "element", pick);
    }
    const today = Array.from(actor.items ?? []).filter((i) => i.type === "spell" && i.flags?.[SYSTEM_ID]?.grantedBy?.sourceId === item.id);
    if (today.length) { await card(actor, "Shugenja", [`Today's spells: <strong>${today.map((s) => esc(s.name)).join("</strong> and <strong>")}</strong>. They change at your next daily preparation.`]); return false; }
    return shugenjaPicks(actor, item);
  }
};

/* ------------------------------------------------------------------ */
/* Soul Weapon Master                                                   */
/* ------------------------------------------------------------------ */

/** The declarations a bond writes on the archetype item, for one weapon. */
export function soulBondFlags(weaponId) {
  return {
    unarmedAbilityWeapons: { itemIds: [weaponId] },
    weaponScaling: { itemId: weaponId, perBAB: { every: 3, value: 1 }, countsAs: { magical: 3, "cold iron": 8, silver: 8, adamantine: 16 }, label: "Soul-Bound Weapon" }
  };
}

async function bondWeapon(actor, item) {
  const bondedId = item.flags?.[SYSTEM_ID]?.weaponScaling?.itemId ?? null;
  const bonded = bondedId ? actor.items.get(bondedId) : null;
  if (bonded) { await card(actor, "Soul Weapon Master", [`Your Soul-Bound Weapon is <strong>${esc(bonded.name)}</strong>.`]); return false; }
  // "if you lose your Soul-Bound Weapon through any means you may not bond
  // to another until your next daily preparation".
  // A bond whose weapon is gone stays recorded until the next daily
  // preparation clears it (below), so it is refused until then, whatever
  // the day it was made.
  if (bondedId) { ui.notifications.warn("Soul Weapon Master: your bonded weapon is lost; you may bond another at your next daily preparation."); return false; }
  const melee = Array.from(actor.items ?? []).filter((i) => i.type === "weapon" && !i.system?.natural && !["missile", "thrown", "ranged"].includes(norm(i.system?.attackMode || "melee")));
  if (!melee.length) { ui.notifications.warn("Soul Weapon Master: you carry no melee weapon to bond."); return false; }
  const id = await h().chooseFromList("Soul Weapon Master", "Bond a melee weapon (ten uninterrupted minutes' meditation)", melee.map((w) => [w.id, w.name]));
  const weapon = melee.find((w) => w.id === id);
  if (!weapon) return false;
  const f = soulBondFlags(weapon.id);
  await item.update({ [`flags.${SYSTEM_ID}.unarmedAbilityWeapons`]: f.unarmedAbilityWeapons, [`flags.${SYSTEM_ID}.weaponScaling`]: f.weaponScaling, [`flags.${MODULE_ID}.bondDay`]: dayKey() });
  await card(actor, "Soul Weapon Master", [`<strong>${esc(weapon.name)}</strong> is your Soul-Bound Weapon: +1 to its damage total at BAB 3 and every 3 after, magical at BAB 3, cold iron and silver at 8, adamantine at 16; and Flurry of Blows and the other abilities used with unarmed strikes may be used with it.`]);
  return true;
}

const soulWeaponMaster = {
  hint: "Bond a melee weapon at your daily preparation (or press Use): its damage scales with your BAB and your unarmed abilities work with it.",
  async use(actor, item) { return bondWeapon(actor, item); }
};

/* ------------------------------------------------------------------ */
/* Twin Path                                                            */
/* ------------------------------------------------------------------ */

const twinPath = {
  hint: "Choose a second Mystical Discipline: its special ability, and its 1st-level spells as innate spells with the Focus trait.",
  async use(actor, item) {
    if (item.getFlag(MODULE_ID, "discipline")) { await card(actor, "Twin Path", [`Your second discipline is <strong>${esc(item.getFlag(MODULE_ID, "discipline"))}</strong>.`]); return false; }
    const first = Array.from(actor.items ?? []).find((i) => DISCIPLINE_NAMES.some((n) => norm(n) === norm(i.name)));
    const offer = DISCIPLINE_NAMES.filter((n) => !first || norm(first.name) !== norm(n));
    const pick = await h().chooseFromList("Twin Path", `A second Mystical Discipline${first ? ` (yours is ${first.name})` : ""}`, offer.map((n) => [n, n]));
    if (!pick) return false;
    const [disc] = await abilitiesWhere((d) => norm(d.name) === norm(pick) && norm(d.system?.sourceClass) === "mystic");
    if (!disc) { ui.notifications.warn(`Twin Path: ${pick} is not in the abilities compendium.`); return false; }
    const special = String(disc.system?.grantedAbilities ?? "").split(/,\s*/).map((s) => s.replace(/^\d+\s*:\s*/, "").trim()).filter(Boolean);
    for (const name of special) await grantAbility(actor, item, name, "Mystic");
    const names = spellsAtLevel(disc.system?.grantedSpells, 1);
    const index = await spellIndexFull();
    const datas = [];
    for (const name of names) {
      const entry = index.find((e) => norm(e.name) === norm(name));
      const data = entry ? await spellData(entry) : null;
      if (!data) continue;
      data.system.innate = true;
      data.system.prepared = true;
      data.system.traits = withFocus(data.system.traits);
      foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: item.id, sourceName: item.name, requested: true });
      datas.push(data);
    }
    // STAMPED AS THE FIRST DISCIPLINE'S ARE: Twin Path declares `itPathMagic`,
    // so Block 3's stamp gives each the Path's tradition and ability.
    if (datas.length) await actor.createEmbeddedDocuments("Item", datas);
    await item.setFlag(MODULE_ID, "discipline", pick);
    await card(actor, "Twin Path", [`<strong>${esc(pick)}</strong> is your second discipline: ${special.map((s) => `<strong>${esc(s)}</strong>`).join(", ") || "its special ability"}${datas.length ? `, and ${datas.map((d) => esc(d.name)).join(" and ")} as innate spells with the Focus trait` : ""}. Its later spells are not gained. Where both disciplines' abilities would modify one roll, choose which applies.`]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Veilborn                                                             */
/* ------------------------------------------------------------------ */

const veilborn = {
  hint: "Learn one more Ghost Art with the Focus trait. +2 to Refocus a Ghost Art; +1 DB after an art that conceals, makes invisible or teleports.",
  async use(actor, item) {
    const had = Array.from(actor.items ?? []).find((i) => i.flags?.[SYSTEM_ID]?.itArtExtra === "Veilborn");
    if (had) { await card(actor, "Veilborn", [`Your additional Ghost Art is <strong>${esc(had.name)}</strong>.`]); return false; }
    const known = Array.from(actor.items ?? []).filter((i) => i.flags?.[SYSTEM_ID]?.itArtLevel).map((i) => i.name);
    const arts = await abilitiesWhere((d) => d.flags?.[SYSTEM_ID]?.itArtLevel && /\bfocus\b/i.test(String(d.system?.traits ?? "")));
    const focusArts = new Set(arts.map((d) => norm(d.name)));
    const offer = artsOnOffer(levelOf(actor), known).filter((n) => focusArts.has(norm(n)));
    if (!offer.length) { ui.notifications.warn("Veilborn: no Focus Ghost Art you meet the level for is left to learn."); return false; }
    const pick = await h().chooseFromList("Veilborn", "Learn one more Ghost Art with the Focus trait", offer.map((n) => [n, `${n} (level ${GHOST_ART_LEVELS[n]})`]));
    if (!pick) return false;
    const granted = await grantAbility(actor, item, pick, "Ghostwalker");
    if (!granted) return false;
    await granted.update({ [`flags.${SYSTEM_ID}.itArtExtra`]: "Veilborn" });
    await card(actor, "Veilborn", [`You learn <strong>${esc(pick)}</strong>. It is not counted against Ghost Arts' table.`]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Hooks                                                                */
/* ------------------------------------------------------------------ */

export async function onStrikeResolvedB7(ctx = {}) {
  const { attacker, target, weapon, hits, held, damageTaken } = ctx;
  if (!attacker || !target) return;
  // DRAWN VERDICT's Strike, read back.
  if (drawnVerdictStrike && drawnVerdictStrike.attackerUuid === attacker.uuid && drawnVerdictStrike.targetUuid === target.uuid && !drawnVerdictStrike.resolved) {
    drawnVerdictStrike.resolved = true;
    drawnVerdictStrike.damage = Math.max(0, Number(damageTaken) || 0);
  } else if (attacker.isOwner) {
    // "if you made no further Strikes after Drawn Verdict".
    const dv = attacker.getFlag(MODULE_ID, "drawnVerdict");
    const combat = game.combat?.started ? game.combat : null;
    if (dv && combat && dv.turn === turnKeyOf(combat) && !dv.further) await attacker.setFlag(MODULE_ID, "drawnVerdict", { ...dv, further: true });
  }
  // NIGHT LOTUS VENOM: the first creature the coated weapon damages.
  if (attacker.isOwner && hits && !held && Number(damageTaken) > 0 && ownEffects(attacker, "nightLotusVenom").some((e) => !e.disabled && venomRides(e.flags?.[MODULE_ID] ?? {}, weapon))) await deliverNightLotus(attacker, target, weapon);
  // TWIN DRAGON: the first hit each round, and the first attack avoided.
  const round = game.combat?.started ? `${game.combat.id}:${int(game.combat.round)}` : null;
  if (attacker.isOwner && hits && !held && inForm(attacker, "itTwinDragonStrike") && (!round || attacker.getFlag(MODULE_ID, "twinDragonHit") !== round)) {
    if (round) await attacker.setFlag(MODULE_ID, "twinDragonHit", round);
    const group = activeForm(attacker)?.flags?.[SYSTEM_ID]?.itFormbinder ? { stackGroup: "formbinder:stat:defence" } : {};
    await putEffect(attacker, "twinDragonDB", made("twinDragonDB", {
      name: "Twin Dragon (+1 DB)", description: "Twin Dragon: +1 class bonus to DB until the start of your next turn.",
      system: { statBonuses: [{ target: "defence", type: "class", value: 1, label: "Twin Dragon", ...group }] }
    }, untilNextTurn(attacker)));
    await card(attacker, "Twin Dragon", ["Your first hit this round: <strong>+1 class bonus to DB</strong> until the start of your next turn."]);
  }
  const missed = typeof ctx.missed === "boolean" ? ctx.missed : !hits;
  if (target.isOwner && missed && !held && inForm(target, "itTwinDragonAvoid") && (!round || target.getFlag(MODULE_ID, "twinDragonAvoid") !== round)) {
    if (round) await target.setFlag(MODULE_ID, "twinDragonAvoid", round);
    await putEffect(target, "twinDragonDamage", made("twinDragonDamage", {
      name: "Twin Dragon (+1 damage)", description: "Twin Dragon: +1 base damage until the end of your next turn.",
      system: { conditionals: [{ kind: "modifier", value: 1, type: "untyped", label: "Twin Dragon", scope: "Your damage (an attack missed you)", auto: true, when: { checkTypes: ["damage"] } }] }
    }, untilEndOfNextTurn(target)));
    await card(target, "Twin Dragon", ["An attack missed you: <strong>+1 damage</strong> until the end of your next turn."]);
  }
}

export async function onDamageAppliedB7({ actor: victim, amount, sourceUuid, context } = {}) {
  if (!victim || !(Number(amount) > 0) || !sourceUuid) return;
  // TURNING THE BLADE: "A creature other than your challenged target damages you with an attack."
  if (context?.kind !== "strike") return;
  if (!ownedNamed(victim, "Turning the Blade") || !challengeOf(victim)) return;
  if (challengedUuid(victim) === sourceUuid || victim.uuid === sourceUuid) return;
  if (!(await reactionOpen(victim, "Turning the Blade"))) return;
  const source = await actorFrom(sourceUuid);
  if (!source) return;
  await offerTo(victim, "b7TurningBlade", { sourceUuid, sourceName: source.name });
}

export async function onDailyPreparationB7({ actor } = {}) {
  if (!actor) return;
  const asks = ["Wandering Creed", "Shugenja", "Soul Weapon Master"].some((n) => ownedNamed(actor, n)) || Boolean(ownedNamed(actor, "Harmony Warden")?.getFlag?.(MODULE_ID, "tranceUsed"));
  if (asks) await offerTo(actor, "b7DailyPrep", {});
}

async function dailyPrepB7(actor) {
  const warden = ownedNamed(actor, "Harmony Warden");
  if (warden?.getFlag(MODULE_ID, "tranceUsed")) await warden.unsetFlag(MODULE_ID, "tranceUsed");
  const creed = ownedNamed(actor, "Wandering Creed");
  if (creed) await chooseCreed(actor, creed);
  const shu = ownedNamed(actor, "Shugenja");
  if (shu?.getFlag(MODULE_ID, "element")) await shugenjaPicks(actor, shu);
  const soul = ownedNamed(actor, "Soul Weapon Master");
  if (soul) {
    // A NEW DAY: a lost bond may be remade; a kept one is kept.
    const kept = soul.flags?.[SYSTEM_ID]?.weaponScaling?.itemId && actor.items.get(soul.flags[SYSTEM_ID].weaponScaling.itemId);
    if (!kept) {
      await soul.update({ [`flags.${MODULE_ID}.bondDay`]: null, [`flags.${SYSTEM_ID}.weaponScaling`]: null, [`flags.${SYSTEM_ID}.unarmedAbilityWeapons`]: null });
      await bondWeapon(actor, soul);
    }
  }
}

export async function onTurnEndedB7({ actor, combatant, combat } = {}) {
  // DRAWN VERDICT: "At the end of your turn, if you made no further Strikes
  // after Drawn Verdict, you may sheathe the weapon as a Free (0 AP) action."
  if (!actor?.isOwner || !combat) return;
  const dv = actor.getFlag(MODULE_ID, "drawnVerdict");
  if (!dv) return;
  await actor.unsetFlag(MODULE_ID, "drawnVerdict");
  // THE TURN THAT ENDED IS THE ONE IT WAS USED IN: read by the combatant
  // whose turn it was (found live: by the time a turn's end is announced
  // the combat already points at the next turn, so its round and turn
  // never matched the record and the sheathe was never offered).
  if (!sheatheOwed(dv, combat, combatant)) return;
  const sword = actor.items.get(dv.weaponId);
  if (!sword?.system?.equipped) return;
  await offerTo(actor, "b7Sheathe", { weaponId: dv.weaponId });
}

async function sheatheOffer(actor, { weaponId }) {
  const sword = actor.items.get(weaponId);
  if (!sword) return;
  const yes = await confirm(`Drawn Verdict — ${actor.name}`, `<p>You made no further Strike after Drawn Verdict. Sheathe <strong>${esc(sword.name)}</strong> (Free, 0 AP)?</p>`);
  if (yes) await sword.update({ "system.equipped": false });
}

registerSharedOps({ offers: { b7TurningBlade: turningBladeOffer, b7DailyPrep: dailyPrepB7, b7Sheathe: sheatheOffer }, ownerOps: { b7Palm: palmOnTarget } });

export const BLOCK7_AUTOMATIONS = Object.freeze({
  "harmony warden": harmonyWarden,
  "drawn verdict": drawnVerdict,
  "restorative palm": restorativePalm,
  "night lotus venom": nightLotusVenom,
  "bound challenge": boundChallenge,
  "wandering creed": wanderingCreed,
  "turning the blade": turningTheBlade,
  "inner adept": innerAdept,
  "steel disciple": steelDisciple,
  "shugenja": shugenja,
  "soul weapon master": soulWeaponMaster,
  "twin path": twinPath,
  "veilborn": veilborn,
  // FORMBINDER'S TWIN DRAGON: a Combat Form, entered through Combat Form like the others.
  "twin dragon": formItemUse("Twin Dragon")
});

/** The class-skill grants (TRG Prime `registerClassSkillGrant`), by the feat's lowercased name. */
export const BLOCK7_CLASS_SKILL_GRANTS = Object.freeze([
  Object.freeze({ name: "inner adept", flag: "itInnerAdeptSkill", label: "Inner Adept", options: Object.freeze(["meditation", "mentalFocus"]) }),
  Object.freeze({ name: "steel disciple", flag: "itSteelDiscipleSkill", label: "Steel Disciple", options: Object.freeze(["acrobatics", "athletics", "meditation", "mentalFocus"]) })
]);

/** Every archetype Block 7 adds, for `registerArchetype` (Zen Archer counts as Archer, C3). */
export const BLOCK7_ARCHETYPES = Object.freeze({
  "Brawler": {}, "Formbinder": {}, "Harmony Warden": {}, "Iaijutsu Master": {}, "Inner Adept": {}, "Jade Physician": {},
  "Lotus Enchanter": {}, "Night Lotus": {}, "Oathbound": {}, "Onmyoji Necromancer": {}, "Ronin": {}, "Shadowdancer": {}, "Shugenja": {},
  "Soul Weapon Master": {}, "Steel Disciple": {}, "Tanuki Trickster": {}, "Twin Path": {}, "Veilborn": {}, "Way of the Geisha": {},
  "Zen Archer": { countsAs: ["Archer"] }
});
