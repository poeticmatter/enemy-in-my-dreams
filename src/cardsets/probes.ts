import type { Card, CardSet } from '../engine/cards.ts';

/** Throwaway variations of a set for sweeps: "<base>-boss<attack>x<defense>". */
export function withBoss(base: CardSet, attack: number, defense: number): CardSet {
  const cards = base.cards.map((entry): Card => (entry.isBoss ? { ...entry, enemy: { attack, defense } } : entry));
  return { version: `${base.version}-boss${attack}x${defense}`, notes: `${base.version} with the boss at ${attack}/${defense}`, cards };
}

export function bossProbes(base: CardSet): CardSet[] {
  const probes: CardSet[] = [];
  for (const defense of [14, 15, 16, 17, 18, 20, 22, 24, 26]) {
    for (const attack of [3, 4, 5, 6, 8, 10, 12, 14, 16]) probes.push(withBoss(base, attack, defense));
  }
  return probes;
}

