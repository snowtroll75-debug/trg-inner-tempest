/**
 * Inner Tempest — a companion module for TRG Prime (Foundry VTT).
 *
 * Content is DATA in the module's compendium packs, each declaring in
 * module.json the system pack it extends (`flags.trg-prime.extends`), so
 * TRG Prime federates it into its own pickers and grants. Rules that are
 * not data are registered through the system's module API inside the
 * `trgPrime.registerContent` hook TRG Prime fires from its own `init`.
 */
import { registerContent } from "../module/registration.mjs";
import { onDamageApplied, onTurnEndedFlame, onPreCreateSpell, onPathCreated, registerBlock3Socket } from "../module/block3-automations.mjs";
import { bindCardButtons, onActionResolved } from "../module/automations.mjs";
import {
  onStrikeResolved, onStrikeRolled, onAmbushDealt, onDamageAppliedB4, onTurnEndedB4, onCombatDeletedB4,
  onEffectDeletedB4, onTokenMovedB4, onDailyPreparationB4, registerBlock4Socket
} from "../module/block4-automations.mjs";
import { onStrikeResolvedB5, onItemCreatedB5, onItemUpdatedB5, onItemDeletedB5, onEffectDeletedB5, reconcileB5Actor } from "../module/block5-automations.mjs";
import { onStrikeResolvedB6, onItemCreatedB6, reconcileB6Actor } from "../module/block6-automations.mjs";
import { onStrikeResolvedB7, onDamageAppliedB7, onDailyPreparationB7, onTurnEndedB7, onAmbushDealtB7 } from "../module/block7-automations.mjs";
import { onSpellSettledB8, onPreUpdateItemB8, onItemUpdatedB8, onEffectDeletedB8, registerBlock8Socket } from "../module/block8-automations.mjs";
import { onDailyPreparationB9 } from "../module/block9-automations.mjs";
import { onActorUpdatedB10, onDailyPreparationB10, onCreatureSlainB10, onEffectChangedB10, onItemCreatedB10, reconcileAllDragons } from "../module/block10-automations.mjs";
import {
  registerAgingSetting, reconcileAllAging, onActorUpdatedAging, onItemChangedAging, onEffectChangedAging, onRenderActorSheetAging
} from "../module/aging-workflow.mjs";
import {
  onActionAttempt, onActionResolved as onSkillActionResolved, offerResistDying,
  onTurnEnded, onCombatDeleted, onEffectDeleted, onDailyPreparation, trackActionResolved
} from "../module/skill-action-automations.mjs";

const MODULE_ID = "trg-inner-tempest";
const REQUIRED_SYSTEM = "3.674.1";

Hooks.on("trgPrime.registerContent", (api) => {
  registerContent(api, MODULE_ID);
});

// ANCESTRAL GUIDANCE (Chapter 5): TRG Prime announces each resolved action;
// a Recall Knowledge or Create below a Success is offered a reroll, and a
// pending reroll is settled (conviction spent only on a Success or better).
Hooks.on("trgPrimeActionResolved", (ctx) => { onActionResolved(ctx).catch((err) => console.warn("Inner Tempest | Ancestral Guidance", err)); });

// CHAPTER 4 (Block 2): the skill actions' refusals before anything is spent,
// and what each does once rolled. See module/skill-action-automations.mjs.
Hooks.on("trgPrimeActionAttempt", (ctx) => onActionAttempt(ctx));
// Tracked (0.3.3), so a reaction taken before an attack can wait for its effect.
Hooks.on("trgPrimeActionResolved", (ctx) => { trackActionResolved(ctx, onSkillActionResolved(ctx)).catch((err) => console.warn("Inner Tempest | skill action", err)); });
// Resist Dying, ruled a Reaction to gaining the dying condition: offered then.
Hooks.on("createActiveEffect", (effect) => { offerResistDying(effect).catch((err) => console.warn("Inner Tempest | Resist Dying", err)); });
// The endings the system's own sweeps do not cover.
Hooks.on("trgPrimeTurnEnded", (ctx) => { onTurnEnded(ctx).catch((err) => console.warn("Inner Tempest | turn end", err)); });
Hooks.on("deleteCombat", (combat) => { onCombatDeleted(combat).catch((err) => console.warn("Inner Tempest | combat end", err)); });
Hooks.on("deleteActiveEffect", (effect) => { onEffectDeleted(effect).catch((err) => console.warn("Inner Tempest | effect ended", err)); });
Hooks.on("trgPrimeDailyPreparation", (ctx) => { onDailyPreparation(ctx).catch((err) => console.warn("Inner Tempest | daily preparation", err)); });

// BLOCK 3 (0.4.0, on TRG Prime 3.667.0). Flame Within and Dragon's Pulse
// listen for damage the system applies; Flame Within resets at the end of a
// quiet turn; a Mystic's granted spells take the Monastic Path's tradition
// and ability as they are created, and wait for a Path chosen later.
Hooks.on("trgPrimeDamageApplied", (ctx) => { onDamageApplied(ctx).catch((err) => console.warn("Inner Tempest | damage applied", err)); });
Hooks.on("trgPrimeTurnEnded", (ctx) => { onTurnEndedFlame(ctx).catch((err) => console.warn("Inner Tempest | Flame Within", err)); });
Hooks.on("preCreateItem", (document, data) => { try { onPreCreateSpell(document, data); } catch (err) { console.warn("Inner Tempest | Monastic Path stamp", err); } });
Hooks.on("createItem", (item) => { onPathCreated(item).catch((err) => console.warn("Inner Tempest | Monastic Path", err)); });

// BLOCK 4 (0.5.0, on TRG Prime 3.668.0). What follows a Strike (Flow Strike,
// Steel Viper, Echoing Crane, Form Reversal, Shadow Counter, the oaths' next
// Strike), what an attack ends (Veiled Body, Shadow Double, Hollow Breath,
// Empty Presence, an ally breaking an Oath of Honour duel), Vanishing Retreat
// after Unseen Assault, damage (a Challenge ending, Dread Wolf, the oaths),
// a turn starting (Black Lotus's held blow, Ember Reaver, Oath of Honour),
// and what ends with a combat, an effect or a move.
Hooks.on("trgPrimeStrikeResolved", (ctx) => { onStrikeResolved(ctx).catch((err) => console.warn("Inner Tempest | after a Strike", err)); });
Hooks.on("trgPrimeStrikeRolled", (ctx) => { onStrikeRolled(ctx).catch((err) => console.warn("Inner Tempest | a Strike made", err)); });
Hooks.on("trgPrimeAmbushDealt", (ctx) => { onAmbushDealt(ctx).catch((err) => console.warn("Inner Tempest | Vanishing Retreat", err)); });
Hooks.on("trgPrimeDamageApplied", (ctx) => { onDamageAppliedB4(ctx).catch((err) => console.warn("Inner Tempest | Challenge and oaths", err)); });
Hooks.on("trgPrimeTurnEnded", (ctx) => { onTurnEndedB4(ctx).catch((err) => console.warn("Inner Tempest | turn start (Block 4)", err)); });
Hooks.on("trgPrimeDailyPreparation", (ctx) => { onDailyPreparationB4(ctx).catch((err) => console.warn("Inner Tempest | daily preparation (Block 4)", err)); });
Hooks.on("deleteCombat", (combat) => { onCombatDeletedB4(combat).catch((err) => console.warn("Inner Tempest | combat end (Block 4)", err)); });
Hooks.on("deleteActiveEffect", (effect) => { onEffectDeletedB4(effect).catch((err) => console.warn("Inner Tempest | effect ended (Block 4)", err)); });
Hooks.on("updateToken", (doc, change) => { onTokenMovedB4(doc, change).catch((err) => console.warn("Inner Tempest | token moved (Block 4)", err)); });

// BLOCK 5 (0.6.0, on TRG Prime 3.669.0). What follows a Strike (Serpent's
// Venom delivered, Paralysing Venom and Waiting Blade offered), what keeps an
// item in step (Raptorial Refinement's blade, Elemental Attunement's
// element), and what goes with an effect (Foxfire's motes, Spirit Beacon's
// dim ring).
Hooks.on("trgPrimeStrikeResolved", (ctx) => { onStrikeResolvedB5(ctx).catch((err) => console.warn("Inner Tempest | after a Strike (Block 5)", err)); });
Hooks.on("createItem", (item, options, userId) => { onItemCreatedB5(item, options, userId).catch((err) => console.warn("Inner Tempest | item added (Block 5)", err)); });
Hooks.on("updateItem", (item, changes, options, userId) => { onItemUpdatedB5(item, changes, options, userId).catch((err) => console.warn("Inner Tempest | item changed (Block 5)", err)); });
Hooks.on("deleteItem", (item, options, userId) => { onItemDeletedB5(item, options, userId).catch((err) => console.warn("Inner Tempest | item removed (Block 5)", err)); });
Hooks.on("deleteActiveEffect", (effect) => { onEffectDeletedB5(effect).catch((err) => console.warn("Inner Tempest | effect ended (Block 5)", err)); });
// BLOCK 6 (0.7.0): Snake Stance's reaction after a melee miss; a Mystic's
// innate spells marked for its Metamagic feats when the class arrives.
Hooks.on("trgPrimeStrikeResolved", (ctx) => { onStrikeResolvedB6(ctx).catch((err) => console.warn("Inner Tempest | after a Strike (Block 6)", err)); });
Hooks.on("createItem", (item, options, userId) => { onItemCreatedB6(item, options, userId).catch((err) => console.warn("Inner Tempest | item added (Block 6)", err)); });
// BLOCK 7 (0.8.0): Drawn Verdict's Strike read back and its sheathing,
// Night Lotus Venom delivered (with Unseen Assault's −1), Twin Dragon,
// Turning the Blade offered, and the archetypes' daily preparation
// (Wandering Creed, Shugenja, the Soul-Bound Weapon, Harmony Warden's trance).
Hooks.on("trgPrimeAmbushDealt", (ctx) => { try { onAmbushDealtB7(ctx); } catch (err) { console.warn("Inner Tempest | Unseen Assault (Block 7)", err); } });
Hooks.on("trgPrimeStrikeResolved", (ctx) => { onStrikeResolvedB7(ctx).catch((err) => console.warn("Inner Tempest | after a Strike (Block 7)", err)); });
Hooks.on("trgPrimeDamageApplied", (ctx) => { onDamageAppliedB7(ctx).catch((err) => console.warn("Inner Tempest | Turning the Blade", err)); });
Hooks.on("trgPrimeDailyPreparation", (ctx) => { onDailyPreparationB7(ctx).catch((err) => console.warn("Inner Tempest | daily preparation (Block 7)", err)); });
Hooks.on("trgPrimeTurnEnded", (ctx) => { onTurnEndedB7(ctx).catch((err) => console.warn("Inner Tempest | turn end (Block 7)", err)); });
// BLOCK 8 (0.9.0, on TRG Prime 3.672.0): the Grimoire. Disrupt Soul answers
// a casting once it is paid for and a magical Focus ability's spent use;
// Arrows Flight's projectiles are chosen once it is cast; Burst of Speed's
// second round follows its first. (Spiritual Distraction is a spell-check
// gate, registered with the content.)
Hooks.on("trgPrimeSpellSettled", (ctx) => { onSpellSettledB8(ctx).catch((err) => console.warn("Inner Tempest | a casting paid for (Block 8)", err)); });
Hooks.on("preUpdateItem", (item, changes, options) => { try { onPreUpdateItemB8(item, changes, options); } catch (err) { console.warn("Inner Tempest | Focus use (Block 8)", err); } });
Hooks.on("updateItem", (item, changes, options, userId) => { onItemUpdatedB8(item, changes, options, userId).catch((err) => console.warn("Inner Tempest | Disrupt Soul (Block 8)", err)); });
Hooks.on("deleteActiveEffect", (effect) => { onEffectDeletedB8(effect).catch((err) => console.warn("Inner Tempest | Burst of Speed (Block 8)", err)); });

// BLOCK 9 (0.10.0, on TRG Prime 3.673.0): the Lotus Blossom's day and the
// Prayer Beads' unspent advantage at daily preparation; the Appendix's aging,
// kept in step with the sheet's age, race, Natural Lifespan and Age Resistance.
Hooks.on("trgPrimeDailyPreparation", (ctx) => { onDailyPreparationB9(ctx).catch((err) => console.warn("Inner Tempest | daily preparation (Block 9)", err)); });
Hooks.once("init", () => registerAgingSetting());
Hooks.on("updateActor", (actor, changes) => { onActorUpdatedAging(actor, changes).catch((err) => console.warn("Inner Tempest | aging", err)); });
for (const hook of ["createItem", "deleteItem"]) Hooks.on(hook, (item) => { onItemChangedAging(item).catch((err) => console.warn("Inner Tempest | aging", err)); });
for (const hook of ["createActiveEffect", "deleteActiveEffect"]) Hooks.on(hook, (effect) => { onEffectChangedAging(effect).catch((err) => console.warn("Inner Tempest | aging", err)); });
Hooks.on("renderTRGActorSheet", (app, element) => { try { onRenderActorSheetAging(app, element); } catch (err) { console.warn("Inner Tempest | aging on the sheet", err); } });

// BLOCK 10 (1.0.0, on TRG Prime 3.674.0): a dragon kept in step with the
// Dragon Companion Table whenever its level moves; the egg's bonding and the
// broken bond's weekly recovery at daily preparation; a dragon's death, asked
// whenever its Dying or dead skull changes (and its restoration when they
// lift) and on the system's kill hook; and a dragon feat
// taken before its prerequisite.
Hooks.on("updateActor", (actor, changes) => { onActorUpdatedB10(actor, changes).catch((err) => console.warn("Inner Tempest | dragon growth", err)); });
Hooks.on("trgPrimeDailyPreparation", (ctx) => { onDailyPreparationB10(ctx).catch((err) => console.warn("Inner Tempest | daily preparation (Block 10)", err)); });
Hooks.on("trgPrimeCreatureSlain", (ctx) => { onCreatureSlainB10(ctx).catch((err) => console.warn("Inner Tempest | a dragon slain", err)); });
for (const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) Hooks.on(hook, (effect) => { onEffectChangedB10(effect).catch((err) => console.warn("Inner Tempest | a dragon dying", err)); });
Hooks.on("createItem", (item, options, userId) => { try { onItemCreatedB10(item, options, userId); } catch (err) { console.warn("Inner Tempest | dragon feat prerequisite", err); } });

// The buttons on this module's cards: Predator's Pounce's paid Strike and
// Ancestral Guidance's reroll.
Hooks.on("renderChatMessageHTML", (message, html) => bindCardButtons(message, html));

Hooks.once("ready", () => {
  registerBlock3Socket();
  registerBlock4Socket();
  registerBlock8Socket();
  if (game.system?.id !== "trg-prime") {
    ui.notifications?.error("Inner Tempest requires the TRG Prime system.");
    return;
  }
  if (!game.trgPrime?.modules) {
    ui.notifications?.error("Inner Tempest needs the TRG Prime companion-module API (TRG Prime 3.560.0 or later).");
    return;
  }
  if (foundry.utils.isNewerVersion(REQUIRED_SYSTEM, game.system.version)) {
    ui.notifications?.warn(`Inner Tempest is built for TRG Prime ${REQUIRED_SYSTEM} or later; this world runs ${game.system.version}.`);
  }
  // CHARACTERS MADE UNDER 0.6.0 brought into step (0.6.1): the Raptorial
  // Blade's AR on its trait line, Forgeheart's and Many-Faceted Vigilance's
  // raised ticks. The acting GM only; nothing changes when nothing needs to.
  if (game.user === game.users?.activeGM) {
    (async () => { for (const actor of game.actors ?? []) await reconcileB5Actor(actor); })()
      .catch((err) => console.warn("Inner Tempest | bringing characters into step (0.6.1)", err));
    // 0.7.0 (B6-8): a Mystic's Path-stamped innate spells take its Metamagic feats.
    (async () => { for (const actor of game.actors ?? []) await reconcileB6Actor(actor); })()
      .catch((err) => console.warn("Inner Tempest | bringing Mystics into step (0.7.0)", err));
    // 0.10.0: the Appendix's age categories on every creature with an age.
    reconcileAllAging().catch((err) => console.warn("Inner Tempest | aging (0.10.0)", err));
    // 1.0.0: every dragon companion in step with the Dragon Companion Table.
    reconcileAllDragons().catch((err) => console.warn("Inner Tempest | dragon growth (1.0.0)", err));
  }
});
