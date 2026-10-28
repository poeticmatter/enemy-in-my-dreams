import { describeLoot } from '../engine/cards.ts';
import { cardOf, damageFrom, fightTotal, isFightWon, neededToDefeat, usableItems, type Fight, type GameState, type Move } from '../engine/state.ts';
import { CardView, MiniCard } from './CardView.tsx';

interface FightPanelProps {
  state: GameState;
  fight: Fight;
  onMove: (move: Move) => void;
}

export function FightPanel({ state, fight, onMove }: FightPanelProps) {
  const encounter = cardOf(state, fight.encounterId);
  const total = fightTotal(state, fight);
  const needed = neededToDefeat(state, encounter.id);
  const isWinning = isFightWon(state, fight);
  const damage = Math.max(0, damageFrom(state, encounter.id) - fight.shieldBlock);

  return (
    <section className="panel">
      <h2>{fight.isForced ? `${encounter.name} won't leave: forced fight, no attack card` : `Fighting ${encounter.name}`}</h2>
      <div className="fight">
        <CardView card={encounter} />
        <div className="fight__status">
          <div className={`score ${isWinning ? 'score--winning' : ''}`}>
            {fight.hasAutomissed ? 'Automiss!' : `${total} / ${needed}`}
          </div>
          <div className="muted">{fight.hasAutomissed ? 'The attack fails whatever the total.' : 'your attack / needed to win'}</div>
          {fight.flippedIds.length > 0 && (
            <div className="flipped">
              {fight.flippedIds.map((id) => (
                <MiniCard key={id} card={cardOf(state, id)} />
              ))}
            </div>
          )}
          <div className="actions">
            <button
              type="button"
              onClick={() => onMove({ kind: 'flip' })}
              disabled={fight.hasAutomissed || state.drawPile.length === 0 || isWinning}
            >
              Flip a card
            </button>
            <button type="button" className="primary" onClick={() => onMove({ kind: 'resolve' })}>
              {isWinning ? 'Strike: you win' : `Take the hit (${damage} damage${encounter.isDevouring ? ', devoured' : ''})`}
            </button>
          </div>
          {state.rules.lostFlipsAreRemoved && fight.flippedIds.length > 0 && !isWinning && (
            <p className="warning">Stakes: if you lose, the flipped cards leave the game.</p>
          )}
        </div>
      </div>
      <ItemBar state={state} fight={fight} onMove={onMove} />
    </section>
  );
}

function ItemBar({ state, fight, onMove }: FightPanelProps) {
  const items = usableItems(state);
  if (items.length === 0) return null;
  return (
    <div className="items">
      <span className="muted">Items (they return to your discard pile when used):</span>
      {items.map((item) => {
        const isUsable = item.loot.kind === 'itemAttack' ? !fight.hasAutomissed : !fight.isShielded;
        return (
          <button key={item.id} type="button" disabled={!isUsable} onClick={() => onMove({ kind: 'useItem', itemId: item.id })}>
            {item.name}: {describeLoot(item.loot).replace('Item: ', '')}
          </button>
        );
      })}
    </div>
  );
}
