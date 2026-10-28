// Diagnostic: what a winning boss fight is made of, averaged over games.
// Usage: node scripts/probe-boss.ts <set> <variant> <bot>
import { botFor } from '../src/bots/roster.ts';
import { cardSetFor } from '../src/cardsets/index.ts';
import { applyMove, createGame } from '../src/engine/game.ts';
import { Random } from '../src/engine/rng.ts';
import { variantFor } from '../src/engine/rules.ts';
import { deckSize, permanentAttackBonus, type GameState } from '../src/engine/state.ts';

const GAMES = 300;
const [setVersion = 'v2', variantId = 'A>', botSpec = 'smart'] = process.argv.slice(2);
const totals = { cardAttack: 0, permanent: 0, items: 0, flips: 0, deckSize: 0, inventory: 0, removed: 0, reshuffles: 0, turn: 0 };
let wins = 0;

for (let seed = 1; seed <= GAMES; seed++) {
  const bot = botFor(botSpec);
  const rng = new Random(seed);
  let state: GameState = createGame(cardSetFor(setVersion), variantFor(variantId), seed).state;
  let reshuffles = 0;
  while (state.phase.kind !== 'over') {
    const before = state;
    const transition = applyMove(state, bot.chooseMove(state, rng));
    reshuffles += transition.events.filter((event) => event.kind === 'reshuffled').length;
    state = transition.state;
    const isBossWin = state.phase.kind === 'over' && state.phase.outcome === 'won';
    if (isBossWin && before.phase.kind === 'fight') {
      const { fight } = before.phase;
      totals.cardAttack += fight.cardAttack;
      totals.permanent += permanentAttackBonus(before);
      totals.items += fight.itemAttack;
      totals.flips += fight.flipTotal;
      totals.deckSize += deckSize(before);
      totals.inventory += before.inventory.length;
      totals.removed += before.removed.length;
      totals.reshuffles += reshuffles;
      totals.turn += before.turn;
      wins += 1;
    }
  }
}

const averages = Object.fromEntries(Object.entries(totals).map(([key, value]) => [key, Number((value / wins).toFixed(2))]));
console.log(`${setVersion} ${variantId} ${botSpec}: ${wins}/${GAMES} won`, averages);
