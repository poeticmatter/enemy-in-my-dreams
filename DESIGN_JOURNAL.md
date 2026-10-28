# Design journal

Solo card game, "deck is your health". Sims by heuristic bots only (no search, no MCTS).
Numbers are win rates over seeded games; unless noted, 2000 games per bot and variant.
Rules defaults and proposals are listed in [RULES.md](RULES.md); the short version is in [REPORT.md](REPORT.md).

## How to run

```
npm run sim -- --set v6                      # every variant, every bot, full tables
npm run sim -- --set v6 --variants 'A>+stakes' --sweep hold    # boss timing sweep
npm run sim -- --set v6 --brief --variants 'A>' --bots naive,smart
npm test
npm run build                                # dist/index.html, the playable single file
```

Sweeps: `boss` (Smart's odds bar for the boss), `hold` (Smart goes for the boss only below a deck size),
`chase` (how far Smart flips in ordinary fights), `bossChase` (the same against the boss).
Logs of the runs quoted here are in `sims/`.

## Bots

All of them pick a turn from simple rules over the visible state. They may "card count": they know
which cards are in the draw pile, never the order. Odds are a gut feel (40 imagined orders of the
draw pile), not search.

| Bot | What it thinks |
|---|---|
| naive | Fight the lowest Defense, attack with the highest modifier, never flip, never choose the boss. |
| greedy | Best loot it can probably beat (≥ 50 %); flip when ≤ 2 short. |
| cautious | Safest fight; flip only to cover 1 point when automiss cards are scarce; boss only at ≥ 80 %. |
| boss-rusher | Boss the moment the odds are ≥ 25 %, flipping all in; otherwise greedy for permanent attack. |
| hoarder | Saves every item for the boss and holds the boss in hand until ≥ 90 % or the deck is ≤ 8. |
| smart | Loot vs damage (damage counts more as the deck shrinks); keeps good attack cards; gets persistent cards out of hand before a reshuffle; flips up to 3 average flips short; boss when its odds clear 60 % (30 % while a failed try is survivable), and always at deck ≤ 5. |

## Iterations

### v1: first draft (and two rule holes)
24 cards: 7 weak, 7 mid, 6 strong, 3 automiss (persistent), 1 boss (6/13). Lots of permanent attack (16 total) and armor (5).

| bot (A>) | naive | greedy | boss-rusher | hoarder | smart |
|---|---|---|---|---|---|
| v1 | 67 % | 100 % | 98 % | 95 % | 98 % |

- **Rule hole 1: you can't lose.** Damage moves cards from the draw pile to the discard; when the pile runs
  out, the reshuffle brings them straight back. "Both piles empty" basically never happens. Default added:
  one reshuffle per turn; needing a second means you lose. Under the literal rule, 51–97 % of v6 games stall
  (`sims/v6-literal-reshuffle.log`).
- **Armor stacks to immunity.** Armor 5 means most enemies deal 0.
- **Permanent attack snowballs.** By the boss fight Smart had about +12 permanent; nothing threatens you after ~5 wins.

### v2: less armor, harder boss (7/16)
Barely moved: Smart 97 %. Even boss Defense 24 left Smart at 85 % (under an earlier one-reshuffle-per-hit rule), and the losses were mostly *stalls*.

- **Rule hole 2: shield loop.** With only the boss and a shield left, you fight the boss, the shield
  cancels the hit and goes back into the deck, you re-win it, repeat forever. Shields now block 3.

### v3: items instead of permanent attack (16 → 5), boss 8/18
First set with texture: Naive 1 %, Greedy 48 %, Smart 42 %. But **boss-rusher 63 %**.
- Rushing wins because a failed boss fight only *cycles* cards. Early on, a big draw pile absorbs it, so
  repeated early tries are a cheap lottery. Raising boss Attack to 16 didn't stop it.
- **Flipping isn't push-your-luck.** Smart's chase sweep was monotonic: always flip was best. You only ever
  flip when already losing, so a bust costs nothing that stopping wouldn't, apart from a slightly faster
  deck cycle.
- Smart also had a loop: with only Pursuer, two shields and the boss left, it refused a hopeless boss
  fight forever. Added a last stand (deck ≤ 5 → swing at the boss).

**Proposed rule: Stakes.** Cards flipped in a lost fight leave the game. On v3 (boss 12/18):

| A>, v3 boss 12/18 | chase 0 | 1 | 2 | 3 | always |
|---|---|---|---|---|---|
| draft rules | 12 % | 23 % | 35 % | 39 % | **48 %** |
| + stakes | 11 % | 19 % | 30 % | **34 %** | 27 % |

With Stakes the best flipping policy is in the middle. Rusher fell from 71 % to 31 %.

### v4: give high-modifier cards loot worth fighting
Lamplighter (+5) was fought 9 % of the time and Bell Tower 13 %: their attack role crowded out the enemy role.
Better loot on them, permanent attack 5 → 7, boss modifier 0 → −2 (dumping the boss as an attack card now costs).
Under Stakes, **Greedy beat Smart** (42 % vs 34 %): it took about 3 cheap boss tries a game, flipping
little, so it lost few cards to Stakes. A failed boss fight still cost only cycling.

### v5: the boss Devours
**Proposed keyword: Devour.** The enemy's damage removes cards from the game instead of discarding them.
On the boss, a failed try now costs real health. Boss Attack sweep (Defense 17, A>+stakes):

| boss Attack | naive | greedy | rusher | smart |
|---|---|---|---|---|
| 3 | 11 % | 35 % | 27 % | 40 % |
| 4 | 6 % | 27 % | 23 % | 40 % |
| 5 | 1 % | 18 % | 20 % | 36 % |
| 6 | 0 % | 12 % | 16 % | 36 % |

Smart is now clearly best, and rushing is a gamble (13–19 % of rusher games end early).

- **Rule hole 3: a deck of only persistent cards loops inside one turn.** Devour ate every
  non-persistent card; each draw forced a reshuffle and a forced fight, forever. That's why the
  reshuffle limit is per turn, not per hit.

### v6: the playtest candidate (boss 4/17 Devour, three card fixes)
Lamplighter 3/5 → permanent +1; Bell Tower 4/6 item +4; Pale Hand harder (3/4) so it isn't free permanent attack.

| v6 | naive | greedy | cautious | rusher | hoarder | smart |
|---|---|---|---|---|---|---|
| A>+stakes | 3 % | 24 % | 24 % | 21 % | 14 % | **35 %** |
| A> | 3 % | 34 % | 27 % | 42 % | 24 % | **49 %** |
| A>=+stakes | 44 % | 72 % | 85 % | 52 % | 40 % | 74 % |
| B>+stakes | 15 % | 60 % | 53 % | 49 % | 46 % | 68 % |
| B> | 15 % | 66 % | 54 % | 65 % | 55 % | 77 % |

Set-by-set on the same bots and rules: `sims/progression.log`.

### v7: the flip-only turn (Turn C)
Rule change from the designer: no attack card. Pick a card to fight; the others stay in hand; flip; draw 1.
v6 under Turn C: Smart 3 %. Bots' flip thresholds were absolute points ("flip when ≤ 2 short"), which never
fires when every fight starts from zero; they are now in average flips ("about two cards short").

v7: attack values up (mean about +1.8 over the non-automiss cards), defenses 2–3 / 4–5 / 6–8 / 9–10, automiss value 0, boss 4/16 Devour.
C>+stakes: Naive 0 %, Greedy 2 %, Cautious 0 %, Rusher 18 %, Hoarder 12 %, Smart 31 % (`sims/v7-turn-c.log`).
Smart chase sweep (boss 4/16): 0 → 25 %, 3 → 31 %, 5 → **35 %**, 8 → 32 %, always → 31 %.
Open problem: wins come early (turn ~11) and mostly from forced boss fights. A probe with 5 automiss cards
dropped Smart to 17 % without fixing the timing.

## v6 against the design goals (A>+stakes)

**Win rate and skill.** Smart 35 %, Naive 3 %. The middle bots sit at 14–24 %, so judgement pays.

**Losses come late.** Smart's lost games last 34.5 turns, against 24.4 for its wins; 2 % are early
eliminations (before 60 % of a typical win). Deck size over a game: 24 → 21 → 17 → 13 → 8. Smart's
win rate barely depends on early damage: games with the most damage in turns 1–5 win 10 points less
than games with the least. The risky bots get knocked out early (rusher 20 %), which is the price of
their play, not the game punishing a decent player.

**Holding the boss is a real choice.** Smart going for the boss only below a fixed deck size:

| commit at deck ≤ | 3 | 5 | 7 | 9 | 11 | 13 | 15 | 18 |
|---|---|---|---|---|---|---|---|---|
| A>+stakes | 14 % | 19 % | 24 % | 27 % | **30 %** | 27 % | 24 % | 19 % |
| A> (no stakes) | 20 % | 27 % | 34 % | 41 % | **46 %** | 45 % | 41 % | 34 % |

Both extremes lose. Smart's odds-aware rule (35 %) beats every fixed deck size.

**Flipping is push-your-luck, but only with Stakes.**

| chase | 0 | 0.5 | 1 | 2 | 3 | always |
|---|---|---|---|---|---|---|
| A>+stakes | 13 % | 15 % | 20 % | 30 % | **35 %** | 30 % |
| A> | 14 % | 16 % | 25 % | 39 % | 49 % | **58 %** |

Against the boss, deep flipping is still best with Stakes: bossChase 1 → 23 %, 3 → 33 %, 5 → 37 %, always → 35 %.
Once you commit to the boss you nearly go to the end. I think that's acceptable as a climax.

**Every card in every role** (Smart, share of the times the card was in hand when choosing):
- Fodder is mostly fought: Moth 86 %, Murmur 77 %. Still used as attack 9 % of the time.
- High modifiers are mostly attack or kept: Lamplighter fought 13 %, Hollow Choir 12 %. That's up from
  9 %; still the weakest "fight" role.
- Automiss cards are fought 12–19 % and used as attack about 50 %. Their modifiers make them decent
  attack cards to cycle away.
- The boss: fought 13 %, dumped as an attack card 57 %, held 31 %. All three roles are live.

**Known weak spots**
- Turn B is too easy and too swingy: every bot wins 46–77 %, and early damage matters (gap +37 to +46),
  because a reshuffle removes the two cards you kept, which are your best attack cards.
- `≥` is just −1 Defense on every card. With this set it's far too easy, and Naive wins 44 %.
- The loot-value numbers and thresholds in the bots are my guesses. Smart is "decent", not optimal:
  under the draft rules (no Stakes) it should flip always and would win nearer 58 %.
