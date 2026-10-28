import { botFor } from '../bots/roster.ts';
import type { CardSet } from '../engine/cards.ts';
import { applyMove, createGame } from '../engine/game.ts';
import { Random } from '../engine/rng.ts';
import type { RulesVariant } from '../engine/rules.ts';
import { deckSize, type GameEvent, type GameState, type Move, type Outcome } from '../engine/state.ts';

export interface FightRecord {
  turn: number;
  encounterId: string;
  isBoss: boolean;
  isForced: boolean;
  isWin: boolean;
  flipCount: number;
  hasAutomissed: boolean;
  damage: number;
  /** Health when the fight started. */
  deckSize: number;
}

/** How often a card ended up in each role. Turn A uses encounter/attack/kept; Turn B uses encounter/contributed. */
export interface CardUse {
  inHand: number;
  encounter: number;
  attack: number;
  kept: number;
  contributed: number;
  defeated: number;
  flipped: number;
  removed: number;
  itemUses: number;
}

export interface GameRecord {
  seed: number;
  outcome: Outcome;
  turns: number;
  /** Health at the start of each turn. */
  deckSizeByTurn: number[];
  fights: FightRecord[];
  damageByTurn: number[];
  reshuffleTurns: number[];
  cardUse: Record<string, CardUse>;
}

const emptyCardUse = (): CardUse => ({
  inHand: 0,
  encounter: 0,
  attack: 0,
  kept: 0,
  contributed: 0,
  defeated: 0,
  flipped: 0,
  removed: 0,
  itemUses: 0,
});

export interface GameSetup {
  cardSet: CardSet;
  rules: RulesVariant;
  botSpec: string;
}

export function playGames(setup: GameSetup, seeds: readonly number[]): GameRecord[] {
  return seeds.map((seed) => playGame(setup, seed));
}

export function playGame({ cardSet, rules, botSpec }: GameSetup, seed: number): GameRecord {
  const bot = botFor(botSpec);
  const rng = new Random(seed ^ 0x5bd1e995);
  const start = createGame(cardSet, rules, seed);
  const recorder = new GameRecorder(start.state);
  recorder.record(start.state, null, start.events);
  let state = start.state;
  while (state.phase.kind !== 'over') {
    const move = bot.chooseMove(state, rng);
    const { state: next, events } = applyMove(state, move);
    recorder.record(state, move, events);
    state = next;
  }
  return recorder.finish(seed, state.phase.outcome, state.turn);
}

class GameRecorder {
  private readonly deckSizeByTurn: number[] = [];
  private readonly fights: FightRecord[] = [];
  private readonly damageByTurn: number[] = [];
  private readonly reshuffleTurns: number[] = [];
  private readonly cardUse: Record<string, CardUse>;

  constructor(initial: GameState) {
    this.cardUse = Object.fromEntries(Object.keys(initial.cards).map((id) => [id, emptyCardUse()]));
  }

  record(before: GameState, move: Move | null, events: readonly GameEvent[]): void {
    if (move?.kind === 'engage') this.recordRoles(before, move);
    const turn = before.turn;
    for (const event of events) this.recordEvent(before, turn, event);
  }

  private recordRoles(before: GameState, move: Extract<Move, { kind: 'engage' }>): void {
    // Turn C cards left in hand add nothing, so they count as kept, like Turn A's third card.
    const keptRole = before.rules.turnStyle === 'B' ? 'contributed' : 'kept';
    for (const id of before.hand) {
      const use = this.cardUse[id];
      use.inHand += 1;
      if (id === move.encounterId) use.encounter += 1;
      else if (id === move.attackCardId) use.attack += 1;
      else use[keptRole] += 1;
    }
  }

  private recordEvent(before: GameState, turn: number, event: GameEvent): void {
    switch (event.kind) {
      case 'turnStarted':
        this.deckSizeByTurn.push(event.deckSize);
        break;
      case 'fightResolved':
        this.fights.push({
          turn,
          encounterId: event.encounterId,
          isBoss: before.cards[event.encounterId].isBoss,
          isForced: event.isForced,
          isWin: event.isWin,
          flipCount: event.flipCount,
          hasAutomissed: event.hasAutomissed,
          damage: event.damage,
          deckSize: deckSize(before),
        });
        if (event.isWin && !event.isForced) this.cardUse[event.encounterId].defeated += 1;
        this.damageByTurn[turn - 1] = (this.damageByTurn[turn - 1] ?? 0) + event.damage;
        break;
      case 'flipped':
        this.cardUse[event.cardId].flipped += 1;
        break;
      case 'itemUsed':
        this.cardUse[event.itemId].itemUses += 1;
        break;
      case 'reshuffled':
        this.reshuffleTurns.push(turn);
        for (const id of event.removedIds) this.cardUse[id].removed += 1;
        break;
      default:
        break;
    }
  }

  finish(seed: number, outcome: Outcome, turns: number): GameRecord {
    const damageByTurn = Array.from({ length: turns }, (_, index) => this.damageByTurn[index] ?? 0);
    return {
      seed,
      outcome,
      turns,
      deckSizeByTurn: this.deckSizeByTurn,
      fights: this.fights,
      damageByTurn,
      reshuffleTurns: this.reshuffleTurns,
      cardUse: this.cardUse,
    };
  }
}
