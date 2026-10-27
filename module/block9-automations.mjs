/**
 * Inner Tempest — Block 9 (0.10.0): Chapter 9's magic items at run time, on
 * TRG Prime 3.673.0.
 *
 *   RUNES             the eleven runes (Centred twice: armour and weapon, two
 *                     ladders), declared to `registerRunes` as data the
 *                     system reads — a conditional, an Engage button, a
 *                     death guard, a critical guard, a critical advantage, a
 *                     bleed easing, an energy rune, a next-Strike offer
 *   ITEM_AUTOMATIONS  the wondrous items' Uses (`registerItemAutomation`):
 *                     the Prayer Beads' Refocus, the Lotus Blossom's elixir,
 *                     the Incense Burner's lighting, the Restorative Mat's
 *                     meditation and the Sash of Serenity's minute
 *   MONASTIC_ROUTE    Monastic Items, Create through Meditation
 *                     (`registerCreateRoute`, C8)
 *
 * As ruled on 26 October 2026 (B9-1 to B9-11 and interpretations 1–8,
 * docs/INNER_TEMPEST_RULINGS_2026-10-26-B9.md). The pack items are built from
 * these same rows (tools/content/block9.mjs), so the registration and the
 * packs cannot disagree. Pure decisions are exported for
 * tools/verify-block9.mjs; the Foundry half reads
 * `game.trgPrime.modules` at call time.
 */
import { helpers, SYSTEM_ID, MODULE_ID } from "./automations.mjs";

const h = () => helpers();
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const int = (v) => Math.trunc(Number(v) || 0);
const worldNow = () => Number(globalThis.game?.time?.worldTime ?? 0);

/* ------------------------------------------------------------------ */
/* The runes                                                            */
/* ------------------------------------------------------------------ */

/** "+2 … increases to +3 if you are a Disciple or Mystic" (C3). */
const DISCIPLE_OR_MYSTIC = (value) => ({ classes: ["disciple", "mystic"], value });
const SAVE_KEYS = Object.freeze(["fortitude", "reflex", "will"]);
const CENTRED_OFFER = Object.freeze({
  kind: "modifier", value: [1, 2, 3], type: "item", label: "Centred", scope: "Refocus (Mental Focus) checks",
  auto: true, when: { actions: ["refocus"] }
});

export const RUNES = Object.freeze([
  /* ───────────── Armour (and shield) runes ───────────── */
  {
    key: "centredArmour", name: "Centred", traits: "Alteration, Invested", on: ["armour"],
    tiers: [{ tier: "I", level: 4, price: 750 }, { tier: "II", level: 8, price: 4200 }, { tier: "III", level: 12, price: 16000 }],
    effect: "An item bonus to Refocus (Mental Focus) checks: +1, +2 or +3 by tier.",
    note: "Applied automatically: the item bonus is pre-ticked on every Refocus. Without a Focus ability there is no Refocus to add it to (interpretation 2).",
    declares: { conditionals: [CENTRED_OFFER] }
  },
  {
    key: "guarded", name: "Guarded", traits: "Invested, Soul", on: ["armour"], level: 7, price: 3000,
    activate: "Reaction", effect: "When you take a critical hit: negate its additional HP damage and heal half of it (round up). 1/day.",
    note: "Asked of the wearer's player when a critical hit lands, before the damage is rolled (a reaction, once a day): the critical's extra dice are not dealt, and half of what they rolled is healed, rounded up.",
    declares: { criticalGuard: { frequency: "daily" } }
  },
  {
    key: "harmony", name: "Harmony", traits: "Focus, Invested, Warding", on: ["armour", "shield"], level: 11, armourPrice: 11000, shieldPrice: 7700,
    activate: "Engage (1 AP)", effect: "For 1 minute: +2 dodge bonus to DB and +2 resistance bonus to saving throws (+3 for a Disciple or Mystic). Then expended until Refocus.",
    note: "Press Harmony on the item (Engage, 1 AP): for 1 minute +2 dodge DB and +2 resistance to all three saves, +3 each when you have the Disciple or Mystic class. The rune is then expended; Refocus restores it.",
    declares: {
      action: {
        verb: "Engage", apCost: 1, frequency: "focus", durationSeconds: 60,
        describe: "For <strong>1 minute</strong> you gain a +2 dodge bonus to DB and a +2 resistance bonus to saving throws (+3 if you are a Disciple or Mystic).",
        effect: {
          changes: [
            { key: "system.combat.defence.dodge", type: "custom", value: "2", classValue: DISCIPLE_OR_MYSTIC(3) },
            ...SAVE_KEYS.map((save) => ({ key: `system.combat.saves.${save}.resistance`, type: "custom", value: "2", classValue: DISCIPLE_OR_MYSTIC(3) }))
          ]
        }
      }
    }
  },
  {
    key: "gracefulWind", name: "Graceful Wind", traits: "Alteration, Invested", on: ["armour"], level: 6, price: 2500,
    activate: "Engage (1 AP)", effect: "For 1 minute: +30-foot status bonus to land Speed and +2 resistance bonus to Reflex saves. 1/day.",
    note: "Press Graceful Wind on the item (Engage, 1 AP, once a day): for 1 minute +30 feet status to your land Speed and +2 resistance to Reflex saves.",
    declares: {
      action: {
        verb: "Engage", apCost: 1, frequency: "daily", durationSeconds: 60,
        describe: "For <strong>1 minute</strong> you gain a +30-foot status bonus to your land speed and a +2 resistance bonus to Reflex saves.",
        effect: {
          changes: [
            { key: "system.combat.movement.land.status", type: "custom", value: "30" },
            { key: "system.combat.saves.reflex.resistance", type: "custom", value: "2" }
          ]
        }
      }
    }
  },
  {
    key: "karmicResilience", name: "Karmic Resilience", traits: "Invested, Warding", on: ["armour"], level: 11, price: 11000,
    activate: "Reaction", effect: "When you would gain the dying condition: 1 HP instead, no Dying, no critical for 0 HP; +2 circumstance to dying checks for 1 minute (+4 Disciple or Mystic). 1/day.",
    note: "Asked of the wearer's player when damage would reduce them to 0 HP (a reaction, once a day; not against damage that kills outright): you are left on 1 HP with no Dying and no critical for reaching 0, and for 1 minute your dying checks carry +2 circumstance (+4 for a Disciple or Mystic).",
    declares: {
      deathGuard: {
        label: "Karmic Resilience", offer: true, reaction: true, askOwner: true, frequency: "daily", notOutright: true,
        grants: {
          label: "Karmic Resilience", seconds: 60,
          conditionals: [{ kind: "modifier", value: 2, type: "circumstance", label: "Karmic Resilience", scope: "Dying checks", auto: true,
            when: { actions: ["dyingCheck"] }, classValue: DISCIPLE_OR_MYSTIC(4) }]
        }
      }
    }
  },
  {
    key: "staunching", name: "Staunching", traits: "Invested, Soul", on: ["armour"],
    tiers: [{ tier: "I", level: 6, price: 2000 }, { tier: "II", level: 12, price: 16000 }, { tier: "III", level: 18, price: 180000 }],
    effect: "The flat check to end Light Bleeding falls to 14 / 13 / 12; II: a DC 16 flat check reduces Moderate Bleeding by 1; III: any Bleeding.",
    note: "Applied automatically at the end of your turn: the Light Bleeding flat check is easier by 2, 3 or 4; at tier II a bleed above Light rolls a DC 16 flat check at Moderate, at tier III at any band, and on a success the largest bleed falls by 1.",
    declares: {
      bleedFlatCheckReduction: [2, 3, 4],
      bleedReduceCheck: [null, { dc: 16, bands: "moderate" }, { dc: 16, bands: "any" }]
    }
  },

  /* ───────────── Weapon runes ───────────── */
  {
    key: "centredWeapon", name: "Centred", traits: "Alteration, Invested", on: ["weapon"],
    tiers: [{ tier: "I", level: 3, price: 350 }, { tier: "II", level: 6, price: 1400 }, { tier: "III", level: 10, price: 6000 }],
    effect: "An item bonus to Refocus (Mental Focus) checks: +1, +2 or +3 by tier.",
    note: "Applied automatically while the weapon is wielded: the item bonus is pre-ticked on every Refocus. It does not stack with armour's Centred (both are item bonuses).",
    declares: { conditionals: [CENTRED_OFFER] }
  },
  {
    key: "harmonyEdge", name: "Harmony Edge", traits: "Invested, Invocation", on: ["weapon"], level: 12, price: 11000,
    activate: "Reaction", effect: "When you inflict a critical hit: advantage on the critical roll. 1/day.",
    note: "Asked when you score a critical hit with the weapon, before the injury is rolled (a reaction, once a day): the critical injury is rolled twice and the worse result for the target kept; against a minor critical's disadvantage the two cancel (B9-3).",
    declares: { criticalAdvantage: { frequency: "daily" } }
  },
  {
    key: "mindful", name: "Mindful", traits: "Focus, Invested, Invocation", on: ["weapon"], level: 10, price: 6000,
    activate: "Engage (1 AP)", effect: "Add your Wisdom ability score to your next attack roll with the weapon, made before the beginning of your next turn. Then expended until Refocus.",
    note: "Press Mindful on the weapon (Engage, 1 AP): your Wisdom is offered on your next attack roll — tick it on the attack you make with this weapon. Unused, it ends at the start of your next turn. The rune is then expended; Refocus restores it.",
    declares: {
      action: {
        verb: "Engage", apCost: 1, frequency: "focus", durationSeconds: 0,
        describe: "Add your <strong>Wisdom</strong> ability score to your next attack roll with the weapon, made before the beginning of your next turn.",
        effect: {
          untilTurnStart: true,
          conditionals: [{ kind: "modifier", valueFrom: "wisdom", type: "untyped", label: "Mindful", scope: "Your next attack roll with the weapon (before the beginning of your next turn)",
            auto: false, oneShot: true, when: { checkTypes: ["attack"] } }]
        }
      }
    }
  },
  {
    key: "soulfulStrike", name: "Soulful Strike", traits: "Force, Invested, Invocation", on: ["weapon"],
    tiers: [{ tier: "I", level: 7, price: 2100 }, { tier: "II", level: 12, price: 11000 }, { tier: "III", level: 17, price: 90000 }],
    activate: "Command (1 AP)", effect: "While active: secondary force damage 1d6 / 2d6 (and a secondary critical, −40) / 3d6 (and a secondary critical, −20).",
    note: "Press Soulful Strike on the weapon (Command, 1 AP) to switch it on or off, as an energy rune: while on, a hit adds the tier's force damage, and at II and III a critical adds its secondary force critical (B9-2: severity −3 and −1 read as the energy runes' −40 and −20).",
    declares: { energy: { type: "force", tiers: [{ dice: "1d6", secondaryCritical: null }, { dice: "2d6", secondaryCritical: -40 }, { dice: "3d6", secondaryCritical: -20 }] } }
  },
  {
    key: "tranquilQuiver", name: "Tranquil Quiver", traits: "Focus, Invested, Invocation", on: ["weapon"], level: 10, price: 6000,
    // "Usage any ranged weapon": refused (suppressed) on a melee weapon (core 3.673.0).
    usage: { ranged: true, text: "any ranged weapon" },
    activate: "Engage (1 AP)", effect: "The next ranged attack with the weapon gains +2 status, and 1d6 precision damage on a hit against a target more than 30 feet away. Then expended until Refocus.",
    note: "Press Tranquil Quiver on the weapon (Engage, 1 AP): your next ranged attack carries +2 status, and on a hit against a target farther than 30 feet the ammunition deals 1d6 precision damage of the weapon's own type (none against precision immunity). Spent by that Strike, hit or miss. The rune is then expended; Refocus restores it.",
    declares: {
      action: {
        verb: "Engage", apCost: 1, frequency: "focus", durationSeconds: 0,
        describe: "The next ranged attack made with the weapon gains a +2 status bonus; if the target is more than 30 feet away, the ammunition deals 1d6 precision damage on a hit.",
        effect: {
          conditionals: [{ kind: "modifier", value: 2, type: "status", label: "Tranquil Quiver", scope: "Your next ranged attack", auto: true,
            when: { checkTypes: ["attack"], attackModes: ["ranged"] } }],
          strikeRider: { dice: "1d6", damageType: "piercing", scope: "ranged", precision: true, beyondFeet: 30, label: "Tranquil Quiver" }
        }
      }
    }
  }
]);

/* ------------------------------------------------------------------ */
/* Monastic Items (C8, B9-5)                                            */
/* ------------------------------------------------------------------ */

export const MONASTIC_ROUTE = Object.freeze({
  key: "monasticItems",
  label: "Monastic Items",
  skill: "meditation",
  itemTypes: ["magical"],
  requires: ["Inner Discipline"],
  dcStep: 2,
  ticks: [
    "The item's effects are based on a technique or innate spell I know",
    "It is not a charged item",
    "I meet the normal magic item creation requirements (Magical Crafting or Brew Potion, and the usual skill ranks)"
  ]
});

/* ------------------------------------------------------------------ */
/* Pure decisions                                                       */
/* ------------------------------------------------------------------ */

const traitList = (v) => (Array.isArray(v) ? v : String(v ?? "").split(/[,;]/)).map((t) => String(t).trim().toLowerCase()).filter(Boolean);

/**
 * LOTUS BLOSSOM: "removes any fear or charm effect which is currently
 * affecting you". The effects that go: a Frightened condition (fear by its
 * nature), and any effect whose source carries the Fear or Charm trait (a
 * Fleeing laid by a fear spell, a charm's control). Rows: {id, statuses,
 * sourceTraits}.
 */
export function fearOrCharmEffectIds(rows = []) {
  const out = [];
  for (const row of rows ?? []) {
    const statuses = Array.from(row?.statuses ?? []).map((s) => String(s).toLowerCase());
    const traits = traitList(row?.sourceTraits);
    if (statuses.includes("frightened") || traits.includes("fear") || traits.includes("charm")) out.push(String(row.id));
  }
  return out;
}

/** The actor flag the Lotus Blossom keeps: drunk today (from any bottle; B9-6). */
export const LOTUS_FLAG = "lotusDrunkToday";

/** The offers a Lotus Blossom's hour carries: advantage on saves against fear and charm. */
export function lotusConditionals(label) {
  return [
    { kind: "advantage", label, scope: "Saving throws against fear and charm effects", auto: true, when: { checkTypes: ["save"], traits: ["fear", "charm"] } },
    { kind: "advantage", label: `${label} (the table decides)`, scope: "Saving throws against fear and charm effects", auto: false,
      when: { checkTypes: ["save"], not: { traits: ["fear", "charm"] } } }
  ];
}

/** The Mystic Incense Burner's aura (C9, B9-7): every creature within 30 feet, while lit. */
export function incenseAura(name = "Mystic Incense Burner") {
  const grants = {
    conditionals: [
      { kind: "modifier", value: 1, type: "resistance", label: name, scope: "Will saves against fear and charm effects", auto: true,
        when: { checkTypes: ["save"], subjects: ["will"], traits: ["fear", "charm"] } },
      { kind: "modifier", value: 1, type: "resistance", label: `${name} (the table decides)`, scope: "Will saves against fear and charm effects", auto: false,
        when: { checkTypes: ["save"], subjects: ["will"], not: { traits: ["fear", "charm"] } } },
      { kind: "modifier", value: 2, type: "status", label: name, scope: "Meditation checks, while in the room with the burning incense", auto: false,
        when: { checkTypes: ["skill"], subjects: ["meditation"] } }
    ]
  };
  return [{
    id: "mystic-incense-burner", name, kind: "ally", radius: 30, triggers: ["turnStart", "enter"], save: "", appliesTo: "All creatures",
    outcomes: {}, immunitySeconds: 0, whileState: "lit", includeSelf: true,
    text: "AURA — while the incense burns, every creature within 30 feet gains +1 resistance to Will saves against fear and charm, and +2 status to Meditation.",
    allyEffect: grants, enemyEffect: grants
  }];
}

/** An Incense on the bearer: the first with any left. */
export function incenseOf(items = []) {
  return Array.from(items ?? []).find((i) => i?.type === "gear" && /^incense$/i.test(String(i?.name ?? "").trim()) && int(i?.system?.quantity) > 0) ?? null;
}

/** The Sash of Serenity's choices: any one save, or one kind. */
export const SERENITY_CHOICES = Object.freeze([
  ["any", "One saving throw of your choice"],
  ["fortitude", "One Fortitude save"],
  ["reflex", "One Reflex save"],
  ["will", "One Will save"]
]);

/**
 * The minute's advantage on one save. A kind chosen at the Use (Fortitude,
 * Reflex or Will) is TAKEN on the next save of that kind and spent (0.10.1,
 * found live: a forced save asks no tick-box, by Graham's ruling of 23
 * October, and most saves are forced, so a tick-box was never reached; the
 * choice "of your choice" is made when the Sash is used). "Any one save"
 * cannot be guessed, so it stays a tick-box, offered on a save rolled from
 * the sheet.
 */
export function serenityConditional(label, choice = "any") {
  const which = SERENITY_CHOICES.find(([k]) => k === choice) ?? SERENITY_CHOICES[0];
  const any = which[0] === "any";
  return {
    kind: "advantage", label, scope: any ? `${which[1]}, within the minute` : `Your next ${which[0]} save within the minute`,
    auto: !any, oneShot: true,
    when: { checkTypes: ["save"], ...(any ? {} : { subjects: [which[0]] }) }
  };
}

/** Restorative Mat: "either a Cure or Restoration spell (8 PP)". */
export const MAT_SPELLS = Object.freeze(["Cure", "Restoration"]);
export const MAT_PP = 8;

/** The Prayer Beads' advantage, queued for the next Refocus (interpretation 4). */
export function beadsPending(label) {
  return { kind: "advantage", label, scope: "Your next Refocus (Mental Focus) check today", oneShot: true, auto: true, actions: ["refocus"] };
}

/* ------------------------------------------------------------------ */
/* The wondrous items' Uses                                             */
/* ------------------------------------------------------------------ */

const effectTiming = (seconds) => ({ duration: { seconds, startTime: worldNow() }, flags: { [SYSTEM_ID]: { spellEffect: true, spellEffectEnd: worldNow() + seconds } } });

export const ITEM_AUTOMATIONS = {
  // ENLIGHTENED PRAYER BEADS: "once per day, you gain advantage on a Refocus
  // (Mental Focus) check made while holding or wearing the beads."
  beadsRefocus: {
    hint: "Ready advantage on your next Refocus (Mental Focus) check today (1/day).",
    async use(actor, item) {
      const { line, postCard, addPendingModifier } = h();
      await addPendingModifier(actor, beadsPending(item.name));
      await postCard(actor, `${item.name} — Steadied`, [line("<strong>Advantage</strong> is readied for your next <strong>Refocus</strong> today; it is taken automatically on that roll.")]);
      return true;
    }
  },
  // LOTUS BLOSSOM: "Interact (2 AP) … temporary HP equal to your level and
  // removes any fear or charm effect … advantage to all such saving throws
  // for 1 hour … if you attempt to use more than one of these elixirs in any
  // one day, you take a serious poison critical before its effects take place."
  lotusBlossom: {
    hint: "Drink (Interact, 2 AP; refills at daily preparation): temporary HP equal to your level, fear and charm effects end, advantage on such saves for 1 hour. A second elixir the same day deals a serious poison critical first.",
    async use(actor, item) {
      const { line, postCard, grantTempHP, rollCriticalInjury, createEffectsOn } = h();
      const lines = [];
      if (actor.getFlag(MODULE_ID, LOTUS_FLAG)) {
        lines.push(line("<strong>A second elixir today:</strong> a <strong>serious poison critical</strong> is taken before its effects."));
        await rollCriticalInjury(actor, { targetActor: actor, damageType: "poison", severity: "serious" });
      }
      await actor.setFlag(MODULE_ID, LOTUS_FLAG, true);
      const level = Math.max(0, int(actor.system?.identity?.level));
      const temp = await grantTempHP(actor, level);
      lines.push(line(`<strong>${level}</strong> temporary HP (now ${temp}).`));
      const rows = [];
      for (const e of Array.from(actor.effects ?? [])) {
        if (e.disabled) continue;
        let sourceTraits = e.flags?.[SYSTEM_ID]?.sourceTraits ?? "";
        if (!sourceTraits && e.origin) {
          const origin = await fromUuid(e.origin).catch(() => null);
          if (origin?.type === "spell") sourceTraits = origin.system?.traits ?? "";
        }
        rows.push({ id: e.id, name: e.name, statuses: Array.from(e.statuses ?? []), sourceTraits });
      }
      const ending = fearOrCharmEffectIds(rows);
      if (ending.length) {
        const names = rows.filter((r) => ending.includes(r.id)).map((r) => esc(r.name));
        await actor.deleteEmbeddedDocuments("ActiveEffect", ending);
        lines.push(line(`Ended: ${names.join(", ")}.`));
      } else lines.push(line("No fear or charm effect was affecting you."));
      const timing = effectTiming(3600);
      await createEffectsOn(actor, [{
        name: `${item.name} — Serenity`, img: item.img, origin: item.uuid, changes: [], duration: timing.duration,
        description: "Advantage on saving throws against fear and charm effects for 1 hour.",
        flags: { [SYSTEM_ID]: { ...timing.flags[SYSTEM_ID], conditionals: lotusConditionals(item.name), featSource: `${item.id}:lotus` } }
      }]);
      lines.push(line("For <strong>1 hour</strong>, advantage on saving throws against fear and charm effects."));
      lines.push(line("<em>The bottle refills at your daily preparation.</em>"));
      await postCard(actor, `${item.name} — the Elixir`, lines);
      return true;
    }
  },
  // MYSTIC INCENSE BURNER: "When the Mystic Incense Burner is lit … The
  // incense will burn for 1 hour after which it must be replenished.
  // Incense for the burner is a common level 0 item … 5 gp per use."
  incenseBurner: {
    hint: "Light it with one Incense: for 1 hour every creature within 30 feet gains +1 resistance to Will saves against fear and charm and +2 status to Meditation. While it burns, its Use puts it out.",
    async use(actor, item) {
      const { line, postCard, chooseFromList } = h();
      // BURNING: the Use puts it out (the timer's own manual ending is said).
      if (item.flags?.[SYSTEM_ID]?.runeState?.lit) {
        const out = await chooseFromList(item.name, "The incense is burning.", [["out", "Put it out"]]);
        if (out === "out") await game.trgPrime.modules.stopItemTimer(actor, item, "incense");
        return false;
      }
      const incense = incenseOf(actor.items);
      if (!incense) { ui.notifications.warn(`${item.name}: you have no Incense to burn.`); return false; }
      const left = int(incense.system.quantity) - 1;
      if (left > 0) await incense.update({ "system.quantity": left });
      else await incense.delete();
      await game.trgPrime.modules.startItemTimer(actor, item, {
        key: "incense", state: "lit", label: "Incense Burning", durationSeconds: 3600,
        ending: { lapsed: "The incense has burned out: the burner's aura ends. It must be replenished.", manual: "The incense is put out: the burner's aura ends." }
      });
      await postCard(actor, `${item.name} — Lit`, [
        line("For <strong>1 hour</strong>, every creature within 30 feet gains a +1 resistance bonus to Will saves against fear and charm effects and a +2 status bonus to Meditation checks."),
        line(`<em>One Incense burned (${left} left). Use the burner again to put it out early.</em>`)
      ]);
      return true;
    }
  },
  // RESTORATIVE MAT: "you may once per day gain the benefit of either a Cure
  // or Restoration spell (8 PP) by meditating on the mat for 10 minutes."
  restorativeMat: {
    hint: "Meditate on the mat for 10 minutes (1/day): the benefit of Cure or Restoration at 8 PP.",
    async use(actor, item) {
      const { chooseFromList, releaseItemSpell } = h();
      const pick = await chooseFromList(`${item.name} — Restorative Meditation`, `Ten minutes' meditation: which spell, at ${MAT_PP} PP? (Target yourself.)`,
        MAT_SPELLS.map((name) => [name, `${name} (${MAT_PP} PP)`]));
      if (!pick) return false;
      const out = await releaseItemSpell(actor, item, { name: pick, pp: MAT_PP }, { apPaid: true });
      if (out.missing) { ui.notifications.warn(`${item.name}: the spell ${pick} was not found.`); return false; }
      return Boolean(out.cast);
    }
  },
  // SASH OF SERENITY: "Once per day, you can enter a state of serenity for 1
  // minute, gaining advantage on one saving throw of your choice during that time."
  sashSerenity: {
    hint: "Enter serenity for 1 minute (1/day): advantage on one saving throw of your choice. Choose a kind and it is taken on your next save of that kind; choose any, and tick it on a save rolled from the sheet.",
    async use(actor, item) {
      const { line, postCard, chooseFromList, createEffectsOn } = h();
      const choice = await chooseFromList(`${item.name} — Serenity`, "Advantage on which saving throw, within the minute? A kind is taken on your next save of that kind, forced or not.", SERENITY_CHOICES.map(([k, l]) => [k, l]));
      if (!choice) return false;
      const timing = effectTiming(60);
      await createEffectsOn(actor, [{
        name: `${item.name} — Serenity`, img: item.img, origin: item.uuid, changes: [], duration: timing.duration,
        description: "For 1 minute, advantage on one saving throw of your choice.",
        flags: { [SYSTEM_ID]: { ...timing.flags[SYSTEM_ID], conditionals: [serenityConditional(item.name, choice)], featSource: `${item.id}:serenity` } }
      }]);
      const anySave = (SERENITY_CHOICES.find(([k]) => k === choice) ?? SERENITY_CHOICES[0])[0] === "any";
      await postCard(actor, `${item.name} — Serenity`, [
        line(anySave
          ? "For <strong>1 minute</strong>: <strong>advantage</strong> on one saving throw of your choice."
          : `For <strong>1 minute</strong>: <strong>advantage</strong> on your next <strong>${esc(choice.charAt(0).toUpperCase() + choice.slice(1))}</strong> save.`),
        line(anySave
          ? "<em>Offered on each save you roll from the sheet; tick it on the one you choose, and it is spent. A forced save does not ask: choose a kind to have it taken there.</em>"
          : "<em>Taken on that save, forced or rolled from the sheet, and then spent.</em>")
      ]);
      return true;
    }
  }
};

/* ------------------------------------------------------------------ */
/* Registration and the day's turn                                      */
/* ------------------------------------------------------------------ */

/** Hand the runes, the Uses and the Create route to the system. */
export function registerBlock9(api, moduleId) {
  if (typeof api.registerRunes === "function") api.registerRunes(RUNES.map((r) => structuredClone(r)), moduleId);
  if (typeof api.registerItemAutomation === "function") {
    for (const [name, spec] of Object.entries(ITEM_AUTOMATIONS)) api.registerItemAutomation(name, spec, moduleId);
  }
  if (typeof api.registerCreateRoute === "function") api.registerCreateRoute(structuredClone(MONASTIC_ROUTE), moduleId);
}

/**
 * DAILY PREPARATION: the Lotus Blossom's "any one day" begins again, and an
 * unspent Prayer Beads advantage ("once per day … a Refocus") lapses.
 */
export async function onDailyPreparationB9({ actor } = {}) {
  if (!actor) return;
  if (actor.getFlag?.(MODULE_ID, LOTUS_FLAG)) await actor.unsetFlag(MODULE_ID, LOTUS_FLAG);
  const beads = new Set(Array.from(actor.items ?? []).filter((i) => (i.flags?.[SYSTEM_ID]?.wondrous?.abilities ?? []).some((a) => a?.automation === "beadsRefocus")).map((i) => i.name));
  if (!beads.size) return;
  const pending = actor.getFlag?.(SYSTEM_ID, "pendingModifiers");
  if (!Array.isArray(pending)) return;
  const kept = pending.filter((row) => !(beads.has(row?.label) && Array.isArray(row?.actions) && row.actions.includes("refocus")));
  if (kept.length !== pending.length) await actor.setFlag(SYSTEM_ID, "pendingModifiers", kept);
}
