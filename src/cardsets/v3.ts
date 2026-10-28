import { card, itemAttack, itemShield, noLoot, permanentArmor, permanentAttack, type CardSet } from '../engine/cards.ts';

/**
 * Items are the main loot now. They recycle into the deck when used, so they are
 * healing and attack at once, and saving them for the boss keeps them out of your health.
 */
export const SET_V3: CardSet = {
  version: 'v3',
  notes: 'Permanent attack 16 → 5 (items instead); shields block 3; boss 8/18.',
  cards: [
    // Weak: Defense 2–3, hit for 1–2.
    card('Moth', -2, [1, 2], itemAttack(2)),
    card('Murmur', -1, [2, 3], itemShield(3)),
    card('Flicker', 4, [2, 3], itemAttack(1)),
    card('Drift', 0, [1, 2], itemAttack(1)),
    card('Hush', 1, [2, 3], itemAttack(2)),
    card('Pale Hand', -1, [2, 3], permanentAttack(1)),
    card('Echo', 2, [1, 2], itemShield(3)),
    // Mid: Defense 4–5, hit for 3.
    card('Lurker', 1, [3, 4], itemAttack(2)),
    card('Endless Stair', -2, [3, 5], permanentAttack(1)),
    card('Grinning Door', 3, [3, 5], itemAttack(3)),
    card('Tide', 0, [3, 4], permanentArmor(1)),
    card('Mirror', 2, [3, 4], itemAttack(2)),
    card('Lamplighter', 5, [3, 5], itemAttack(1)),
    card('Crawler', -1, [3, 4], itemShield(3)),
    // Strong: Defense 6–7, hit for 4.
    card('Hollow Choir', 3, [4, 6], itemAttack(3)),
    card('Teeth', -2, [4, 6], permanentAttack(1)),
    card('Faceless', 1, [4, 7], itemShield(3)),
    card('Drowning', 0, [4, 7], itemAttack(3)),
    card('Bell Tower', 4, [4, 6], itemAttack(3)),
    card('Weaver', 2, [4, 7], itemAttack(2)),
    // Automiss: huge enemies, and flipping one ruins the attack.
    card('Falling', 1, [5, 8], permanentAttack(2), { automiss: true, persistent: true }),
    card('Pursuer', 0, [5, 9], itemAttack(4), { automiss: true, persistent: true }),
    card('Drowned Bell', 2, [5, 9], itemAttack(4), { automiss: true, persistent: true }),
    // The boss.
    card('The Dreamer', 0, [8, 18], noLoot, { boss: true }),
  ],
};
