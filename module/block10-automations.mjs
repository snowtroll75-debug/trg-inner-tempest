/**
 * Inner Tempest — Block 10 (1.0.0): the Dragon Companions and Dragon Tamer,
 * as ruled on 27 October 2026 (B10-1 to B10-14, every proposal adopted;
 * docs/INNER_TEMPEST_RULINGS_2026-10-27-B10.md), on TRG Prime 3.674.0.
 *
 * THE DRAGON IS A COMPANION OF ITS OWN KIND (core C1): the system's
 * companion actor, with the Dragon Companion class (its progression: BAB =
 * BDB = level, saves 5 + level, 12 HP a level beside the core's size base and
 * Con, 8 + Int skill points, general feats on the PC schedule, caster level −
 * 3, PP 4 a level + Cha, BSB +1 a level) and a base dragon as its `race`.
 * Everything the book prints is read from the pack items, which carry it as
 * data (tools/content/block10.mjs, from the book): the Dragon Companion Table
 * on the class (`flags.trg-prime.itDragonTable`), and each base dragon's
 * figures on its race (`flags.trg-prime.itDragon`).
 *
 *   LEVEL     its base level plus the master's levels gained since it hatched
 *             (core C2, B10-1)
 *   GROWTH    the table, read against levels gained and kept in step whenever
 *             the level moves: size (core C3), land and fly speed, Str, Con,
 *             Dex and the three mental scores (the table alone: core C6,
 *             B10-2), Wings at +6, Tail Slap at +10 (Sweep at +20, B10-3),
 *             Crush at +16, and the breath's length
 *   SPECIALS  each dragon's own table, by its absolute level, copied from the
 *             core's Creature Codex (the elemental ones by their called name,
 *             "Freezing Aura", which the codex reads) and Wild Stride from the
 *             feats
 *   BREATH    a Focus ability: dice a level of the base die (core C5)
 *   SPELLS    the core repertoire, opened at the dragon's own count and one a
 *             level after (core C10, B10-6); High Magic
 *   DB        the printed blocks' (Graham, 28 October 2026, "Printed block for
 *             dragon db"): the system's Creature Codex rule for companions,
 *             half the level as an other bonus and class bonus − 2 as a
 *             status bonus, which every printed block follows. The growth
 *             adds nothing to DB of its own.
 *
 * Dragon Tamer hatches it from a bonded egg; losing it holds Soul Drain on the
 * master (core C8, B10-13).
 */
import { MODULE_ID, SYSTEM_ID, helpers, spendReaction } from "./automations.mjs";
import { made, putEffect, forSeconds } from "./block4-automations.mjs";

const h = () => helpers();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const int = (v) => Math.trunc(Number(v) || 0);
const norm = (v) => String(v ?? "").trim().toLowerCase();

export const DRAGON_KIND = "dragon";
export const DRAGON_PACK = `${MODULE_ID}.it-dragons`;
export const DRAGON_CLASS = "Dragon Companion";
/** On the base dragon (race): its printed figures. On the companion: { base, baseLevel, hatchedAt }. */
export const DRAGON_FLAG = "itDragon";
/** On the Dragon Companion class: the Dragon Companion Table, one row per level gained. */
export const TABLE_FLAG = "itDragonTable";
/** On an egg: { dragon, days, required, lastDay }. */
export const EGG_FLAG = "itDragonEgg";
/** On an item the growth granted: its key, so a lower level can take it away. */
export const GRANT_FLAG = "dragonGrant";
/** On the growth effect. */
export const GROWTH_FLAG = "dragonGrowth";
/** On the master: the bond's state when it is broken or disrupted. */
export const BOND_FLAG = "dragonBond";
export const SOUL_DEATH = "itDragonDeath";
export const SOUL_APART = "itDragonApart";
const DAY = 86400;
const WEEK = 7 * DAY;

export const SIZES = Object.freeze(["diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"]);

/* ------------------------------------------------------------------ */
/* Pure                                                                 */
/* ------------------------------------------------------------------ */

/** A size some steps larger, clamped at Colossal. */
export function sizeAfter(base, steps) {
  const i = SIZES.indexOf(norm(base));
  if (i < 0) return null;
  return SIZES[Math.max(0, Math.min(SIZES.length - 1, i + int(steps)))];
}

/** The dragon's base data on a companion's race item, or null. */
export function baseDragonOf(items = []) {
  const race = Array.from(items ?? []).find((i) => i?.type === "race" && i?.flags?.[SYSTEM_ID]?.[DRAGON_FLAG]);
  return race ? { item: race, data: race.flags[SYSTEM_ID][DRAGON_FLAG] } : null;
}

/** The Dragon Companion Table on a companion's class item, or []. */
export function dragonTableOf(items = []) {
  const cls = Array.from(items ?? []).find((i) => i?.type === "class" && Array.isArray(i?.flags?.[SYSTEM_ID]?.[TABLE_FLAG]));
  return cls ? cls.flags[SYSTEM_ID][TABLE_FLAG] : [];
}

/**
 * Its level (core C2's `levelFrom`, B10-1): the base level, plus the master's
 * levels gained since it hatched. Never below the base level.
 */
export function dragonLevel(master, companion) {
  const own = companion?.flags?.[MODULE_ID]?.[DRAGON_FLAG] ?? companion?.getFlag?.(MODULE_ID, DRAGON_FLAG) ?? null;
  const base = int(own?.baseLevel);
  if (!base) return null;
  const masterLevel = int(master?.system?.identity?.level);
  const hatched = int(own?.hatchedAt) || masterLevel;
  return base + Math.max(0, masterLevel - hatched);
}

/** The table's row for this many levels gained (beyond its end, its last row). */
export function growthRow(table = [], gained = 0) {
  if (!table.length) return null;
  const g = Math.max(0, int(gained));
  return table.find((r) => int(r.gained) === g) ?? table[table.length - 1];
}

/**
 * Everything the dragon is at this level: the table's row against levels
 * gained, and its own specials against its level.
 */
export function dragonGrowth(base, table, level) {
  if (!base || !table?.length) return null;
  const gained = Math.max(0, int(level) - int(base.baseLevel));
  const row = growthRow(table, gained);
  const attacks = (row.attacks ?? []).map(norm);
  return {
    gained,
    size: sizeAfter(base.size, row.size),
    land: int(row.land),
    fly: base.fly > 0 ? int(row.fly) : 0,
    str: int(row.str), con: int(row.con), dex: int(row.dex), mental: int(row.mental),
    wings: attacks.includes("wings"),
    tail: attacks.includes("tail"),
    crush: attacks.includes("crush"),
    sweep: attacks.includes("sweep"),
    breathFeet: base.breath?.shape === "line" ? int(row.line) : int(row.cone),
    specials: (base.specials ?? []).filter(([at]) => int(at) <= int(level)).map(([, name]) => name)
  };
}

/**
 * The growth effect's changes: the table's increments. Nothing to DB: the
 * printed blocks' DB is the system's own creature rule (Graham, 28 October
 * 2026, "Printed block for dragon db"; found live: the class bonus as a
 * status bonus put every dragon 2 above its printed block).
 */
export function growthChanges(growth) {
  if (!growth) return [];
  const out = [];
  const add = (key, value) => { if (int(value)) out.push({ key, type: "custom", value: String(int(value)), priority: 20 }); };
  add("system.combat.movement.land.other", growth.land);
  add("system.combat.movement.fly.other", growth.fly);
  add("system.attributes.strength.untyped", growth.str);
  add("system.attributes.constitution.untyped", growth.con);
  add("system.attributes.dexterity.untyped", growth.dex);
  for (const k of ["intelligence", "wisdom", "charisma"]) add(`system.attributes.${k}.untyped`, growth.mental);
  return out;
}

/** The elemental specials by their called name read the codex's Elemental entry. */
export function specialSource(name) {
  const m = /^(caustic|fiery|freezing|shocking|toxic) (aura|blood|strikes)$/i.exec(String(name ?? "").trim());
  if (m) return { pack: "trg-prime.creature-abilities", name: `Elemental ${m[2].charAt(0).toUpperCase()}${m[2].slice(1).toLowerCase()}`, rename: String(name).trim() };
  if (norm(name) === "wild stride") return { pack: "trg-prime.feats", name: "Wild Stride" };
  return { pack: "trg-prime.creature-abilities", name: String(name ?? "").trim() };
}

/**
 * What the growth grants, by key: the attacks and Crush by levels gained, the
 * specials by level. `extraTraits` adds Sweep to the tail at +20 (B10-3).
 */
export function wantedGrants(growth) {
  if (!growth) return [];
  const out = [];
  if (growth.wings) out.push({ key: "attack:Wings", pack: "trg-prime.creature-attacks", name: "Wings" });
  if (growth.tail) out.push({ key: "attack:Tail Slap", pack: "trg-prime.creature-attacks", name: "Tail Slap", ...(growth.sweep ? { extraTraits: ["Sweep"] } : {}) });
  if (growth.crush) out.push({ key: "special:Crush", pack: "trg-prime.creature-abilities", name: "Crush" });
  for (const name of growth.specials ?? []) out.push({ key: `special:${name}`, ...specialSource(name) });
  return out;
}

/** "Wing Buffet uses the core Wings damage at the dragon's size" (B10-5): every rung that borrows the wing falls back to it. */
export const WINGS_FALLBACK = Object.freeze({ name: "Wings", damage: "1d6", size: "small", damageType: "bludgeoning" });
export function withWingsFallback(area) {
  if (!area?.damageByRung) return area;
  const rungs = {};
  for (const [rung, row] of Object.entries(area.damageByRung)) {
    rungs[rung] = row && typeof row === "object" && /wing/i.test(String(row.weapon ?? "")) ? { ...row, fallback: { ...WINGS_FALLBACK } } : row;
  }
  return { ...area, damageByRung: rungs };
}

/** The breath's area intro at this length. */
export function breathIntro(shape, feet) {
  return `A ${int(feet)}-foot ${shape} — target the creatures in it.`;
}

/** The repertoire a dragon opens with (core C10, B10-6): its count at its base level, one a level after. */
export function dragonRepertoire(base) {
  return { firstPicks: int(base?.spells), pickFrom: int(base?.baseLevel) + 1, pickStep: 1, firstPickExact: false };
}

/** An egg ready to hatch: bonded for its required days. */
export function eggReady(egg) {
  const f = egg?.flags?.[SYSTEM_ID]?.[EGG_FLAG];
  return Boolean(f) && int(f.days) >= Math.max(1, int(f.required) || 28);
}

/**
 * DOES THIS DAILY PREPARATION COUNT AS A DAY? (interpretation 6; the review's
 * finding). Each daily preparation counts, so a table that never moves the
 * world clock still bonds and recovers. Only a second preparation on a world
 * day the clock has already moved into is refused: the GM has advanced time,
 * and this day was counted. `last` is { lastDay, lastTime } from the record.
 */
export function dayCounts(last, worldTime) {
  const t = Number(worldTime || 0);
  if (last?.lastDay === undefined || last?.lastDay === null) return true;
  const sameDay = int(last.lastDay) === Math.floor(t / DAY);
  return !(sameDay && Number(last.lastTime) !== t);
}

/** One more bonding day at a daily preparation (see `dayCounts`). */
export function eggBondUpdate(egg, worldTime) {
  const f = egg?.flags?.[SYSTEM_ID]?.[EGG_FLAG];
  if (!f || eggReady(egg) || !dayCounts(f, worldTime)) return null;
  const t = Number(worldTime || 0);
  return { [`flags.${SYSTEM_ID}.${EGG_FLAG}.days`]: int(f.days) + 1, [`flags.${SYSTEM_ID}.${EGG_FLAG}.lastDay`]: Math.floor(t / DAY), [`flags.${SYSTEM_ID}.${EGG_FLAG}.lastTime`]: t };
}

/** Dragon Tamer's own prerequisite the core's parser cannot read: the Dragon Lore specialist skill (B10-11). */
export function hasDragonLore(actor) {
  const s = actor?.system?.specialistSkills ?? {};
  return Object.entries(s).some(([key, v]) => /^dragon\s*lore$/i.test(String(v?.label ?? v?.name ?? key).replace(/([a-z])([A-Z])/g, "$1 $2")));
}

/** Weeks of a broken bond's recovery due by now (one point a week). */
export function weeksDue(since, now) {
  return Math.max(0, Math.floor((Number(now) - Number(since)) / WEEK));
}

/**
 * Days since the bond broke: by the world clock, or by the daily preparations
 * counted, whichever is more (a table without a clock still recovers).
 */
export function bondDays(bond, now) {
  return Math.max(int(bond?.preps), Math.floor(Math.max(0, Number(now) - Number(bond?.since ?? now)) / DAY));
}

/** "Restored to life within 1 week of its death". */
export const restoredInTime = (days) => int(days) <= 7;

/** Half the dragon's level, rounded up: a disrupted bond's Soul Drain. */
export const apartDrain = (level) => Math.ceil(Math.max(0, int(level)) / 2);

/** The −2 a broken or disrupted bond puts on Refocus ("Hard (DC +2)"; the same on every degree). */
export function bondPenaltyEffect(label) {
  return {
    name: `${label}: Refocus is Hard`, img: "icons/svg/downgrade.svg",
    description: "Your bond with your dragon is broken or disrupted: Refocus checks are Hard (DC +2), applied as −2 on the check.",
    flags: {
      [SYSTEM_ID]: { conditionals: [{ kind: "modifier", value: -2, type: "untyped", label, scope: "Refocus (the dragon bond)", auto: true, when: { actions: ["refocus"] } }] },
      [MODULE_ID]: { [BOND_FLAG]: true }
    }
  };
}

/* ------------------------------------------------------------------ */
/* The kind (core C1)                                                   */
/* ------------------------------------------------------------------ */

export const DRAGON_KIND_SPEC = Object.freeze({
  key: DRAGON_KIND,
  label: "Dragon Companion",
  className: DRAGON_CLASS,
  creatureType: "Wyrm",
  pack: DRAGON_PACK,
  levelFrom: (master, companion) => dragonLevel(master, companion),
  sizeAbilityMods: false,
  abilityPoints: false,
  command: "It faithfully obeys simple commands: command it as you would an animal companion. It rolls its own initiative."
});

/* ------------------------------------------------------------------ */
/* Foundry: the documents                                               */
/* ------------------------------------------------------------------ */

const actingGM = () => Boolean(game.user && game.users?.activeGM && game.users.activeGM.id === game.user.id);

async function packDoc(packId, name) {
  const pack = game.packs?.get(packId);
  if (!pack) return null;
  const index = await pack.getIndex();
  const entry = Array.from(index).find((e) => norm(e.name) === norm(name));
  return entry ? (await pack.getDocument(entry._id))?.toObject() ?? null : null;
}

function grantedOn(actor, key) {
  return Array.from(actor?.items ?? []).find((i) => i.flags?.[MODULE_ID]?.[GRANT_FLAG] === key) ?? null;
}

/**
 * Keep a dragon in step with its level: its size, its growth effect, the
 * attacks and specials the tables give, its breath's length, Wing Buffet's
 * fallback and its repertoire. The acting GM does it, once, for every client.
 */
const reconciling = new Map();
/**
 * One run at a time for each dragon (the review's finding): the world-load
 * sweep, the hatching and a level change can otherwise overlap and both add
 * the same grants. Each run waits for the one before it.
 */
export function reconcileDragon(companion) {
  const key = companion?.id ?? companion;
  const before = reconciling.get(key) ?? Promise.resolve();
  const run = before.catch(() => null).then(() => reconcileDragonNow(companion));
  reconciling.set(key, run);
  run.finally(() => { if (reconciling.get(key) === run) reconciling.delete(key); }).catch(() => null);
  return run;
}

async function reconcileDragonNow(companion) {
  if (!companion || companion.type !== "companion" || norm(companion.system?.companion?.kind) !== DRAGON_KIND) return null;
  const items = Array.from(companion.items ?? []);
  const base = baseDragonOf(items);
  const table = dragonTableOf(items);
  if (!base || !table.length) return null;
  const level = int(companion.system?.identity?.level);
  const growth = dragonGrowth(base.data, table, level);
  if (!growth) return null;

  // Size (core C3): the companion records it; the core grows the rest.
  if (growth.size && norm(companion.system?.companion?.grownSize) !== growth.size) {
    await companion.update({ "system.companion.grownSize": growth.size });
  }
  // The growth effect.
  const changes = growthChanges(growth);
  const effect = Array.from(companion.effects ?? []).find((e) => e.flags?.[MODULE_ID]?.[GROWTH_FLAG]);
  const description = `Dragon Companion Table, Base +${growth.gained}: ${growth.size}; +${growth.land} ft land${growth.fly ? `, +${growth.fly} ft fly` : ""}; Str ${growth.str >= 0 ? "+" : ""}${growth.str}, Con ${growth.con >= 0 ? "+" : ""}${growth.con}, Dex ${growth.dex >= 0 ? "+" : ""}${growth.dex}, Int/Wis/Cha ${growth.mental >= 0 ? "+" : ""}${growth.mental}.`;
  if (!effect) {
    await companion.createEmbeddedDocuments("ActiveEffect", [{ name: "Draconic Growth", img: "icons/svg/upgrade.svg", changes, description, flags: { [MODULE_ID]: { [GROWTH_FLAG]: true } } }]);
  } else if (JSON.stringify(effect.changes.map((c) => [c.key, String(c.value)])) !== JSON.stringify(changes.map((c) => [c.key, c.value]))) {
    await effect.update({ changes, description });
  }
  // The attacks and specials.
  const wanted = wantedGrants(growth);
  const wantedKeys = new Set(wanted.map((w) => w.key));
  const stale = items.filter((i) => i.flags?.[MODULE_ID]?.[GRANT_FLAG] && !wantedKeys.has(i.flags[MODULE_ID][GRANT_FLAG])).map((i) => i.id);
  if (stale.length) await companion.deleteEmbeddedDocuments("Item", stale);
  const create = [];
  for (const w of wanted) {
    const have = grantedOn(companion, w.key);
    if (have) {
      // The tail's Sweep arrives at +20 on the tail already held, and goes
      // again below it (only the Sweep the growth added).
      const traits = String(have.system?.traits ?? "");
      const added = have.flags?.[MODULE_ID]?.dragonTraits ?? [];
      const missing = (w.extraTraits ?? []).filter((t) => !new RegExp(`\\b${t}\\b`, "i").test(traits));
      const gone = added.filter((t) => !(w.extraTraits ?? []).includes(t));
      if (missing.length || gone.length) {
        const kept = traits.split(",").map((t) => t.trim()).filter((t) => t && !gone.includes(t));
        await have.update({ "system.traits": [...kept, ...missing].join(", "), [`flags.${MODULE_ID}.dragonTraits`]: [...added.filter((t) => !gone.includes(t)), ...missing] });
      }
      continue;
    }
    const data = await packDoc(w.pack, w.name);
    if (!data) { console.warn(`Inner Tempest | dragon growth: ${w.name} is not in ${w.pack}`); continue; }
    delete data._id;
    if (w.rename) data.name = w.rename;
    if (w.extraTraits?.length) data.system.traits = [String(data.system.traits ?? ""), ...w.extraTraits].filter(Boolean).join(", ");
    data.flags = { ...(data.flags ?? {}), [MODULE_ID]: { ...(data.flags?.[MODULE_ID] ?? {}), [GRANT_FLAG]: w.key, ...(w.extraTraits?.length ? { dragonTraits: [...w.extraTraits] } : {}) } };
    // A feat the table gives (Wild Stride) is the class's grant: it costs no pick.
    const cls = items.find((i) => i.type === "class" && Array.isArray(i.flags?.[SYSTEM_ID]?.[TABLE_FLAG]));
    if (data.type === "feat" && cls) data.flags[SYSTEM_ID] = { ...(data.flags[SYSTEM_ID] ?? {}), grantedBy: { sourceId: cls.id, sourceName: cls.name, actorId: companion.id } };
    // Wing Buffet borrows the Wings' damage even before they arrive (B10-5).
    const area = data.flags?.[SYSTEM_ID]?.creatureAbility?.area;
    if (area && norm(w.name) === "wing buffet") data.flags[SYSTEM_ID].creatureAbility.area = withWingsFallback(area);
    create.push(data);
  }
  if (create.length) await companion.createEmbeddedDocuments("Item", create);
  // The breath's length.
  const breath = Array.from(companion.items ?? []).find((i) => i.flags?.[SYSTEM_ID]?.creatureAbility?.area?.breath && norm(i.name) === norm(base.data.breath?.name));
  const intro = breathIntro(base.data.breath?.shape ?? "cone", growth.breathFeet);
  // THE COPY KEEPS ITS OWN LENGTH (1.0.1; found live): the system's codex
  // inheritance laid the compendium entry's 15 feet back over every copy, so
  // the breath opts out of it (`codexInherit: false`, codex-inheritance.mjs).
  const own = breath?._source?.flags?.[SYSTEM_ID] ?? breath?.flags?.[SYSTEM_ID];
  if (breath && (own?.creatureAbility?.area?.intro !== intro || own?.codexInherit !== false)) {
    await breath.update({ [`flags.${SYSTEM_ID}.creatureAbility.area.intro`]: intro, [`flags.${SYSTEM_ID}.codexInherit`]: false });
  }
  // The repertoire (core C10), and High Magic ("Dragon companions use High Magic").
  const rep = dragonRepertoire(base.data);
  const flagged = {};
  if (JSON.stringify(companion.flags?.[SYSTEM_ID]?.repertoire ?? null) !== JSON.stringify(rep)) flagged[`flags.${SYSTEM_ID}.repertoire`] = rep;
  if (companion.flags?.[SYSTEM_ID]?.highMagic !== true) flagged[`flags.${SYSTEM_ID}.highMagic`] = true;
  if (Object.keys(flagged).length) await companion.update(flagged);
  return growth;
}

/** The world's dragons, kept in step at load and when a level moves. */
export async function reconcileAllDragons() {
  if (!actingGM()) return;
  for (const a of game.actors ?? []) {
    if (a.type === "companion" && norm(a.system?.companion?.kind) === DRAGON_KIND) await reconcileDragon(a);
  }
}

export function onActorUpdatedB10(actor, changes) {
  if (!actingGM() || actor?.type !== "companion" || norm(actor.system?.companion?.kind) !== DRAGON_KIND) return Promise.resolve();
  if (!foundry.utils.hasProperty(changes ?? {}, "system.identity.level")) return Promise.resolve();
  return reconcileDragon(actor);
}

/* ------------------------------------------------------------------ */
/* Dragon Tamer: the hatching                                           */
/* ------------------------------------------------------------------ */

function ownsNamed(actor, name) {
  return Array.from(actor?.items ?? []).some((i) => ["feat", "ability"].includes(i.type) && norm(i.name) === norm(name));
}

async function hatch(actor, item) {
  const api = game.trgPrime?.modules;
  if (typeof api?.createCompanionFor !== "function") { ui.notifications.warn("Dragon Tamer needs TRG Prime 3.674.0."); return false; }
  const existing = await api.companionsOf(actor, DRAGON_KIND);
  if (existing.length) return bondMenu(actor, item, existing[0]);
  const missing = [];
  if (!ownsNamed(actor, "Inner Discipline")) missing.push("Inner Discipline");
  if (int(actor.system?.skills?.arcana?.ranks) < 8) missing.push("Arcana 8 ranks");
  if (!hasDragonLore(actor)) missing.push("the Dragon Lore specialist skill");
  const eggs = Array.from(actor.items ?? []).filter((i) => i.flags?.[SYSTEM_ID]?.[EGG_FLAG]);
  const ready = eggs.filter(eggReady);
  if (!ready.length) missing.push(eggs.length ? "an egg that has finished bonding" : "an unhatched dragon egg");
  if (missing.length) { ui.notifications.warn(`Dragon Tamer: you still need ${missing.join(", ")}.`); return false; }
  let egg = ready[0];
  if (ready.length > 1) {
    const pick = await h().chooseFromList("Dragon Tamer", "Which egg hatches?", ready.map((e) => [e.id, e.name]));
    if (!pick) return false;
    egg = ready.find((e) => e.id === pick);
  }
  const species = egg.flags[SYSTEM_ID][EGG_FLAG].dragon;
  const raceDoc = await packDoc(DRAGON_PACK, species);
  const base = raceDoc?.flags?.[SYSTEM_ID]?.[DRAGON_FLAG];
  if (!base) { ui.notifications.warn(`Dragon Tamer: ${species} is not in the Dragon Companions pack.`); return false; }
  const masterLevel = Math.max(1, int(actor.system?.identity?.level));
  const companion = await api.createCompanionFor(actor, item, {
    kind: DRAGON_KIND, only: [species], title: "Dragon Tamer",
    flags: {
      [MODULE_ID]: { [DRAGON_FLAG]: { base: species, baseLevel: int(base.baseLevel), hatchedAt: masterLevel } },
      [SYSTEM_ID]: { highMagic: true, repertoire: dragonRepertoire(base) }
    },
    // Its printed feats, ranks and fields before the creation card is written
    // (1.0.1; found live: the card said Will +12, before Iron Will arrived).
    beforeCard: (made) => setUpHatchling(made, base)
  });
  if (!companion) return false;
  await reconcileDragon(companion);
  await actor.deleteEmbeddedDocuments("Item", [egg.id]);
  await h().postCard(actor, "Dragon Tamer", [
    h().line(`The egg hatches: <strong>${esc(companion.name)}</strong>, a ${esc(species.toLowerCase())}, level ${int(companion.system?.identity?.level)}.`),
    h().line("<em>It gains a level each time you do. A bond is for life: one dragon.</em>")
  ]);
  return true;
}

/** The base block's skill ranks (B10-7: as printed), languages, immunities and weakness, as fields the GM may edit. */
export function hatchlingUpdate(base) {
  const out = {};
  for (const [key, n] of Object.entries(base?.skills ?? {})) out[`system.skills.${key}.ranks`] = int(n);
  if (base?.languages) out["system.identity.languages"] = String(base.languages);
  if (base?.immunities) out["system.combat.immunities"] = String(base.immunities);
  if (base?.weaknesses) out["system.combat.weaknesses"] = String(base.weaknesses);
  return out;
}

/** What the base block already has at its level: its skill ranks, its feats and its specials. */
async function setUpHatchling(companion, base) {
  const update = hatchlingUpdate(base);
  if (Object.keys(update).length) await companion.update(update);
  const race = Array.from(companion.items ?? []).find((i) => i.type === "race");
  const create = [];
  for (const name of base.feats ?? []) {
    const data = await packDoc("trg-prime.feats", name);
    if (!data) { console.warn(`Inner Tempest | hatchling: no feat ${name}`); continue; }
    delete data._id;
    // The GM's extra (B10-9): granted by the base creature, so it costs no pick.
    if ((base.freeFeats ?? []).map(norm).includes(norm(name)) && race) {
      data.flags = { ...(data.flags ?? {}), [SYSTEM_ID]: { ...(data.flags?.[SYSTEM_ID] ?? {}), grantedBy: { sourceId: race.id, sourceName: race.name, actorId: companion.id } } };
    }
    create.push(data);
  }
  for (const name of base.baseSpecials ?? []) {
    const src = specialSource(name);
    const data = await packDoc(src.pack, src.name);
    if (!data) continue;
    delete data._id;
    if (src.rename) data.name = src.rename;
    create.push(data);
  }
  if (create.length) await companion.createEmbeddedDocuments("Item", create);
}

/* ------------------------------------------------------------------ */
/* The egg's bonding, and losing a dragon                               */
/* ------------------------------------------------------------------ */

export async function onDailyPreparationB10({ actor } = {}) {
  if (!actor) return;
  const now = Number(game.time?.worldTime ?? 0);
  const lines = [];
  for (const egg of Array.from(actor.items ?? []).filter((i) => i.flags?.[SYSTEM_ID]?.[EGG_FLAG])) {
    if (eggReady(egg)) continue;
    const update = eggBondUpdate(egg, now);
    if (!update) { lines.push(`<strong>${esc(egg.name)}</strong>: this day's bonding is already counted — advance the world clock to the next day.`); continue; }
    await egg.update(update);
    const f = egg.flags[SYSTEM_ID][EGG_FLAG];
    lines.push(eggReady(egg)
      ? `<strong>${esc(egg.name)}</strong>: the bond is complete (${int(f.days)} days). Dragon Tamer may now hatch it.`
      : `<strong>${esc(egg.name)}</strong>: an hour's bonding — day ${int(f.days)} of ${Math.max(1, int(f.required) || 28)}.`);
  }
  lines.push(...await bondRecovery(actor, now));
  if (lines.length) await h().postCard(actor, "Dragon Companion", lines.map((l) => h().line(l)));
}

/** A broken bond's weekly recovery, a restored dragon, and a reunion's hour of meditation. */
async function bondRecovery(master, now) {
  const bond = master.getFlag?.(MODULE_ID, BOND_FLAG);
  if (!bond || bond.state === "broken") return [];
  const api = game.trgPrime?.modules;
  const out = [];
  const dragon = bond.dragonId ? game.actors?.get(bond.dragonId) : null;
  if (bond.state === "dead") {
    // This preparation's day, counted as the egg's are (`dayCounts`).
    const next = { ...bond };
    if (dayCounts(bond, now)) Object.assign(next, { preps: int(bond.preps) + 1, lastDay: Math.floor(now / DAY), lastTime: now });
    // The restoration, as the GM recorded it when its Dying lifted, or now.
    const alive = dragon && !(await deadNow(dragon));
    const restoredDays = bond.restoredDays ?? (alive ? bondDays(next, now) : null);
    if (alive && restoredInTime(restoredDays)) {
      // "Restored to life within 1 week of its death, you may regain your
      // bond as detailed under temporary loss": this is the reunion's hour.
      await api.releaseSoulDrain(master, SOUL_DEATH, {});
      await endBond(master);
      return [`<strong>${esc(dragon.name)}</strong> lives again within the week: your hour's meditation restores the bond. The Refocus penalty ends, and the Soul Drain may now heal normally.`];
    }
    if (alive && !bond.insane) {
      next.insane = true;
      out.push(`<strong>${esc(dragon.name)}</strong> was restored more than a week after its death: it goes insane, and has one goal, to seek you out and destroy you. (The GM's to play.)`);
    }
    const due = Math.floor(bondDays(next, now) / 7) - int(bond.weeks);
    if (due > 0) {
      const released = await api.releaseSoulDrain(master, SOUL_DEATH, { amount: due, heal: true });
      next.weeks = int(bond.weeks) + due;
      if (released) out.push(`${released === 1 ? "A week" : `${released} weeks`} since the bond broke: ${released} Soul Drain recovered.`);
    }
    const left = int(master.flags?.[SYSTEM_ID]?.soulDrainHeld?.[SOUL_DEATH]);
    if (!left) {
      // ONE BOND PER LIFETIME: the record stays, closed, so this dragon's
      // death is never laid twice and the bond is not offered again.
      await endBond(master, { state: "broken", dragonId: bond.dragonId });
      out.push("All the Soul Drain of the broken bond is recovered; Refocus is no longer Hard.");
    } else {
      await master.setFlag(MODULE_ID, BOND_FLAG, next);
    }
    return out;
  }
  if (bond.state === "reunited") {
    await api.releaseSoulDrain(master, SOUL_APART, {});
    await endBond(master);
    return ["Reunited with your dragon, an hour's meditation restores the bond: the Refocus penalty ends, and the Soul Drain may now heal normally."];
  }
  return out;
}

/** The bond's penalty lifted; its record cleared, or closed for good. */
async function endBond(master, closed = null) {
  const ids = Array.from(master.effects ?? []).filter((e) => e.flags?.[MODULE_ID]?.[BOND_FLAG]).map((e) => e.id);
  if (ids.length) await master.deleteEmbeddedDocuments("ActiveEffect", ids);
  if (closed) await master.setFlag(MODULE_ID, BOND_FLAG, closed);
  else await master.unsetFlag(MODULE_ID, BOND_FLAG);
}

/** The system's own death question (TRG Prime 3.674.0's `isDead` helper). */
async function deadNow(actor) {
  if (!actor) return false;
  const ask = game.trgPrime?.modules?.helpers?.isDead;
  if (typeof ask === "function") return Boolean(await ask(actor));
  return Boolean(actor.hasCondition?.("dead"));
}

const isDragon = (actor) => actor?.type === "companion" && norm(actor.system?.companion?.kind) === DRAGON_KIND;
const masterOf = (dragon) => game.actors?.get(String(dragon?.system?.companion?.masterId ?? "")) ?? null;
const breaking = new Set();

/**
 * The dragon's state has changed (Dying or the dead skull laid, changed or
 * lifted, or the system's kill hook): asked by the acting GM, once at a time.
 * Dead, the bond breaks — Soul Drain equal to its level, held, and Refocus
 * Hard (B10-13). Alive again after the bond broke, the day of its restoration
 * is recorded, for the master's next daily preparation to judge "within 1
 * week of its death".
 */
export async function onDragonMaybeDied(victim) {
  if (!actingGM() || !isDragon(victim) || breaking.has(victim.id)) return;
  // Claimed before the first await: two hooks asking at once break it once.
  breaking.add(victim.id);
  try {
    const master = masterOf(victim);
    if (!master) return;
    const bond = master.getFlag?.(MODULE_ID, BOND_FLAG);
    const ours = bond?.dragonId === victim.id;
    if (!(await deadNow(victim))) {
      if (ours && bond.state === "dead" && bond.restoredDays === undefined) {
        const now = Number(game.time?.worldTime ?? 0);
        await master.setFlag(MODULE_ID, BOND_FLAG, { ...bond, restoredDays: bondDays(bond, now), restoredAt: now });
      }
      return;
    }
    // Already broken by this dragon, or broken for good: never laid twice.
    if (ours && ["dead", "broken"].includes(bond.state)) return;
    const api = game.trgPrime?.modules;
    const level = int(victim.system?.identity?.level);
    // A disrupted bond's hold gives way to the death's.
    await api.releaseSoulDrain(master, SOUL_APART, {});
    await endBond(master);
    await master.setFlag(MODULE_ID, BOND_FLAG, { state: "dead", since: Number(game.time?.worldTime ?? 0), weeks: 0, preps: 0, dragonId: victim.id });
    await api.holdSoulDrain(master, SOUL_DEATH, level);
    await master.createEmbeddedDocuments("ActiveEffect", [bondPenaltyEffect("Broken Bond")]);
    await h().postCard(master, "Dragon Companion — the bond is broken", [
      h().line(`<strong>${esc(victim.name)}</strong> is dead. You take <strong>Soul Drain ${level}</strong>, which nothing heals while the bond is broken, and your Refocus checks are Hard.`),
      h().line("<em>You recover 1 point a week (counted at daily preparation). Restored to life within a week, it may regain the bond. If the bond is broken for good, you may re-spend any lost feats when you next gain a level (the GM's).</em>")
    ]);
  } finally {
    breaking.delete(victim.id);
  }
}

export const onCreatureSlainB10 = ({ victim } = {}) => onDragonMaybeDied(victim);

/**
 * Dying or the dead skull laid, changed or lifted on a dragon. Every death
 * the system knows draws the skull (`reapDead`): Dying past the Death State,
 * Fatigue 20, Constitution −5, Soul Drain past maximum HP.
 */
export function onEffectChangedB10(effect) {
  const actor = effect?.parent;
  if (actor?.documentName !== "Actor" || !isDragon(actor)) return Promise.resolve();
  if (!(effect.statuses?.has?.("dying") || effect.statuses?.has?.("dead"))) return Promise.resolve();
  return onDragonMaybeDied(actor);
}

/** The Use when a dragon is already bonded: the GM's separation and reunion. */
async function bondMenu(actor, item, dragon) {
  const bond = actor.getFlag?.(MODULE_ID, BOND_FLAG);
  if (bond?.state === "broken") { ui.notifications.info(`Dragon Tamer: your bond with ${dragon.name} is broken for good — a bond is for life, and only once.`); return false; }
  if (bond?.state === "dead") { ui.notifications.info(`Dragon Tamer: ${dragon.name}'s bond is broken; it recovers at daily preparation.`); return false; }
  if (!game.user?.isGM) { ui.notifications.info(`Dragon Tamer: you are bonded to ${dragon.name}. The GM marks a separation from this button.`); return false; }
  const options = bond?.state === "apart"
    ? [["reunited", `Reunited with ${dragon.name}`]]
    : bond?.state === "reunited"
      ? [["apart", `Separated again before the reunion's meditation (the penalty stays as it is)`]]
      : [["apart", `Separated from ${dragon.name} (over a mile a level, for more than a week)`]];
  const pick = await h().chooseFromList("Dragon Tamer — the bond", "The GM's call:", options);
  if (!pick) return false;
  const api = game.trgPrime?.modules;
  if (pick === "apart" && bond?.state === "reunited") {
    // Still disrupted: the hold and the −2 are already on; nothing is laid twice.
    await actor.setFlag(MODULE_ID, BOND_FLAG, { ...bond, state: "apart" });
    await h().postCard(actor, "Dragon Companion — the bond is disrupted", [h().line("Separated again before the bond was restored: the Soul Drain stays held and Refocus stays Hard.")]);
  } else if (pick === "apart") {
    const drain = apartDrain(dragon.system?.identity?.level);
    await api.holdSoulDrain(actor, SOUL_APART, drain);
    await actor.createEmbeddedDocuments("ActiveEffect", [bondPenaltyEffect("Disrupted Bond")]);
    await actor.setFlag(MODULE_ID, BOND_FLAG, { state: "apart", since: Number(game.time?.worldTime ?? 0), dragonId: dragon.id });
    await h().postCard(actor, "Dragon Companion — the bond is disrupted", [h().line(`Soul Drain <strong>${drain}</strong>, which cannot be healed until you are reunited, and your Refocus checks are Hard.`)]);
  } else {
    await actor.setFlag(MODULE_ID, BOND_FLAG, { ...bond, state: "reunited" });
    await h().postCard(actor, "Dragon Companion — reunited", [h().line("At your next daily preparation, an hour's meditation restores the bond.")]);
  }
  return true;
}
/* ------------------------------------------------------------------ */
/* The companion feats                                                  */
/* ------------------------------------------------------------------ */

const largeOrBigger = (actor) => SIZES.indexOf(norm(actor?.system?.identity?.size)) >= SIZES.indexOf("large");

/** Tail Lash: a reaction tail Strike at −2 circumstance. */
async function tailLash(actor, item) {
  if (!largeOrBigger(actor)) { ui.notifications.warn("Tail Lash needs a Large or larger dragon."); return false; }
  const tail = Array.from(actor.items ?? []).find((i) => i.type === "weapon" && /tail/i.test(i.name));
  if (!tail) { ui.notifications.warn("Tail Lash needs a tail attack."); return false; }
  if (!(await spendReaction(actor, "Tail Lash"))) return false;
  await h().rollWeaponAttack(actor, tail, { isReaction: true, apPaid: true, optionLabel: "Tail Lash", extraModifiers: [{ label: "Tail Lash", value: -2, type: "circumstance" }] });
  return true;
}

/** Draconic Spell: an arcane spell, added as an innate spell with the Focus trait. */
async function draconicSpell(actor, item) {
  if (item.getFlag?.(MODULE_ID, "draconicSpell")) { ui.notifications.info(`${item.name}: already chosen (${item.getFlag(MODULE_ID, "draconicSpell")}). Take the feat again for another.`); return false; }
  const pack = game.packs?.get("trg-prime.spells");
  const index = pack ? await pack.getIndex({ fields: ["system.tradition", "system.specialist", "system.ppCost"] }) : [];
  const owned = new Set(Array.from(actor.items ?? []).filter((i) => i.type === "spell").map((i) => norm(i.name)));
  const choices = Array.from(index).filter((e) => /\barcane\b/i.test(String(e.system?.tradition ?? "")) && !e.system?.specialist && !owned.has(norm(e.name)))
    .sort((a, b) => a.name.localeCompare(b.name)).map((e) => [e._id, `${e.name} (PP ${int(e.system?.ppCost)})`]);
  if (!choices.length) return false;
  const pick = await h().chooseFromList("Draconic Spell", "Any one arcane spell, as an innate spell with the Focus trait", choices);
  if (!pick) return false;
  const data = (await pack.getDocument(pick))?.toObject();
  if (!data) return false;
  delete data._id;
  data.system.innate = true;
  // A Focus innate spell is one use (the system's default); it arrives ready.
  data.system.usesValue = 1;
  const traits = String(data.system.traits ?? "");
  if (!/\bfocus\b/i.test(traits)) data.system.traits = [traits, "Focus"].filter(Boolean).join(", ");
  data.flags = { ...(data.flags ?? {}), [MODULE_ID]: { ...(data.flags?.[MODULE_ID] ?? {}), draconicSpell: item.id } };
  await actor.createEmbeddedDocuments("Item", [data]);
  await item.setFlag(MODULE_ID, "draconicSpell", data.name);
  await h().postCard(actor, "Draconic Spell", [h().line(`<strong>${esc(data.name)}</strong> is now an innate spell with the Focus trait.`)]);
  return true;
}

export const BLOCK10_AUTOMATIONS = Object.freeze({
  "dragon tamer": {
    hint: "Hatch your bonded dragon egg: your Dragon Companion, created as a linked companion actor. With a dragon bonded, the GM marks a separation or a reunion here.",
    use: hatch
  },
  "tail lash": { hint: "Reaction: a tail Strike at −2 circumstance against a creature in reach that Strikes.", use: tailLash },
  "draconic spell": { hint: "Choose an arcane spell: it becomes an innate spell with the Focus trait.", use: draconicSpell }
});

export const BLOCK10_DEFENCE_OFFERS = Object.freeze({
  "Deflecting Wings": {
    summary: "Bring the wings up: +2 circumstance to DB against this attack (spends your reaction).",
    against: "attack",
    find: (actor) => (largeOrBigger(actor) ? Array.from(actor?.items ?? []).find((i) => i.type === "feat" && norm(i.name) === "deflecting wings") ?? null : null),
    use: async (actor, item) => {
      if (!(await spendReaction(actor, "Deflecting Wings"))) return;
      // Block 4's Deflect Arrow shape: one attack, then gone.
      const data = made("deflectingWings", {
        name: "Deflecting Wings (+2 vs one attack)", img: item?.img,
        description: "Deflecting Wings: +2 circumstance to DB against the triggering attack; that attack removes it.",
        changes: [{ key: "system.combat.defence.circumstance", type: "custom", value: "2", priority: 20 }], system: { oneAttack: true }
      }, forSeconds(6));
      await putEffect(actor, "deflectingWings", data);
    }
  }
});

/** The book's prerequisites the core's parser cannot read: "Large Size", "Tail Attack", "Light Dragon". */
export function companionFeatWarning(featName, actor) {
  const name = norm(featName);
  if (!["deflecting wings", "tail lash", "imitate sound"].includes(name)) return "";
  if (!isDragon(actor)) return `${featName} is a Dragon Companion feat.`;
  if (name === "imitate sound") {
    const base = baseDragonOf(actor.items);
    return norm(base?.data?.key) === "light" ? "" : "Imitate Sound needs a light dragon.";
  }
  if (!largeOrBigger(actor)) return `${featName} needs a Large dragon (the Dragon Companion Table's Size column).`;
  if (name === "tail lash" && !Array.from(actor.items ?? []).some((i) => i.type === "weapon" && /tail/i.test(i.name))) return "Tail Lash needs a tail attack (Base +10).";
  return "";
}

/** A dragon feat taken before its prerequisite: said, on the screen of whoever took it. */
export function onItemCreatedB10(item, options, userId) {
  if (item?.type !== "feat" || userId !== game.user?.id) return;
  const warning = companionFeatWarning(item.name, item.parent);
  if (warning) ui.notifications.warn(`${warning} Remove it if it was taken too early.`);
}

/** Registration, from module/registration.mjs. */
export function registerBlock10(api, moduleId) {
  api.registerCompanionKind?.({ ...DRAGON_KIND_SPEC }, moduleId);
  api.registerArchetype?.("Dragon Tamer", {}, moduleId);
  for (const [name, entry] of Object.entries(BLOCK10_AUTOMATIONS)) api.registerFeatAutomation(name, entry, moduleId);
  for (const [name, spec] of Object.entries(BLOCK10_DEFENCE_OFFERS)) api.registerDefenceOffer?.(name, spec, moduleId);
}
