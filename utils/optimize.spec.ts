import { expect, test } from "bun:test";
import { goldenMin, minimizeQuadraticResiduals } from "./optimize";

/** Deterministic PRNG so a failure is reproducible. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function residualError(
  offset: readonly number[],
  linear: readonly number[],
  square: readonly number[],
  x: number,
): number {
  let total = 0;
  for (const [axis, off] of offset.entries()) {
    total += (off + x * (linear[axis] + x * square[axis])) ** 2;
  }
  return total;
}

test("closed-form quartic minimum beats golden section", () => {
  const random = mulberry32(20260815);
  for (let trial = 0; trial < 500; trial++) {
    const axes = 3;
    const offset: number[] = [];
    const linear: number[] = [];
    const square: number[] = [];
    for (let axis = 0; axis < axes; axis++) {
      offset.push(random() * 2 - 1);
      linear.push(random() * 4 - 2);
      square.push(random() * 4 - 2);
    }
    const errorAt = (x: number): number =>
      residualError(offset, linear, square, x);
    const closed = minimizeQuadraticResiduals(offset, linear, square);
    const golden = goldenMin(errorAt, 0, 1, {
      iters: 200,
      tol: 1e-12,
      checkBoundaries: true,
    });
    expect(closed).toBeGreaterThanOrEqual(0);
    expect(closed).toBeLessThanOrEqual(1);
    // Golden section only finds a local minimum, so the closed form is allowed
    // to be strictly better but never worse.
    expect(errorAt(closed)).toBeLessThanOrEqual(errorAt(golden) + 1e-12);
  }
});

test("degenerate coefficients fall back to the lower-degree solve", () => {
  // No square term: the objective is a plain parabola with an interior vertex.
  expect(
    minimizeQuadraticResiduals([-1, 0, 0], [2, 0, 0], [0, 0, 0]),
  ).toBeCloseTo(0.5, 12);
  // Nothing depends on x at all — the whole interval ties, so keep the low end.
  expect(minimizeQuadraticResiduals([1, 1, 1], [0, 0, 0], [0, 0, 0])).toBe(0);
  // Unconstrained minimum sits outside [0, 1] and clamps to the endpoint.
  expect(minimizeQuadraticResiduals([-4, 0, 0], [1, 0, 0], [0, 0, 0])).toBe(1);
});
