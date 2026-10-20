import type { ActionId, PersonaId } from "@ai-monopoly/data";

/**
 * Events are the engine's output channel. The UI renders them, the chat layer
 * narrates them, and tests assert on them. They are plain data.
 */
export type GameEvent =
  | { type: "turnStarted"; turn: number }
  | { type: "eventDrawn"; eventId: string; name: string }
  | { type: "actionResolved"; actionId: ActionId; success: boolean; roll: number; chance: number }
  | { type: "actionRejected"; actionId: ActionId; reason: string }
  | { type: "cashChanged"; delta: number; total: number }
  | { type: "heatChanged"; delta: number; total: number }
  | { type: "reputationChanged"; delta: number; total: number }
  | { type: "personaStatChanged"; persona: PersonaId; stat: string; delta: number; total: number }
  | { type: "personaMoodChanged"; persona: PersonaId; mood: string }
  | { type: "propertyFlagged"; propertyId: string }
  | { type: "violationRevealed"; propertyId: string }
  | { type: "auditTriggered"; persona: PersonaId; propertyId: string; fine: number }
  | { type: "rentCollected"; propertyId: string; amount: number }
  | { type: "gameWon"; netWorth: number }
  | { type: "gameLost"; reason: "bankrupt" | "arrested" };
