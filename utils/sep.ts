/**
 * Color separation: pick per-ink opacities so the composed result matches a
 * target. Three forward models are supported:
 *
 * - `subtractive`: order-independent linear-in-encoded-sRGB compositing.
 *   Non-physical but fits any target exactly via LP.
 * - `alpha_blend`: order-dependent layered alpha-over in linear sRGB.
 *   Coordinate descent with closed-form 1D updates.
 * - `kubelka_munk`: dithered-halftone physics via the Neugebauer-Demichel
 *   model layered on single-constant K-M, with optional fluorescence.
 */

import type { Color, Rgb } from "culori";
import {
  type ConstraintBound,
  type SolveResult,
  default as solver,
  type VariableCoefficients,
} from "javascript-lp-solver";
import {
  bytesToRgb,
  byteToLinear,
  colorBytes,
  type LinearRgb,
  linearToRgb,
  rgbToCulori,
} from "./color";
import { goldenMin, gridSearch, multiStartCoordDescent } from "./optimize";
import {
  ndForward,
  ndForwardXyz,
  ndPrimaries,
  ndPrimariesXyz,
  type SpectralLayer,
  spectrumToSrgb,
  xyzToLinearSrgb,
} from "./spectral";

/** Precomputed Neugebauer primaries for a layer set, shared across pixels. */
export interface KmCache {
  /** Number of inks in the pool (== log2(primaries.length)). */
  readonly n: number;
  readonly primaries: readonly Float64Array[];
  readonly primariesXyz: Float64Array;
}

export function buildKmCache(layers: readonly SpectralLayer[]): KmCache {
  const primaries = ndPrimaries(layers);
  return {
    n: layers.length,
    primaries,
    primariesXyz: ndPrimariesXyz(primaries),
  };
}

export const MIXING_MODES = [
  "subtractive",
  "alpha_blend",
  "kubelka_munk",
] as const;
export type MixingMode = (typeof MIXING_MODES)[number];
export function isMixingMode(value: string): value is MixingMode {
  return (MIXING_MODES as readonly string[]).includes(value);
}

export interface Result {
  error: number;
  color: Rgb;
  opacities: number[];
}

const L1_ITERATIONS = 4; // reweighted-L1 passes through the LP solver
const L1_EPSILON = 0.01; // L1 reweighting floor
const LAMBDA_SCALE = 255; // matches LP error scale (255-RGB units)

const ALPHA_SWEEPS = 30; // max coord-descent sweeps per start
const ALPHA_CONVERGE = 1e-5; // per-sweep improvement floor
const ALPHA_LAMBDA_SCALE = 0.1; // λ slider [0,1] → effective L1 weight
const ALPHA_GRID_BUDGET = 5000; // (increments+1)^N cap for exhaustive grid

function linearize(c: Color): LinearRgb {
  const { r, g, b } = colorBytes(c);
  return [byteToLinear(r), byteToLinear(g), byteToLinear(b)];
}

function delinearize(lin: LinearRgb): Rgb {
  return rgbToCulori(linearToRgb(lin));
}

/** Alpha-over forward pass starting from paper white (1,1,1) in linear sRGB. */
function alphaForward(
  opacities: readonly number[],
  poolLinear: readonly LinearRgb[],
): LinearRgb {
  let r = 1;
  let g = 1;
  let b = 1;
  for (let i = 0; i < opacities.length; i++) {
    const a = opacities[i];
    const [cr, cg, cb] = poolLinear[i];
    r = (1 - a) * r + a * cr;
    g = (1 - a) * g + a * cg;
    b = (1 - a) * b + a * cb;
  }
  return [r, g, b];
}

function squaredError(a: LinearRgb, b: LinearRgb): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/** Closed-form 1D update for coordinate i with all other opacities fixed. */
function updateAlpha(
  i: number,
  alphas: number[],
  target: LinearRgb,
  poolLinear: readonly LinearRgb[],
  lambdaEff: number,
): void {
  alphas[i] = 0;
  const f0 = alphaForward(alphas, poolLinear);
  alphas[i] = 1;
  const f1 = alphaForward(alphas, poolLinear);
  const d0 = f1[0] - f0[0];
  const d1 = f1[1] - f0[1];
  const d2 = f1[2] - f0[2];
  const denom = d0 * d0 + d1 * d1 + d2 * d2;
  if (denom < 1e-12) {
    alphas[i] = 0;
    return;
  }
  const t =
    (target[0] - f0[0]) * d0 +
    (target[1] - f0[1]) * d1 +
    (target[2] - f0[2]) * d2;
  // soft-threshold for L1 sparsity; clip to [0, 1]
  const numer = Math.max(0, t - lambdaEff / 2);
  alphas[i] = Math.min(1, numer / denom);
}

function alphaColorSeparation(
  target: Color,
  pool: readonly Color[],
  { increments, lambda }: { increments: number; lambda: number },
): Result {
  const targetLin = linearize(target);
  const poolLin = pool.map(linearize);
  const n = poolLin.length;
  const lambdaEff = lambda * ALPHA_LAMBDA_SCALE;
  const errorAt = (alphas: readonly number[]) =>
    squaredError(alphaForward(alphas, poolLin), targetLin);

  let opacities: number[];
  if (increments > 0 && (increments + 1) ** n <= ALPHA_GRID_BUDGET) {
    opacities = gridSearch(n, increments, lambdaEff, errorAt);
  } else {
    opacities = multiStartCoordDescent(
      n,
      (i, alphas) => updateAlpha(i, alphas, targetLin, poolLin, lambdaEff),
      errorAt,
      lambdaEff,
      ALPHA_SWEEPS,
      ALPHA_CONVERGE,
    );
    if (increments > 0) {
      opacities = opacities.map((a) => Math.round(a * increments) / increments);
    }
  }

  const result = alphaForward(opacities, poolLin);
  // Per-channel RMS in linear sRGB [0, 1] — same [0, 1] scale as the
  // subtractive path's L1 error so the two are roughly comparable.
  const error = Math.sqrt(squaredError(result, targetLin) / 3);
  return { error, opacities, color: delinearize(result) };
}

function alphaCompose(
  opacities: readonly number[],
  pool: readonly Color[],
): Rgb {
  return delinearize(alphaForward(opacities, pool.map(linearize)));
}

const KM_GOLDEN_ITERS = 18; // golden-section iterations per coord update
const KM_SWEEPS = 6; // max coord-descent sweeps per start
const KM_CONVERGE = 1e-4; // per-sweep improvement floor
const KM_LAMBDA_SCALE = 0.1; // λ slider [0,1] → effective L1 weight
const KM_GRID_BUDGET = 5000; // (increments+1)^N cap for exhaustive grid

function kmForwardLinear(
  opacities: readonly number[],
  primariesXyz: Float64Array,
): LinearRgb {
  const [X, Y, Z] = ndForwardXyz(opacities, primariesXyz);
  return xyzToLinearSrgb(X, Y, Z);
}

function kmColorSeparation(
  target: Color,
  n: number,
  cache: KmCache,
  { increments, lambda }: { increments: number; lambda: number },
): Result {
  const targetLin = linearize(target);
  const lambdaEff = lambda * KM_LAMBDA_SCALE;
  const errorAt = (alphas: readonly number[]) =>
    squaredError(kmForwardLinear(alphas, cache.primariesXyz), targetLin);

  let opacities: number[];
  if (increments > 0 && (increments + 1) ** n <= KM_GRID_BUDGET) {
    opacities = gridSearch(n, increments, lambdaEff, errorAt);
  } else {
    opacities = multiStartCoordDescent(
      n,
      (i, alphas) => {
        alphas[i] = goldenMin(
          (a) => {
            alphas[i] = a;
            return errorAt(alphas) + lambdaEff * a;
          },
          0,
          1,
          { iters: KM_GOLDEN_ITERS, tol: 1e-3, checkBoundaries: true },
        );
      },
      errorAt,
      lambdaEff,
      KM_SWEEPS,
      KM_CONVERGE,
    );
    if (increments > 0) {
      opacities = opacities.map((a) => Math.round(a * increments) / increments);
    }
  }

  const error = Math.sqrt(errorAt(opacities) / 3);
  return { error, opacities, color: kmCompose(opacities, cache) };
}

function kmCompose(opacities: readonly number[], cache: KmCache): Rgb {
  const [r, g, b] = spectrumToSrgb(ndForward(opacities, cache.primaries));
  return bytesToRgb(r, g, b);
}

interface CommonSepOpts {
  /** Opacities snap to multiples of 1 / increments when > 0. */
  readonly increments?: number;
  /** Sparsity penalty in [0, 1]. */
  readonly lambda?: number;
}

interface SubtractiveSepOpts extends CommonSepOpts {
  readonly mode: "subtractive";
}

interface AlphaBlendSepOpts extends CommonSepOpts {
  readonly mode: "alpha_blend";
}

interface KubelkaMunkSepOpts extends CommonSepOpts {
  readonly mode: "kubelka_munk";
  readonly cache: KmCache;
}

export type SeparationOptions =
  | SubtractiveSepOpts
  | AlphaBlendSepOpts
  | KubelkaMunkSepOpts;

/**
 * Solve for per-ink opacities that reproduce `target` under the chosen
 * mixing model. `pool` is the available inks in print order (paper-adjacent
 * first) for order-dependent modes; ignored for KM (the `cache` carries the
 * pre-stacked spectral primaries instead).
 */
export function colorSeparation(
  target: Color,
  pool: readonly Color[],
  opts: SeparationOptions = { mode: "subtractive" },
): Result {
  const increments = opts.increments ?? 0;
  const lambda = opts.lambda ?? 0;
  if (opts.mode === "kubelka_munk") {
    return kmColorSeparation(target, opts.cache.n, opts.cache, {
      increments,
      lambda,
    });
  }
  if (opts.mode === "alpha_blend") {
    return alphaColorSeparation(target, pool, { increments, lambda });
  }
  return subtractiveColorSeparation(target, pool, { increments, lambda });
}

function subtractiveColorSeparation(
  target: Color,
  pool: readonly Color[],
  { increments, lambda }: { increments: number; lambda: number },
): Result {
  const rgbTarget = colorBytes(target);
  const rgbPool = pool.map(colorBytes);

  const mult = Math.max(increments, 1);
  const tieBreak = 1e-7;
  const tieWeights = rgbPool.map(({ r, g, b }) => tieBreak * (r + g + b));

  const constraints: Record<string, ConstraintBound> = {};
  const variables: Record<string, VariableCoefficients> = {};
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
    }) as SolveResult;
    /* istanbul ignore if */
    if (!feasible || !bounded) {
      throw new Error("couldn't find bounded feasible solution");
    }
    return vals as Record<string, number>;
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
    color: subtractiveCompose(opacities, pool),
  };
}

/**
 * Compose `opacities` of `pool` over white into a single sRGB color under the
 * chosen mixing model. Used to render the preview (potentially against a
 * remapped pool) while keeping the opacities optimized for the original pool.
 */
export type ComposeOptions =
  | { readonly mode: "subtractive" }
  | { readonly mode: "alpha_blend" }
  | { readonly mode: "kubelka_munk"; readonly cache: KmCache };

export function composeColors(
  opacities: readonly number[],
  pool: readonly Color[],
  opts: ComposeOptions = { mode: "subtractive" },
): Rgb {
  if (opts.mode === "kubelka_munk") return kmCompose(opacities, opts.cache);
  if (opts.mode === "alpha_blend") return alphaCompose(opacities, pool);
  return subtractiveCompose(opacities, pool);
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

function subtractiveCompose(
  opacities: readonly number[],
  pool: readonly Color[],
): Rgb {
  const rgbPool = pool.map(colorBytes);
  const total = opacities.reduce((t, o) => t + o, 0);
  let r = 255 * (1 - total);
  let g = r;
  let b = r;
  for (const [i, color] of rgbPool.entries()) {
    const opacity = opacities[i];
    r += color.r * opacity;
    g += color.g * opacity;
    b += color.b * opacity;
  }
  return {
    mode: "rgb",
    r: clamp01(r / 255),
    g: clamp01(g / 255),
    b: clamp01(b / 255),
  };
}
