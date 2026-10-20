import { describe, expect, it } from "vitest";
import { RegistryError, loadRegistries } from "./index.js";

describe("loadRegistries", () => {
  it("loads every registry without throwing", () => {
    const registries = loadRegistries();
    expect(registries.properties.length).toBeGreaterThan(0);
    expect(registries.personas).toHaveLength(4);
    expect(registries.actions.length).toBeGreaterThan(0);
    expect(registries.events.length).toBeGreaterThan(0);
    expect(registries.cards).toHaveLength(5);
  });

  it("applies schema defaults", () => {
    const { properties, personas } = loadRegistries();
    for (const property of properties) {
      expect(typeof property.flags.codeViolation).toBe("boolean");
      expect(typeof property.flags.flagged).toBe("boolean");
    }
    for (const persona of personas) {
      expect(Array.isArray(persona.memory)).toBe(true);
    }
  });

  it("has the four personas from the rulebook", () => {
    const { personas } = loadRegistries();
    expect(personas.map((p) => p.id).sort()).toEqual(["barnaby", "chief", "mayor", "vance"]);
  });

  it("starts the Chief at Trust 10, Suspicion 15, Greed 60", () => {
    const { personas } = loadRegistries();
    const chief = personas.find((p) => p.id === "chief")!;
    expect(chief.trust).toBe(10);
    expect(chief.suspicion).toBe(15);
    expect(chief.greed).toBe(60);
  });

  it("gives the retro house a hidden code violation", () => {
    const { properties } = loadRegistries();
    const retro = properties.find((p) => p.id === "prop-retro-house")!;
    expect(retro.flags.codeViolation).toBe(true);
  });

  it("has the four chief actions", () => {
    const { actions } = loadRegistries();
    const chiefActions = actions.filter((a) => a.persona === "chief").map((a) => a.id);
    expect(chiefActions.sort()).toEqual([
      "chief.bribe",
      "chief.comply",
      "chief.helpOut",
      "chief.tipOff",
    ]);
  });

  it("reports a readable error for a bad entry", () => {
    const error = new RegistryError("properties", ["0.baseValue: Expected number"]);
    expect(error.message).toContain("Invalid properties registry");
    expect(error.message).toContain("baseValue");
  });
});
