import type { CardUse, GameRecord } from './record.ts';

/** "Early" for the early-damage metric: the first turns of a game, when damage should barely matter. */
const EARLY_TURNS = 5;
/** A loss counts as an early elimination when the game ends before this share of a typical won game. */
const EARLY_ELIMINATION_SHARE = 0.6;

export function mean(values: readonly number[]): number {
  return values.length === 0 ? NaN : values.reduce((sum, value) => sum + value, 0) / values.length;
}

const share = (count: number, total: number) => (total === 0 ? NaN : count / total);

export interface Summary {
  games: number;
  winRate: number;
  stallRate: number;
  meanTurns: number;
  meanTurnsWon: number;
  meanTurnsLost: number;
  /** Lost games that ended well before a typical win would have. */
  earlyEliminationRate: number;
  /** Health at 0 %, 25 %, 50 %, 75 % and 100 % of each game. */
  deckCurve: number[];
  /** Where in the game (by quarter) the damage was taken. */
  damageByQuarter: number[];
  /** Win rate of games with little early damage minus games with a lot: near zero means early hits barely matter. */
  earlyDamageWinGap: number;
  boss: BossSummary;
  flips: FlipSummary;
}

export interface BossSummary {
  /** Games where the bot chose to fight the boss at least once. */
  chosenShare: number;
  firstChosenTurn: number;
  firstChosenDeckSize: number;
  attemptsPerGame: number;
  winPerAttempt: number;
  forcedPerGame: number;
  /** Of the won games, how many were won in a forced fight (boss in hand at a reshuffle). */
  forcedWinShare: number;
}

export interface FlipSummary {
  perGame: number;
  /** Of fights where the bot flipped at least once: */
  wonShare: number;
  automissShare: number;
  stoppedShortShare: number;
}

export function summarize(records: readonly GameRecord[]): Summary {
  const won = records.filter((record) => record.outcome === 'won');
  const lost = records.filter((record) => record.outcome !== 'won');
  const typicalWinLength = won.length > 0 ? mean(won.map((record) => record.turns)) : mean(records.map((record) => record.turns));
  return {
    games: records.length,
    winRate: share(won.length, records.length),
    stallRate: share(records.filter((record) => record.outcome === 'stalled').length, records.length),
    meanTurns: mean(records.map((record) => record.turns)),
    meanTurnsWon: mean(won.map((record) => record.turns)),
    meanTurnsLost: mean(lost.map((record) => record.turns)),
    earlyEliminationRate: share(lost.filter((record) => record.turns < EARLY_ELIMINATION_SHARE * typicalWinLength).length, records.length),
    deckCurve: [0, 0.25, 0.5, 0.75, 1].map((fraction) => mean(records.map((record) => deckSizeAt(record, fraction)))),
    damageByQuarter: damageByQuarter(records),
    earlyDamageWinGap: earlyDamageWinGap(records),
    boss: summarizeBoss(records),
    flips: summarizeFlips(records),
  };
}

function deckSizeAt(record: GameRecord, fraction: number): number {
  const sizes = record.deckSizeByTurn;
  return sizes[Math.min(sizes.length - 1, Math.floor(fraction * (sizes.length - 1)))];
}

function damageByQuarter(records: readonly GameRecord[]): number[] {
  const totals = [0, 0, 0, 0];
  for (const record of records) {
    record.damageByTurn.forEach((damage, index) => {
      totals[Math.min(3, Math.floor((index / record.turns) * 4))] += damage;
    });
  }
  const all = totals.reduce((sum, value) => sum + value, 0);
  return totals.map((value) => share(value, all));
}

function earlyDamageWinGap(records: readonly GameRecord[]): number {
  const earlyDamage = (record: GameRecord) => record.damageByTurn.slice(0, EARLY_TURNS).reduce((sum, value) => sum + value, 0);
  const sorted = [...records].sort((a, b) => earlyDamage(a) - earlyDamage(b));
  const third = Math.floor(sorted.length / 3);
  const winRate = (group: readonly GameRecord[]) => share(group.filter((record) => record.outcome === 'won').length, group.length);
  return winRate(sorted.slice(0, third)) - winRate(sorted.slice(sorted.length - third));
}

function summarizeBoss(records: readonly GameRecord[]): BossSummary {
  const bossFights = records.flatMap((record) => record.fights.filter((fight) => fight.isBoss));
  const firstChosen = records.flatMap((record) => record.fights.filter((fight) => fight.isBoss && !fight.isForced).slice(0, 1));
  const won = records.filter((record) => record.outcome === 'won');
  const wonInForcedFight = won.filter((record) => record.fights[record.fights.length - 1].isForced);
  return {
    chosenShare: share(firstChosen.length, records.length),
    firstChosenTurn: mean(firstChosen.map((fight) => fight.turn)),
    firstChosenDeckSize: mean(firstChosen.map((fight) => fight.deckSize)),
    attemptsPerGame: share(bossFights.length, records.length),
    winPerAttempt: share(bossFights.filter((fight) => fight.isWin).length, bossFights.length),
    forcedPerGame: share(bossFights.filter((fight) => fight.isForced).length, records.length),
    forcedWinShare: share(wonInForcedFight.length, won.length),
  };
}

function summarizeFlips(records: readonly GameRecord[]): FlipSummary {
  const flipped = records.flatMap((record) => record.fights.filter((fight) => fight.flipCount > 0));
  const totalFlips = flipped.reduce((sum, fight) => sum + fight.flipCount, 0);
  return {
    perGame: share(totalFlips, records.length),
    wonShare: share(flipped.filter((fight) => fight.isWin).length, flipped.length),
    automissShare: share(flipped.filter((fight) => fight.hasAutomissed).length, flipped.length),
    stoppedShortShare: share(flipped.filter((fight) => !fight.isWin && !fight.hasAutomissed).length, flipped.length),
  };
}

export interface CardUsage {
  cardId: string;
  /** Shares of the times it was in hand when a turn's choice was made. */
  encounterShare: number;
  attackShare: number;
  keptShare: number;
  contributedShare: number;
  /** Of the times it was the encounter, how often it was defeated. */
  defeatRate: number;
  flipsPerGame: number;
  removedPerGame: number;
  itemUsesPerGame: number;
}

export function cardUsage(records: readonly GameRecord[]): CardUsage[] {
  const totals = new Map<string, CardUse>();
  for (const record of records) {
    for (const [cardId, use] of Object.entries(record.cardUse)) {
      const total = totals.get(cardId);
      if (!total) totals.set(cardId, { ...use });
      else for (const key of Object.keys(use) as (keyof CardUse)[]) total[key] += use[key]; // keys of the same interface
    }
  }
  return [...totals].map(([cardId, use]) => ({
    cardId,
    encounterShare: share(use.encounter, use.inHand),
    attackShare: share(use.attack, use.inHand),
    keptShare: share(use.kept, use.inHand),
    contributedShare: share(use.contributed, use.inHand),
    defeatRate: share(use.defeated, use.encounter),
    flipsPerGame: share(use.flipped, records.length),
    removedPerGame: share(use.removed, records.length),
    itemUsesPerGame: share(use.itemUses, records.length),
  }));
}
