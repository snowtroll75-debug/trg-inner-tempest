/**
 * Inner Tempest — the Appendix's aging rules, the Foundry half (Block 9,
 * 0.10.0). The rules are module/aging.mjs.
 *
 *   THE SETTING     "Aging (Appendix)", a world setting, on by default (B9-10).
 *                   Off, every age effect this module laid is lifted.
 *   THE EFFECT      one "Age: <Category>" effect per creature, kept in step by
 *                   the acting GM when the sheet's age, the race, the GM's
 *                   Natural Lifespan or Age Resistance changes, and when the
 *                   world loads. An Adult, or a sheet with no age or a race
 *                   not on the table, carries none.
 *   THE LIFESPAN    a field the GM sees beside the sheet's Age (the book: the
 *                   GM "should normally keep a randomly determined Natural
 *                   Lifespan secret from the player"); blank is the race's.
 *                   Reaching it tells the GM once: "they die from natural
 *                   causes during the following year at a time determined by
 *                   the GM" is the GM's to carry out.
 *   AGE RESISTANCE  Block 8's mark (`flags.trg-inner-tempest.ageResistance` on
 *                   an effect) suppresses the physical penalties while it lasts.
 */
import { SYSTEM_ID, MODULE_ID } from "./automations.mjs";
import { AGE_LABELS, agingFor, ageEffectName, defaultLifespan, raceAgeRow } from "./aging.mjs";

export const AGING_SETTING = "aging";
export const LIFESPAN_FLAG = "naturalLifespan";
const AGE_EFFECT_FLAG = "aging";
const NOTICE_FLAG = "lifespanNoticed";

const actingGM = () => Boolean(game.user && game.users?.activeGM && game.users.activeGM.id === game.user.id);
const agingOn = () => { try { return game.settings.get(MODULE_ID, AGING_SETTING) !== false; } catch { return true; } };

/** The race the sheet names: its race item, or the identity line. */
export function raceNameOf(actor) {
  const item = Array.from(actor?.items ?? []).find((i) => i.type === "race");
  return String(item?.name ?? actor?.system?.identity?.race ?? "").trim();
}

const resistedNow = (actor) => Array.from(actor?.effects ?? []).some((e) => !e.disabled && e.flags?.[MODULE_ID]?.ageResistance);
const ageEffectsOn = (actor) => Array.from(actor?.effects ?? []).filter((e) => e.flags?.[MODULE_ID]?.[AGE_EFFECT_FLAG]);

/** Bring one creature's age effect into step. The acting GM only. */
export async function reconcileAging(actor) {
  if (!actor || !actingGM()) return;
  const existing = ageEffectsOn(actor);
  const state = agingOn() ? agingFor({
    age: actor.system?.identity?.age, race: raceNameOf(actor),
    chosenLifespan: actor.getFlag?.(MODULE_ID, LIFESPAN_FLAG) ?? null, resisted: resistedNow(actor)
  }) : null;
  const wanted = state && state.changes.length ? state : null;
  const same = (e) => wanted && e.flags?.[MODULE_ID]?.[AGE_EFFECT_FLAG]?.category === wanted.category
    && JSON.stringify((e.changes ?? []).map((c) => [c.key, String(c.value)])) === JSON.stringify(wanted.changes.map((c) => [c.key, c.value]));
  const keep = existing.find(same) ?? null;
  const lift = existing.filter((e) => e !== keep).map((e) => e.id);
  if (lift.length) await actor.deleteEmbeddedDocuments("ActiveEffect", lift);
  if (wanted && !keep) {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      name: ageEffectName(wanted.category),
      img: "icons/svg/clockwork.svg",
      changes: wanted.changes,
      description: `${AGE_LABELS[wanted.category]} (${wanted.race}, age ${wanted.age}). Age modifiers from the Appendix's Effects of Aging; they take no Hit Points and give no skill points already gained.`
        + (resistedNow(actor) ? " Age Resistance suppresses the Strength, Dexterity and Constitution penalties." : ""),
      flags: {
        [SYSTEM_ID]: { age: wanted.category },
        [MODULE_ID]: { [AGE_EFFECT_FLAG]: { category: wanted.category, race: wanted.race, age: wanted.age } }
      }
    }]);
  }
  await noticeLifespan(actor, state);
}

/** Tell the GM, once, when a creature reaches its Natural Lifespan. */
async function noticeLifespan(actor, state) {
  const noticed = actor.getFlag?.(MODULE_ID, NOTICE_FLAG) ?? null;
  if (!state?.reachedLifespan) {
    if (noticed !== null) await actor.unsetFlag(MODULE_ID, NOTICE_FLAG);
    return;
  }
  if (Number(noticed) === Number(state.lifespan)) return;
  await actor.setFlag(MODULE_ID, NOTICE_FLAG, state.lifespan);
  const gms = game.users.filter((u) => u.isGM).map((u) => u.id);
  await ChatMessage.create({
    whisper: gms,
    speaker: { alias: "Inner Tempest — Aging" },
    content: `<p><strong>${actor.name}</strong> has reached their Natural Lifespan (${state.lifespan} years; age ${state.age}).</p>`
      + "<p>Unless something extends their lifespan, they die from natural causes during the following year, at a time you determine.</p>"
  });
}

/** Every creature in the world: on load, and when the setting changes. */
export async function reconcileAllAging() {
  if (!actingGM()) return;
  for (const actor of game.actors ?? []) await reconcileAging(actor);
}

/** The world setting (B9-10). Registered at init. */
export function registerAgingSetting() {
  game.settings.register(MODULE_ID, AGING_SETTING, {
    name: "Aging (Appendix)",
    hint: "Apply the Appendix's age categories and their ability modifiers from each character's Age and race. A character with no age set is unaffected.",
    scope: "world", config: true, type: Boolean, default: true,
    onChange: () => { reconcileAllAging().catch((err) => console.warn("Inner Tempest | aging", err)); }
  });
}

/* ------------------------------------------------------------------ */
/* What keeps it in step                                                */
/* ------------------------------------------------------------------ */

export function onActorUpdatedAging(actor, changes) {
  const flat = foundry.utils.flattenObject(changes ?? {});
  const touches = Object.keys(flat).some((k) => k === "system.identity.age" || k === "system.identity.race"
    || k.startsWith(`flags.${MODULE_ID}.${LIFESPAN_FLAG}`) || k.startsWith(`flags.${MODULE_ID}.-=${LIFESPAN_FLAG}`));
  if (touches) return reconcileAging(actor);
  return Promise.resolve();
}

export function onItemChangedAging(item) {
  if (item?.type === "race" && item.parent?.documentName === "Actor") return reconcileAging(item.parent);
  return Promise.resolve();
}

export function onEffectChangedAging(effect) {
  if (effect?.flags?.[MODULE_ID]?.ageResistance && effect.parent?.documentName === "Actor") return reconcileAging(effect.parent);
  return Promise.resolve();
}

/* ------------------------------------------------------------------ */
/* The sheet: the category for all, the lifespan for the GM             */
/* ------------------------------------------------------------------ */

export function onRenderActorSheetAging(app, element) {
  const actor = app?.document ?? app?.actor;
  const root = element instanceof HTMLElement ? element : element?.[0];
  if (!actor || !root || !agingOn()) return;
  const ageInput = root.querySelector('input[name="system.identity.age"]');
  const label = ageInput?.closest("label");
  if (!label || root.querySelector(".it-aging")) return;
  const row = raceAgeRow(raceNameOf(actor));
  const effect = ageEffectsOn(actor)[0];
  const state = agingFor({ age: actor.system?.identity?.age, race: raceNameOf(actor), chosenLifespan: actor.getFlag(MODULE_ID, LIFESPAN_FLAG) ?? null, resisted: resistedNow(actor) });
  const category = effect?.flags?.[MODULE_ID]?.[AGE_EFFECT_FLAG]?.category ?? state?.category ?? null;
  const out = document.createElement("label");
  out.className = "it-aging";
  out.dataset.tooltip = row ? `${row.race}: adulthood at ${row.adult}.` : "Set an age and a race on the Racial Age Categories table.";
  out.innerHTML = `<span>Age Category</span><output>${category ? AGE_LABELS[category] : "—"}</output>`;
  label.after(out);
  if (!game.user?.isGM) return;
  const own = row ? defaultLifespan(row) : null;
  const life = document.createElement("label");
  life.className = "it-aging it-aging-lifespan";
  life.dataset.tooltip = "Natural Lifespan (GM only). Blank uses the race's: its stated lifespan, or the middle of its range.";
  life.innerHTML = `<span>Natural Lifespan</span><input type="number" min="1" step="1" placeholder="${own ?? (row?.immortal ? "immortal" : "unknown")}">`;
  const input = life.querySelector("input");
  const set = actor.getFlag(MODULE_ID, LIFESPAN_FLAG);
  if (set) input.value = String(set);
  input.addEventListener("change", async (event) => {
    event.stopPropagation();
    const n = Math.floor(Number(input.value));
    if (input.value === "" || !Number.isFinite(n) || n <= 0) await actor.unsetFlag(MODULE_ID, LIFESPAN_FLAG);
    else await actor.setFlag(MODULE_ID, LIFESPAN_FLAG, n);
  });
  out.after(life);
}
