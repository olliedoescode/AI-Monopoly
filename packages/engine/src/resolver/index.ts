import type { Action, Effect, Persona, Property } from "@ai-monopoly/data";
import type { GameEvent } from "../events/index.js";
import type { Rng } from "../rng/index.js";
import {
  AUDIT_FINE,
  AUDIT_HEAT_THRESHOLD,
  AUDIT_REPUTATION_LOSS,
  AUDIT_SUSPICION_THRESHOLD,
  type GameState,
} from "../state/index.js";
import { compileFormula, type CompiledFormula, type FormulaContext } from "./expression.js";

export interface ActionRequest {
  actionId: string;
  /** Optional bribe or offer amount, in pence. */
  offer?: number;
  /** Optional target property, for tip offs and property actions. */
  targetPropertyId?: string;
  /** Optional card id played before resolution. */
  cardId?: string;
}

export interface Resolution {
  state: GameState;
  events: GameEvent[];
}

export interface PreconditionResult {
  ok: boolean;
  reason?: string;
}

const formulaCache = new Map<string, CompiledFormula>();

function getFormula(source: string): CompiledFormula {
  let compiled = formulaCache.get(source);
  if (!compiled) {
    compiled = compileFormula(source);
    formulaCache.set(source, compiled);
  }
  return compiled;
}

/** Validates every action formula at load time. Throws on a typo. */
export function validateActionFormulas(actions: readonly Action[]): void {
  for (const action of actions) {
    getFormula(action.successFormula);
  }
}

export function checkPreconditions(
  state: GameState,
  action: Action,
  request: ActionRequest,
): PreconditionResult {
  if (state.status !== "playing") {
    return { ok: false, reason: "The game is over" };
  }
  if (state.actionPoints < action.apCost) {
    return { ok: false, reason: `Needs ${action.apCost} AP, ${state.actionPoints} left` };
  }
  const cashCost = action.costs
    .filter((e): e is Extract<Effect, { kind: "cash" }> => e.kind === "cash")
    .reduce((sum, e) => sum + e.amount, 0);
  if (cashCost < 0 && state.cash + cashCost < 0) {
    return { ok: false, reason: "Not enough cash" };
  }
  if (request.offer !== undefined && request.offer < 0) {
    return { ok: false, reason: "Offer cannot be negative" };
  }
  return { ok: true };
}

function buildContext(
  state: GameState,
  action: Action,
  request: ActionRequest,
): FormulaContext {
  const persona = state.personas.find((p) => p.id === action.persona);
  if (!persona) throw new Error(`Action "${action.id}" targets unknown persona "${action.persona}"`);

  const target = request.targetPropertyId
    ? state.properties.find((p) => p.id === request.targetPropertyId)
    : undefined;

  return {
    base: 0,
    trust: persona.trust,
    suspicion: persona.suspicion,
    greed: persona.greed,
    greedPrice: persona.greedPrice,
    offer: request.offer ?? 0,
    heat: state.heat,
    reputation: state.reputation,
    turn: state.turn,
    cash: state.cash,
    condition: target?.condition ?? 0,
    value: target?.baseValue ?? 0,
  };
}

function clampStat(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function moodFor(persona: Persona): Persona["mood"] {
  if (persona.greed > 90) return "corrupt";
  if (persona.suspicion >= 70) return "paranoid";
  if (persona.trust >= 70) return "happy";
  if (persona.trust <= 10) return "furious";
  return "neutral";
}

interface ApplyResult {
  state: GameState;
  events: GameEvent[];
}

function applyEffects(
  state: GameState,
  effects: readonly Effect[],
  turn: number,
): ApplyResult {
  let next: GameState = state;
  const events: GameEvent[] = [];

  for (const effect of effects) {
    switch (effect.kind) {
      case "cash": {
        const total = next.cash + effect.amount;
        next = { ...next, cash: total };
        events.push({ type: "cashChanged", delta: effect.amount, total });
        break;
      }
      case "heat": {
        const total = clampStat(next.heat + effect.amount, 0, 100);
        const delta = total - next.heat;
        next = { ...next, heat: total };
        events.push({ type: "heatChanged", delta, total });
        break;
      }
      case "reputation": {
        const total = clampStat(next.reputation + effect.amount, -100, 100);
        next = { ...next, reputation: total };
        events.push({ type: "reputationChanged", delta: effect.amount, total });
        break;
      }
      case "personaStat": {
        const personas = next.personas.map((p) => {
          if (p.id !== effect.persona) return p;
          const current = p[effect.stat];
          const updated = clampStat(current + effect.amount, 0, 100);
          const withStat: Persona = { ...p, [effect.stat]: updated };
          const newMood = moodFor(withStat);
          return { ...withStat, mood: newMood };
        });
        const updatedPersona = personas.find((p) => p.id === effect.persona)!;
        next = { ...next, personas };
        events.push({
          type: "personaStatChanged",
          persona: effect.persona,
          stat: effect.stat,
          delta: effect.amount,
          total: updatedPersona[effect.stat],
        });
        break;
      }
      case "setMood": {
        const personas = next.personas.map((p) =>
          p.id === effect.persona ? { ...p, mood: effect.mood as Persona["mood"] } : p,
        );
        next = { ...next, personas };
        events.push({ type: "personaMoodChanged", persona: effect.persona, mood: effect.mood });
        break;
      }
      case "flagProperty": {
        next = {
          ...next,
          properties: next.properties.map((p) =>
            p.id === effect.propertyId
              ? { ...p, flags: { ...p.flags, flagged: true } }
              : p,
          ),
        };
        events.push({ type: "propertyFlagged", propertyId: effect.propertyId });
        break;
      }
      case "revealViolation": {
        next = {
          ...next,
          properties: next.properties.map((p) =>
            p.id === effect.propertyId
              ? { ...p, flags: { ...p.flags, codeViolation: true } }
              : p,
          ),
        };
        events.push({ type: "violationRevealed", propertyId: effect.propertyId });
        break;
      }
    }
  }

  void turn;
  return { state: next, events };
}

function logMemory(
  state: GameState,
  personaId: string,
  turn: number,
  summary: string,
  trustDelta: number,
): GameState {
  return {
    ...state,
    personas: state.personas.map((p) =>
      p.id === personaId
        ? { ...p, memory: [...p.memory, { turn, summary, trustDelta }] }
        : p,
    ),
  };
}

/**
 * The audit cascade from rulebook 2.8. If the Chief is suspicious enough and
 * Heat is high enough, he audits one of your properties that has a violation.
 */
function checkAuditCascade(state: GameState): ApplyResult {
  const chief = state.personas.find((p) => p.id === "chief");
  if (!chief) return { state, events: [] };
  if (chief.suspicion < AUDIT_SUSPICION_THRESHOLD || state.heat < AUDIT_HEAT_THRESHOLD) {
    return { state, events: [] };
  }

  const target: Property | undefined = state.properties.find(
    (p) => state.ownedPropertyIds.includes(p.id) && p.flags.codeViolation,
  );
  if (!target) return { state, events: [] };

  const fined = applyEffects(
    state,
    [
      { kind: "cash", amount: -AUDIT_FINE },
      { kind: "reputation", amount: -AUDIT_REPUTATION_LOSS },
    ],
    state.turn,
  );

  return {
    state: fined.state,
    events: [
      ...fined.events,
      { type: "auditTriggered", persona: "chief", propertyId: target.id, fine: AUDIT_FINE },
    ],
  };
}

/**
 * Resolves one action. Pure: returns a new state and the events it produced.
 * Follows rulebook 2.5 step for step.
 */
export function resolve(
  state: GameState,
  action: Action,
  request: ActionRequest,
  rng: Rng,
): Resolution {
  const pre = checkPreconditions(state, action, request);
  if (!pre.ok) {
    return {
      state,
      events: [{ type: "actionRejected", actionId: action.id, reason: pre.reason ?? "Rejected" }],
    };
  }

  const context = buildContext(state, action, request);
  const chance = clampStat(getFormula(action.successFormula).evaluate(context), 0, 100);
  const roll = rng.roll(100);
  const success = roll <= chance;

  const events: GameEvent[] = [
    { type: "actionResolved", actionId: action.id, success, roll, chance },
  ];

  // Costs always apply.
  let next = applyEffects(state, action.costs, state.turn);
  events.push(...next.events);
  let current = next.state;

  // Then the success or failure branch.
  const branch = success ? action.onSuccess : action.onFailure;
  next = applyEffects(current, branch, state.turn);
  events.push(...next.events);
  current = next.state;

  // Then ripples to other personas.
  next = applyEffects(current, action.ripples, state.turn);
  events.push(...next.events);
  current = next.state;

  // Spend the AP.
  current = { ...current, actionPoints: current.actionPoints - action.apCost };

  // Persona memory log, which the LLM reads later.
  const summary = `${action.label}: ${success ? "succeeded" : "failed"}`;
  const trustDelta = action.onSuccess
    .filter((e): e is Extract<Effect, { kind: "personaStat" }> =>
      e.kind === "personaStat" && e.persona === action.persona && e.stat === "trust",
    )
    .reduce((sum, e) => sum + e.amount, 0);
  current = logMemory(current, action.persona, state.turn, summary, success ? trustDelta : 0);

  // Cascade checks.
  const audit = checkAuditCascade(current);
  events.push(...audit.events);
  current = audit.state;

  return { state: current, events };
}
