import { BLOCKS_ALL, card, itemAttack, itemShield, noLoot, permanentArmor, permanentAttack, type CardSet } from '../engine/cards.ts';

export const SET_V2: CardSet = {
  version: 'v2',
  notes: 'Armor 5 → 1 total; enemies hit harder; boss 6/13 → 7/16.',
  cards: [
    // Weak: Defense 2–3, hit for 1–2.
    card('Moth', -2, [1, 2], itemAttack(2)),
    card('Murmur', -1, [2, 3], itemShield(BLOCKS_ALL)),
    card('Flicker', 4, [2, 3], itemAttack(1)),
    card('Drift', 0, [1, 2], itemAttack(1)),
    card('Hush', 1, [2, 3], itemAttack(2)),
    card('Pale Hand', -1, [2, 3], permanentAttack(1)),
    card('Echo', 2, [1, 2], itemShield(BLOCKS_ALL)),
    // Mid: Defense 4–5, hit for 3.
    card('Lurker', 1, [3, 4], permanentAttack(1)),
    card('Endless Stair', -2, [3, 5], permanentAttack(2)),
    card('Grinning Door', 3, [3, 5], itemAttack(3)),
    card('Tide', 0, [3, 4], permanentArmor(1)),
    card('Mirror', 2, [3, 4], itemAttack(2)),
    card('Lamplighter', 5, [3, 5], itemAttack(1)),
    card('Crawler', -1, [3, 4], itemShield(BLOCKS_ALL)),
    // Strong: Defense 6–7, hit for 4.
    card('Hollow Choir', 3, [4, 6], permanentAttack(2)),
    card('Teeth', -2, [4, 6], permanentAttack(2)),
    card('Faceless', 1, [4, 7], itemShield(BLOCKS_ALL)),
    card('Drowning', 0, [4, 7], permanentAttack(2)),
    card('Bell Tower', 4, [4, 6], itemAttack(3)),
    card('Weaver', 2, [4, 7], permanentAttack(1)),
    // Automiss: huge enemies, and flipping one ruins the attack.
    card('Falling', 1, [5, 8], permanentAttack(3), { automiss: true, persistent: true }),
    card('Pursuer', 0, [5, 9], permanentAttack(2), { automiss: true, persistent: true }),
    card('Drowned Bell', 2, [5, 9], itemAttack(4), { automiss: true, persistent: true }),
    // The boss.
    card('The Dreamer', 0, [7, 16], noLoot, { boss: true }),
  ],
};
