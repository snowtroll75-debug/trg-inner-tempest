/**
 * Inner Tempest — a companion module for TRG Prime (Foundry VTT).
 *
 * Content is DATA in the module's compendium packs, each declaring in
 * module.json the system pack it extends (`flags.trg-prime.extends`), so
 * TRG Prime federates it into its own pickers and grants. Rules that are
 * not data are registered through the system's module API inside the
 * `trgPrime.registerContent` hook TRG Prime fires from its own `init`.
 *
 * Scaffold (0.0.0): only the system check below. Registration arrives
 * with Block 1 — see docs/PROGRESS.md.
 */
import { registerContent } from "../module/registration.mjs";

const MODULE_ID = "trg-inner-tempest";
const REQUIRED_SYSTEM = "3.663.5";

Hooks.on("trgPrime.registerContent", (api) => {
  registerContent(api, MODULE_ID);
});

Hooks.once("ready", () => {
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
});
