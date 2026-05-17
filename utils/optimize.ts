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

/**
 * Two-start (zeros + ones) coordinate descent over `n` variables on the unit
 * box. Sweeps until per-sweep error drops below `converge` or `sweeps` is
 * reached. Picks the lower-error start.
 */
export function multiStartCoordDescent(
  n: number,
  updateCoord: (i: number, alphas: number[]) => void,
  errorAt: (alphas: readonly number[]) => number,
  lambdaEff: number,
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
    const err = lastErr + lambdaEff * alphas.reduce((s, a) => s + a, 0);
    if (err < bestErr) {
      bestErr = err;
      best = alphas;
    }
  }
  return best;
}

/**
 * Brute-force grid search over `n` variables on a `(increments+1)^n` lattice.
 * Caller supplies an `errorAt` that integrates whatever per-mode forward and
 * sparsity penalty applies; an extra `lambdaEff * Σα` term is added on top.
 */
export function gridSearch(
  n: number,
  increments: number,
  lambdaEff: number,
  errorAt: (alphas: readonly number[]) => number,
): number[] {
  const m = increments + 1;
  const total = m ** n;
  const alphas = new Array<number>(n).fill(0);
  let bestAlphas = [...alphas];
  let bestErr = Infinity;
  for (let idx = 0; idx < total; idx++) {
    let r = idx;
    let alphaSum = 0;
    for (let i = 0; i < n; i++) {
      const step = r % m;
      r = Math.floor(r / m);
      alphas[i] = step / increments;
      alphaSum += alphas[i];
    }
    const err = errorAt(alphas) + lambdaEff * alphaSum;
    if (err < bestErr) {
      bestErr = err;
      bestAlphas = [...alphas];
    }
  }
  return bestAlphas;
}
