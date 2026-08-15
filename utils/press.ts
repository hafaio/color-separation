/**
 * Halftone press behavior: how a nominal coverage becomes the area a dot
 * actually covers, and how that area stacks when a dot lands on ink instead
 * of paper.
 *
 * A duplicator screens continuous tone at roughly 71 lpi and the dots spread
 * on uncoated absorbent stock, so nominal 50% prints much darker than 50% of
 * the solid. That spread is modeled as a tone-value-increase curve pinned at
 * f(0) = 0 and f(1) = 1 with its gain peaking at midtone — the ISO 12647 bell,
 * written as the quadratic that is invertible in closed form:
 *
 *   f(a) = a + 4·DELTA_50·a·(1 − a)
 *
 * Yule-Nielsen is the usual alternative and is deliberately not used: raising
 * each band to 1/n before mixing and back to n after destroys the segment
 * structure the solver's per-coordinate updates rely on, and fitting n would
 * claim a full spectral nonlinearity from the single tint level the reference
 * chart actually measures.
 */

/**
 * Tone-value increase at midtone, i.e. f(0.5) = 0.5 + DELTA_50.
 *
 * Bracketed at [0.20, 0.30] rather than measured: it comes from one
 * photographed chart — one machine, one paper, one screen ruling — read
 * against a ~2 ΔE00 noise floor, which is tier-(c) evidence in the same sense
 * as the `scatter` magnitudes in `inks.ts`. Only the 50% level is observed at
 * all; the curve's shape everywhere else is the ISO 12647 assumption, not a
 * finding.
 */
export const DELTA_50 = 0.25;

const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Nominal coverage → the area its dots actually cover. */
export function effectiveCoverage(nominal: number): number {
  return nominal + 4 * DELTA_50 * nominal * (1 - nominal);
}

/** Inverse of `effectiveCoverage`, i.e. the screen value that prints as it. */
export function inverseCoverage(effective: number): number {
  const gain = 4 * DELTA_50;
  const linear = 1 + gain;
  const root = Math.sqrt(linear * linear - 4 * gain * effective);
  return clamp01((linear - root) / (2 * gain));
}

/**
 * Neugebauer-Demichel area weights over ink subsets, indexed by bitmask, for
 * `coverages` given in print order (paper-adjacent first). Writes into `out`
 * so hot loops can reuse one buffer; the weights always sum to 1.
 *
 * With `press` on, dot gain applies over bare paper only: fibers already
 * carrying ink have nothing left to wick the next dot outward, so a dot
 * printed onto ink transfers at its nominal area. That rule has no fitted
 * constant of its own — jointly fitting a global gain against a global trap
 * factor on 870 overprint pairs put their product back at nominal, which is
 * exactly what applying gain on paper alone produces.
 */
export function demichelWeights(
  coverages: readonly number[],
  press: boolean,
  out: Float64Array = new Float64Array(1 << coverages.length),
): Float64Array {
  const total = 1 << coverages.length;
  out.fill(0, 0, total);
  out[0] = 1;
  for (const [index, nominal] of coverages.entries()) {
    const gained = press ? effectiveCoverage(nominal) : nominal;
    const bit = 1 << index;
    // Only masks below `bit` are populated yet, and each split writes strictly
    // above the mask it reads, so a single descending pass never clobbers.
    for (let mask = bit - 1; mask >= 0; mask--) {
      const weight = out[mask];
      if (weight === 0) continue;
      const coverage = mask === 0 ? gained : nominal;
      out[mask | bit] = weight * coverage;
      out[mask] = weight * (1 - coverage);
    }
  }
  return out;
}
