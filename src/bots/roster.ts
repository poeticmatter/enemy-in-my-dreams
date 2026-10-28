import type { Card } from '../engine/cards.ts';
import { damageFrom, deckSize, type GameState } from '../engine/state.ts';
import { isReshuffleNear, lootValue, pressure, type RatedOption } from './outlook.ts';
import { allAttackItems, best, botFrom, type Bot, type Personality } from './personality.ts';

/** Option score that beats every non-boss option: defeating the boss wins the game. */
const WIN = 1000;
const always = () => true;

/** Fights the weakest enemy with its highest attack card. Never flips. */
const naive: Personality = {
  name: 'naive',
  flipPolicy: () => false,
  spendableItems: allAttackItems,
  wantsShield: always,
  pickEngagement: (_state, options) =>
    best(options, (option) => (option.encounter.isBoss ? -WIN : 0) - 100 * option.encounter.enemy.defense + option.attack),
};

/** Goes for the best loot it can probably beat. Flips when about two cards short. */
const greedy: Personality = {
  name: 'greedy',
  flipPolicy: ({ gap, meanFlip }) => gap <= 2 * meanFlip,
  spendableItems: allAttackItems,
  wantsShield: always,
  pickEngagement: (_state, options) => bestLootItCanProbablyBeat(options),
};

function bestLootItCanProbablyBeat(options: readonly RatedOption[], lootOf = (option: RatedOption) => lootValue(option.encounter.loot)): RatedOption {
  const likely = options.filter((option) => option.chance >= 0.5);
  if (likely.length === 0) return best(options, (option) => option.chance);
  return best(likely, (option) => (option.encounter.isBoss ? WIN : lootOf(option)) + option.chance);
}

/** Takes the safest fight. Flips only when one card should cover it, and only if automiss cards are scarce. */
const cautious: Personality = {
  name: 'cautious',
  flipPolicy: ({ gap, meanFlip, automissShare, flipsSoFar }) => gap <= meanFlip && automissShare <= 0.12 && flipsSoFar < 3,
  spendableItems: allAttackItems,
  wantsShield: always,
  pickEngagement: (_state, options) => {
    const allowed = withBossOnlyIf(options, (boss) => boss.chance >= 0.8);
    const safe = allowed.filter((option) => option.chance >= 0.8);
    if (safe.length > 0) return best(safe, (option) => (option.encounter.isBoss ? WIN : lootValue(option.encounter.loot)));
    return best(allowed, (option) => -(1 - option.chance) * option.damageIfLost + 0.1 * option.chance);
  },
};

/** Fights the boss the moment the odds look okay, and flips as long as it takes against it. */
const bossRusher: Personality = {
  name: 'boss-rusher',
  flipPolicy: ({ gap, meanFlip, isBossFight }) => isBossFight || gap <= 2 * meanFlip,
  spendableItems: allAttackItems,
  wantsShield: always,
  pickEngagement: (_state, options) => {
    const bossOptions = options.filter((option) => option.encounter.isBoss && option.chance >= 0.25);
    if (bossOptions.length > 0) return best(bossOptions, (option) => option.chance);
    // Until then, it wants permanent attack above all.
    const rusherLoot = (option: RatedOption) => lootValue(option.encounter.loot) * (option.encounter.loot.kind === 'permanentAttack' ? 1.5 : 1);
    return bestLootItCanProbablyBeat(options, rusherLoot);
  },
};

/** Holds the boss as long as it can to loot up, saving every item for it. */
const hoarder: Personality = {
  name: 'hoarder',
  flipPolicy: ({ gap, meanFlip, isBossFight }) => isBossFight || gap <= 3 * meanFlip,
  spendableItems: (state, encounter) => (encounter.isBoss ? allAttackItems(state) : []),
  wantsShield: always,
  pickEngagement: (state, options) => {
    const mustFaceBoss = isReshuffleNear(state) || deckSize(state) <= 8;
    const allowed = withBossOnlyIf(options, (boss) => boss.chance >= 0.9 || mustFaceBoss);
    const keepsBoss = (option: RatedOption) => option.kept.some((entry) => entry.isBoss);
    return best(allowed, (option) => {
      if (option.encounter.isBoss) return WIN + option.chance;
      return expectedGain(option, 1) + (keepsBoss(option) ? 5 : 0);
    });
  },
};

export interface SmartOptions {
  /** Win chance it wants before trying the boss when a failed try would be fatal (half that while survivable). */
  bossThreshold: number;
  /** How far it chases with flips in ordinary fights, in average flips' worth of missing attack. */
  chase: number;
  /** The same, against the boss. */
  bossChase: number;
  /** At this deck size or below it stops waiting and swings at the boss whenever it can. */
  lastStand: number;
}

const SMART_DEFAULTS: SmartOptions = { bossThreshold: 0.6, chase: 3, bossChase: Infinity, lastStand: 5 };

/**
 * A decent player: weighs loot against damage (damage hurts more as the deck shrinks),
 * keeps good attack cards, gets persistent cards out of hand before a reshuffle,
 * and tries the boss once the odds clear its bar (half the bar while a failed try is survivable).
 */
export function createSmart(overrides: Partial<SmartOptions> = {}, name = 'smart'): Personality {
  const { bossThreshold, chase, bossChase, lastStand } = { ...SMART_DEFAULTS, ...overrides };
  return {
    name,
    flipPolicy: ({ gap, meanFlip, automissShare, isBossFight }) =>
      meanFlip > 0 && gap <= meanFlip * (isBossFight ? bossChase : chase) && automissShare <= (isBossFight ? 0.5 : 0.25),
    spendableItems: allAttackItems,
    wantsShield: (_state, damage) => damage >= 2,
    pickEngagement: (state, options) => {
      const allowed = withBossOnlyIf(options, (boss) => isBossWorthTrying(state, boss, { bossThreshold, lastStand }));
      const damageWeight = 1 + 2 * pressure(state);
      return best(allowed, (option) =>
        option.encounter.isBoss ? WIN + option.chance : expectedGain(option, damageWeight) + keepValue(state, option.kept),
      );
    },
  };
}

function isBossWorthTrying(state: GameState, boss: RatedOption, { bossThreshold, lastStand }: Pick<SmartOptions, 'bossThreshold' | 'lastStand'>): boolean {
  if (deckSize(state) <= lastStand) return true;
  // One reshuffle per turn: a hit bigger than the draw and discard piles together is fatal.
  const isFailureSurvivable = boss.damageIfLost <= state.drawPile.length + state.discard.length;
  return boss.chance >= (isFailureSurvivable ? bossThreshold / 2 : bossThreshold);
}

function expectedGain(option: RatedOption, damageWeight: number): number {
  return option.chance * lootValue(option.encounter.loot) - (1 - option.chance) * option.damageIfLost * damageWeight;
}

/**
 * A kept card is next turn's attack (Turn A and B; in Turn C hand cards never attack),
 * unless it is persistent and a reshuffle is coming: then it's a forced fight.
 */
function keepValue(state: GameState, kept: readonly Card[]): number {
  const isForcedFightComing = isReshuffleNear(state);
  const attackWeight = state.rules.turnStyle === 'C' ? 0 : 0.3;
  return kept.reduce((sum, entry) => {
    if (entry.isPersistent && isForcedFightComing) return sum - damageFrom(state, entry.id) - (entry.isBoss ? 3 : 0);
    return sum + attackWeight * entry.modifier;
  }, 0);
}

/** Drops boss options that fail `isReady`, unless that would leave nothing to play. */
function withBossOnlyIf(options: readonly RatedOption[], isReady: (boss: RatedOption) => boolean): readonly RatedOption[] {
  const allowed = options.filter((option) => !option.encounter.isBoss || isReady(option));
  return allowed.length > 0 ? allowed : options;
}

const ROSTER: Record<string, Personality> = Object.fromEntries(
  [naive, greedy, cautious, bossRusher, hoarder, createSmart()].map((personality) => [personality.name, personality]),
);

export const MAIN_BOT_NAMES: readonly string[] = Object.keys(ROSTER);

/**
 * Builds a bot from a name, so worker threads can rebuild it. Smart takes overrides:
 * "smart:bossThreshold=0.3,chase=1".
 */
export function botFor(spec: string): Bot {
  const [name, overrideText] = spec.split(':');
  if (overrideText !== undefined) {
    if (name !== 'smart') throw new Error(`Only smart takes options, got "${spec}"`);
    return botFrom(createSmart(parseSmartOverrides(overrideText), spec));
  }
  const personality = ROSTER[name];
  if (!personality) throw new Error(`Unknown bot "${spec}". Known: ${MAIN_BOT_NAMES.join(', ')}`);
  return botFrom(personality);
}

function parseSmartOverrides(text: string): Partial<SmartOptions> {
  const overrides: Partial<SmartOptions> = {};
  for (const pair of text.split(',')) {
    const [key, value] = pair.split('=');
    if (!(key in SMART_DEFAULTS)) throw new Error(`Unknown smart option "${key}"`);
    overrides[key as keyof SmartOptions] = value === 'inf' ? Infinity : Number(value); // checked against SMART_DEFAULTS above
  }
  return overrides;
}
