import { expect, test } from "bun:test";
import { differenceCiede2000, type Rgb } from "culori";
import { bytesToRgb, srgbDecode, srgbEncode } from "./color";
import {
  DELTA_50,
  demichelWeights,
  effectiveCoverage,
  inverseCoverage,
} from "./press";
import { CHART_CELLS, CHART_INKS, CHART_PAPER } from "./risolve-chart";
import { composeColors } from "./sep";

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

/** The expansion the solver used before press simulation existed. */
function plainDemichel(coverages: readonly number[]): number[] {
  return Array.from({ length: 1 << coverages.length }, (_, mask) =>
    coverages.reduce(
      (weight, coverage, index) =>
        weight * ((mask >> index) & 1 ? coverage : 1 - coverage),
      1,
    ),
  );
}

test("the coverage curve is pinned at the endpoints and inverts", () => {
  expect(effectiveCoverage(0)).toBe(0);
  expect(effectiveCoverage(1)).toBe(1);
  expect(effectiveCoverage(0.5)).toBeCloseTo(0.5 + DELTA_50, 12);
  const random = mulberry32(4242);
  for (let trial = 0; trial < 200; trial++) {
    const nominal = random();
    expect(effectiveCoverage(nominal)).toBeGreaterThanOrEqual(nominal);
    expect(inverseCoverage(effectiveCoverage(nominal))).toBeCloseTo(
      nominal,
      10,
    );
  }
});

test("weights sum to one whatever the coverages", () => {
  const random = mulberry32(1234);
  for (let inks = 1; inks <= 6; inks++) {
    for (let trial = 0; trial < 50; trial++) {
      const coverages = Array.from({ length: inks }, () => random());
      for (const press of [false, true]) {
        const weights = demichelWeights(coverages, press);
        let total = 0;
        for (const weight of weights) {
          expect(weight).toBeGreaterThanOrEqual(0);
          total += weight;
        }
        expect(total).toBeCloseTo(1, 12);
      }
    }
  }
});

test("without press the weights are the plain Demichel expansion", () => {
  const random = mulberry32(99);
  for (let inks = 1; inks <= 6; inks++) {
    for (let trial = 0; trial < 50; trial++) {
      const coverages = Array.from({ length: inks }, () => random());
      const expected = plainDemichel(coverages);
      const actual = demichelWeights(coverages, false);
      for (const [mask, weight] of expected.entries()) {
        expect(actual[mask]).toBeCloseTo(weight, 12);
      }
    }
  }
});

test("gain applies over paper and not over ink", () => {
  // Alone over paper, a dot spreads to its gained area.
  expect(demichelWeights([0.5], true)[1]).toBeCloseTo(
    effectiveCoverage(0.5),
    12,
  );
  // Printed over a solid there is no bare paper left, so the same dot covers
  // its nominal area — mask 3 is the overlap, mask 1 the solid showing through.
  const overSolid = demichelWeights([1, 0.5], true);
  expect(overSolid[3]).toBeCloseTo(0.5, 12);
  expect(overSolid[1]).toBeCloseTo(0.5, 12);
  expect(overSolid[0]).toBeCloseTo(0, 12);
  expect(overSolid[2]).toBeCloseTo(0, 12);
});

const deltaE2000 = differenceCiede2000();
const paperLinear = CHART_PAPER.map((byte) => srgbDecode(byte / 255));

/**
 * Divide a patch by the paper it was printed on, which both white-balances the
 * photograph and normalizes to the ideal white the forward models assume.
 */
function normalized(patch: readonly [number, number, number]): Rgb {
  const [r, g, b] = patch.map((byte, axis) =>
    Math.round(
      255 * srgbEncode(Math.min(1, srgbDecode(byte / 255) / paperLinear[axis])),
    ),
  );
  return bytesToRgb(r, g, b);
}

const solidOf = new Map(
  CHART_INKS.map((ink) => [ink.index, normalized(ink.solid)]),
);

const mean = (values: readonly number[]): number =>
  values.reduce((sum, value) => sum + value, 0) / values.length;

/** Mean ΔE00 over the 30 nominal-50% tints, at the given coverages. */
function tintError(coverage: number, press: boolean): number {
  return mean(
    CHART_INKS.map((ink) =>
      deltaE2000(
        composeColors([coverage], [solidOf.get(ink.index)!], {
          mode: "multiply",
          press,
        }),
        normalized(ink.tint),
      ),
    ),
  );
}

/** Mean ΔE00 over the 870 overprints, row ink at `coverage` over a solid. */
function overprintError(coverage: number, press: boolean): number {
  return mean(
    CHART_CELLS.map(([column, row, r, g, b]) =>
      deltaE2000(
        composeColors(
          [1, coverage],
          [solidOf.get(column)!, solidOf.get(row)!],
          { mode: "multiply", press },
        ),
        normalized([r, g, b]),
      ),
    ),
  );
}

test("press simulation reproduces the chart it was fitted on", () => {
  expect(CHART_INKS.length).toBe(30);
  expect(CHART_CELLS.length).toBe(870);

  const tintsNominal = tintError(0.5, false);
  const tintsPress = tintError(0.5, true);
  const overprintsNominal = overprintError(0.5, false);
  const overprintsPress = overprintError(0.5, true);
  // Gain everywhere instead of on paper only — the configuration the trap rule
  // exists to rule out. Pre-applying the gained coverage with press off is the
  // same forward, so no separate model is needed to score it.
  const gainWithoutTrap = overprintError(effectiveCoverage(0.5), false);

  console.log("");
  console.log("Mean ΔE00 on the Risolve chart, multiply on measured solids:");
  console.log(`  tints       : ${tintsNominal.toFixed(2)} nominal`);
  console.log(`              → ${tintsPress.toFixed(2)} with press`);
  console.log(`  overprints  : ${overprintsNominal.toFixed(2)} nominal`);
  console.log(`              → ${overprintsPress.toFixed(2)} with press`);
  console.log(`  gain, no trap: ${gainWithoutTrap.toFixed(2)}`);

  // Midtones are the whole point: nominal coverage is ~10 ΔE00 too light.
  expect(tintsNominal).toBeGreaterThan(9);
  expect(tintsPress).toBeLessThanOrEqual(6);
  // Trapping holds overprints at nominal, so they must not move at all.
  expect(overprintsPress).toBeCloseTo(overprintsNominal, 6);
  expect(overprintsPress).toBeLessThan(5.7);
  // Gain without trapping wrecks exactly what trapping protects.
  expect(gainWithoutTrap).toBeGreaterThan(overprintsPress + 3);
});
