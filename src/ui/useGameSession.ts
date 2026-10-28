import { useCallback, useState } from 'react';
import { CURRENT_SET } from '../cardsets/index.ts';
import { applyMove, createGame } from '../engine/game.ts';
import { PLAYABLE_VARIANT_IDS, RECOMMENDED_VARIANT_ID, variantFor } from '../engine/rules.ts';
import type { GameEvent, GameState, Move } from '../engine/state.ts';
import { describeEvent } from './describeEvent.ts';

export interface Session {
  seed: number;
  variantId: string;
  state: GameState;
  log: string[];
}

const STORAGE_KEY = 'enemy-in-my-dreams/session';

function describeAll(state: GameState, events: readonly GameEvent[]): string[] {
  return events.map((event) => describeEvent(state, event)).filter((line): line is string => line !== null);
}

function startSession(seed: number, variantId: string): Session {
  const { state, events } = createGame(CURRENT_SET, variantFor(variantId), seed);
  return { seed, variantId, state, log: [`Game ${seed} · rules ${variantId} · set ${CURRENT_SET.version}`, ...describeAll(state, events)] };
}

function loadSession(): Session | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved) as Session; // written by saveSession below
    // A save from an older card set or a retired turn style would mix rules; start fresh instead.
    const isCurrent = session.log[0]?.endsWith(`set ${CURRENT_SET.version}`) && PLAYABLE_VARIANT_IDS.includes(session.variantId);
    return isCurrent ? session : null;
  } catch (error) {
    console.warn('Could not restore the saved game; starting a new one.', error);
    return null;
  }
}

function saveSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn('Could not save the game; it will not survive a reload.', error);
  }
}

export const randomSeed = () => Math.floor(Math.random() * 1_000_000);

export function useGameSession() {
  const [session, setSession] = useState<Session>(() => loadSession() ?? startSession(randomSeed(), RECOMMENDED_VARIANT_ID));

  const play = useCallback((move: Move) => {
    setSession((current) => {
      const { state, events } = applyMove(current.state, move);
      const next = { ...current, state, log: [...current.log, ...describeAll(state, events)] };
      saveSession(next);
      return next;
    });
  }, []);

  const newGame = useCallback((seed: number, variantId: string) => {
    const next = startSession(seed, variantId);
    saveSession(next);
    setSession(next);
  }, []);

  return { session, play, newGame };
}
