import type { GameState } from "@ai-monopoly/engine";
import { netWorth } from "@ai-monopoly/engine";

function pounds(pence: number): string {
  return `£${(pence / 100).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
}

export function Hud({ state }: { state: GameState }) {
  return (
    <div className="hud">
      <div className="hud__item">
        <span className="hud__label">Turn</span>
        <span className="hud__value">
          {state.turn} / 40
        </span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Cash</span>
        <span className="hud__value">{pounds(state.cash)}</span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Net worth</span>
        <span className="hud__value">{pounds(netWorth(state))}</span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Heat</span>
        <span className="hud__value">{state.heat}</span>
      </div>
      <div className="hud__item">
        <span className="hud__label">Reputation</span>
        <span className="hud__value">{state.reputation}</span>
      </div>
      <div className="hud__item">
        <span className="hud__label">AP</span>
        <span className="hud__value">{state.actionPoints}</span>
      </div>
    </div>
  );
}
