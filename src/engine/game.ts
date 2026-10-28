import { validateCardSet, type CardSet } from './cards.ts';
import { shuffle } from './rng.ts';
import type { RulesVariant } from './rules.ts';
import {
  cardOf,
  damageFrom,
  deckSize,
  fightTotal,
  isFightWon,
  neededToDefeat,
  type Fight,
  type GameEvent,
  type GameState,
  type Move,
  type Outcome,
  type PendingStep,
} from './state.ts';

export class IllegalMoveError extends Error {}

export interface Transition {
  state: GameState;
  events: GameEvent[];
}

/**
 * Every transition works on a private copy of the state ("draft") and records
 * what happened, so callers only ever see immutable before/after states.
 */
interface Draft {
  state: GameState;
  events: GameEvent[];
}

function copyState(state: GameState): GameState {
  const phase = state.phase.kind === 'fight' ? { kind: 'fight' as const, fight: copyFight(state.phase.fight) } : state.phase;
  return {
    ...state,
    drawPile: [...state.drawPile],
    discard: [...state.discard],
    hand: [...state.hand],
    inventory: [...state.inventory],
    removed: [...state.removed],
    pending: [...state.pending],
    phase,
  };
}

function copyFight(fight: Fight): Fight {
  return { ...fight, flippedIds: [...fight.flippedIds], usedItemIds: [...fight.usedItemIds] };
}

export function createGame(cardSet: CardSet, rules: RulesVariant, seed: number): Transition {
  validateCardSet(cardSet);
  const cards = Object.fromEntries(cardSet.cards.map((entry) => [entry.id, entry]));
  const shuffled = shuffle(
    cardSet.cards.map((entry) => entry.id),
    seed >>> 0,
  );
  const state: GameState = {
    rules,
    cards,
    drawPile: shuffled.items.slice(rules.handSize),
    discard: [],
    hand: shuffled.items.slice(0, rules.handSize),
    inventory: [],
    removed: [],
    turn: 1,
    reshufflesThisTurn: 0,
    phase: { kind: 'choose' },
    pending: [],
    rngState: shuffled.nextRngState,
  };
  return { state, events: [{ kind: 'turnStarted', turn: 1, deckSize: deckSize(state) }] };
}

export function applyMove(state: GameState, move: Move): Transition {
  const draft: Draft = { state: copyState(state), events: [] };
  switch (move.kind) {
    case 'engage':
      engage(draft, move.encounterId, move.attackCardId);
      break;
    case 'flip':
      flip(draft);
      break;
    case 'useItem':
      useItem(draft, move.itemId);
      break;
    case 'resolve':
      resolve(draft);
      break;
  }
  return draft;
}

function requireFight(draft: Draft): Fight {
  if (draft.state.phase.kind !== 'fight') throw new IllegalMoveError('There is no fight in progress');
  return draft.state.phase.fight;
}

function removeFrom(pile: string[], cardId: string, pileName: string): void {
  const index = pile.indexOf(cardId);
  if (index < 0) throw new IllegalMoveError(`"${cardId}" is not in the ${pileName}`);
  pile.splice(index, 1);
}

function engage(draft: Draft, encounterId: string, attackCardId: string | null): void {
  const { state } = draft;
  if (state.phase.kind !== 'choose') throw new IllegalMoveError('You can only pick an encounter at the start of a turn');
  removeFrom(state.hand, encounterId, 'hand');

  let cardAttack: number;
  let contributorIds: string[] = [];
  if (state.rules.turnStyle === 'A') {
    const needsAttackCard = state.hand.length > 0;
    if (needsAttackCard !== (attackCardId !== null)) {
      throw new IllegalMoveError(needsAttackCard ? 'Turn A needs an attack card' : 'There is no card left to attack with');
    }
    if (attackCardId !== null) {
      removeFrom(state.hand, attackCardId, 'hand');
      state.discard.push(attackCardId);
    }
    cardAttack = attackCardId === null ? 0 : cardOf(state, attackCardId).modifier;
  } else {
    if (attackCardId !== null) throw new IllegalMoveError('Turn B has no attack card: the cards left in hand contribute');
    contributorIds = [...state.hand];
    cardAttack = contributorIds.reduce((sum, id) => sum + cardOf(state, id).modifier, 0);
  }

  state.phase = { kind: 'fight', fight: newFight(encounterId, cardAttack, false) };
  state.pending = [{ kind: 'refillHand' }];
  draft.events.push({ kind: 'engaged', encounterId, attackCardId, contributorIds });
}

function newFight(encounterId: string, cardAttack: number, isForced: boolean): Fight {
  return {
    encounterId,
    isForced,
    cardAttack,
    flipTotal: 0,
    flippedIds: [],
    itemAttack: 0,
    usedItemIds: [],
    isShielded: false,
    shieldBlock: 0,
    hasAutomissed: false,
  };
}

function flip(draft: Draft): void {
  const fight = requireFight(draft);
  const { state } = draft;
  if (fight.hasAutomissed) throw new IllegalMoveError('The attack already failed');
  // Default (flagged in RULES.md): flipping never triggers a reshuffle.
  const cardId = state.drawPile.shift();
  if (cardId === undefined) throw new IllegalMoveError('The draw pile is empty');
  state.discard.push(cardId);
  fight.flippedIds.push(cardId);
  const flipped = cardOf(state, cardId);
  if (flipped.isAutomiss) fight.hasAutomissed = true;
  else fight.flipTotal += flipped.modifier;
  draft.events.push({ kind: 'flipped', cardId, isAutomiss: flipped.isAutomiss });
}

function useItem(draft: Draft, itemId: string): void {
  const fight = requireFight(draft);
  const { state } = draft;
  const item = cardOf(state, itemId);
  const { loot } = item;
  if (loot.kind === 'itemAttack') {
    if (fight.hasAutomissed) throw new IllegalMoveError('The attack already failed');
    fight.itemAttack += loot.bonus;
  } else if (loot.kind === 'itemShield') {
    if (fight.isShielded) throw new IllegalMoveError('This fight is already shielded');
    fight.isShielded = true;
    fight.shieldBlock = loot.block;
  } else {
    throw new IllegalMoveError(`${item.name} is not a single-use item`);
  }
  removeFrom(state.inventory, itemId, 'inventory');
  state.discard.push(itemId);
  fight.usedItemIds.push(itemId);
  draft.events.push({ kind: 'itemUsed', itemId });
}

function resolve(draft: Draft): void {
  const fight = requireFight(draft);
  const { state } = draft;
  const encounter = cardOf(state, fight.encounterId);
  const isWin = isFightWon(state, fight);
  const damage = isWin ? 0 : Math.max(0, damageFrom(state, encounter.id) - fight.shieldBlock);
  draft.events.push({
    kind: 'fightResolved',
    encounterId: encounter.id,
    isForced: fight.isForced,
    isWin,
    total: fightTotal(state, fight),
    needed: neededToDefeat(state, encounter.id),
    flipCount: fight.flippedIds.length,
    hasAutomissed: fight.hasAutomissed,
    damage,
  });

  if (isWin) {
    state.inventory.push(encounter.id);
    if (encounter.isBoss) return endGame(draft, 'won');
  } else {
    if (state.rules.lostFlipsAreRemoved) loseFlippedCards(draft, fight);
    // Rules order: take the damage, then the encounter card goes to discard (so it can't be dealt as damage).
    state.pending.unshift(
      { kind: 'damage', amount: damage, isDevouring: encounter.isDevouring },
      { kind: 'discardCard', cardId: encounter.id },
    );
  }
  // Marks "between fights" while leftover work runs; a forced fight or the end of the game replaces it.
  state.phase = { kind: 'choose' };
  runPendingSteps(draft);
}

function loseFlippedCards(draft: Draft, fight: Fight): void {
  const { state } = draft;
  const lostIds = fight.flippedIds.filter((id) => !cardOf(state, id).isPersistent);
  if (lostIds.length === 0) return;
  for (const id of lostIds) removeFrom(state.discard, id, 'discard pile');
  state.removed.push(...lostIds);
  draft.events.push({ kind: 'flipsLost', cardIds: lostIds });
}

function runPendingSteps(draft: Draft): void {
  const { state } = draft;
  while (state.pending.length > 0) {
    const step = state.pending.shift()!; // length checked by the loop
    switch (step.kind) {
      case 'damage':
        takeDamage(draft, step);
        break;
      case 'discardCard':
        state.discard.push(step.cardId);
        break;
      case 'refillHand':
        refillHand(draft);
        break;
      case 'forcedFight':
        state.phase = { kind: 'fight', fight: newFight(step.cardId, 0, true) };
        draft.events.push({ kind: 'forcedFight', cardId: step.cardId });
        break;
    }
    if (state.phase.kind !== 'choose') return;
  }
  startNextTurn(draft);
}

/** Safety net for the literal (unlimited) reshuffle rule, where a deck of only persistent cards can loop forever. */
const RUNAWAY_RESHUFFLES_PER_TURN = 50;

/** Ends the game when this turn has used up its reshuffles; returns whether a reshuffle may happen. */
function mayReshuffle(draft: Draft): boolean {
  const { state } = draft;
  const limit = state.rules.reshufflesPerTurn;
  if (limit !== null && state.reshufflesThisTurn >= limit) {
    endGame(draft, 'lost');
    return false;
  }
  if (state.reshufflesThisTurn >= RUNAWAY_RESHUFFLES_PER_TURN) {
    endGame(draft, 'stalled');
    return false;
  }
  return true;
}

function takeDamage(draft: Draft, { amount, isDevouring }: Extract<PendingStep, { kind: 'damage' }>): void {
  const { state } = draft;
  const discardedIds: string[] = [];
  const reportDamage = () => discardedIds.length > 0 && draft.events.push({ kind: 'damageTaken', cardIds: discardedIds, isDevouring });
  for (let dealt = 0; dealt < amount; dealt++) {
    if (state.drawPile.length === 0) {
      if (state.discard.length === 0) {
        reportDamage();
        return endGame(draft, 'lost');
      }
      if (!mayReshuffle(draft)) {
        reportDamage();
        return;
      }
      const forcedIds = reshuffle(draft);
      if (forcedIds.length > 0) {
        reportDamage();
        state.pending.unshift(...forcedIds.map(forcedFightStep), { kind: 'damage', amount: amount - dealt, isDevouring });
        return;
      }
    }
    const cardId = state.drawPile.shift()!; // refilled above when empty
    if (isDevouring && !cardOf(state, cardId).isPersistent) state.removed.push(cardId);
    else state.discard.push(cardId);
    discardedIds.push(cardId);
  }
  reportDamage();
}

function refillHand(draft: Draft): void {
  const { state } = draft;
  while (state.hand.length < state.rules.handSize) {
    if (state.drawPile.length === 0) {
      if (state.discard.length === 0) return;
      if (!mayReshuffle(draft)) return;
      const forcedIds = reshuffle(draft);
      if (forcedIds.length > 0) {
        state.pending.unshift(...forcedIds.map(forcedFightStep), { kind: 'refillHand' });
        return;
      }
      continue;
    }
    const cardId = state.drawPile.shift()!; // checked above
    state.hand.push(cardId);
    draft.events.push({ kind: 'cardDrawn', cardId });
  }
}

const forcedFightStep = (cardId: string) => ({ kind: 'forcedFight' as const, cardId });

/** Removes the hand from the game (persistent cards must be fought instead) and shuffles the discard into the draw pile. */
function reshuffle(draft: Draft): string[] {
  const { state } = draft;
  const leaving = state.hand;
  state.hand = [];
  const forcedIds = leaving.filter((id) => cardOf(state, id).isPersistent);
  const removedIds = leaving.filter((id) => !cardOf(state, id).isPersistent);
  state.removed.push(...removedIds);
  const shuffled = shuffle(state.discard, state.rngState);
  state.drawPile = shuffled.items;
  state.rngState = shuffled.nextRngState;
  state.discard = [];
  state.reshufflesThisTurn += 1;
  draft.events.push({ kind: 'reshuffled', removedIds, forcedIds, drawPileSize: state.drawPile.length });
  return forcedIds;
}

function startNextTurn(draft: Draft): void {
  const { state } = draft;
  if (state.hand.length === 0) return endGame(draft, 'lost');
  if (state.turn >= state.rules.turnLimit) return endGame(draft, 'stalled');
  state.turn += 1;
  state.reshufflesThisTurn = 0;
  draft.events.push({ kind: 'turnStarted', turn: state.turn, deckSize: deckSize(state) });
}

function endGame(draft: Draft, outcome: Outcome): void {
  draft.state.phase = { kind: 'over', outcome };
  draft.events.push({ kind: 'gameOver', outcome });
}

export function legalMoves(state: GameState): Move[] {
  switch (state.phase.kind) {
    case 'over':
      return [];
    case 'choose':
      return state.hand.flatMap((encounterId) => engagementsFor(state, encounterId));
    case 'fight': {
      const { fight } = state.phase;
      const moves: Move[] = [{ kind: 'resolve' }];
      if (!fight.hasAutomissed && state.drawPile.length > 0) moves.push({ kind: 'flip' });
      for (const itemId of state.inventory) {
        const loot = cardOf(state, itemId).loot;
        const isUsable = (loot.kind === 'itemAttack' && !fight.hasAutomissed) || (loot.kind === 'itemShield' && !fight.isShielded);
        if (isUsable) moves.push({ kind: 'useItem', itemId });
      }
      return moves;
    }
  }
}

function engagementsFor(state: GameState, encounterId: string): Move[] {
  const others = state.hand.filter((id) => id !== encounterId);
  if (state.rules.turnStyle === 'B' || others.length === 0) return [{ kind: 'engage', encounterId, attackCardId: null }];
  return others.map((attackCardId) => ({ kind: 'engage', encounterId, attackCardId }));
}
