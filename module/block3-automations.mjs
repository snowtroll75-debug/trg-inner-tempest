/**
 * Inner Tempest Block 3 (0.4.0): what the Disciple, the Mystic, the Monastic
 * Paths, the Mystical Disciplines, Inner Discipline and the Technique feats
 * DO, beyond the data on their items.
 *
 * Built on TRG Prime 3.667.0 (Graham's rulings of 22 October 2026, B3-1 to
 * B3-5; docs/INNER_TEMPEST_BLOCK3_AUDIT.md):
 *   - Flurry of Blows runs the system's strike series (DR once, one critical
 *     injury, the multiple attack penalty run normally), with Disciplined
 *     Flurry's third Strike when it is ready and a reaction is left.
 *   - Guarded Centre and Echo Form are offered when an attack targets you.
 *   - Flame Within and Dragon's Pulse listen for damage the system applies.
 *   - A Mystic's discipline spells and Mystical Power picks are stamped with
 *     the Monastic Path's tradition and ability, and the B3-2 allowance.
 *   - The Technique feats' Use buttons.
 *
 * Pure decisions are exported and driven by tools/verify-block3.mjs; the
 * Foundry side reads `game.trgPrime.modules.helpers` at call time.
 */
import {
  helpers, spendAP, spendReaction, reactionOpen, hasUse, spendUse, landSpeed, owns, firstTarget,
  SYSTEM_ID, MODULE_ID
} from "./automations.mjs";
import { expiryFor, effectData, combatFor, TURN_END_FLAG } from "./skill-action-automations.mjs";

const norm = (v) => String(v ?? "").trim().toLowerCase();
const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));

/** The flag on the actor that tracks Flame Within's turn. */
export const FLAME_FLAG = "flameWithin";
/** The flag on a spell this module stamped from the Monastic Path. */
export const PATH_STAMP_FLAG = "pathStamped";
/** The flag on Mystical Power recording each pick. */
export const PICKS_FLAG = "mysticalPowerPicks";
/** The source key on this file's effects. */
const SRC = "block3";
const ABILITY_KEYS = Object.freeze(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]);

/* ------------------------------------------------------------------ */
/* Pure decisions                                                       */
/* ------------------------------------------------------------------ */

/**
 * The character's Monastic Path, read off the Path ability it owns
 * (`flags.trg-prime.itPath`), or null.
 */
export function pathOf(items = []) {
  for (const item of items ?? []) {
    const p = item?.flags?.[SYSTEM_ID]?.itPath;
    if (p && typeof p === "object" && p.tradition && p.ability) {
      // THE PATH'S OWN NAME when it is recorded on another item (0.8.0;
      // Inner Adept's Path, stored on the archetype): Shadowy Stance and the
      // stances ask for "the Devoted or Illuminator Monastic Path" by name.
      return { name: String(p.name ?? item.name ?? ""), tradition: norm(p.tradition), ability: norm(p.ability), skill: String(p.skill ?? "") };
    }
  }
  return null;
}

/**
 * WHERE A GRANTED SPELL'S MAGIC COMES FROM (0.8.0; IT-M6's fallback, as
 * ruled on 20 October 2026: "All non-casting classes select a tradition at
 * 1st level"). The Monastic Path; otherwise a Ghostwalker's, Kensai's or
 * Oathblade's chosen Magical Tradition with its stated ability (Block 4's
 * `itTradition`, once chosen); otherwise null (the spell waits, as before).
 * Tanuki Trickster's spells are the first a class without a Path receives.
 */
export function magicOf(items = []) {
  const path = pathOf(items);
  if (path) return path;
  for (const item of items ?? []) {
    const t = item?.flags?.[SYSTEM_ID]?.itTradition;
    if (t && typeof t === "object" && t.tradition && t.ability) return { name: String(item.name ?? "Magical Tradition"), tradition: norm(t.tradition), ability: norm(t.ability), skill: "" };
  }
  return null;
}

/**
 * The ability a technique uses (Chapter 7, and IT-M6's fallback as ruled on
 * 20 October 2026): the Path's; otherwise the character's selected magical
 * ability; otherwise Wisdom.
 */
export function techniqueAbility(items = [], castingAbility = "") {
  const path = pathOf(items);
  if (path) return path.ability;
  const cast = norm(castingAbility);
  return ABILITY_KEYS.includes(cast) ? cast : "wisdom";
}

/** "Technique Save DC … equals 10 + the magical ability score of your Monastic Path + your level." */
export function techniqueSaveDC(abilityScore, level) {
  return 10 + Math.trunc(Number(abilityScore) || 0) + Math.max(0, Math.trunc(Number(level) || 0));
}

/** Dragon's Pulse: "Wisdom ability score (min +1). At 6th level and then every 6 levels thereafter … increases by 1." */
export function dragonsPulseDamage(wisdom, level) {
  return Math.max(1, Math.trunc(Number(wisdom) || 0)) + Math.floor(Math.max(0, Math.trunc(Number(level) || 0)) / 6);
}

/** Flame Within's next stack: "+1 … (stacking up to +3)". */
export function flameWithinNext(current) {
  return Math.min(3, Math.max(0, Math.trunc(Number(current) || 0)) + 1);
}

/**
 * Does Flame Within reset at the end of this turn? Graham's B3-3: "The bonus
 * stays until you end a turn in which you neither took nor dealt damage."
 * The window is the time since the end of your previous turn, so damage
 * taken on the enemies' turns counts.
 */
export function flameWithinResets(record) {
  return !(Number(record?.took) > 0) && !(Number(record?.dealt) > 0);
}

/**
 * What Mystical Power owes at this level, given the picks already made.
 * "At 1st level … any two cantrips … and any two spells with a base PP of 2
 * … Each time you gain a level, you may add one additional eligible spell."
 *
 * @param {number} level
 * @param {Array<{slot: string}>} picks
 * @returns {{cantrip: number, pp2: number, eligible: number}}
 */
export function mysticalPowerOwed(level, picks = []) {
  const count = (slot) => (picks ?? []).filter((p) => p?.slot === slot).length;
  const lvl = Math.max(1, Math.trunc(Number(level) || 1));
  return {
    cantrip: Math.max(0, 2 - count("cantrip")),
    pp2: Math.max(0, 2 - count("pp2")),
    eligible: Math.max(0, (lvl - 1) - count("eligible"))
  };
}

/** A spell's traditions as a lowercased list. */
function traditionsOf(system) {
  return String(system?.tradition ?? "").split(/[,;]/).map(norm).filter(Boolean);
}

/**
 * Is this spell a Mystical Power pick for this slot?
 *   cantrip   a cantrip of the Path's tradition
 *   pp2       a spell of the Path's tradition with base PP 2
 *   eligible  "one from your Monastic Path's tradition whose base PP is no
 *             greater than your Mystic level"
 */
export function mysticalPowerFits(spellSystem, slot, { tradition = "", level = 1 } = {}) {
  // NOT A SPECIALIST SPELL (0.8.0, found while building Block 7): a
  // specialist spell is a class's own list, not the tradition's. Lotus
  // Enchanter and Onmyoji Necromancer "add all specialist spells with the
  // Enchantment [Soul] trait to the list of spells available when selecting
  // the Mystic Essence feat", which says they are not on it otherwise.
  if (spellSystem?.specialist === true) return false;
  const traditions = traditionsOf(spellSystem);
  const want = norm(tradition);
  if (!want || !(traditions.includes(want) || traditions.includes("all"))) return false;
  const pp = Math.max(0, Math.trunc(Number(spellSystem?.ppCost) || 0));
  // A CANTRIP IS PP 0 AND THE CANTRIP TRAIT, as TRG Prime's choosers read
  // it (casting.mjs, 3.552.0): Guidance is PP 0 and not a cantrip.
  const cantrip = pp === 0 && /\bcantrip\b/i.test(String(spellSystem?.traits ?? ""));
  if (slot === "cantrip") return cantrip;
  if (slot === "pp2") return pp === 2 && !cantrip;
  if (slot === "eligible") return pp <= Math.max(0, Math.trunc(Number(level) || 0));
  return false;
}

/**
 * The stamp a Path puts on a spell it governs: its tradition, its ability
 * (`castingAbilityOverride`, which TRG Prime's innate casting reads) and,
 * for the Mystic's own grants, the B3-2 allowance (`innatePPAllowance`).
 *
 * `metamagic` (0.7.0; Graham's B6-8, TRG Prime 3.670.0): a Mystic's innate
 * spell takes its Metamagic feats, paid from the spell's free budget
 * (`innateMetamagic`; the system offers none on a cantrip).
 */
export function pathStamp(path, allowance = 0, { metamagic = false } = {}) {
  if (!path) return null;
  const stamp = {
    "system.tradition": path.tradition,
    [`flags.${SYSTEM_ID}.castingAbilityOverride`]: path.ability,
    [`flags.${MODULE_ID}.${PATH_STAMP_FLAG}`]: path.name
  };
  if (Math.trunc(Number(allowance) || 0) > 0) stamp[`flags.${SYSTEM_ID}.innatePPAllowance`] = Math.trunc(Number(allowance));
  if (metamagic === true) stamp[`flags.${SYSTEM_ID}.innateMetamagic`] = true;
  return stamp;
}

/** A cantrip, as TRG Prime's choosers read it: PP 0 and the Cantrip trait. */
export function isCantripSpell(spellSystem) {
  return Math.max(0, Math.trunc(Number(spellSystem?.ppCost) || 0)) === 0 && /\bcantrip\b/i.test(String(spellSystem?.traits ?? ""));
}

/**
 * Is this character a Mystic (its class item)? Block 6 (B6-8): the Mystic's
 * innate spells take its Metamagic feats.
 */
export function isMystic(items = []) {
  return Array.from(items ?? []).some((i) => i?.type === "class" && norm(i.name) === "mystic");
}

/** Flame Within's row on the check dialog at this many stacks. */
export function flameWithinRow(stacks) {
  return { kind: "modifier", value: stacks, type: "circumstance", label: "Flame Within", scope: "Attack checks", auto: true, when: { checkTypes: ["attack"] } };
}

/** Inner Strike's extra damage: "increases by 1d6 at 8th, 12th and 16th levels, to a maximum of 4d6". */
export function innerStrikeDice(level) {
  const lvl = Math.max(0, Math.trunc(Number(level) || 0));
  return `${1 + [8, 12, 16].filter((at) => lvl >= at).length}d6`;
}

/** Inner Sight at this level: 1 minute of Nightvision; 10 minutes from 8th; Darkvision instead from 12th. */
export function innerSightFor(level) {
  const lvl = Math.max(0, Math.trunc(Number(level) || 0));
  return { seconds: lvl >= 8 ? 600 : 60, sense: lvl >= 12 ? "Darkvision" : "Nightvision" };
}

/**
 * ELEMENTAL FIST (Block 6, 0.7.0): "When you use Inner Strike, you may choose
 * electricity damage and give the attack the Air trait; bludgeoning damage
 * and the Earth trait; fire damage and the Fire trait; or cold damage and
 * the Water trait." The type, its label, and the trait it gives.
 */
export const ELEMENTAL_FIST_TYPES = Object.freeze([
  Object.freeze(["electricity", "Electricity (Air trait)", "Air"]),
  Object.freeze(["bludgeoning", "Bludgeoning (Earth trait)", "Earth"]),
  Object.freeze(["fire", "Fire (Fire trait)", "Fire"]),
  Object.freeze(["cold", "Cold (Water trait)", "Water"])
]);

/** The trait Elemental Fist gives with this type, or "". */
export function elementalFistTrait(type) {
  return ELEMENTAL_FIST_TYPES.find(([key]) => key === norm(type))?.[2] ?? "";
}

/** Inner Strike's types for this character: the four, and Elemental Fist's when it is held. */
export function innerStrikeTypes(items = []) {
  const elemental = Array.from(items ?? []).some((i) => i?.type === "feat" && norm(i.name) === "elemental fist");
  return [...INNER_STRIKE_TYPES, ...(elemental ? ELEMENTAL_FIST_TYPES.map(([key, label]) => [key, label]) : [])];
}

/** Inner Strike's declarations for one damage type and level: the unarmed attack row and the rider on every Strike this turn. */
export function innerStrikeFlags(type, level = 1) {
  const trait = elementalFistTrait(type);
  return {
    // ELEMENTAL FIST'S TRAIT (0.7.0) on every attack while this Inner Strike
    // lasts (TRG Prime 3.670.0's `weaponTraitGrants` scope "any"); none for
    // the four types of Inner Strike's own.
    weaponTraitGrants: trait ? [{ scope: "any", trait, label: "Elemental Fist" }] : [],
    // APPLIED, NOT TICKED (0.4.2; found live on 0.4.1). As a tick-box it was
    // never offered: a weapon attack opens no dialog. TRG Prime 3.667.3's
    // `attackForms` axis tells a fist (a gauntlet, a Monastic weapon) from a
    // sword, so the +1 now applies on those attacks by itself.
    conditionals: [{ kind: "modifier", value: 1, type: "status", label: "Inner Strike", scope: "Unarmed attack rolls (your fists, a gauntlet or a Monastic weapon)", auto: true, when: { checkTypes: ["attack"], attackModes: ["melee"], attackForms: ["unarmed"] } }],
    strikeRider: { dice: innerStrikeDice(level), damageType: type, scope: "any", label: "Inner Strike", once: false }
  };
}

/** Shadowy Stance's declarations: essence on any Strike, +2 circumstance to Escape. */
export function shadowyStanceFlags() {
  return {
    strikeTypeOption: { type: "essence", label: "Shadowy Stance", scope: ["any"] },
    conditionals: [{ kind: "modifier", value: 2, type: "circumstance", label: "Shadowy Stance", scope: "Escape checks", auto: true, when: { actions: ["escape"] } }]
  };
}

/** Is this item a Strike that counts as unarmed (the fists, a gauntlet, a Monastic weapon)? */
export function flurryWeapon(item) {
  if (item?.type !== "weapon") return false;
  const s = item.system ?? {};
  const fists = Boolean(s.natural) && norm(s.category) === "unarmed" && norm(s.damageType) === "subdual";
  return fists || s.unarmed === true || /\bmonastic\b/i.test(String(s.traits ?? ""));
}

/**
 * A WEAPON THE HOLDER'S UNARMED ABILITIES REACH (0.8.0, Block 7; TRG Prime
 * 3.671.0 `unarmedAbilityWeapons`, Graham's B7-6). The Soul-Bound Weapon
 * ("any ability that may be used with unarmed strikes (such as Flurry of
 * Blows) may also be used with your Soul-Bound Weapon") and the Zen Archer's
 * bows. Read off the actor's items and effects as the system reads it: by
 * the weapon's id, its name, or its group.
 *
 * @param {Iterable<object>} carriers the actor's items and effects
 * @param {object} item a weapon
 */
export function declaredAbilityWeapon(carriers = [], item = null) {
  if (item?.type !== "weapon") return false;
  const id = String(item.id ?? item._id ?? "");
  const name = norm(item.name);
  const group = norm(item.system?.group);
  for (const c of carriers ?? []) {
    if (c?.disabled) continue;
    const spec = c?.flags?.[SYSTEM_ID]?.unarmedAbilityWeapons;
    if (!spec || typeof spec !== "object") continue;
    const list = (v) => (Array.isArray(v) ? v : v ? [v] : []).map((x) => String(x).trim());
    if (id && list(spec.itemIds).includes(id)) return true;
    if (name && list(spec.names).some((n) => norm(n) === name)) return true;
    if (group && list(spec.groups).some((g) => norm(g) === group)) return true;
  }
  return false;
}

/** Flurry of Blows' weapons for this actor: the unarmed ones, and any its abilities reach (B7-6). */
export function abilityStrikeWeapon(actor, item) {
  return flurryWeapon(item) || declaredAbilityWeapon([...Array.from(actor?.items ?? []), ...Array.from(actor?.effects ?? [])], item);
}

/* ------------------------------------------------------------------ */
/* Small Foundry steps                                                  */
/* ------------------------------------------------------------------ */

const h = () => helpers();

/** The owned feat or ability of this name. */
function ownedNamed(actor, name) {
  const want = norm(name);
  return Array.from(actor?.items ?? []).find((i) => ["feat", "ability"].includes(i.type) && norm(i.name) === want) ?? null;
}

/** This file's own effect, replacing an older one of the same key. */
async function putEffect(actor, key, data) {
  const old = Array.from(actor?.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, SRC) === key).map((e) => e.id);
  if (old.length && actor.isOwner) await actor.deleteEmbeddedDocuments("ActiveEffect", old);
  data.flags = data.flags ?? {};
  data.flags[MODULE_ID] = { ...(data.flags[MODULE_ID] ?? {}), [SRC]: key };
  return h().createEffectsOn(actor, [data]);
}

/** An effect that lasts `seconds` of world time. */
function timedFlags(seconds) {
  return { system: { spellEffect: true, spellEffectEnd: Math.trunc(Number(game.time?.worldTime ?? 0)) + seconds }, module: {} };
}

/** An effect that ends as the bearer's turn begins (6 seconds out of combat). */
function untilNextTurn(actor) {
  return expiryFor("startOfNextTurn", actor);
}

/** An effect that ends as the bearer's current turn ends (6 seconds out of combat). */
function untilEndOfTurn(actor) {
  const combat = combatFor(actor);
  if (!combat) return timedFlags(6);
  return { system: {}, module: { combatId: combat.id, [TURN_END_FLAG]: { combatId: combat.id, round: Number(combat.round ?? 0) } } };
}

/** Effect data in this file's shape, with an expiry. */
function made(key, { name, description, changes = [], system = {}, img }, expiry) {
  const data = effectData(key, { name, description, changes, system, expiry });
  if (img) data.img = img;
  data.flags[MODULE_ID][SRC] = key;
  return data;
}

async function card(actor, title, lines) {
  return h().postCard(actor, title, lines.map((l) => (l.startsWith("<") ? l : h().line(l))));
}

/** The Focus use gate every technique shares. */
async function focusReady(item, label) {
  if (hasUse(item)) return true;
  ui.notifications.warn(`${label}: expended — Refocus restores it.`);
  return false;
}

/* ------------------------------------------------------------------ */
/* Flurry of Blows (+ Disciplined Flurry)                               */
/* ------------------------------------------------------------------ */

/** The Strike Flurry makes: the fists, or a gauntlet or Monastic weapon in hand. */
export async function flurryWeaponsOf(actor) {
  let weapons = Array.from(actor.items ?? []).filter((i) => abilityStrikeWeapon(actor, i) && (i.system?.natural || i.system?.equipped));
  if (!weapons.length) {
    // THE FISTS ARE ALWAYS THERE. A sheet without the Unarmed Strike item
    // is given one from the system's weapons pack, as the sheet's own
    // Unarmed Strike button would.
    const pack = game.packs.get("trg-prime.weapons");
    const entry = pack ? (await pack.getIndex()).find((e) => e.name === "Unarmed Strike") : null;
    const doc = entry ? await pack.getDocument(entry._id) : null;
    if (doc) {
      const [made] = await actor.createEmbeddedDocuments("Item", [doc.toObject()]);
      if (made) weapons = [made];
    }
  }
  return weapons;
}

const flurryOfBlows = {
  hint: "Flourish (1 AP): two unarmed Strikes; DR once against a creature hit twice, one critical injury, the multiple attack penalty as normal.",
  async use(actor, item) {
    const action = { key: "flurryofblows", name: "Flurry of Blows", traits: "Flourish" };
    if (!(await h().traitGate(actor, action, "Flurry of Blows"))) return false;
    const weapons = await flurryWeaponsOf(actor);
    if (!weapons.length) { ui.notifications.warn("Flurry of Blows: no unarmed Strike or Monastic weapon to use."); return false; }
    let weapon = weapons[0];
    if (weapons.length > 1) {
      const id = await h().chooseFromList("Flurry of Blows", "Strike with", weapons.map((w) => [w.id, w.name]));
      if (!id) return false;
      weapon = weapons.find((w) => w.id === id) ?? weapon;
    }
    // DISCIPLINED FLURRY, asked as the Flurry begins (its trigger is "you use
    // Flurry of Blows"): a third Strike at no penalty that still counts
    // towards the penalty afterwards (Graham's B3-4).
    const disciplined = ownedNamed(actor, "Disciplined Flurry");
    const inCombat = Boolean(game.combat?.started);
    let third = false;
    // ASKED ONLY WHEN THE REACTION COULD BE SPENT (0.6.2): Battle Readiness's
    // extra reaction takes an Attack or Martial one only.
    if (disciplined && hasUse(disciplined) && (!inCombat || await reactionOpen(actor, "Disciplined Flurry"))) {
      third = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Disciplined Flurry" },
        content: `<p>Use <strong>Disciplined Flurry</strong> with this Flurry: a third Strike at your highest attack bonus${inCombat ? " (spends your reaction and this technique's use)" : " (spends this technique's use)"}?</p>`,
        rejectClose: false
      });
    }
    if (!(await spendAP(actor, "Flurry of Blows", 1))) return false;
    if (third) {
      if (!(await spendReaction(actor, "Disciplined Flurry"))) third = false;
      else if (!(await spendUse(disciplined, "Disciplined Flurry"))) third = false;
    }
    await h().recordTraitUsage(actor, action);
    const strikes = [{ weapon }, { weapon }];
    if (third) strikes.push({ weapon, mapOverride: 0 });
    const { checks } = await h().runStrikeSeries(actor, strikes, { label: "Flurry of Blows", apPaid: true });
    const hits = checks.filter((c) => c?.attackOutcome?.hits).length;
    await card(actor, "Flurry of Blows", [
      `Two Strikes with <strong>${esc(weapon.name)}</strong>${third ? ", and Disciplined Flurry's third at no penalty" : ""}: <strong>${hits}</strong> hit${hits === 1 ? "" : "s"}.`,
      "<em>A creature hit more than once met its DR on the first hit only; only one critical injury was rolled.</em>"
    ]);
    // STUNNING FIST (Block 6, 0.7.0): "If either Strike hits and deals damage,
    // the target must succeed at a Fortitude save against your Technique DC".
    if (ownedNamed(actor, "Stunning Fist")) {
      const { stunningFist } = await import("./block6-automations.mjs");
      await stunningFist(actor, checks);
    }
    return true;
  }
};

const disciplinedFlurry = {
  hint: "Used through Flurry of Blows: when you use it, you are asked whether to add this third Strike.",
  async use(actor) {
    ui.notifications.info("Disciplined Flurry is used from Flurry of Blows — press Flurry of Blows' Use, and you will be asked.");
    return false;
  }
};

/* ------------------------------------------------------------------ */
/* Reactions when targeted: Guarded Centre, Echo Form                   */
/* ------------------------------------------------------------------ */

async function guardedCentreUse(actor, item) {
  if (!(await focusReady(item, "Guarded Centre"))) return false;
  if (!(await spendReaction(actor, "Guarded Centre"))) return false;
  if (!(await spendUse(item, "Guarded Centre"))) return false;
  await putEffect(actor, "guardedCentre", made("guardedCentre", {
    name: "Guarded Centre (+4 dodge)",
    description: "Guarded Centre: +4 dodge bonus to your DB until the beginning of your next turn.",
    changes: [{ key: "system.combat.defence.dodge", type: "custom", value: "4", priority: 20 }],
    img: item.img
  }, untilNextTurn(actor)));
  await card(actor, "Guarded Centre", ["You settle into your centre: <strong>+4 dodge to your DB</strong> until the start of your next turn.", "<em>Reaction and this technique's use spent.</em>"]);
  return true;
}

async function echoFormUse(actor, item) {
  if (!(await focusReady(item, "Echo Form"))) return false;
  if (!(await spendReaction(actor, "Echo Form"))) return false;
  if (!(await spendUse(item, "Echo Form"))) return false;
  const data = made("echoForm", {
    name: "Echo Form: Concealed",
    description: "Echo Form: illusory afterimages blur your location — Concealed until the beginning of your next turn.",
    img: item.img
  }, untilNextTurn(actor));
  data.statuses = ["concealed"];
  await putEffect(actor, "echoForm", data);
  await card(actor, "Echo Form", ["Afterimages blur your position: you are <strong>Concealed</strong> until the start of your next turn.", "<em>Reaction and this technique's use spent.</em>"]);
  return true;
}

export const BLOCK3_DEFENCE_OFFERS = Object.freeze({
  "Guarded Centre": {
    summary: "+4 dodge to your DB until the start of your next turn (spends your reaction and its Focus use).",
    against: "attack",
    find: (actor) => ownedNamed(actor, "Guarded Centre"),
    requires: (actor, item) => (hasUse(item) ? null : "expended — Refocus restores it"),
    use: (actor, item) => guardedCentreUse(actor, item)
  },
  "Echo Form (Thousand Reflections)": {
    label: "Echo Form",
    summary: "Concealed until the start of your next turn (spends your reaction and its Focus use).",
    against: "attack",
    find: (actor) => ownedNamed(actor, "Echo Form (Thousand Reflections)"),
    requires: (actor, item) => (hasUse(item) ? null : "expended — Refocus restores it"),
    use: (actor, item) => echoFormUse(actor, item)
  }
});

/* ------------------------------------------------------------------ */
/* Damage: Flame Within and Dragon's Pulse                              */
/* ------------------------------------------------------------------ */

/** Run on this client if it may write the actor; else ask the acting GM. */
async function asOwner(actor, op, payload = {}) {
  if (!actor) return;
  // The hook fires once, on the client that applied the damage: that client
  // writes when it may, and asks the acting GM when it may not.
  if (actor.isOwner) return OWNER_OPS[op]?.(actor, payload);
  game.socket?.emit(`module.${MODULE_ID}`, { op, actorUuid: actor.uuid, payload });
}

const OWNER_OPS = {
  /** Flame Within: damage taken — one more stack, and the turn remembers it. */
  async flameTook(actor) {
    const record = { took: 0, dealt: 0, ...(actor.getFlag(MODULE_ID, FLAME_FLAG) ?? {}) };
    record.took = Number(record.took || 0) + 1;
    await actor.setFlag(MODULE_ID, FLAME_FLAG, record);
    const current = Array.from(actor.effects ?? []).find((e) => e.getFlag?.(MODULE_ID, SRC) === "flameWithin");
    const before = Number(current?.getFlag?.(MODULE_ID, "stacks") ?? 0);
    const next = flameWithinNext(before);
    if (next === before) return;
    const data = {
      name: `Flame Within (+${next} attack)`,
      img: "icons/magic/fire/flame-burning-hand-orange.webp",
      description: `Flame Within: +${next} circumstance bonus to attack checks. Rises by 1 each time you take damage (to +3); resets when you end a turn having neither taken nor dealt damage.`,
      changes: [],
      flags: {
        [SYSTEM_ID]: { conditionals: [flameWithinRow(next)] },
        [MODULE_ID]: { [SRC]: "flameWithin", stacks: next }
      }
    };
    if (current) await actor.deleteEmbeddedDocuments("ActiveEffect", [current.id]);
    await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  },
  /** Flame Within: damage dealt — the turn remembers it. */
  async flameDealt(actor) {
    const record = { took: 0, dealt: 0, ...(actor.getFlag(MODULE_ID, FLAME_FLAG) ?? {}) };
    record.dealt = Number(record.dealt || 0) + 1;
    await actor.setFlag(MODULE_ID, FLAME_FLAG, record);
  }
};

/** The listener on every client for writes another client could not make. */
export function registerBlock3Socket() {
  game.socket?.on(`module.${MODULE_ID}`, async (data) => {
    if (!game.user?.isGM || game.user !== game.users?.activeGM) return;
    if (!data?.op || !OWNER_OPS[data.op]) return;
    const actor = await fromUuid(data.actorUuid);
    if (actor) await OWNER_OPS[data.op](actor, data.payload ?? {});
  });
}

/**
 * TRG Prime 3.667.0 announces damage on the client that applied it.
 * Flame Within: the damaged creature gains a stack; the one that dealt it
 * notes it. Dragon's Pulse: the attacker who dealt melee Strike damage is
 * offered the extra damage, on this client if it plays them.
 */
export async function onDamageApplied({ actor, amount, sourceUuid, context } = {}) {
  if (!actor || !(Number(amount) > 0)) return;
  if (ownedNamed(actor, "Flame Within")) await asOwner(actor, "flameTook");
  const source = sourceUuid ? await fromUuid(sourceUuid) : null;
  const attacker = source?.actor ?? source;
  if (attacker && attacker !== actor && ownedNamed(attacker, "Flame Within")) await asOwner(attacker, "flameDealt");
  if (attacker && attacker !== actor && context?.kind === "strike" && context.melee) {
    await offerDragonsPulse(attacker, actor, context);
  }
}

async function offerDragonsPulse(attacker, target, context) {
  const item = ownedNamed(attacker, "Dragon's Pulse");
  if (!item || !hasUse(item) || !attacker.isOwner) return;
  // ASKED WHERE THE ATTACKER IS PLAYED: the player who owns them, or the GM
  // for a creature no connected player owns.
  const players = Array.from(game.users ?? []).filter((u) => u.active && !u.isGM && attacker.testUserPermission?.(u, "OWNER"));
  if (players.length ? game.user?.isGM : !game.user?.isGM) return;
  const amount = dragonsPulseDamage(attacker.system?.attributes?.wisdom?.total, attacker.system?.identity?.level);
  const type = norm(context.damageType) || "bludgeoning";
  const yes = await foundry.applications.api.DialogV2.confirm({
    window: { title: `Dragon's Pulse — ${attacker.name}` },
    content: `<p>Your Strike hit <strong>${esc(target.name)}</strong>. Use <strong>Dragon's Pulse</strong> for <strong>${amount}</strong> more ${esc(type)} damage (expends it)?</p>`,
    rejectClose: false
  });
  if (!yes || !(await spendUse(item, "Dragon's Pulse"))) return;
  const result = await h().applyTypedDamage(target, { amount, type, dr: 0, naturalArmourDr: 0, sourceLevel: Number(attacker.system?.identity?.level ?? 0), sourceName: attacker.name });
  const taken = Number(result?.packet?.taken ?? result?.applied ?? amount);
  await card(attacker, "Dragon's Pulse", [`The dragon's pulse runs through the blow: <strong>${amount}</strong> ${esc(type)} damage to ${esc(target.name)} (base damage, no DR again) — ${taken} taken.`, "<em>Dragon's Pulse expended — Refocus restores it.</em>"]);
}

/** Flame Within's end-of-turn reset (B3-3), and the turn's record cleared. */
export async function onTurnEndedFlame({ actor } = {}) {
  if (!actor || !actor.isOwner || !ownedNamed(actor, "Flame Within")) return;
  if (game.user?.isGM && game.users?.activeGM && game.user !== game.users.activeGM) return;
  const record = actor.getFlag(MODULE_ID, FLAME_FLAG) ?? {};
  const current = Array.from(actor.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, SRC) === "flameWithin");
  if (current.length && flameWithinResets(record)) await actor.deleteEmbeddedDocuments("ActiveEffect", current.map((e) => e.id));
  await actor.setFlag(MODULE_ID, FLAME_FLAG, { took: 0, dealt: 0 });
}

/* ------------------------------------------------------------------ */
/* The Monastic Path on a granted spell                                 */
/* ------------------------------------------------------------------ */

/**
 * As a spell is created on a character: one granted by a discipline (an
 * item declaring `itPathMagic`) is cast with the Path's tradition and
 * ability, and may be cast at level + 1 (B3-2).
 */
export function onPreCreateSpell(document, data) {
  if (data?.type !== "spell" && document?.type !== "spell") return;
  const actor = document?.parent;
  if (!actor || actor.documentName !== "Actor") return;
  const sourceId = data?.flags?.[SYSTEM_ID]?.grantedBy?.sourceId ?? document?.flags?.[SYSTEM_ID]?.grantedBy?.sourceId;
  if (!sourceId) return;
  const source = actor.items?.get?.(sourceId);
  const magic = source?.flags?.[SYSTEM_ID]?.itPathMagic;
  if (!magic) return;
  // A MYSTIC'S (0.7.0, B6-8) takes its Metamagic feats; a cantrip never
  // does (found in review).
  const metamagic = isMystic(Array.from(actor.items ?? [])) && !isCantripSpell(data?.system ?? document?.system);
  const stamp = pathStamp(magicOf(Array.from(actor.items ?? [])), magic.allowance, { metamagic });
  if (stamp) document.updateSource(stamp);
  else document.updateSource({ [`flags.${MODULE_ID}.pathOwed`]: true, [`flags.${SYSTEM_ID}.innatePPAllowance`]: Math.trunc(Number(magic.allowance) || 0) });
}

/**
 * When a class's Magical Tradition is chosen (0.8.0): every spell still
 * waiting takes it, as a Path's arrival gives them the Path's.
 */
export async function stampOwedSpells(actor) {
  if (!actor?.isOwner) return;
  const magic = magicOf(Array.from(actor.items ?? []));
  if (!magic) return;
  const waiting = Array.from(actor.items ?? []).filter((i) => i.type === "spell" && i.getFlag(MODULE_ID, "pathOwed"));
  if (!waiting.length) return;
  const mystic = isMystic(Array.from(actor.items ?? []));
  await actor.updateEmbeddedDocuments("Item", waiting.map((sp) => ({
    _id: sp.id, ...pathStamp(magic, sp.getFlag(SYSTEM_ID, "innatePPAllowance"), { metamagic: mystic && !isCantripSpell(sp.system) }), [`flags.${MODULE_ID}.pathOwed`]: false
  })));
}

/** When a Path arrives: every spell still waiting for one takes its stamp. */
export async function onPathCreated(item) {
  const actor = item?.parent;
  if (!actor || !item?.flags?.[SYSTEM_ID]?.itPath || !actor.isOwner) return;
  const path = pathOf([item]);
  const waiting = Array.from(actor.items ?? []).filter((i) => i.type === "spell" && i.getFlag(MODULE_ID, "pathOwed"));
  if (!waiting.length) return;
  const mystic = isMystic(Array.from(actor.items ?? []));
  await actor.updateEmbeddedDocuments("Item", waiting.map((s) => ({
    _id: s.id, ...pathStamp(path, s.getFlag(SYSTEM_ID, "innatePPAllowance"), { metamagic: mystic && !isCantripSpell(s.system) }), [`flags.${MODULE_ID}.pathOwed`]: false
  })));
}

/* ------------------------------------------------------------------ */
/* Mystical Power's picker                                              */
/* ------------------------------------------------------------------ */

export async function spellIndex() {
  const out = [];
  for (const id of ["trg-prime.spells", `${MODULE_ID}.it-spells`]) {
    const pack = game.packs.get(id);
    if (!pack) continue;
    const index = await pack.getIndex({ fields: ["system.tradition", "system.ppCost", "system.traits", "system.specialist"] });
    for (const e of index) out.push({ pack: id, id: e._id, name: e.name, system: e.system ?? {} });
  }
  return out.sort((a, b) => (Number(a.system.ppCost) - Number(b.system.ppCost)) || a.name.localeCompare(b.name));
}

const SLOT_WORDS = { cantrip: "a cantrip", pp2: "a base PP 2 spell", eligible: "an eligible spell (base PP no greater than your level)" };

const mysticalPower = {
  hint: "Pick your innate spells: two cantrips and two base PP 2 spells of your Path's tradition at 1st, then one eligible spell each level.",
  async use(actor, item) {
    const path = pathOf(Array.from(actor.items ?? []));
    if (!path) { ui.notifications.warn("Mystical Power: choose your Monastic Path first (its Use button)."); return false; }
    const level = Number(actor.system?.identity?.level ?? 1);
    const picks = Array.from(item.getFlag(MODULE_ID, PICKS_FLAG) ?? []);
    const owed = mysticalPowerOwed(level, picks);
    const slot = ["cantrip", "pp2", "eligible"].find((k) => owed[k] > 0);
    if (!slot) {
      await card(actor, "Mystical Power", [`Nothing is owed at level ${level}: ${picks.length} spell${picks.length === 1 ? "" : "s"} chosen.`]);
      return false;
    }
    const known = new Set(Array.from(actor.items ?? []).filter((i) => i.type === "spell").map((i) => norm(i.name)));
    const choices = (await spellIndex()).filter((e) => !known.has(norm(e.name)) && mysticalPowerFits(e.system, slot, { tradition: path.tradition, level }));
    if (!choices.length) { ui.notifications.warn(`Mystical Power: no ${path.tradition} spell fits ${SLOT_WORDS[slot]}.`); return false; }
    const pick = await h().chooseFromList(`Mystical Power — ${path.name}`, `Choose ${SLOT_WORDS[slot]} (${owed[slot]} owed)`,
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
    // MYSTICAL POWER IS THE MYSTIC'S (0.7.0, B6-8): its spells take the
    // Mystic's Metamagic feats (the system offers none on a cantrip).
    for (const [k, v] of Object.entries(pathStamp(path, slot === "pp2" ? 1 : 0, { metamagic: slot !== "cantrip" }))) foundry.utils.setProperty(data, k, v);
    await actor.createEmbeddedDocuments("Item", [data]);
    await item.setFlag(MODULE_ID, PICKS_FLAG, [...picks, { slot, name: doc.name, level }]);
    const after = mysticalPowerOwed(level, [...picks, { slot }]);
    const left = after.cantrip + after.pp2 + after.eligible;
    await card(actor, "Mystical Power", [
      `<strong>${esc(doc.name)}</strong> joins your innate repertoire: an innate spell with the Focus trait, cast as ${esc(path.tradition)} with ${esc(path.ability)}.`,
      left ? `<em>${left} more owed — press Use again.</em>` : "<em>Nothing more is owed at this level.</em>"
    ]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Declared before the check: Centred Awareness, Echoes Beyond, Action   */
/* Before Thought                                                       */
/* ------------------------------------------------------------------ */

async function declareAdvantage(actor, item, { key, label, title, scope, auto, when, line }) {
  if (!(await focusReady(item, label))) return false;
  if (!(await spendUse(item, label))) return false;
  await putEffect(actor, key, made(key, {
    name: title,
    description: `${label}: ${scope}.`,
    system: { conditionals: [{ kind: "advantage", label, scope, auto, oneShot: true, when }] },
    img: item.img
  }, timedFlags(3600)));
  await card(actor, label, [line, "<em>Expended — Refocus restores it.</em>"]);
  return true;
}

const centredAwareness = {
  hint: "Before a Cleansing Trance, Clear Mind or Healing Trance check: advantage on it (expends this).",
  use: (actor, item) => declareAdvantage(actor, item, {
    key: "centredAwareness", label: "Centred Awareness", title: "Centred Awareness (advantage)",
    scope: "Your next Cleansing Trance, Clear Mind or Healing Trance check", auto: true,
    when: { actions: ["cleansingTrance", "clearMind", "healingTrance"] },
    line: "Your next <strong>Cleansing Trance, Clear Mind or Healing Trance</strong> check is rolled with <strong>advantage</strong>, applied for you."
  })
};

const echoesBeyond = {
  hint: "Before a d20 check that is part of a Focus technique or innate spell: advantage on it (expends this).",
  use: (actor, item) => declareAdvantage(actor, item, {
    key: "echoesBeyond", label: "Echoes Beyond", title: "Echoes Beyond (advantage)",
    scope: "A d20 check made as part of a technique or innate spell with the Focus trait — tick it on that check", auto: false,
    when: { checkTypes: ["attack", "save", "skill", "spellcraft"] },
    line: "Advantage is offered as a tick on your next attack, save or skill check — tick it on the check that is part of a Focus technique or innate spell."
  })
};

const actionBeforeThought = {
  hint: "Before initiative is rolled: advantage on it (expends this).",
  use: (actor, item) => declareAdvantage(actor, item, {
    key: "actionBeforeThought", label: "Action Before Thought", title: "Action Before Thought (advantage)",
    scope: "Your next initiative check", auto: true,
    when: { checkTypes: ["initiative"] },
    line: "Your next <strong>initiative</strong> check is rolled with <strong>advantage</strong>, applied for you."
  })
};

/* ------------------------------------------------------------------ */
/* The other techniques                                                 */
/* ------------------------------------------------------------------ */

const burstStep = {
  hint: "Reaction, as you take a move: +10 ft Speed until the start of your next turn.",
  async use(actor, item) {
    if (!(await focusReady(item, "Burst Step"))) return false;
    if (!(await spendReaction(actor, "Burst Step"))) return false;
    if (!(await spendUse(item, "Burst Step"))) return false;
    await putEffect(actor, "burstStep", made("burstStep", {
      name: "Burst Step (+10 ft Speed)",
      description: "Burst Step: your Speed increases by 10 feet until the beginning of your next turn.",
      changes: [{ key: "system.combat.movement.land.untyped", type: "custom", value: "10", priority: 20 }],
      img: item.img
    }, untilNextTurn(actor)));
    await card(actor, "Burst Step", [`A burst of speed: <strong>+10 ft</strong> to your Speed (now ${landSpeed(actor)} ft) until the start of your next turn, this move included.`, "<em>Reaction and this technique's use spent.</em>"]);
    return true;
  }
};

const guardedCentre = { hint: "Reaction when an attack targets you: +4 dodge to DB until your next turn. Offered automatically when you are attacked.", use: guardedCentreUse };
const echoForm = { hint: "Reaction when an attack targets you: Concealed until your next turn. Offered automatically when you are attacked.", use: echoFormUse };

const dragonsPulse = {
  hint: "Offered after your melee Strike damages a creature: Wisdom (min 1, +1 per 6 levels) more damage.",
  async use() {
    ui.notifications.info("Dragon's Pulse is offered when your melee Strike deals damage.");
    return false;
  }
};

const flameWithin = {
  hint: "Passive: +1 to attack checks each time you take damage (to +3); resets when you end a turn having neither taken nor dealt damage.",
  async use() {
    ui.notifications.info("Flame Within works by itself: it rises as you take damage.");
    return false;
  }
};

const abundantStep = {
  hint: "Flourish (1 AP), magical: teleport up to your Speed to a space you can see.",
  async use(actor, item) {
    const action = { key: "abundantstep", name: "Abundant Step", traits: "Flourish, Teleportation" };
    if (!(await h().traitGate(actor, action, "Abundant Step"))) return false;
    if (!(await focusReady(item, "Abundant Step"))) return false;
    if (!(await spendAP(actor, "Abundant Step", 1))) return false;
    if (!(await spendUse(item, "Abundant Step"))) return false;
    const speed = landSpeed(actor);
    await h().armMove(actor, { maxFeet: speed, speedKey: "", provokes: false, note: "Abundant Step: a teleport to a space you can see; it provokes nothing." }, "Abundant Step");
    await h().recordTraitUsage(actor, action);
    await card(actor, "Abundant Step", [`You slip between spaces: move your token up to <strong>${speed} ft</strong> to a space you can see. It is a teleport and provokes nothing; you cannot take anyone with you.`, "<em>1 AP and this technique's use spent.</em>"]);
    return true;
  }
};

const boundingStep = {
  hint: "2 AP: a Fly Speed equal to your land Speed for 1 minute.",
  async use(actor, item) {
    if (!(await focusReady(item, "Bounding Step"))) return false;
    if (!(await spendAP(actor, "Bounding Step", 2))) return false;
    if (!(await spendUse(item, "Bounding Step"))) return false;
    const [speedItem] = await actor.createEmbeddedDocuments("Item", [{
      name: "Bounding Step: Fly Speed", type: "ability", img: item.img,
      system: { description: "A Fly Speed equal to your land Speed. Granted by Bounding Step." },
      flags: { [SYSTEM_ID]: { creatureAbility: { derives: { movement: { key: "fly", feet: 0, orLand: true } } } } }
    }]);
    const data = made("boundingStep", { name: "Bounding Step", description: "Bounding Step: a Fly Speed equal to your land Speed for 1 minute. End each turn on a surface, or fall.", img: item.img }, timedFlags(60));
    data.flags[SYSTEM_ID].grantedItems = speedItem ? [speedItem.id] : [];
    await putEffect(actor, "boundingStep", data);
    const mastery = Number(actor.system?.identity?.level ?? 0) >= 9;
    await card(actor, "Bounding Step", [`You gain a <strong>Fly Speed of ${landSpeed(actor)} ft</strong> for 1 minute.`, mastery
      ? "<em>End each of your turns on a surface that supports you, or attempt a DC 25 Acrobatics check to stay in the air (Greater Mastery); on a failure you fall (the Falling action).</em>"
      : "<em>End each of your turns on a surface that supports you, or fall (the Falling action).</em>"]);
    return true;
  }
};

const INNER_BLAST_STEPS = Object.freeze({ 1: { cone: 15, dice: "2d6" }, 2: { cone: 30, dice: "3d6" }, 3: { cone: 60, dice: "4d6" } });

const innerBlast = {
  hint: "1–3 AP, magical force: a 15/30/60-ft cone of 2d6/3d6/4d6, basic Fortitude against your Technique Save DC.",
  async use(actor, item) {
    if (!(await focusReady(item, "Inner Blast"))) return false;
    const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter(Boolean);
    if (!targets.length) { ui.notifications.warn("Inner Blast: target the creatures in the cone first."); return false; }
    const ap = Number(await h().chooseFromList("Inner Blast", "Action points", [["1", "1 AP — 15-ft cone, 2d6"], ["2", "2 AP — 30-ft cone, 3d6"], ["3", "3 AP — 60-ft cone, 4d6"]]));
    const step = INNER_BLAST_STEPS[ap];
    if (!step) return false;
    if (!(await spendAP(actor, "Inner Blast", ap))) return false;
    if (!(await spendUse(item, "Inner Blast"))) return false;
    const abilityKey = techniqueAbility(Array.from(actor.items ?? []), actor.system?.magic?.castingAbility);
    const dc = techniqueSaveDC(actor.system?.attributes?.[abilityKey]?.total, actor.system?.identity?.level);
    const roll = await new Roll(step.dice).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor: `Inner Blast — ${step.dice} force (${step.cone}-ft cone)` });
    const lines = [`A ${step.cone}-ft cone of force: <strong>${roll.total}</strong> damage, basic Fortitude against Technique Save DC <strong>${dc}</strong> (10 + ${abilityKey} + level).`];
    for (const target of targets) {
      const hit = await h().basicSaveHit({ caster: actor, target, save: "fortitude", dc, label: "Inner Blast", amount: roll.total, type: "force", baseDamage: "1d6" });
      if (hit?.line) lines.push(hit.line);
    }
    lines.push("<em>A magical technique of your Monastic Path's tradition. Its use is spent.</em>");
    await card(actor, "Inner Blast", lines);
    return true;
  }
};

const innerInfusion = {
  hint: "1 AP: +2 status to Strength or Dexterity for 1 minute.",
  async use(actor, item) {
    if (!(await focusReady(item, "Inner Infusion"))) return false;
    const which = await h().chooseFromList("Inner Infusion", "Ability score", [["strength", "Strength"], ["dexterity", "Dexterity"]]);
    if (!which) return false;
    if (!(await spendAP(actor, "Inner Infusion", 1))) return false;
    if (!(await spendUse(item, "Inner Infusion"))) return false;
    const label = which === "strength" ? "Strength" : "Dexterity";
    await putEffect(actor, "innerInfusion", made("innerInfusion", {
      name: `Inner Infusion (+2 ${label})`,
      description: `Inner Infusion: +2 status bonus to ${label} for 1 minute.`,
      changes: [{ key: `system.attributes.${which}.status`, type: "custom", value: "2", priority: 20 }],
      img: item.img
    }, timedFlags(60)));
    await card(actor, "Inner Infusion", [`<strong>+2 status to ${label}</strong> for 1 minute.`, "<em>1 AP and this technique's use spent.</em>"]);
    return true;
  }
};

const innerMind = {
  hint: "Reaction when you succumb to a fear effect: suspend it for 1 minute (by hand).",
  async use(actor, item) {
    if (!(await focusReady(item, "Inner Mind"))) return false;
    if (!(await spendReaction(actor, "Inner Mind"))) return false;
    if (!(await spendUse(item, "Inner Mind"))) return false;
    await card(actor, "Inner Mind", ["You set the fear aside: the triggering fear effect is <strong>suspended for 1 minute</strong>, then affects you for any duration left.", "<em>Set the condition aside by hand. Reaction and this technique's use spent.</em>"]);
    return true;
  }
};

const innerRush = {
  hint: "Flourish (1 AP): move twice (two Strides, two Steps, or one of each); Concealed until your next turn.",
  async use(actor, item) {
    const action = { key: "innerrush", name: "Inner Rush", traits: "Flourish, Movement" };
    if (!(await h().traitGate(actor, action, "Inner Rush"))) return false;
    if (!(await focusReady(item, "Inner Rush"))) return false;
    if (!(await spendAP(actor, "Inner Rush", 1))) return false;
    if (!(await spendUse(item, "Inner Rush"))) return false;
    const speed = landSpeed(actor);
    await h().armMove(actor, { maxFeet: speed * 2, speedKey: "land", provokes: true, note: "Inner Rush: two Strides (a Step counts as 5 ft)." }, "Inner Rush");
    await h().recordTraitUsage(actor, action);
    const rush = made("innerRush", { name: "Inner Rush: Concealed", description: "Inner Rush: Concealed during the movement and until the start of your next turn.", img: item.img }, untilNextTurn(actor));
    rush.statuses = ["concealed"];
    await putEffect(actor, "innerRush", rush);
    await card(actor, "Inner Rush", [`Move your token up to <strong>${speed * 2} ft</strong> (two Strides; a Step counts as 5 ft). You are <strong>Concealed</strong> until the start of your next turn.`, "<em>1 AP and this technique's use spent.</em>"]);
    return true;
  }
};

const innerSight = {
  hint: "2 AP: Nightvision for 1 minute (10 minutes from 8th; Darkvision from 12th).",
  async use(actor, item) {
    if (!(await focusReady(item, "Inner Sight"))) return false;
    if (!(await spendAP(actor, "Inner Sight", 2))) return false;
    if (!(await spendUse(item, "Inner Sight"))) return false;
    // GREATER MASTERY: 10 minutes from 8th level, Darkvision from 12th.
    const { seconds, sense } = innerSightFor(actor.system?.identity?.level);
    const span = seconds >= 600 ? "10 minutes" : "1 minute";
    const pack = game.packs.get("trg-prime.abilities");
    const entry = pack ? (await pack.getIndex()).find((e) => e.name === sense) : null;
    const doc = entry ? await pack.getDocument(entry._id) : null;
    let sightId = null;
    if (doc && !owns(actor, sense)) {
      const src = doc.toObject();
      delete src._id;
      src.name = `${sense} (Inner Sight)`;
      const [madeItem] = await actor.createEmbeddedDocuments("Item", [src]);
      sightId = madeItem?.id ?? null;
    }
    const data = made("innerSight", { name: "Inner Sight", description: `Inner Sight: ${sense} for ${span}; you ignore concealment caused by dim light.`, img: item.img }, timedFlags(seconds));
    data.flags[SYSTEM_ID].grantedItems = sightId ? [sightId] : [];
    await putEffect(actor, "innerSight", data);
    await card(actor, "Inner Sight", [`Your senses sharpen: <strong>${sense}</strong> for ${span}, and you ignore concealment caused by dim light.`, "<em>2 AP and this technique's use spent.</em>"]);
    return true;
  }
};

const innerStamina = {
  hint: "1 AP: +4 resistance bonus to Fortitude saves for 1 minute.",
  async use(actor, item) {
    if (!(await focusReady(item, "Inner Stamina"))) return false;
    if (!(await spendAP(actor, "Inner Stamina", 1))) return false;
    if (!(await spendUse(item, "Inner Stamina"))) return false;
    await putEffect(actor, "innerStamina", made("innerStamina", {
      name: "Inner Stamina (+4 Fortitude)",
      description: "Inner Stamina: +4 resistance bonus to Fortitude saving throws for 1 minute.",
      changes: [{ key: "system.combat.saves.fortitude.resistance", type: "custom", value: "4", priority: 20 }],
      img: item.img
    }, timedFlags(60)));
    await card(actor, "Inner Stamina", ["<strong>+4 resistance to Fortitude saves</strong> for 1 minute.", "<em>1 AP and this technique's use spent.</em>"]);
    return true;
  }
};

const INNER_STRIKE_TYPES = Object.freeze([["force", "Force"], ["aligned", "Aligned (if you have such a trait)"], ["negative", "Negative"], ["positive", "Positive"]]);

/** The running effect's name and description for this type (Elemental Fist's trait named). */
function innerStrikeWords(dice, type) {
  const trait = elementalFistTrait(type);
  return {
    name: `Inner Strike (${dice} ${type}${trait ? `, ${trait}` : ""})`,
    description: `Inner Strike: +1 status bonus to unarmed attack rolls and ${dice} ${type} secondary damage on your Strikes, until the end of your turn.`
      + (trait ? ` Elemental Fist: your attacks have the ${trait} trait.` : "")
  };
}

const innerStrike = {
  hint: "1 AP: until the end of your turn, +1 status to unarmed attacks and 1d6 secondary damage (to 4d6 at 16th) of the chosen type on your Strikes; change the type on its card, free.",
  async use(actor, item) {
    if (!(await focusReady(item, "Inner Strike"))) return false;
    // ELEMENTAL FIST (0.7.0) adds its four types when it is held.
    const types = innerStrikeTypes(Array.from(actor.items ?? []));
    const type = await h().chooseFromList("Inner Strike", "Secondary damage type", types);
    if (!type) return false;
    if (!(await spendAP(actor, "Inner Strike", 1))) return false;
    if (!(await spendUse(item, "Inner Strike"))) return false;
    const dice = innerStrikeDice(actor.system?.identity?.level);
    await putEffect(actor, "innerStrike", made("innerStrike", {
      ...innerStrikeWords(dice, type),
      system: innerStrikeFlags(type, actor.system?.identity?.level),
      img: item.img
    }, untilEndOfTurn(actor)));
    // "CHOOSE … EACH TIME YOU STRIKE": the type is changed from this card's
    // buttons, free (0.4.1; found live — pressing Use again spent another
    // use, and was refused with none left).
    const buttons = types.map(([key, label]) => `<button type="button" data-it-action="innerStrikeType" data-type="${key}">${esc(label.replace(/ \(.*\)$/, ""))}</button>`).join(" ");
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${esc(actor.name)}</span><h3>Inner Strike</h3></div></header>`
        + `<p style="margin:2px 0">Until the end of your turn: <strong>+1 status</strong> to unarmed attack rolls (applied on the roll) and <strong>${dice} ${esc(type)}</strong> secondary damage on your Strikes.</p>`
        + `<p style="margin:2px 0"><em>1 AP and this technique's use spent. Before a Strike, choose its type here — free:</em></p>`
        + `<p style="margin:6px 0 2px">${buttons}</p></div>`,
      flags: { [MODULE_ID]: { innerStrike: { actorUuid: actor.uuid } } }
    });
    return true;
  }
};

/**
 * An Inner Strike card's type button (0.4.1): re-types the running effect's
 * rider, free. The owner's (or the GM's) press only.
 *
 * @returns {Promise<boolean>} whether the type changed
 */
export async function pressInnerStrikeType(message, type) {
  const raw = message?.getFlag?.(MODULE_ID, "innerStrike");
  if (!raw) return false;
  const actor = await fromUuid(raw.actorUuid);
  if (!actor) return false;
  // ELEMENTAL FIST'S TYPES (0.7.0) are pressable while it is held.
  if (!innerStrikeTypes(Array.from(actor.items ?? [])).some(([key]) => key === type)) return false;
  if (!actor.isOwner) { ui.notifications.warn("Inner Strike: only its owner can change the damage type."); return false; }
  const effect = Array.from(actor.effects ?? []).find((e) => e.getFlag?.(MODULE_ID, SRC) === "innerStrike");
  if (!effect) { ui.notifications.info("Inner Strike has ended."); return false; }
  const dice = innerStrikeDice(actor.system?.identity?.level);
  await effect.update({
    ...innerStrikeWords(dice, type),
    [`flags.${SYSTEM_ID}.strikeRider.damageType`]: type,
    // Elemental Fist's trait follows the type: given, changed, or taken away.
    [`flags.${SYSTEM_ID}.weaponTraitGrants`]: innerStrikeFlags(type).weaponTraitGrants
  });
  ui.notifications.info(`Inner Strike: ${dice} ${type} on your Strikes from now.`);
  return true;
}

const shadowyStance = {
  hint: "Stance, 1 minute: your attacks may deal essence damage, and +2 circumstance to Escape. Devoted or Illuminator Path.",
  async use(actor, item) {
    const path = pathOf(Array.from(actor.items ?? []));
    if (!path || !["devoted", "illuminator"].includes(norm(path.name))) { ui.notifications.warn("Shadowy Stance needs the Devoted or Illuminator Monastic Path."); return false; }
    if (!(await focusReady(item, "Shadowy Stance"))) return false;
    const entered = await h().enterStance(actor, item, {
      name: "Shadowy Stance",
      apCost: 1,
      description: "Shadowy Stance (1 minute): your attacks may deal essence damage; +2 circumstance bonus to Escape checks.",
      // The core card says the stance lasts until you leave it; this one
      // also ends after 1 minute (0.4.1).
      extraLines: [h().line("<em>Shadowy Stance lasts 1 minute, then ends by itself.</em>")],
      flags: {
        ...shadowyStanceFlags(),
        spellEffect: true,
        spellEffectEnd: Math.trunc(Number(game.time?.worldTime ?? 0)) + 60
      }
    });
    if (!entered) return false;
    await spendUse(item, "Shadowy Stance");
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* What registration hands the system                                   */
/* ------------------------------------------------------------------ */

export const BLOCK3_AUTOMATIONS = Object.freeze({
  "flurry of blows": flurryOfBlows,
  "disciplined flurry": disciplinedFlurry,
  "guarded centre": guardedCentre,
  "echo form (thousand reflections)": echoForm,
  "burst step": burstStep,
  "mystical power": mysticalPower,
  "centred awareness": centredAwareness,
  "echoes beyond": echoesBeyond,
  "dragon's pulse": dragonsPulse,
  "flame within": flameWithin,
  "abundant step": abundantStep,
  "action before thought": actionBeforeThought,
  "bounding step": boundingStep,
  "inner blast": innerBlast,
  "inner infusion": innerInfusion,
  "inner mind": innerMind,
  "inner rush": innerRush,
  "inner sight": innerSight,
  "inner stamina": innerStamina,
  "inner strike": innerStrike,
  "shadowy stance": shadowyStance
});
