/**
 * Everything Inner Tempest registers through TRG Prime's module API.
 * Called once from the `trgPrime.registerContent` hook.
 *
 * Scaffold (0.0.0): registers nothing yet. Each block adds its own
 * registrations here (languages, traits, classes, archetypes, skill
 * actions, feat access, automations) — see docs/PROGRESS.md.
 *
 * @param {object} api       game.trgPrime.modules as handed to the hook
 * @param {string} moduleId  this module's id
 */
export function registerContent(api, moduleId) {
  if (!api || typeof api !== "object") throw new Error(`${moduleId}: TRG Prime module API missing`);
}
