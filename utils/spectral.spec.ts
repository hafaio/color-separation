import { expect, test } from "bun:test";
import { clampChroma, converter, differenceCiede2000 } from "culori";
import { linearToGamutRgb, rgbToCulori } from "./color";
import { INKS, INKS_BY_ID, MEASURED_INKS } from "./inks";
import { demichelWeights } from "./press";
import {
  buildLayer,
  calibrateKScale,
  ndForwardXyz,
  ndPrimaries,
  ndPrimariesXyz,
  type SpectralLayer,
  spectralForward,
  spectrumToLinearSrgb,
  spectrumToSrgb,
  spectrumToXyz,
} from "./spectral";

const ciede2000 = differenceCiede2000();
const toOklch = converter("oklch");
const toRgb = converter("rgb");

/** The pre-scattering model: every layer a pure absorber, R = Π T² · R_paper. */
function beerLambert(
  opacities: readonly number[],
  layers: readonly SpectralLayer[],
): Float64Array {
  const r = Float64Array.from(spectralForward([], []));
  for (let i = 0; i < layers.length; i++) {
    for (let b = 0; b < r.length; b++) {
      const t = Math.exp(-opacities[i] * layers[i].k[b]);
      r[b] = t * t * r[b];
    }
  }
  return r;
}

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
  // Yellow's chromaticity is outside sRGB, and the hex's blue channel is
  // pinned at 0 as a result. Scored through the gamut map the fit reaches it
  // exactly, because the only thing it misses is chroma the hex could not
  // have recorded.
  expect(deltaE).toBeLessThan(0.01);
});

test("the whole default riso 6 is KM eligible", async () => {
  const { RISO_DEFAULTS, INKS_BY_ID } = await import("./inks");
  // Blue used to be the exception at ΔE00 7.9, its pigment template rendering
  // far enough off the hex in OKLCh hue that the projection could not excuse
  // it. A measured spectrum settles it at 2.99 — but by lightness and chroma,
  // not by hue: the instrument puts blue at 237°, near the template's 230°
  // and nowhere near the hex's 245.5°. The template's hue was not the defect.
  for (const id of RISO_DEFAULTS) {
    const ink = INKS_BY_ID.get(id);
    expect(ink).toBeDefined();
    if (ink) expect(ink.kmEligible).toBe(true);
  }
});

test("the projection is the identity on an uncensored hex", () => {
  // Where a calibrated render lands inside sRGB the hex censored nothing, so
  // scoring through the gamut map has to give back exactly the physical
  // distance — the projection may not buy slack it wasn't owed.
  let interior = 0;
  for (const ink of INKS) {
    const render = spectralForward([1], [buildLayer(ink)]);
    const lin = spectrumToLinearSrgb(render);
    if (lin.some((channel) => channel < 0 || channel > 1)) continue;
    interior++;
    const [r, g, b] = lin;
    expect(linearToGamutRgb(lin)).toEqual(toRgb({ mode: "lrgb", r, g, b }));
    // So the two scores agree, up to the fact that the projected route goes
    // to Lab through culori's XYZ↔sRGB matrix while the physical one uses the
    // IEC-rounded matrix at the top of spectral.ts.
    const [x, y, z] = spectrumToXyz(render);
    const hex = rgbToCulori(ink.rgb);
    const projected = ciede2000(linearToGamutRgb(lin), hex);
    const physical = ciede2000({ mode: "xyz65", x, y, z }, hex);
    expect(Math.abs(projected - physical)).toBeLessThan(0.01);
  }
  expect(interior).toBeGreaterThan(40);
});

test("the projection forgives censored chroma but not a wrong hue", () => {
  // Blue's hex has red pinned at 0, so it records the ink at the sRGB hull
  // and cannot say how far past it the real pigment sits. A render carrying
  // that extra chroma at the hex's own hue and lightness is consistent with
  // the observation and must score as a match...
  const hex = "#0078bf";
  const anchor = toOklch(hex)!;
  const excess = { ...anchor, c: anchor.c * 1.6 };
  expect(ciede2000(clampChroma(excess, "oklch"), hex)).toBeLessThan(0.1);
  // ...while the same excess at blue's actual template hue is not: the hull
  // holds less chroma over there, so the projection lands short of the hex
  // rather than on it. Censoring hides magnitude, never direction.
  const offHue = { ...excess, h: (anchor.h ?? 0) - 17 };
  expect(ciede2000(clampChroma(offHue, "oklch"), hex)).toBeGreaterThan(5);
});

test("calibration scores below the byte grid", () => {
  // Flat absorbers a fraction of a byte apart. The old objective rounded the
  // render to 8 bits before scoring, so it could not tell these apart.
  const near = { baseline: 0.01 };
  const nearer = { baseline: 0.0101 };
  expect(spectrumToSrgb(spectralForward([1], [buildLayer(near)]))).toEqual(
    spectrumToSrgb(spectralForward([1], [buildLayer(nearer)])),
  );
  expect(calibrateKScale("#f0f0f0", near).deltaE).not.toBe(
    calibrateKScale("#f0f0f0", nearer).deltaE,
  );
});

test("scattering collapses to the pure absorber as S → 0", () => {
  for (const id of ["yellow", "blue", "green", "bright-red", "black"]) {
    const ink = INKS_BY_ID.get(id)!;
    const absorber = spectralForward([1], [buildLayer(ink)]);
    for (const sd of [1e-6, 1e-9, 1e-12]) {
      const scattering = buildLayer({ ...ink, scatter: { sd } });
      const r = spectralForward([1], [scattering]);
      // Deviation is O(S·D), so it must fall a decade per decade — no
      // numerical floor of its own until it hits double precision.
      for (let b = 0; b < r.length; b++) {
        expect(Math.abs(r[b] - absorber[b])).toBeLessThan(sd);
      }
    }
  }
});

test("inks without scatter are bit-identical to the pure absorber", () => {
  const black = INKS_BY_ID.get("black")!;
  const blackLayer = buildLayer(black);
  for (const ink of INKS) {
    // Fluorescence adds emission on top of pass 1; it is checked separately.
    if (ink.scatter || ink.fluorescence) continue;
    const layer = buildLayer(ink);
    for (const [opacities, layers] of [
      [[1], [layer]],
      [
        [1, 1],
        [blackLayer, layer],
      ],
      [
        [1, 1],
        [layer, blackLayer],
      ],
      [
        [0.4, 0.7],
        [layer, blackLayer],
      ],
    ] as const) {
      const actual = spectralForward(opacities, layers);
      const expected = beerLambert(opacities, layers);
      for (let b = 0; b < actual.length; b++) {
        expect(Object.is(actual[b], expected[b])).toBe(true);
      }
    }
  }
});

test("fluorescent inks are unaffected by scattering", () => {
  // No fluorescent ink scatters, so nothing on the scattering path may move
  // these; the values themselves come from calibration.
  const expected: Record<string, [number, number, number]> = {
    "fluorescent-green": [195, 235, 125],
    "fluorescent-yellow": [255, 233, 22],
    "fluorescent-orange": [243, 100, 91],
    "fluorescent-red": [255, 76, 101],
    "fluorescent-pink": [243, 84, 179],
  };
  for (const [id, srgb] of Object.entries(expected)) {
    const ink = INKS_BY_ID.get(id)!;
    expect(ink.scatter).toBeUndefined();
    expect(spectrumToSrgb(spectralForward([1], [buildLayer(ink)]))).toEqual(
      srgb,
    );
  }
});

test("white over black lightens", () => {
  // The headline of the scattering model: a pure absorber can only darken,
  // so before it white over black was indistinguishable from black.
  const black = buildLayer(INKS_BY_ID.get("black")!);
  const white = buildLayer(INKS_BY_ID.get("white")!);
  const [blackAlone] = spectrumToSrgb(spectralForward([1], [black]));
  const [whiteOnBlack] = spectrumToSrgb(
    spectralForward([1, 1], [black, white]),
  );
  expect(blackAlone).toBeLessThan(5);
  expect(whiteOnBlack).toBeGreaterThan(80);

  // Scattering is tilted, so the patch carries TiO₂'s blue undertone -- but
  // bounded. Unbounded is how white stopped reading as white and started
  // being a way for the solver to reach blues.
  const [, , blueOnBlack] = spectrumToSrgb(
    spectralForward([1, 1], [black, white]),
  );
  expect(blueOnBlack - whiteOnBlack).toBeGreaterThan(10);
  expect(blueOnBlack - whiteOnBlack).toBeLessThan(40);
});

test("layer order matters only for scattering inks", () => {
  const black = buildLayer(INKS_BY_ID.get("black")!);
  const white = buildLayer(INKS_BY_ID.get("white")!);
  const yellow = buildLayer(INKS_BY_ID.get("yellow")!);
  const [whiteOnBlack] = spectrumToSrgb(
    spectralForward([1, 1], [black, white]),
  );
  const [blackOnWhite] = spectrumToSrgb(
    spectralForward([1, 1], [white, black]),
  );
  expect(blackOnWhite).toBeLessThan(5);
  expect(whiteOnBlack - blackOnWhite).toBeGreaterThan(80);

  // Two absorbers commute up to the order the products are accumulated in.
  const yellowOnBlack = spectralForward([1, 1], [black, yellow]);
  const blackOnYellow = spectralForward([1, 1], [yellow, black]);
  for (let b = 0; b < yellowOnBlack.length; b++) {
    // Relative as a product, but bins deep enough to underflow to zero have
    // to agree exactly rather than divide by it.
    const diff = Math.abs(yellowOnBlack[b] - blackOnYellow[b]);
    expect(diff).toBeLessThanOrEqual(1e-15 * yellowOnBlack[b]);
  }
});

test("halftone forward stays affine in each ink's coverage", () => {
  // sep.ts solves one coordinate at a time in closed form (projectAlpha),
  // which is only the least-squares optimum if this holds.
  const layers = ["black", "white", "yellow"].map((id) =>
    buildLayer(INKS_BY_ID.get(id)!),
  );
  const primariesXyz = ndPrimariesXyz(ndPrimaries(layers));
  const fixed = [0.3, 0.7, 0.5];
  for (let ink = 0; ink < layers.length; ink++) {
    const at = (alpha: number) =>
      ndForwardXyz(
        demichelWeights(
          fixed.map((a, i) => (i === ink ? alpha : a)),
          false,
        ),
        primariesXyz,
      );
    const zero = at(0);
    const one = at(1);
    for (const alpha of [0.1, 0.25, 0.5, 0.9]) {
      const actual = at(alpha);
      for (let axis = 0; axis < 3; axis++) {
        expect(actual[axis]).toBeCloseTo(
          zero[axis] + alpha * (one[axis] - zero[axis]),
          12,
        );
      }
    }
  }
});

test("per-ink calibration residuals", () => {
  // Pinned so any change to the calibration objective shows up as a diff
  // rather than as a quiet drift in every ink's rendered color. Anything
  // under ~0.5 is at or below the hex's own 1/255 quantization floor, so
  // differences down there are noise, not fit quality. A large residual means
  // the template renders the wrong hue or lightness — the projection already
  // forgives chroma the hex could not have recorded.
  //
  // The measured inks read differently from the rest. Their residual is
  // not a fit quality at all, since nothing was fitted to the hex but a
  // thickness: it is how far riso's published swatch sits from the ink a
  // spectrophotometer read, and none of them lands on zero the way a
  // free-shaped template can. Blue, yellow, red, green, teal and gray are the
  // ones to watch; the rest of the table is unchanged by any of this.
  const expected: Record<string, number> = {
    burgundy: 9.89,
    violet: 12.58,
    orchid: 0,
    plum: 14.54,
    purple: 13.31,
    raisin: 0,
    grape: 0,
    aqua: 0,
    cornflower: 0,
    skyblue: 13.36,
    "sea-blue": 0.57,
    blue: 2.99,
    lake: 4.21,
    "medium-blue": 5.23,
    "riso-federal-blue": 6.05,
    indigo: 7.51,
    midnight: 7.23,
    steel: 6.15,
    "smoky-teal": 0,
    spruce: 0,
    forest: 0,
    moss: 0,
    slate: 0,
    lagoon: 0,
    "hunter-green": 0,
    pine: 1.47,
    teal: 3.35,
    "light-teal": 0,
    turquoise: 0,
    seafoam: 0,
    mint: 0,
    grass: 3.82,
    emerald: 0.65,
    ivy: 0.51,
    green: 1.39,
    "kelly-green": 0.07,
    "fluorescent-green": 13.94,
    "light-lime": 0.33,
    yellow: 3.09,
    "fluorescent-yellow": 0,
    sunflower: 0,
    melon: 1.47,
    apricot: 0,
    paprika: 0,
    pumpkin: 8.61,
    orange: 2.15,
    "fluorescent-orange": 6.05,
    coral: 0,
    red: 2.48,
    "bright-red": 0,
    crimson: 0.01,
    scarlet: 0,
    tomato: 2.34,
    "marine-red": 2.34,
    cranberry: 0.08,
    maroon: 12.55,
    wine: 9.89,
    "dark-mauve": 9.55,
    "light-mauve": 12.19,
    bisque: 11.04,
    "raspberry-red": 0,
    "fluorescent-red": 0,
    "fluorescent-pink": 2,
    bubblegum: 7.14,
    mist: 0,
    "metallic-gold": 0,
    "bright-olive-green": 0,
    "flat-gold": 0,
    "bright-gold": 8.96,
    copper: 6.62,
    brick: 0,
    mahogany: 0,
    brown: 2.94,
    white: 1.13,
    "clear-medium": 1.5,
    gray: 2.14,
    granite: 2.11,
    "light-gray": 1.77,
    charcoal: 3.6,
    black: 0,
  };
  expect(INKS.map((ink) => ink.id).sort()).toEqual(
    Object.keys(expected).sort(),
  );
  for (const ink of INKS) {
    expect(ink.kmDeltaE).toBeCloseTo(expected[ink.id], 2);
  }
});

// The README states the count in prose, where nothing else would catch it
// drifting the next time an ink is measured.
test("the README counts the measured inks correctly", async () => {
  const readme = await Bun.file("README.md").text();
  const stated = readme.match(
    /(\d+) inks are calibrated from real spectral measurements/,
  );
  expect(stated).not.toBeNull();
  expect(Number(stated![1])).toBe(MEASURED_INKS.length);
});
