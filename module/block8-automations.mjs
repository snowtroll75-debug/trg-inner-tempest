/**
 * Inner Tempest — Block 8 (0.9.0): what the Grimoire's spells do after they
 * are cast, on TRG Prime 3.672.0.
 *
 *   SPIRITUAL DISTRACTION  answered before each spell check the cursed
 *                          creature rolls (the system's spell-check gate,
 *                          C5a): its Will save, and the penalty
 *   DISRUPT SOUL           answered once each casting is paid for (the
 *                          settled-cast hook, C5b), and when a magical Focus
 *                          ability's use is spent: its Fortitude save, the
 *                          essence and the critical
 *   ARROWS FLIGHT          a stack chosen and split off, its range increments
 *                          doubled for the spell's time (C3)
 *   BURST OF SPEED         the second round's −10 ft (B8-9)
 *
 * WHOSE DC. The mark the spell left (TRG Prime's `moduleMark`, C6) records
 * the casting's own DC and who cast it (Graham's B8-4); the save is rolled
 * against that, on the cursed creature's own client, which is the one
 * casting. "The spell ends" ends the caster's spell through the system
 * (`endSpellOf`), the GM's client when this one does not own the caster.
 *
 * Pure decisions are exported for tools/verify-block8.mjs; the Foundry half
 * reads `game.trgPrime.modules.helpers` at call time.
 */
import { helpers, SYSTEM_ID, MODULE_ID } from "./automations.mjs";

const h = () => helpers();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const int = (v) => Math.trunc(Number(v) || 0);

/* ------------------------------------------------------------------ */
/* Pure                                                                 */
/* ------------------------------------------------------------------ */

/** The Focus abilities the book calls magical (tools/content/block8.mjs MAGICAL_FOCUS). */
export const MAGICAL_FOCUS_NAMES = Object.freeze(["Abundant Step", "Inner Blast", "Shadow Double", "Veiled Body", "Body of Mist", "Shadow Passage", "Empty Presence"]);

/** The marks a creature carries under one key: `[{ effect, record }]`. */
export function marksOf(effects = [], key) {
  const out = [];
  for (const effect of Array.from(effects ?? [])) {
    if (!effect || effect.disabled) continue;
    const record = effect.flags?.[MODULE_ID]?.[key];
    if (record && typeof record === "object") out.push({ effect, record });
  }
  return out;
}

/**
 * Spiritual Distraction's ladder: "Critical The creature is unaffected and
 * the spell ends. Success … unaffected. Partial −2 … Failure −4 … Fumble −10
 * circumstance penalty to their spell check." A Heroic reads as the
 * Critical and a Blunder as the Fumble, as the book's missing rungs do.
 */
export function distractionOutcome(degree) {
  switch (String(degree ?? "")) {
    case "heroic": case "critical": return { ends: true, penalty: 0 };
    case "success": return { ends: false, penalty: 0 };
    case "partial": return { ends: false, penalty: -2 };
    case "failure": return { ends: false, penalty: -4 };
    case "fumble": case "blunder": return { ends: false, penalty: -10 };
    default: return { ends: false, penalty: 0, unknown: true };
  }
}

/**
 * Disrupt Soul's ladder. "Success 2d8 essence. Failure … 2d8 essence plus
 * 1d8 per PP spent. If it is using an innate spell or magical Focus ability
 * that costs no PP, it instead takes 2d8 … plus 1d8 per four character
 * levels (minimum +1d8). Fumble As failure but … an essence critical."
 *
 * THE PP ACTUALLY SPENT (Graham's B8-5), so a Partial's lower cost counts as
 * it was paid. `noPP` is an innate spell or a magical Focus ability.
 *
 * @returns {{ends: boolean, dice: number, critical: boolean}} `dice` d8s in all
 */
export function disruptOutcome(degree, { ppSpent = 0, noPP = false, level = 1 } = {}) {
  const key = String(degree ?? "");
  if (key === "heroic" || key === "critical") return { ends: true, dice: 0, critical: false };
  if (key === "success") return { ends: false, dice: 2, critical: false };
  const extra = noPP ? Math.max(1, Math.floor(Math.max(0, int(level)) / 4)) : Math.max(0, int(ppSpent));
  if (key === "failure") return { ends: false, dice: 2 + extra, critical: false };
  if (key === "fumble" || key === "blunder") return { ends: false, dice: 2 + extra, critical: true };
  // NO RESULT: nothing is dealt; the card says to apply it by hand.
  return { ends: false, dice: 0, critical: false, unknown: true };
}

/** Is this item a Focus ability the book calls magical? A spell is not: its casting answers. */
export function isMagicalFocus(item) {
  if (!item || item.type === "spell") return false;
  if (!/\bfocus\b/i.test(String(item.system?.traits ?? ""))) return false;
  return item.flags?.[SYSTEM_ID]?.itMagical === true || MAGICAL_FOCUS_NAMES.includes(String(item.name ?? "").trim());
}

/** Was a use of it spent by this update? `before` is read in preUpdateItem. */
export function focusUseSpent(before, changes) {
  const after = changes?.system?.usesValue;
  if (after === undefined || after === null || before === undefined || before === null) return false;
  return Number(after) < Number(before);
}

/** "no bigger than a normal arrow" (Graham's B8-3), by name. */
const SMALL_PROJECTILE = /\b(arrows?|bolts?|bullets?|darts?|shuriken)\b/i;

/**
 * What Arrows Flight may touch on a creature: a stack of ammunition, or a
 * thrown weapon, with something left in it. Small projectiles only, unless
 * the +4 PP warp was bought ("projectiles of up to a large size").
 */
export function arrowsFlightCandidates(items = [], { large = false, worldTime = 0 } = {}) {
  return Array.from(items ?? []).filter((item) => {
    if (!item) return false;
    const thrown = item.type === "weapon" && /\bthrown\b/i.test(String(item.system?.traits ?? ""));
    if (item.type !== "ammunition" && !thrown) return false;
    if (item.type === "ammunition" && !(Number(item.system?.quantity) > 0)) return false;
    // STILL ENCHANTED, not merely once (review): a flag whose time is up is
    // a stack like any other, and a new casting replaces it.
    if (multiplierActive(item.flags?.[SYSTEM_ID]?.rangeIncrementMultiplier, worldTime)) return false;
    return large || SMALL_PROJECTILE.test(String(item.name ?? ""));
  });
}

/** Is a stack's multiple still running? (TRG Prime's own reading: past `expiresAt` it is 1.) */
export function multiplierActive(raw, worldTime = 0) {
  if (raw === undefined || raw === null) return false;
  const value = typeof raw === "object" ? Number(raw.value) : Number(raw);
  if (!Number.isFinite(value) || value <= 1) return false;
  const ends = typeof raw === "object" ? Number(raw.expiresAt) : NaN;
  return !(Number.isFinite(ends) && ends > 0 && Number(worldTime) >= ends);
}

/** How many to split off: what was asked, never more than 30 or the stack. */
export function arrowsFlightCount(asked, quantity) {
  const have = Math.max(0, int(quantity));
  const want = int(asked) > 0 ? int(asked) : 30;
  return Math.max(0, Math.min(30, have, want));
}

/** The spell's time, in seconds: ten minutes, or an hour warped. */
export function arrowsFlightSeconds(warpMods = {}) {
  return /1 hour/i.test(String(warpMods?.durationText ?? "")) ? 3600 : 600;
}

/** The name the +20 effect carries (TRG Prime's `effectName` with the row's note). */
export const BURST_FIRST = "Burst of Speed (first round)";

/** Did the first round run out, as against being ended early? */
export function burstRanOut(effect, round) {
  if (!effect || String(effect.name ?? "") !== BURST_FIRST) return false;
  const ends = Number(effect.flags?.[SYSTEM_ID]?.conditionExpiresRound);
  return Number.isFinite(ends) && ends > 0 && Number(round) >= ends;
}

/* ------------------------------------------------------------------ */
/* The spell ends                                                       */
/* ------------------------------------------------------------------ */

/** End the caster's spell; failing that, the mark on this creature. */
async function endMark(effect, record) {
  try {
    const doc = record?.casterUuid ? await fromUuid(record.casterUuid) : null;
    const caster = doc?.actor ?? doc;
    if (caster && record?.castId) {
      const ended = await h().endSpellOf(caster, record.castId);
      if (ended?.ok && ended.result) return;
    }
  } catch (err) {
    console.warn("Inner Tempest | ending the spell through its caster", err);
  }
  await effect?.delete?.().catch?.((err) => console.warn("Inner Tempest | removing the mark", err));
}

/* ------------------------------------------------------------------ */
/* Spiritual Distraction: the spell-check gate                          */
/* ------------------------------------------------------------------ */

/**
 * Registered with TRG Prime's `registerSpellCheckGate` (3.672.0): asked
 * before every casting's check. Rolls the cursed creature's Will save and
 * hands back the penalty for the check about to be rolled.
 */
export async function spiritualDistractionGate(ctx = {}) {
  const actor = ctx.actor;
  const marks = marksOf(actor?.appliedEffects ?? actor?.effects ?? [], "spiritualDistraction");
  if (!marks.length) return null;
  const modifiers = [];
  const lines = [];
  for (const { effect, record } of marks) {
    const dc = int(record.dc);
    if (!dc) {
      lines.push("<em>Spiritual Distraction: no DC was recorded — roll the Will save by hand.</em>");
      continue;
    }
    const check = await h().rollCheck({
      actor, type: "save", save: "will", subject: "will", dc,
      label: `${actor.name} — Will Save`,
      subtitle: `Spiritual Distraction${record.casterName ? ` (${esc(record.casterName)})` : ""} — DC ${dc}`,
      saveSource: "Spiritual Distraction", sourceUuid: record.casterUuid ?? "", traits: "Enchantment, Mental"
    });
    const degree = check?.outcome?.degree?.key ?? "";
    const label = check?.outcome?.degree?.label ?? degree;
    const said = distractionOutcome(degree);
    if (said.unknown) {
      lines.push("<em>Spiritual Distraction: no save result — apply −2/−4/−10 to the spell check by hand.</em>");
    } else if (said.ends) {
      lines.push(`<strong>Spiritual Distraction</strong>: ${esc(actor.name)} is unaffected (${esc(label)}), and the spell ends.`);
      await endMark(effect, record);
    } else if (said.penalty) {
      modifiers.push({ label: "Spiritual Distraction", value: said.penalty, type: "circumstance" });
      lines.push(`<strong>Spiritual Distraction</strong> (${esc(label)}): ${said.penalty} circumstance to this spell check`
        + `${ctx.rollsCheck === false ? " — this casting rolls none" : ""}.`);
    } else {
      lines.push(`<strong>Spiritual Distraction</strong>: ${esc(actor.name)} is unaffected (${esc(label)}).`);
    }
  }
  return { modifiers, lines };
}

/* ------------------------------------------------------------------ */
/* Disrupt Soul                                                         */
/* ------------------------------------------------------------------ */

/**
 * One answer to a casting or a magical Focus ability.
 * @param {Actor} actor the cursed creature
 * @param {{what: string, ppSpent: number, noPP: boolean, level: number}} use
 */
export async function disruptSoulAnswers(actor, use) {
  const marks = marksOf(actor?.appliedEffects ?? actor?.effects ?? [], "disruptSoul");
  for (const { effect, record } of marks) {
    const dc = int(record.dc);
    const lines = [h().line(`${esc(actor.name)} ${esc(use.what)} under <strong>Disrupt Soul</strong>.`)];
    if (!dc) {
      lines.push(h().line("<em>No DC was recorded — roll the Fortitude save and its damage by hand.</em>"));
      await h().postCard(actor, "Disrupt Soul", lines);
      continue;
    }
    const check = await h().rollCheck({
      actor, type: "save", save: "fortitude", subject: "fortitude", dc,
      label: `${actor.name} — Fortitude Save`,
      subtitle: `Disrupt Soul${record.casterName ? ` (${esc(record.casterName)})` : ""} — DC ${dc}`,
      saveSource: "Disrupt Soul", sourceUuid: record.casterUuid ?? "", traits: "Curse, Essence, Soul"
    });
    const degree = check?.outcome?.degree?.key ?? "";
    const label = check?.outcome?.degree?.label ?? degree;
    const out = disruptOutcome(degree, use);
    const rolls = [];
    if (out.unknown) {
      lines.push(h().line("<em>No save result — apply Disrupt Soul's damage by hand.</em>"));
    } else if (out.ends) {
      lines.push(h().line(`${esc(actor.name)} is unaffected (${esc(label)}), and the spell ends.`));
      await endMark(effect, record);
    } else {
      const roll = await new Roll(`${out.dice}d8`).evaluate();
      rolls.push(roll);
      const severity = out.critical ? await h().basicSaveSeverity(degree, check?.outcome?.margin ?? null) : null;
      const dealt = await h().applyTypedDamage(actor, { amount: roll.total, type: "essence", isCritical: Boolean(severity), sourceName: "Disrupt Soul" });
      const taken = Number(dealt?.applied ?? dealt?.packet?.taken ?? 0);
      lines.push(h().line(`${esc(label)}: ${out.dice}d8 essence = <strong>${roll.total}</strong>${taken !== roll.total ? ` (${taken} after defences)` : ""}.`));
      if (out.critical) {
        if (severity) {
          // ROLLED BY THE CURSED CREATURE, on its own client (review): the
          // injury roll writes to whoever rolls it, and this client may not
          // own the caster. An affliction's critical is rolled the same way.
          await h().rollCriticalInjury(actor, { targetActor: actor, damageType: "essence", severity, attackBonus: dc });
          lines.push(h().line(`And a <strong>${esc(severity)}</strong> essence critical, as a basic save's.`));
        } else {
          lines.push(h().line("<em>A basic save's failure by that margin leaves no critical.</em>"));
        }
      }
    }
    await h().postCard(actor, "Disrupt Soul", lines, rolls);
  }
}

/** TRG Prime's `trgPrimeSpellSettled` (3.672.0): Disrupt Soul's casting, and Arrows Flight. */
export async function onSpellSettledB8(ctx = {}) {
  const actor = ctx.actor;
  // A REFUNDED CAST WAS NOT CAST (review): the target picker called it off.
  if (!actor || ctx.refunded) return;
  await disruptSoulAnswers(actor, {
    what: `casts ${ctx.spell?.name ?? "a spell"}`,
    ppSpent: Number(ctx.ppSpent) || 0,
    // A CASTING "THAT COSTS NO PP" takes the per-four-levels line (review): an
    // innate spell, an item's, a cantrip, a spell adder's — whatever spent
    // nothing — or a Failure would be no worse than a Success.
    noPP: !(Number(ctx.ppSpent) > 0),
    level: Number(ctx.level ?? actor.system?.identity?.level ?? 1)
  });
  if (ctx.cast && (ctx.spell?.flags?.[SYSTEM_ID]?.itSpell === "arrowsFlight")) await arrowsFlight(actor, ctx);
}

/** The use a magical Focus ability had before this update, kept for `onItemUpdatedB8`. */
export function onPreUpdateItemB8(item, changes, options) {
  if (changes?.system?.usesValue === undefined || !isMagicalFocus(item)) return;
  options.itUsesBefore = item.system?.usesValue;
}

/** A magical Focus ability's use spent, by this client: Disrupt Soul answers. */
export async function onItemUpdatedB8(item, changes, options, userId) {
  if (userId !== game.user?.id || !isMagicalFocus(item)) return;
  if (!focusUseSpent(options?.itUsesBefore, changes)) return;
  const actor = item.actor;
  if (!actor || !marksOf(actor.appliedEffects ?? actor.effects ?? [], "disruptSoul").length) return;
  await disruptSoulAnswers(actor, { what: `uses ${item.name}, a magical Focus ability,`, ppSpent: 0, noPP: true, level: Number(actor.system?.identity?.level ?? 1) });
}

/* ------------------------------------------------------------------ */
/* Arrows Flight                                                        */
/* ------------------------------------------------------------------ */

async function arrowsFlight(caster, ctx) {
  // TOUCH: the caster's own projectiles, or a targeted creature's — split on
  // the GM's client when this one does not own it (review).
  const target = Array.from(game.user?.targets ?? []).map((t) => t.actor).find(Boolean) ?? caster;
  const large = Array.isArray(ctx.warpMods?.unlocks) && ctx.warpMods.unlocks.includes("itLargeProjectiles");
  const now = Number(game.time?.worldTime ?? 0);
  const options = arrowsFlightCandidates(target.items, { large, worldTime: now });
  if (!options.length) {
    await h().postCard(caster, "Arrows Flight", [h().line(`No ${large ? "ammunition or thrown weapons" : "arrows, bolts, sling bullets, darts or shuriken"} that can be seen on ${esc(target.name)} — nothing enchanted. The GM may apply it by hand.`)]);
    return;
  }
  const id = options.length === 1 ? options[0].id
    : await h().chooseFromList("Arrows Flight", "Which projectiles?", options.map((i) => [i.id, `${esc(i.name)} (${int(i.system?.quantity) || 1})`]));
  const stack = target.items.get(id);
  if (!stack) return;
  const have = Math.max(1, int(stack.system?.quantity) || 1);
  const asked = have > 1 ? await h().enterText("Arrows Flight", `How many (up to ${Math.min(30, have)})?`, "", String(Math.min(30, have))) : "1";
  if (asked === null) return;
  const count = arrowsFlightCount(asked, have);
  if (!count) return;
  const seconds = arrowsFlightSeconds(ctx.warpMods);
  const payload = { itemId: stack.id, count, expiresAt: now + seconds };
  if (target.isOwner) await enchantProjectiles(target, payload);
  else game.socket?.emit(SOCKET, { b8own: "arrowsFlight", actorUuid: target.uuid, payload });
  await h().postCard(caster, "Arrows Flight", [h().line(`<strong>${count}</strong> × ${esc(stack.name)}${target === caster ? "" : ` (${esc(target.name)})`}: range increments doubled for ${seconds >= 3600 ? "1 hour" : "10 minutes"}.`)]);
}

/** Split the projectiles off (or take the stack whole) and mark them; on the owner's or the GM's client. */
export async function enchantProjectiles(actor, { itemId, count, expiresAt }) {
  const stack = actor?.items?.get?.(itemId);
  if (!stack) return;
  const have = Math.max(1, int(stack.system?.quantity) || 1);
  const n = arrowsFlightCount(count, have);
  if (!n) return;
  const mark = { value: 2, expiresAt: Number(expiresAt) || 0, label: "Arrows Flight" };
  if (n >= have) {
    await stack.update({ [`flags.${SYSTEM_ID}.rangeIncrementMultiplier`]: mark });
    return;
  }
  const data = stack.toObject();
  delete data._id;
  data.name = `${stack.name} (Arrows Flight)`;
  data.system.quantity = n;
  foundry.utils.setProperty(data, `flags.${SYSTEM_ID}.rangeIncrementMultiplier`, mark);
  await actor.createEmbeddedDocuments("Item", [data]);
  await stack.update({ "system.quantity": have - n });
}

const SOCKET = `module.${MODULE_ID}`;
const isActingGM = () => Boolean(game.user?.isGM && (!game.users?.activeGM || game.users.activeGM === game.user));

/** The acting GM's half of Arrows Flight on a creature the caster does not own. Called from the ready hook. */
export function registerBlock8Socket() {
  game.socket?.on(SOCKET, async (data) => {
    if (data?.b8own !== "arrowsFlight" || !isActingGM()) return;
    const doc = data.actorUuid ? await fromUuid(data.actorUuid).catch(() => null) : null;
    const actor = doc?.actor ?? doc;
    if (actor) await enchantProjectiles(actor, data.payload ?? {}).catch((err) => console.warn("Inner Tempest | Arrows Flight (GM)", err));
  });
}

/* ------------------------------------------------------------------ */
/* Burst of Speed's second round                                        */
/* ------------------------------------------------------------------ */

/** The +20 ran out: the −10 for the second round, on the acting GM's client. */
export async function onEffectDeletedB8(effect) {
  if (game.user !== game.users?.activeGM) return;
  const actor = effect?.parent;
  if (actor?.documentName !== "Actor") return;
  const round = Number(game.combat?.round ?? 0);
  if (!game.combat?.started || !burstRanOut(effect, round)) return;
  const castId = effect.flags?.[SYSTEM_ID]?.castId ?? null;
  await h().createEffectsOn(actor, [{
    name: "Burst of Speed (second round)",
    img: effect.img,
    origin: effect.origin,
    changes: [{ key: "system.combat.movement.land.untyped", type: "custom", value: "-10" }],
    flags: { [SYSTEM_ID]: { spellEffect: true, conditionExpiresRound: round + 1, ...(castId ? { castId } : {}) } }
  }]);
}
