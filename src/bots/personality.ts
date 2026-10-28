import type { Card } from '../engine/cards.ts';
import type { Random } from '../engine/rng.ts';
import { cardOf, damageFrom, fightTotal, neededToDefeat, usableItems, type Fight, type GameState, type Move } from '../engine/state.ts';
import { chanceToClose, drawPileOdds, engagementOptions, itemAttackTotal, unseenCards, type FlipPolicy, type RatedOption } from './outlook.ts';

/** How a bot thinks, as four small judgements. The driver below turns them into moves. */
export interface Personality {
  name: string;
  /** Flip one more card? Also used to judge each option's odds before committing. */
  flipPolicy: FlipPolicy;
  /** Single-use attack items it is willing to spend against this enemy. */
  spendableItems(state: GameState, encounter: Card): Card[];
  /** Spend a shield on this lost fight? */
  wantsShield(state: GameState, damage: number): boolean;
  /** The encounter (and Turn A attack card) to play this turn. */
  pickEngagement(state: GameState, options: readonly RatedOption[], rng: Random): RatedOption;
}

export interface Bot {
  name: string;
  chooseMove(state: GameState, rng: Random): Move;
}

export function botFrom(personality: Personality): Bot {
  return {
    name: personality.name,
    chooseMove(state, rng) {
      switch (state.phase.kind) {
        case 'choose':
          return personality.pickEngagement(state, rateOptions(state, personality, rng), rng).move;
        case 'fight':
          return fightMove(state, state.phase.fight, personality);
        case 'over':
          throw new Error('The game is over');
      }
    },
  };
}

export function rateOptions(state: GameState, personality: Personality, rng: Random): RatedOption[] {
  const unseen = unseenCards(state);
  return engagementOptions(state).map((option) => {
    const items = itemAttackTotal(personality.spendableItems(state, option.encounter));
    const gap = option.needed - option.attack - items;
    return { ...option, chance: chanceToClose(gap, unseen, personality.flipPolicy, option.encounter.isBoss, rng) };
  });
}

function fightMove(state: GameState, fight: Fight, personality: Personality): Move {
  const encounter = cardOf(state, fight.encounterId);
  if (!fight.hasAutomissed) {
    const gap = neededToDefeat(state, encounter.id) - fightTotal(state, fight);
    if (gap <= 0) return { kind: 'resolve' };
    const items = personality.spendableItems(state, encounter).filter((item) => item.loot.kind === 'itemAttack');
    const gapAfterItems = gap - itemAttackTotal(items);
    if (gapAfterItems > 0 && state.drawPile.length > 0) {
      const context = { gap: gapAfterItems, flipsSoFar: fight.flippedIds.length, isBossFight: encounter.isBoss, ...drawPileOdds(unseenCards(state)) };
      if (personality.flipPolicy(context)) return { kind: 'flip' };
    }
    if (gapAfterItems <= 0) return { kind: 'useItem', itemId: nextItemToCover(items, gap).id };
  }
  const damage = damageFrom(state, encounter.id);
  const shield = usableItems(state).find((item) => item.loot.kind === 'itemShield');
  if (shield && !fight.isShielded && damage > 0 && personality.wantsShield(state, damage)) return { kind: 'useItem', itemId: shield.id };
  return { kind: 'resolve' };
}

/** The smallest item that covers the gap alone, or else the biggest one (and repeat next move). */
function nextItemToCover(items: readonly Card[], gap: number): Card {
  const bonusOf = (item: Card) => (item.loot.kind === 'itemAttack' ? item.loot.bonus : 0);
  const sorted = [...items].sort((a, b) => bonusOf(a) - bonusOf(b));
  return sorted.find((item) => bonusOf(item) >= gap) ?? sorted[sorted.length - 1];
}

/** Highest score wins; ties go to the first option. */
export function best<T>(options: readonly T[], score: (option: T) => number): T {
  let bestOption = options[0];
  let bestScore = -Infinity;
  for (const option of options) {
    const value = score(option);
    if (value > bestScore) {
      bestOption = option;
      bestScore = value;
    }
  }
  return bestOption;
}

export const allAttackItems = (state: GameState): Card[] => usableItems(state).filter((item) => item.loot.kind === 'itemAttack');
