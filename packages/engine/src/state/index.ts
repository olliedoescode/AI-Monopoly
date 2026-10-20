import type { Persona, Property, Registries } from "@ai-monopoly/data";

export const STARTING_CASH = 25_000_000; // £250,000 in pence
export const STARTING_HEAT = 20;
export const STARTING_REPUTATION = 0;
export const STARTING_AP = 3;
export const WIN_NET_WORTH = 200_000_000; // £2,000,000 in pence
export const MAX_TURNS = 40;
export const HEAT_TICK_DROP = 2;
export const AUDIT_SUSPICION_THRESHOLD = 70;
export const AUDIT_HEAT_THRESHOLD = 50;
export const AUDIT_FINE = 2_000_000; // £20,000
export const AUDIT_REPUTATION_LOSS = 10;

export interface GameState {
  readonly seed: number;
  readonly turn: number;
  readonly actionPoints: number;
  readonly cash: number;
  readonly heat: number;
  readonly reputation: number;
  /** Consecutive turns Heat has been at 100. Two means arrest. */
  readonly heatAtMaxTurns: number;
  readonly properties: readonly Property[];
  readonly personas: readonly Persona[];
  readonly ownedPropertyIds: readonly string[];
  readonly status: "playing" | "won" | "lost";
  readonly lostReason: "bankrupt" | "arrested" | null;
}

export interface InitialStateOptions {
  seed: number;
  registries: Registries;
  /** Property ids the player starts with. Defaults to the two from the rulebook. */
  startingPropertyIds?: readonly string[];
}

const DEFAULT_STARTING_PROPERTIES = ["prop-retro-house", "prop-slum-flat"] as const;

export function createInitialState(options: InitialStateOptions): GameState {
  const { seed, registries } = options;
  const startingIds = options.startingPropertyIds ?? DEFAULT_STARTING_PROPERTIES;

  const known = new Set(registries.properties.map((p) => p.id));
  for (const id of startingIds) {
    if (!known.has(id)) {
      throw new Error(`Starting property "${id}" is not in the property registry`);
    }
  }

  return {
    seed,
    turn: 1,
    actionPoints: STARTING_AP,
    cash: STARTING_CASH,
    heat: STARTING_HEAT,
    reputation: STARTING_REPUTATION,
    heatAtMaxTurns: 0,
    properties: registries.properties,
    personas: registries.personas,
    ownedPropertyIds: [...startingIds],
    status: "playing",
    lostReason: null,
  };
}

/** Net worth = cash + owned property values - debts. Debts arrive in stage 5. */
export function netWorth(state: GameState): number {
  const owned = state.properties.filter((p) => state.ownedPropertyIds.includes(p.id));
  const propertyValue = owned.reduce((sum, p) => sum + p.baseValue, 0);
  return state.cash + propertyValue;
}

export function getPersona(state: GameState, id: string): Persona {
  const persona = state.personas.find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown persona "${id}"`);
  return persona;
}

export function getProperty(state: GameState, id: string): Property {
  const property = state.properties.find((p) => p.id === id);
  if (!property) throw new Error(`Unknown property "${id}"`);
  return property;
}
