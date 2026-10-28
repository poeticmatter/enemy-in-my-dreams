import type { Card } from './cards.ts';
import { attackNeeded, type RulesVariant } from './rules.ts';

export interface Fight {
  encounterId: string;
  /** A persistent card that was in hand at a reshuffle: fought with no attack card. */
  isForced: boolean;
  /** From the attack card (Turn A) or the cards left in hand (Turn B). Zero in forced fights. */
  cardAttack: number;
  flipTotal: number;
  flippedIds: string[];
  itemAttack: number;
  usedItemIds: string[];
  isShielded: boolean;
  shieldBlock: number;
  hasAutomissed: boolean;
}

export type Outcome = 'won' | 'lost' | 'stalled';

export type Phase = { kind: 'choose' } | { kind: 'fight'; fight: Fight } | { kind: 'over'; outcome: Outcome };

/** Work left over after a fight, done in order. A forced fight pauses it until resolved. */
export type PendingStep =
  | { kind: 'damage'; amount: number; isDevouring: boolean }
  | { kind: 'discardCard'; cardId: string }
  | { kind: 'refillHand' }
  | { kind: 'forcedFight'; cardId: string };

export interface GameState {
  rules: RulesVariant;
  cards: Readonly<Record<string, Card>>;
  /** Index 0 is the top. */
  drawPile: string[];
  discard: string[];
  hand: string[];
  /** Defeated cards: permanent loot, and items not yet used. */
  inventory: string[];
  removed: string[];
  turn: number;
  reshufflesThisTurn: number;
  phase: Phase;
  pending: PendingStep[];
  rngState: number;
}

export type Move =
  | { kind: 'engage'; encounterId: string; attackCardId: string | null }
  | { kind: 'flip' }
  | { kind: 'useItem'; itemId: string }
  | { kind: 'resolve' };

export type GameEvent =
  | { kind: 'turnStarted'; turn: number; deckSize: number }
  | { kind: 'engaged'; encounterId: string; attackCardId: string | null; contributorIds: string[] }
  | { kind: 'flipped'; cardId: string; isAutomiss: boolean }
  | { kind: 'itemUsed'; itemId: string }
  | {
      kind: 'fightResolved';
      encounterId: string;
      isForced: boolean;
      isWin: boolean;
      total: number;
      needed: number;
      flipCount: number;
      hasAutomissed: boolean;
      /** Damage the loss deals after armor and shields; 0 on a win. */
      damage: number;
    }
  /** `isDevouring`: the cards left the game instead of going to discard (persistent ones still go to discard). */
  | { kind: 'damageTaken'; cardIds: string[]; isDevouring: boolean }
  /** Stakes rule: flipped cards lost with the fight. */
  | { kind: 'flipsLost'; cardIds: string[] }
  | { kind: 'cardDrawn'; cardId: string }
  | { kind: 'reshuffled'; removedIds: string[]; forcedIds: string[]; drawPileSize: number }
  | { kind: 'forcedFight'; cardId: string }
  | { kind: 'gameOver'; outcome: Outcome };

export function cardOf(state: GameState, cardId: string): Card {
  const found = state.cards[cardId];
  if (!found) throw new Error(`No card with id "${cardId}"`);
  return found;
}

/** Cards still in the game and not in the inventory: your health. */
export function deckSize(state: GameState): number {
  return Object.keys(state.cards).length - state.inventory.length - state.removed.length;
}

export function permanentAttackBonus(state: GameState): number {
  return state.inventory.reduce((sum, id) => {
    const loot = cardOf(state, id).loot;
    return loot.kind === 'permanentAttack' ? sum + loot.bonus : sum;
  }, 0);
}

export function armor(state: GameState): number {
  return state.inventory.reduce((sum, id) => {
    const loot = cardOf(state, id).loot;
    return loot.kind === 'permanentArmor' ? sum + loot.reduction : sum;
  }, 0);
}

export function usableItems(state: GameState): Card[] {
  return state.inventory.map((id) => cardOf(state, id)).filter((item) => item.loot.kind === 'itemAttack' || item.loot.kind === 'itemShield');
}

export function currentFight(state: GameState): Fight | null {
  return state.phase.kind === 'fight' ? state.phase.fight : null;
}

export function fightTotal(state: GameState, fight: Fight): number {
  return fight.cardAttack + fight.flipTotal + fight.itemAttack + permanentAttackBonus(state);
}

/**
 * Attack the cards in hand give before flips, items and loot: the attack card (Turn A),
 * every other card in hand (Turn B), or nothing (Turn C).
 */
export function handAttack(state: GameState, encounterId: string, attackCardId: string | null): number {
  switch (state.rules.turnStyle) {
    case 'A':
      return attackCardId === null ? 0 : cardOf(state, attackCardId).modifier;
    case 'B':
      return state.hand.filter((id) => id !== encounterId).reduce((sum, id) => sum + cardOf(state, id).modifier, 0);
    case 'C':
      return 0;
  }
}

export function neededToDefeat(state: GameState, cardId: string): number {
  return attackNeeded(cardOf(state, cardId).enemy.defense, state.rules);
}

export function damageFrom(state: GameState, cardId: string): number {
  return Math.max(0, cardOf(state, cardId).enemy.attack - armor(state));
}

export function isFightWon(state: GameState, fight: Fight): boolean {
  return !fight.hasAutomissed && fightTotal(state, fight) >= neededToDefeat(state, fight.encounterId);
}
