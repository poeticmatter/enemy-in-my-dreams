import { useEffect, useRef, useState } from 'react';
import { MAIN_VARIANT_IDS, RECOMMENDED_VARIANT_ID, variantFor } from '../engine/rules.ts';
import { ChoosePanel } from './ChoosePanel.tsx';
import { FightPanel } from './FightPanel.tsx';
import { RulesSheet } from './RulesSheet.tsx';
import { StatusBar } from './StatusBar.tsx';
import { randomSeed, useGameSession, type Session } from './useGameSession.ts';

export function App() {
  const { session, play, newGame } = useGameSession();
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const { state } = session;

  return (
    <div className="app">
      <header className="header">
        <h1>Enemy in My Dreams</h1>
        <Menu session={session} onNewGame={newGame} onOpenRules={() => setIsRulesOpen(true)} />
      </header>
      <StatusBar state={state} />
      {state.phase.kind === 'choose' && <ChoosePanel key={state.turn} state={state} onMove={play} />}
      {state.phase.kind === 'fight' && <FightPanel state={state} fight={state.phase.fight} onMove={play} />}
      {state.phase.kind === 'over' && (
        <section className="panel panel--over">
          <h2>{state.phase.outcome === 'won' ? 'You wake up. Victory.' : 'The dream takes you.'}</h2>
          <button type="button" className="primary" onClick={() => newGame(randomSeed(), session.variantId)}>
            Play again
          </button>
        </section>
      )}
      <GameLog lines={session.log} />
      {isRulesOpen && <RulesSheet rules={state.rules} onClose={() => setIsRulesOpen(false)} />}
    </div>
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
      setCopyStatus('Copied');
    } catch (error) {
      console.error('Copying the log failed', error);
      setCopyStatus('Copy failed: select the log text instead');
    }
  }

  return (
    <div className="menu">
      <button type="button" onClick={onOpenRules}>
        Rules
      </button>
      <label>
        Rules variant{' '}
        <select value={variantId} onChange={(event) => setVariantId(event.target.value)}>
          {MAIN_VARIANT_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
              {id === RECOMMENDED_VARIANT_ID ? ' (recommended)' : ''}
            </option>
          ))}
        </select>
      </label>
      <input
        aria-label="Game number (optional)"
        placeholder="game #"
        inputMode="numeric"
        value={seedText}
        onChange={(event) => setSeedText(event.target.value.replace(/\D/g, ''))}
      />
      <button type="button" onClick={() => onNewGame(seedText ? Number(seedText) : randomSeed(), variantFor(variantId).id)}>
        New game
      </button>
      <button type="button" onClick={copyLog}>
        Copy log
      </button>
      {copyStatus && <span className="muted">{copyStatus}</span>}
    </div>
  );
}

function GameLog({ lines }: { lines: readonly string[] }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'nearest' }), [lines.length]);
  return (
    <section className="log" aria-label="Game log">
      {lines.map((line, index) => (
        <div key={index} className={line.startsWith('—') ? 'log__turn' : undefined}>
          {line}
        </div>
      ))}
      <div ref={endRef} />
    </section>
  );
}
