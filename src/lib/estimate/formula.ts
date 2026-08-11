/**
 * Budget formula evaluation for the cost plan grid.
 *
 * Most lines on Robby's sheet are formulas driven off the takeoff block
 * (`roofing_sq * 150`, `heated_sqft * 3`, `cabinet_lnft * cabinet_unit_cost`).
 * The grid has to evaluate the same expressions or it would lose recalculation
 * he already has today.
 *
 * Deliberately a hand-written parser rather than `eval` or `new Function` —
 * these strings are admin-editable and end up in the database.
 *
 * Grammar:
 *   expr    := term (('+' | '-') term)*
 *   term    := factor (('*' | '/') factor)*
 *   factor  := ('+' | '-')* primary
 *   primary := number | identifier | '(' expr ')'
 */

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormulaError";
  }
}

export type Scope = Record<string, number>;

type Token =
  | { kind: "number"; value: number }
  | { kind: "ident"; value: string }
  | { kind: "op"; value: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" };

function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (ch === "(" || ch === ")") {
      tokens.push({ kind: "paren", value: ch });
      i++;
      continue;
    }

    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ kind: "op", value: ch });
      i++;
      continue;
    }

    if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < src.length && /[0-9.]/.test(src[j])) j++;
      const raw = src.slice(i, j);
      const value = Number(raw);
      if (!Number.isFinite(value)) throw new FormulaError(`Not a number: "${raw}"`);
      tokens.push({ kind: "number", value });
      i = j;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      tokens.push({ kind: "ident", value: src.slice(i, j) });
      i = j;
      continue;
    }

    throw new FormulaError(`Unexpected character "${ch}"`);
  }

  return tokens;
}

/** Evaluate an expression against a scope of named numbers. */
export function evaluateFormula(formula: string, scope: Scope): number {
  const tokens = tokenize(formula);
  if (tokens.length === 0) throw new FormulaError("Empty formula");

  let pos = 0;
  const peek = () => tokens[pos];

  function parseExpr(): number {
    let left = parseTerm();
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && (t.value === "+" || t.value === "-")) {
        pos++;
        const right = parseTerm();
        left = t.value === "+" ? left + right : left - right;
      } else {
        return left;
      }
    }
  }

  function parseTerm(): number {
    let left = parseFactor();
    for (;;) {
      const t = peek();
      if (t?.kind === "op" && (t.value === "*" || t.value === "/")) {
        pos++;
        const right = parseFactor();
        if (t.value === "/") {
          if (right === 0) throw new FormulaError("Division by zero");
          left = left / right;
        } else {
          left = left * right;
        }
      } else {
        return left;
      }
    }
  }

  function parseFactor(): number {
    const t = peek();
    if (t?.kind === "op" && (t.value === "+" || t.value === "-")) {
      pos++;
      const value = parseFactor();
      return t.value === "-" ? -value : value;
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const t = peek();
    if (!t) throw new FormulaError("Unexpected end of formula");

    if (t.kind === "number") {
      pos++;
      return t.value;
    }

    if (t.kind === "ident") {
      pos++;
      // hasOwnProperty, not `in` — `in` walks the prototype chain, so bare
      // names like `constructor` or `toString` would resolve to Object members.
      if (!Object.prototype.hasOwnProperty.call(scope, t.value)) {
        throw new FormulaError(`Unknown name "${t.value}"`);
      }
      const value = scope[t.value];
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new FormulaError(`"${t.value}" is not a number`);
      }
      return value;
    }

    if (t.kind === "paren" && t.value === "(") {
      pos++;
      const value = parseExpr();
      const close = peek();
      if (close?.kind !== "paren" || close.value !== ")") {
        throw new FormulaError("Missing closing parenthesis");
      }
      pos++;
      return value;
    }

    throw new FormulaError(`Unexpected token "${String(t.value)}"`);
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new FormulaError("Trailing characters in formula");
  if (!Number.isFinite(result)) throw new FormulaError("Formula did not produce a number");
  return result;
}

/** Names a formula references — used to highlight dependencies in the grid. */
export function formulaDependencies(formula: string): string[] {
  try {
    return [...new Set(tokenize(formula).filter((t) => t.kind === "ident").map((t) => t.value as string))];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Takeoff resolution
// ---------------------------------------------------------------------------

export type TakeoffInput = {
  key: string;
  value: number | null;
  formula: string | null;
};

export type TakeoffResolution = {
  scope: Scope;
  errors: Record<string, string>;
};

/**
 * Resolve takeoff values, following formulas that reference other takeoff
 * values (`heated_sqft = first_floor + second_floor`). Depth-first with cycle
 * detection; a key that fails resolves to 0 and records an error so one bad
 * cell doesn't blank the whole grid.
 */
export function resolveTakeoff(inputs: TakeoffInput[]): TakeoffResolution {
  const byKey = new Map(inputs.map((t) => [t.key, t]));
  const scope: Scope = {};
  const errors: Record<string, string> = {};
  const resolving = new Set<string>();

  function resolve(key: string): number {
    if (key in scope) return scope[key];

    const input = byKey.get(key);
    if (!input) throw new FormulaError(`Unknown name "${key}"`);

    if (resolving.has(key)) {
      throw new FormulaError(`Circular reference through "${key}"`);
    }

    if (!input.formula) {
      const value = input.value ?? 0;
      scope[key] = value;
      return value;
    }

    resolving.add(key);
    try {
      const deps = formulaDependencies(input.formula);
      const localScope: Scope = {};
      for (const dep of deps) localScope[dep] = resolve(dep);
      const value = evaluateFormula(input.formula, localScope);
      scope[key] = value;
      return value;
    } finally {
      resolving.delete(key);
    }
  }

  for (const input of inputs) {
    if (input.key in scope) continue;
    try {
      resolve(input.key);
    } catch (err) {
      errors[input.key] = err instanceof Error ? err.message : String(err);
      scope[input.key] = input.value ?? 0;
    }
  }

  return { scope, errors };
}

// ---------------------------------------------------------------------------
// Cost plan totals
// ---------------------------------------------------------------------------

export type CostLineInput = {
  id: string;
  code: string | null;
  line_type: "cost" | "markup" | "contingency";
  formula: string | null;
  estimated_amount: number | null;
};

export type ComputedLine = {
  id: string;
  amount: number;
  /** true when the amount came from a formula — the grid renders it read-only */
  derived: boolean;
  error: string | null;
};

export type CostPlanTotals = {
  lines: ComputedLine[];
  byId: Record<string, ComputedLine>;
  subtotal: number;
  markup: number;
  contingency: number;
  total: number;
  perSqft: number | null;
  perHeatedSqft: number | null;
  takeoffErrors: Record<string, string>;
};

function computeLine(line: CostLineInput, scope: Scope): ComputedLine {
  if (!line.formula) {
    return { id: line.id, amount: Number(line.estimated_amount ?? 0), derived: false, error: null };
  }
  try {
    return { id: line.id, amount: evaluateFormula(line.formula, scope), derived: true, error: null };
  } catch (err) {
    return {
      id: line.id,
      amount: Number(line.estimated_amount ?? 0),
      derived: true,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Evaluate a whole cost plan.
 *
 * Cost lines resolve first and sum to the subtotal; markup and contingency
 * lines then resolve with `subtotal` in scope, mirroring the workbook's
 * `subtotal * 0.2 - 15000` supervision cell. Markup never feeds the subtotal.
 */
export function computeCostPlan(
  lines: CostLineInput[],
  takeoff: TakeoffInput[],
  opts: { squareFeet?: number | null; heatedSquareFeet?: number | null } = {}
): CostPlanTotals {
  const { scope, errors: takeoffErrors } = resolveTakeoff(takeoff);

  const computed: ComputedLine[] = [];
  let subtotal = 0;

  for (const line of lines) {
    if (line.line_type !== "cost") continue;
    const result = computeLine(line, scope);
    computed.push(result);
    subtotal += result.amount;
  }

  const withSubtotal: Scope = { ...scope, subtotal };
  let markup = 0;
  let contingency = 0;

  for (const line of lines) {
    if (line.line_type === "cost") continue;
    const result = computeLine(line, withSubtotal);
    computed.push(result);
    if (line.line_type === "markup") markup += result.amount;
    else contingency += result.amount;
  }

  const total = subtotal + markup + contingency;
  const byId: Record<string, ComputedLine> = {};
  for (const c of computed) byId[c.id] = c;

  const sqft = opts.squareFeet ?? scope.total_sqft ?? null;
  const heated = opts.heatedSquareFeet ?? scope.heated_sqft ?? null;

  return {
    lines: computed,
    byId,
    subtotal,
    markup,
    contingency,
    total,
    perSqft: sqft ? total / sqft : null,
    perHeatedSqft: heated ? total / heated : null,
    takeoffErrors,
  };
}
