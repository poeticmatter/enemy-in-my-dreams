import { card, itemAttack, itemShield, noLoot, permanentArmor, permanentAttack, type CardSet } from '../engine/cards.ts';

/**
 * The playtest candidate, tuned for Turn A, "beat" (>), with the stakes rule.
 * The boss Devours: a failed boss fight costs real health, so it is a bet, not a free retry.
 * Every tier mixes cards that are better fought with cards that are better used for attack.
 */
export const SET_V6: CardSet = {
  version: 'v6',
  notes: 'Boss 4/17 Devour; Lamplighter and Bell Tower worth fighting; Pale Hand harder.',
  cards: [
    // Weak: Defense 2–4, hit for 1–3.
    card('Moth', -2, [1, 2], itemAttack(2)),
    card('Murmur', -1, [2, 3], itemShield(3)),
    card('Flicker', 4, [2, 3], itemAttack(2)),
    card('Drift', 0, [1, 2], itemAttack(1)),
    card('Hush', 1, [2, 3], itemAttack(2)),
    card('Pale Hand', -1, [3, 4], permanentAttack(1)),
    card('Echo', 2, [1, 2], itemShield(3)),
    // Mid: Defense 4–5, hit for 3.
    card('Lurker', 1, [3, 4], itemAttack(2)),
    card('Endless Stair', -2, [3, 5], permanentAttack(1)),
    card('Grinning Door', 3, [3, 5], itemAttack(3)),
    card('Tide', 0, [3, 4], permanentArmor(1)),
    card('Mirror', 2, [3, 4], itemAttack(2)),
    card('Lamplighter', 5, [3, 5], permanentAttack(1)),
    card('Crawler', -1, [3, 4], itemShield(3)),
    // Strong: Defense 6–7, hit for 4.
    card('Hollow Choir', 3, [4, 6], itemAttack(3)),
    card('Teeth', -2, [4, 6], permanentAttack(1)),
    card('Faceless', 1, [4, 7], permanentAttack(1)),
    card('Drowning', 0, [4, 7], itemAttack(3)),
    card('Bell Tower', 4, [4, 6], itemAttack(4)),
    card('Weaver', 2, [4, 7], itemAttack(4)),
    // Automiss: huge enemies, and flipping one ruins the attack.
    card('Falling', 1, [5, 8], permanentAttack(2), { automiss: true, persistent: true }),
    card('Pursuer', 0, [5, 9], itemAttack(4), { automiss: true, persistent: true }),
    card('Drowned Bell', 2, [5, 9], itemAttack(4), { automiss: true, persistent: true }),
    // The boss.
    card('The Dreamer', -2, [4, 17], noLoot, { boss: true, devour: true }),
  ],
};
