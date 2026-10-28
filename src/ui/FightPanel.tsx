import {
  cardOf,
  damageFrom,
  fightTotal,
  isFightWon,
  neededToDefeat,
  permanentAttackBonus,
  usableItems,
  type Fight,
  type GameState,
  type Move,
} from '../engine/state.ts';
import { damageText, itemEffectText, signed } from './cardText.ts';
import { CardView, FlippedCard } from './CardView.tsx';

interface FightPanelProps {
  state: GameState;
  fight: Fight;
  onMove: (move: Move) => void;
}

export function FightPanel({ state, fight, onMove }: FightPanelProps) {
  const encounter = cardOf(state, fight.encounterId);
  const isWinning = isFightWon(state, fight);
  const damage = Math.max(0, damageFrom(state, encounter.id) - fight.shieldBlock);
  const isStakeAtRisk = state.rules.lostFlipsAreRemoved && !isWinning && fight.flippedIds.some((id) => !cardOf(state, id).isPersistent);

  return (
    <section className="table" aria-labelledby="fight-prompt">
      <h2 id="fight-prompt" className="prompt">
        {fight.isForced ? `${encounter.name} can't leave the game. Fight it with no attack card.` : `Fighting ${encounter.name}`}
      </h2>
      <div className="arena">
        <CardView card={encounter} focus="enemy" isLarge />
        <div className="arena__side">
          <Tally state={state} fight={fight} />
          <DrawPile state={state} isDisabled={fight.hasAutomissed || isWinning} onFlip={() => onMove({ kind: 'flip' })} />
          <ItemButtons state={state} fight={fight} onMove={onMove} />
          {isStakeAtRisk && <p className="notice">If you lose, the cards you flipped leave the game.</p>}
          <button type="button" className={isWinning ? 'button--primary button--win' : 'button--primary'} onClick={() => onMove({ kind: 'resolve' })}>
            {isWinning ? `Defeat ${encounter.name}` : `Take the hit: ${damage === 0 ? 'no damage' : damageText(damage, encounter.isDevouring)}`}
          </button>
        </div>
      </div>
    </section>
  );
}

/** The fight as a sum: every source of attack on its own line, then the total against what's needed. */
function Tally({ state, fight }: { state: GameState; fight: Fight }) {
  const needed = neededToDefeat(state, fight.encounterId);
  const total = fightTotal(state, fight);
  const permanent = permanentAttackBonus(state);
  const fill = Math.max(0, Math.min(1, total / needed));
  const outcome = fight.hasAutomissed ? 'failed' : total >= needed ? 'enough' : 'short';
  const status = { failed: 'Automiss: this attack fails.', enough: 'Enough to win.', short: `${needed - total} short.` }[outcome];

  return (
    <div className="tally">
      <dl className="tally__lines">
        <TallyLine label={cardAttackLabel(state, fight)} value={fight.cardAttack} />
        {permanent > 0 && <TallyLine label="Loot, every fight" value={permanent} />}
        {fight.itemAttack > 0 && <TallyLine label="Items" value={fight.itemAttack} />}
        {fight.flippedIds.length > 0 && <TallyLine label="Flips" value={fight.flipTotal} />}
      </dl>
      {fight.flippedIds.length > 0 && (
        <div className="tally__flips">
          {fight.flippedIds.map((id) => (
            <FlippedCard key={id} card={cardOf(state, id)} />
          ))}
        </div>
      )}
      <div className={`meter meter--${outcome}`}>
        <div className="meter__fill" style={{ width: `${fill * 100}%` }} />
        <span className="meter__text">
          <strong>{total}</strong> of {needed} needed
        </span>
      </div>
      <p className="tally__status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}

function TallyLine({ label, value }: { label: string; value: number }) {
  return (
    <>
      <dt>{label}</dt>
      <dd>{signed(value)}</dd>
    </>
  );
}

function cardAttackLabel(state: GameState, fight: Fight): string {
  if (fight.isForced) return 'No attack card';
  return state.rules.turnStyle === 'A' ? 'Attack card' : 'Cards in hand';
}

/** The face-down draw pile is the flip button: what you see is what you flip from. */
function DrawPile({ state, isDisabled, onFlip }: { state: GameState; isDisabled: boolean; onFlip: () => void }) {
  const count = state.drawPile.length;
  const automissCount = state.drawPile.filter((id) => cardOf(state, id).isAutomiss).length;
  return (
    <button type="button" className="draw-pile" disabled={isDisabled || count === 0} onClick={onFlip}>
      <span className="draw-pile__stack" aria-hidden="true" />
      <span className="draw-pile__text">
        <strong>{count === 0 ? 'Draw pile empty' : 'Flip a card'}</strong>
        <span>
          {count} left, {automissCount} automiss
        </span>
      </span>
    </button>
  );
}

function ItemButtons({ state, fight, onMove }: FightPanelProps) {
  const items = usableItems(state);
  if (items.length === 0) return null;
  return (
    <div className="items" role="group" aria-label="Items">
      <p className="items__note">Used items go back into your deck.</p>
      {items.map((item) => {
        const isUsable = item.loot.kind === 'itemAttack' ? !fight.hasAutomissed : !fight.isShielded;
        return (
          <button key={item.id} type="button" className="item" disabled={!isUsable} onClick={() => onMove({ kind: 'useItem', itemId: item.id })}>
            <span className="item__effect">{itemEffectText(item.loot)}</span>
            <span className="item__name">{item.name}</span>
          </button>
        );
      })}
    </div>
  );
}
