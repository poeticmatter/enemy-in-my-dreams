import { armor, cardOf, deckSize, permanentAttackBonus, usableItems, type GameState } from '../engine/state.ts';
import { itemEffectText, lootText } from './cardText.ts';

type Place = 'hand' | 'draw' | 'discard' | 'loot' | 'gone' | 'fighting';

const PLACE_LABELS: Record<Place, string> = {
  hand: 'in hand',
  fighting: 'fighting',
  draw: 'draw pile',
  discard: 'discard',
  loot: 'loot',
  gone: 'gone',
};

/**
 * Your health, card by card: one sliver per card in the game, grouped by where it is.
 * Hand, draw and discard are your health; loot and gone are cards your deck has lost.
 */
export function DeckStrip({ state }: { state: GameState }) {
  const total = Object.keys(state.cards).length;
  const counts: Record<Place, number> = {
    hand: state.hand.length,
    draw: state.drawPile.length,
    discard: state.discard.length,
    loot: state.inventory.length,
    gone: state.removed.length,
    fighting: 0,
  };
  counts.fighting = total - Object.values(counts).reduce((sum, count) => sum + count, 0);
  const order: Place[] = ['hand', 'fighting', 'draw', 'discard', 'loot', 'gone'];
  const health = deckSize(state);

  return (
    <section className="deck-strip" aria-label={`Health ${health} of ${total} cards`}>
      <p className="deck-strip__health">
        <strong>{health}</strong> cards of health
        <span className="deck-strip__turn">turn {state.turn}</span>
      </p>
      <div className="deck-strip__bar" aria-hidden="true">
        {order.flatMap((place) => Array.from({ length: counts[place] }, (_, index) => <span key={`${place}-${index}`} className={`sliver sliver--${place}`} />))}
      </div>
      <ul className="deck-strip__legend">
        {order
          .filter((place) => counts[place] > 0)
          .map((place) => (
            <li key={place}>
              <span className={`swatch sliver--${place}`} aria-hidden="true" />
              {counts[place]} {PLACE_LABELS[place]}
            </li>
          ))}
      </ul>
    </section>
  );
}

/** What you've won so far: lasting bonuses, and items waiting to be used in a fight. */
export function LootShelf({ state }: { state: GameState }) {
  const lasting = state.inventory.map((id) => cardOf(state, id)).filter((card) => card.loot.kind === 'permanentAttack' || card.loot.kind === 'permanentArmor');
  const items = usableItems(state);
  if (lasting.length === 0 && items.length === 0) return <p className="loot-shelf loot-shelf--empty">No loot yet. Defeat enemies to take theirs.</p>;
  const bonus = permanentAttackBonus(state);
  const reduction = armor(state);
  return (
    <section className="loot-shelf" aria-label="Your loot">
      {lasting.length > 0 && (
        <p>
          <span className="loot-shelf__heading">Every fight:</span> {bonus > 0 && `+${bonus} attack`}
          {bonus > 0 && reduction > 0 && ', '}
          {reduction > 0 && `${reduction} less damage`}
          <span className="loot-shelf__from"> from {lasting.map((card) => card.name).join(', ')}</span>
        </p>
      )}
      {items.length > 0 && (
        <p>
          <span className="loot-shelf__heading">Items:</span>{' '}
          {items.map((item) => (
            <span key={item.id} className="chip" title={lootText(item.loot)}>
              {item.name} {itemEffectText(item.loot)}
            </span>
          ))}
        </p>
      )}
    </section>
  );
}
