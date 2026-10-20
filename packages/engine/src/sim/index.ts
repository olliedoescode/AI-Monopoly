import type { Action, Registries } from "@ai-monopoly/data";
import type { GameEvent } from "../events/index.js";
import { resolve, type ActionRequest } from "../resolver/index.js";
import { createRng, type Rng } from "../rng/index.js";
import { createInitialState, type GameState } from "../state/index.js";
import { endTurn } from "../state/turn.js";

export interface SimOptions {
  seed: number;
  registries: Registries;
  turns: number;
  /** Picks the next action given the current state. Return null to end the turn. */
  policy?: (state: GameState, actions: readonly Action[]) => ActionRequest | null;
}

export interface SimResult {
  state: GameState;
  events: GameEvent[];
  turnsPlayed: number;
}

/**
 * A deliberately cautious default policy: take at most one action per turn,
 * and only one that does not drain cash. This exists to exercise the resolver
 * and the turn loop, not to play well. Balance work in stage 6 replaces it.
 */
function defaultPolicy(state: GameState, actions: readonly Action[]): ActionRequest | null {
  if (state.actionPoints <= 0) return null;
  // Only act on the first AP of the turn, so we do not burn the whole budget.
  if (state.actionPoints < 3) return null;

  const cashCost = (a: Action): number =>
    a.costs
      .filter((e) => e.kind === "cash")
      .reduce((sum, e) => sum + (e.kind === "cash" ? e.amount : 0), 0);

  // Prefer free actions, then cheap ones we can comfortably afford.
  const candidates = actions
    .filter((a) => a.apCost <= state.actionPoints)
    .filter((a) => cashCost(a) >= 0 || state.cash + cashCost(a) > 5_000_000)
    .sort((a, b) => cashCost(b) - cashCost(a));

  const pick = candidates[0];
  return pick ? { actionId: pick.id } : null;
}

/**
 * Runs a headless game. No rendering, no DOM, no LLM. This is what the balance
 * simulations use from stage 2 onwards.
 */
export function runSimulation(options: SimOptions): SimResult {
  const { seed, registries, turns } = options;
  const policy = options.policy ?? defaultPolicy;
  const rng: Rng = createRng(seed);

  let state = createInitialState({ seed, registries });
  const events: GameEvent[] = [];
  let turnsPlayed = 0;

  while (state.status === "playing" && turnsPlayed < turns) {
    // Player phase: keep taking actions until the policy says stop.
    let guard = 0;
    while (state.status === "playing" && guard++ < 10) {
      const request = policy(state, registries.actions);
      if (!request) break;
      const action = registries.actions.find((a) => a.id === request.actionId);
      if (!action) break;
      const result = resolve(state, action, request, rng);
      state = result.state;
      events.push(...result.events);
    }

    if (state.status !== "playing") break;

    const tick = endTurn(state, registries.events, rng);
    state = tick.state;
    events.push(...tick.events);
    turnsPlayed++;
  }

  return { state, events, turnsPlayed };
}
