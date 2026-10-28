import { mkdirSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { MAIN_BOT_NAMES } from '../bots/roster.ts';
import { cardSetFor } from '../cardsets/index.ts';
import { MAIN_VARIANT_IDS } from '../engine/rules.ts';
import { cardUsage, summarize, type Summary } from './metrics.ts';
import { playSeeds } from './pool.ts';
import { bossAndFlipTable, cardUsageTable, outcomeTable } from './report.ts';

const SWEEPS: Record<string, string[]> = {
  boss: [0.05, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95].map((threshold) => `smart:bossThreshold=${threshold}`),
  chase: ['0', '0.5', '1', '2', '3', 'inf'].map((chase) => `smart:chase=${chase}`),
  bossChase: ['1', '2', '3', '5', '8', 'inf'].map((chase) => `smart:bossChase=${chase}`),
  // Only the deck size decides when it goes for the boss: how long is it worth holding?
  hold: [3, 5, 7, 9, 11, 13, 15, 18].map((deck) => `smart:bossThreshold=9,lastStand=${deck}`),
};

const { values: args } = parseArgs({
  options: {
    set: { type: 'string', default: 'v1' },
    games: { type: 'string', default: '2000' },
    variants: { type: 'string', default: MAIN_VARIANT_IDS.join(',') },
    bots: { type: 'string', default: MAIN_BOT_NAMES.join(',') },
    sweep: { type: 'string' },
    'cards-bot': { type: 'string', default: 'smart' },
    /** Skip the per-card table and the boss/flip table: for quick probes while iterating. */
    brief: { type: 'boolean', default: false },
  },
});

const setVersion = args.set as string;
const cardSet = cardSetFor(setVersion);
const seeds = Array.from({ length: Number(args.games) }, (_, index) => index + 1);
const variantIds = (args.variants as string).split(',');
const botSpecs = args.sweep ? sweepFor(args.sweep) : (args.bots as string).split(',');
const cardsBot = args['cards-bot'] as string;

function sweepFor(name: string): string[] {
  const specs = SWEEPS[name];
  if (!specs) throw new Error(`Unknown sweep "${name}". Known: ${Object.keys(SWEEPS).join(', ')}`);
  return specs;
}

console.log(`Card set ${setVersion} (${cardSet.cards.length} cards): ${cardSet.notes}`);
console.log(`${seeds.length} games per bot and variant\n`);

const saved: Record<string, Record<string, Summary>> = {};
for (const variantId of variantIds) {
  const rows: { label: string; summary: Summary }[] = [];
  let usageText = '';
  for (const botSpec of botSpecs) {
    const records = await playSeeds({ setVersion, variantId, botSpec }, seeds);
    rows.push({ label: botSpec, summary: summarize(records) });
    if (botSpec === cardsBot && !args.brief) usageText = cardUsageTable(cardSet, cardUsage(records));
  }
  saved[variantId] = Object.fromEntries(rows.map((row) => [row.label, row.summary]));
  console.log(`=== Variant ${variantId} ===`);
  console.log(outcomeTable(rows));
  if (args.brief) continue;
  console.log();
  console.log(bossAndFlipTable(rows));
  if (usageText) console.log(`\nHow ${cardsBot} used each card (share of the times it was in hand when choosing):\n${usageText}`);
  console.log();
}

mkdirSync('sims', { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const label = args.sweep ? `${setVersion}-sweep-${args.sweep}` : setVersion;
writeFileSync(`sims/${label}-${stamp}.json`, JSON.stringify({ setVersion, games: seeds.length, results: saved }, null, 2));
