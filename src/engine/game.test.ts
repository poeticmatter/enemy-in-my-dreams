import { describe, expect, it } from 'vitest';
import { SET_V1 } from '../cardsets/v1.ts';
import { BLOCKS_ALL, card, itemAttack, itemShield, noLoot, permanentAttack, type Card } from './cards.ts';
import { applyMove, createGame, IllegalMoveError, legalMoves, type Transition } from './game.ts';
import { Random } from './rng.ts';
import { VARIANTS } from './rules.ts';
import type { GameState, Move } from './state.ts';

const TEST_CARDS: Card[] = [
  card('Weak', 1, [1, 2], permanentAttack(1)),
  card('Strong', 5, [3, 9], itemAttack(2)),
  card('Plus Two', 2, [2, 4], itemShield(BLOCKS_ALL)),
  card('Plus Three', 3, [2, 4], itemAttack(1)),
  card('Minus One', -1, [1, 3], itemAttack(1)),
  card('Trap', 0, [4, 8], permanentAttack(3), { automiss: true, persistent: true }),
  card('Boss', 0, [6, 10], noLoot, { boss: true }),
  card('Devourer', 0, [2, 9], noLoot, { devour: true }),
];

interface Layout {
  hand: string[];
  drawPile?: string[];
  discard?: string[];
  inventory?: string[];
}

function stateWith(layout: Layout, variantId = 'A>'): GameState {
  const placed = [...layout.hand, ...(layout.drawPile ?? []), ...(layout.discard ?? []), ...(layout.inventory ?? [])];
  return {
    rules: VARIANTS[variantId],
    cards: Object.fromEntries(TEST_CARDS.map((entry) => [entry.id, entry])),
    drawPile: layout.drawPile ?? [],
    discard: layout.discard ?? [],
    hand: layout.hand,
    inventory: layout.inventory ?? [],
    removed: TEST_CARDS.map((entry) => entry.id).filter((id) => !placed.includes(id)),
    turn: 1,
    reshufflesThisTurn: 0,
    phase: { kind: 'choose' },
    pending: [],
    rngState: 1,
  };
}

function play(state: GameState, ...moves: Move[]): Transition {
  let transition: Transition = { state, events: [] };
  for (const move of moves) {
    const next = applyMove(transition.state, move);
    transition = { state: next.state, events: [...transition.events, ...next.events] };
  }
  return transition;
}

const engage = (encounterId: string, attackCardId: string | null = null): Move => ({ kind: 'engage', encounterId, attackCardId });
const FLIP: Move = { kind: 'flip' };
const RESOLVE: Move = { kind: 'resolve' };

describe('winning a fight', () => {
  it('moves the encounter to the inventory when attack beats Defense', () => {
    const start = stateWith({ hand: ['weak', 'plus-three', 'minus-one'], drawPile: ['plus-two', 'strong', 'boss'] });
    const { state } = play(start, engage('weak', 'plus-three'), RESOLVE);
    expect(state.inventory).toEqual(['weak']);
  });

  it('loses on a tie under the "beat" threshold', () => {
    const start = stateWith({ hand: ['plus-two', 'weak', 'minus-one'], drawPile: ['strong', 'boss', 'plus-three'] });
    const { events } = play(start, engage('weak', 'plus-two'), RESOLVE);
    expect(events.find((event) => event.kind === 'fightResolved')).toMatchObject({ isWin: false, total: 2, needed: 3 });
  });

  it('wins on a tie under the "match" threshold', () => {
    const start = stateWith({ hand: ['plus-two', 'weak', 'minus-one'], drawPile: ['strong', 'boss', 'plus-three'] }, 'A>=');
    const { events } = play(start, engage('weak', 'plus-two'), RESOLVE);
    expect(events.find((event) => event.kind === 'fightResolved')).toMatchObject({ isWin: true });
  });

  it('adds permanent loot to every attack', () => {
    const start = stateWith({ hand: ['plus-two', 'plus-three', 'minus-one'], drawPile: ['strong', 'boss'], inventory: ['weak'] });
    const { events } = play(start, engage('plus-three', 'plus-two'), RESOLVE);
    expect(events.find((event) => event.kind === 'fightResolved')).toMatchObject({ total: 3, isWin: false });
  });
});

describe('flipping', () => {
  it('adds the flipped card’s modifier and discards it', () => {
    const start = stateWith({ hand: ['plus-two', 'plus-three', 'minus-one'], drawPile: ['strong', 'boss', 'weak'] });
    const { state } = play(start, engage('plus-three', 'plus-two'), FLIP, RESOLVE);
    expect(state.inventory).toEqual(['plus-three']);
  });

  it('fails the attack when an automiss card is flipped, however high the total', () => {
    const start = stateWith({ hand: ['plus-two', 'weak', 'minus-one'], drawPile: ['trap', 'strong', 'boss'], inventory: [] });
    const { events } = play(start, engage('weak', 'plus-two'), FLIP, RESOLVE);
    expect(events.find((event) => event.kind === 'fightResolved')).toMatchObject({ isWin: false, hasAutomissed: true });
  });

  it('is not allowed after an automiss', () => {
    const start = stateWith({ hand: ['plus-two', 'weak', 'minus-one'], drawPile: ['trap', 'strong', 'boss'] });
    const { state } = play(start, engage('weak', 'plus-two'), FLIP);
    expect(() => applyMove(state, FLIP)).toThrow(IllegalMoveError);
  });
});

describe('devouring enemies', () => {
  it('remove the cards they deal as damage', () => {
    const start = stateWith({ hand: ['minus-one', 'devourer', 'weak'], drawPile: ['plus-two', 'plus-three', 'boss', 'trap'] });
    const { state } = play(start, engage('devourer', 'minus-one'), RESOLVE);
    expect(state.removed).toEqual(expect.arrayContaining(['plus-two', 'plus-three']));
  });
});

describe('the stakes rule', () => {
  it('removes the cards flipped in a lost fight', () => {
    const start = stateWith({ hand: ['minus-one', 'strong', 'weak'], drawPile: ['plus-two', 'plus-three', 'boss', 'trap'] }, 'A>+stakes');
    const { state } = play(start, engage('strong', 'minus-one'), FLIP, RESOLVE);
    expect(state.removed).toContain('plus-two');
  });

  it('keeps flipped cards when the fight is won', () => {
    const start = stateWith({ hand: ['plus-two', 'weak', 'strong'], drawPile: ['plus-three', 'minus-one', 'boss', 'trap'] }, 'A>+stakes');
    const { state } = play(start, engage('weak', 'plus-two'), FLIP, RESOLVE);
    expect(state.discard).toContain('plus-three');
  });
});

describe('losing a fight', () => {
  it('discards enemy Attack cards from the top of the draw pile', () => {
    const start = stateWith({ hand: ['minus-one', 'strong', 'plus-two'], drawPile: ['weak', 'plus-three', 'boss', 'trap'] });
    const { events } = play(start, engage('strong', 'minus-one'), RESOLVE);
    expect(events.find((event) => event.kind === 'damageTaken')).toMatchObject({ cardIds: ['weak', 'plus-three', 'boss'] });
  });

  it('reshuffles mid-damage, removing the hand, then keeps taking damage', () => {
    const start = stateWith({ hand: ['minus-one', 'strong', 'plus-two'], drawPile: ['weak'], discard: ['plus-three', 'boss'] });
    const { state, events } = play(start, engage('strong', 'minus-one'), RESOLVE);
    expect(events.find((event) => event.kind === 'reshuffled')).toMatchObject({ removedIds: ['plus-two'] });
    expect(state.removed).toContain('plus-two');
  });

  it('ends the game when a turn needs a second reshuffle', () => {
    const start = stateWith({ hand: ['minus-one', 'strong'], drawPile: [] });
    const { state } = play(start, engage('strong', 'minus-one'), RESOLVE);
    // The reshuffle turns the attack card into a one-card pile; the second point of damage finds it empty again.
    expect(state.phase).toEqual({ kind: 'over', outcome: 'lost' });
  });

  it('keeps cycling the deck under the literal damage rule', () => {
    const start = stateWith({ hand: ['minus-one', 'strong'], drawPile: [] }, 'A>literal');
    const { state } = play(start, engage('strong', 'minus-one'), RESOLVE);
    expect(state.phase.kind).toBe('choose');
  });

  it('takes no damage with a shield, and the shield returns to the discard pile', () => {
    const start = stateWith({ hand: ['minus-one', 'strong', 'weak'], drawPile: ['plus-three', 'boss', 'trap'], inventory: ['plus-two'] });
    const { state } = play(start, engage('strong', 'minus-one'), { kind: 'useItem', itemId: 'plus-two' }, RESOLVE);
    expect(state.discard).toEqual(['minus-one', 'plus-two', 'strong']);
  });
});

describe('reshuffling', () => {
  it('removes the cards in hand when drawing from an empty pile', () => {
    const start = stateWith({ hand: ['plus-three', 'weak', 'minus-one'], drawPile: ['plus-two'], discard: ['strong', 'boss'] });
    const { state } = play(start, engage('weak', 'plus-three'), RESOLVE);
    // Kept Minus One, drew Plus Two, then needed a second card: both are removed.
    expect(state.removed).toEqual(expect.arrayContaining(['minus-one', 'plus-two']));
  });

  it('forces a fight against a persistent card in hand, with no attack card', () => {
    const start = stateWith({ hand: ['plus-three', 'weak', 'boss'], drawPile: [], discard: ['strong', 'plus-two'] });
    const { state } = play(start, engage('weak', 'plus-three'), RESOLVE);
    expect(state.phase).toMatchObject({ kind: 'fight', fight: { encounterId: 'boss', isForced: true, cardAttack: 0 } });
  });

  it('continues drawing after the forced fight resolves', () => {
    // Unlimited reshuffles, so the boss's hit can't end the game here.
    const start = stateWith({ hand: ['plus-three', 'weak', 'boss'], drawPile: [], discard: ['strong', 'plus-two', 'minus-one', 'trap'] }, 'A>literal');
    const { state } = play(start, engage('weak', 'plus-three'), RESOLVE, RESOLVE);
    expect(state.phase.kind).toBe('choose');
    expect(state.hand).toHaveLength(3);
  });
});

describe('items', () => {
  it('add their bonus once and return to the discard pile', () => {
    const start = stateWith({ hand: ['plus-two', 'plus-three', 'weak'], drawPile: ['boss', 'trap'], inventory: ['minus-one'] });
    const { state } = play(start, engage('weak', 'plus-two'), { kind: 'useItem', itemId: 'minus-one' }, RESOLVE);
    expect(state.inventory).toEqual(['weak']);
    expect(state.discard).toContain('minus-one');
  });
});

describe('Turn B', () => {
  it('adds both other hand cards and keeps them in hand', () => {
    const start = stateWith({ hand: ['plus-two', 'plus-three', 'weak'], drawPile: ['strong', 'boss'] }, 'B>');
    const { state, events } = play(start, engage('weak'), RESOLVE);
    expect(events.find((event) => event.kind === 'fightResolved')).toMatchObject({ total: 5, isWin: true });
    expect(state.hand).toEqual(['plus-two', 'plus-three', 'strong']);
  });
});

describe('the boss', () => {
  it('ends the game in a win when defeated', () => {
    const start = stateWith({ hand: ['boss', 'strong', 'weak'], drawPile: ['plus-three', 'plus-two'], inventory: ['trap'] });
    const { state } = play(start, engage('boss', 'strong'), FLIP, FLIP, RESOLVE);
    expect(state.phase).toEqual({ kind: 'over', outcome: 'won' });
  });
});

describe('full games', () => {
  it('always end, and never lose track of a card', () => {
    for (const variantId of Object.keys(VARIANTS)) {
      for (let seed = 1; seed <= 50; seed++) {
        const rng = new Random(seed);
        let { state } = createGame(SET_V1, VARIANTS[variantId], seed);
        while (state.phase.kind !== 'over') {
          state = applyMove(state, rng.pick(legalMoves(state))).state;
          const located = state.drawPile.length + state.discard.length + state.hand.length + state.inventory.length + state.removed.length;
          const queued = state.pending.filter((step) => step.kind === 'discardCard' || step.kind === 'forcedFight').length;
          const inPlay = queued + (state.phase.kind === 'fight' ? 1 : 0);
          expect(located + inPlay).toBe(SET_V1.cards.length);
        }
      }
    }
  });
});
