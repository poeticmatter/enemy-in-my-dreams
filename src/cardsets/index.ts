import type { CardSet } from '../engine/cards.ts';
import { bossProbes } from './probes.ts';
import { SET_V1 } from './v1.ts';
import { SET_V2 } from './v2.ts';
import { SET_V3 } from './v3.ts';
import { SET_V4 } from './v4.ts';
import { SET_V5 } from './v5.ts';
import { SET_V6 } from './v6.ts';
import { SET_V7 } from './v7.ts';

export const CARD_SETS: Record<string, CardSet> = {
  v1: SET_V1,
  v2: SET_V2,
  v3: SET_V3,
  v4: SET_V4,
  v5: SET_V5,
  v6: SET_V6,
  v7: SET_V7,
  ...Object.fromEntries([SET_V2, SET_V3, SET_V4, SET_V5, SET_V6, SET_V7].flatMap(bossProbes).map((probe) => [probe.version, probe])),
};

/** The set the playable UI uses. */
export const CURRENT_SET: CardSet = SET_V7;

export function cardSetFor(version: string): CardSet {
  const found = CARD_SETS[version];
  if (!found) throw new Error(`Unknown card set "${version}". Known: ${Object.keys(CARD_SETS).join(', ')}`);
  return found;
}
