import type { TownEvent } from "@ai-monopoly/data";
import type { GameEvent } from "../events/index.js";
import type { Rng } from "../rng/index.js";
import {
  HEAT_TICK_DROP,
  MAX_TURNS,
  STARTING_AP,
  WIN_NET_WORTH,
  netWorth,
  type GameState,
} from "./index.js";

export interface TurnResult {
  state: GameState;
  events: GameEvent[];
}

function drawEvent(events: readonly TownEvent[], rng: Rng): TownEvent | undefined {
  if (events.length === 0) return undefined;
  const totalWeight = events.reduce((sum, e) => sum + e.weight, 0);
  let pick = rng.next() * totalWeight;
  for (const event of events) {
    pick -= event.weight;
    if (pick <= 0) return event;
  }
  return events[events.length - 1];
}

/**
 * Ends the current turn and advances to the next one. Runs the town tick:
 * rent in, Heat down, win and lose checks. Rival turns and loan payments
 * arrive in stage 5.
 */
export function endTurn(
  state: GameState,
  events: readonly TownEvent[],
  rng: Rng,
): TurnResult {
  const emitted: GameEvent[] = [];
  let next = state;

  // Town tick: rent from owned, occupied properties.
  for (const property of next.properties) {
    if (!next.ownedPropertyIds.includes(property.id)) continue;
    if (property.tenancy === "vacant" || property.flags.underRenovation) continue;
    if (property.rentPerTurn <= 0) continue;
    next = { ...next, cash: next.cash + property.rentPerTurn };
    emitted.push({
      type: "rentCollected",
      propertyId: property.id,
      amount: property.rentPerTurn,
    });
  }

  // Heat decays.
  const heat = Math.max(0, next.heat - HEAT_TICK_DROP);
  if (heat !== next.heat) {
    emitted.push({ type: "heatChanged", delta: heat - next.heat, total: heat });
  }
  const heatAtMaxTurns = heat >= 100 ? next.heatAtMaxTurns + 1 : 0;
  next = { ...next, heat, heatAtMaxTurns };

  // Lose: arrested after two consecutive turns at max Heat.
  if (heatAtMaxTurns >= 2) {
    emitted.push({ type: "gameLost", reason: "arrested" });
    return { state: { ...next, status: "lost", lostReason: "arrested" }, events: emitted };
  }

  // Lose: bankrupt.
  if (next.cash < 0) {
    emitted.push({ type: "gameLost", reason: "bankrupt" });
    return { state: { ...next, status: "lost", lostReason: "bankrupt" }, events: emitted };
  }

  // Win: net worth target reached.
  const worth = netWorth(next);
  if (worth >= WIN_NET_WORTH) {
    emitted.push({ type: "gameWon", netWorth: worth });
    return { state: { ...next, status: "won" }, events: emitted };
  }

  // Advance the turn.
  const turn = next.turn + 1;
  if (turn > MAX_TURNS) {
    // Out of turns without hitting the target is a loss by default.
    emitted.push({ type: "gameLost", reason: "bankrupt" });
    return { state: { ...next, status: "lost", lostReason: "bankrupt" }, events: emitted };
  }

  emitted.push({ type: "turnStarted", turn });
  const drawn = drawEvent(events, rng);
  if (drawn) {
    emitted.push({ type: "eventDrawn", eventId: drawn.id, name: drawn.name });
  }

  next = { ...next, turn, actionPoints: STARTING_AP };
  return { state: next, events: emitted };
}
