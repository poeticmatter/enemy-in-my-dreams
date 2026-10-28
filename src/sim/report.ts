import type { CardSet } from '../engine/cards.ts';
import type { CardUsage, Summary } from './metrics.ts';

const pct = (value: number) => (Number.isNaN(value) ? '  -' : `${Math.round(value * 100)}%`.padStart(4));
const num = (value: number, digits = 1) => (Number.isNaN(value) ? '-' : value.toFixed(digits));
const signedPct = (value: number) => (Number.isNaN(value) ? '-' : `${value >= 0 ? '+' : ''}${Math.round(value * 100)}`);

function table(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  const widths = headers.map((header, column) => Math.max(header.length, ...rows.map((row) => row[column].length)));
  const line = (cells: readonly string[]) => cells.map((cell, column) => cell.padEnd(widths[column])).join('  ');
  return [line(headers), line(widths.map((width) => '-'.repeat(width))), ...rows.map(line)].join('\n');
}

export function outcomeTable(rows: readonly { label: string; summary: Summary }[]): string {
  return table(
    ['bot', 'win', 'stall', 'early out', 'turns W/L', 'deck 0-25-50-75-100%', 'damage by quarter', 'early-dmg gap'],
    rows.map(({ label, summary }) => [
      label,
      pct(summary.winRate),
      pct(summary.stallRate),
      pct(summary.earlyEliminationRate),
      `${num(summary.meanTurnsWon)} / ${num(summary.meanTurnsLost)}`,
      summary.deckCurve.map((size) => num(size, 0)).join('-'),
      summary.damageByQuarter.map(pct).join(' '),
      signedPct(summary.earlyDamageWinGap),
    ]),
  );
}

export function bossAndFlipTable(rows: readonly { label: string; summary: Summary }[]): string {
  return table(
    ['bot', 'boss chosen', '1st @turn', '@deck', 'tries/g', 'win/try', 'forced/g', 'forced wins', 'flips/g', 'flip fights won', 'automiss', 'short'],
    rows.map(({ label, summary: { boss, flips } }) => [
      label,
      pct(boss.chosenShare),
      num(boss.firstChosenTurn),
      num(boss.firstChosenDeckSize),
      num(boss.attemptsPerGame, 2),
      pct(boss.winPerAttempt),
      num(boss.forcedPerGame, 2),
      pct(boss.forcedWinShare),
      num(flips.perGame),
      pct(flips.wonShare),
      pct(flips.automissShare),
      pct(flips.stoppedShortShare),
    ]),
  );
}

export function cardUsageTable(cardSet: CardSet, usage: readonly CardUsage[]): string {
  const byId = new Map(usage.map((entry) => [entry.cardId, entry]));
  return table(
    ['card', 'mod', 'atk/def', 'loot', 'fought', 'attack', 'kept', 'contrib', 'defeat%', 'flips/g', 'removed/g', 'item uses/g'],
    cardSet.cards.map((card) => {
      const use = byId.get(card.id);
      if (!use) throw new Error(`No usage recorded for ${card.id}`);
      const keywords = [card.isAutomiss && 'AM', card.isBoss && 'BOSS'].filter(Boolean).join(' ');
      return [
        `${card.name}${keywords ? ` (${keywords})` : ''}`,
        `${card.modifier >= 0 ? '+' : ''}${card.modifier}`,
        `${card.enemy.attack}/${card.enemy.defense}`,
        shortLoot(card.loot),
        pct(use.encounterShare),
        pct(use.attackShare),
        pct(use.keptShare),
        pct(use.contributedShare),
        pct(use.defeatRate),
        num(use.flipsPerGame, 2),
        num(use.removedPerGame, 2),
        num(use.itemUsesPerGame, 2),
      ];
    }),
  );
}

function shortLoot(loot: CardSet['cards'][number]['loot']): string {
  switch (loot.kind) {
    case 'permanentAttack':
      return `perm +${loot.bonus}`;
    case 'permanentArmor':
      return `armor ${loot.reduction}`;
    case 'itemAttack':
      return `item +${loot.bonus}`;
    case 'itemShield':
      return loot.block === Infinity ? 'shield' : `shield ${loot.block}`;
    case 'none':
      return '-';
  }
}
