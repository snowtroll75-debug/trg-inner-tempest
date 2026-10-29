# Inner Tempest 1.0.4

29 October 2026. Graham: "When imported into foundry it is dropping all of the options in the compendium without a root folder (like the other books such as pillars of faith are doing)."

- **Needs TRG Prime 3.674.2,** as before. **No migration**, and no rules or content change.

## Fixed

**The compendiums sit in one "Inner Tempest" folder.**
- **The fault:** the manifest declared no pack folder, so Foundry listed the fifteen Inner Tempest compendiums loose among everything else.
- **The fix:** `module.json` declares a `packFolders` entry named "Inner Tempest", as Pillars of Faith does. It holds all fifteen packs in book order: races, heritages, backgrounds, classes, abilities, feats, spells, gear, natural attacks, Dragon Companions, armour, weapons, runes, specific magic armour and weapons, and wondrous items.
- **When it shows:** Foundry builds the folder when the module is installed or updated. A world that already shows the packs loose may need the packs' folder reset, or a reload after the update.

## Harness

- **`verify-block10`:** 119 checks, one new: every pack is under the one "Inner Tempest" folder, exactly once.
- **`mutate-block10`:** 113 mutations, all caught. The two new ones are no folder at all, and a pack left out of the folder.
- **Every block re-pinned to 1.0.4;** all green.
