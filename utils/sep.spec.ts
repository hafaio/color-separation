import { expect, test } from "bun:test";
import { formatHex, parse, type Rgb } from "culori";
import { bytesToRgb, colorBytes, rgbToCulori } from "./color";
import { INKS_BY_ID, RISO_DEFAULTS } from "./inks";
import { buildKmCache, colorSeparation, composeColors } from "./sep";
import { buildLayer, type SpectralLayer } from "./spectral";

const hex = (s: string): Rgb => parse(s) as Rgb;

const RISO_LAYERS = RISO_DEFAULTS.map((id) => buildLayer(INKS_BY_ID.get(id)!));
const RISO_POOL = RISO_DEFAULTS.map((id) =>
  rgbToCulori(INKS_BY_ID.get(id)!.rgb),
);
const RISO_KM_CACHE = buildKmCache(RISO_LAYERS);

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
    mode: "alpha_blend",
  });
  expect(error).toBeLessThan(1e-3);
  for (const a of opacities) expect(a).toBeCloseTo(0);
});

test("alpha-blend solid black", () => {
  const colors = [hex("#000000")];
  const { opacities, error } = colorSeparation(hex("#000000"), colors, {
    mode: "alpha_blend",
  });
  expect(opacities[0]).toBeCloseTo(1);
  expect(error).toBeLessThan(1e-3);
});

test("alpha-blend top layer dominates order", () => {
  const yellow = hex("#ffe800");
  const blue = hex("#0078bf");
  // Blue on top → mostly blue; yellow on top → mostly yellow.
  const blueTop = colorBytes(
    composeColors([1, 1], [yellow, blue], { mode: "alpha_blend" }),
  );
  const yellowTop = colorBytes(
    composeColors([1, 1], [blue, yellow], { mode: "alpha_blend" }),
  );
  expect(blueTop.b).toBeGreaterThan(blueTop.r);
  expect(yellowTop.r).toBeGreaterThan(yellowTop.b);
});

test("alpha-blend continuous recovers single-ink coverage", () => {
  // Target = red over white at α=0.5 in linear sRGB (encoded #ffbcbc-ish).
  // Round-trip through linearize/blend/encode to get the exact target.
  const red = hex("#ff0000");
  const halfRedComposited = composeColors([0.5], [red], {
    mode: "alpha_blend",
  });
  const { opacities, error } = colorSeparation(halfRedComposited, [red], {
    mode: "alpha_blend",
  });
  expect(opacities[0]).toBeCloseTo(0.5, 2);
  expect(error).toBeLessThan(1e-3);
});

test("alpha-blend grid search rounds to lattice", () => {
  const red = hex("#ff0000");
  const { opacities } = colorSeparation(hex("#ff8080"), [red], {
    mode: "alpha_blend" as const,
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
  // Calibration targets ΔE < 5 vs. hex; encoded sRGB should match closely.
  expect(Math.abs(composed.r - 255)).toBeLessThan(8);
  expect(Math.abs(composed.g - 232)).toBeLessThan(8);
  expect(Math.abs(composed.b - 0)).toBeLessThan(8);
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
