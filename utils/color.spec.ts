import { expect, test } from "bun:test";
import { type Color, converter } from "culori";
import { type LinearRgb, linearToGamutRgb, srgbEncode } from "./color";

const toOklch = converter("oklch");

/** Degrees between two hues, the short way round. */
function hueGap(a: Color, b: Color): number {
  const hueA = toOklch(a).h ?? 0;
  const hueB = toOklch(b).h ?? 0;
  return Math.abs(((hueA - hueB + 540) % 360) - 180);
}

const clipped = (lin: LinearRgb): Color => ({
  mode: "rgb",
  r: srgbEncode(lin[0]),
  g: srgbEncode(lin[1]),
  b: srgbEncode(lin[2]),
});

test("gamut mapping holds the hue a per-channel clip would shift", () => {
  // Riso blue's calibrated spectrum renders here. Its red is well negative,
  // and clipping that to zero swings the result a quarter-turn toward cyan.
  const outside: LinearRgb = [-0.174, 0.162, 0.871];
  const truth: Color = {
    mode: "lrgb",
    r: outside[0],
    g: outside[1],
    b: outside[2],
  };
  expect(hueGap(linearToGamutRgb(outside), truth)).toBeLessThan(0.05);
  expect(hueGap(clipped(outside), truth)).toBeGreaterThan(20);
});

test("in-gamut colors pass through the mapping untouched", () => {
  for (const lin of [
    [0, 0, 0],
    [1, 1, 1],
    [0.2, 0.5, 0.8],
    [0.9, 0.05, 0.4],
    [0.002, 0.5, 0.999],
  ] as const) {
    const mapped = linearToGamutRgb(lin);
    const encoded = clipped(lin) as { r: number; g: number; b: number };
    expect(mapped.r).toBeCloseTo(encoded.r, 12);
    expect(mapped.g).toBeCloseTo(encoded.g, 12);
    expect(mapped.b).toBeCloseTo(encoded.b, 12);
  }
});
