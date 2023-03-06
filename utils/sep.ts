/**
 * Utilities for separating a color into stop colors using various techniques.
 *
 * The current implementation uses a simple subtractive color model that seems to work reasonably well.
 *
 * @remkarks
 *
 * The current model can saturate in CMY space (e.g. produce values greater
 * than one). The current optimization techniques can't handle saturation
 * appropriately, meaning that errors will be larger than necessary for colors
 * where this happens. In the future it might make sense to use arbitrary
 * convex optimization which can handle saturation.
 *
 * @packageDocumentation
 */
import { Constraint, Solve as solveLP, Variable } from "javascript-lp-solver";
import { solveQP } from "quadprog";
import { formatColor } from "./color";

type CMYColor = [number, number, number];

function parseCMYColor(color: string): CMYColor {
  return [...Array(3)].map(
    (_, i) => 1 - parseInt(color.slice(i * 2 + 1, i * 2 + 3), 16) / 255
  ) as CMYColor;
}

function formatCMYColor(color: CMYColor): string {
  return formatColor(color.map((c) => 1 - c));
}

interface Result {
  error: number;
  opacities: number[];
}

function colorSeparationLinear(
  target: CMYColor,
  pool: readonly CMYColor[],
  increments: number
): Result {
  const mult = Math.max(increments, 1);
  const weighting = 1e-4;
  const weights = pool.map(
    (color) => weighting * color.reduce((s, v) => s + (1 - v) / 3, 0)
  );

  const constraints: Record<string, Constraint> = {};
  const variables: Record<string, Variable> = {};
  const ints: Record<string, 1> = {};

  for (const [j, weight] of weights.entries()) {
    variables[`mix ${j}`] = { error: weight };
  }

  for (const [i, color] of target.entries()) {
    const up = `up ${i}`;
    constraints[up] = { max: color };

    const dn = `dn ${i}`;
    constraints[dn] = { min: color };

    const slack = `slack ${i}`;
    variables[slack] = { error: 1, [up]: -1, [dn]: 1 };

    for (const [j, seper] of pool.entries()) {
      const sep = seper[i];
      const mix = `mix ${j}`;
      variables[mix][up] = sep / mult;
      variables[mix][dn] = sep / mult;
    }
  }

  if (increments > 0) {
    for (const [j, weight] of weights.entries()) {
      ints[`mix ${j}`] = 1;
    }
  }

  const { result, feasible, bounded, ...vals } = solveLP.call(
    {},
    {
      optimize: "error",
      opType: "min",
      constraints,
      variables,
      ints,
    }
  );
  /* istanbul ignore else */
  if (feasible && bounded) {
    const opacities = pool.map((_, i) => (vals[`mix ${i}`] ?? 0) / mult);
    const cond = opacities.reduce((s, v, i) => s + weights[i] * v, 0);
    return {
      error: (result - cond) / 3,
      opacities,
    };
  } else {
    throw new Error("couldn't find bounded feasible solution");
  }
}

function dot(left: readonly number[], right: readonly number[]): number {
  let sum = 0;
  for (const [i, l] of left.entries()) {
    sum += l * right[i];
  }
  return sum;
}

function colorSeparationQuadratic(
  target: CMYColor,
  pool: readonly CMYColor[],
  increments: number
): Result {
  // NOTE since colors can be linearly dependent (and will necessarily be if
  // there's more than three, we help make the matrix positive definite by
  // penalizing the weights a small amount for the magnitude of the color
  const weighting = 1e-4;
  const weights = pool.map(
    (color) => weighting * color.reduce((s, v) => s + (1 - v) / 3, 0)
  );

  const Dmat = [
    ,
    ...pool.map(
      (ci, i) =>
        [
          ,
          ...pool.map((cj, j) => dot(ci, cj) + (i === j ? weights[i] : 0)),
        ] as const
    ),
  ] as const;
  const dvec = [, ...pool.map((ci) => dot(ci, target))] as const;
  const Amat = [
    ,
    ...pool.map(
      (_, i) =>
        [
          ,
          ...pool.map((_, j) => (i === j ? 1 : 0)),
          ...pool.map((_, j) => (i === j ? -1 : 0)),
        ] as const
    ),
  ] as const;
  const bvec = [, ...pool.map(() => 0), ...pool.map(() => -1)] as const;

  const {
    solution: [, ...result],
    value: [, error],
    message,
    ...rest
  } = solveQP(Dmat, dvec, Amat, bvec);
  // constant "error"
  const err = dot(target, target);
  // extra error from conditioning terms
  const cond = result.reduce((s, w) => s + weighting * w * w, 0);

  /* istanbul ignore if */
  if (message) {
    throw new Error(message);
  } else {
    return {
      error: Math.sqrt(Math.max(2 * error + err - cond, 0)) / 3,
      opacities: result.map((opacity) => {
        const normed = Math.min(Math.max(0, opacity), 1);
        if (increments > 0) {
          // NOTE we don't have a way to force integer constraints. We could
          // implement convex rounding, but that's probably overkill when
          // linear will do it well
          return Math.round(normed * increments) / increments;
        } else {
          return normed;
        }
      }),
    };
  }
}

interface ColoredResult extends Result {
  color: string;
}

/**
 * Perform approximate subtractive color separation
 *
 * All colors should be in standard (non-alpha) hex, e.g. "#rrggbb".
 *
 * @param target - the target color
 * @param pool - an array of the available colors
 * @param quadratic - true if using quadratic optimization
 * @param paper - the paper color, white being the most general
 * @param increments - the number of color increments to use; opacities will
 *   always be multiples of 1 / increments; if 0 then use continuous increments
 */
export function colorSeparation(
  target: string,
  pool: readonly string[],
  {
    quadratic = true,
    paper = "#ffffff",
    increments = 0,
    factorPaper = true,
  }: {
    quadratic?: boolean;
    paper?: string;
    increments?: number;
    factorPaper?: boolean;
  } = {}
): ColoredResult {
  let cmyTarget = parseCMYColor(target);
  const cmyPaper = parseCMYColor(paper);
  if (factorPaper) {
    cmyTarget = cmyTarget.map((c, i) =>
      Math.max(c - cmyPaper[i], 0)
    ) as CMYColor;
  }
  const cmyPool = pool.map(parseCMYColor);
  const { error, opacities } = quadratic
    ? colorSeparationQuadratic(cmyTarget, cmyPool, increments)
    : colorSeparationLinear(cmyTarget, cmyPool, increments);
  const closest: CMYColor = [...cmyPaper];
  for (const [i, color] of cmyPool.entries()) {
    const opacity = opacities[i];
    for (const [j, c] of color.entries()) {
      closest[j] += c * opacity;
    }
  }
  return {
    error,
    opacities,
    color: formatCMYColor(closest.map((c) => Math.min(c, 1)) as CMYColor),
  };
}
