import { describeLoot, type Card } from '../engine/cards.ts';
import { signed } from './describeEvent.ts';

interface CardViewProps {
  card: Card;
  /** Role badge shown while choosing ("Fight", "Attack"). */
  role?: string | null;
  isDimmed?: boolean;
  onClick?: () => void;
}

function keywordsOf(card: Card): string[] {
  return [card.isBoss && 'Boss', card.isAutomiss && 'Automiss', card.isPersistent && 'Persistent', card.isDevouring && 'Devour'].filter(
    (keyword): keyword is string => typeof keyword === 'string',
  );
}

export function CardView({ card, role = null, isDimmed = false, onClick }: CardViewProps) {
  const classes = ['card', card.isBoss && 'card--boss', card.isAutomiss && 'card--automiss', role && 'card--selected', isDimmed && 'card--dimmed']
    .filter(Boolean)
    .join(' ');
  const content = (
    <>
      {role && <span className="card__role">{role}</span>}
      <div className="card__modifier" title="Attack modifier">
        {signed(card.modifier)}
      </div>
      <div className="card__name">{card.name}</div>
      <div className="card__enemy" title="Enemy: Attack (damage if you lose) / Defense">
        <span>hits {card.enemy.attack}</span>
        <span>def {card.enemy.defense}</span>
      </div>
      <div className="card__loot">{describeLoot(card.loot)}</div>
      <div className="card__keywords">
        {keywordsOf(card).map((keyword) => (
          <span key={keyword} className="keyword">
            {keyword}
          </span>
        ))}
      </div>
    </>
  );
  if (!onClick) return <div className={classes}>{content}</div>;
  return (
    <button type="button" className={classes} onClick={onClick}>
      {content}
    </button>
  );
}

export function MiniCard({ card }: { card: Card }) {
  return (
    <span className={`mini-card${card.isAutomiss ? ' mini-card--automiss' : ''}`} title={`${card.name}: ${describeLoot(card.loot)}`}>
      {card.isAutomiss ? '✕' : signed(card.modifier)} {card.name}
    </span>
  );
}
