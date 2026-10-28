import type { Card } from '../engine/cards.ts';
import { hitText, keywordsOf, lootText, signed } from './cardText.ts';
import { AttackIcon, HitIcon, LootIcon, ShieldIcon } from './icons.tsx';

/** Which part of the card matters for the choice being made; the other parts fade back. */
export type CardFocus = 'enemy' | null;

interface CardViewProps {
  card: Card;
  focus?: CardFocus;
  isLarge?: boolean;
}

/**
 * A card has three jobs, stacked top to bottom: its attack value (when you discard or flip it),
 * the enemy you fight, and the loot you win. Each job gets its own band and colour.
 */
export function CardView({ card, focus = null, isLarge = false }: CardViewProps) {
  // Flipping an automiss card fails the attack, so its attack value is "Miss", not a number.
  const classes = ['card', isLarge && 'card--large', card.isBoss && 'card--boss', card.isAutomiss && 'card--missed', focus && `card--focus-${focus}`]
    .filter(Boolean)
    .join(' ');
  return (
    <article className={classes} aria-label={describeCard(card)}>
      <header className="card__top">
        <span className={`card__attack${card.modifier < 0 ? ' card__attack--negative' : ''}`}>
          <AttackIcon />
          {card.isAutomiss ? 'Miss' : signed(card.modifier)}
        </span>
        <h3 className="card__name">{card.name}</h3>
      </header>
      <section className="card__enemy">
        <div className="card__defense">
          <ShieldIcon />
          <span className="card__defense-value">{card.enemy.defense}</span>
          <span className="card__caption">defense</span>
        </div>
        <div className="card__hit">
          <HitIcon />
          If you lose: {hitText(card)}
        </div>
      </section>
      <footer className="card__loot">
        <LootIcon />
        <span>
          <span className="card__caption">Win:</span> {lootText(card.loot)}
        </span>
      </footer>
      {keywordsOf(card).map((keyword) => (
        <p key={keyword.name} className="card__keyword">
          <strong>{keyword.name}.</strong> {keyword.meaning}
        </p>
      ))}
    </article>
  );
}

function describeCard(card: Card): string {
  return `${card.name}: attack ${card.isAutomiss ? 'miss' : signed(card.modifier)}, enemy defense ${card.enemy.defense}, if you lose ${hitText(card)}, win ${lootText(card.loot)}`;
}
