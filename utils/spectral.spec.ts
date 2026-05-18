import { expect, test } from "bun:test";
import { hexToRgb } from "./color";
import {
  buildLayer,
  calibrateKScale,
  spectralForward,
  spectrumToSrgb,
} from "./spectral";

test("white paper reproduces near-white sRGB", () => {
  // Empty pool → paper R = 0.95 across bins → near-white sRGB.
  const r = spectralForward([], []);
  const [red, green, blue] = spectrumToSrgb(r);
  expect(red).toBeGreaterThan(240);
  expect(green).toBeGreaterThan(240);
  expect(blue).toBeGreaterThan(240);
});

test("opaque carbon black darkens to near-zero", () => {
  // PBk7 black has a flat broadband K; at α=1 with large kScale it should
  // attenuate everything.
  const layer = buildLayer({
    kBands: [{ center: 550, width: 1000, amplitude: 1.0 }],
    baseline: 0,
    kScale: 50,
  });
  const [red, green, blue] = spectrumToSrgb(spectralForward([1], [layer]));
  expect(red).toBeLessThan(10);
  expect(green).toBeLessThan(10);
  expect(blue).toBeLessThan(10);
});

test("calibration recovers yellow (PY74-shaped bands)", () => {
  // Yellow's blue-absorbing gaussians let single-param calibration nail the
  // target — this is the easy case, used as a sanity check on the forward.
  const yellow = {
    kBands: [
      { center: 430, width: 35, amplitude: 1.0 },
      { center: 380, width: 30, amplitude: 0.7 },
    ],
    baseline: 0.01,
  };
  const { deltaE } = calibrateKScale("#ffe800", yellow);
  expect(deltaE).toBeLessThan(3);
});

test("default riso 6 are KM eligible", async () => {
  const { RISO_DEFAULTS, INKS_BY_ID } = await import("./inks");
  for (const id of RISO_DEFAULTS) {
    const ink = INKS_BY_ID.get(id);
    expect(ink).toBeDefined();
    if (ink) expect(ink.kmEligible).toBe(true);
  }
});

test("hexToRgb is unused but referenced for type completeness", () => {
  // Tighten import shape; calibration uses hex strings via d3color internally.
  expect(hexToRgb("#ff0000")).toBeGreaterThan(0);
});
