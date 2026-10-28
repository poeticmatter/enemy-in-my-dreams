import type { Card, Loot } from '../engine/cards.ts';
import { legalMoves } from '../engine/game.ts';
import type { Random } from '../engine/rng.ts';
import { cardOf, damageFrom, deckSize, neededToDefeat, permanentAttackBonus, type GameState, type Move } from '../engine/state.ts';

/** What a bot looks at when deciding whether to flip one more card. */
export interface FlipContext {
  /** Attack still missing, after any items the bot is willing to spend. */
  gap: number;
  flipsSoFar: number;
  isBossFight: boolean;
  /** Share of automiss cards in the draw pile. */
  automissShare: number;
  /** Average modifier of the non-automiss cards in the draw pile. */
  meanFlip: number;
}

export type FlipPolicy = (context: FlipContext) => boolean;

/** How many random orders of the draw pile a bot imagines when judging its odds: a rough gut feel, not a precise number. */
const IMAGINED_ORDERS = 40;

/**
 * The draw pile as an attentive player knows it: which cards are in it (everything
 * not in hand, discard, inventory or out of the game), never their order.
 */
export function unseenCards(state: GameState): Card[] {
  return state.drawPile.map((id) => cardOf(state, id));
}

export function drawPileOdds(unseen: readonly Card[]): Pick<FlipContext, 'automissShare' | 'meanFlip'> {
  if (unseen.length === 0) return { automissShare: 0, meanFlip: 0 };
  const safe = unseen.filter((entry) => !entry.isAutomiss);
  const meanFlip = safe.length === 0 ? 0 : safe.reduce((sum, entry) => sum + entry.modifier, 0) / safe.length;
  return { automissShare: (unseen.length - safe.length) / unseen.length, meanFlip };
}

/** Estimated chance that flipping the way `policy` flips closes `gap` before an automiss, an empty pile, or the policy giving up. */
export function chanceToClose(gap: number, unseen: readonly Card[], policy: FlipPolicy, isBossFight: boolean, rng: Random): number {
  if (gap <= 0) return 1;
  const odds = drawPileOdds(unseen);
  let successes = 0;
  for (let sample = 0; sample < IMAGINED_ORDERS; sample++) {
    if (imagineFlipping(gap, unseen, policy, { ...odds, isBossFight }, rng)) successes += 1;
  }
  return successes / IMAGINED_ORDERS;
}

function imagineFlipping(
  gap: number,
  unseen: readonly Card[],
  policy: FlipPolicy,
  context: Pick<FlipContext, 'automissShare' | 'meanFlip' | 'isBossFight'>,
  rng: Random,
): boolean {
  const pile = [...unseen];
  let total = 0;
  for (let flipsSoFar = 0; ; flipsSoFar++) {
    if (total >= gap) return true;
    if (pile.length === 0 || !policy({ ...context, gap: gap - total, flipsSoFar })) return false;
    const index = rng.int(pile.length);
    const flipped = pile[index];
    pile[index] = pile[pile.length - 1];
    pile.pop();
    if (flipped.isAutomiss) return false;
    total += flipped.modifier;
  }
}

/** Rough worth of loot in "cards of health", the unit damage is paid in. */
export function lootValue(loot: Loot): number {
  switch (loot.kind) {
    case 'permanentAttack':
      return 2.5 * loot.bonus;
    case 'permanentArmor':
      return 2 * loot.reduction;
    case 'itemAttack':
      return 0.5 + 0.6 * loot.bonus;
    case 'itemShield':
      return 0.5 + 0.4 * Math.min(loot.block, 5);
    case 'none':
      return 0;
  }
}

/** One way to start the turn, with everything a bot needs to judge it. */
export interface Option {
  move: Extract<Move, { kind: 'engage' }>;
  encounter: Card;
  attackCard: Card | null;
  /** Cards that stay in hand: the kept card (Turn A) or the contributors (Turn B). */
  kept: Card[];
  /** Total attack before flips and items. */
  attack: number;
  needed: number;
  damageIfLost: number;
}

export interface RatedOption extends Option {
  /** Estimated chance to win, flipping and spending items the way this bot would. */
  chance: number;
}

export function engagementOptions(state: GameState): Option[] {
  return legalMoves(state).flatMap((move) => {
    if (move.kind !== 'engage') return [];
    const encounter = cardOf(state, move.encounterId);
    const attackCard = move.attackCardId === null ? null : cardOf(state, move.attackCardId);
    const kept = state.hand.filter((id) => id !== move.encounterId && id !== move.attackCardId).map((id) => cardOf(state, id));
    const cardAttack = state.rules.turnStyle === 'A' ? (attackCard?.modifier ?? 0) : kept.reduce((sum, entry) => sum + entry.modifier, 0);
    return [
      {
        move,
        encounter,
        attackCard,
        kept,
        attack: cardAttack + permanentAttackBonus(state),
        needed: neededToDefeat(state, encounter.id),
        damageIfLost: damageFrom(state, encounter.id),
      },
    ];
  });
}

export function itemAttackTotal(items: readonly Card[]): number {
  return items.reduce((sum, item) => sum + (item.loot.kind === 'itemAttack' ? item.loot.bonus : 0), 0);
}

/** Cards drawn at the end of a turn: the reshuffle comes when the draw pile can't cover this. */
export function cardsDrawnPerTurn(state: GameState): number {
  return state.rules.turnStyle === 'A' ? 2 : 1;
}

/** The next reshuffle will probably happen before this bot's next turn starts. */
export function isReshuffleNear(state: GameState): boolean {
  return state.drawPile.length <= cardsDrawnPerTurn(state) + 2;
}

/** Health remaining, as a 0–1 pressure gauge: 1 when the deck is nearly gone. */
export function pressure(state: GameState): number {
  const full = Object.keys(state.cards).length;
  return 1 - deckSize(state) / full;
}
