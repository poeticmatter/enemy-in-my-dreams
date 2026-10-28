import { armor, cardOf, deckSize, permanentAttackBonus, usableItems, type GameState } from '../engine/state.ts';

export function StatusBar({ state }: { state: GameState }) {
  const automissInDraw = state.drawPile.filter((id) => cardOf(state, id).isAutomiss).length;
  const items = usableItems(state);
  return (
    <section className="status">
      <Stat label="Deck (health)" value={deckSize(state)} />
      <Stat label="Draw pile" value={state.drawPile.length} detail={`${automissInDraw} automiss`} />
      <Stat label="Discard" value={state.discard.length} />
      <Stat label="Gone" value={state.removed.length} />
      <Stat label="Permanent attack" value={`+${permanentAttackBonus(state)}`} detail={armor(state) > 0 ? `armor ${armor(state)}` : undefined} />
      <Stat label="Items" value={items.length} />
      <Stat label="Turn" value={state.turn} />
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: number | string; detail?: string }) {
  return (
    <div className="stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
      {detail && <div className="stat__detail">{detail}</div>}
    </div>
  );
}
