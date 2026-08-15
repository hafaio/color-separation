/**
 * Color separation: pick per-ink opacities so the composed result matches a
 * target. Three forward models are supported:
 *
 * - `subtractive`: order-independent linear-in-encoded-sRGB compositing.
 *   Non-physical but fits any target exactly via LP.
 * - `multiply`: inks as filters whose transmittances multiply, in linear sRGB.
 *   Order-independent. Coordinate descent with closed-form 1D updates.
 * - `kubelka_munk`: dithered-halftone physics via the Neugebauer-Demichel
 *   model layered on single-constant K-M, with optional fluorescence.
 *
 * The latter two optionally run through `press.ts`, which spreads each dot the
 * way a duplicator's screen does. `subtractive` never does: it is a declared
 * non-physical abstraction rather than a print prediction, and bolting press
 * physics onto it would only manufacture confidence it hasn't earned.
 *
 * With more inks than color dimensions the solution set is a manifold of
 * metamers, so plain least-squares happily spends six overlapping layers where
 * one ink would do. Every mode therefore picks the fewest inks whose composed
 * color still lands within `tolerance` ΔE00 of the best the whole pool can
 * manage — enumerating subsets for the iterative modes, and as a second LP
 * phase for `subtractive`.
 */

import { type Color, differenceCiede2000, type Rgb } from "culori";
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
  srgbEncode,
} from "./color";
import {
  gridSearch,
  minimizeQuadraticResiduals,
  multiStartCoordDescent,
} from "./optimize";
import { demichelWeights, effectiveCoverage } from "./press";
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
  "multiply",
  "kubelka_munk",
] as const;
export type MixingMode = (typeof MIXING_MODES)[number];
export function isMixingMode(value: string): value is MixingMode {
  return (MIXING_MODES as readonly string[]).includes(value);
}

export interface Result {
  /** Mode-native residual in roughly [0, 1]; used to compare print orders. */
  error: number;
  color: Rgb;
  opacities: number[];
  /** Pool indices carrying nonzero opacity, as a bitmask. */
  inkMask: number;
  /** ΔE00 between the target and `color`. */
  deltaE: number;
}

export interface MinInkResult extends Result {
  /** Largest ΔE00 accepted for this target: pool-best + tolerance. */
  deltaEBudget: number;
}

const deltaE2000 = differenceCiede2000();

/** ΔE00 slack absorbing float noise when testing against a budget. */
const BUDGET_EPSILON = 1e-6;
/** Coverage difference below which two subsets count as tied. */
const COVERAGE_EPSILON = 1e-9;
/** Above this pool size the 2^N subset sweep costs more than it saves. */
const SUBSET_POOL_CAP = 8;

/** Whether a candidate's ΔE00 is inside `budget`, tolerating float noise. */
export function withinBudget(deltaE: number, budget: number): boolean {
  return deltaE <= budget + BUDGET_EPSILON;
}

export function inkCount(mask: number): number {
  let count = 0;
  for (let bits = mask; bits !== 0; bits >>>= 1) count += bits & 1;
  return count;
}

/** Ascending pool indices of the inks set in `mask`. */
function maskInks(mask: number): number[] {
  const inks: number[] = [];
  for (let index = 0; 1 << index <= mask; index++) {
    if ((mask >> index) & 1) inks.push(index);
  }
  return inks;
}

/**
 * Below half a byte step a layer exports as blank, so anything under this is
 * numerical dust. Clearing it keeps ink masks honest — otherwise a 1e-18
 * residue reads as a distinct recipe and fragments the stabilization palette.
 */
const OPACITY_FLOOR = 1 / 510;

function pruneDust(opacities: number[]): number[] {
  for (const [index, opacity] of opacities.entries()) {
    if (opacity < OPACITY_FLOOR) opacities[index] = 0;
  }
  return opacities;
}

function opacityMask(opacities: readonly number[]): number {
  let mask = 0;
  for (const [index, opacity] of opacities.entries()) {
    if (opacity > 0) mask |= 1 << index;
  }
  return mask;
}

function totalCoverage(opacities: readonly number[]): number {
  return opacities.reduce((sum, opacity) => sum + opacity, 0);
}

const subsetsCache = new Map<number, readonly (readonly number[])[][]>();

/** Non-empty pool subsets grouped by size, ascending by bitmask within each. */
function subsetsBySize(poolSize: number): readonly (readonly number[])[][] {
  const cached = subsetsCache.get(poolSize);
  if (cached) {
    return cached;
  } else {
    const bySize: number[][][] = Array.from(
      { length: poolSize + 1 },
      (): number[][] => [],
    );
    for (let mask = 1; mask < 1 << poolSize; mask++) {
      bySize[inkCount(mask)].push(maskInks(mask));
    }
    subsetsCache.set(poolSize, bySize);
    return bySize;
  }
}

function linearize(c: Color): LinearRgb {
  const { r, g, b } = colorBytes(c);
  return [byteToLinear(r), byteToLinear(g), byteToLinear(b)];
}

function delinearize(lin: LinearRgb): Rgb {
  return rgbToCulori(linearToRgb(lin));
}

/**
 * Each ink is a filter: light passes down through every film, reflects off the
 * paper, and passes back up, so the layers' transmittances multiply. Coverage
 * `a` mixes each film's transmittance toward clear, which expands to the
 * Neugebauer-Demichel weights over multiplicative primaries.
 *
 * Ink colors are measured as solids on white paper, so the down-and-back trip
 * is already folded into them and needs no second factor here. Paper is
 * assumed white. Order-independent, unlike a real press, and it can only
 * darken — opaque and fluorescent inks are outside what it can express.
 */
function multiplyForward(
  opacities: readonly number[],
  poolLinear: readonly LinearRgb[],
): LinearRgb {
  let r = 1;
  let g = 1;
  let b = 1;
  for (let i = 0; i < opacities.length; i++) {
    const a = opacities[i];
    const [cr, cg, cb] = poolLinear[i];
    r *= 1 - a + a * cr;
    g *= 1 - a + a * cg;
    b *= 1 - a + a * cb;
  }
  return [r, g, b];
}

/**
 * The same stack under press simulation. Gain applies only where a dot meets
 * bare paper, so the plain product no longer factors; expanding the Demichel
 * weights against multiplicative primaries would cost 2^n terms. Splitting the
 * area instead by which ink lands on the paper first keeps it linear, because
 * everything printed after that ink sits on ink and so collapses back into an
 * ordinary nominal-coverage product.
 */
function multiplyPressForward(
  opacities: readonly number[],
  poolLinear: readonly LinearRgb[],
): LinearRgb {
  // `bare` is the stack as seen from paper no ink has reached yet; `above` the
  // plain product of every layer printed after the current one.
  let bareR = 1;
  let bareG = 1;
  let bareB = 1;
  let aboveR = 1;
  let aboveG = 1;
  let aboveB = 1;
  for (let index = opacities.length - 1; index >= 0; index--) {
    const nominal = opacities[index];
    const gained = effectiveCoverage(nominal);
    const [cr, cg, cb] = poolLinear[index];
    bareR = (1 - gained) * bareR + gained * cr * aboveR;
    bareG = (1 - gained) * bareG + gained * cg * aboveG;
    bareB = (1 - gained) * bareB + gained * cb * aboveB;
    aboveR *= 1 - nominal + nominal * cr;
    aboveG *= 1 - nominal + nominal * cg;
    aboveB *= 1 - nominal + nominal * cb;
  }
  return [bareR, bareG, bareB];
}

function squaredError(a: LinearRgb, b: LinearRgb): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

/**
 * Without press simulation both iterative forwards are exactly affine in a
 * single opacity with the rest held fixed, so the least-squares optimum for
 * that coordinate is the target's projection onto the segment from the α=0
 * forward to the α=1 forward, clamped back into the unit interval.
 */
function projectAlpha(
  target: LinearRgb,
  at0: LinearRgb,
  at1: LinearRgb,
): number {
  const dr = at1[0] - at0[0];
  const dg = at1[1] - at0[1];
  const db = at1[2] - at0[2];
  const denom = dr * dr + dg * dg + db * db;
  if (denom < 1e-12) {
    return 0;
  } else {
    const dot =
      (target[0] - at0[0]) * dr +
      (target[1] - at0[1]) * dg +
      (target[2] - at0[2]) * db;
    return clamp01(dot / denom);
  }
}

// Per-channel coefficients of F(α) − target, reused across coordinate updates.
const quadraticOffset = [0, 0, 0];
const quadraticLinear = [0, 0, 0];
const quadraticSquare = [0, 0, 0];

/**
 * With press simulation a coordinate enters its forward twice — as f(α) over
 * paper and as α over ink — so the forward is quadratic in α rather than a
 * segment, and least squares against it is a quartic. Recover the quadratic
 * from three evaluations and minimize the quartic exactly: its derivative is a
 * cubic, so the optimum is among that cubic's real roots and the two
 * endpoints.
 */
function projectAlphaQuadratic(
  target: LinearRgb,
  at0: LinearRgb,
  atHalf: LinearRgb,
  at1: LinearRgb,
): number {
  for (let axis = 0; axis < 3; axis++) {
    quadraticOffset[axis] = at0[axis] - target[axis];
    quadraticLinear[axis] = 4 * atHalf[axis] - 3 * at0[axis] - at1[axis];
    quadraticSquare[axis] = 2 * at0[axis] + 2 * at1[axis] - 4 * atHalf[axis];
  }
  return minimizeQuadraticResiduals(
    quadraticOffset,
    quadraticLinear,
    quadraticSquare,
  );
}

function updateCoord(
  index: number,
  alphas: number[],
  target: LinearRgb,
  forward: (alphas: readonly number[]) => LinearRgb,
  press: boolean,
): void {
  alphas[index] = 0;
  const at0 = forward(alphas);
  alphas[index] = 1;
  const at1 = forward(alphas);
  if (press) {
    alphas[index] = 0.5;
    const atHalf = forward(alphas);
    alphas[index] = projectAlphaQuadratic(target, at0, atHalf, at1);
  } else {
    alphas[index] = projectAlpha(target, at0, at1);
  }
}

interface CoordTuning {
  /** (increments+1)^k cap under which the exhaustive lattice is affordable. */
  readonly gridBudget: number;
  /** Max coordinate-descent sweeps per start. */
  readonly sweeps: number;
  /** Per-sweep improvement floor. */
  readonly converge: number;
}

const MULTIPLY_TUNING: CoordTuning = {
  gridBudget: 5000,
  sweeps: 30,
  converge: 1e-5,
};
const KM_TUNING: CoordTuning = { gridBudget: 5000, sweeps: 6, converge: 1e-4 };

function solveCoords(
  count: number,
  increments: number,
  tuning: CoordTuning,
  updateCoord: (index: number, alphas: number[]) => void,
  errorAt: (alphas: readonly number[]) => number,
): number[] {
  if (increments > 0 && (increments + 1) ** count <= tuning.gridBudget) {
    return gridSearch(count, increments, errorAt);
  } else {
    const alphas = multiStartCoordDescent(
      count,
      updateCoord,
      errorAt,
      tuning.sweeps,
      tuning.converge,
    );
    return pruneDust(
      increments > 0
        ? alphas.map((a) => Math.round(a * increments) / increments)
        : alphas,
    );
  }
}

/** Opacities for `inks` (ascending pool indices); every other ink stays at 0. */
type RestrictedSolver = (inks: readonly number[]) => number[];

function expandOpacities(
  sub: readonly number[],
  inks: readonly number[],
  poolSize: number,
): number[] {
  const full = new Array<number>(poolSize).fill(0);
  for (const [slot, ink] of inks.entries()) full[ink] = sub[slot];
  return full;
}

/**
 * Everything the subset search needs from a mixing mode: how to solve a
 * restricted ink set, and how to score the resulting opacities.
 */
interface ModeSolver {
  readonly poolSize: number;
  readonly solve: RestrictedSolver;
  /** ΔE00 between the target and what `opacities` compose to. */
  readonly deltaEOf: (opacities: readonly number[]) => number;
  readonly compose: (opacities: readonly number[]) => Rgb;
  /** The mode's native residual, reported as `Result.error`. */
  readonly errorOf: (opacities: readonly number[]) => number;
}

function kmForwardLinear(
  opacities: readonly number[],
  primariesXyz: Float64Array,
  press: boolean,
  weights: Float64Array,
): LinearRgb {
  const [X, Y, Z] = ndForwardXyz(
    demichelWeights(opacities, press, weights),
    primariesXyz,
  );
  return xyzToLinearSrgb(X, Y, Z);
}

/**
 * Neugebauer primaries for an ink subset, gathered out of the full-pool cache.
 * Pinning an ink to α=0 zeroes the weight of every mask containing it, so the
 * subset's primaries are exactly the full-pool entries whose masks fit inside
 * the subset — 2^k of them instead of 2^N to sum over per evaluation.
 */
function subsetPrimariesXyz(
  primariesXyz: Float64Array,
  inks: readonly number[],
): Float64Array {
  const size = 1 << inks.length;
  const out = new Float64Array(size * 3);
  for (let sub = 0; sub < size; sub++) {
    let full = 0;
    for (let bit = 0; bit < inks.length; bit++) {
      if ((sub >> bit) & 1) full |= 1 << inks[bit];
    }
    out[sub * 3] = primariesXyz[full * 3];
    out[sub * 3 + 1] = primariesXyz[full * 3 + 1];
    out[sub * 3 + 2] = primariesXyz[full * 3 + 2];
  }
  return out;
}

/** Unrounded sRGB, so budget comparisons don't step in 1/255 jumps. */
function linearToCulori(lin: LinearRgb): Rgb {
  const [r, g, b] = lin;
  return {
    mode: "rgb",
    r: srgbEncode(r),
    g: srgbEncode(g),
    b: srgbEncode(b),
  };
}

function kmModeSolver(
  target: Color,
  cache: KmCache,
  increments: number,
  press: boolean,
): ModeSolver {
  const targetLinear = linearize(target);
  const poolWeights = new Float64Array(1 << cache.n);
  const poolForward = (opacities: readonly number[]): LinearRgb =>
    kmForwardLinear(opacities, cache.primariesXyz, press, poolWeights);
  return {
    poolSize: cache.n,
    solve: (inks) => {
      const primariesXyz =
        inks.length === cache.n
          ? cache.primariesXyz
          : subsetPrimariesXyz(cache.primariesXyz, inks);
      // One scratch buffer per subset solve, reused across every evaluation.
      const weights = new Float64Array(1 << inks.length);
      const forward = (alphas: readonly number[]): LinearRgb =>
        kmForwardLinear(alphas, primariesXyz, press, weights);
      const errorAt = (alphas: readonly number[]): number =>
        squaredError(forward(alphas), targetLinear);
      const sub = solveCoords(
        inks.length,
        increments,
        KM_TUNING,
        (index, alphas) =>
          updateCoord(index, alphas, targetLinear, forward, press),
        errorAt,
      );
      return expandOpacities(sub, inks, cache.n);
    },
    deltaEOf: (opacities) =>
      deltaE2000(target, linearToCulori(poolForward(opacities))),
    compose: (opacities) => kmCompose(opacities, cache, press),
    errorOf: (opacities) =>
      Math.sqrt(squaredError(poolForward(opacities), targetLinear) / 3),
  };
}

function alphaModeSolver(
  target: Color,
  pool: readonly Color[],
  increments: number,
  press: boolean,
): ModeSolver {
  const targetLinear = linearize(target);
  const poolLinear = pool.map(linearize);
  const multiply = press ? multiplyPressForward : multiplyForward;
  return {
    poolSize: poolLinear.length,
    solve: (inks) => {
      const subPool = inks.map((ink) => poolLinear[ink]);
      const forward = (alphas: readonly number[]): LinearRgb =>
        multiply(alphas, subPool);
      const errorAt = (alphas: readonly number[]): number =>
        squaredError(forward(alphas), targetLinear);
      const sub = solveCoords(
        inks.length,
        increments,
        MULTIPLY_TUNING,
        (index, alphas) =>
          updateCoord(index, alphas, targetLinear, forward, press),
        errorAt,
      );
      return expandOpacities(sub, inks, poolLinear.length);
    },
    deltaEOf: (opacities) =>
      deltaE2000(target, linearToCulori(multiply(opacities, poolLinear))),
    compose: (opacities) => delinearize(multiply(opacities, poolLinear)),
    // Per-channel RMS in linear sRGB [0, 1] — same [0, 1] scale as the
    // subtractive path's L1 error so the two are roughly comparable.
    errorOf: (opacities) =>
      Math.sqrt(
        squaredError(multiply(opacities, poolLinear), targetLinear) / 3,
      ),
  };
}

function modeResult(mode: ModeSolver, opacities: number[]): Result {
  return {
    error: mode.errorOf(opacities),
    color: mode.compose(opacities),
    opacities,
    inkMask: opacityMask(opacities),
    deltaE: mode.deltaEOf(opacities),
  };
}

/**
 * Smallest ink subset whose fit stays within `tolerance` ΔE00 of the whole
 * pool's, ties broken by total coverage then by lowest subset bitmask. Falls
 * back to the full pool when nothing qualifies.
 */
function minInkResult(mode: ModeSolver, tolerance: number): MinInkResult {
  const { poolSize } = mode;
  const allInks = Array.from({ length: poolSize }, (_, index) => index);
  const fullOpacities = mode.solve(allInks);
  const deltaEBudget = mode.deltaEOf(fullOpacities) + tolerance;
  if (poolSize <= SUBSET_POOL_CAP) {
    const bySize = subsetsBySize(poolSize);
    for (let size = 1; size < poolSize; size++) {
      let best: number[] | undefined;
      let bestCoverage = Infinity;
      for (const inks of bySize[size]) {
        const opacities = mode.solve(inks);
        if (!withinBudget(mode.deltaEOf(opacities), deltaEBudget)) continue;
        const coverage = totalCoverage(opacities);
        if (coverage < bestCoverage - COVERAGE_EPSILON) {
          best = opacities;
          bestCoverage = coverage;
        }
      }
      if (best) return budgeted(modeResult(mode, best), deltaEBudget);
    }
  }
  return budgeted(modeResult(mode, fullOpacities), deltaEBudget);
}

/** A budget below the result's own ΔE00 would reject the result itself. */
function budgeted(result: Result, deltaEBudget: number): MinInkResult {
  return { ...result, deltaEBudget: Math.max(deltaEBudget, result.deltaE) };
}

function kmCompose(
  opacities: readonly number[],
  cache: KmCache,
  press: boolean,
): Rgb {
  const [r, g, b] = spectrumToSrgb(
    ndForward(demichelWeights(opacities, press), cache.primaries),
  );
  return bytesToRgb(r, g, b);
}

interface CommonSepOpts {
  /** Opacities snap to multiples of 1 / increments when > 0. */
  readonly increments?: number;
  /** ΔE00 a color may drift from its best fit to save ink layers. */
  readonly tolerance?: number;
}

interface SubtractiveSepOpts extends CommonSepOpts {
  readonly mode: "subtractive";
}

/** Simulate halftone dot gain and trapping; see `press.ts`. Off by default. */
interface PressSepOpt {
  readonly press?: boolean;
}

interface AlphaBlendSepOpts extends CommonSepOpts, PressSepOpt {
  readonly mode: "multiply";
}

interface KubelkaMunkSepOpts extends CommonSepOpts, PressSepOpt {
  readonly mode: "kubelka_munk";
  readonly cache: KmCache;
}

export type SeparationOptions =
  | SubtractiveSepOpts
  | AlphaBlendSepOpts
  | KubelkaMunkSepOpts;

function modeSolverFor(
  target: Color,
  pool: readonly Color[],
  opts: SeparationOptions,
  increments: number,
): ModeSolver {
  const press = opts.mode === "subtractive" ? false : (opts.press ?? false);
  return opts.mode === "kubelka_munk"
    ? kmModeSolver(target, opts.cache, increments, press)
    : alphaModeSolver(target, pool, increments, press);
}

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
): MinInkResult {
  const increments = opts.increments ?? 0;
  if (opts.mode === "subtractive") {
    const allInks = (1 << pool.length) - 1;
    return subtractiveMasked(target, pool, increments, allInks);
  } else {
    return minInkResult(
      modeSolverFor(target, pool, opts, increments),
      opts.tolerance ?? 0,
    );
  }
}

/**
 * Solve `target` using only the inks in `inkMask`, as accurately as that
 * subset allows. Callers that already know which recipe they want (print-order
 * racing, recipe stabilization) use this instead of paying for the subset
 * sweep.
 */
export function separateWithMask(
  target: Color,
  pool: readonly Color[],
  opts: SeparationOptions,
  inkMask: number,
): Result {
  const increments = opts.increments ?? 0;
  if (opts.mode === "subtractive") {
    return subtractiveMasked(target, pool, increments, inkMask);
  } else {
    const mode = modeSolverFor(target, pool, opts, increments);
    return modeResult(mode, mode.solve(maskInks(inkMask)));
  }
}

/** Objective weight separating otherwise-tied LP solutions. */
const TIE_BREAK = 1e-7;

const CHANNELS = ["r", "g", "b"] as const;

/**
 * Fit `target` as closely as `inkMask` allows by minimizing total channel
 * slack. Unlike the other modes this doesn't trade accuracy for fewer inks:
 * the linear model already reproduces most targets exactly, so there is no
 * metamer spread to collapse, and ΔE00 has no faithful linear image in the
 * LP's 255-scale slack units to spend a budget against.
 */
function subtractiveMasked(
  target: Color,
  pool: readonly Color[],
  increments: number,
  inkMask: number,
): MinInkResult {
  const rgbTarget = colorBytes(target);
  const rgbPool = pool.map(colorBytes);
  const mult = Math.max(increments, 1);

  const constraints: Record<string, ConstraintBound> = {};
  const variables: Record<string, VariableCoefficients> = {};
  const ints: Record<string, 1> = {};

  for (const [index, ink] of rgbPool.entries()) {
    const bound = `mx ${index}`;
    constraints[bound] = { max: (inkMask >> index) & 1 ? mult : 0 };
    variables[`mix ${index}`] = {
      error: TIE_BREAK * (ink.r + ink.g + ink.b),
      [bound]: 1,
    };
    if (increments > 0) ints[`mix ${index}`] = 1;
  }

  for (const prop of CHANNELS) {
    const channel = 255 - rgbTarget[prop];

    const up = `up ${prop}`;
    constraints[up] = { max: channel };

    const dn = `dn ${prop}`;
    constraints[dn] = { min: channel };

    variables[`slack ${prop}`] = { error: 1, [up]: -1, [dn]: 1 };

    for (const [index, ink] of rgbPool.entries()) {
      const sep = (255 - ink[prop]) / mult;
      variables[`mix ${index}`][up] = sep;
      variables[`mix ${index}`][dn] = sep;
    }
  }

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

  const readOpacities = (vals: Record<string, number>): number[] =>
    pruneDust(
      rgbPool.map((_, index) =>
        Math.min((vals[`mix ${index}`] ?? 0) / mult, 1),
      ),
    );

  const opacities = readOpacities(solveOnce());
  const color = subtractiveCompose(opacities, pool);
  const composed = colorBytes(color);
  let residual = 0;
  for (const prop of CHANNELS) {
    residual += Math.abs(composed[prop] - rgbTarget[prop]);
  }
  const deltaE = deltaE2000(target, color);

  return budgeted(
    {
      error: residual / (3 * 255),
      color,
      opacities,
      inkMask: opacityMask(opacities),
      deltaE,
    },
    deltaE,
  );
}

/**
 * Compose `opacities` of `pool` over white into a single sRGB color under the
 * chosen mixing model. Used to render the preview (potentially against a
 * remapped pool) while keeping the opacities optimized for the original pool.
 */
export type ComposeOptions =
  | { readonly mode: "subtractive" }
  | ({ readonly mode: "multiply" } & PressSepOpt)
  | ({ readonly mode: "kubelka_munk"; readonly cache: KmCache } & PressSepOpt);

export function composeColors(
  opacities: readonly number[],
  pool: readonly Color[],
  opts: ComposeOptions = { mode: "subtractive" },
): Rgb {
  if (opts.mode === "kubelka_munk")
    return kmCompose(opacities, opts.cache, opts.press ?? false);
  if (opts.mode === "multiply") {
    const multiply = opts.press ? multiplyPressForward : multiplyForward;
    return delinearize(multiply(opacities, pool.map(linearize)));
  }
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
