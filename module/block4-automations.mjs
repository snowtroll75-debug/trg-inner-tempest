/**
 * Inner Tempest Block 4 (0.5.0): what the Ghostwalker, the Kensai and the
 * Oathblade, their Ghost Arts, Combat Forms and Sworn Oaths, and the 28
 * class feats DO, beyond the data on their items.
 *
 * Built on TRG Prime 3.668.0 (Graham's rulings of 23 October 2026, B4-1 to
 * B4-4 and Black Lotus; docs/INNER_TEMPEST_BLOCK4_AUDIT.md). The core does
 * the arithmetic it can be told about: Unseen Assault's dice
 * (`ambushDice`), a form's bonuses (conditionals, stat rows, defence rows on
 * the stance), Challenge's Armour Rending (`strikeRending`), Weapon
 * Discipline's Finesse (`weaponTraitGrants`). This file does the rest:
 *
 *   - choosers: Ghost Arts, Combat Forms, Weapon Discipline, Blended Form,
 *     Ghost Art Mastery, Magical Tradition, the Sworn Charge;
 *   - entering a Combat Form, Echoed Form, Form Reversal, Steel Viper's
 *     initiative, Ember Reaver's rounds, Black Lotus's held blow;
 *   - what follows a Strike (TRG Prime's `trgPrimeStrikeResolved`): Flow
 *     Strike, Perfect Tempo, Steel Viper's half damage, Echoing Crane, Form
 *     Reversal, Shadow Counter, Crashing Tide's push;
 *   - Vanishing Retreat after Unseen Assault (`trgPrimeAmbushDealt`);
 *   - Challenge and the four oaths, and what ends them.
 *
 * Pure decisions are exported and driven by tools/verify-block4.mjs; the
 * Foundry side reads `game.trgPrime.modules.helpers` at call time.
 */
import {
  helpers, spendAP, spendReaction, reactionOpen, hasUse, spendUse, landSpeed, firstTarget, missedHere,
  SYSTEM_ID, MODULE_ID
} from "./automations.mjs";
import { expiryFor, effectData, combatFor, TURN_END_FLAG, TURN_START_FLAG } from "./skill-action-automations.mjs";

const norm = (v) => String(v ?? "").trim().toLowerCase();
const esc = (text) => String(text ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
const int = (v) => Math.trunc(Number(v) || 0);

/** The source key on this file's effects (alongside skill-action-automations' own). */
const SRC = "block4";
/** This module's socket channel, shared with Block 3's GM relay. */
const SOCKET = `module.${MODULE_ID}`;

/* ------------------------------------------------------------------ */
/* What the book prints, as tables                                      */
/* ------------------------------------------------------------------ */

/** Each Ghost Art and the level it needs ("Prerequisites Level 4", …; none printed is 1st). */
export const GHOST_ART_LEVELS = Object.freeze({
  "False Face": 1, "Ghost Step": 1, "Hollow Breath": 1, "Misdirecting Whisper": 1, "No Trace": 1, "Silent Needles": 1, "Smoke Veil": 1, "Spider Path": 1,
  "Falling Shadow": 4, "Caltrop Blossom": 4, "Shadow Double": 8, "Veiled Body": 8, "Body of Mist": 12, "Shadow Passage": 12, "Empty Presence": 16
});
/** "Select two Ghost Arts … one additional Ghost Art at 4th level and then every 4 levels thereafter." */
export const GHOST_ARTS_BY_LEVEL = Object.freeze([{ level: 1, count: 2 }, { level: 4, count: 3 }, { level: 8, count: 4 }, { level: 12, count: 5 }, { level: 16, count: 6 }, { level: 20, count: 7 }]);
/** "You begin play with two combat forms … an additional combat form at 4th level and then every 4 levels thereafter." */
export const COMBAT_FORMS_BY_LEVEL = Object.freeze([{ level: 1, count: 2 }, { level: 4, count: 3 }, { level: 8, count: 4 }, { level: 12, count: 5 }, { level: 16, count: 6 }, { level: 20, count: 7 }]);
export const COMBAT_FORM_NAMES = Object.freeze(["Black Lotus", "Crashing Tide", "Dread Wolf", "Echoing Crane", "Ember Reaver", "Flickering Flame", "Gale Cutter", "Ghost Fox",
  "Iron Tortoise", "Rising Phoenix", "Steel Viper", "Stone Serpent"]);
/** Weapon Discipline's eleven groups, as printed. */
export const WEAPON_DISCIPLINE_GROUPS = Object.freeze(["Axe", "Brawling", "Club", "Knife", "Spear", "Polearm", "Sword", "Flail", "Hammer", "Pick", "Dart"]);
export const TRADITIONS = Object.freeze([["arcane", "Arcane"], ["divinity", "Divinity"], ["ethereal", "Ethereal"], ["verdant", "Verdant"]]);

/* ------------------------------------------------------------------ */
/* Pure decisions                                                       */
/* ------------------------------------------------------------------ */

/** A level table's count at this level: the last step reached. */
export function byLevelCount(table = [], level = 0) {
  let best = 0;
  for (const step of table ?? []) if (int(level) >= int(step.level)) best = int(step.count);
  return best;
}

/** Ghost Arts owed: the table, and one per Extra Ghost Art. */
export function ghostArtsOwed(level, extras = 0) {
  return byLevelCount(GHOST_ARTS_BY_LEVEL, level) + Math.max(0, int(extras));
}

/** Combat Forms owed: the table, and one per Extra Form. */
export function combatFormsOwed(level, extras = 0) {
  return byLevelCount(COMBAT_FORMS_BY_LEVEL, level) + Math.max(0, int(extras));
}

/** The Ghost Arts a character of this level may learn, the known ones left out, lowest level first. */
export function artsOnOffer(level, known = []) {
  const have = new Set((known ?? []).map(norm));
  return Object.entries(GHOST_ART_LEVELS)
    .filter(([name, need]) => int(level) >= need && !have.has(norm(name)))
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

/** Caltrop Blossom: "2d6 at 4th level and increases by 1d6 at 8th level and every 4 levels thereafter." */
export function caltropDice(level) {
  const lvl = Math.max(4, int(level));
  return `${2 + Math.floor((lvl - 4) / 4)}d6`;
}

/** "Any triggered saving throws uses your Technique DC": 10 + the magical ability (the Kensai's Intelligence) + level. */
export function techniqueDC(ability, level) {
  return 10 + int(ability) + Math.max(0, int(level));
}

/** Flow Strike's penalty: the third Strike's, or Gale Cutter's −5 when that is better. */
export function flowStrikePenalty(standard, galeCutter = false) {
  const third = int(standard);
  return galeCutter ? Math.max(third, -5) : third;
}

/** Vanishing Retreat's Step: 5 feet, 10 with Fleeting Shadow. */
export function vanishingStepFeet(fleetingShadow = false) {
  return fleetingShadow ? 10 : 5;
}

/** Steel Viper's initiative: "your Int mod x5" (a bonus, so never below 0). */
export function steelViperShift(intelligence) {
  return Math.max(0, int(intelligence)) * 5;
}

/** Ember Reaver's next round: +1, capped at Intelligence (Graham's ruling B4-4). */
export function emberNext(current, intelligence) {
  return Math.min(Math.max(0, int(intelligence)), Math.max(0, int(current)) + 1);
}

/**
 * The flags a form's stance carries: every part's flags merged. Arrays
 * (conditionals, defence and stat rows) are joined; anything else is the
 * last part's.
 *
 * @param {Array<{flags: object}>} parts
 */
export function mergeFormFlags(parts = []) {
  const out = {};
  for (const part of parts ?? []) {
    for (const [key, value] of Object.entries(part?.flags ?? {})) {
      if (Array.isArray(value)) out[key] = [...(Array.isArray(out[key]) ? out[key] : []), ...value];
      else out[key] = value;
    }
  }
  return out;
}

/** The stance's name for one form or a blend. */
export function formStanceName(names = []) {
  return names.length > 1 ? `Blended Form: ${names.join(" + ")}` : `Combat Form: ${names[0] ?? ""}`;
}

/** Was something already done in this round of this combat? `record` is {combatId, round}. */
export function usedThisRound(record, combatId, round) {
  return Boolean(record && combatId && String(record.combatId) === String(combatId) && int(record.round) === int(round));
}

/** Weapon Discipline's declarations for one group: class bonus − 1 (untyped, B4-2) and Finesse one-handed. */
export function weaponDisciplineFlags(group) {
  const g = norm(group);
  const scope = `Attacks and damage with a ${group} weapon`;
  return {
    itDiscipline: String(group),
    conditionals: [
      { kind: "modifier", valueFrom: "classBonus-1", valueMin: 0, type: "untyped", label: "Weapon Discipline", scope, auto: true, when: { checkTypes: ["attack"], attackGroups: [g] } },
      { kind: "modifier", valueFrom: "classBonus-1", valueMin: 0, type: "untyped", label: "Weapon Discipline", scope, auto: true, when: { checkTypes: ["damage"], attackGroups: [g] } }
    ],
    weaponTraitGrants: [{ groups: [g], trait: "Finesse", oneHanded: true, label: "Weapon Discipline" }]
  };
}

/**
 * CHALLENGE (Oathblade): the declarations on the Oathblade's effect.
 *   "You add your class bonus to melee attack checks made against it … to
 *   damage inflicted by your melee attacks … Your melee attacks against it
 *   gain AR equal to your class bonus … a -2-circumstance penalty to DB
 *   against attacks made by all creatures other than your challenged target."
 * Distant Honour adds the bow within its first range increment; Guarded
 * Commitment makes the penalty −1.
 */
export function challengeFlags({ targetUuid, targetName = "the target", distantHonour = false, guarded = false } = {}) {
  const at = [targetUuid];
  const scope = `Melee attacks against ${targetName}`;
  const conditionals = [
    { kind: "modifier", valueFrom: "classBonus", type: "class", label: "Challenge", scope, auto: true, when: { checkTypes: ["attack"], attackModes: ["melee"], targetUuids: at } },
    { kind: "modifier", valueFrom: "classBonus", type: "class", label: "Challenge", scope, auto: true, when: { checkTypes: ["damage"], attackModes: ["melee"], targetUuids: at } }
  ];
  const strikeRending = [{ valueFrom: "classBonus", label: "Challenge", when: { targetUuids: at, attackModes: ["melee"] } }];
  if (distantHonour) {
    const bow = `Bow attacks against ${targetName} within the first range increment (Distant Honour)`;
    const when = { attackModes: ["ranged"], attackGroups: ["bow"], rangeBands: ["first"], targetUuids: at };
    conditionals.push(
      { kind: "modifier", valueFrom: "classBonus", type: "class", label: "Challenge", scope: bow, auto: true, when: { checkTypes: ["attack"], ...when } },
      { kind: "modifier", valueFrom: "classBonus", type: "class", label: "Challenge", scope: bow, auto: true, when: { checkTypes: ["damage"], ...when } });
    strikeRending.push({ valueFrom: "classBonus", label: "Challenge (Distant Honour)", when });
  }
  return {
    conditionals,
    strikeRending,
    defenceDC: [{ dc: "defence", value: guarded ? -1 : -2, label: guarded ? "Challenge (Guarded Commitment)" : "Challenge", scope: "against every creature but your challenged target", not: { sourceUuids: at } }]
  };
}

/** Oath of Honour's +2 circumstance to DB against the challenged target. */
export function honourDefenceFlags(targetUuid, targetName = "the target") {
  return { defenceDC: [{ dc: "defence", value: 2, label: "Oath of Honour", scope: `against ${targetName}`, when: { sourceUuids: [targetUuid] } }] };
}

/** Oath of Honour's advantage on the first melee Strike each round, with none of your allies adjacent to the target. */
export function honourStrikeFlags(targetUuid, targetName = "the target") {
  return { conditionals: [{ kind: "advantage", label: "Oath of Honour", scope: `Your first melee Strike this round against ${targetName}, none of your allies adjacent to it`, auto: true, when: { checkTypes: ["attack"], attackModes: ["melee"], targetUuids: [targetUuid], targetStates: ["duel"] } }] };
}

/**
 * The bonus for the next melee Strike against the target (Oath of
 * Guardianship, Oath of Vengeance's Retribution): advantage, the Oathblade's
 * Charisma as damage, and for Retribution AR +2.
 */
export function nextStrikeOathFlags(targetUuid, targetName = "the target", { label, charismaMin = null, rending = 0 } = {}) {
  const at = [targetUuid];
  const scope = `Your next melee Strike against ${targetName}`;
  const damage = { kind: "modifier", valueFrom: "charisma", type: "untyped", label, scope, auto: true, when: { checkTypes: ["damage"], attackModes: ["melee"], targetUuids: at } };
  if (charismaMin !== null) damage.valueMin = charismaMin;
  const out = {
    conditionals: [
      { kind: "advantage", label, scope, auto: true, when: { checkTypes: ["attack"], attackModes: ["melee"], targetUuids: at } },
      damage
    ]
  };
  if (rending > 0) out.strikeRending = [{ value: rending, label, when: { targetUuids: at, attackModes: ["melee"] } }];
  return out;
}

/** Oath of Guardianship on the challenged target: "a -2-circumstance penalty to attack checks against your allies". */
export function guardianshipTargetFlags(oathbladeUuid, oathbladeName = "the Oathblade") {
  return { conditionals: [{ kind: "modifier", value: -2, type: "circumstance", label: "Oath of Guardianship", scope: `Attacks against anyone but ${oathbladeName}`, auto: true, when: { checkTypes: ["attack"], not: { targetUuids: [oathbladeUuid] } } }] };
}

/** Oath of Fealty on the Sworn Charge: +1 circumstance to attack checks and AR 1 against the challenged target. */
export function fealtyChargeFlags(targetUuid, targetName = "the target") {
  return {
    conditionals: [{ kind: "modifier", value: 1, type: "circumstance", label: "Oath of Fealty", scope: `Attacks against ${targetName}`, auto: true, when: { checkTypes: ["attack"], targetUuids: [targetUuid] } }],
    strikeRending: [{ value: 1, label: "Oath of Fealty", when: { targetUuids: [targetUuid] } }]
  };
}

/** A +N on the next attack against one creature (Oath of Fealty's +2; Echoing Crane's +1 is against any). */
export function nextAttackBonusFlags({ value, type = "circumstance", label, scope, targetUuid = null, notTargetUuid = null, auto = true, melee = false }) {
  const when = { checkTypes: ["attack"] };
  if (targetUuid) when.targetUuids = [targetUuid];
  if (melee) when.attackModes = ["melee"];
  if (notTargetUuid) when.not = { targetUuids: [notTargetUuid] };
  return { conditionals: [{ kind: "modifier", value, type, label, scope, auto, when }] };
}

/** Shelter Under Oath on an ally: +2 circumstance to saves against the challenged target's effects. */
export function shelterFlags(targetUuid, targetName = "the challenged target") {
  return { conditionals: [{ kind: "modifier", value: 2, type: "circumstance", label: "Shelter Under Oath", scope: `Saving throws against ${targetName}'s spells, techniques and other effects`, auto: true, when: { checkTypes: ["save"], sourceUuids: [targetUuid] } }] };
}

/**
 * Should this effect go after this Strike? Its `itNextStrike` mark says which
 * Strike it was for: against a creature (or any), melee only or not, and
 * whether a miss keeps it (Unpaid Debt: "missing the target no longer
 * causes Retribution to end … until you successfully damage").
 */
export function nextStrikeSpent(mark, { targetUuid = "", melee = false, hits = false, damageTaken = 0 } = {}) {
  if (!mark) return false;
  if (mark.targetUuid && mark.targetUuid !== targetUuid) return false;
  if (mark.notTargetUuid && mark.notTargetUuid === targetUuid) return false;
  if (mark.melee && !melee) return false;
  if (mark.keepOnMiss) return Boolean(hits) && int(damageTaken) > 0;
  return true;
}

/**
 * Who answers a question about this creature: a connected player who owns
 * it (the one whose character it is first), else the acting GM.
 */
export function answererFor({ users = [], activeGMId = null } = {}) {
  const players = (users ?? []).filter((u) => u.active && !u.isGM && u.owner);
  const player = players.find((u) => u.isCharacter) ?? players[0];
  return player?.id ?? activeGMId ?? null;
}

/* ------------------------------------------------------------------ */
/* Small Foundry steps                                                  */
/* ------------------------------------------------------------------ */

const h = () => helpers();
const DialogV2 = () => foundry.applications.api.DialogV2;

/** The owned feat or ability of this name. */
function ownedNamed(actor, name) {
  const want = norm(name);
  return Array.from(actor?.items ?? []).find((i) => ["feat", "ability"].includes(i.type) && norm(i.name) === want) ?? null;
}
const countNamed = (actor, name) => Array.from(actor?.items ?? []).filter((i) => ["feat", "ability"].includes(i.type) && norm(i.name) === norm(name)).length;
const intOf = (actor) => int(actor?.system?.attributes?.intelligence?.total);
const levelOf = (actor) => int(actor?.system?.identity?.level);

/** This file's effects on an actor carrying this key. */
function ownEffects(actor, key) {
  return Array.from(actor?.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, SRC) === key);
}

/** Effect data in this file's shape, with an expiry. */
function made(key, { name, description, changes = [], system = {}, module = {}, img }, expiry) {
  const data = effectData(key, { name, description, changes, system, module, expiry });
  if (img) data.img = img;
  data.flags[MODULE_ID][SRC] = key;
  return data;
}

/**
 * Delete these effects if they are still there. Two clients may reach for
 * the same effect (a Challenge's partners are cleaned up by the acting GM
 * while the Oathblade's own client replaces them), so a vanished id is not
 * an error.
 */
async function safeDelete(actor, ids = []) {
  const live = ids.filter((id) => actor?.effects?.has?.(id));
  if (!live.length) return;
  try { await actor.deleteEmbeddedDocuments("ActiveEffect", live); } catch (err) { console.debug("Inner Tempest | an effect was already gone", err); }
}

/** Replace this file's effect of this key on an actor (one it owns), or relay it. */
async function putEffect(actor, key, data) {
  const old = ownEffects(actor, key).map((e) => e.id);
  if (old.length) {
    if (actor.isOwner) await safeDelete(actor, old);
    else await asOwner(actor, "deleteEffects", { ids: old });
  }
  return h().createEffectsOn(actor, [data]);
}

/** Lasts until the start of the bearer's next turn. */
const untilNextTurn = (actor) => expiryFor("startOfNextTurn", actor);
/** Lasts until the end of the bearer's next turn. */
const untilEndOfNextTurn = (actor) => expiryFor("endOfNextTurn", actor);
/** Lasts until the bearer's current turn ends (6 seconds out of combat). */
function untilEndOfTurn(actor) {
  const combat = combatFor(actor);
  if (!combat) return forSeconds(6);
  return { system: {}, module: { combatId: combat.id, [TURN_END_FLAG]: { combatId: combat.id, round: int(combat.round) } } };
}
/** "For 3 rounds": until the bearer's turn begins `rounds` rounds from now (18 seconds out of combat). */
function forRounds(actor, rounds) {
  const combat = combatFor(actor);
  if (!combat) return forSeconds(6 * rounds);
  const round = int(combat.round) + rounds;
  return { system: { conditionExpiresRound: round + 1 }, module: { combatId: combat.id, [TURN_START_FLAG]: { combatId: combat.id, round } } };
}
/** Lasts `seconds` of world time. */
const forSeconds = (seconds) => ({ system: { spellEffect: true, spellEffectEnd: Math.trunc(Number(game.time?.worldTime ?? 0)) + seconds }, module: {} });
/** Lasts to the end of this round (the system's round sweep), or 6 seconds out of combat. */
function untilRoundEnds(actor, rounds = 1) {
  const combat = combatFor(actor);
  if (!combat) return forSeconds(6 * rounds);
  return { system: { conditionExpiresRound: int(combat.round) + rounds }, module: { combatId: combat.id } };
}

/** A card: each line its own paragraph (a line that is already a block is kept as it is). */
async function card(actor, title, lines) {
  return h().postCard(actor, title, lines.map((l) => (/^<(p|div)\b/.test(String(l)) ? l : h().line(l))));
}

/** The Focus use gate every technique shares. */
async function focusReady(item, label) {
  if (hasUse(item)) return true;
  ui.notifications.warn(`${label}: expended — Refocus restores it.`);
  return false;
}

async function confirm(title, html) {
  return DialogV2().confirm({ window: { title }, content: html, rejectClose: false });
}

const roundStamp = () => (game.combat?.started ? { combatId: game.combat.id, round: int(game.combat.round) } : null);
const usedNow = (record) => usedThisRound(record, game.combat?.started ? game.combat.id : "", game.combat?.round);

/** The actor's token on the canvas, or null. */
const tokenOf = (actor) => { try { return actor?.getActiveTokens?.()?.[0] ?? null; } catch { return null; } };

/** Are these two on the same side (their tokens' disposition)? */
function allied(a, b) {
  const ta = tokenOf(a), tb = tokenOf(b);
  if (!ta || !tb) return false;
  return ta.document.disposition === tb.document.disposition;
}

/** Every creature on the canvas and every world actor, once each. */
function creaturesHere() {
  const out = new Map();
  for (const t of canvas?.tokens?.placeables ?? []) if (t.actor) out.set(t.actor.uuid, t.actor);
  // THE COMBAT'S SCENE TOO: the acting GM may be looking at another one.
  for (const t of game.combat?.scene?.tokens ?? []) if (t.actor && !out.has(t.actor.uuid)) out.set(t.actor.uuid, t.actor);
  for (const a of game.actors ?? []) if (!out.has(a.uuid)) out.set(a.uuid, a);
  return Array.from(out.values());
}

async function actorFrom(uuid) {
  const doc = uuid ? await fromUuid(uuid) : null;
  return doc?.actor ?? doc ?? null;
}

/** Make the given token this user's only target. */
function targetOnly(actor) {
  const token = tokenOf(actor);
  if (!token) return false;
  token.setTarget(true, { releaseOthers: true, groupSelection: false });
  return true;
}

/** Equipped melee weapons, natural ones included. */
function meleeWeapons(actor) {
  return Array.from(actor?.items ?? []).filter((i) => i.type === "weapon" && (i.system?.equipped || i.system?.natural)
    // A THROWN-MODE WEAPON IS RANGED (0.7.0, found in review): TRG Prime's
    // ranged modes are "missile" and "thrown" (a javelin), and it rolls one
    // as a ranged Strike.
    && !["missile", "thrown", "ranged"].includes(norm(i.system?.attackMode || "melee")));
}

async function pickWeapon(actor, label, weapons) {
  if (!weapons.length) { ui.notifications.warn(`${label}: no suitable weapon in hand.`); return null; }
  if (weapons.length === 1) return weapons[0];
  const id = await h().chooseFromList(label, "Strike with", weapons.map((w) => [w.id, w.name]));
  return weapons.find((w) => w.id === id) ?? null;
}

/** A pack document from the federated abilities pack, by name and class. */
async function abilityFromPack(name, sourceClass) {
  const pack = game.trgPrime?.modules?.contentPack?.("abilities");
  if (!pack) return null;
  const index = await pack.getIndex({ fields: ["system.sourceClass"] });
  const all = Array.from(index.values?.() ?? index).filter((e) => norm(e.name) === norm(name));
  const entry = all.find((e) => norm(e.system?.sourceClass) === norm(sourceClass)) ?? all[0];
  return entry ? pack.getDocument(entry._id) : null;
}

/** Grant a pack ability as part of `granter` (it leaves with it). */
async function grantAbility(actor, granter, name, sourceClass) {
  const doc = await abilityFromPack(name, sourceClass);
  if (!doc) { ui.notifications.warn(`${name} is not in the abilities compendium.`); return null; }
  const data = doc.toObject();
  delete data._id;
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.grantedBy`, { sourceId: granter.id, sourceName: granter.name, requested: name });
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  return created ?? null;
}

/* ---------------- who answers, and who writes ---------------- */

function usersFor(actor) {
  return Array.from(game.users ?? []).map((u) => ({
    id: u.id, active: Boolean(u.active), isGM: Boolean(u.isGM),
    owner: Boolean(actor?.testUserPermission?.(u, "OWNER")), isCharacter: u.character?.id === actor?.id
  }));
}

/** Ask the question where the creature is played: here, or on that user's screen. */
async function offerTo(actor, op, payload = {}) {
  if (!actor || !OFFERS[op]) return;
  const who = answererFor({ users: usersFor(actor), activeGMId: game.users?.activeGM?.id ?? null });
  if (!who) return;
  if (who === game.user?.id) return OFFERS[op](actor, payload);
  game.socket?.emit(SOCKET, { b4offer: op, userId: who, actorUuid: actor.uuid, payload });
}

/** Write as the owner: here when this client may, else through the acting GM. */
async function asOwner(actor, op, payload = {}) {
  if (!actor || !OWNER_OPS[op]) return;
  if (actor.isOwner) return OWNER_OPS[op](actor, payload);
  game.socket?.emit(SOCKET, { b4own: op, actorUuid: actor.uuid, payload });
}

const isActingGM = () => Boolean(game.user?.isGM && (!game.users?.activeGM || game.users.activeGM === game.user));

const OWNER_OPS = {
  async deleteEffects(actor, { ids = [] }) { await safeDelete(actor, ids); },
  async setFlag(actor, { key, value }) { await actor.setFlag(MODULE_ID, key, value); },
  async emptyPresenceSeen(actor) {
    const e = ownEffects(actor, "emptyPresence")[0];
    if (e && !e.getFlag(MODULE_ID, "seen")) await e.update({ statuses: ["concealed"], name: "Empty Presence (concealed this turn)", [`flags.${MODULE_ID}.seen`]: true });
  },
  async suppressHonour(actor) { await suppressHonourHere(actor); }
};

/** The listener on every client: an offer meant for this user, a write meant for the acting GM. */
export function registerBlock4Socket() {
  game.socket?.on(SOCKET, async (data) => {
    if (data?.b4offer && data.userId === game.user?.id && OFFERS[data.b4offer]) {
      const actor = await actorFrom(data.actorUuid);
      if (actor) await OFFERS[data.b4offer](actor, data.payload ?? {});
      return;
    }
    if (data?.b4own && OWNER_OPS[data.b4own] && isActingGM()) {
      const actor = await actorFrom(data.actorUuid);
      if (actor) await OWNER_OPS[data.b4own](actor, data.payload ?? {});
    }
  });
}

/* ------------------------------------------------------------------ */
/* Magical Tradition (all three classes)                                */
/* ------------------------------------------------------------------ */

const magicalTradition = {
  hint: "Choose your magical tradition (1st level): it names the tradition of your class's magical techniques.",
  async use(actor, item) {
    const decl = item.flags?.[SYSTEM_ID]?.itTradition ?? {};
    if (decl.tradition) {
      ui.notifications.info(`${item.name}: ${decl.tradition} (with ${decl.ability}). Changing it is the GM's: set it on this ability's flags or delete and re-add it.`);
      return false;
    }
    const pick = await h().chooseFromList(item.name, "Your magical tradition", TRADITIONS);
    if (!pick) return false;
    await item.update({ [`flags.${SYSTEM_ID}.itTradition.tradition`]: pick });
    await card(actor, item.name, [`Your magical tradition is <strong>${esc(pick)}</strong>, with <strong>${esc(decl.ability ?? "")}</strong> as the magical ability score of your class's magical techniques and innate spells.`]);
    return true;
  }
};

/** The tradition a class's magical technique uses, for its card. */
function traditionLine(actor, cls) {
  const item = Array.from(actor?.items ?? []).find((i) => i.flags?.[SYSTEM_ID]?.itTradition && norm(i.system?.sourceClass) === norm(cls));
  const t = item?.flags?.[SYSTEM_ID]?.itTradition;
  return t?.tradition ? `<em>Magical: ${esc(t.tradition)} (${esc(t.ability)}).</em>` : "<em>Magical (choose your tradition with Magical Tradition).</em>";
}

/* ------------------------------------------------------------------ */
/* Ghostwalker                                                          */
/* ------------------------------------------------------------------ */

const ghostArts = {
  hint: "Learn your Ghost Arts: two at 1st, one more at 4th, 8th, 12th, 16th and 20th, and one per Extra Ghost Art.",
  async use(actor, item) {
    const level = levelOf(actor);
    const known = Array.from(actor.items ?? []).filter((i) => i.flags?.[SYSTEM_ID]?.itArtLevel).map((i) => i.name);
    const owed = ghostArtsOwed(level, countNamed(actor, "Extra Ghost Art")) - known.length;
    if (owed <= 0) { await card(actor, "Ghost Arts", [`You know ${known.length}: ${esc(known.join(", ")) || "none"}. Nothing more is owed at level ${level}.`]); return false; }
    const offer = artsOnOffer(level, known);
    if (!offer.length) { ui.notifications.warn("Ghost Arts: no art you meet the level for is left to learn."); return false; }
    const pick = await h().chooseFromList("Ghost Arts", `Learn a Ghost Art (${owed} owed)`, offer.map((n) => [n, `${n} (level ${GHOST_ART_LEVELS[n]})`]));
    if (!pick) return false;
    const granted = await grantAbility(actor, item, pick, "Ghostwalker");
    if (!granted) return false;
    await card(actor, "Ghost Arts", [`You learn <strong>${esc(pick)}</strong>.`, owed > 1 ? `<em>${owed - 1} more owed — press Use again.</em>` : "<em>Nothing more is owed at this level.</em>"]);
    return true;
  }
};

/** A Focus Ghost Art's opening: its use, and the AP. */
async function artBegins(actor, item, label, ap = 1) {
  if (!(await focusReady(item, label))) return false;
  if (!(await spendAP(actor, label, ap))) return false;
  return spendUse(item, label);
}

/** A Ghost Art that moves you: Ghost Step, Spider Path, Body of Mist, Shadow Passage. */
function movingArt(label, { speedKey, provokes, note, line, magical = false }) {
  return {
    hint: `1 AP: ${line}`,
    async use(actor, item) {
      const action = { key: norm(label).replace(/\s+/g, ""), name: label, traits: item.system?.traits ?? "" };
      if (!(await h().traitGate(actor, action, label))) return false;
      if (!(await artBegins(actor, item, label))) return false;
      const speed = landSpeed(actor);
      await h().armMove(actor, { maxFeet: speed, speedKey, provokes, note }, label);
      await h().recordTraitUsage(actor, action);
      await card(actor, label, [`Move your token up to <strong>${speed} ft</strong>: ${line}`, ...(magical ? [traditionLine(actor, "Ghostwalker")] : []), "<em>1 AP and this art's use spent.</em>"]);
      return true;
    }
  };
}

const ghostStep = movingArt("Ghost Step", { speedKey: "land", provokes: false, note: "Ghost Step: this movement triggers no reactions.", line: "a Stride that triggers no reactions. Ending in cover or concealment, you may Hide as part of it." });
const spiderPath = movingArt("Spider Path", { speedKey: "", provokes: true, note: "Spider Path: walls are ground for this Stride; end on a surface that holds you, or fall.", line: "a Stride across walls and other solid vertical surfaces. End on a surface that holds you, or fall." });
const bodyOfMist = movingArt("Body of Mist", { speedKey: "", provokes: false, magical: true, note: "Body of Mist: you fly; through creatures' spaces and 1-inch gaps; no reactions.", line: "you Fly, through other creatures' spaces and openings as narrow as 1 inch, triggering no reactions. You cannot attack, manipulate objects or carry anyone; you cannot pass solid walls or sealed doors; end where your body fits." });
const shadowPassage = movingArt("Shadow Passage", { speedKey: "", provokes: false, magical: true, note: "Shadow Passage: a teleport between places of dim light or darkness.", line: "a teleport from dim light or darkness to a space you can see that is also in dim light or darkness." });

const hollowBreath = {
  hint: "1 AP: your stillness hides you (−5 to Perception by sound or movement); ends when you move, speak, attack or act.",
  async use(actor, item) {
    if (!(await spendAP(actor, "Hollow Breath", 1))) return false;
    await putEffect(actor, "hollowBreath", made("hollowBreath", {
      name: "Hollow Breath",
      description: "Hollow Breath: creatures relying on sound or movement to detect you take −5 circumstance to Perception; you may hold your breath five times as long. Ends when you move, speak, attack or take an action other than Awareness or Search.",
      img: item.img
    }, forSeconds(3600)));
    await card(actor, "Hollow Breath", ["You go still: creatures relying on <strong>sound or movement</strong> to detect you take <strong>−5 circumstance</strong> to their Perception checks (applied by the GM), and you may hold your breath five times as long.",
      "<em>It ends by itself when you Strike or your token moves; end it by hand (delete the effect) when you speak or take another action.</em>"]);
    return true;
  }
};

const misdirectingWhisper = {
  hint: "1 AP: Feint or Create a Diversion with advantage, then you may Step 5 feet.",
  async use(actor, item) {
    if (!(await focusReady(item, "Misdirecting Whisper"))) return false;
    const target = firstTarget();
    if (!target) { ui.notifications.warn("Misdirecting Whisper: target the creature first."); return false; }
    const key = await h().chooseFromList("Misdirecting Whisper", "Deception", [["feint", "Feint"], ["createADiversion", "Create a Diversion"]]);
    const action = h().skillActions.find((a) => a.key === key);
    if (!action) return false;
    // THE ROLL FIRST, THEN THE COST (0.5.1; found in the 0.5.0 live test): a
    // Feint the system refuses (untrained in Deception) spent the AP and the
    // use, and left the advantage behind. The AP is checked before, and
    // spent with the use only once the check was rolled.
    if (game.combat?.started && int(actor.system?.resources?.ap?.value) < 1) { ui.notifications.warn("Misdirecting Whisper: 1 AP required."); return false; }
    await putEffect(actor, "misdirectingWhisper", made("misdirectingWhisper", {
      name: "Misdirecting Whisper (advantage)",
      description: "Misdirecting Whisper: advantage on this Feint or Create a Diversion check.",
      system: { conditionals: [{ kind: "advantage", label: "Misdirecting Whisper", scope: `Your ${action.name} check`, auto: true, oneShot: true, when: { actions: [key] } }] },
      img: item.img
    }, forSeconds(60)));
    const check = await h().resolveAction(actor, { ...action, apCost: "0", variantNote: "Misdirecting Whisper: 1 AP, rolled with advantage." });
    if (!check) {
      await safeDelete(actor, ownEffects(actor, "misdirectingWhisper").map((e) => e.id));
      return false;
    }
    if (!(await spendAP(actor, "Misdirecting Whisper", 1))) return false;
    if (!(await spendUse(item, "Misdirecting Whisper"))) return false;
    await h().armMove(actor, { maxFeet: 5, speedKey: "land", provokes: false, note: "Misdirecting Whisper: a Step." }, "Misdirecting Whisper");
    await card(actor, "Misdirecting Whisper", [`${esc(action.name)} rolled with <strong>advantage</strong>. You may now <strong>Step 5 feet</strong> — move your token.`, "<em>1 AP and this art's use spent.</em>"]);
    return true;
  }
};

/** Thrown weapons on the actor and how many there are. */
function thrownWeapons(actor) {
  return Array.from(actor?.items ?? []).filter((i) => i.type === "weapon" && (norm(i.system?.attackMode) === "thrown" || /\bthrown\b/i.test(String(i.system?.traits ?? ""))));
}

const silentNeedles = {
  hint: "Flourish (1 AP): two thrown Strikes at the same creature or two; DR once against one hit twice.",
  async use(actor, item) {
    const action = { key: "silentneedles", name: "Silent Needles", traits: "Attack, Flourish, Focus, Technique" };
    if (!(await h().traitGate(actor, action, "Silent Needles"))) return false;
    if (!(await focusReady(item, "Silent Needles"))) return false;
    const weapons = thrownWeapons(actor);
    const count = weapons.reduce((n, w) => n + Math.max(1, int(w.system?.quantity ?? 1)), 0);
    if (count < 2) { ui.notifications.warn("Silent Needles: you need at least two thrown weapons."); return false; }
    const targets = Array.from(game.user?.targets ?? []).map((t) => t.actor).filter(Boolean).slice(0, 2);
    if (!targets.length) { ui.notifications.warn("Silent Needles: target one or two creatures first."); return false; }
    const weapon = await pickWeapon(actor, "Silent Needles", weapons);
    if (!weapon) return false;
    if (!(await spendAP(actor, "Silent Needles", 1))) return false;
    if (!(await spendUse(item, "Silent Needles"))) return false;
    await h().recordTraitUsage(actor, action);
    let hits = 0;
    if (targets.length === 1) {
      const { checks } = await h().runStrikeSeries(actor, [{ weapon, skipTargetPrompt: true }, { weapon }], { label: "Silent Needles", apPaid: true });
      hits = checks.filter((c) => c?.attackOutcome?.hits).length;
    } else {
      for (const target of targets) {
        targetOnly(target);
        const check = await h().rollWeaponAttack(actor, weapon, { apPaid: true, skipTargetPrompt: true });
        if (check?.attackOutcome?.hits) hits += 1;
      }
    }
    await card(actor, "Silent Needles", [`Two thrown Strikes with <strong>${esc(weapon.name)}</strong>${targets.length > 1 ? ` at ${esc(targets.map((t) => t.name).join(" and "))}` : ""}: <strong>${hits}</strong> hit${hits === 1 ? "" : "s"}.`,
      "<em>Each at your multiple attack penalty. A creature hit twice met its DR on the first hit only.</em>", "<em>1 AP and this art's use spent.</em>"]);
    return true;
  }
};

const smokeVeil = {
  hint: "1 AP: a 10-foot burst of smoke within 30 ft for 1 minute; those inside are concealed and may Hide.",
  async use(actor, item) {
    if (!(await artBegins(actor, item, "Smoke Veil"))) return false;
    await card(actor, "Smoke Veil", ["A <strong>10-foot burst</strong> of smoke within 30 feet, for <strong>1 minute</strong>: creatures and objects inside are <strong>concealed</strong>, and creatures inside may Hide. Strong wind or heavy rain may disperse it early (the GM's).",
      "<em>Mark the area and give those inside the Concealed condition by hand. Non-magical. 1 AP and this art's use spent.</em>"]);
    return true;
  }
};

const fallingShadow = {
  hint: "Reaction when you fall 10 feet or more: treat the fall as 30 feet shorter; you may Hide on landing.",
  async use(actor, item) {
    if (!(await focusReady(item, "Falling Shadow"))) return false;
    if (!(await spendReaction(actor, "Falling Shadow"))) return false;
    if (!(await spendUse(item, "Falling Shadow"))) return false;
    await card(actor, "Falling Shadow", ["You turn the fall: <strong>treat the distance fallen as 30 feet shorter</strong> for its damage and consequences.",
      "If you land without the Prone condition somewhere that gives cover or concealment, you may Hide as part of this reaction.", "<em>Apply the shorter fall in the Falling action. Reaction and this art's use spent.</em>"]);
    return true;
  }
};

const caltropBlossom = {
  hint: "1 AP: a 10-foot burst of caltrops within 20 ft: difficult terrain; a Reflex save against your Level DC the first time each turn a creature moves through it.",
  async use(actor, item) {
    if (!(await artBegins(actor, item, "Caltrop Blossom"))) return false;
    const level = levelOf(actor);
    const dc = h().levelDC(level);
    const dice = caltropDice(level);
    await card(actor, "Caltrop Blossom", [`A <strong>10-foot burst</strong> within 20 feet becomes <strong>difficult terrain</strong> until cleared (an Interact clears one 5-foot square).`,
      `The first time each turn a creature moves through it on the ground: a <strong>Reflex save against DC ${dc}</strong> (your Level DC). Failure: <strong>${dice} piercing</strong> and −5 feet circumstance to Speed until the end of its turn. Fumble: as failure, and its movement ends. Success or Critical: unaffected.`,
      "<em>Mark the area and roll the saves by hand. 1 AP and this art's use spent.</em>"]);
    return true;
  }
};

/** Shadow Double: Concealed against the attack, until your next turn or your next hostile act. */
async function shadowDoubleUse(actor, item) {
  if (!(await focusReady(item, "Shadow Double"))) return false;
  if (!(await spendReaction(actor, "Shadow Double"))) return false;
  if (!(await spendUse(item, "Shadow Double"))) return false;
  const data = made("shadowDouble", { name: "Shadow Double: Concealed", description: "Shadow Double: concealed until the beginning of your next turn, or until you attack or act with hostility.", img: item.img, module: { endsOnStrike: true } }, untilNextTurn(actor));
  data.statuses = ["concealed"];
  await putEffect(actor, "shadowDouble", data);
  await card(actor, "Shadow Double", ["Your shadow breaks away: you are <strong>Concealed</strong> against this attack, and until the start of your next turn or your next attack.",
    "If the attack fails to damage you, you may <strong>Step 5 feet</strong> (no reactions) — move your token.", traditionLine(actor, "Ghostwalker"), "<em>Reaction and this art's use spent.</em>"]);
  return true;
}

const shadowDouble = { hint: "Reaction when an attack targets you: Concealed until your next turn. Offered automatically when you are attacked.", use: shadowDoubleUse };

const veiledBody = {
  hint: "1 AP: Invisible until the start of your next turn; ends when you attack or cast.",
  async use(actor, item) {
    if (!(await artBegins(actor, item, "Veiled Body"))) return false;
    const data = made("veiledBody", { name: "Veiled Body: Invisible", description: "Veiled Body: invisible until the beginning of your next turn; ends when you attack, cast a spell or take another hostile action.", img: item.img, module: { endsOnStrike: true } }, untilNextTurn(actor));
    data.statuses = ["invisible"];
    await putEffect(actor, "veiledBody", data);
    await card(actor, "Veiled Body", ["You are <strong>Invisible</strong> until the start of your next turn.", "<em>It ends by itself when you Strike; end it by hand (delete the effect) when you cast a spell or act with hostility.</em>", traditionLine(actor, "Ghostwalker"), "<em>1 AP and this art's use spent.</em>"]);
    return true;
  }
};

const emptyPresence = {
  hint: "1 AP: Invisible for 1 minute; after an attack, Concealed instead until the end of that turn.",
  async use(actor, item) {
    if (!(await artBegins(actor, item, "Empty Presence"))) return false;
    const data = made("emptyPresence", { name: "Empty Presence: Invisible", description: "Empty Presence: invisible for 1 minute. After you attack or take another hostile action you are concealed instead until the end of that turn, then invisible again.", img: item.img }, forSeconds(60));
    data.statuses = ["invisible"];
    await putEffect(actor, "emptyPresence", data);
    await card(actor, "Empty Presence", ["You are <strong>Invisible for 1 minute</strong>. When you Strike you become <strong>Concealed</strong> instead until the end of that turn, then Invisible again — both handled for you.",
      "<em>Unconscious or dismissed: delete the effect.</em>", traditionLine(actor, "Ghostwalker"), "<em>1 AP and this art's use spent.</em>"]);
    return true;
  }
};

/** No-Use arts and abilities: what the sheet says. */
const passive = (hint) => ({ hint, async use() { ui.notifications.info(hint); return false; } });

const vanishingRetreat = passive("Offered after your Unseen Assault deals its damage: your reaction, a Step of 5 feet (10 with Fleeting Shadow) that triggers no reactions.");

/** After Unseen Assault (TRG Prime's trgPrimeAmbushDealt, on the attacker's client). */
export async function onAmbushDealt({ actor } = {}) {
  if (!actor?.isOwner || !ownedNamed(actor, "Vanishing Retreat")) return;
  // ASKED ONLY WHEN THE REACTION COULD BE SPENT (0.6.2).
  if (!(await reactionOpen(actor, "Vanishing Retreat"))) return;
  const fleeting = Boolean(ownedNamed(actor, "Fleeting Shadow"));
  const feet = vanishingStepFeet(fleeting);
  const yes = await confirm(`Vanishing Retreat — ${actor.name}`, `<p>Your Unseen Assault landed. Use <strong>Vanishing Retreat</strong>: Step ${feet} feet, triggering no reactions${game.combat?.started ? " (spends your reaction)" : ""}?</p>`);
  if (!yes || !(await spendReaction(actor, "Vanishing Retreat"))) return;
  await h().armMove(actor, { maxFeet: feet, speedKey: "land", provokes: false, note: "Vanishing Retreat: a Step that triggers no reactions." }, "Vanishing Retreat");
  await card(actor, "Vanishing Retreat", [`You vanish with the blow: <strong>Step ${feet} feet</strong> — move your token. It triggers no reactions.`,
    ...(fleeting ? ["Fleeting Shadow: ending in cover or concealment, you may <strong>Hide</strong> as part of this reaction."] : [])]);
}

const ghostArtMastery = {
  hint: "Choose a Focus Ghost Art: it can be used one more time before it is expended; a Refocus restores both.",
  async use(actor, item) {
    const chosen = item.flags?.[SYSTEM_ID]?.itMastery;
    if (chosen) { ui.notifications.info(`Ghost Art Mastery: ${chosen}. Take the feat again to choose another.`); return false; }
    const taken = new Set(Array.from(actor.items ?? []).map((i) => norm(i.flags?.[SYSTEM_ID]?.itMastery)).filter(Boolean));
    const arts = Array.from(actor.items ?? []).filter((i) => i.flags?.[SYSTEM_ID]?.itArtLevel && /\bfocus\b/i.test(String(i.system?.traits ?? "")) && !taken.has(norm(i.name)));
    if (!arts.length) { ui.notifications.warn("Ghost Art Mastery: you know no Focus Ghost Art not already mastered."); return false; }
    const pick = await h().chooseFromList("Ghost Art Mastery", "A Focus Ghost Art", arts.map((a) => [a.name, a.name]));
    if (!pick) return false;
    // ON A TRANSFERRED EFFECT OF THE FEAT: the system reads extra Focus uses
    // from applied effects and active abilities, not from feats, and an
    // effect the feat owns leaves with it.
    await item.update({ [`flags.${SYSTEM_ID}.itMastery`]: pick });
    await item.createEmbeddedDocuments("ActiveEffect", [{
      name: `Ghost Art Mastery: ${pick}`, img: item.img, transfer: true,
      description: `Ghost Art Mastery: ${pick} can be used one additional time before it is expended; a Refocus restores both uses.`,
      flags: { [SYSTEM_ID]: { focusExtraUses: [{ value: 1, names: [pick], restoresAll: true, label: "Ghost Art Mastery" }] } }
    }]);
    // THE NEW USE ARRIVES NOW, as a granted Deep Focus use does, not at the
    // next Refocus.
    const art = arts.find((a) => a.name === pick);
    if (art) await art.update({ "system.usesValue": Math.min(h().itemUsesMax(art) ?? Infinity, int(art.system?.usesValue) + 1) });
    await card(actor, "Ghost Art Mastery", [`<strong>${esc(pick)}</strong> can be used <strong>twice</strong> before it is expended; a Refocus restores both uses.`]);
    return true;
  }
};

/* ------------------------------------------------------------------ */
/* Kensai: Combat Forms                                                 */
/* ------------------------------------------------------------------ */

/** The forms this Kensai knows: the form abilities on the sheet. */
const knownForms = (actor) => Array.from(actor?.items ?? []).filter((i) => i.flags?.[SYSTEM_ID]?.itForm?.parts);
/** The active form stance, if any. */
const activeForm = (actor) => Array.from(actor?.effects ?? []).filter((e) => !e.disabled && Array.isArray(e.flags?.[SYSTEM_ID]?.itFormNames)).pop() ?? null;
/** Is a form benefit running (the stance, or an Echoed Form part)? */
const inForm = (actor, flag) => Array.from(actor?.effects ?? []).some((e) => !e.disabled && e.flags?.[SYSTEM_ID]?.[flag]);

/** The blend Blended Form records, if the Kensai still knows both. */
function blendOf(actor) {
  const feat = ownedNamed(actor, "Blended Form");
  const pair = feat?.flags?.[SYSTEM_ID]?.itBlend;
  if (!Array.isArray(pair) || pair.length !== 2) return null;
  const known = new Set(knownForms(actor).map((f) => norm(f.name)));
  return pair.every((n) => known.has(norm(n))) ? pair : null;
}

/** Learn a form (Combat Form's Use while one is owed). */
async function learnForm(actor, granter, owed) {
  const known = new Set(knownForms(actor).map((f) => norm(f.name)));
  const offer = COMBAT_FORM_NAMES.filter((n) => !known.has(norm(n)));
  if (!offer.length) { ui.notifications.warn("Combat Form: you know every form."); return false; }
  const pick = await h().chooseFromList("Combat Form", `Learn a combat form (${owed} owed)`, offer.map((n) => [n, n]));
  if (!pick) return false;
  if (!(await grantAbility(actor, granter, pick, "Kensai"))) return false;
  await card(actor, "Combat Form", [`You learn <strong>${esc(pick)}</strong>.`, owed > 1 ? `<em>${owed - 1} more owed — press Use again.</em>` : "<em>Every form owed is learned. Press Use again to enter one.</em>"]);
  return true;
}

/**
 * Enter a form (or the blend). `opts`: apCost, waiveWait (Form Reversal),
 * spendCombatForm (false for Form Reversal).
 */
async function enterForm(actor, names, { apCost = 1, waiveWait = false, spendCombatForm = true } = {}) {
  const combatForm = ownedNamed(actor, "Combat Form");
  if (spendCombatForm && (!combatForm || !(await focusReady(combatForm, "Combat Form")))) return false;
  const forms = names.map((n) => knownForms(actor).find((f) => norm(f.name) === norm(n))).filter(Boolean);
  if (forms.length !== names.length) { ui.notifications.warn("Combat Form: you do not know that form."); return false; }
  const previous = activeForm(actor);
  const previousNames = previous?.flags?.[SYSTEM_ID]?.itFormNames ?? [];

  // ECHOED FORM, asked as the form changes ("Trigger: You change from one
  // Combat Form to another … retain one passive benefit from the previous
  // form for 3 rounds"). A Flourish.
  let echo = null;
  if (previousNames.length && ownedNamed(actor, "Echoed Form") && norm(previousNames.join()) !== norm(names.join())) {
    const action = { key: "echoedform", name: "Echoed Form", traits: "Flourish" };
    const quiet = await h().traitCheck(actor, action);
    if (!quiet?.blocked) {
      const choices = [["", "Keep nothing"]];
      for (const n of previousNames) {
        const f = knownForms(actor).find((x) => norm(x.name) === norm(n));
        (f?.flags?.[SYSTEM_ID]?.itForm?.parts ?? []).forEach((p, i) => choices.push([`${n}|${i}`, `${n}: ${p.label}`]));
      }
      const pick = await h().chooseFromList("Echoed Form", "Keep one benefit of the form you leave, for 3 rounds", choices);
      if (pick) {
        const [n, i] = String(pick).split("|");
        const f = knownForms(actor).find((x) => norm(x.name) === norm(n));
        const part = f?.flags?.[SYSTEM_ID]?.itForm?.parts?.[int(i)];
        if (part) { echo = { name: n, part }; await h().recordTraitUsage(actor, action); }
      }
    }
  }

  const parts = forms.flatMap((f) => f.flags[SYSTEM_ID].itForm.parts);
  const flags = { ...mergeFormFlags(parts), itFormNames: forms.map((f) => f.name) };
  const name = formStanceName(flags.itFormNames);
  const benefits = parts.map((p) => esc(p.label)).join("; ");
  const entered = await h().enterStance(actor, forms.length === 1 ? forms[0] : (ownedNamed(actor, "Blended Form") ?? forms[0]), {
    name, apCost, waiveWait,
    description: `${name}: ${parts.map((p) => p.label).join("; ")}. All its modifiers are class bonuses.`,
    flags,
    extraLines: [h().line(benefits)]
  });
  if (!entered) return false;
  if (spendCombatForm) await spendUse(combatForm, "Combat Form");
  const stance = activeForm(actor);

  // STEEL VIPER'S INITIATIVE, "applied retrospectively": entering in combat
  // raises the current initiative; leaving lowers it again (onEffectDeletedB4).
  if (stance && game.combat?.started) {
    const shift = flags.itSteelViperInitiative ? steelViperShift(intOf(actor)) : 0;
    const applied = await settleViper(actor, shift);
    if (applied > 0) await card(actor, "Steel Viper", [`Your initiative rises by <strong>${applied}</strong> (5 × Intelligence) while you hold the form.`]);
  }
  if (echo) {
    const data = made("echoedForm", { name: `Echoed Form: ${echo.name} (${echo.part.label})`, description: `Echoed Form: ${echo.part.label}, kept from ${echo.name} for 3 rounds.`, system: { ...echo.part.flags } }, forRounds(actor, 3));
    await putEffect(actor, "echoedForm", data);
    await card(actor, "Echoed Form", [`You keep <strong>${esc(echo.name)}: ${esc(echo.part.label)}</strong> for 3 rounds.`]);
  }
  return true;
}

/**
 * Steel Viper's shift, kept on the combatant: the initiative moves by the
 * difference between the shift wanted now and the one already applied, so
 * entering, changing and leaving the form always end where they should.
 * Resolves the rise applied (0 when none).
 */
async function settleViper(actor, wanted) {
  const combat = game.combat?.started ? game.combat : null;
  const combatant = combat?.combatants?.find?.((c) => c.actor?.uuid === actor?.uuid);
  if (!combatant || combatant.initiative === null || combatant.initiative === undefined) return 0;
  const current = int(combatant.getFlag?.(MODULE_ID, "viperShift"));
  const delta = int(wanted) - current;
  if (!delta) return 0;
  await combatant.update({ initiative: Number(combatant.initiative) + delta, [`flags.${MODULE_ID}.viperShift`]: int(wanted) });
  return Math.max(0, delta);
}

const combatForm = {
  hint: "Learn your forms, then 1 AP: enter one (a stance); Combat Form is expended until a Refocus.",
  // ITS OWN FOCUS USE (0.5.1, core 3.668.1; found in the 0.5.0 live test):
  // learning a form is free and allowed while expended; entering one is
  // gated on the use (focusReady) and spends it (enterForm). Without this
  // the core's Use button spent the use on the learning card.
  ownsFocusUse: true,
  async use(actor, item) {
    const owed = combatFormsOwed(levelOf(actor), countNamed(actor, "Extra Form")) - knownForms(actor).length;
    if (owed > 0) return learnForm(actor, item, owed);
    const current = activeForm(actor)?.flags?.[SYSTEM_ID]?.itFormNames ?? [];
    const options = knownForms(actor).filter((f) => !(current.length === 1 && norm(current[0]) === norm(f.name))).map((f) => [f.name, f.name]);
    const blend = blendOf(actor);
    if (blend && !(current.length === 2)) options.push([blend.join("|"), `Blended Form: ${blend.join(" + ")}`]);
    if (!options.length) { ui.notifications.warn("Combat Form: no other form to enter."); return false; }
    if (!(await focusReady(item, "Combat Form"))) return false;
    const pick = await h().chooseFromList("Combat Form", "Enter a form (1 AP)", options);
    if (!pick) return false;
    return enterForm(actor, String(pick).split("|"));
  }
};

/** A form's own Use: enter it (Black Lotus also holds a blow when in it). */
function formItemUse(name) {
  return {
    hint: `Enter ${name} through Combat Form (1 AP; expends Combat Form).`,
    async use(actor) {
      const owed = combatFormsOwed(levelOf(actor), countNamed(actor, "Extra Form")) - knownForms(actor).length;
      if (owed > 0) { ui.notifications.info("Combat Form: learn the forms you are owed first (Combat Form's Use)."); return false; }
      return enterForm(actor, [name]);
    }
  };
}

const blackLotus = {
  hint: "In the form, once per round: Strike holding the blow — its critical and damage land at the start of the target's turn. Otherwise: enter the form.",
  async use(actor, item) {
    if (!inForm(actor, "itBlackLotus")) return formItemUse("Black Lotus").use(actor, item);
    if (usedNow(actor.getFlag(MODULE_ID, "blackLotus"))) { ui.notifications.warn("Black Lotus: once per round."); return false; }
    const pending = actor.getFlag(SYSTEM_ID, "heldStrike");
    if (pending && pending.combatId && pending.combatId === (game.combat?.started ? game.combat.id : "")) { ui.notifications.warn("Black Lotus: a held blow is still waiting to land."); return false; }
    // A blow held in a combat that has ended never lands.
    if (pending) await actor.unsetFlag(SYSTEM_ID, "heldStrike");
    const weapon = await pickWeapon(actor, "Black Lotus", meleeWeapons(actor));
    if (!weapon) return false;
    const check = await h().rollWeaponAttack(actor, weapon, { holdDamage: true, optionLabel: "Black Lotus" });
    if (!check) return false;
    const stamp = roundStamp();
    if (stamp) await actor.setFlag(MODULE_ID, "blackLotus", stamp);
    return true;
  }
};

/** At the start of a creature's turn: any blow held against it is offered to land. */
async function offerHeldBlows(next, combat) {
  for (const c of combat.combatants ?? []) {
    const attacker = c.actor;
    const record = attacker?.getFlag?.(SYSTEM_ID, "heldStrike");
    if (!record || !(await h().heldStrikeDue(record, { actorUuid: next.uuid, combatId: combat.id }))) continue;
    // POSTED WHERE THE ATTACKER IS PLAYED, so its player owns the card and
    // can mark it used when they press it.
    await offerTo(attacker, "heldBlowCard", { record, nextName: next.name });
  }
}

/** The "Land the blow" card, on the attacker's own client. */
async function postHeldBlowCard(attacker, { record, nextName }) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: attacker }),
    content: `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${esc(attacker.name)}</span><h3>${esc(record.label)}</h3></div></header>`
      + `<p style="margin:2px 0">${esc(nextName)}'s turn begins: the held blow with <strong>${esc(record.weaponName)}</strong> lands now${record.critical ? ` — a <strong>${esc(record.critical)}</strong> critical` : ""}.</p>`
      + `<p style="margin:6px 0 2px"><button type="button" data-it-action="landHeldStrike">Land the blow</button></p></div>`,
    flags: { [MODULE_ID]: { landHeldStrike: { actorUuid: attacker.uuid } } }
  });
}

/** The "Land the blow" button. */
export async function pressLandHeldStrike(message) {
  const raw = message?.getFlag?.(MODULE_ID, "landHeldStrike");
  if (!raw || raw.used) return false;
  const actor = await actorFrom(raw.actorUuid);
  if (!actor?.isOwner) { ui.notifications.warn("Only the attacker's owner can land the blow."); return false; }
  const landed = await h().landHeldStrike(actor);
  if (message.isOwner) await message.setFlag(MODULE_ID, "landHeldStrike", { ...raw, used: true });
  return landed;
}

const flowStrike = passive("Offered when your melee or thrown Strike hits and a Flourish is still open this turn: another Strike against the same target at your third-attack penalty, not counted towards your penalty.");

const weaponDiscipline = {
  hint: "Choose your weapon group (1st level): class bonus − 1 to attack and damage, and Finesse in one hand.",
  async use(actor, item) {
    const chosen = item.flags?.[SYSTEM_ID]?.itDiscipline;
    if (chosen) { ui.notifications.info(`Weapon Discipline: ${chosen}. Changing it is the GM's: delete the ability and add it again.`); return false; }
    const pick = await h().chooseFromList("Weapon Discipline", "Your weapon group", WEAPON_DISCIPLINE_GROUPS.map((g) => [g, g]));
    if (!pick) return false;
    const flags = weaponDisciplineFlags(pick);
    await item.update(Object.fromEntries(Object.entries(flags).map(([k, v]) => [`flags.${SYSTEM_ID}.${k}`, v])));
    await card(actor, "Weapon Discipline", [`<strong>${esc(pick)}</strong>: your class bonus − 1 (now ${Math.max(0, int(actor.system?.identity?.classBonus) - 1)}) to attack and damage rolls, applied for you, and the weapon gains <strong>Finesse</strong> when wielded in one hand.`,
      "<em>You count as having a free hand for Disarm and Shove: the system does not check free hands, so nothing more is needed.</em>"]);
    return true;
  }
};

const blendedForm = {
  hint: "Choose two of your forms to merge: Combat Form then also offers the blend, with both forms' benefits.",
  async use(actor, item) {
    const current = item.flags?.[SYSTEM_ID]?.itBlend;
    if (Array.isArray(current) && current.length === 2 && !ownedNamed(actor, "Fluid Blending")) {
      ui.notifications.info(`Blended Form: ${current.join(" + ")}. Fluid Blending lets you choose again at daily preparation.`);
      return false;
    }
    const forms = knownForms(actor);
    if (forms.length < 2) { ui.notifications.warn("Blended Form: learn two forms first."); return false; }
    const first = await h().chooseFromList("Blended Form", "First form", forms.map((f) => [f.name, f.name]));
    if (!first) return false;
    const second = await h().chooseFromList("Blended Form", "Second form", forms.filter((f) => f.name !== first).map((f) => [f.name, f.name]));
    if (!second) return false;
    await item.update({ [`flags.${SYSTEM_ID}.itBlend`]: [first, second] });
    await card(actor, "Blended Form", [`Your blend: <strong>${esc(first)} + ${esc(second)}</strong>. Combat Form now offers it, with the benefits of both.`]);
    return true;
  }
};

const formlessCut = {
  hint: "Flourish (1 AP): one melee Strike at +4 that ignores the target's stance and form bonuses, adds your Int as damage and treats it as flat-footed.",
  async use(actor) {
    const action = { key: "formlesscut", name: "Formless Cut", traits: "Attack, Flourish" };
    if (!firstTarget()) { ui.notifications.warn("Formless Cut: target the creature first."); return false; }
    if (!(await h().traitGate(actor, action, "Formless Cut"))) return false;
    const weapon = await pickWeapon(actor, "Formless Cut", meleeWeapons(actor));
    if (!weapon) return false;
    const check = await h().rollWeaponAttack(actor, weapon, {
      skipTargetPrompt: true,
      extraModifiers: [{ label: "Formless Cut", value: 4, type: "untyped" }],
      ignoreTargetStance: true, treatAsFlatFooted: true,
      extraFlatDamage: Math.max(0, intOf(actor)),
      optionLabel: "Formless Cut"
    });
    if (!check) return false;
    await h().recordTraitUsage(actor, action);
    return true;
  }
};

const formReversal = passive("Offered when a creature misses you with a melee attack: your reaction changes your form at once, without Combat Form.");
const echoedForm = passive("Asked when you change form through Combat Form: keep one benefit of the previous form for 3 rounds.");
const perfectTempo = passive("Offered when your Flow Strike hits: a Step, and +1 on your next attack this turn against a different enemy you end beside.");

/* ------------------------------------------------------------------ */
/* Oathblade: Challenge and the oaths                                   */
/* ------------------------------------------------------------------ */

/** The Oathblade's running Challenge effect, if any. */
const challengeOf = (actor) => ownEffects(actor, "challenge").find((e) => !e.disabled) ?? null;
/** The challenged creature's uuid. */
const challengedUuid = (actor) => challengeOf(actor)?.getFlag?.(MODULE_ID, "challenge")?.targetUuid ?? null;
/** The oath the Oathblade swore, by name. */
const oathOf = (actor) => Array.from(actor?.items ?? []).find((i) => i.flags?.[SYSTEM_ID]?.itOath)?.flags?.[SYSTEM_ID]?.itOath ?? null;
/** The Sworn Charge, if Oath of Fealty names one. */
const swornChargeOf = (actor) => Array.from(actor?.items ?? []).find((i) => i.flags?.[SYSTEM_ID]?.itOath === "Oath of Fealty")?.flags?.[SYSTEM_ID]?.itSwornCharge ?? null;

/**
 * Challenge a creature: the Oathblade's effect, its oath's own effects on
 * whoever they belong to (each tagged with this challenge's id so they end
 * with it), and Formal Declaration's Demoralise.
 */
async function challengeTarget(actor, target, { apCost = 1, label = "Challenge" } = {}) {
  const item = ownedNamed(actor, "Challenge");
  const id = foundry.utils.randomID();
  const combat = combatFor(actor);
  const bound = combat ? { system: {}, module: { combatId: combat.id } } : { system: {}, module: {} };
  if (apCost > 0 && !(await spendAP(actor, label, apCost))) return false;
  if (!(await spendUse(item, "Challenge"))) return false;
  const oath = oathOf(actor);
  const flags = challengeFlags({ targetUuid: target.uuid, targetName: target.name, distantHonour: Boolean(ownedNamed(actor, "Distant Honour")), guarded: Boolean(ownedNamed(actor, "Guarded Commitment")) });
  // THE OLD CHALLENGE ENDS FIRST ("using it again immediately ends your
  // previous Challenge"); its oath effects end with it (onChallengeEnded).
  await safeDelete(actor, ownEffects(actor, "challenge").map((e) => e.id));
  await h().createEffectsOn(actor, [made("challenge", {
    name: `Challenge: ${target.name}`,
    description: `Challenge: your class bonus to melee attack and damage against ${target.name}, Armour Rending equal to your class bonus; −${ownedNamed(actor, "Guarded Commitment") ? 1 : 2} circumstance to DB against everyone else.`,
    system: flags,
    module: { challenge: { id, targetUuid: target.uuid, targetName: target.name, oath }, ...bound.module },
    img: item?.img
  }, bound)]);
  const lines = [`You challenge <strong>${esc(target.name)}</strong>: your class bonus (<strong>+${int(actor.system?.identity?.classBonus)}</strong>) to melee attack and damage against it and <strong>AR ${int(actor.system?.identity?.classBonus)}</strong>, all applied for you${ownedNamed(actor, "Distant Honour") ? " (and with a bow within its first range increment)" : ""}.`,
    `<strong>−${ownedNamed(actor, "Guarded Commitment") ? 1 : 2} circumstance</strong> to your DB against every other creature.`];
  const partner = (bearer, key, name, system) => h().createEffectsOn(bearer, [made(key, { name, description: name, system, module: { itChallengePartner: id, ...bound.module } }, bound)]);
  if (oath === "Oath of Honour") {
    await armHonour(actor, target, id);
    lines.push("<strong>Oath of Honour:</strong> +2 circumstance to DB against it, and advantage on your first melee Strike against it each round, while none of your allies is adjacent to it.");
  } else if (oath === "Oath of Guardianship") {
    await partner(target, "guardianshipTarget", `Oath of Guardianship (${actor.name}): −2 against others`, guardianshipTargetFlags(actor.uuid, actor.name));
    lines.push(`<strong>Oath of Guardianship:</strong> ${esc(target.name)} takes −2 circumstance on attacks against anyone but you.`);
    if (ownedNamed(actor, "Shelter Under Oath")) {
      for (const ally of alliesOf(actor)) await partner(ally, "shelter", `Shelter Under Oath (${actor.name})`, shelterFlags(target.uuid, target.name));
      lines.push("<strong>Shelter Under Oath:</strong> your allies gain +2 circumstance to saves against its effects. <em>Being within 30 feet of you is the GM's.</em>");
    }
  } else if (oath === "Oath of Vengeance") {
    lines.push("<strong>Oath of Vengeance:</strong> the first time each round it damages you or an ally, you gain Retribution.");
  } else if (oath === "Oath of Fealty") {
    const charge = swornChargeOf(actor);
    const chargeActor = charge ? await actorFrom(charge.uuid) : null;
    if (chargeActor) {
      await partner(chargeActor, "fealtyCharge", `Oath of Fealty (${actor.name}): against ${target.name}`, fealtyChargeFlags(target.uuid, target.name));
      lines.push(`<strong>Oath of Fealty:</strong> ${esc(chargeActor.name)} gains +1 circumstance to attack checks and AR 1 against it. <em>Conscious and within 30 feet of you: the GM's.</em>`);
    } else lines.push("<strong>Oath of Fealty:</strong> <em>no Sworn Charge named — choose one with Oath of Fealty's Use.</em>");
  }
  await card(actor, label, [...lines, `<em>${apCost ? "1 AP and " : ""}Challenge's use spent. It ends when the target is killed, drops to 0 HP or falls unconscious, the combat ends, or you Challenge another; delete the effect if it surrenders.</em>`]);
  if (ownedNamed(actor, "Formal Declaration")) await formalDeclaration(actor, target);
  return true;
}

/** Your allies on the canvas (the same disposition, not you). */
function alliesOf(actor) {
  const mine = tokenOf(actor);
  if (!mine) return [];
  return (canvas?.tokens?.placeables ?? []).filter((t) => t.actor && t.actor !== actor && t.document.disposition === mine.document.disposition).map((t) => t.actor);
}

/** Is any of the Oathblade's allies adjacent to the target? null when this screen's board cannot say. */
async function allyAdjacent(actor, target) {
  const tt = tokenOf(target);
  if (!tt || !tokenOf(actor)) return null;
  for (const ally of alliesOf(actor)) {
    const at = tokenOf(ally);
    if (at && (await h().distanceBetween(at, tt)) <= 5) return true;
  }
  return false;
}

/** Oath of Honour's two effects, laid when no ally is adjacent. */
async function armHonour(actor, target, challengeId) {
  if ((await allyAdjacent(actor, target)) !== false) return false;
  const combat = combatFor(actor);
  const bound = combat ? { system: {}, module: { combatId: combat.id } } : { system: {}, module: {} };
  await putEffect(actor, "honourDefence", made("honourDefence", { name: `Oath of Honour: +2 DB vs ${target.name}`, description: "Oath of Honour: +2 circumstance to DB against your challenged target.", system: honourDefenceFlags(target.uuid, target.name), module: { itChallengePartner: challengeId } }, bound));
  await putEffect(actor, "honourStrike", made("honourStrike", {
    name: `Oath of Honour: advantage vs ${target.name}`, description: "Oath of Honour: advantage on your first melee Strike against your challenged target this round.",
    system: honourStrikeFlags(target.uuid, target.name), module: { itNextStrike: { targetUuid: target.uuid, melee: true }, itChallengePartner: challengeId }
  }, bound));
  return true;
}

/** Honour suppressed: "these benefits are suppressed until the beginning of your next turn". */
async function suppressHonourHere(actor) {
  const ids = [...ownEffects(actor, "honourDefence"), ...ownEffects(actor, "honourStrike")].map((e) => e.id);
  if (!ids.length) return;
  await safeDelete(actor, ids);
  await card(actor, "Oath of Honour", ["An ally has joined the duel: Oath of Honour is <strong>suppressed</strong> until the start of your next turn."]);
}

async function formalDeclaration(actor, target) {
  const combat = combatFor(actor);
  const record = actor.getFlag(MODULE_ID, "formalDeclaration") ?? {};
  const immune = record.combatId === (combat?.id ?? "") ? record.uuids ?? [] : [];
  if (immune.includes(target.uuid)) return;
  const yes = await confirm("Formal Declaration", `<p>Attempt a <strong>Demoralise</strong> against <strong>${esc(target.name)}</strong> as part of the Challenge (no AP)? It is then immune to Formal Declaration until the encounter ends.</p>`);
  if (!yes) return;
  const action = h().skillActions.find((a) => a.key === "demoralise");
  if (!action) return;
  await putEffect(actor, "formalDeclaration", made("formalDeclaration", {
    name: "Formal Declaration (+2)", description: "Formal Declaration: +2 circumstance to this Demoralise if the target can clearly hear and understand you.",
    system: { conditionals: [{ kind: "modifier", value: 2, type: "circumstance", label: "Formal Declaration", scope: "The target can clearly hear and understand your declaration — tick if so", auto: false, oneShot: true, when: { actions: ["demoralise"] } }] }
  }, forSeconds(60)));
  targetOnly(target);
  await h().resolveAction(actor, { ...action, apCost: "0", variantNote: "Formal Declaration: part of the Challenge." });
  await actor.setFlag(MODULE_ID, "formalDeclaration", { combatId: combat?.id ?? "", uuids: [...immune, target.uuid] });
}

const challenge = {
  hint: "Flourish (1 AP): challenge the targeted creature — class bonus to melee attack, damage and AR against it; −2 DB against everyone else.",
  async use(actor, item) {
    const target = firstTarget();
    if (!target || target === actor) { ui.notifications.warn("Challenge: target the creature you challenge first."); return false; }
    const action = { key: "challenge", name: "Challenge", traits: "Flourish, Focus, Mental, Technique" };
    if (!(await h().traitGate(actor, action, "Challenge"))) return false;
    if (!(await focusReady(item, "Challenge"))) return false;
    const done = await challengeTarget(actor, target);
    if (done) await h().recordTraitUsage(actor, action);
    return done;
  }
};

/** Claim the Next Foe, offered when a challenge ends by a disabling blow (or pressed for a surrender). */
async function claimNextFoe(actor) {
  const claim = ownedNamed(actor, "Claim the Next Foe");
  const item = ownedNamed(actor, "Challenge");
  if (!claim || !item) return false;
  if (!(await focusReady(claim, "Claim the Next Foe"))) return false;
  const action = { key: "claimthenextfoe", name: "Claim the Next Foe", traits: "Flourish, Focus" };
  if (!(await h().traitGate(actor, action, "Claim the Next Foe"))) return false;
  const target = firstTarget();
  if (!target || target === actor || target.uuid === challengedUuid(actor)) { ui.notifications.warn("Claim the Next Foe: target the next creature you challenge, then press again."); return false; }
  if (!(await spendUse(claim, "Claim the Next Foe"))) return false;
  const max = h().itemUsesMax(item);
  if (max !== null && max !== Infinity) await item.update({ "system.usesValue": max });
  await h().recordTraitUsage(actor, action);
  return challengeTarget(actor, target, { apCost: 0, label: "Claim the Next Foe" });
}

const claimTheNextFoe = {
  hint: "Free when you disable your challenged foe (offered) or it surrenders (press): Challenge is restored and you Challenge another at no AP.",
  use: (actor) => claimNextFoe(actor)
};

const oathOfFealty = {
  hint: "Name your Sworn Charge (asked at each daily preparation).",
  use: (actor, item) => chooseSwornCharge(actor, item)
};

async function chooseSwornCharge(actor, item) {
  const others = new Map();
  for (const a of game.actors ?? []) if (a !== actor && a.hasPlayerOwner && a.type === actor.type) others.set(a.uuid, a.name);
  for (const a of alliesOf(actor)) others.set(a.uuid, a.name);
  if (!others.size) { ui.notifications.warn("Oath of Fealty: no willing ally to name — another player character, or an allied token on the scene."); return false; }
  const pick = await h().chooseFromList("Oath of Fealty", "Your Sworn Charge (until a later daily preparation)", Array.from(others.entries()));
  if (!pick) return false;
  await item.update({ [`flags.${SYSTEM_ID}.itSwornCharge`]: { uuid: pick, name: others.get(pick) } });
  await card(actor, "Oath of Fealty", [`<strong>${esc(others.get(pick))}</strong> is your Sworn Charge.`]);
  return true;
}

/** Daily preparation: Oath of Fealty's charge; Fluid Blending's reminder. */
export async function onDailyPreparationB4({ actor } = {}) {
  if (!actor) return;
  const asks = Array.from(actor.items ?? []).some((i) => i.flags?.[SYSTEM_ID]?.itOath === "Oath of Fealty") || (ownedNamed(actor, "Fluid Blending") && blendOf(actor));
  if (asks) await offerTo(actor, "dailyPrep", {});
}

async function dailyPrepQuestions(actor) {
  const fealty = Array.from(actor.items ?? []).find((i) => i.flags?.[SYSTEM_ID]?.itOath === "Oath of Fealty");
  if (fealty) {
    const current = fealty.flags?.[SYSTEM_ID]?.itSwornCharge;
    const keep = current ? await confirm("Oath of Fealty", `<p>Your Sworn Charge is <strong>${esc(current.name)}</strong>. Keep them? (No chooses another.)</p>`) : false;
    if (!keep) await chooseSwornCharge(actor, fealty);
  }
  if (ownedNamed(actor, "Fluid Blending") && blendOf(actor)) {
    const change = await confirm("Fluid Blending", `<p>Change your blended forms (${esc(blendOf(actor).join(" + "))})?</p>`);
    if (change) await blendedForm.use(actor, ownedNamed(actor, "Blended Form"));
  }
}

/* ------------------------------------------------------------------ */
/* After a Strike (TRG Prime's trgPrimeStrikeResolved)                  */
/* ------------------------------------------------------------------ */

export async function onStrikeResolved(ctx = {}) {
  const { attacker, target, weapon, hits, critical, melee, thrown, isReaction, optionLabel, held, damageTaken } = ctx;
  if (!attacker || !target) return;
  // A MISS, as the system announces it (0.7.0): not an attack never
  // resolved, nor a hit that lands nothing.
  const missed = missedHere(ctx);
  // THE NEXT-STRIKE BONUSES this Strike was for go now (Retribution,
  // Guardianship, Fealty's +2, Honour's first Strike, Echoing Crane, …).
  const spent = Array.from(attacker.effects ?? []).filter((e) => nextStrikeSpent(e.getFlag?.(MODULE_ID, "itNextStrike"), { targetUuid: target.uuid, melee, hits: hits || held, damageTaken })).map((e) => e.id);
  if (spent.length) await asOwner(attacker, "deleteEffects", { ids: spent });

  if (attacker.isOwner) {
    // Ember Reaver counts this hit before any Flow Strike adds another.
    if (inForm(attacker, "itEmberSecondHit") && hits && !held) await emberHit(attacker);
    if (hits && !isReaction && (melee || thrown) && optionLabel !== "Flow Strike" && ownedNamed(attacker, "Flow Strike")) await offerFlowStrike(attacker, target, weapon);
    if (hits && optionLabel === "Flow Strike" && ownedNamed(attacker, "Perfect Tempo")) await offerPerfectTempo(attacker, target);
    if (missed && !held && inForm(attacker, "itSteelViperMiss") && !usedNow(attacker.getFlag(MODULE_ID, "steelViper"))) await offerSteelViper(attacker, target, weapon);
    if (hits && critical && melee && inForm(attacker, "itCrashingTide")) {
      const dc = techniqueDC(intOf(attacker), levelOf(attacker));
      await card(attacker, "Crashing Tide", [`A critical hit: you may <strong>push ${esc(target.name)} 5 feet</strong>. It negates with a <strong>Fortitude save against DC ${dc}</strong> (your Technique DC).`, "<em>Roll its save and move its token by hand.</em>"]);
    }
    await sharedPurpose(attacker, target, hits && critical);
  }

  // A MISS AGAINST A DEFENDER: Echoing Crane, Form Reversal, Shadow Counter.
  if (missed && !held) {
    if (inForm(target, "itEchoingCrane")) {
      await h().createEffectsOn(target, [made("echoingCrane", {
        name: "Echoing Crane (+1 next attack)", description: "Echoing Crane: +1 to your next weapon attack roll this round.",
        system: nextAttackBonusFlags({ value: 1, type: "class", label: "Echoing Crane", scope: "Your next weapon attack roll this round" }),
        module: { itNextStrike: { targetUuid: null } }
      }, untilRoundEnds(target))]);
    }
    // EACH ASKED ONLY WHEN ITS REACTION COULD BE SPENT (0.6.2), read with its
    // own traits: Battle Readiness's extra reaction takes an Attack or
    // Martial one only.
    if (melee && ownedNamed(target, "Form Reversal") && activeForm(target) && await reactionOpen(target, "Form Reversal")) await offerTo(target, "formReversal", { attackerName: attacker.name });
    if (ownedNamed(target, "Shadow Counter") && await reactionOpen(target, "Shadow Counter")) await offerTo(target, "shadowCounter", { attackerUuid: attacker.uuid, attackerName: attacker.name });
  }
}

async function offerFlowStrike(attacker, target, weapon) {
  const action = { key: "flowstrike", name: "Flow Strike", traits: "Attack, Flourish" };
  const quiet = await h().traitCheck(attacker, action);
  if (quiet?.blocked) return;
  const gale = inForm(attacker, "itGaleCutter");
  const penalty = flowStrikePenalty(await h().mapPenalty(attacker, weapon, 2), gale);
  const follow = Boolean(ownedNamed(attacker, "Disciplined Follow-Through"));
  const yes = await confirm(`Flow Strike — ${attacker.name}`, `<p>You hit <strong>${esc(target.name)}</strong>. Use <strong>Flow Strike</strong> (a Flourish, 0 AP): another Strike against it at <strong>${penalty}</strong>${gale ? " (Gale Cutter)" : ""}, not counted towards your multiple attack penalty${follow ? ", +2 damage if it hits (Disciplined Follow-Through)" : ""}?</p>`);
  if (!yes) return;
  await h().recordTraitUsage(attacker, action);
  targetOnly(target);
  await h().rollWeaponAttack(attacker, weapon, {
    apPaid: true, skipTargetPrompt: true, mapOverride: penalty, mapFrozen: true,
    extraFlatDamage: follow ? 2 : 0, optionLabel: "Flow Strike"
  });
}

async function offerPerfectTempo(attacker, target) {
  const yes = await confirm(`Perfect Tempo — ${attacker.name}`, "<p>Your Flow Strike hit. Take a <strong>Step</strong> (0 AP)? Ending beside a different enemy, your next attack against it this turn gains +1.</p>");
  if (!yes) return;
  await h().armMove(attacker, { maxFeet: 5, speedKey: "land", provokes: false, note: "Perfect Tempo: a Step." }, "Perfect Tempo");
  await putEffect(attacker, "perfectTempo", made("perfectTempo", {
    name: "Perfect Tempo (+1)", description: "Perfect Tempo: +1 to your next attack this turn against a different enemy you Stepped beside.",
    system: nextAttackBonusFlags({ value: 1, type: "untyped", label: "Perfect Tempo", scope: "A different enemy you Stepped beside — tick if so", notTargetUuid: target.uuid, auto: false }),
    module: { itNextStrike: { notTargetUuid: target.uuid } }
  }, untilEndOfTurn(attacker)));
  await card(attacker, "Perfect Tempo", ["<strong>Step 5 feet</strong> — move your token. Your next attack this turn against a <strong>different enemy</strong> you end beside gains <strong>+1</strong> (offered as a tick)."]);
}

async function offerSteelViper(attacker, target, weapon) {
  const yes = await confirm(`Steel Viper — ${attacker.name}`, `<p>You missed <strong>${esc(target.name)}</strong>. Roll the damage and deal it as <strong>half damage</strong> (once per round)?</p>`);
  if (!yes) return;
  const stamp = roundStamp();
  if (stamp) await attacker.setFlag(MODULE_ID, "steelViper", stamp);
  await h().rollWeaponDamage(attacker, weapon, { preset: { glancing: true, targetToken: tokenOf(target), note: `Steel Viper: the miss still cuts — half damage to ${target.name}.` } });
}

/** Ember Reaver: the hits this round, and the rider for the second. */
async function emberHit(actor) {
  const combat = game.combat?.started ? game.combat : null;
  if (!combat) return;
  const record = actor.getFlag(MODULE_ID, "emberHits");
  const hits = usedThisRound(record, combat.id, combat.round) ? int(record.hits) + 1 : 1;
  await actor.setFlag(MODULE_ID, "emberHits", { combatId: combat.id, round: int(combat.round), hits });
  if (hits !== 1) return;
  const fire = Math.max(0, intOf(actor));
  if (!fire) return;
  await putEffect(actor, "emberSecond", made("emberSecond", {
    name: `Ember Reaver (+${fire} fire on the second hit)`, description: `Ember Reaver: your second hit this round adds ${fire} secondary fire damage.`,
    system: { strikeRider: { dice: String(fire), flat: true, damageType: "fire", scope: "any", label: "Ember Reaver", once: true, spendOnHit: true } }
  }, untilRoundEnds(actor)));
}

/** Shared Purpose: a critical on the challenged target by the Oathblade or the Sworn Charge. */
async function sharedPurpose(attacker, target, crit) {
  if (!crit) return;
  for (const oathblade of creaturesHere()) {
    if (!ownedNamed(oathblade, "Shared Purpose") || challengedUuid(oathblade) !== target.uuid) continue;
    const charge = swornChargeOf(oathblade);
    if (!charge) continue;
    const partner = attacker === oathblade ? await actorFrom(charge.uuid) : (attacker.uuid === charge.uuid ? oathblade : null);
    if (!partner) continue;
    if (usedNow(oathblade.getFlag(MODULE_ID, "sharedPurpose"))) continue;
    const stamp = roundStamp();
    if (stamp) await asOwner(oathblade, "setFlag", { key: "sharedPurpose", value: stamp });
    await offerTo(partner, "sharedPurpose", { targetUuid: target.uuid, targetName: target.name });
  }
}

/* ---------------- the offers made on the defender's (or partner's) screen ---------------- */

const OFFERS = {
  async formReversal(actor, { attackerName }) {
    const current = activeForm(actor)?.flags?.[SYSTEM_ID]?.itFormNames ?? [];
    const options = knownForms(actor).filter((f) => !(current.length === 1 && norm(current[0]) === norm(f.name))).map((f) => [f.name, f.name]);
    const blend = blendOf(actor);
    if (blend && current.length !== 2) options.push([blend.join("|"), `Blended Form: ${blend.join(" + ")}`]);
    if (!options.length) return;
    const pick = await h().chooseFromList(`Form Reversal — ${actor.name}`, `${attackerName} missed you. Change form at once (your reaction)?`, [["", "No"], ...options]);
    if (!pick || !(await spendReaction(actor, "Form Reversal"))) return;
    await enterForm(actor, String(pick).split("|"), { apCost: 0, waiveWait: true, spendCombatForm: false });
  },
  async shadowCounter(actor, { attackerUuid, attackerName }) {
    const attacker = await actorFrom(attackerUuid);
    if (!attacker) return;
    const yes = await confirm(`Shadow Counter — ${actor.name}`, `<p>${esc(attackerName)} missed you. Use <strong>Shadow Counter</strong> (your reaction): Step 5 feet without triggering reactions, then Feint against ${esc(attackerName)}?</p>`);
    if (!yes || !(await spendReaction(actor, "Shadow Counter"))) return;
    await h().armMove(actor, { maxFeet: 5, speedKey: "land", provokes: false, note: "Shadow Counter: a Step that triggers no reactions." }, "Shadow Counter");
    const feint = h().skillActions.find((a) => a.key === "feint");
    if (feint && targetOnly(attacker)) await h().resolveAction(actor, { ...feint, apCost: "0", variantNote: "Shadow Counter: part of the reaction. If it lands, it is your own Deception, so it enables Unseen Assault." });
    await card(actor, "Shadow Counter", ["<strong>Step 5 feet</strong> — move your token (no reactions). A Feint that landed leaves the attacker flat-footed to your next Strike before the end of your next turn, and enables Unseen Assault."]);
  },
  async sharedPurpose(actor, { targetUuid, targetName }) {
    const yes = await confirm(`Shared Purpose — ${actor.name}`, `<p>A critical hit on <strong>${esc(targetName)}</strong>. Step 5 feet (free, no reactions) and gain advantage on your next attack against it before the end of your next turn?</p>`);
    if (!yes) return;
    await h().armMove(actor, { maxFeet: 5, speedKey: "land", provokes: false, note: "Shared Purpose: a free Step." }, "Shared Purpose");
    await putEffect(actor, "sharedPurpose", made("sharedPurpose", {
      name: `Shared Purpose: advantage vs ${targetName}`, description: "Shared Purpose: advantage on your next attack against the challenged target before the end of your next turn.",
      system: { conditionals: [{ kind: "advantage", label: "Shared Purpose", scope: `Your next attack against ${targetName}`, auto: true, when: { checkTypes: ["attack"], targetUuids: [targetUuid] } }] },
      module: { itNextStrike: { targetUuid } }
    }, untilEndOfNextTurn(actor)));
  },
  dailyPrep: (actor) => dailyPrepQuestions(actor),
  heldBlowCard: (actor, payload) => postHeldBlowCard(actor, payload),
  async claimNextFoe(actor, { fallenName }) {
    const yes = await confirm(`Claim the Next Foe — ${actor.name}`, `<p>${esc(fallenName)} is down. <strong>Claim the Next Foe</strong>: target the next creature, then press Yes — Challenge is restored and used on it at no AP.</p>`);
    if (yes) await claimNextFoe(actor);
  }
};

/* ------------------------------------------------------------------ */
/* Before a Strike's outcome (trgPrimeStrikeRolled)                     */
/* ------------------------------------------------------------------ */

export async function onStrikeRolled({ attacker, target } = {}) {
  if (!attacker) return;
  // The arts that end when you attack: Veiled Body, Shadow Double, Hollow Breath.
  const ending = Array.from(attacker.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, "endsOnStrike") || e.getFlag?.(MODULE_ID, SRC) === "hollowBreath").map((e) => e.id);
  if (ending.length) await asOwner(attacker, "deleteEffects", { ids: ending });
  if (ownEffects(attacker, "emptyPresence").length) await asOwner(attacker, "emptyPresenceSeen");
  // OATH OF HONOUR: "If one of your allies … attacks your challenged target, these benefits are suppressed".
  if (target) {
    for (const oathblade of creaturesHere()) {
      if (oathblade === attacker || challengedUuid(oathblade) !== target.uuid || !ownEffects(oathblade, "honourDefence").length) continue;
      if (allied(oathblade, attacker)) await asOwner(oathblade, "suppressHonour");
    }
  }
}

/* ------------------------------------------------------------------ */
/* Damage (trgPrimeDamageApplied)                                       */
/* ------------------------------------------------------------------ */

const downed = (actor) => int(actor?.system?.resources?.hp?.value) <= 0 || Boolean(actor?.statuses?.has?.("unconscious")) || Boolean(actor?.statuses?.has?.("dead"));
/** Did this damage take the creature down (it was up before it)? */
export function droppedBy(hpAfter, amount) {
  return int(hpAfter) <= 0 && int(hpAfter) + int(amount) > 0;
}

export async function onDamageAppliedB4({ actor: victim, amount, sourceUuid } = {}) {
  if (!victim || !(Number(amount) > 0)) return;
  const source = await actorFrom(sourceUuid);
  const combat = game.combat?.started ? game.combat : null;
  const dropped = droppedBy(victim.system?.resources?.hp?.value, amount) || (downed(victim) && int(victim.system?.resources?.hp?.value) > 0);

  // DREAD WOLF: "When you reduce an enemy to 0 HP, gain +1 luck bonus to DB until end of next round."
  if (source && source !== victim && dropped && !allied(source, victim) && inForm(source, "itDreadWolf")) {
    await h().createEffectsOn(source, [made("dreadWolf", {
      name: "Dread Wolf (+1 luck DB)", description: "Dread Wolf: +1 luck bonus to DB until the end of the next round.",
      system: { statBonuses: [{ target: "defence", type: "luck", value: 1, label: "Dread Wolf" }] }
    }, untilRoundEnds(source, 2))]);
  }

  for (const oathblade of creaturesHere()) {
    const fx = challengeOf(oathblade);
    const ch = fx?.getFlag?.(MODULE_ID, "challenge");
    if (!ch) continue;
    // THE CHALLENGE ENDS: "the target is killed, reduced to 0 Hit Points, becomes unconscious".
    if (ch.targetUuid === victim.uuid && downed(victim)) {
      await asOwner(oathblade, "deleteEffects", { ids: [fx.id] });
      // "you disable a foe with an attack": the Oathblade's own blow.
      if (dropped && source === oathblade && ownedNamed(oathblade, "Claim the Next Foe")) await offerTo(oathblade, "claimNextFoe", { fallenName: victim.name });
      continue;
    }
    const oath = ch.oath;
    // THE CHALLENGED TARGET DID THE DAMAGE.
    if (source && source.uuid === ch.targetUuid && (victim === oathblade || allied(oathblade, victim))) {
      const once = oathblade.getFlag(MODULE_ID, "oathRound");
      if (usedThisRound(once, combat?.id, combat?.round)) continue;
      if (oath === "Oath of Guardianship" && victim !== oathblade) {
        await grantOathStrike(oathblade, ch, { label: "Oath of Guardianship", name: `Guardianship: next Strike vs ${ch.targetName}`, charismaMin: 1, rending: 0, keepOnMiss: false });
      } else if (oath === "Oath of Vengeance") {
        await grantOathStrike(oathblade, ch, { label: "Retribution", name: `Retribution vs ${ch.targetName}`, charismaMin: null, rending: 2, keepOnMiss: Boolean(ownedNamed(oathblade, "Unpaid Debt")) });
      } else continue;
      if (combat) await asOwner(oathblade, "setFlag", { key: "oathRound", value: { combatId: combat.id, round: int(combat.round) } });
      continue;
    }
    // OATH OF FEALTY: the Oathblade or the Sworn Charge damaged the challenged target.
    if (oath === "Oath of Fealty" && victim.uuid === ch.targetUuid && source) {
      const charge = swornChargeOf(oathblade);
      if (!charge) continue;
      const bearer = source === oathblade ? await actorFrom(charge.uuid) : (source.uuid === charge.uuid ? oathblade : null);
      if (!bearer) continue;
      await putEffect(bearer, "fealtyBonus", made("fealtyBonus", {
        name: `Oath of Fealty: +2 vs ${ch.targetName}`, description: "Oath of Fealty: +2 circumstance to your next attack against the challenged target before the end of your next turn.",
        system: nextAttackBonusFlags({ value: 2, label: "Oath of Fealty", scope: `Your next attack against ${ch.targetName}`, targetUuid: ch.targetUuid, melee: bearer === oathblade }),
        module: { itNextStrike: { targetUuid: ch.targetUuid, melee: bearer === oathblade }, itChallengePartner: ch.id }
      }, untilEndOfNextTurn(bearer)));
    }
  }
}

/** Guardianship's and Retribution's bonus on the Oathblade, through its owner. */
async function grantOathStrike(oathblade, ch, { label, name, charismaMin, rending, keepOnMiss }) {
  const data = made("oathStrike", {
    name, description: `${label}: advantage on your next melee Strike against ${ch.targetName}, your Charisma as damage${rending ? `, and AR +${rending}` : ""}, until the end of your next turn.`,
    system: nextStrikeOathFlags(ch.targetUuid, ch.targetName, { label, charismaMin, rending }),
    module: { itNextStrike: { targetUuid: ch.targetUuid, melee: true, keepOnMiss }, itChallengePartner: ch.id }
  }, untilEndOfNextTurn(oathblade));
  await putEffect(oathblade, "oathStrike", data);
  await card(oathblade, label, [`${esc(ch.targetName)} drew blood: your next melee Strike against it has <strong>advantage</strong> and adds your Charisma as damage${rending ? ` and <strong>AR +${rending}</strong>` : ""}, applied for you, until the end of your next turn.${keepOnMiss ? " Unpaid Debt: a miss keeps it." : ""}`]);
}

/* ------------------------------------------------------------------ */
/* Turns, combat and effects                                            */
/* ------------------------------------------------------------------ */

/** A turn has ended (acting GM): the next creature's turn starts. */
export async function onTurnEndedB4({ actor, combat } = {}) {
  if (!combat || !isActingGM()) return;
  // EMPTY PRESENCE: "At the end of your turn … you become invisible again."
  for (const e of ownEffects(actor, "emptyPresence")) {
    if (e.getFlag(MODULE_ID, "seen")) await e.update({ statuses: ["invisible"], name: "Empty Presence: Invisible", [`flags.${MODULE_ID}.seen`]: false });
  }
  const next = combat.combatant?.actor ?? null;
  if (!next) return;
  await offerHeldBlows(next, combat);
  // EMBER REAVER: "Each consecutive round in this form adds +1 to weapon damage" (to your Int, B4-4).
  const stance = activeForm(next);
  if (stance?.flags?.[SYSTEM_ID]?.itEmberEscalation) {
    const stacks = emberNext(stance.getFlag(MODULE_ID, "emberStacks") ?? 0, intOf(next));
    const rows = (stance.flags[SYSTEM_ID].conditionals ?? []).filter((r) => r?.label !== "Ember Reaver (rounds)");
    if (stacks > 0) rows.push({ kind: "modifier", value: stacks, type: "class", label: "Ember Reaver (rounds)", scope: "Weapon damage", auto: true, when: { checkTypes: ["damage"] } });
    await stance.update({ [`flags.${SYSTEM_ID}.conditionals`]: rows, [`flags.${MODULE_ID}.emberStacks`]: stacks });
  }
  // OATH OF HONOUR: re-armed at the start of the Oathblade's turn while the duel holds.
  const ch = challengeOf(next)?.getFlag?.(MODULE_ID, "challenge");
  if (ch?.oath === "Oath of Honour") {
    const target = await actorFrom(ch.targetUuid);
    if (target) await armHonour(next, target, ch.id);
  }
}

/** The combat ended (acting GM): Ember Reaver's rounds reset (B4-4); a blow held in it never lands. */
export async function onCombatDeletedB4(combat) {
  if (!isActingGM()) return;
  for (const c of combat?.combatants ?? []) {
    const held = c.actor?.getFlag?.(SYSTEM_ID, "heldStrike");
    if (held && held.combatId === combat.id) await c.actor.unsetFlag(SYSTEM_ID, "heldStrike");
  }
  for (const actor of creaturesHere()) {
    const stance = activeForm(actor);
    if (!stance?.getFlag?.(MODULE_ID, "emberStacks")) continue;
    const rows = (stance.flags[SYSTEM_ID].conditionals ?? []).filter((r) => r?.label !== "Ember Reaver (rounds)");
    await stance.update({ [`flags.${SYSTEM_ID}.conditionals`]: rows, [`flags.${MODULE_ID}.emberStacks`]: 0 });
  }
}

/** An effect ended (acting GM): Steel Viper's initiative, a Challenge's partners. */
export async function onEffectDeletedB4(effect) {
  if (!isActingGM()) return;
  // STEEL VIPER LEFT: lowered again, unless the form that replaced it keeps
  // it (asked a moment later, once the replacement has landed).
  const owner = effect?.parent;
  if (effect?.flags?.[SYSTEM_ID]?.itSteelViperInitiative && owner?.documentName === "Actor" && game.combat?.started) {
    await new Promise((r) => setTimeout(r, 1000));
    if (!activeForm(owner)?.flags?.[SYSTEM_ID]?.itSteelViperInitiative) await settleViper(owner, 0);
  }
  const ch = effect?.getFlag?.(MODULE_ID, "challenge");
  if (ch?.id) {
    for (const actor of creaturesHere()) {
      await safeDelete(actor, Array.from(actor.effects ?? []).filter((e) => e.getFlag?.(MODULE_ID, "itChallengePartner") === ch.id).map((e) => e.id));
    }
  }
}

/** A token moved (acting GM): Hollow Breath ends; an ally beside a duelled target suppresses Oath of Honour. */
export async function onTokenMovedB4(tokenDoc, change) {
  if (!isActingGM() || !("x" in (change ?? {}) || "y" in (change ?? {}))) return;
  const mover = tokenDoc?.actor;
  if (!mover) return;
  const breath = ownEffects(mover, "hollowBreath").map((e) => e.id);
  if (breath.length) await mover.deleteEmbeddedDocuments("ActiveEffect", breath);
  for (const oathblade of creaturesHere()) {
    if (oathblade === mover || !ownEffects(oathblade, "honourDefence").length) continue;
    const target = await actorFrom(challengedUuid(oathblade));
    if (target && (await allyAdjacent(oathblade, target)) === true) await suppressHonourHere(oathblade);
  }
}

/* ------------------------------------------------------------------ */
/* Deflect Arrow and Shadow Double: offered when attacked               */
/* ------------------------------------------------------------------ */

const deflectArrow = passive("Offered with Evade when you are attacked: +4 circumstance to DB against a physical ranged attack, with a hand free.");

export const BLOCK4_DEFENCE_OFFERS = Object.freeze({
  "Shadow Double": {
    summary: "Concealed against this attack and until the start of your next turn (spends your reaction and its Focus use).",
    against: "attack",
    find: (actor) => ownedNamed(actor, "Shadow Double"),
    requires: (actor, item) => (hasUse(item) ? null : "expended — Refocus restores it"),
    use: (actor, item) => shadowDoubleUse(actor, item)
  },
  "Deflect Arrow": {
    label: "Evade + Deflect Arrow",
    summary: "Against a physical ranged attack, with a hand free: Evade, and +4 circumstance to DB against this attack (spends your reaction).",
    against: "weapon",
    find: (actor) => (ownedNamed(actor, "Inner Discipline") ? ownedNamed(actor, "Deflect Arrow") : null),
    use: async (actor, item, attack) => {
      const { DEFENCE_OFFERS } = await import("./defence-offers.mjs");
      const evaded = await DEFENCE_OFFERS.Evade.use(actor, item, attack);
      if (!evaded) return;
      const data = made("deflectArrow", {
        name: "Deflect Arrow (+4 vs one attack)", description: "Deflect Arrow: +4 circumstance to your DB against the triggering ranged attack; that attack removes it.",
        changes: [{ key: "system.combat.defence.circumstance", type: "custom", value: "4", priority: 20 }], system: { oneAttack: true }, img: item.img
      }, forSeconds(6));
      await putEffect(actor, "deflectArrow", data);
    }
  }
});

/* ------------------------------------------------------------------ */
/* What registration hands the system                                   */
/* ------------------------------------------------------------------ */

export const BLOCK4_AUTOMATIONS = Object.freeze({
  // Each class
  "magical tradition": magicalTradition,
  // Ghostwalker
  "ghost arts": ghostArts,
  "ghostwalk": passive("Works by itself at the table: your Sneak may cover your whole Speed. You still need cover or concealment."),
  "unseen assault": passive("Works by itself: +1d6 precision (more by level) on a Strike against a creature flat-footed to you from your own Stealth, Deception or Ghost Arts, once per round."),
  "vanishing retreat": vanishingRetreat,
  "false face": passive("Works by itself: Intelligence instead of Charisma on Disguise checks, when it is higher."),
  "ghost step": ghostStep,
  "hollow breath": hollowBreath,
  "misdirecting whisper": misdirectingWhisper,
  "no trace": passive("At the table: Track checks against you are one difficulty harder."),
  "silent needles": silentNeedles,
  "smoke veil": smokeVeil,
  "spider path": spiderPath,
  "falling shadow": fallingShadow,
  "caltrop blossom": caltropBlossom,
  "shadow double": shadowDouble,
  "veiled body": veiledBody,
  "body of mist": bodyOfMist,
  "shadow passage": shadowPassage,
  "empty presence": emptyPresence,
  "ghost art mastery": ghostArtMastery,
  "shadow counter": passive("Offered when a creature misses you with an attack: your reaction, a Step, and a Feint against it."),
  "shadowy step": {
    hint: "2 AP: Step, then a melee Strike against the target, which is considered flanked.",
    async use(actor) {
      const action = { key: "shadowystep", name: "Shadowy Step", traits: "Attack" };
      const target = firstTarget();
      if (!target) { ui.notifications.warn("Shadowy Step: target the creature first."); return false; }
      if (!(await h().traitGate(actor, action, "Shadowy Step"))) return false;
      const weapon = await pickWeapon(actor, "Shadowy Step", meleeWeapons(actor));
      if (!weapon) return false;
      if (!(await spendAP(actor, "Shadowy Step", 2))) return false;
      await h().armMove(actor, { maxFeet: 5, speedKey: "land", provokes: false, note: "Shadowy Step: a Step." }, "Shadowy Step");
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="trg-prime trg-check-card"><header class="check-header"><div class="check-heading"><span class="check-actor">${esc(actor.name)}</span><h3>Shadowy Step</h3></div></header>`
          + `<p style="margin:2px 0"><strong>Step 5 feet</strong> — move your token, then Strike <strong>${esc(target.name)}</strong> with ${esc(weapon.name)}: it is <strong>considered flanked</strong>.</p>`
          + "<p style=\"margin:2px 0\"><em>2 AP spent; the Strike costs nothing more.</em></p>"
          + `<p style="margin:6px 0 2px"><button type="button" data-it-action="shadowyStrike">Strike</button></p></div>`,
        flags: { [MODULE_ID]: { shadowyStrike: { actorUuid: actor.uuid, weaponId: weapon.id, targetUuid: target.uuid } } }
      });
      return true;
    }
  },
  // Kensai
  "combat form": combatForm,
  "flow strike": flowStrike,
  "considered mind": passive("Works by itself: your Refocus checks use Intelligence when it is higher than Wisdom."),
  "weapon discipline": weaponDiscipline,
  "black lotus": blackLotus,
  ...Object.fromEntries(COMBAT_FORM_NAMES.filter((n) => n !== "Black Lotus").map((n) => [norm(n), formItemUse(n)])),
  "blended form": blendedForm,
  "fluid blending": passive("At daily preparation you are asked whether to change your blended forms; or press Blended Form's Use."),
  "echoed form": echoedForm,
  "form reversal": formReversal,
  "formless cut": formlessCut,
  "perfect tempo": perfectTempo,
  "disciplined follow-through": passive("Works by itself: your Flow Strike adds +2 damage when it hits."),
  "extra form": passive("One more form to learn through Combat Form's Use."),
  "deflect arrow": deflectArrow,
  // Oathblade
  "challenge": challenge,
  "unwavering purpose": passive("Works by itself: your Refocus checks use Charisma when it is higher than Wisdom."),
  "oathblade's resolve": passive("Works by itself: +1 to your conviction pool and points."),
  "oath of honour": passive("Runs with your Challenge: +2 DB against the target and advantage on your first melee Strike against it each round, while none of your allies is adjacent to it."),
  "oath of guardianship": passive("Runs with your Challenge: the target takes −2 against your allies; when it damages one, your next melee Strike against it has advantage and +Cha damage."),
  "oath of vengeance": passive("Runs with your Challenge: when the target damages you or an ally, Retribution — advantage, +Cha damage and AR +2 on your next melee Strike against it."),
  "oath of fealty": oathOfFealty,
  "claim the next foe": claimTheNextFoe,
  "formal declaration": passive("Asked after each Challenge: a Demoralise against the target at no AP."),
  "distant honour": passive("Works by itself: your Challenge also counts for bow attacks within the first range increment."),
  "guarded commitment": passive("Works by itself: your Challenge's DB penalty is −1."),
  "unpaid debt": passive("Works by itself: a missed Retribution Strike keeps Retribution until you damage the target."),
  "shared purpose": passive("Offered when you or your Sworn Charge score a critical hit on the challenged target."),
  "shelter under oath": passive("Runs with your Challenge: your allies gain +2 circumstance to saves against the target's effects."),
  "ghost blade": passive("Works by itself: AR on a Strike that deals Unseen Assault."),
  "ambusher's patience": passive("Works by itself: +2d6 on the first Unseen Assault against each creature that had not detected you."),
  "fleeting shadow": passive("Works by itself: Vanishing Retreat's Step is 10 feet, and you may Hide."),
  "extra ghost art": passive("One more art to learn through Ghost Arts' Use."),
  "between glances": passive("At the table: with Ghostwalk you may cross 20 feet of open ground without automatically being observed, starting and ending where you could Hide. You still roll Stealth."),
  "walk the empty space": passive("At the table: as Between Glances, but 40 feet."),
  "dancing leaf": passive("At the table: +5 feet to a High Jump or Long Jump you succeed at; a fall beside a wall does not count that distance."),
  "smoke eyes": passive("At the table: your own Smoke Veil does not conceal anything from you."),
  "solitary supremacy": passive("At the table: while Oath of Honour holds, the target gains no DB from its allies' Aid, reactions or abilities against you, and its allies cannot impose penalties on your attacks against it.")
});

/** The Shadowy Step card's Strike button. */
export async function pressShadowyStrike(message) {
  const raw = message?.getFlag?.(MODULE_ID, "shadowyStrike");
  if (!raw || raw.used) return false;
  const actor = await actorFrom(raw.actorUuid);
  const weapon = actor?.items?.get?.(raw.weaponId);
  const target = await actorFrom(raw.targetUuid);
  if (!actor?.isOwner || !weapon) { ui.notifications.warn("Shadowy Step: only the attacker's owner can Strike, with the weapon still in hand."); return false; }
  await message.setFlag(MODULE_ID, "shadowyStrike", { ...raw, used: true });
  if (target) targetOnly(target);
  await h().rollWeaponAttack(actor, weapon, { apPaid: true, skipTargetPrompt: Boolean(target), treatAsFlanked: true, optionLabel: "Shadowy Step" });
  return true;
}

/* ------------------------------------------------------------------ */
/* Shared with Block 5 (0.6.0)                                          */
/* ------------------------------------------------------------------ */

/**
 * The steps Block 5's racial feats share with this file: effects in this
 * file's shape and their clocks, the cards and the questions, and the two
 * routes to another player's screen and to the acting GM. One copy, so a
 * fix to how an offer reaches its player reaches both blocks.
 */
export const SHARED = Object.freeze({
  ownedNamed, made, ownEffects, safeDelete, putEffect, untilNextTurn, untilEndOfNextTurn, untilEndOfTurn,
  forRounds, forSeconds, untilRoundEnds, card, focusReady, confirm, roundStamp, usedNow, tokenOf, allied,
  actorFrom, targetOnly, meleeWeapons, pickWeapon, levelOf, offerTo, asOwner, passive, esc, norm, int
});

/** Block 5's offers and owner writes ride this file's socket and its tables. */
export function registerSharedOps({ offers = {}, ownerOps = {} } = {}) {
  for (const [k, fn] of Object.entries(offers)) if (typeof fn === "function") OFFERS[k] = fn;
  for (const [k, fn] of Object.entries(ownerOps)) if (typeof fn === "function") OWNER_OPS[k] = fn;
}
