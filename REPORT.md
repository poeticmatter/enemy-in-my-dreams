# Enemy in My Dreams: balance report

Card set **v6** (24 cards), recommended rules **Turn A, attack > Defense, plus two proposed rules (Stakes, Devour)**.
Details and every number's source: [DESIGN_JOURNAL.md](DESIGN_JOURNAL.md). Rules and defaults: [RULES.md](RULES.md).

## Bottom line

| v6, A>+stakes | naive | greedy | cautious | boss-rusher | hoarder | smart |
|---|---|---|---|---|---|---|
| win rate (2000 games each) | 3 % | 24 % | 24 % | 21 % | 14 % | **35 %** |

On the recommended rules all five goals hold in the sims. They don't hold under the draft rules alone,
for three reasons I think are structural, not numbers to tune.

## What's fundamentally off in the draft

1. **You can't lose.** Damage moves cards from the draw pile to the discard, and the reshuffle brings them
   straight back. So "both piles empty" almost never happens: 51–97 % of games under the literal rule hit the
   200-turn limit. My default is **one reshuffle per turn; needing a second one means you lose.**
   It only bites when the deck is truly thin.
2. **A failed flip costs nothing.** You only flip when you're already losing, so busting on an automiss
   is no worse than stopping. Result: "always flip" is the best policy (58 % vs 49 % for a measured flipper).
   **Proposed: Stakes.** If you lose a fight, the cards you flipped in it leave the game. Then the best policy
   is in the middle (flip up to ~3 average cards short: 35 %; always flip: 30 %; never: 13 %).
3. **A failed boss fight costs nothing either.** Its damage just cycles the deck, so trying the boss early and
   often is a cheap lottery: the rusher won 71 % in v3. **Proposed: Devour** on the boss. Its damage removes
   cards instead of discarding them. Now going for the boss at deck ~11 is best (30 %), and both rushing at 18
   (19 %) and holding to 3 (14 %) lose.

Devour alone (draft rules otherwise) already fixes boss timing. Stakes is only needed for flipping.

## What works (v6, A>+stakes)

- **Skill matters:** Smart 35 % vs Naive 3 %, and every personality in between.
- **Losses come late:** Smart's lost games last ~34 turns vs ~24 for wins, and only 2 % end early.
  Early damage barely matters: games with the most damage in turns 1–5 win only 10 points less than those with the least.
- **The deck erodes the way you described:** 24 → 21 → 17 → 13 → 8 cards across a game.
- **Most cards have more than one live role.** The boss is fought 13 % of the time, dumped as an attack card
  57 % and held 31 %.

## What's still weak

- **Turn B** is too easy and too swingy (every bot except Naive wins 46–77 %). Early damage hurts there: a reshuffle removes the
  two cards you kept, which are your best attack cards. I'd drop it, or it needs its own card set.
- **`≥` (match wins)** is just −1 Defense on every card; with v6 it makes Naive win 44 %. Choose by feel; the
  numbers can be tuned for either.
- **Fodder and "attack" cards still lean one way:** Moth is fought 86 %; Lamplighter and Hollow Choir only
  12–13 %. Fine for a first playtest, worth watching.
- **The boss fight's flips are nearly all-in** even with Stakes. A climax, not a decision. You may want that.
- **Automiss cards** are used as attack cards about half the time. I haven't tested them without Persistent.

## Decisions for you

1. **Losing:** accept "one reshuffle per turn, a second one loses", or tell me the loss you intended.
2. **Stakes:** keep it, or find another reason a bust should hurt (e.g. an automiss also hits you).
3. **Devour on the boss:** keep it, or another way to make a failed boss try cost real health.
4. **Turn A vs B:** I recommend A.
5. **Shields:** v1's "cancel a hit" shields allow an infinite loop with a tiny deck. Mine block 3. OK?

## Play it

Open `dist/index.html` (one file, no server; rebuild with `npm run build`). It starts on `A>+stakes`; the variant is
in the menu. **Copy log** puts the full game log on your clipboard for the debrief.
