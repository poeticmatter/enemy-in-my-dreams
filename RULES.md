# Enemy in My Dreams: rules as simulated

Your draft rules, plus the gaps I had to fill. Every filled gap is marked **[default]**,
and every rule I am *proposing* (not in your draft) is marked **[proposed]**. The
playable build uses variant `C>+stakes` (flip-only turn) with card set v7.

## Your draft, as implemented

- 24 cards. Each has an attack modifier, an enemy (Attack / Defense) and loot.
- Hand of 3. Turn A: pick an encounter and an attack card; the attack card goes to discard and adds its
  modifier; keep the third card; draw 2. Turn B: pick an encounter; the other two add their modifiers and
  stay in hand; draw 1.
- Flip any number of cards off the draw pile, adding modifiers; flipped cards go to discard.
- Win if total attack > Defense (variant: ≥). The encounter goes to your inventory.
- Lose: take damage equal to the enemy's Attack (discard that many from the top of the draw pile),
  then the encounter goes to discard.
- Reshuffle when you need a card and the draw pile is empty: the cards in hand leave the game,
  then the discard pile is shuffled into a new draw pile.
- Persistent cards can't leave the game: if one is in hand at a reshuffle, you fight it right then.
- Automiss: flipping it fails the attack.
- Single-use items return to the discard pile after use.
- Beat the Boss to win.

## Defaults I picked where the draft was silent

| Gap | Default | Why | Tested the alternative? |
|---|---|---|---|
| Can you flip from an empty draw pile? | **[default]** No. Flipping never triggers a reshuffle. | Keeps the reshuffle (and its hand loss) tied to drawing and damage. | No: rare, and it only matters at a tiny deck. |
| Forced fight (persistent card in hand at a reshuffle): what do you attack with? | **[default]** Nothing: attack 0 + permanent loot + items + flips. | The hand is leaving the game, so it can't help. Makes holding the boss into a reshuffle a real risk. | No. |
| Damage order | **[default]** Take damage first, then the encounter goes to discard. | Your step order; also stops the enemy being dealt as its own damage. | No. |
| Can you lose? | **[default]** **One reshuffle per turn.** If you need a second one in the same turn, you lose. | Taken literally, the draft almost never ends: damage only moves cards to the discard, which a reshuffle brings straight back. Sims: the literal rule stalls or loops forever. | Yes: `A>literal`. See REPORT.md. |
| A game that loops forever | Turn limit 200 = loss ("stalled"). | A safety net for the literal rule. With the default it never triggers in v6. | n/a |
| Win threshold | `>` | Your core rules. `≥` is the same as −1 Defense on every card. | Yes, `A>=`. |
| When are items used? | Any time during the fight, before you resolve. | You see your total before deciding. | n/a |
| Shields | **[default]** Block 3 damage. | v1–v2 shields cancelled a whole hit; with a tiny deck that loops forever (fight the boss, block, re-win the shield, repeat). | Yes (v1–v2). |
| What happens to a persistent card that would leave the game through Stakes or Devour? | **[default]** It goes to discard instead. | Simplest reading of "can never be removed". | No. |

## Proposed rules (not in your draft)

- **[proposed] Stakes.** When you lose a fight, the cards you flipped in it leave the game. When you win, they go
  to discard as usual. Without this, a flip can never hurt you: you only flip when already losing, so busting costs
  nothing that stopping wouldn't. With it, every flip raises what you lose on a bust. Variant `…+stakes`.
- **[proposed] Devour** (keyword, on the boss in v5–v6). This enemy's damage removes cards from the game
  instead of discarding them. Without it a failed boss fight only cycles the deck, so trying the boss early and
  often is a cheap lottery and rushing dominates.

## Variants in the simulator

`A>` · `A>=` · `B>` · `B>=` are your draft. `C>` · `C>=` are the flip-only turn: fight one card, the others
stay in hand and add nothing, flip, draw 1. `…+stakes` adds Stakes. `…literal` uses unlimited reshuffles
(the draft read literally).
