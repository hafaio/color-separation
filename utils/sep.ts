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

import type { ColorSpaceObject } from "d3-color";
import * as d3color from "d3-color";
import {
  type Constraint,
  default as solver,
  type Variable,
} from "javascript-lp-solver";

export interface Result {
  error: number;
  color: ColorSpaceObject;
  opacities: number[];
}

const L1_ITERATIONS = 4;
const L1_EPSILON = 0.01;
const LAMBDA_SCALE = 255;

/**
 * Perform approximate subtractive color separation
 *
 * @param target - the target color
 * @param pool - an array of the available colors
 * @param increments - the number of color increments to use; opacities will
 *   always be multiples of 1 / increments; if 0 then use continuous increments
 * @param lambda - sparsity penalty in [0, 1], scaled internally; > 0 enables
 *   iterative reweighted L1 to bias toward fewer pool colors per output
 */
export function colorSeparation(
  target: ColorSpaceObject,
  pool: readonly ColorSpaceObject[],
  {
    increments = 0,
    lambda = 0,
  }: {
    increments?: number;
    lambda?: number;
  } = {},
): Result {
  const rgbTarget = target.rgb();
  const rgbPool = pool.map((color) => color.rgb());

  const mult = Math.max(increments, 1);
  const tieBreak = 1e-7;
  const tieWeights = rgbPool.map(({ r, g, b }) => tieBreak * (r + g + b));

  const constraints: Record<string, Constraint> = {};
  const variables: Record<string, Variable> = {};
  const ints: Record<string, 1> = {};

  for (const [j, weight] of tieWeights.entries()) {
    const mx = `mx ${j}`;
    constraints[mx] = { max: mult };
    variables[`mix ${j}`] = { error: weight, [mx]: 1 };
  }

  for (const prop of ["r", "g", "b"] as const) {
    const channel = 255 - rgbTarget[prop];

    const up = `up ${prop}`;
    constraints[up] = { max: channel };

    const dn = `dn ${prop}`;
    constraints[dn] = { min: channel };

    const slack = `slack ${prop}`;
    variables[slack] = { error: 1, [up]: -1, [dn]: 1 };

    for (const [j, seper] of rgbPool.entries()) {
      const sep = 255 - seper[prop];
      const mix = `mix ${j}`;
      variables[mix][up] = sep / mult;
      variables[mix][dn] = sep / mult;
    }
  }

  if (increments > 0) {
    for (const [j] of tieWeights.entries()) {
      ints[`mix ${j}`] = 1;
    }
  }

  const effectiveLambda = lambda * LAMBDA_SCALE;

  const solveOnce = (): Record<string, number> => {
    const {
      result: _result,
      feasible,
      bounded,
      ...vals
    } = solver.Solve({
      optimize: "error",
      opType: "min",
      constraints,
      variables,
      ints,
    });
    /* istanbul ignore if */
    if (!feasible || !bounded) {
      throw new Error("couldn't find bounded feasible solution");
    }
    return vals;
  };

  let vals: Record<string, number>;
  if (effectiveLambda > 0) {
    vals = solveOnce();
    for (let iter = 0; iter < L1_ITERATIONS; iter++) {
      for (const [j, tie] of tieWeights.entries()) {
        const opacity = (vals[`mix ${j}`] ?? 0) / mult;
        variables[`mix ${j}`].error =
          tie + effectiveLambda / (opacity + L1_EPSILON);
      }
      vals = solveOnce();
    }
  } else {
    vals = solveOnce();
  }

  const opacities = rgbPool.map((_, i) =>
    Math.min((vals[`mix ${i}`] ?? 0) / mult, 1),
  );
  let slackSum = 0;
  for (const prop of ["r", "g", "b"] as const) {
    slackSum += vals[`slack ${prop}`] ?? 0;
  }
  const error = slackSum / (3 * 255);

  return {
    error,
    opacities,
    color: composeColors(opacities, rgbPool),
  };
}

/**
 * Subtractive linear composite of pool colors at given opacities over white.
 *
 * Splits out the compositing step so callers can re-render the preview against
 * a different pool of colors (e.g. user-chosen remaps) while keeping the
 * opacities optimized for the original separation pool.
 */
export function composeColors(
  opacities: readonly number[],
  pool: readonly ColorSpaceObject[],
): ColorSpaceObject {
  const rgbPool = pool.map((color) => color.rgb());
  const total = opacities.reduce((t, o) => t + o, 0);
  const init = 255 * (1 - total);
  const closest = d3color.rgb(init, init, init);
  for (const [i, color] of rgbPool.entries()) {
    const opacity = opacities[i];
    for (const prop of ["r", "g", "b"] as const) {
      closest[prop] += color[prop] * opacity;
    }
  }
  return closest.clamp();
}
