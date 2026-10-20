import { describe, expect, it } from "vitest";
import { createRng, seedFromString } from "./index.js";

describe("createRng", () => {
  it("is deterministic for the same seed", () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it("produces different sequences for different seeds", () => {
    const a = createRng(1);
    const b = createRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it("keeps next() in [0, 1)", () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i++) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("rolls a d100 in [1, 100]", () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i++) {
      const roll = rng.roll(100);
      expect(roll).toBeGreaterThanOrEqual(1);
      expect(roll).toBeLessThanOrEqual(100);
      seen.add(roll);
    }
    // A fair d100 over 5000 rolls should hit most faces.
    expect(seen.size).toBeGreaterThan(90);
  });

  it("rejects an invalid side count", () => {
    const rng = createRng(1);
    expect(() => rng.roll(0)).toThrow();
    expect(() => rng.roll(1.5)).toThrow();
  });

  it("exposes internal state for serialisation", () => {
    const rng = createRng(42);
    rng.next();
    const snapshot = rng.state;
    const resumed = createRng(snapshot);
    expect(resumed.next()).toBe(rng.next());
  });
});

describe("seedFromString", () => {
  it("is stable for the same input", () => {
    expect(seedFromString("town-square")).toBe(seedFromString("town-square"));
  });

  it("differs for different inputs", () => {
    expect(seedFromString("a")).not.toBe(seedFromString("b"));
  });
});
