import { useState } from 'react';
import type { Card } from '../engine/cards.ts';
import { cardsDrawnPerTurn } from '../engine/rules.ts';
import { cardOf, neededToDefeat, permanentAttackBonus, usableItems, type GameState, type Move } from '../engine/state.ts';
import { CardView } from './CardView.tsx';

interface ChoosePanelProps {
  state: GameState;
  onMove: (move: Move) => void;
}

/** Start of a turn: pick the enemy to fight. The other cards stay in hand. */
export function ChoosePanel({ state, onMove }: ChoosePanelProps) {
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const encounter = encounterId === null ? null : cardOf(state, encounterId);

  return (
    <section className="table" aria-labelledby="turn-prompt">
      <h2 id="turn-prompt" className="prompt">
        {encounter === null ? 'Choose an enemy to fight' : `Fight ${encounter.name}?`}
      </h2>
      <div className="hand">
        {state.hand.map((id) => {
          const isChosen = id === encounterId;
          return (
            <div key={id} className={`hand__slot${isChosen ? ' hand__slot--fight' : ''}`}>
              <p className="hand__role" aria-live="polite">
                {roleLabel(isChosen, encounterId !== null)}
              </p>
              <CardView card={cardOf(state, id)} focus={isChosen ? null : 'enemy'} />
              <button type="button" aria-pressed={isChosen} onClick={() => setEncounterId(isChosen ? null : id)}>
                Fight
              </button>
            </div>
          );
        })}
      </div>
      <ReshuffleWarning state={state} />
      <div className="commit">
        <p className="commit__outlook">{encounter === null ? ' ' : outlookFor(state, encounter)}</p>
        <button
          type="button"
          className="button--primary"
          disabled={encounterId === null}
          onClick={() => encounterId !== null && onMove({ kind: 'engage', encounterId, attackCardId: null })}
        >
          {encounter === null ? 'Start the fight' : `Fight ${encounter.name}`}
        </button>
      </div>
    </section>
  );
}

function roleLabel(isChosen: boolean, isAnyChosen: boolean): string {
  if (isChosen) return 'Fighting';
  return isAnyChosen ? 'Stays in hand' : ' ';
}

function outlookFor(state: GameState, encounter: Card): string {
  const loot = permanentAttackBonus(state);
  const needed = neededToDefeat(state, encounter.id);
  const itemAttack = usableItems(state).reduce((sum, item) => sum + (item.loot.kind === 'itemAttack' ? item.loot.bonus : 0), 0);
  const start = loot > 0 ? `Your loot gives +${loot} attack against ${needed} needed` : `You need ${needed} attack`;
  if (loot >= needed) return `${start}: you win without flipping.`;
  const items = itemAttack > 0 ? `, or use items (up to +${itemAttack})` : '';
  return `${start}. Flip cards to make up the other ${needed - loot}${items}.`;
}

/** The rule players forget: running out of draw pile takes your hand with it. */
function ReshuffleWarning({ state }: { state: GameState }) {
  if (state.drawPile.length > cardsDrawnPerTurn(state.rules)) return null;
  return (
    <p className="notice">
      The draw pile has {state.drawPile.length} {state.drawPile.length === 1 ? 'card' : 'cards'} left. Flip or take damage and you'll
      reshuffle: the cards still in your hand then leave the game, and persistent ones must be fought.
    </p>
  );
}
