import type { GameEvent, GameState } from '../engine/state.ts';
import { signed } from './cardText.ts';

const nameOf = (state: GameState, id: string) => state.cards[id].name;
const names = (state: GameState, ids: readonly string[]) => ids.map((id) => nameOf(state, id)).join(', ');

/** One log line per event, or null for events the log leaves out. `state` is any state of the same game (for card names). */
export function describeEvent(state: GameState, event: GameEvent): string | null {
  switch (event.kind) {
    case 'turnStarted':
      return `Turn ${event.turn}: ${event.deckSize} cards of health`;
    case 'engaged': {
      const attack = event.attackCardId ? `, attacking with ${nameOf(state, event.attackCardId)}` : '';
      const contributors = event.contributorIds.length > 0 ? `, helped by ${names(state, event.contributorIds)}` : '';
      return `You face ${nameOf(state, event.encounterId)}${attack}${contributors}.`;
    }
    case 'flipped':
      return event.isAutomiss
        ? `Flipped ${nameOf(state, event.cardId)}: AUTOMISS, the attack fails.`
        : `Flipped ${nameOf(state, event.cardId)} (${signed(state.cards[event.cardId].modifier)}).`;
    case 'itemUsed':
      return `Used ${nameOf(state, event.itemId)}; it returns to your discard pile.`;
    case 'fightResolved': {
      const versus = `${event.total} vs ${event.needed} needed`;
      if (event.isWin) return `Defeated ${nameOf(state, event.encounterId)} (${versus}). Loot taken.`;
      return `Lost to ${nameOf(state, event.encounterId)} (${event.hasAutomissed ? 'automiss' : versus}). Damage ${event.damage}.`;
    }
    case 'damageTaken':
      return `${event.isDevouring ? 'Devoured (gone for good)' : 'Discarded by damage'}: ${names(state, event.cardIds)}.`;
    case 'flipsLost':
      return `Stakes: the flipped cards are lost: ${names(state, event.cardIds)}.`;
    case 'cardDrawn':
      return null;
    case 'reshuffled': {
      const removed = event.removedIds.length > 0 ? ` Removed from your hand: ${names(state, event.removedIds)}.` : '';
      const forced = event.forcedIds.length > 0 ? ` Must fight now: ${names(state, event.forcedIds)}.` : '';
      return `Reshuffle: ${event.drawPileSize} cards in the new draw pile.${removed}${forced}`;
    }
    case 'forcedFight':
      return `${nameOf(state, event.cardId)} can't leave: fight it with no attack card.`;
    case 'gameOver':
      return event.outcome === 'won' ? 'You defeated The Dreamer. You wake up.' : 'Your deck is spent. The dream takes you.';
  }
}
