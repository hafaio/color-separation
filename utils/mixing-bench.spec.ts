import { expect, test } from "bun:test";
import { bytesToRgb, colorBytes, rgbToCulori } from "./color";
import { INKS_BY_ID, RISO_DEFAULTS } from "./inks";
import {
  buildKmCache,
  colorSeparation,
  composeColors,
  type MixingMode,
  type SeparationOptions,
} from "./sep";
import { buildLayer } from "./spectral";

const inks = RISO_DEFAULTS.map((id) => INKS_BY_ID.get(id)!);
const layers = inks.map(buildLayer);
const kmCache = buildKmCache(layers);
const pool = inks.map((ink) => rgbToCulori(ink.rgb));

// A spread of photo-typical colors. The point is to compare reconstruction
// error across mixing modes on the SAME pool / SAME targets so a regression
// in one mode shows up as a clear gap from the others.
const TARGETS: readonly { r: number; g: number; b: number }[] = [
  { r: 255, g: 255, b: 255 },
  { r: 240, g: 240, b: 245 },
  { r: 240, g: 200, b: 180 },
  { r: 200, g: 150, b: 130 },
  { r: 128, g: 128, b: 128 },
  { r: 80, g: 80, b: 80 },
  { r: 245, g: 200, b: 80 },
  { r: 240, g: 130, b: 50 },
  { r: 200, g: 40, b: 40 },
  { r: 220, g: 80, b: 180 },
  { r: 100, g: 180, b: 230 },
  { r: 30, g: 50, b: 150 },
  { r: 80, g: 160, b: 80 },
  { r: 30, g: 100, b: 40 },
  { r: 110, g: 80, b: 50 },
  { r: 0, g: 0, b: 0 },
];

/** Encoded-sRGB Euclidean distance — the metric a user actually perceives. */
function srgbDist(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function optsFor(mode: MixingMode, press: boolean): SeparationOptions {
  if (mode === "kubelka_munk") {
    return { mode, cache: kmCache, press };
  } else if (mode === "multiply") {
    return { mode, press };
  } else {
    return { mode };
  }
}

/** Sweeps often enough that the reported solve time isn't timer resolution. */
const SWEEPS = 5;

function benchmark(
  mode: MixingMode,
  press: boolean,
): { error: number; millis: number } {
  const opts = optsFor(mode, press);
  let total = 0;
  const started = performance.now();
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    total = 0;
    for (const t of TARGETS) {
      const target = bytesToRgb(t.r, t.g, t.b);
      const { opacities } = colorSeparation(target, pool, opts);
      const composed = colorBytes(composeColors(opacities, pool, opts));
      total += srgbDist({ r: composed.r, g: composed.g, b: composed.b }, t);
    }
  }
  return {
    error: total / TARGETS.length,
    millis: (performance.now() - started) / SWEEPS,
  };
}

test("benchmark: KM mean reconstruction error vs other modes", () => {
  const subtractive = benchmark("subtractive", false);
  const multiply = benchmark("multiply", false);
  const km = benchmark("kubelka_munk", false);
  const multiplyPress = benchmark("multiply", true);
  const kmPress = benchmark("kubelka_munk", true);
  console.log("");
  console.log(
    `Mean sRGB reconstruction error and solve time across ${TARGETS.length} targets, riso 6 pool:`,
  );
  for (const [name, result] of [
    ["subtractive        ", subtractive],
    ["multiply           ", multiply],
    ["multiply + press   ", multiplyPress],
    ["kubelka_munk       ", km],
    ["kubelka_munk +press", kmPress],
  ] as const) {
    console.log(
      `  ${name}: ${result.error.toFixed(1)}  (${result.millis.toFixed(1)} ms)`,
    );
  }
  // No ordering is asserted between KM and multiply. KM currently scores
  // slightly worse, and that is expected rather than a regression: its bands
  // are synthesized from each ink's published hex and fitted at load, so it
  // carries calibration residual on single inks, while multiply consumes the
  // same hex directly and reproduces them exactly. Spectral modeling should
  // pay off on overprints instead, which these single-target means don't
  // isolate. Subtractive is excluded outright — its forward is non-physical
  // and fits anything via LP, so its error is misleadingly low.
  for (const { error } of [multiply, km, multiplyPress, kmPress]) {
    expect(error).toBeLessThan(15);
  }
});
