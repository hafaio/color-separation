/**
 * 1D golden-section minimization on a closed interval. When
 * `checkBoundaries` is set, also evaluates `f` at the original endpoints —
 * needed for step-shaped or monotone objectives where the true minimum sits
 * on the boundary (golden section alone only probes interior points).
 */
export function goldenMin(
  f: (x: number) => number,
  lo: number,
  hi: number,
  {
    iters = 30,
    tol = 1e-4,
    checkBoundaries = false,
  }: { iters?: number; tol?: number; checkBoundaries?: boolean } = {},
): number {
  const origLo = lo;
  const origHi = hi;
  const phi = (Math.sqrt(5) - 1) / 2;
  let x1 = hi - phi * (hi - lo);
  let x2 = lo + phi * (hi - lo);
  let f1 = f(x1);
  let f2 = f(x2);
  for (let i = 0; i < iters; i++) {
    if (f1 < f2) {
      hi = x2;
      x2 = x1;
      f2 = f1;
      x1 = hi - phi * (hi - lo);
      f1 = f(x1);
    } else {
      lo = x1;
      x1 = x2;
      f1 = f2;
      x2 = lo + phi * (hi - lo);
      f2 = f(x2);
    }
    if (hi - lo < tol) break;
  }
  const interior = (lo + hi) / 2;
  if (!checkBoundaries) return interior;
  const fInterior = f(interior);
  const fLo = f(origLo);
  const fHi = f(origHi);
  let bestX = interior;
  let bestF = fInterior;
  if (fLo < bestF) {
    bestX = origLo;
    bestF = fLo;
  }
  if (fHi < bestF) bestX = origHi;
  return bestX;
}

/** Coefficient magnitude below which a leading term is treated as absent. */
const LEADING_EPSILON = 1e-12;

/** Reused across calls: the solve runs per coordinate in the inner loop. */
const rootBuffer = [0, 0, 0];

/**
 * Argument in [0, 1] minimizing `Σ (offset + linear·x + square·x²)²` over the
 * supplied axes. The objective is a quartic, so every stationary point is a
 * real root of its cubic derivative, and the constrained minimum is exactly
 * the best of those roots and the two endpoints.
 */
export function minimizeQuadraticResiduals(
  offset: readonly number[],
  linear: readonly number[],
  square: readonly number[],
): number {
  let cubic = 0;
  let quadratic = 0;
  let slope = 0;
  let constant = 0;
  for (let axis = 0; axis < offset.length; axis++) {
    cubic += 2 * square[axis] ** 2;
    quadratic += 3 * linear[axis] * square[axis];
    slope += linear[axis] ** 2 + 2 * offset[axis] * square[axis];
    constant += offset[axis] * linear[axis];
  }
  const roots = cubicRoots(cubic, quadratic, slope, constant, rootBuffer);
  let best = 0;
  let bestError = residualError(offset, linear, square, 0);
  // The endpoint at 1 is the last candidate after the interior roots.
  for (let index = 0; index <= roots; index++) {
    const candidate = index === roots ? 1 : rootBuffer[index];
    if (candidate < 0 || candidate > 1) continue;
    const error = residualError(offset, linear, square, candidate);
    if (error < bestError) {
      bestError = error;
      best = candidate;
    }
  }
  return best;
}

function residualError(
  offset: readonly number[],
  linear: readonly number[],
  square: readonly number[],
  x: number,
): number {
  let total = 0;
  for (let axis = 0; axis < offset.length; axis++) {
    total += (offset[axis] + x * (linear[axis] + x * square[axis])) ** 2;
  }
  return total;
}

/**
 * Real roots of `cubic·x³ + square·x² + linear·x + offset`, written into `out`
 * and counted by the return value. Degenerates to the quadratic and linear
 * cases as the leading coefficients vanish — which they do exactly, not just
 * nearly, whenever the caller's problem is really of lower degree. Roots come
 * out unsorted and may repeat.
 */
function cubicRoots(
  cubic: number,
  square: number,
  linear: number,
  offset: number,
  out: number[],
): number {
  const scale = Math.max(
    Math.abs(cubic),
    Math.abs(square),
    Math.abs(linear),
    Math.abs(offset),
  );
  if (scale === 0) {
    return 0;
  } else if (Math.abs(cubic) < LEADING_EPSILON * scale) {
    return quadraticRoots(square, linear, offset, scale, out);
  } else {
    // Depress to t³ + p·t + q with x = t − shift, then Cardano / trigonometry
    // depending on how many real roots the discriminant admits.
    const b = square / cubic;
    const c = linear / cubic;
    const d = offset / cubic;
    const shift = b / 3;
    const p = c - (b * b) / 3;
    const q = (2 * b * b * b) / 27 - (b * c) / 3 + d;
    const discriminant = (q * q) / 4 + (p * p * p) / 27;
    if (discriminant > 0) {
      const root = Math.sqrt(discriminant);
      out[0] = Math.cbrt(-q / 2 + root) + Math.cbrt(-q / 2 - root) - shift;
      return 1;
    } else if (p > -LEADING_EPSILON) {
      out[0] = -shift;
      return 1;
    } else {
      const radius = Math.sqrt((-p * p * p) / 27);
      const phi = Math.acos(Math.max(-1, Math.min(1, -q / (2 * radius))));
      const amplitude = 2 * Math.sqrt(-p / 3);
      for (let k = 0; k < 3; k++) {
        out[k] = amplitude * Math.cos((phi - 2 * Math.PI * k) / 3) - shift;
      }
      return 3;
    }
  }
}

function quadraticRoots(
  square: number,
  linear: number,
  offset: number,
  scale: number,
  out: number[],
): number {
  if (Math.abs(square) < LEADING_EPSILON * scale) {
    if (Math.abs(linear) < LEADING_EPSILON * scale) {
      return 0;
    } else {
      out[0] = -offset / linear;
      return 1;
    }
  } else {
    const discriminant = linear * linear - 4 * square * offset;
    if (discriminant < 0) {
      return 0;
    } else {
      const root = Math.sqrt(discriminant);
      out[0] = (-linear + root) / (2 * square);
      out[1] = (-linear - root) / (2 * square);
      return 2;
    }
  }
}

/**
 * Two-start (zeros + ones) coordinate descent over `n` variables on the unit
 * box. Sweeps until per-sweep error drops below `converge` or `sweeps` is
 * reached. Picks the lower-error start.
 */
export function multiStartCoordDescent(
  n: number,
  updateCoord: (i: number, alphas: number[]) => void,
  errorAt: (alphas: readonly number[]) => number,
  sweeps: number,
  converge: number,
): number[] {
  const starts: number[][] = [new Array(n).fill(0), new Array(n).fill(1)];
  let best: number[] = starts[0];
  let bestErr = Infinity;
  for (const start of starts) {
    const alphas = [...start];
    let lastErr = errorAt(alphas);
    for (let sweep = 0; sweep < sweeps; sweep++) {
      for (let i = 0; i < n; i++) updateCoord(i, alphas);
      const afterErr = errorAt(alphas);
      if (lastErr - afterErr < converge) {
        lastErr = afterErr;
        break;
      }
      lastErr = afterErr;
    }
    if (lastErr < bestErr) {
      bestErr = lastErr;
      best = alphas;
    }
  }
  return best;
}

/**
 * Brute-force grid search over `n` variables on a `(increments+1)^n` lattice.
 * Caller supplies an `errorAt` that integrates whatever per-mode forward
 * applies.
 */
export function gridSearch(
  n: number,
  increments: number,
  errorAt: (alphas: readonly number[]) => number,
): number[] {
  const m = increments + 1;
  const total = m ** n;
  const alphas = new Array<number>(n).fill(0);
  let bestAlphas = [...alphas];
  let bestErr = Infinity;
  for (let idx = 0; idx < total; idx++) {
    let r = idx;
    for (let i = 0; i < n; i++) {
      const step = r % m;
      r = Math.floor(r / m);
      alphas[i] = step / increments;
    }
    const err = errorAt(alphas);
    if (err < bestErr) {
      bestErr = err;
      bestAlphas = [...alphas];
    }
  }
  return bestAlphas;
}
