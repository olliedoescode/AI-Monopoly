import { loadRegistries } from "@ai-monopoly/data";
import { describe, expect, it } from "vitest";
import { runSimulation } from "./index.js";

const registries = loadRegistries();

describe("runSimulation", () => {
  it("plays 10 turns headlessly without crashing", () => {
    const result = runSimulation({ seed: 1, registries, turns: 10 });
    expect(result.turnsPlayed).toBe(10);
    expect(result.events.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same seed", () => {
    const a = runSimulation({ seed: 42, registries, turns: 10 });
    const b = runSimulation({ seed: 42, registries, turns: 10 });
    expect(a.state).toEqual(b.state);
    expect(a.events).toEqual(b.events);
  });

  it("produces different runs for different seeds", () => {
    const a = runSimulation({ seed: 1, registries, turns: 10 });
    const b = runSimulation({ seed: 2, registries, turns: 10 });
    expect(a.state).not.toEqual(b.state);
  });

  it("never leaves cash negative while still playing", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const result = runSimulation({ seed, registries, turns: 40 });
      if (result.state.status === "playing") {
        expect(result.state.cash).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("keeps Heat within 0 and 100", () => {
    for (let seed = 1; seed <= 25; seed++) {
      const result = runSimulation({ seed, registries, turns: 40 });
      expect(result.state.heat).toBeGreaterThanOrEqual(0);
      expect(result.state.heat).toBeLessThanOrEqual(100);
    }
  });

  it("collects rent from occupied owned properties", () => {
    const result = runSimulation({ seed: 1, registries, turns: 3 });
    expect(result.events.some((e) => e.type === "rentCollected")).toBe(true);
  });

  it("reaches a terminal state within 40 turns", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const result = runSimulation({ seed, registries, turns: 40 });
      expect(result.state.status).not.toBe("playing");
    }
  });
});
