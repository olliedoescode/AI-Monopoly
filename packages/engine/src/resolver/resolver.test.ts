import { loadRegistries, type Action } from "@ai-monopoly/data";
import { describe, expect, it } from "vitest";
import { createRng } from "../rng/index.js";
import { createInitialState, type GameState } from "../state/index.js";
import { checkPreconditions, resolve, validateActionFormulas } from "./index.js";

const registries = loadRegistries();

function freshState(): GameState {
  return createInitialState({ seed: 1, registries });
}

function action(id: string): Action {
  const found = registries.actions.find((a) => a.id === id);
  if (!found) throw new Error(`No action ${id}`);
  return found;
}

/** An RNG that always rolls a 1, so every action succeeds. */
function alwaysSucceed() {
  return { next: () => 0, roll: () => 1, state: 0 };
}

/** An RNG that always rolls a 100, so every action fails. */
function alwaysFail() {
  return { next: () => 0.999, roll: () => 100, state: 0 };
}

describe("validateActionFormulas", () => {
  it("accepts every formula in the registry", () => {
    expect(() => validateActionFormulas(registries.actions)).not.toThrow();
  });
});

describe("checkPreconditions", () => {
  it("rejects an action that costs more AP than available", () => {
    const state = { ...freshState(), actionPoints: 0 };
    const result = checkPreconditions(state, action("chief.bribe"), { actionId: "chief.bribe" });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("AP");
  });

  it("rejects an action the player cannot afford", () => {
    const state = { ...freshState(), cash: 100 };
    const result = checkPreconditions(state, action("chief.bribe"), { actionId: "chief.bribe" });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("cash");
  });

  it("rejects any action once the game is over", () => {
    const state = { ...freshState(), status: "won" as const };
    const result = checkPreconditions(state, action("chief.comply"), { actionId: "chief.comply" });
    expect(result.ok).toBe(false);
  });

  it("accepts a valid action", () => {
    const result = checkPreconditions(freshState(), action("chief.comply"), {
      actionId: "chief.comply",
    });
    expect(result.ok).toBe(true);
  });
});

describe("resolve", () => {
  it("applies costs even on failure", () => {
    const state = freshState();
    const result = resolve(state, action("chief.bribe"), { actionId: "chief.bribe" }, alwaysFail());
    expect(result.state.cash).toBe(state.cash - 500_000);
  });

  it("raises Heat and Suspicion when a bribe fails", () => {
    const state = freshState();
    const result = resolve(state, action("chief.bribe"), { actionId: "chief.bribe" }, alwaysFail());
    expect(result.state.heat).toBe(state.heat + 20);
    const chief = result.state.personas.find((p) => p.id === "chief")!;
    expect(chief.suspicion).toBe(30);
  });

  it("lowers Heat and raises Greed when a bribe succeeds", () => {
    const state = freshState();
    const result = resolve(
      state,
      action("chief.bribe"),
      { actionId: "chief.bribe" },
      alwaysSucceed(),
    );
    expect(result.state.heat).toBe(state.heat - 15);
    const chief = result.state.personas.find((p) => p.id === "chief")!;
    expect(chief.greed).toBe(65);
  });

  it("spends action points", () => {
    const state = freshState();
    const result = resolve(state, action("chief.comply"), { actionId: "chief.comply" }, alwaysSucceed());
    expect(result.state.actionPoints).toBe(state.actionPoints - 1);
  });

  it("logs the action in the persona's memory", () => {
    const state = freshState();
    const result = resolve(state, action("chief.comply"), { actionId: "chief.comply" }, alwaysSucceed());
    const chief = result.state.personas.find((p) => p.id === "chief")!;
    expect(chief.memory).toHaveLength(1);
    expect(chief.memory[0]!.summary).toContain("Comply");
  });

  it("emits an actionResolved event with the roll and chance", () => {
    const state = freshState();
    const result = resolve(state, action("chief.comply"), { actionId: "chief.comply" }, alwaysSucceed());
    const resolved = result.events.find((e) => e.type === "actionResolved");
    expect(resolved).toBeDefined();
    if (resolved?.type === "actionResolved") {
      expect(resolved.success).toBe(true);
      expect(resolved.roll).toBe(1);
      expect(resolved.chance).toBe(100);
    }
  });

  it("does not mutate the input state", () => {
    const state = freshState();
    const snapshot = JSON.stringify(state);
    resolve(state, action("chief.bribe"), { actionId: "chief.bribe" }, alwaysFail());
    expect(JSON.stringify(state)).toBe(snapshot);
  });

  it("is deterministic for the same seed", () => {
    const run = () => {
      const state = freshState();
      const rng = createRng(777);
      return resolve(state, action("chief.bribe"), { actionId: "chief.bribe" }, rng);
    };
    expect(run().state).toEqual(run().state);
  });
});

describe("audit cascade", () => {
  it("fires when Suspicion is 70+ and Heat is 50+ and a violation exists", () => {
    const base = freshState();
    const state: GameState = {
      ...base,
      heat: 55,
      personas: base.personas.map((p) =>
        p.id === "chief" ? { ...p, suspicion: 75 } : p,
      ),
    };
    // A failing bribe pushes Heat and Suspicion further, then the cascade runs.
    const result = resolve(state, action("chief.bribe"), { actionId: "chief.bribe" }, alwaysFail());
    const audit = result.events.find((e) => e.type === "auditTriggered");
    expect(audit).toBeDefined();
    if (audit?.type === "auditTriggered") {
      expect(audit.propertyId).toBe("prop-retro-house");
      expect(audit.fine).toBe(2_000_000);
    }
  });

  it("does not fire when Heat is below the threshold", () => {
    const base = freshState();
    const state: GameState = {
      ...base,
      heat: 10,
      personas: base.personas.map((p) => (p.id === "chief" ? { ...p, suspicion: 75 } : p)),
    };
    const result = resolve(state, action("chief.comply"), { actionId: "chief.comply" }, alwaysSucceed());
    expect(result.events.some((e) => e.type === "auditTriggered")).toBe(false);
  });

  it("does not fire when no owned property has a violation", () => {
    const base = freshState();
    const state: GameState = {
      ...base,
      heat: 60,
      properties: base.properties.map((p) => ({
        ...p,
        flags: { ...p.flags, codeViolation: false },
      })),
      personas: base.personas.map((p) => (p.id === "chief" ? { ...p, suspicion: 80 } : p)),
    };
    const result = resolve(state, action("chief.comply"), { actionId: "chief.comply" }, alwaysSucceed());
    expect(result.events.some((e) => e.type === "auditTriggered")).toBe(false);
  });
});
