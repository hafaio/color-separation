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

// FIXME add posterize option to Linear that makes it 0 or 1

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
  posterize: boolean = false
): Result {
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
      variables[mix][up] = sep;
      variables[mix][dn] = sep;
    }
  }

  if (posterize) {
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
    const opacities = pool.map((_, i) => vals[`mix ${i}`] ?? 0);
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
  pool: readonly CMYColor[]
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
      opacities: result.map((o) => Math.min(Math.max(0, o), 1)),
    };
  }
}

interface ColoredResult extends Result {
  color: string;
}

export function colorSeparation(
  target: string,
  pool: readonly string[],
  {
    variant = "quadratic",
    paper = "#ffffff",
  }: { variant?: "quadratic" | "linear" | "posterize"; paper?: string } = {}
): ColoredResult {
  const cmyTarget = parseCMYColor(target);
  const cmyPaper = parseCMYColor(paper);
  const cmyDiff = cmyTarget.map((c, i) => c - cmyPaper[i]) as CMYColor;
  const cmyPool = pool.map(parseCMYColor);
  const { error, opacities } =
    variant === "quadratic"
      ? colorSeparationQuadratic(cmyDiff, cmyPool)
      : variant === "linear"
      ? colorSeparationLinear(cmyDiff, cmyPool)
      : colorSeparationLinear(cmyDiff, cmyPool, true);
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
