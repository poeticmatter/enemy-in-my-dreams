import type { RulesVariant } from '../engine/rules.ts';

export function RulesSheet({ rules, onClose }: { rules: RulesVariant; onClose: () => void }) {
  return (
    <div className="sheet" role="dialog" aria-label="Rules">
      <div className="sheet__body">
        <h2>Rules ({rules.id})</h2>
        <p>Your deck is your health. Defeat The Dreamer (the boss) to win.</p>
        <h3>Cards</h3>
        <p>
          Each card has three parts. The top is its <b>attack value</b>, which counts when you flip it. The red middle is the{' '}
          <b>enemy</b> you fight. The gold bottom is the <b>loot</b> you take when you defeat that enemy.
        </p>
        <h3>A turn</h3>
        <ol>
          <li>Pick one card in hand to fight. The other cards stay in hand.</li>
          <li>Flip cards off the draw pile as long as you like, adding each one's attack value. Flipped cards go to the discard pile.</li>
          <li>Use items if you want. Permanent loot always counts.</li>
          <li>
            Win if your attack {rules.winThreshold === 'beat' ? 'beats' : 'equals or beats'} the enemy's defense: the card goes to your loot.
            Lose and you take damage: discard that many cards from the top of the draw pile. The enemy goes to the discard pile.
          </li>
          <li>Draw back up to 3 cards.</li>
        </ol>
        <h3>Reshuffle</h3>
        <p>
          When you need a card and the draw pile is empty, the cards in your hand leave the game, then the discard pile becomes the new draw
          pile. <b>Persistent</b> cards can't leave: you must fight them right away.
          {rules.reshufflesPerTurn !== null && <> You can reshuffle once per turn. Needing a second reshuffle in the same turn means you lose.</>}
        </p>
        <h3>Keywords</h3>
        <ul>
          <li>
            <b>Automiss</b>: if you flip it, the attack fails.
          </li>
          <li>
            <b>Devour</b>: this enemy's damage removes cards from the game instead of discarding them.
          </li>
          {rules.lostFlipsAreRemoved && (
            <li>
              <b>Stakes</b> (rule): if you lose a fight, the cards you flipped in it leave the game.
            </li>
          )}
        </ul>
        <h3>Items</h3>
        <p>Single-use items go back to your discard pile when used: they rejoin your deck, as healing, and you can fight them again.</p>
        <button type="button" className="primary" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
