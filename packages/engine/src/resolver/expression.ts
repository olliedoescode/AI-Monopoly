/**
 * A tiny sandboxed arithmetic evaluator for success-chance formulas.
 *
 * Deliberately not `eval` and not `new Function`. The grammar is:
 *   expr    := term (('+' | '-') term)*
 *   term    := factor (('*' | '/') factor)*
 *   factor  := '-' factor | number | identifier | call | '(' expr ')'
 *   call    := ('min' | 'max' | 'clamp') '(' expr (',' expr)* ')'
 *
 * Formulas are parsed once at registry load, so a typo fails fast.
 */

export type FormulaContext = Readonly<Record<string, number>>;

type Node =
  | { kind: "num"; value: number }
  | { kind: "var"; name: string }
  | { kind: "unary"; op: "-"; operand: Node }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; left: Node; right: Node }
  | { kind: "call"; name: "min" | "max" | "clamp"; args: Node[] };

export class FormulaError extends Error {
  constructor(
    message: string,
    public readonly formula: string,
    public readonly position: number,
  ) {
    super(`${message} at position ${position} in "${formula}"`);
    this.name = "FormulaError";
  }
}

interface Token {
  type: "num" | "ident" | "op" | "lparen" | "rparen" | "comma" | "eof";
  value: string;
  pos: number;
}

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < formula.length) {
    const ch = formula[i]!;
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      const start = i;
      while (i < formula.length && /[0-9.]/.test(formula[i]!)) i++;
      tokens.push({ type: "num", value: formula.slice(start, i), pos: start });
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const start = i;
      while (i < formula.length && /[A-Za-z0-9_]/.test(formula[i]!)) i++;
      tokens.push({ type: "ident", value: formula.slice(start, i), pos: start });
      continue;
    }
    if ("+-*/".includes(ch)) {
      tokens.push({ type: "op", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen", value: ch, pos: i });
      i++;
      continue;
    }
    if (ch === ",") {
      tokens.push({ type: "comma", value: ch, pos: i });
      i++;
      continue;
    }
    throw new FormulaError(`Unexpected character "${ch}"`, formula, i);
  }
  tokens.push({ type: "eof", value: "", pos: formula.length });
  return tokens;
}

const FUNCTIONS = new Set(["min", "max", "clamp"]);

function parse(formula: string): Node {
  const tokens = tokenize(formula);
  let pos = 0;

  const peek = (): Token => tokens[pos]!;
  const advance = (): Token => tokens[pos++]!;

  const parseExpr = (): Node => {
    let left = parseTerm();
    while (peek().type === "op" && (peek().value === "+" || peek().value === "-")) {
      const op = advance().value as "+" | "-";
      const right = parseTerm();
      left = { kind: "binary", op, left, right };
    }
    return left;
  };

  const parseTerm = (): Node => {
    let left = parseFactor();
    while (peek().type === "op" && (peek().value === "*" || peek().value === "/")) {
      const op = advance().value as "*" | "/";
      const right = parseFactor();
      left = { kind: "binary", op, left, right };
    }
    return left;
  };

  const parseFactor = (): Node => {
    const token = peek();
    if (token.type === "op" && token.value === "-") {
      advance();
      return { kind: "unary", op: "-", operand: parseFactor() };
    }
    if (token.type === "num") {
      advance();
      const value = Number(token.value);
      if (!Number.isFinite(value)) {
        throw new FormulaError(`Invalid number "${token.value}"`, formula, token.pos);
      }
      return { kind: "num", value };
    }
    if (token.type === "ident") {
      advance();
      if (peek().type === "lparen") {
        if (!FUNCTIONS.has(token.value)) {
          throw new FormulaError(`Unknown function "${token.value}"`, formula, token.pos);
        }
        advance();
        const args: Node[] = [];
        if (peek().type !== "rparen") {
          args.push(parseExpr());
          while (peek().type === "comma") {
            advance();
            args.push(parseExpr());
          }
        }
        if (peek().type !== "rparen") {
          throw new FormulaError("Expected ')'", formula, peek().pos);
        }
        advance();
        const name = token.value as "min" | "max" | "clamp";
        const expected = name === "clamp" ? 3 : 2;
        if (args.length !== expected) {
          throw new FormulaError(
            `${name}() takes ${expected} arguments, got ${args.length}`,
            formula,
            token.pos,
          );
        }
        return { kind: "call", name, args };
      }
      return { kind: "var", name: token.value };
    }
    if (token.type === "lparen") {
      advance();
      const inner = parseExpr();
      if (peek().type !== "rparen") {
        throw new FormulaError("Expected ')'", formula, peek().pos);
      }
      advance();
      return inner;
    }
    throw new FormulaError(`Unexpected token "${token.value || "end of input"}"`, formula, token.pos);
  };

  const root = parseExpr();
  if (peek().type !== "eof") {
    throw new FormulaError(`Unexpected trailing token "${peek().value}"`, formula, peek().pos);
  }
  return root;
}

function evaluate(node: Node, ctx: FormulaContext, formula: string): number {
  switch (node.kind) {
    case "num":
      return node.value;
    case "var": {
      const value = ctx[node.name];
      if (value === undefined) {
        throw new FormulaError(`Unknown variable "${node.name}"`, formula, 0);
      }
      return value;
    }
    case "unary":
      return -evaluate(node.operand, ctx, formula);
    case "binary": {
      const l = evaluate(node.left, ctx, formula);
      const r = evaluate(node.right, ctx, formula);
      switch (node.op) {
        case "+":
          return l + r;
        case "-":
          return l - r;
        case "*":
          return l * r;
        case "/":
          if (r === 0) throw new FormulaError("Division by zero", formula, 0);
          return l / r;
      }
      break;
    }
    case "call": {
      const args = node.args.map((a) => evaluate(a, ctx, formula));
      if (node.name === "min") return Math.min(args[0]!, args[1]!);
      if (node.name === "max") return Math.max(args[0]!, args[1]!);
      return Math.min(Math.max(args[0]!, args[1]!), args[2]!);
    }
  }
  throw new FormulaError("Unreachable", formula, 0);
}

export interface CompiledFormula {
  readonly source: string;
  evaluate(ctx: FormulaContext): number;
}

/** Parses a formula once. Throws FormulaError on a syntax problem. */
export function compileFormula(formula: string): CompiledFormula {
  const ast = parse(formula);
  return {
    source: formula,
    evaluate(ctx: FormulaContext): number {
      const result = evaluate(ast, ctx, formula);
      if (!Number.isFinite(result)) {
        throw new FormulaError(`Formula produced a non-finite value`, formula, 0);
      }
      return result;
    },
  };
}

/** Convenience for one-off evaluation. Prefer compileFormula in hot paths. */
export function evaluateFormula(formula: string, ctx: FormulaContext): number {
  return compileFormula(formula).evaluate(ctx);
}
