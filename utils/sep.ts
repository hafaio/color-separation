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
import * as d3color from "d3-color";
import { Constraint, Solve as solveLP, Variable } from "javascript-lp-solver";

export interface Result {
  error: number;
  color: string;
  opacities: number[];
}

/**
 * Perform approximate subtractive color separation
 *
 * All colors should be in standard (non-alpha) hex, e.g. "#rrggbb".
 *
 * @param target - the target color
 * @param pool - an array of the available colors
 * @param quadratic - true if using quadratic optimization
 * @param increments - the number of color increments to use; opacities will
 *   always be multiples of 1 / increments; if 0 then use continuous increments
 */
export function colorSeparation(
  cssTarget: string,
  cssPool: readonly string[],
  {
    increments = 0,
  }: {
    increments?: number;
  } = {},
): Result {
  const target = d3color.color(cssTarget)!.rgb();
  const pool = cssPool.map((color) => d3color.color(color)!.rgb());

  const mult = Math.max(increments, 1);
  const weighting = 1e-7;
  const weights = pool.map(({ r, g, b }) => weighting * (r + g + b));

  const constraints: Record<string, Constraint> = {};
  const variables: Record<string, Variable> = {};
  const ints: Record<string, 1> = {};

  for (const [j, weight] of weights.entries()) {
    // maximum weight of 1
    const mx = `mx ${j}`;
    constraints[mx] = { max: mult };

    // tie break towards lighter colors
    variables[`mix ${j}`] = { error: weight, [mx]: 1 };
  }

  for (const prop of ["r", "g", "b"] as const) {
    const channel = 255 - target[prop];

    // slack varaible for absolute value loss
    const up = `up ${prop}`;
    constraints[up] = { max: channel };

    const dn = `dn ${prop}`;
    constraints[dn] = { min: channel };

    const slack = `slack ${prop}`;
    variables[slack] = { error: 1, [up]: -1, [dn]: 1 };

    for (const [j, seper] of pool.entries()) {
      const sep = 255 - seper[prop];
      const mix = `mix ${j}`;
      variables[mix][up] = sep / mult;
      variables[mix][dn] = sep / mult;
    }
  }

  if (increments > 0) {
    for (const [j] of weights.entries()) {
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
    },
  );
  /* istanbul ignore if */
  if (!feasible || !bounded) {
    throw new Error("couldn't find bounded feasible solution");
  }
  const opacities = pool.map((_, i) =>
    Math.min((vals[`mix ${i}`] ?? 0) / mult, 1),
  );
  const cond = opacities.reduce((s, v, i) => s + weights[i] * v, 0);
  const error = (result - cond) / (3 * 255);
  const total = opacities.reduce((t, o) => t + o, 0);

  const closest = d3color.gray(100 * (1 - total)).rgb();
  for (const [i, color] of pool.entries()) {
    const opacity = opacities[i];
    for (const prop of ["r", "g", "b"] as const) {
      closest[prop] += color[prop] * opacity;
    }
  }
  return {
    error,
    opacities,
    color: closest.formatHex(),
  };
}
