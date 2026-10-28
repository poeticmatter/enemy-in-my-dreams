import { BLOCKS_ALL, card, itemAttack, itemShield, noLoot, permanentArmor, permanentAttack, type CardSet } from '../engine/cards.ts';

/**
 * 24 cards in four tiers. Within each tier the modifier and the loot pull against
 * each other: a big modifier is a reason to discard the card instead of fighting it.
 */
export const SET_V1: CardSet = {
  version: 'v1',
  notes: 'First draft: 7 weak, 7 mid, 6 strong, 3 automiss, 1 boss.',
  cards: [
    // Weak: Defense 2–3, hit for 1.
    card('Moth', -2, [1, 2], itemAttack(2)),
    card('Murmur', -1, [1, 3], itemShield(BLOCKS_ALL)),
    card('Flicker', 4, [1, 3], itemAttack(1)),
    card('Drift', 0, [1, 2], itemAttack(1)),
    card('Hush', 1, [1, 3], itemAttack(2)),
    card('Pale Hand', -1, [2, 3], permanentAttack(1)),
    card('Echo', 2, [1, 2], itemShield(BLOCKS_ALL)),
    // Mid: Defense 4–5, hit for 2–3.
    card('Lurker', 1, [2, 4], permanentAttack(1)),
    card('Endless Stair', -2, [2, 5], permanentAttack(2)),
    card('Grinning Door', 3, [2, 5], itemAttack(3)),
    card('Tide', 0, [3, 4], permanentArmor(1)),
    card('Mirror', 2, [2, 4], itemAttack(2)),
    card('Lamplighter', 5, [3, 5], itemAttack(1)),
    card('Crawler', -1, [2, 4], itemShield(BLOCKS_ALL)),
    // Strong: Defense 6–7, hit for 3–4.
    card('Hollow Choir', 3, [3, 6], permanentAttack(2)),
    card('Teeth', -2, [3, 6], permanentAttack(2)),
    card('Faceless', 1, [4, 7], permanentArmor(2)),
    card('Drowning', 0, [3, 7], permanentAttack(2)),
    card('Bell Tower', 4, [3, 6], itemAttack(3)),
    card('Weaver', 2, [4, 7], permanentAttack(1)),
    // Automiss: huge enemies, and flipping one ruins the attack.
    card('Falling', 1, [4, 8], permanentAttack(3), { automiss: true, persistent: true }),
    card('Pursuer', 0, [4, 9], permanentArmor(2), { automiss: true, persistent: true }),
    card('Drowned Bell', 2, [5, 9], itemAttack(4), { automiss: true, persistent: true }),
    // The boss.
    card('The Dreamer', 0, [6, 13], noLoot, { boss: true }),
  ],
};
