/**
 * Turn A: fight one card, discard another for its modifier, keep the third, draw 2.
 * Turn B: fight one card; the other two add their modifiers and stay in hand; draw 1.
 */
export type TurnStyle = 'A' | 'B';

/** `beat`: attack must exceed Defense. `match`: equalling it is enough. */
export type WinThreshold = 'beat' | 'match';

export interface RulesVariant {
  id: string;
  turnStyle: TurnStyle;
  winThreshold: WinThreshold;
  handSize: number;
  /** Safety net against games that loop forever; reaching it counts as a loss ("stalled"). */
  turnLimit: number;
  /**
   * Reshuffles allowed per turn; needing one more in the same turn means you lose.
   * null is the literal draft rule: unlimited, so a hit just cycles the deck and you almost never lose.
   */
  reshufflesPerTurn: number | null;
  /**
   * Proposed "stakes" rule, not in the draft: when you lose a fight, the cards you
   * flipped in it are removed from the game (persistent ones go to discard as usual).
   */
  lostFlipsAreRemoved: boolean;
}

const HAND_SIZE = 3;
const TURN_LIMIT = 200;
const RESHUFFLES_PER_TURN = 1;

function variant(turnStyle: TurnStyle, winThreshold: WinThreshold): RulesVariant {
  return {
    id: `${turnStyle}${winThreshold === 'beat' ? '>' : '>='}`,
    turnStyle,
    winThreshold,
    handSize: HAND_SIZE,
    turnLimit: TURN_LIMIT,
    reshufflesPerTurn: RESHUFFLES_PER_TURN,
    lostFlipsAreRemoved: false,
  };
}

/** The draft's reshuffle rule taken literally, to show why the default limits reshuffles per turn. */
function withLiteralDamage(base: RulesVariant): RulesVariant {
  return { ...base, id: `${base.id}literal`, reshufflesPerTurn: null };
}

function withStakes(base: RulesVariant): RulesVariant {
  return { ...base, id: `${base.id}+stakes`, lostFlipsAreRemoved: true };
}

const MAIN_VARIANTS = [variant('A', 'beat'), variant('A', 'match'), variant('B', 'beat'), variant('B', 'match')];

export const VARIANTS: Record<string, RulesVariant> = Object.fromEntries(
  [...MAIN_VARIANTS, ...MAIN_VARIANTS.map(withLiteralDamage), ...MAIN_VARIANTS.map(withStakes)].map((entry) => [entry.id, entry]),
);

/** What `npm run sim` compares by default: the draft rules and the same with the proposed stakes rule. */
export const MAIN_VARIANT_IDS: readonly string[] = [...MAIN_VARIANTS, ...MAIN_VARIANTS.map(withStakes)].map((entry) => entry.id);

/** The variant the playable UI starts with. */
export const RECOMMENDED_VARIANT_ID = 'A>+stakes';

export function variantFor(id: string): RulesVariant {
  const found = VARIANTS[id];
  if (!found) throw new Error(`Unknown rules variant "${id}". Known: ${Object.keys(VARIANTS).join(', ')}`);
  return found;
}

/** The smallest total attack that wins against this Defense. */
export function attackNeeded(defense: number, rules: RulesVariant): number {
  return rules.winThreshold === 'beat' ? defense + 1 : defense;
}
