import { expect, test } from "bun:test";
import { formatHex, parse, type Rgb } from "culori";
import {
  bytesToRgb,
  byteToLinear,
  colorBytes,
  culoriToPacked,
  linearToRgb,
  packRgb,
  type RgbU32,
  rgbToCulori,
} from "./color";
import { INKS_BY_ID, RISO_DEFAULTS } from "./inks";
import { demichelWeights, effectiveCoverage } from "./press";
import {
  buildKmCache,
  colorSeparation,
  composeColors,
  inkCount,
  type MinInkResult,
  type MixingMode,
  remapKmCache,
} from "./sep";
import { buildSolverContext, solveColors } from "./solver-context";
import { buildLayer, type SpectralLayer } from "./spectral";

const hex = (s: string): Rgb => parse(s) as Rgb;

const RISO_LAYERS = RISO_DEFAULTS.map((id) => buildLayer(INKS_BY_ID.get(id)!));
const RISO_POOL = RISO_DEFAULTS.map((id) =>
  rgbToCulori(INKS_BY_ID.get(id)!.rgb),
);
const RISO_KM_CACHE = buildKmCache(RISO_LAYERS);
const RISO_WIRE = RISO_DEFAULTS.map((id) => INKS_BY_ID.get(id)!.rgb);

const coverage = (opacities: readonly number[]): number =>
  opacities.reduce((sum, opacity) => sum + opacity, 0);

function kmSeparate(
  red: number,
  green: number,
  blue: number,
  tolerance: number,
): MinInkResult {
  return colorSeparation(bytesToRgb(red, green, blue), RISO_POOL, {
    mode: "kubelka_munk",
    cache: RISO_KM_CACHE,
    tolerance,
  });
}

/** Evenly spaced sRGB steps between two endpoints. */
function ramp(
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  steps: number,
): RgbU32[] {
  return Array.from({ length: steps }, (_, step) => {
    const frac = step / (steps - 1);
    return packRgb(
      from[0] + frac * (to[0] - from[0]),
      from[1] + frac * (to[1] - from[1]),
      from[2] + frac * (to[2] - from[2]),
    );
  });
}

/** Run the two-pass worker solver, returning per-color opacities. */
function solveThroughContext(
  counts: ReadonlyMap<RgbU32, number>,
  mixingMode: MixingMode,
  tolerance: number,
): Map<RgbU32, number[]> {
  const ctx = buildSolverContext(
    new Uint32Array(RISO_WIRE),
    new Uint32Array(RISO_WIRE),
    mixingMode,
    false,
    counts,
    0,
    tolerance,
    false,
  );
  const channels = ctx.poolColors.length;
  const prevs = new Uint32Array(counts.size);
  const opacs = new Float64Array(counts.size * channels);
  solveColors(ctx, counts, prevs, opacs, 1, () => {});
  return new Map(
    [...counts.keys()].map((key, index) => [
      key,
      [...opacs.slice(index * channels, (index + 1) * channels)],
    ]),
  );
}

const supportOf = (opacities: readonly number[]): number =>
  opacities.reduce(
    (mask, opacity, index) => (opacity > 0 ? mask | (1 << index) : mask),
    0,
  );

test("gray linear", () => {
  const colors = [bytesToRgb(0, 0, 0)];
  const {
    error,
    opacities: [opacity],
  } = colorSeparation(hex("#0000ff"), colors);
  expect(opacity).toBeCloseTo(1);
  expect(error).toBeCloseTo(1 / 3);
});

test("pink single linear increments", () => {
  const colors = ["#ee0403", "#0301ef"].map(hex);
  const {
    opacities: [pink, blue],
  } = colorSeparation(hex("#ff0000"), colors, {
    mode: "subtractive",
    increments: 1,
  });
  expect(pink).toBeCloseTo(1);
  expect(blue).toBeCloseTo(0);
});

test("pink double linear increments", () => {
  const colors = ["#ee0403", "#0301ef"].map(hex);
  const {
    opacities: [pink, blue],
  } = colorSeparation(hex("#ff8888"), colors, {
    mode: "subtractive",
    increments: 2,
  });
  expect(pink).toBeCloseTo(1 / 2);
  expect(blue).toBeCloseTo(0);
});

test("duo linear", () => {
  const colors = ["#22ccee", "#bbee33"].map(hex);
  const { error } = colorSeparation(hex("#dd8822"), colors);
  expect(error).toBeLessThan(0.25);
});

test("cmy linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"].map(hex);
  const {
    color: res,
    error,
    opacities,
  } = colorSeparation(hex("#dd8822"), colors);
  expect(error).toBeLessThan(1e-3);
  expect(formatHex(res)).toBe("#dd8822");
  const [c, m, y] = opacities;
  expect(1 - c).toBeCloseTo(0xdd / 0xff);
  expect(1 - m).toBeCloseTo(0x88 / 0xff);
  expect(1 - y).toBeCloseTo(0x22 / 0xff);
});

test("cmy white", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"].map(hex);
  const {
    color: res,
    error,
    opacities,
  } = colorSeparation(hex("#ffffff"), colors);
  expect(error).toBeLessThan(1e-3);
  expect(formatHex(res)).toBe("#ffffff");
  const [c, m, y] = opacities;
  expect(c).toBeCloseTo(0);
  expect(m).toBeCloseTo(0);
  expect(y).toBeCloseTo(0);
});

test("cmy black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"].map(hex);
  const {
    color: res,
    error,
    opacities,
  } = colorSeparation(hex("#000000"), colors);
  expect(error).toBeLessThan(1e-3);
  expect(formatHex(res)).toBe("#000000");
  const [c, m, y] = opacities;
  expect(c).toBeCloseTo(1);
  expect(m).toBeCloseTo(1);
  expect(y).toBeCloseTo(1);
});

test("underconstrained linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"].map(hex);
  const { error } = colorSeparation(hex("#dd8822"), colors);
  expect(error).toBeLessThan(1e-3);
});

test("underconstrained linear black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"].map(hex);
  const { error, opacities } = colorSeparation(bytesToRgb(0, 0, 0), colors);
  expect(error).toBeLessThan(1e-3);
  expect(opacities).toEqual([0, 0, 0, 1]);
});

test("alpha-blend white", () => {
  const colors = ["#ff0000", "#00ff00", "#0000ff"].map(hex);
  const { opacities, error } = colorSeparation(hex("#ffffff"), colors, {
    mode: "multiply",
  });
  expect(error).toBeLessThan(1e-3);
  for (const a of opacities) expect(a).toBeCloseTo(0);
});

test("alpha-blend solid black", () => {
  const colors = [hex("#000000")];
  const { opacities, error } = colorSeparation(hex("#000000"), colors, {
    mode: "multiply",
  });
  expect(opacities[0]).toBeCloseTo(1);
  expect(error).toBeLessThan(1e-3);
});

test("multiply overprints darken and ignore order", () => {
  const yellow = hex("#ffe800");
  const blue = hex("#0078bf");
  // Filters compose, so neither ink survives intact and the stack is darker
  // than either alone — the behavior alpha-over could not produce.
  const blueTop = colorBytes(
    composeColors([1, 1], [yellow, blue], { mode: "multiply" }),
  );
  const yellowTop = colorBytes(
    composeColors([1, 1], [blue, yellow], { mode: "multiply" }),
  );
  expect(blueTop).toEqual(yellowTop);
  for (const channel of ["r", "g", "b"] as const) {
    expect(blueTop[channel]).toBeLessThanOrEqual(colorBytes(yellow)[channel]);
    expect(blueTop[channel]).toBeLessThanOrEqual(colorBytes(blue)[channel]);
  }
});

test("alpha-blend continuous recovers single-ink coverage", () => {
  // Target = red over white at α=0.5 in linear sRGB (encoded #ffbcbc-ish).
  // Round-trip through linearize/blend/encode to get the exact target.
  const red = hex("#ff0000");
  const halfRedComposited = composeColors([0.5], [red], {
    mode: "multiply",
  });
  const { opacities, error } = colorSeparation(halfRedComposited, [red], {
    mode: "multiply",
  });
  expect(opacities[0]).toBeCloseTo(0.5, 2);
  expect(error).toBeLessThan(1e-3);
});

test("alpha-blend grid search rounds to lattice", () => {
  const red = hex("#ff0000");
  const { opacities } = colorSeparation(hex("#ff8080"), [red], {
    mode: "multiply" as const,
    increments: 4,
  });
  // Should snap to one of {0, 0.25, 0.5, 0.75, 1}.
  const lattice = [0, 0.25, 0.5, 0.75, 1];
  expect(lattice).toContain(opacities[0]);
});

test("KM single-ink at α=1 reproduces calibrated hex", () => {
  const yellow = INKS_BY_ID.get("yellow")!;
  const layer: SpectralLayer = buildLayer(yellow);
  const composed = colorBytes(
    composeColors([1], [], {
      mode: "kubelka_munk",
      cache: buildKmCache([layer]),
    }),
  );
  // Close in red and green, and a long way off in blue. Yellow's K(λ) is a
  // measurement now, so the only thing calibration could move was the film's
  // thickness, and no thickness reproduces #ffe800: the real ink still returns
  // a quarter of the blue channel where the published swatch returns none.
  // The hex is the idealization here, not the render.
  expect(composed.r).toBeCloseTo(255, 0);
  expect(composed.g).toBeCloseTo(230, 0);
  expect(composed.b).toBeCloseTo(71, 0);
});

test("KM solver picks a higher α for a darker target", () => {
  // A target close to paper white should fit with low α; a target close to
  // saturated yellow should fit with high α. Just verify the ordering, not
  // exact values — the inner-loop golden section is approximate.
  const yellow = INKS_BY_ID.get("yellow")!;
  const cache = buildKmCache([buildLayer(yellow)]);
  const pool = [bytesToRgb(255, 232, 0)];
  const opts = { mode: "kubelka_munk" as const, cache };
  const near = colorSeparation(bytesToRgb(255, 250, 200), pool, opts);
  const far = colorSeparation(bytesToRgb(255, 235, 30), pool, opts);
  expect(far.opacities[0]).toBeGreaterThan(near.opacities[0]);
});

test("KM solver on riso 6 doesn't collapse to black for paper white", () => {
  // Regression: golden-section search alone misses boundary minima.
  // For paper white target with riso 6 active, the solver was returning
  // α=1 on the black ink (because f(α>0) ≈ 3, f(α=0) ≈ 0 — golden never
  // sampled exactly 0). goldenMin's checkBoundaries flag fixes that;
  // without it this test fails.
  const { opacities } = colorSeparation(bytesToRgb(255, 255, 255), RISO_POOL, {
    mode: "kubelka_munk",
    cache: RISO_KM_CACHE,
  });
  for (const a of opacities) {
    expect(a).toBeLessThan(0.05);
  }
  const composed = colorBytes(
    composeColors(opacities, RISO_POOL, {
      mode: "kubelka_munk",
      cache: RISO_KM_CACHE,
    }),
  );
  expect(composed.r).toBeGreaterThan(200);
  expect(composed.g).toBeGreaterThan(200);
  expect(composed.b).toBeGreaterThan(200);
});

test("KM solver on riso 6 picks the right ink dominantly for a saturated target", () => {
  // Target ≈ riso blue (#0078bf). Solver should pick blue at high α and
  // produce a composed result reasonably close to the target.
  const { opacities } = colorSeparation(bytesToRgb(0, 120, 191), RISO_POOL, {
    mode: "kubelka_munk",
    cache: RISO_KM_CACHE,
  });
  // Defaults order: bright-red, fluorescent-pink, yellow, green, blue, black.
  const blueIdx = 4;
  expect(opacities[blueIdx]).toBeGreaterThan(0.5);
  const composed = colorBytes(
    composeColors(opacities, RISO_POOL, {
      mode: "kubelka_munk",
      cache: RISO_KM_CACHE,
    }),
  );
  expect(composed.b).toBeGreaterThan(composed.r);
  expect(composed.b).toBeGreaterThan(composed.g);
});

test("KM yellow under blue produces a green-leaning preview", () => {
  // Reference doc §10: yellow + blue at α=1 each, blue on top, should give
  // a clean green (hue ~120-160°). The actual outcome depends on the
  // calibrated bands but the channel ordering should hold: G > R and G > B.
  const yellow = INKS_BY_ID.get("yellow")!;
  const blue = INKS_BY_ID.get("blue")!;
  const cache = buildKmCache([buildLayer(yellow), buildLayer(blue)]);
  const composed = colorBytes(
    composeColors([1, 1], [], { mode: "kubelka_munk", cache }),
  );
  expect(composed.g).toBeGreaterThan(composed.r);
  expect(composed.g).toBeGreaterThan(composed.b);
});

test("remapped primaries match a per-permutation build", () => {
  // What the print-order race leans on: with no scattering and no
  // fluorescence a reordering only relabels the primaries, so one 2^n build
  // serves every permutation. Agreement is to a few ulp rather than exact,
  // since the per-permutation build multiplies the same transmittances in a
  // different order.
  const layers = ["bright-red", "yellow", "green", "blue"].map((id) =>
    buildLayer(INKS_BY_ID.get(id)!),
  );
  const perm = [2, 0, 3, 1];
  const built = buildKmCache(perm.map((index) => layers[index]));
  const mapped = remapKmCache(buildKmCache(layers), perm);
  let worst = 0;
  for (const [mask, spectrum] of built.primaries.entries()) {
    for (const [bin, value] of spectrum.entries()) {
      worst = Math.max(worst, Math.abs(value - mapped.primaries[mask][bin]));
    }
  }
  for (const [index, value] of built.primariesXyz.entries()) {
    worst = Math.max(worst, Math.abs(value - mapped.primariesXyz[index]));
  }
  expect(worst).toBeLessThan(1e-14);
});

test("color saturation", () => {
  // Here the red channel goes below zero in the optimization throwing things
  // off, by we still return black for the red channel
  const colors = ["#0088ff", "#00ff88"].map(hex);
  const {
    error,
    opacities: [blue, green],
    color: result,
  } = colorSeparation(hex("#009999"), colors);
  expect(error).toBeLessThan(0.25);
  expect(blue).toBeCloseTo(1 / 7);
  expect(green).toBeCloseTo(6 / 7);
  expect(formatHex(result)).toBe("#00ee99");
});

test("KM black collapses to the black ink alone", () => {
  // Regression: least squares alone reproduces black as all six inks at 100%
  // because the metamer manifold is 3 dimensions wider than the target.
  const { opacities, inkMask, deltaE: error } = kmSeparate(0, 0, 0, 0);
  expect(inkCount(inkMask)).toBe(1);
  // Defaults order: bright-red, fluorescent-pink, yellow, green, blue, black.
  expect(opacities[5]).toBeCloseTo(1, 2);
  expect(coverage(opacities)).toBeCloseTo(1, 2);
  expect(error).toBeLessThan(0.5);
});

test("KM grays collapse to a single ink at partial coverage", () => {
  const mid = kmSeparate(128, 128, 128, 0);
  expect(inkCount(mid.inkMask)).toBe(1);
  expect(coverage(mid.opacities)).toBeCloseTo(0.77, 1);
  expect(mid.deltaE).toBeLessThan(0.5);

  const dark = kmSeparate(60, 60, 60, 0);
  expect(inkCount(dark.inkMask)).toBe(1);
  expect(coverage(dark.opacities)).toBeCloseTo(0.95, 1);
  expect(dark.deltaE).toBeLessThan(0.5);
});

test("coverage falls as tolerance rises", () => {
  const targets: readonly [number, number, number][] = [
    [200, 150, 130],
    [240, 130, 50],
    [110, 80, 50],
    [245, 200, 80],
  ];
  for (const [red, green, blue] of targets) {
    const covers = [0, 1, 2, 4, 8].map((tolerance) =>
      coverage(kmSeparate(red, green, blue, tolerance).opacities),
    );
    // Ink count is the primary criterion and coverage only the tie-break, so
    // a wider budget can swap in a same-size subset that costs a hair more.
    for (const [index, cover] of covers.entries()) {
      if (index > 0)
        expect(cover).toBeLessThanOrEqual(covers[index - 1] + 0.05);
    }
    expect(covers[covers.length - 1]).toBeLessThanOrEqual(covers[0]);
  }
});

test("increments quantize without reviving an excluded ink", () => {
  const lattice = [0, 0.25, 0.5, 0.75, 1];
  const { opacities, inkMask } = colorSeparation(
    bytesToRgb(150, 90, 60),
    RISO_POOL,
    { mode: "kubelka_munk", cache: RISO_KM_CACHE, increments: 4, tolerance: 2 },
  );
  for (const opacity of opacities) expect(lattice).toContain(opacity);
  for (const [index, opacity] of opacities.entries()) {
    expect(opacity > 0).toBe(((inkMask >> index) & 1) === 1);
  }
});

test("a smooth ramp settles on a handful of ink recipes", () => {
  // Guards recipe stabilization: picking each color's cheapest subset on its
  // own makes neighboring ramp steps jump between unrelated inks. Drop the
  // second pass in solveColors and the stabilized count matches the
  // independent one.
  const steps = ramp([70, 40, 110], [250, 200, 90], 60);
  const counts = new Map<RgbU32, number>(steps.map((color) => [color, 1]));
  const solved = solveThroughContext(counts, "kubelka_munk", 2);

  const stabilized = new Set(
    [...solved.values()].map((opacities) => supportOf(opacities)),
  );
  const independent = new Set(
    steps.map(
      (color) =>
        colorSeparation(rgbToCulori(color), RISO_POOL, {
          mode: "kubelka_munk",
          cache: RISO_KM_CACHE,
          tolerance: 2,
        }).inkMask,
    ),
  );
  expect(stabilized.size).toBeLessThanOrEqual(7);
  expect(independent.size).toBeGreaterThan(stabilized.size);
});

test("stabilized recipes are stable under color reordering", () => {
  const steps = ramp([70, 40, 110], [250, 200, 90], 24);
  const weights = steps.map((_, index) => 1 + (index % 7));
  const forward = new Map<RgbU32, number>(
    steps.map((color, index) => [color, weights[index]]),
  );
  const reversed = new Map<RgbU32, number>(
    [...steps]
      .reverse()
      .map((color, index) => [color, weights.at(-1 - index)!]),
  );

  const first = solveThroughContext(forward, "kubelka_munk", 2);
  const second = solveThroughContext(reversed, "kubelka_munk", 2);
  for (const color of steps) {
    expect(second.get(color)).toEqual(first.get(color)!);
  }
});

test("subtractive ignores tolerance", () => {
  const target = bytesToRgb(30, 50, 150);
  const tight = colorSeparation(target, RISO_POOL, { mode: "subtractive" });
  const loose = colorSeparation(target, RISO_POOL, {
    mode: "subtractive",
    tolerance: 8,
  });
  expect(loose.opacities).toEqual(tight.opacities);
});

test("the press multiply forward matches an explicit Neugebauer sum", () => {
  // The solver's forward decomposes the stack by which ink lands on paper
  // first, which is only linear-time because the whole suffix collapses into
  // an ordinary product. Check it against the 2^n sum it stands in for.
  const pool = ["#ffe800", "#0078bf", "#ff48b0", "#000000"].map(hex);
  const poolLinear = pool.map((color) => {
    const { r, g, b } = colorBytes(color);
    return [byteToLinear(r), byteToLinear(g), byteToLinear(b)] as const;
  });
  for (const coverages of [
    [0.5, 0.5, 0.5, 0.5],
    [1, 0.5, 0, 0.25],
    [0.1, 0.9, 0.35, 0.7],
    [0, 0, 0, 0],
    [1, 1, 1, 1],
  ]) {
    const weights = demichelWeights(coverages, true);
    const expected = [0, 1, 2].map((axis) => {
      let total = 0;
      for (const [mask, weight] of weights.entries()) {
        let primary = 1;
        for (const [index, ink] of poolLinear.entries()) {
          if ((mask >> index) & 1) primary *= ink[axis];
        }
        total += weight * primary;
      }
      return total;
    });
    expect(
      colorBytes(
        composeColors(coverages, pool, { mode: "multiply", press: true }),
      ),
    ).toEqual(
      colorBytes(
        rgbToCulori(linearToRgb([expected[0], expected[1], expected[2]])),
      ),
    );
  }
});

test("press simulation solves in nominal coverage, not effective", () => {
  const red = hex("#ff0000");
  const printed = composeColors([0.5], [red], {
    mode: "multiply",
    press: true,
  });
  const withPress = colorSeparation(printed, [red], {
    mode: "multiply",
    press: true,
  });
  expect(withPress.opacities[0]).toBeCloseTo(0.5, 3);
  // The same appearance without press needs the gained coverage instead, so
  // the two settings really are solving different problems.
  const withoutPress = colorSeparation(printed, [red], { mode: "multiply" });
  expect(withoutPress.opacities[0]).toBeCloseTo(effectiveCoverage(0.5), 3);
});

test("the quartic coordinate update fits as well as the segment one", () => {
  // Press simulation changes the forward, so the reachable ΔE00 changes with
  // it and the two are not required to agree. What is required is that the
  // quartic update converges as well as the closed-form segment projection it
  // replaces — a bad root or an unstable descent would show up as a target the
  // press-on solver suddenly cannot reach.
  const targets: readonly [number, number, number][] = [
    [240, 200, 180],
    [200, 150, 130],
    [128, 128, 128],
    [30, 50, 150],
    [80, 160, 80],
    [250, 250, 250],
    [20, 20, 20],
  ];
  for (const [red, green, blue] of targets) {
    const target = bytesToRgb(red, green, blue);
    const fits = (press: boolean): number[] => [
      colorSeparation(target, RISO_POOL, { mode: "multiply", press }).deltaE,
      colorSeparation(target, RISO_POOL, {
        mode: "kubelka_munk",
        cache: RISO_KM_CACHE,
        press,
      }).deltaE,
    ];
    const segment = fits(false);
    for (const [index, deltaE] of fits(true).entries()) {
      expect(deltaE).toBeLessThan(segment[index] + 0.5);
    }
  }
});

test("preview and solver share the press setting", () => {
  const target = packRgb(200, 120, 90);
  const counts = new Map<RgbU32, number>([[target, 1]]);
  const ctx = buildSolverContext(
    new Uint32Array(RISO_WIRE),
    new Uint32Array(RISO_WIRE),
    "multiply",
    false,
    counts,
    0,
    0,
    true,
  );
  const prevs = new Uint32Array(1);
  const opacs = new Float64Array(RISO_WIRE.length);
  solveColors(ctx, counts, prevs, opacs, 1, () => {});
  const opacities = [...opacs];
  expect(prevs[0]).toBe(
    culoriToPacked(
      composeColors(opacities, ctx.renderColors, {
        mode: "multiply",
        press: true,
      }),
    ),
  );
  expect(prevs[0]).not.toBe(
    culoriToPacked(
      composeColors(opacities, ctx.renderColors, { mode: "multiply" }),
    ),
  );
});
