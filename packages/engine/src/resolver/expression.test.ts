import { describe, expect, it } from "vitest";
import { FormulaError, compileFormula, evaluateFormula } from "./expression.js";

describe("evaluateFormula", () => {
  it("evaluates arithmetic with precedence", () => {
    expect(evaluateFormula("2 + 3 * 4", {})).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4", {})).toBe(20);
    expect(evaluateFormula("10 / 4", {})).toBe(2.5);
    expect(evaluateFormula("-5 + 2", {})).toBe(-3);
  });

  it("resolves variables from the context", () => {
    expect(evaluateFormula("trust * 0.5 + base", { trust: 40, base: 10 })).toBe(30);
  });

  it("supports min, max and clamp", () => {
    expect(evaluateFormula("min(3, 7)", {})).toBe(3);
    expect(evaluateFormula("max(3, 7)", {})).toBe(7);
    expect(evaluateFormula("clamp(150, 0, 100)", {})).toBe(100);
    expect(evaluateFormula("clamp(-5, 0, 100)", {})).toBe(0);
  });

  it("evaluates the real bribe formula", () => {
    const formula = "clamp(20 + trust * 0.6 - suspicion * 0.5 + (offer - greedPrice) / 20000, 5, 95)";
    const chance = evaluateFormula(formula, {
      trust: 10,
      suspicion: 15,
      offer: 500_000,
      greedPrice: 500_000,
    });
    expect(chance).toBeCloseTo(18.5, 5);
  });

  it("throws on an unknown variable", () => {
    expect(() => evaluateFormula("nope + 1", {})).toThrow(FormulaError);
  });

  it("throws on division by zero", () => {
    expect(() => evaluateFormula("1 / 0", {})).toThrow(FormulaError);
  });

  it("throws on a syntax error", () => {
    expect(() => compileFormula("2 +")).toThrow(FormulaError);
    expect(() => compileFormula("(2 + 3")).toThrow(FormulaError);
    expect(() => compileFormula("2 $ 3")).toThrow(FormulaError);
  });

  it("throws on an unknown function", () => {
    expect(() => compileFormula("evil(1, 2)")).toThrow(FormulaError);
  });

  it("throws on the wrong argument count", () => {
    expect(() => compileFormula("clamp(1, 2)")).toThrow(FormulaError);
    expect(() => compileFormula("min(1)")).toThrow(FormulaError);
  });

  it("does not allow arbitrary code execution", () => {
    // A call to an unknown function is rejected at parse time.
    expect(() => compileFormula("process.exit(1)")).toThrow(FormulaError);
    // A bare identifier parses, but only resolves against the supplied context,
    // so it can never reach a real object property.
    expect(() => evaluateFormula("constructor", {})).toThrow(FormulaError);
    expect(() => evaluateFormula("__proto__", {})).toThrow(FormulaError);
  });
});
