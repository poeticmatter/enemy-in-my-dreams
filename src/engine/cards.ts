export type Loot =
  | { kind: 'permanentAttack'; bonus: number }
  /** Every lost fight deals this much less damage. */
  | { kind: 'permanentArmor'; reduction: number }
  | { kind: 'itemAttack'; bonus: number }
  /** Blocks this much damage from one lost fight. */
  | { kind: 'itemShield'; block: number }
  | { kind: 'none' };

export interface Enemy {
  attack: number;
  defense: number;
}

export interface Card {
  id: string;
  name: string;
  modifier: number;
  enemy: Enemy;
  loot: Loot;
  /** Flipping this card makes the attack fail. */
  isAutomiss: boolean;
  /** Can never be removed from the game; it must be fought instead. */
  isPersistent: boolean;
  /** Proposed keyword, not in the draft: damage from this enemy removes cards from the game instead of discarding them. */
  isDevouring: boolean;
  isBoss: boolean;
}

export interface CardSet {
  version: string;
  /** What changed from the previous set, and why. */
  notes: string;
  cards: readonly Card[];
}

export function isSingleUse(loot: Loot): boolean {
  return loot.kind === 'itemAttack' || loot.kind === 'itemShield';
}

export function describeLoot(loot: Loot): string {
  switch (loot.kind) {
    case 'permanentAttack':
      return `Permanent +${loot.bonus} attack`;
    case 'permanentArmor':
      return `Permanent armor ${loot.reduction}`;
    case 'itemAttack':
      return `Item: +${loot.bonus} attack once`;
    case 'itemShield':
      return loot.block === BLOCKS_ALL ? 'Item: shield (cancel one hit)' : `Item: shield (block ${loot.block})`;
    case 'none':
      return 'Victory';
  }
}

interface Keywords {
  automiss?: boolean;
  persistent?: boolean;
  boss?: boolean;
  devour?: boolean;
}

function toId(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/** Card-data shorthand: `card('Moth', -2, [1, 2], loot)` reads as name, modifier, [enemy attack, enemy defense], loot. */
export function card(name: string, modifier: number, [attack, defense]: [number, number], loot: Loot, keywords: Keywords = {}): Card {
  return {
    id: toId(name),
    name,
    modifier,
    enemy: { attack, defense },
    loot,
    isAutomiss: keywords.automiss ?? false,
    isPersistent: keywords.persistent ?? keywords.boss ?? false,
    isBoss: keywords.boss ?? false,
    isDevouring: keywords.devour ?? false,
  };
}

export const permanentAttack = (bonus: number): Loot => ({ kind: 'permanentAttack', bonus });
export const permanentArmor = (reduction: number): Loot => ({ kind: 'permanentArmor', reduction });
export const itemAttack = (bonus: number): Loot => ({ kind: 'itemAttack', bonus });
/** v1 and v2 shields cancelled a whole hit, which let a tiny deck loop forever against the boss. */
export const BLOCKS_ALL = Number.POSITIVE_INFINITY;
export const itemShield = (block: number): Loot => ({ kind: 'itemShield', block });
export const noLoot: Loot = { kind: 'none' };

export function validateCardSet(set: CardSet): void {
  const ids = new Set<string>();
  for (const entry of set.cards) {
    if (ids.has(entry.id)) throw new Error(`Card set ${set.version} has two cards with id "${entry.id}"`);
    ids.add(entry.id);
  }
  const bossCount = set.cards.filter((entry) => entry.isBoss).length;
  if (bossCount !== 1) throw new Error(`Card set ${set.version} needs exactly one boss, found ${bossCount}`);
}
