import { useState } from 'react';
import { attackNeeded } from '../engine/rules.ts';
import { cardOf, permanentAttackBonus, type GameState, type Move } from '../engine/state.ts';
import { CardView } from './CardView.tsx';

interface ChoosePanelProps {
  state: GameState;
  onMove: (move: Move) => void;
}

/** Start of a turn: pick the enemy to fight and (Turn A) the card to attack with. */
export function ChoosePanel({ state, onMove }: ChoosePanelProps) {
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [attackCardId, setAttackCardId] = useState<string | null>(null);
  const isTurnA = state.rules.turnStyle === 'A';
  const needsAttackCard = isTurnA && state.hand.length > 1;

  function pick(cardId: string) {
    if (cardId === encounterId) return setEncounterId(null);
    if (cardId === attackCardId) return setAttackCardId(null);
    if (encounterId === null) return setEncounterId(cardId);
    if (needsAttackCard) setAttackCardId(cardId);
  }

  function roleOf(cardId: string): string | null {
    if (cardId === encounterId) return 'Fight';
    if (cardId === attackCardId) return 'Attack';
    if (!isTurnA && encounterId !== null) return 'Helps';
    return null;
  }

  const isReady = encounterId !== null && (!needsAttackCard || attackCardId !== null);
  const cardAttack = previewCardAttack(state, encounterId, attackCardId);
  const bonus = permanentAttackBonus(state);

  return (
    <section className="panel">
      <h2>{prompt(encounterId, attackCardId, needsAttackCard)}</h2>
      <div className="hand">
        {state.hand.map((id) => (
          <CardView key={id} card={cardOf(state, id)} role={roleOf(id)} onClick={() => pick(id)} />
        ))}
      </div>
      {encounterId !== null && (
        <p className="preview">
          Attack before flips and items: <strong>{cardAttack + bonus}</strong>
          {bonus > 0 && ` (${cardAttack} + ${bonus} permanent)`} · need{' '}
          <strong>{attackNeeded(cardOf(state, encounterId).enemy.defense, state.rules)}</strong>
        </p>
      )}
      <button
        type="button"
        className="primary"
        disabled={!isReady}
        onClick={() => {
          if (encounterId === null) return;
          onMove({ kind: 'engage', encounterId, attackCardId: needsAttackCard ? attackCardId : null });
          setEncounterId(null);
          setAttackCardId(null);
        }}
      >
        Start the fight
      </button>
    </section>
  );
}

/** What the chosen cards add before flips: the attack card (Turn A) or every other card in hand (Turn B). */
function previewCardAttack(state: GameState, encounterId: string | null, attackCardId: string | null): number {
  if (state.rules.turnStyle === 'B') {
    return state.hand.filter((id) => id !== encounterId).reduce((sum, id) => sum + cardOf(state, id).modifier, 0);
  }
  return attackCardId === null ? 0 : cardOf(state, attackCardId).modifier;
}

function prompt(encounterId: string | null, attackCardId: string | null, needsAttackCard: boolean): string {
  if (encounterId === null) return 'Pick the enemy to fight';
  if (needsAttackCard && attackCardId === null) return 'Pick the card to attack with';
  return 'Ready';
}
