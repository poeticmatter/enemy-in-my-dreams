// Diagnostic: finds the first game that runs away (too many moves) and prints its recent moves.
// Usage: node scripts/probe-loop.ts <set> <variant> <bot>
import { botFor } from '../src/bots/roster.ts';
import { cardSetFor } from '../src/cardsets/index.ts';
import { applyMove, createGame } from '../src/engine/game.ts';
import { Random } from '../src/engine/rng.ts';
import { variantFor } from '../src/engine/rules.ts';
import type { GameState } from '../src/engine/state.ts';

const MOVE_CAP = 20_000;
const [setVersion = 'v5-boss5x16', variantId = 'A>+stakes', botSpec = 'smart'] = process.argv.slice(2);

for (let seed = 1; seed <= 500; seed++) {
  const bot = botFor(botSpec);
  const rng = new Random(seed);
  let state: GameState = createGame(cardSetFor(setVersion), variantFor(variantId), seed).state;
  const recent: string[] = [];
  for (let moves = 0; state.phase.kind !== 'over'; moves++) {
    const move = bot.chooseMove(state, rng);
    recent.push(`turn ${state.turn} ${state.phase.kind} hand=${state.hand.length} draw=${state.drawPile.length} discard=${state.discard.length} ${JSON.stringify(move)}`);
    if (recent.length > 12) recent.shift();
    state = applyMove(state, move).state;
    if (moves > MOVE_CAP) {
      console.log(`seed ${seed} ran away:\n${recent.join('\n')}`);
      console.log('inventory', state.inventory, 'phase', JSON.stringify(state.phase));
      process.exit(0);
    }
  }
}
console.log('no runaway game');
