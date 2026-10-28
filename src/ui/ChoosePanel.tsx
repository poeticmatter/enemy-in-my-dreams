import { useState } from 'react';
import type { Card } from '../engine/cards.ts';
import { cardOf, neededToDefeat, permanentAttackBonus, usableItems, type GameState, type Move } from '../engine/state.ts';
import { CardView, type CardFocus } from './CardView.tsx';

interface ChoosePanelProps {
  state: GameState;
  onMove: (move: Move) => void;
}

type Role = 'fight' | 'attack' | 'kept' | 'helps' | null;

const ROLE_LABELS: Record<Exclude<Role, null>, string> = {
  fight: 'Fighting',
  attack: 'Attacking with',
  kept: 'Kept for next turn',
  helps: 'Adds its attack',
};

/** Start of a turn: pick the enemy to fight and, in Turn A, the card to attack with. */
export function ChoosePanel({ state, onMove }: ChoosePanelProps) {
  const [encounterId, setEncounterId] = useState<string | null>(null);
  const [attackCardId, setAttackCardId] = useState<string | null>(null);
  const isTurnA = state.rules.turnStyle === 'A';
  const needsAttackCard = isTurnA && state.hand.length > 1;
  const isReady = encounterId !== null && (!needsAttackCard || attackCardId !== null);

  function chooseFight(cardId: string) {
    setEncounterId(cardId === encounterId ? null : cardId);
    if (cardId === attackCardId) setAttackCardId(null);
  }

  function chooseAttack(cardId: string) {
    setAttackCardId(cardId === attackCardId ? null : cardId);
    if (cardId === encounterId) setEncounterId(null);
  }

  function roleOf(cardId: string): Role {
    if (cardId === encounterId) return 'fight';
    if (cardId === attackCardId) return 'attack';
    if (!isTurnA) return encounterId === null ? null : 'helps';
    return encounterId !== null && attackCardId !== null ? 'kept' : null;
  }

  const focus = focusFor(encounterId, attackCardId, needsAttackCard);

  return (
    <section className="table" aria-labelledby="turn-prompt">
      <h2 id="turn-prompt" className="prompt">
        {promptFor(encounterId, attackCardId, needsAttackCard)}
      </h2>
      <div className="hand">
        {state.hand.map((id) => {
          const role = roleOf(id);
          return (
            <div key={id} className={`hand__slot${role ? ` hand__slot--${role}` : ''}`}>
              <p className="hand__role" aria-live="polite">
                {role ? ROLE_LABELS[role] : ' '}
              </p>
              <CardView card={cardOf(state, id)} focus={role === null ? focus : null} />
              <div className="hand__buttons">
                <button type="button" aria-pressed={id === encounterId} onClick={() => chooseFight(id)}>
                  Fight
                </button>
                {needsAttackCard && (
                  <button type="button" aria-pressed={id === attackCardId} onClick={() => chooseAttack(id)}>
                    Attack with
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ReshuffleWarning state={state} />
      <div className="commit">
        <p className="commit__outlook">{encounterId === null ? ' ' : outlookFor(state, cardOf(state, encounterId), attackCardId)}</p>
        <button
          type="button"
          className="button--primary"
          disabled={!isReady}
          onClick={() => {
            if (encounterId === null) return;
            onMove({ kind: 'engage', encounterId, attackCardId: needsAttackCard ? attackCardId : null });
          }}
        >
          {encounterId === null ? 'Start the fight' : `Fight ${cardOf(state, encounterId).name}`}
        </button>
      </div>
    </section>
  );
}

/** Points the eye at the part of each card that matters for the next choice. */
function focusFor(encounterId: string | null, attackCardId: string | null, needsAttackCard: boolean): CardFocus {
  if (encounterId === null) return 'enemy';
  if (needsAttackCard && attackCardId === null) return 'attack';
  return null;
}

function promptFor(encounterId: string | null, attackCardId: string | null, needsAttackCard: boolean): string {
  if (encounterId === null) return 'Choose an enemy to fight';
  if (needsAttackCard && attackCardId === null) return 'Choose a card to attack with';
  return 'Ready to fight';
}

/** The attack the chosen cards give before flips: the attack card (Turn A) or every other card in hand (Turn B). */
function cardAttackFor(state: GameState, encounterId: string, attackCardId: string | null): number {
  if (state.rules.turnStyle === 'B') {
    return state.hand.filter((id) => id !== encounterId).reduce((sum, id) => sum + cardOf(state, id).modifier, 0);
  }
  return attackCardId === null ? 0 : cardOf(state, attackCardId).modifier;
}

function outlookFor(state: GameState, encounter: Card, attackCardId: string | null): string {
  const attack = cardAttackFor(state, encounter.id, attackCardId) + permanentAttackBonus(state);
  const needed = neededToDefeat(state, encounter.id);
  const opening = `${attack} attack against ${needed} needed`;
  if (attack >= needed) return `${opening}: you win without flipping.`;
  const itemAttack = usableItems(state).reduce((sum, item) => sum + (item.loot.kind === 'itemAttack' ? item.loot.bonus : 0), 0);
  const items = itemAttack > 0 ? `, or use items (up to +${itemAttack})` : '';
  return `${opening}: ${needed - attack} short. You can flip cards${items}.`;
}

/** The rule players forget: running out of draw pile takes your hand with it. */
function ReshuffleWarning({ state }: { state: GameState }) {
  const cardsDrawnAtTurnEnd = state.rules.turnStyle === 'A' ? 2 : 1;
  if (state.drawPile.length > cardsDrawnAtTurnEnd) return null;
  return (
    <p className="notice">
      The draw pile has {state.drawPile.length} {state.drawPile.length === 1 ? 'card' : 'cards'} left, so a reshuffle comes this turn. Cards
      still in your hand then leave the game, and persistent ones must be fought with no attack card.
    </p>
  );
}
