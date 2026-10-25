/**
 * Inner Tempest, Chapter 5 — the General feats (22 printed, and Spirit
 * Stance, supplied with v1.2 for the Spirit Warrior background; IT-C1).
 *
 * Each feat carries the book's own words, then one paragraph saying exactly
 * what TRG Prime does with it. Several open or change Chapter 4 skill
 * actions that ship in Block 2 (Centred Balance, Elemental Ward); until
 * then those feats say so.
 */
import fs from "node:fs";
import { feat, conditional, declaredEffect } from "./builders.mjs";
import { md } from "./markdown.mjs";

const text = JSON.parse(fs.readFileSync(new URL("./book-text.json", import.meta.url), "utf8")).feats;

/** The book's entry, then what the system does with it. */
const body = (name, how) => {
  const printed = text[name];
  if (!printed) throw new Error(`No book text for feat "${name}"`);
  return `${md(printed)}\n${md(how)}`;
};

export const GENERAL_FEATS = [
  feat({
    name: "Ancestral Guidance",
    description: body("Ancestral Guidance", "*Automated:* after a Recall Knowledge or Create check below a Success, the card that follows offers **Ancestral Guidance — reroll**. Pressing it rerolls the check (no further AP), and a point of conviction is spent only if the new result is a Success or better. You need a point of conviction to try."),
    flags: { itAutomation: "ancestralGuidance" }
  }),
  feat({
    name: "Artisan's Enchantment", prerequisites: "Crafting 5 ranks, Inner Discipline or Caster Level 4",
    description: body("Artisan’s Enchantment", "*Not automated:* TRG Prime's Create project derives its success modifier from the check's margin and has no place yet to take 2 from it. Lower it by hand when you imbue a quality, and add the alteration trait to the finished item.")
  }),
  feat({
    name: "Artistic Diversity", prerequisites: "Artistry 10 ranks",
    description: body("Artistic Diversity", "*Not automated:* Artistry specialties are not modelled as separate skills; when you make an Artistry check for a specialty you have not learnt, set the DC one step harder (Very Hard, +5).")
  }),
  feat({
    name: "Artistic Negotiation", prerequisites: "Artistry 2 ranks",
    description: body("Artistic Negotiation", "*Automated:* Encourage and Make an Impression are offered from your Artistry skill as well as Diplomacy.")
  }),
  feat({
    name: "Astral Insight", prerequisites: "Planes 2 ranks",
    description: body("Astral Insight", "*Offered:* advantage in every Planes roll's dialog — tick it when the check concerns the astral plane."),
    flags: { conditionals: [conditional({ kind: "advantage", label: "Astral Insight", scope: "Planes checks regarding the astral plane — tick if this check is one", auto: false, when: { checkTypes: ["skill"], subjects: ["planes"] } })] }
  }),
  feat({
    name: "Centred Cleansing", prerequisites: "Meditation 5 ranks",
    description: body("Centred Cleansing", "*Applied automatically:* advantage on every Cleansing Trance (Meditation) check."),
    flags: { conditionals: [conditional({ kind: "advantage", label: "Centred Cleansing", scope: "Cleansing Trance (Meditation) checks", auto: true, when: { checkTypes: ["skill"], actions: ["cleansingTrance"] } })] }
  }),
  feat({
    name: "Centred Recovery", prerequisites: "Meditation 1 rank",
    description: body("Centred Recovery", "*Applied automatically:* your first Refocus each day resolves one degree better, to a maximum of Critical (the card says so), and your first Power Recovery check during a rest each day restores double the PP. Daily preparation starts the count again."),
    effects: [declaredEffect("first Refocus and Power Recovery each day", "The first Refocus each day improves by one degree (maximum Critical); the first Power Recovery each day restores double the PP.", {
      dailyFirst: [
        { action: "refocus", improve: 1, max: "critical", label: "Centred Recovery" },
        { action: "powerRecovery", multiplier: 2, label: "Centred Recovery" }
      ]
    })]
  }),
  feat({
    name: "Contortionist", prerequisites: "Acrobatics 10 ranks",
    description: body("Contortionist", "*Not automated:* Squeeze's time is narrative in TRG Prime. Measure it in rounds rather than minutes, and at your full Speed on a Critical.")
  }),
  feat({
    name: "Elemental Balance", prerequisites: "Survival 5 ranks",
    description: body("Elemental Balance", "*Use (when the save is called for):* choose the save. If your Survival is higher, the difference is queued as an untyped bonus for your next saving throw, so that save is rolled at your Survival bonus. The Elemental trait is yours to confirm; nothing is queued if Survival is not higher."),
    flags: { itAutomation: "elementalBalance" }
  }),
  feat({
    name: "Elemental Warding", prerequisites: "Nature 5 ranks",
    description: body("Elemental Warding", "*Automated:* Elemental Ward appears under Nature on your Skills tab while you have this feat — DC 20, the time you spend chosen as you roll; on a Success or better you pick the element and the 10-ft ward is drawn around your token.")
  }),
  feat({
    name: "Ethereal Sight", prerequisites: "Perception 5 ranks, Sense Motive 5 ranks",
    description: body("Ethereal Sight", "*Applied automatically:* your magical weapon Strikes against an incorporeal creature ignore its immunity to non-magical attacks and its resistance to all damage (as Ghost Touch does), and a hidden creature's flat check to avoid your attacks is 2 harder. *Not automated:* the same for your spells, whose damage path has no such switch yet; seeing incorporeal creatures is yours to declare."),
    effects: [declaredEffect("ethereal sight", "Your magical attacks affect incorporeal creatures normally; the flat check a hidden target makes to avoid your attacks is 2 higher.", {
      ghostTouch: { magicalOnly: true },
      missCheckDCIncrease: { value: 2, conditions: ["hidden"] }
    })]
  }),
  feat({
    name: "Inner Balance", prerequisites: "Meditation 2 ranks",
    description: body("Inner Balance", "*Automated:* Centred Balance appears under Meditation on your Skills tab while you have this feat — the time you meditate chosen as you roll; its Bonus Check result is applied to the check you make next.")
  }),
  feat({
    name: "Leap", prerequisites: "Athletics 10 ranks",
    description: body("Leap", "*Not automated:* a High Jump or Long Jump whose DC is 20 or less is a Success without a roll — declare it rather than rolling.")
  }),
  feat({
    name: "Meditative Recovery", prerequisites: "Meditation 4 ranks, Inner Discipline",
    description: body("Meditative Recovery", "*Not automated:* the Rest macro rolls Healing Trance once per hour of rest. When you meditate for 10 minutes instead, roll Healing Trance from your sheet and apply its multiplier to that hour's Natural Healing by hand; the one-hour wait between uses stands.")
  }),
  feat({
    name: "Radiant Insight", prerequisites: "Divinity tradition or Devoted Path, Religion 5 ranks",
    description: body("Radiant Insight", "*Automated:* Clear Mind is offered from your Religion skill as well as Meditation.")
  }),
  feat({
    name: "Sense Ambush", prerequisites: "Perception 5 ranks",
    description: body("Sense Ambush", "*Offered:* +5 on Awareness checks — tick it when the thing to be noticed is a direct threat to you (the DC moving 5 in your favour is the same as the check rising by 5)."),
    flags: { conditionals: [conditional({ kind: "modifier", value: 5, type: "untyped", label: "Sense Ambush", scope: "Awareness checks to notice a direct threat to you — tick if this check is one", auto: false, when: { checkTypes: ["skill"], actions: ["awareness"] } })] }
  }),
  feat({
    name: "Spatial Balance", prerequisites: "Mental Focus 5 ranks",
    description: body("Spatial Balance", "*Applied automatically:* advantage on every Spatial Awareness (Mental Focus) check."),
    flags: { conditionals: [conditional({ kind: "advantage", label: "Spatial Balance", scope: "Spatial Awareness (Mental Focus) checks", auto: true, when: { checkTypes: ["skill"], actions: ["spatialAwareness"] } })] }
  }),
  feat({
    name: "Spirit Stance", traits: "Stance",
    description: body("Spirit Stance", "*Use:* enters the stance at the core's default of 1 AP (the per-round Stance rule, the previous stance's replacement and Stance Mastery all as the core's own stances). While it lasts: +1 circumstance to your attack checks and to your DB against creatures with the Spirit or Incorporeal trait, and your physical Strikes count as magical against them; a creature possessing another is offered as a tick on your attacks. Delete the stance's effect to leave it."),
    flags: { itAutomation: "spiritStance" }
  }),
  feat({
    name: "Spirit Whisperer", prerequisites: "Meditation 5 ranks",
    description: body("Spirit Whisperer", "*Automated:* Gather Information is offered from your Meditation skill as well as Diplomacy. What the spirits know is the GM's to say.")
  }),
  feat({
    name: "Stunning Reflexes", prerequisites: "Mental Focus 5 ranks",
    description: body("Stunning Reflexes", "*Use (when a stun lands):* rolls Stunned Manoeuvre (Mental Focus) as a free action — no reaction, no AP — once a turn in combat. Target the stunning creature first, as Stunned Manoeuvre asks."),
    flags: { itAutomation: "stunningReflexes" }
  }),
  feat({
    name: "Tranquil Mind", prerequisites: "Mental Focus 5 ranks",
    description: body("Tranquil Mind", "*Applied automatically* while any stance is up: advantage on saves against effects with the Emotion or Fear trait; offered as a tick on a save whose source the roll cannot see."),
    flags: {
      stanceConditionals: [
        conditional({ kind: "advantage", label: "Tranquil Mind", scope: "Saving throws against emotion and fear effects while in a stance", auto: true, when: { checkTypes: ["save"], traits: ["emotion", "fear"] } }),
        conditional({ kind: "advantage", label: "Tranquil Mind", scope: "Saving throws against an emotion or fear effect that carries neither trait, while in a stance — tick if this save is one", auto: false, when: { checkTypes: ["save"], not: { traits: ["emotion", "fear"] } } })
      ]
    }
  }),
  feat({
    name: "Veiled Essence", prerequisites: "BSB 2+ or Inner Discipline, Stealth 2 ranks",
    description: body("Veiled Essence", "*Not automated:* Ambush and Sniping are rolled from your sheet as usual; their bonus reaches a spell, an innate spell or an Attack technique by your declaration (core dependency D14).")
  }),
  feat({
    name: "Zen Awareness", prerequisites: "Perception 5 ranks",
    description: body("Zen Awareness", "*Applied automatically:* a hidden or invisible creature's flat check to avoid your attacks is 1 harder. *Offered:* advantage on Search and Awareness checks — tick it when you are locating a hidden or invisible creature."),
    flags: { conditionals: [conditional({ kind: "advantage", label: "Zen Awareness", scope: "Checks to locate hidden or invisible creatures — tick if this check is one", auto: false, when: { checkTypes: ["skill"], actions: ["search", "awareness"] } })] },
    effects: [declaredEffect("zen awareness", "The flat check a hidden or invisible creature makes to avoid your attacks is 1 higher.", { missCheckDCIncrease: { value: 1, conditions: ["hidden", "invisible"] } })]
  })
];
