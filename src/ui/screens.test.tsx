import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { botFor } from '../bots/roster.ts';
import { CURRENT_SET } from '../cardsets/index.ts';
import { applyMove, createGame } from '../engine/game.ts';
import { Random } from '../engine/rng.ts';
import { variantFor } from '../engine/rules.ts';
import type { GameEvent, GameState } from '../engine/state.ts';
import { ChoosePanel } from './ChoosePanel.tsx';
import { DeckStrip } from './DeckStrip.tsx';
import { describeEvent } from './describeEvent.ts';
import { FightPanel } from './FightPanel.tsx';
import { RulesSheet } from './RulesSheet.tsx';

const noop = () => {};
const RULES = variantFor('C>+stakes');

function playUntil(seed: number, isTarget: (state: GameState) => boolean): GameState {
  const bot = botFor('smart');
  const rng = new Random(seed);
  let { state } = createGame(CURRENT_SET, RULES, seed);
  while (!isTarget(state) && state.phase.kind !== 'over') state = applyMove(state, bot.chooseMove(state, rng)).state;
  return state;
}

describe('screens', () => {
  it('shows every card in hand at the start of a turn', () => {
    const { state } = createGame(CURRENT_SET, RULES, 3);
    const html = renderToStaticMarkup(<ChoosePanel state={state} onMove={noop} />);
    for (const id of state.hand) expect(html).toContain(state.cards[id].name);
  });

  it('shows the attack against what is needed during a fight', () => {
    const state = playUntil(3, (candidate) => candidate.phase.kind === 'fight');
    if (state.phase.kind !== 'fight') throw new Error('Expected a fight');
    const html = renderToStaticMarkup(<FightPanel state={state} fight={state.phase.fight} onMove={noop} />);
    expect(html).toMatch(/<strong>-?\d+<\/strong> of \d+ needed/);
  });

  it('offers only a Fight choice: there is no attack card to pick', () => {
    const { state } = createGame(CURRENT_SET, RULES, 3);
    const html = renderToStaticMarkup(<ChoosePanel state={state} onMove={noop} />);
    expect(html).not.toContain('Attack with');
  });

  it('stacks every flipped card, with only the newest shown in full', () => {
    const state = playUntil(5, (candidate) => candidate.phase.kind === 'fight' && candidate.phase.fight.flippedIds.length >= 2);
    if (state.phase.kind !== 'fight') throw new Error('Expected a fight with flips');
    const html = renderToStaticMarkup(<FightPanel state={state} fight={state.phase.fight} onMove={noop} />);
    expect(html.match(/class="flip-stack__item/g)).toHaveLength(state.phase.fight.flippedIds.length);
    expect(html.match(/flip-stack__item--last/g)).toHaveLength(1);
  });

  it('draws one sliver per card in the game on the health strip', () => {
    const { state } = createGame(CURRENT_SET, RULES, 3);
    const slivers = renderToStaticMarkup(<DeckStrip state={state} />).match(/class="sliver /g) ?? [];
    expect(slivers).toHaveLength(CURRENT_SET.cards.length);
  });

  it('spells out every part of a card', () => {
    const { state } = createGame(CURRENT_SET, RULES, 3);
    const html = renderToStaticMarkup(<ChoosePanel state={state} onMove={noop} />);
    expect(html).toContain('defense');
    expect(html).toContain('If you lose:');
    expect(html).toContain('Win:');
  });

  it('explains the stakes rule only when it is on', () => {
    expect(renderToStaticMarkup(<RulesSheet rules={RULES} onClose={noop} />)).toContain('Stakes');
    expect(renderToStaticMarkup(<RulesSheet rules={variantFor('C>')} onClose={noop} />)).not.toContain('Stakes');
  });
});

describe('the game log', () => {
  it('has a line for every kind of event a full game produces, except draws', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const bot = botFor('smart');
      const rng = new Random(seed);
      let { state, events } = createGame(CURRENT_SET, RULES, seed);
      const seen: GameEvent[] = [...events];
      while (state.phase.kind !== 'over') {
        const transition = applyMove(state, bot.chooseMove(state, rng));
        seen.push(...transition.events);
        state = transition.state;
      }
      const undescribed = seen.filter((event) => event.kind !== 'cardDrawn' && describeEvent(state, event) === null);
      expect(undescribed).toEqual([]);
    }
  });
});
