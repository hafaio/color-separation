/**
 * Spectral primitives for Kubelka-Munk ink mixing.
 *
 * Conventions:
 * - 36-bin wavelength grid, 380–730 nm in 10 nm steps.
 * - D65 illuminant + CIE 1931 2° standard observer.
 * - Paper modeled as a flat-reflectance Lambertian (default R_p = 0.95).
 * - K(λ) comes either from a pigment template fitted to the ink's published
 *   hex or, where one exists, straight out of a measured solid — see
 *   `absorptionFromFilm` and `calibrateDensity` for what each observation is
 *   entitled to determine.
 * - Each ink layer is a two-constant Kubelka film with its own intrinsic
 *   (ρ, τ), composed onto everything beneath it with interreflection:
 *   R = ρ + τ²·R_below / (1 − ρ·R_below). Inks with no scattering data have
 *   S = 0, where this collapses exactly to Beer–Lambert R = T(λ)² · R_below.
 *   Scattering makes stacking order matter, as it does on a real press.
 * - Fluorescence handled in a two-pass scheme: pass 1 computes the
 *   non-fluorescent R(λ), pass 2 adds each fluorescent layer's emission
 *   attenuated by the layers above it.
 *
 * Projection belongs to observations and displays, never to physical state.
 * Render spectra and their XYZ/Lab positions are physical and are never
 * clamped. Gamut mapping applies in exactly two places: when showing a color
 * on a display, and when comparing a render against an observation that was
 * itself gamut-limited, such as a published hex. An in-gamut artwork target
 * compared against a physical render gets no projection on either side.
 */

import { type Color, differenceCiede2000 } from "culori";
import { hexToRgb, linearToGamutRgb, rgbToCulori } from "./color";
import { goldenMin } from "./optimize";

export interface KBand {
  readonly center: number;
  readonly width: number;
  readonly amplitude: number;
}

export interface ScatterSpec {
  /** Dimensionless S·D at 550 nm for a full-coverage film. */
  readonly sd: number;
  /** Power law S(λ) = sd·(550/λ)^tilt; omitted means flat. Every ink that
   *  sets it carries TiO₂, and the exponent is the one measured off gray. */
  readonly tilt?: number;
}

export interface FluorescenceParams {
  readonly exCenter: number;
  readonly exWidth: number;
  readonly emCenter: number;
  readonly emWidth: number;
  readonly quantumYield: number;
}

export const WAVELENGTHS: readonly number[] = (() => {
  const out: number[] = [];
  for (let l = 380; l <= 730; l += 10) out.push(l);
  return out;
})();
export const BIN_COUNT = WAVELENGTHS.length; // 36

// CIE Standard Illuminant D65, normalized so SPD(560 nm) = 100.
// Source: CIE 015 / ASTM E308.
// prettier-ignore
const D65: readonly number[] = [
  49.9755, 54.6482, 82.7549, 91.486, 93.4318, 86.6823, 104.865, 117.008,
  117.812, 114.861, 115.923, 108.811, 109.354, 107.802, 104.79, 107.689,
  104.405, 104.046, 100.0, 96.3342, 95.788, 88.6856, 90.0062, 89.5991, 87.6987,
  83.2886, 83.6992, 80.0268, 80.2146, 82.2778, 78.2842, 69.7213, 71.6091,
  74.349, 61.604, 69.8856,
];

// CIE 1931 2° standard observer color-matching functions.
// prettier-ignore
const CMF_X: readonly number[] = [
  0.001368, 0.004243, 0.01431, 0.04351, 0.13438, 0.2839, 0.34828, 0.3362,
  0.2908, 0.19536, 0.09564, 0.03201, 0.0049, 0.0093, 0.06327, 0.1655, 0.2904,
  0.43345, 0.5945, 0.7621, 0.9163, 1.0263, 1.0622, 1.0026, 0.85445, 0.6424,
  0.4479, 0.2835, 0.1649, 0.0874, 0.04677, 0.0227, 0.011359, 0.00579, 0.002899,
  0.00144,
];
// prettier-ignore
const CMF_Y: readonly number[] = [
  0.000039, 0.00012, 0.000396, 0.00121, 0.004, 0.0116, 0.023, 0.038, 0.06,
  0.09098, 0.13902, 0.20802, 0.323, 0.503, 0.71, 0.862, 0.954, 0.99495, 0.995,
  0.952, 0.87, 0.757, 0.631, 0.503, 0.381, 0.265, 0.175, 0.107, 0.061, 0.032,
  0.017, 0.00821, 0.004102, 0.002091, 0.001047, 0.00052,
];
// prettier-ignore
const CMF_Z: readonly number[] = [
  0.00645, 0.02005, 0.06785, 0.2074, 0.6456, 1.3856, 1.74706, 1.77211, 1.6692,
  1.28764, 0.81295, 0.46518, 0.272, 0.1582, 0.07825, 0.04216, 0.0203, 0.00875,
  0.0039, 0.0021, 0.00165, 0.0011, 0.0008, 0.00034, 0.00019, 0.00005, 0.00002,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
];

// Y normalizer so that perfect-reflectance white under D65 → Y = 1.
const Y_NORM = (() => {
  let s = 0;
  for (let i = 0; i < BIN_COUNT; i++) s += D65[i] * CMF_Y[i];
  return s;
})();

// D65 * CMF pre-divided by Y_NORM — turns spectrum → XYZ into one dot product.
const D65_X = new Float64Array(BIN_COUNT);
const D65_Y = new Float64Array(BIN_COUNT);
const D65_Z = new Float64Array(BIN_COUNT);
for (let i = 0; i < BIN_COUNT; i++) {
  D65_X[i] = (D65[i] * CMF_X[i]) / Y_NORM;
  D65_Y[i] = (D65[i] * CMF_Y[i]) / Y_NORM;
  D65_Z[i] = (D65[i] * CMF_Z[i]) / Y_NORM;
}

// Linear sRGB ↔ XYZ matrices for D65 white point (IEC 61966-2-1).
// prettier-ignore
const M_XYZ_TO_LINSRGB: readonly [number, number, number][] = [
  [3.2404542, -1.5371385, -0.4985314],
  [-0.969266, 1.8760108, 0.041556],
  [0.0556434, -0.2040259, 1.0572252],
];

/** Reflectance of the flat Lambertian paper every render sits on. */
export const PAPER_R = 0.95;
const FILM_THICKNESS = 1.0;

/**
 * Build K(λ), from a measured spectrum where the ink has one and from kBands +
 * baseline otherwise. `kScale` scales both, but it means different things: on
 * bands it is the unknown that turns a pigment template into an amount of
 * pigment, on a measurement it is only the ratio between the film the
 * instrument saw and the one being modeled. So it defaults to 1 for a
 * measurement — the measurement as read — and to 0 for bands, leaving a
 * template with no evidence behind it contributing nothing.
 */
export function buildK(spec: LayerSpec): Float64Array {
  const k = new Float64Array(BIN_COUNT);
  if (spec.kSpectrum) {
    const kScale = spec.kScale ?? 1;
    for (let i = 0; i < BIN_COUNT; i++) k[i] = kScale * spec.kSpectrum[i];
    return k;
  } else {
    const baseline = spec.baseline ?? 0;
    const kScale = spec.kScale ?? 0;
    for (let i = 0; i < BIN_COUNT; i++) {
      const lambda = WAVELENGTHS[i];
      let sum = 0;
      if (spec.kBands) {
        for (const band of spec.kBands) {
          const z = (lambda - band.center) / band.width;
          sum += band.amplitude * Math.exp(-z * z);
        }
      }
      k[i] = baseline + kScale * sum;
    }
    return k;
  }
}

/** Build S(λ)·D from a scatter spec; all-zero when the ink doesn't scatter. */
function buildS(scatter: ScatterSpec | undefined): Float64Array {
  const s = new Float64Array(BIN_COUNT);
  if (scatter) {
    const tilt = scatter.tilt ?? 0;
    for (let i = 0; i < BIN_COUNT; i++) {
      s[i] = scatter.sd * (550 / WAVELENGTHS[i]) ** tilt;
    }
  }
  return s;
}

/**
 * S·D below which a layer takes the pure-absorber path. Measured rather than
 * guessed: the closed form's departure from exp(−K·D) tracks S·D linearly
 * down to 1e-14 and bottoms out in double-rounding noise (~1 ulp) at 1e-15
 * and below, so this is the largest threshold that discards nothing physical.
 * The branch also buys exactness — the closed form's sqrt costs τ roughly
 * K·D·eps of relative accuracy, which matters for deep blacks.
 */
const SCATTER_FLOOR = 1e-15;

/**
 * Intrinsic reflectance ρ and transmittance τ of one layer at coverage α,
 * with α acting as a thickness multiplier on both K·D and S·D.
 *
 * The textbook form (a = 1 + K/S, ρ = sinh(bSD)/(a·sinh(bSD) + b·cosh(bSD)))
 * blows up as S → 0. This is the same function of (K·D, S·D) with a and b
 * substituted out, leaving only additions of positive terms, so it stays
 * accurate all the way down to the floor.
 */
function layerOptics(
  k: Float64Array,
  s: Float64Array,
  alpha: number,
  rho: Float64Array,
  tau: Float64Array,
): void {
  for (let i = 0; i < BIN_COUNT; i++) {
    const kd = alpha * k[i] * FILM_THICKNESS;
    const sd = alpha * s[i];
    if (sd <= SCATTER_FLOOR) {
      rho[i] = 0;
      tau[i] = Math.exp(-kd);
    } else if (kd <= 0) {
      // Pure scatterer; the general form is 0/0 here.
      rho[i] = sd / (1 + sd);
      tau[i] = 1 / (1 + sd);
    } else {
      // hypArg is b·S·D and scaledSum is S·D·(a + b).
      const hypArg = Math.sqrt(kd * (kd + 2 * sd));
      const decay = -Math.expm1(-2 * hypArg);
      const scaledSum = kd + sd + hypArg;
      const denom = (kd + hypArg) * (kd + 2 * sd + hypArg) + sd * sd * decay;
      rho[i] = (scaledSum * sd * decay) / denom;
      tau[i] = (2 * hypArg * scaledSum * Math.exp(-hypArg)) / denom;
    }
  }
}

/** Normalized gaussian over the wavelength grid (sum to 1). */
function gaussianBins(center: number, width: number): Float64Array {
  const g = new Float64Array(BIN_COUNT);
  let total = 0;
  for (let i = 0; i < BIN_COUNT; i++) {
    const z = (WAVELENGTHS[i] - center) / width;
    g[i] = Math.exp(-z * z);
    total += g[i];
  }
  if (total > 0) for (let i = 0; i < BIN_COUNT; i++) g[i] /= total;
  return g;
}

export interface SpectralLayer {
  readonly k: Float64Array;
  /** Kubelka S(λ)·D; all zeros for a non-scattering ink. */
  readonly s: Float64Array;
  readonly fluorescence?: FluorescenceParams | undefined;
}

export interface LayerSpec {
  readonly kBands?: readonly KBand[];
  /** Per-bin K·D recovered from a measurement; supersedes kBands + baseline. */
  readonly kSpectrum?: readonly number[];
  readonly baseline?: number;
  readonly kScale?: number;
  readonly scatter?: ScatterSpec;
  readonly fluorescence?: FluorescenceParams;
}

/** Build per-ink spectral layers (K-band cache). */
export function buildLayer(spec: LayerSpec): SpectralLayer {
  return {
    k: buildK(spec),
    s: buildS(spec.scatter),
    fluorescence: spec.fluorescence,
  };
}

/** Largest K·D `absorptionFromFilm` will bisect to. A film this dark passes
 *  exp(−80), which is already below double precision's reach next to paper. */
const DENSITY_CEILING = 40;

/**
 * Per-bin K·D of a film measured as `solid` over `paper` from the same sheet,
 * given the scattering the ink is assigned.
 *
 * Absorption is what a reading of a printed solid determines, and reflectance
 * is not: the model lays the film on its own flat paper rather than on the
 * sheet it was printed on, and a sheet carrying an optical brightener reads
 * above 1.0 where a reflectance cannot. Working in the ratio also cancels the
 * substrate, which is the whole reason the paper has to come from the same
 * sheet as the solid.
 *
 * Without scattering the film is R = exp(−2·K·D)·R_paper and the log inverts
 * it exactly. With scattering the two-flux reflectance falls monotonically in
 * K at fixed S, from the pure scatterer's value down to zero, so a bisection
 * inverts it; a solid brighter than its own pure-scatterer bound has no
 * solution and pins at K = 0.
 */
export function absorptionFromFilm(
  solid: readonly number[],
  paper: readonly number[],
  scatter?: ScatterSpec,
): number[] {
  if (!scatter) {
    return Array.from(
      { length: BIN_COUNT },
      (_, i) =>
        // A measured zero is the instrument's floor, not an opaque film.
        Math.log(Math.max(solid[i] / paper[i], 1e-6)) / -2,
    );
  } else {
    const s = buildS(scatter);
    const lo = new Float64Array(BIN_COUNT);
    const hi = new Float64Array(BIN_COUNT).fill(DENSITY_CEILING);
    const mid = new Float64Array(BIN_COUNT);
    const rho = new Float64Array(BIN_COUNT);
    const tau = new Float64Array(BIN_COUNT);
    for (let iter = 0; iter < 60; iter++) {
      for (let i = 0; i < BIN_COUNT; i++) mid[i] = (lo[i] + hi[i]) / 2;
      layerOptics(mid, s, 1, rho, tau);
      for (let i = 0; i < BIN_COUNT; i++) {
        const under = paper[i];
        const r = rho[i] + (tau[i] * tau[i] * under) / (1 - rho[i] * under);
        if (r > solid[i]) lo[i] = mid[i];
        else hi[i] = mid[i];
      }
    }
    return Array.from(mid);
  }
}

/**
 * Forward render: opacities + layers (paper-adjacent first) → reflectance
 * spectrum R(λ). Handles fluorescence in a two-pass scheme.
 */
export function spectralForward(
  opacities: readonly number[],
  layers: readonly SpectralLayer[],
): Float64Array {
  const n = opacities.length;
  // Pass 1: per-layer optics + non-fluorescent R(λ).
  const ts: Float64Array[] = new Array(n);
  const rho = new Float64Array(BIN_COUNT);
  const r = new Float64Array(BIN_COUNT);
  for (let i = 0; i < BIN_COUNT; i++) r[i] = PAPER_R;
  for (let i = 0; i < n; i++) {
    const tau = new Float64Array(BIN_COUNT);
    layerOptics(layers[i].k, layers[i].s, opacities[i], rho, tau);
    ts[i] = tau;
    for (let b = 0; b < BIN_COUNT; b++) {
      r[b] = rho[b] + (tau[b] * tau[b] * r[b]) / (1 - rho[b] * r[b]);
    }
  }
  // Pass 2: add fluorescence contribution per fluorescent layer.
  for (let i = 0; i < n; i++) {
    const f = layers[i].fluorescence;
    if (!f) continue;
    // Transmittance of all layers ABOVE i (light goes down through them to
    // excite, emission travels back up through the same layers). Attenuated by
    // τ alone, so a scattering layer above a fluorescent one — white over
    // fluorescent pink, say — under-attenuates: its ρ and the light it bounces
    // back down are both dropped, though pass 1 gives that same layer full
    // interreflection. A known approximation, not a free simplification.
    const tAbove = new Float64Array(BIN_COUNT);
    for (let b = 0; b < BIN_COUNT; b++) tAbove[b] = 1;
    for (let j = i + 1; j < n; j++) {
      for (let b = 0; b < BIN_COUNT; b++) tAbove[b] *= ts[j][b];
    }
    const exc = gaussianBins(f.exCenter, f.exWidth);
    const emm = gaussianBins(f.emCenter, f.emWidth);
    let excited = 0;
    for (let b = 0; b < BIN_COUNT; b++) {
      excited += D65[b] * exc[b] * tAbove[b] * opacities[i];
    }
    const magnitude = f.quantumYield * excited;
    for (let b = 0; b < BIN_COUNT; b++) {
      if (D65[b] > 0) {
        r[b] += (magnitude * emm[b] * tAbove[b]) / D65[b];
      }
    }
  }
  return r;
}

/**
 * Build Neugebauer primaries for a given layer set. Each "primary" is the
 * spectral reflectance of one possible dot-overlap subset at full coverage —
 * 2^N entries indexed by bitmask (bit i set ⇒ ink i is present in that
 * subset). Order-dependent for fluorescent and scattering inks;
 * order-invariant otherwise.
 */
export function ndPrimaries(layers: readonly SpectralLayer[]): Float64Array[] {
  const n = layers.length;
  const total = 1 << n;
  const out: Float64Array[] = new Array(total);
  const subset: SpectralLayer[] = [];
  const alphas: number[] = [];
  for (let mask = 0; mask < total; mask++) {
    subset.length = 0;
    alphas.length = 0;
    for (let i = 0; i < n; i++) {
      if ((mask >> i) & 1) {
        subset.push(layers[i]);
        alphas.push(1);
      }
    }
    out[mask] = spectralForward(alphas, subset);
  }
  return out;
}

/**
 * Primaries for many orderings of one pool, sharing work between them.
 *
 * A primary is the spectrum of a stack, so it depends only on which inks are
 * in that stack and the order they went down in — permutations that agree on
 * a subset's relative order get a bit-identical result. Across all 5040
 * orderings of seven inks that is 13,700 distinct stacks rather than 645,120
 * builds, which is the difference between a multi-second stall and a blink
 * before the print-order race can take its first sample.
 */
export function permutedPrimaries(
  layers: readonly SpectralLayer[],
  perms: readonly (readonly number[])[],
): Float64Array[][] {
  // Ink indices pack into 3 bits apiece, biased so a zero limb ends the stack.
  if (layers.length > 7) throw new Error("pool too wide to key stacks");
  const stacks = new Map<number, Float64Array>();
  const subset: SpectralLayer[] = [];
  const alphas: number[] = [];
  return perms.map((perm) => {
    const total = 1 << perm.length;
    const out: Float64Array[] = new Array(total);
    for (let mask = 0; mask < total; mask++) {
      subset.length = 0;
      alphas.length = 0;
      let key = 0;
      for (let position = 0; position < perm.length; position++) {
        if ((mask >> position) & 1) {
          const ink = perm[position];
          subset.push(layers[ink]);
          alphas.push(1);
          key = (key << 3) | (ink + 1);
        }
      }
      let stack = stacks.get(key);
      if (stack === undefined) {
        stack = spectralForward(alphas, subset);
        stacks.set(key, stack);
      }
      out[mask] = stack;
    }
    return out;
  });
}

/**
 * Pre-integrate each primary's spectrum to D65-weighted XYZ for the solver's
 * fast inner loop. Returns a flat `Float64Array` of length 3·numPrimaries.
 */
export function ndPrimariesXyz(
  primaries: readonly Float64Array[],
): Float64Array {
  const out = new Float64Array(primaries.length * 3);
  for (let p = 0; p < primaries.length; p++) {
    const r = primaries[p];
    let X = 0;
    let Y = 0;
    let Z = 0;
    for (let i = 0; i < BIN_COUNT; i++) {
      X += r[i] * D65_X[i];
      Y += r[i] * D65_Y[i];
      Z += r[i] * D65_Z[i];
    }
    out[p * 3] = X;
    out[p * 3 + 1] = Y;
    out[p * 3 + 2] = Z;
  }
  return out;
}

/**
 * Halftone forward via area-weighted average of primaries' XYZ, over the
 * subset weights from `demichelWeights`. Fast path for the solver — avoids
 * the per-bin spectrum sum since the primaries' XYZ are pre-cached.
 */
export function ndForwardXyz(
  weights: Float64Array,
  primariesXyz: Float64Array,
): [number, number, number] {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let mask = 0; mask < weights.length; mask++) {
    const w = weights[mask];
    if (w === 0) continue;
    X += w * primariesXyz[mask * 3];
    Y += w * primariesXyz[mask * 3 + 1];
    Z += w * primariesXyz[mask * 3 + 2];
  }
  return [X, Y, Z];
}

/**
 * Halftone forward in spectrum domain — needed when the caller wants the
 * full R(λ) (e.g. for the final preview composite or fluorescence updates).
 */
export function ndForward(
  weights: Float64Array,
  primaries: readonly Float64Array[],
): Float64Array {
  const r = new Float64Array(BIN_COUNT);
  for (let mask = 0; mask < weights.length; mask++) {
    const w = weights[mask];
    if (w === 0) continue;
    const r_p = primaries[mask];
    for (let b = 0; b < BIN_COUNT; b++) {
      r[b] += w * r_p[b];
    }
  }
  return r;
}

/** D65 XYZ → linear sRGB (no gamma encoding). */
export function xyzToLinearSrgb(
  X: number,
  Y: number,
  Z: number,
): [number, number, number] {
  return [
    M_XYZ_TO_LINSRGB[0][0] * X +
      M_XYZ_TO_LINSRGB[0][1] * Y +
      M_XYZ_TO_LINSRGB[0][2] * Z,
    M_XYZ_TO_LINSRGB[1][0] * X +
      M_XYZ_TO_LINSRGB[1][1] * Y +
      M_XYZ_TO_LINSRGB[1][2] * Z,
    M_XYZ_TO_LINSRGB[2][0] * X +
      M_XYZ_TO_LINSRGB[2][1] * Y +
      M_XYZ_TO_LINSRGB[2][2] * Z,
  ];
}

/** Reflectance spectrum → D65 XYZ, scaled so a perfect diffuser gives Y = 1. */
export function spectrumToXyz(r: Float64Array): [number, number, number] {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let i = 0; i < BIN_COUNT; i++) {
    X += r[i] * D65_X[i];
    Y += r[i] * D65_Y[i];
    Z += r[i] * D65_Z[i];
  }
  return [X, Y, Z];
}

/** Reflectance spectrum → linear sRGB; negative outside the sRGB primaries. */
export function spectrumToLinearSrgb(
  r: Float64Array,
): [number, number, number] {
  const [X, Y, Z] = spectrumToXyz(r);
  return xyzToLinearSrgb(X, Y, Z);
}

/**
 * Reflectance spectrum → gamma-encoded sRGB triple in [0, 255]. Several riso
 * inks sit outside the sRGB primaries, and the closest a display can come is
 * their hue at whatever chroma fits.
 */
export function spectrumToSrgb(r: Float64Array): [number, number, number] {
  const shown = linearToGamutRgb(spectrumToLinearSrgb(r));
  return [
    Math.round(255 * shown.r),
    Math.round(255 * shown.g),
    Math.round(255 * shown.b),
  ];
}

const ciede2000 = differenceCiede2000();

/**
 * CIEDE2000 between a rendered spectrum and a target color, each where it
 * actually sits. The render reaches Lab through XYZ, so an ink outside sRGB
 * is scored at its real chromaticity rather than clipped into the display's.
 */
function physicalDeltaE(render: Float64Array, target: Color): number {
  const [x, y, z] = spectrumToXyz(render);
  return ciede2000({ mode: "xyz65", x, y, z }, target);
}

/**
 * CIEDE2000 between a rendered spectrum and a published hex, scoring the
 * render through the same gamut map a display would apply to it.
 *
 * A hex cannot hold negative red, so the published color of an ink whose real
 * chromaticity lies outside sRGB is already a projection of that ink; a
 * channel pinned to the hull means "at or beyond this wall", not "exactly
 * here". Mapping the render the same way compares like with like. For an
 * interior hex the map is the identity on anything close enough to compete,
 * so this is the honest distance wherever the observation was not censored.
 * Where the render already shares the hex's OKLCh hue and lightness, it is
 * the one-sided treatment censored data calls for: chroma shortfall is
 * penalized and excess is not.
 *
 * That last part is conditional and worth knowing about. The map preserves
 * the *render's* hue, and the sRGB hull's chroma varies strongly with it, so
 * a render whose hue is off gets projected to whatever chroma its own hue
 * allows — which can be well short of the hex's. Blue is the live example:
 * its template renders 17° away in OKLCh hue, where the hull holds a third
 * less chroma than at the hex's hue, so the projection costs it rather than
 * excusing it. Projection forgives censored chroma, never a wrong hue.
 *
 * Per-channel clipping would not do even that much: it moves a color sideways
 * in hue, so a fit could match a hex at the wrong hue and let the clip drag
 * it back.
 */
function projectedDeltaE(render: Float64Array, hex: Color): number {
  return ciede2000(linearToGamutRgb(spectrumToLinearSrgb(render)), hex);
}

/**
 * Weight on the template-prior tie-break, in ΔE00 per squared log deviation.
 * Sized so it cannot outvote evidence: the largest penalty any ink in the
 * table actually incurs is 4e-4 ΔE00, and the corners of the parameter box
 * (amplitudes ×[0.25, 4], kScale across the coarse sweep) reach only 6e-4.
 * Both are three orders below the hex's own 1/255 quantization floor.
 */
const PRIOR_WEIGHT = 1e-5;

const golden = (f: (x: number) => number, lo: number, hi: number, iters = 40) =>
  goldenMin(f, lo, hi, { iters });

export interface Calibration {
  readonly kScale: number;
  readonly baseline: number;
  /** Per-band amplitude after calibration (matches kBands length). */
  readonly amplitudes: readonly number[];
  /** Tuned fluorescence parameters for fluorescent inks; undefined otherwise. */
  readonly fluorescence: FluorescenceParams | undefined;
  readonly deltaE: number;
}

/** Bounds on the one free parameter a measured ink has. Same ×[0.25, 4] box
 *  the band amplitudes get, and for the same reason: a fit that has to leave
 *  it has stopped describing the ink it started from. */
const DENSITY_MIN = 0.25;
const DENSITY_MAX = 4;

/**
 * Fit the one thing a measured ink leaves open: how thick its film is here.
 *
 * A reading of a printed solid determines K·D — the ink's absorption times the
 * thickness the press that printed it laid down. The shape of K(λ) is the
 * ink's and is taken as given; the multiplier is that press's, and the
 * published hex is the only observation of the density riso's own reference
 * prints at. So the hex moves the spectrum along exactly one axis and can
 * never reshape it, which is what makes the measurement un-overridable rather
 * than merely preferred.
 *
 * One coordinate, so the coarse sweep is nearly exhaustive on its own; the
 * golden refinement and the physical-then-projected order are the same
 * discipline `calibrateKScale` uses, for the same reason.
 */
function calibrateDensity(target: Color, spec: LayerSpec): Calibration {
  let density = DENSITY_MIN;
  const render = (d: number): Float64Array =>
    spectralForward([1], [buildLayer({ ...spec, kScale: d })]);
  // Absent evidence, stay at the density the instrument actually saw.
  const evaluate = (
    score: (r: Float64Array, t: Color) => number,
    d: number,
  ): number => score(render(d), target) + PRIOR_WEIGHT * Math.log(d) ** 2;

  let best = Infinity;
  const steps = 64;
  for (let i = 0; i <= steps; i++) {
    const d = DENSITY_MIN * (DENSITY_MAX / DENSITY_MIN) ** (i / steps);
    const err = evaluate(physicalDeltaE, d);
    if (err < best) {
      best = err;
      density = d;
    }
  }
  for (const score of [physicalDeltaE, projectedDeltaE]) {
    const incumbent = evaluate(score, density);
    const found = Math.exp(
      golden(
        (logD) => evaluate(score, Math.exp(logD)),
        Math.log(DENSITY_MIN),
        Math.log(DENSITY_MAX),
        30,
      ),
    );
    if (evaluate(score, found) <= incumbent) density = found;
  }

  return {
    kScale: density,
    baseline: 0,
    amplitudes: [],
    fluorescence: spec.fluorescence,
    deltaE: projectedDeltaE(render(density), target),
  };
}

/**
 * Search for KM parameters that best reproduce `hex` at α=1. An ink carrying
 * a measurement has no parameters to search but its thickness, and hands off
 * to `calibrateDensity`; everything below is the hex-fitted template path.
 *
 * Tunes kScale, baseline, and per-band amplitude. For fluorescent inks also
 * tunes Φ and ex/em centers and widths — the gaussian Stokes-shift
 * approximation is crude enough that those need slack.
 *
 * Band centers/widths come from pigment-chemistry priors and stay fixed —
 * these encode where the pigment absorbs. Amplitudes encode unknown
 * stoichiometry, so tuning them is physically reasonable. Per-band scaling
 * is bounded to keep the calibrated amplitude near its prior so we don't
 * overfit a degenerate K(λ) just to nail the single-ink hex.
 *
 * Coordinate descent over the parameters via golden-section 1D searches,
 * after a coarse log-sweep on kScale to land in a sane basin, run twice: once
 * against the physical distance and again against the projected one. The
 * projection flattens everything past the gamut hull into a surface, which
 * grows local minima the physical distance doesn't have — several inks that
 * fit their hex exactly settled 5–20 ΔE00 away when the projected objective
 * was searched cold. Solving the unrelaxed problem first and only then
 * letting the relaxation improve on it makes "projection cannot hurt" true by
 * construction rather than by hope.
 *
 * Each coordinate step keeps its result only if it beats the incumbent, since
 * golden-section returns the middle of its final bracket whether or not the
 * coordinate was unimodal, and on a projected objective it often is not.
 *
 * What the search minimizes is the residual plus a `PRIOR_WEIGHT` tie-break;
 * the reported `deltaE` is the projected residual alone, since that is what
 * eligibility is a statement about.
 */
export function calibrateKScale(hex: string, spec: LayerSpec): Calibration {
  const target = rgbToCulori(hexToRgb(hex));

  if (spec.kSpectrum) return calibrateDensity(target, spec);

  const initialAmps = spec.kBands?.map((b) => b.amplitude) ?? [];

  if (initialAmps.length === 0) {
    // Transparent / no pigment — single layer at α=1 just yields paper.
    const layer = buildLayer({ ...spec, kScale: 0 });
    const r = spectralForward([1], [layer]);
    return {
      kScale: 0,
      baseline: spec.baseline ?? 0,
      amplitudes: [],
      fluorescence: spec.fluorescence,
      deltaE: projectedDeltaE(r, target),
    };
  }

  let kScale = spec.kScale ?? 1;
  let baseline = spec.baseline ?? 0;
  const ampScales = initialAmps.map(() => 1);
  // Fluorescent inks: tune all five fluorescence parameters. Centers vary
  // ±40 nm around the prior to stay near the right emission peak; widths
  // can scale 0.5x..2x. Without this, the gaussian approximation of the
  // Stokes shape leaves big residuals for some rhodamine-family inks.
  const fluorInitial = spec.fluorescence;
  let quantumYield = fluorInitial?.quantumYield ?? 0;
  let exCenter = fluorInitial?.exCenter ?? 0;
  let emCenter = fluorInitial?.emCenter ?? 0;
  let exWidth = fluorInitial?.exWidth ?? 1;
  let emWidth = fluorInitial?.emWidth ?? 1;
  const hasFluor = fluorInitial !== undefined;

  const render = (): Float64Array => {
    const bands = (spec.kBands ?? []).map((b, i) => ({
      ...b,
      amplitude: initialAmps[i] * ampScales[i],
    }));
    const fluorescence = hasFluor
      ? {
          quantumYield,
          exCenter,
          emCenter,
          exWidth,
          emWidth,
        }
      : undefined;
    const layer = buildLayer({
      ...spec,
      kBands: bands,
      baseline,
      kScale,
      fluorescence,
    });
    return spectralForward([1], [layer]);
  };

  let score = physicalDeltaE;

  // The projection is flat in chroma past the hull, so renders the hex cannot
  // tell apart still have to be ranked somehow. The pigment template is the
  // only physics on hand: absent evidence, stay near it.
  const priorKScale = spec.kScale ?? 1;
  const evaluate = (): number => {
    // A zero prior says nothing about scale — K is then flat baseline — so
    // its term drops out rather than diverging.
    let deviation = priorKScale > 0 ? Math.log(kScale / priorKScale) ** 2 : 0;
    for (const scale of ampScales) deviation += Math.log(scale) ** 2;
    return score(render(), target) + PRIOR_WEIGHT * deviation;
  };

  /** Golden-section over one coordinate, rejecting a step that loses ground.
   *  `apply` sets the coordinate and returns the objective there. */
  const refine = (
    apply: (x: number) => number,
    lo: number,
    hi: number,
    current: number,
  ): number => {
    const incumbent = apply(current);
    const found = golden(apply, lo, hi, 30);
    if (apply(found) <= incumbent) {
      return found;
    } else {
      apply(current);
      return current;
    }
  };

  // Coordinate descent over (kScale, baseline, ampScale_i). Each coordinate
  // gets a golden-section 1D search; bounded so amplitudes stay close to
  // their pigment-template priors (×[0.25, 4]).
  const descend = (): void => {
    for (let sweep = 0; sweep < 12; sweep++) {
      const beforeErr = evaluate();

      kScale = Math.exp(
        refine(
          (logS) => {
            kScale = Math.exp(logS);
            return evaluate();
          },
          Math.log(kScale / 5),
          Math.log(kScale * 5),
          Math.log(kScale),
        ),
      );
      baseline = refine(
        (b) => {
          baseline = b;
          return evaluate();
        },
        0,
        0.2,
        baseline,
      );
      for (let i = 0; i < ampScales.length; i++) {
        ampScales[i] = refine(
          (s) => {
            ampScales[i] = s;
            return evaluate();
          },
          0.25,
          4,
          ampScales[i],
        );
      }
      if (hasFluor) {
        quantumYield = refine(
          (q) => {
            quantumYield = q;
            return evaluate();
          },
          0,
          2,
          quantumYield,
        );
        exCenter = refine(
          (c) => {
            exCenter = c;
            return evaluate();
          },
          Math.max(380, (fluorInitial?.exCenter ?? 0) - 60),
          Math.min(730, (fluorInitial?.exCenter ?? 0) + 60),
          exCenter,
        );
        emCenter = refine(
          (c) => {
            emCenter = c;
            return evaluate();
          },
          Math.max(380, (fluorInitial?.emCenter ?? 0) - 60),
          Math.min(730, (fluorInitial?.emCenter ?? 0) + 60),
          emCenter,
        );
        exWidth = refine(
          (w) => {
            exWidth = w;
            return evaluate();
          },
          (fluorInitial?.exWidth ?? 1) * 0.5,
          (fluorInitial?.exWidth ?? 1) * 2,
          exWidth,
        );
        emWidth = refine(
          (w) => {
            emWidth = w;
            return evaluate();
          },
          (fluorInitial?.emWidth ?? 1) * 0.5,
          (fluorInitial?.emWidth ?? 1) * 2,
          emWidth,
        );
      }

      const afterErr = evaluate();
      if (beforeErr - afterErr < 1e-4) break;
    }
  };

  // Coarse log-scale sweep on kScale alone — gets us into the right basin
  // before the joint optimization.
  const coarse = [0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500];
  let bestScale = coarse[0];
  let bestErr = Infinity;
  for (const s of coarse) {
    kScale = s;
    const e = evaluate();
    if (e < bestErr) {
      bestErr = e;
      bestScale = s;
    }
  }
  kScale = bestScale;

  descend();
  score = projectedDeltaE;
  descend();

  return {
    kScale,
    baseline,
    amplitudes: initialAmps.map((a, i) => a * ampScales[i]),
    fluorescence: hasFluor
      ? { quantumYield, exCenter, emCenter, exWidth, emWidth }
      : undefined,
    deltaE: projectedDeltaE(render(), target),
  };
}
