import { card, itemAttack, itemShield, noLoot, permanentArmor, permanentAttack, type CardSet } from '../engine/cards.ts';

/**
 * For the flip-only turn (Turn C): no attack card, so every point of attack is flipped.
 * Attack values are higher than v6's, since they are the whole attack now.
 * A high value makes a card a good flip, so defeating it (taking it out of your deck) costs you,
 * and its loot is worth more. Low and negative values are bad flips: fighting them thins your deck.
 * Automiss cards have no attack value: flipped, they always miss.
 */
export const SET_V7: CardSet = {
  version: 'v7',
  notes: 'Flip-only turn: higher attack values, defenses scaled to flips, automiss value 0.',
  cards: [
    // Weak: Defense 2–3, hit for 1–2.
    card('Moth', -1, [1, 2], itemAttack(1)),
    card('Murmur', 0, [2, 3], itemShield(3)),
    card('Flicker', 4, [2, 3], itemAttack(3)),
    card('Drift', 1, [1, 2], itemAttack(1)),
    card('Hush', 2, [2, 3], itemAttack(2)),
    card('Pale Hand', 0, [2, 3], permanentAttack(1)),
    card('Echo', 3, [1, 3], itemShield(3)),
    // Mid: Defense 4–5, hit for 2–3.
    card('Lurker', 2, [2, 4], itemAttack(2)),
    card('Endless Stair', -2, [3, 5], permanentAttack(1)),
    card('Grinning Door', 4, [3, 5], itemAttack(3)),
    card('Tide', 1, [3, 4], permanentArmor(1)),
    card('Mirror', 3, [2, 4], itemAttack(2)),
    card('Lamplighter', 5, [3, 5], permanentAttack(1)),
    card('Crawler', 0, [2, 4], itemShield(3)),
    // Strong: Defense 6–8, hit for 3–4.
    card('Hollow Choir', 3, [3, 6], itemAttack(3)),
    card('Teeth', -1, [4, 7], permanentAttack(1)),
    card('Faceless', 2, [4, 7], permanentAttack(1)),
    card('Drowning', 1, [3, 6], itemAttack(3)),
    card('Bell Tower', 5, [4, 8], itemAttack(4)),
    card('Weaver', 3, [4, 7], itemAttack(4)),
    // Automiss: huge enemies, and flipping one ruins the attack.
    card('Falling', 0, [5, 9], permanentAttack(2), { automiss: true, persistent: true }),
    card('Pursuer', 0, [5, 10], itemAttack(5), { automiss: true, persistent: true }),
    card('Drowned Bell', 0, [5, 10], itemAttack(5), { automiss: true, persistent: true }),
    // The boss.
    card('The Dreamer', -2, [4, 16], noLoot, { boss: true, devour: true }),
  ],
};
