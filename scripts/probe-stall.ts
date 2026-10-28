// Diagnostic: the end state of the first stalled game.
// Usage: node scripts/probe-stall.ts <set> <variant> <bot>
import { botFor } from '../src/bots/roster.ts';
import { cardSetFor } from '../src/cardsets/index.ts';
import { applyMove, createGame } from '../src/engine/game.ts';
import { Random } from '../src/engine/rng.ts';
import { variantFor } from '../src/engine/rules.ts';
import { permanentAttackBonus, type GameState } from '../src/engine/state.ts';

const [setVersion = 'v2-boss8x24', variantId = 'A>', botSpec = 'smart'] = process.argv.slice(2);
const names = (state: GameState, ids: readonly string[]) => ids.map((id) => state.cards[id].name).join(', ');

for (let seed = 1; seed <= 500; seed++) {
  const bot = botFor(botSpec);
  const rng = new Random(seed);
  let state: GameState = createGame(cardSetFor(setVersion), variantFor(variantId), seed).state;
  const lastEvents: string[] = [];
  while (state.phase.kind !== 'over') {
    const transition = applyMove(state, bot.chooseMove(state, rng));
    if (state.turn > 190) lastEvents.push(...transition.events.map((event) => JSON.stringify(event)));
    state = transition.state;
  }
  if (state.phase.outcome !== 'stalled') continue;
  console.log(`seed ${seed} stalled. Permanent attack +${permanentAttackBonus(state)}`);
  console.log('hand:', names(state, state.hand));
  console.log('draw:', names(state, state.drawPile));
  console.log('discard:', names(state, state.discard));
  console.log('inventory:', names(state, state.inventory));
  console.log('last events:\n' + lastEvents.slice(-25).join('\n'));
  break;
}
