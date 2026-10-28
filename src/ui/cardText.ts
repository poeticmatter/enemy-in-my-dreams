import type { Card, Loot } from '../engine/cards.ts';

/** A signed number with a true minus sign, which reads better than a hyphen at large sizes. */
export function signed(value: number): string {
  return value >= 0 ? `+${value}` : `−${Math.abs(value)}`;
}

/** What you get for defeating the enemy, in plain words. */
export function lootText(loot: Loot): string {
  switch (loot.kind) {
    case 'permanentAttack':
      return `${signed(loot.bonus)} attack, every fight`;
    case 'permanentArmor':
      return `Take ${loot.reduction} less damage, every fight`;
    case 'itemAttack':
      return `${signed(loot.bonus)} attack, one use`;
    case 'itemShield':
      return loot.block === Number.POSITIVE_INFINITY ? 'Cancel one hit, one use' : `Block ${loot.block} damage, one use`;
    case 'none':
      return 'You wake up and win';
  }
}

/** Short label for an item button: the effect without the "one use". */
export function itemEffectText(loot: Loot): string {
  if (loot.kind === 'itemAttack') return `${signed(loot.bonus)} attack`;
  if (loot.kind === 'itemShield') return loot.block === Number.POSITIVE_INFINITY ? 'cancel the hit' : `block ${loot.block}`;
  return '';
}

export interface KeywordText {
  name: string;
  meaning: string;
}

export function keywordsOf(card: Card): KeywordText[] {
  const keywords: KeywordText[] = [];
  if (card.isAutomiss) keywords.push({ name: 'Automiss', meaning: 'If flipped, your attack fails.' });
  if (card.isPersistent && !card.isBoss) keywords.push({ name: 'Persistent', meaning: 'Never leaves the game. In hand at a reshuffle, you must fight it.' });
  if (card.isBoss) keywords.push({ name: 'Boss', meaning: 'Never leaves the game. Defeat it to win.' });
  if (card.isDevouring) keywords.push({ name: 'Devour', meaning: 'Its damage destroys cards instead of discarding them.' });
  return keywords;
}

/** What losing to this enemy costs you, as printed (before armor and shields). */
export function hitText(card: Card): string {
  return damageText(card.enemy.attack, card.isDevouring);
}

export function damageText(count: number, isDevouring: boolean): string {
  const cards = count === 1 ? 'card' : 'cards';
  return isDevouring ? `destroy ${count} ${cards}` : `discard ${count} ${cards}`;
}
