import { useEffect, useRef, useState } from 'react';
import { MAIN_VARIANT_IDS, RECOMMENDED_VARIANT_ID, variantFor } from '../engine/rules.ts';
import { deckSize, type GameState } from '../engine/state.ts';
import { ChoosePanel } from './ChoosePanel.tsx';
import { DeckStrip, LootShelf } from './DeckStrip.tsx';
import { FightPanel } from './FightPanel.tsx';
import { RulesSheet } from './RulesSheet.tsx';
import { randomSeed, useGameSession, type Session } from './useGameSession.ts';

export function App() {
  const { session, play, newGame } = useGameSession();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const { state } = session;

  return (
    <div className="app">
      <header className="masthead">
        <h1 className="masthead__title">Enemy in My Dreams</h1>
        <Menu session={session} onNewGame={newGame} onOpenRules={() => setIsRulesOpen(true)} />
      </header>
      <div className="layout">
        <main className="layout__main">
          <DeckStrip state={state} />
          <LootShelf state={state} />
          {state.phase.kind === 'choose' && <ChoosePanel key={state.turn} state={state} onMove={play} />}
          {state.phase.kind === 'fight' && <FightPanel state={state} fight={state.phase.fight} onMove={play} />}
          {state.phase.kind === 'over' && <GameOver state={state} onPlayAgain={() => newGame(randomSeed(), session.variantId)} />}
        </main>
        <GameLog lines={session.log} />
      </div>
      {isRulesOpen && <RulesSheet rules={state.rules} onClose={() => setIsRulesOpen(false)} />}
    </div>
  );
}

function GameOver({ state, onPlayAgain }: { state: GameState; onPlayAgain: () => void }) {
  const isWon = state.phase.kind === 'over' && state.phase.outcome === 'won';
  return (
    <section className="table game-over">
      <h2 className="game-over__title">{isWon ? 'You wake up.' : 'The dream takes you.'}</h2>
      <p>
        {isWon
          ? `You defeated The Dreamer on turn ${state.turn} with ${deckSize(state)} cards of health left.`
          : `Your deck ran out on turn ${state.turn}.`}
      </p>
      <button type="button" className="button--primary" onClick={onPlayAgain}>
        Play again
      </button>
    </section>
  );
}

interface MenuProps {
  session: Session;
  onNewGame: (seed: number, variantId: string) => void;
  onOpenRules: () => void;
}

function Menu({ session, onNewGame, onOpenRules }: MenuProps) {
  const [variantId, setVariantId] = useState(session.variantId);
  const [seedText, setSeedText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(session.log.join('\n'));
      setCopyStatus('Log copied');
    } catch (error) {
      console.error('Copying the log failed', error);
      setCopyStatus('Copy failed. Select the log text and copy it by hand.');
    }
  }

  return (
    <nav className="menu" aria-label="Game menu">
      <button type="button" onClick={onOpenRules}>
        Rules
      </button>
      <button type="button" onClick={copyLog}>
        Copy log
      </button>
      <details className="menu__new">
        <summary>New game</summary>
        <div className="menu__panel">
          <label>
            Rules
            <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
              {MAIN_VARIANT_IDS.map((id) => (
                <option key={id} value={id}>
                  {id}
                  {id === RECOMMENDED_VARIANT_ID ? ' (recommended)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Game number
            <input
              placeholder="random"
              inputMode="numeric"
              value={seedText}
              onChange={(event) => setSeedText(event.target.value.replace(/\D/g, ''))}
            />
          </label>
          <button type="button" className="button--primary" onClick={() => onNewGame(seedText ? Number(seedText) : randomSeed(), variantFor(variantId).id)}>
            Start new game
          </button>
          <p className="menu__current">
            Playing game {session.seed} with rules {session.variantId}.
          </p>
        </div>
      </details>
      {copyStatus && (
        <span className="menu__status" role="status">
          {copyStatus}
        </span>
      )}
    </nav>
  );
}

function GameLog({ lines }: { lines: readonly string[] }) {
  const endRef = useRef<HTMLLIElement>(null);
  // A block body on purpose: newer browsers return a Promise from scrollIntoView, and an effect
  // that returns a non-function makes React crash when it tries to run it as a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [lines.length]);
  return (
    <aside className="log" aria-label="Game log">
      <h2 className="log__title">What happened</h2>
      <ol className="log__lines">
        {lines.map((line, index) => (
          <li key={index} className={line.startsWith('Turn ') ? 'log__turn' : undefined}>
            {line}
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ol>
    </aside>
  );
}
