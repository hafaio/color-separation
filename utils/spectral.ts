/**
 * Spectral primitives for Kubelka-Munk ink mixing.
 *
 * Conventions:
 * - 36-bin wavelength grid, 380–730 nm in 10 nm steps.
 * - D65 illuminant + CIE 1931 2° standard observer.
 * - Paper modeled as a flat-reflectance Lambertian (default R_p = 0.95).
 * - Inks treated as transparent absorbers (single-constant K-M reduces to
 *   Beer–Lambert two-pass: R_total = T(λ)² · R_below). For our riso inks
 *   this is accurate enough; the reference's more general K-M layer-stacking
 *   formula collapses to this when ink scattering is negligible.
 * - Fluorescence handled in a two-pass scheme: pass 1 computes the
 *   non-fluorescent R(λ), pass 2 adds each fluorescent layer's emission
 *   attenuated by the layers above it.
 */

import * as d3color from "d3-color";
import { srgbEncode } from "./color";
import { goldenMin } from "./optimize";

export interface KBand {
  readonly center: number;
  readonly width: number;
  readonly amplitude: number;
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

const PAPER_R = 0.95;
const FILM_THICKNESS = 1.0;

/** Build K(λ) from kBands + baseline + kScale. */
export function buildK(
  bands: readonly KBand[] | undefined,
  baseline: number,
  kScale: number,
): Float64Array {
  const k = new Float64Array(BIN_COUNT);
  for (let i = 0; i < BIN_COUNT; i++) {
    const lambda = WAVELENGTHS[i];
    let sum = 0;
    if (bands) {
      for (const band of bands) {
        const z = (lambda - band.center) / band.width;
        sum += band.amplitude * Math.exp(-z * z);
      }
    }
    k[i] = baseline + kScale * sum;
  }
  return k;
}

/** Transmittance through a layer at coverage α, given K(λ). */
function transmittance(k: Float64Array, alpha: number): Float64Array {
  const t = new Float64Array(BIN_COUNT);
  for (let i = 0; i < BIN_COUNT; i++) {
    t[i] = Math.exp(-alpha * k[i] * FILM_THICKNESS);
  }
  return t;
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
  readonly fluorescence?: FluorescenceParams | undefined;
}

export interface LayerSpec {
  readonly kBands?: readonly KBand[];
  readonly baseline?: number;
  readonly kScale?: number;
  readonly fluorescence?: FluorescenceParams;
}

/** Build per-ink spectral layers (K-band cache). */
export function buildLayer(spec: LayerSpec): SpectralLayer {
  return {
    k: buildK(spec.kBands, spec.baseline ?? 0, spec.kScale ?? 0),
    fluorescence: spec.fluorescence,
  };
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
  // Pass 1: per-layer transmittance + non-fluorescent R(λ).
  const ts: Float64Array[] = new Array(n);
  const r = new Float64Array(BIN_COUNT);
  for (let i = 0; i < BIN_COUNT; i++) r[i] = PAPER_R;
  for (let i = 0; i < n; i++) {
    ts[i] = transmittance(layers[i].k, opacities[i]);
    for (let b = 0; b < BIN_COUNT; b++) r[b] = ts[i][b] * ts[i][b] * r[b];
  }
  // Pass 2: add fluorescence contribution per fluorescent layer.
  for (let i = 0; i < n; i++) {
    const f = layers[i].fluorescence;
    if (!f) continue;
    // Transmittance of all layers ABOVE i (light goes down through them to
    // excite, emission travels back up through the same layers).
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
 * subset). Order-dependent for fluorescent inks; order-invariant otherwise.
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
 * Halftone forward via area-weighted average of primaries' XYZ. Fast path
 * for the solver — avoids the per-bin spectrum sum since the primaries'
 * XYZ are pre-cached.
 */
export function ndForwardXyz(
  opacities: readonly number[],
  primariesXyz: Float64Array,
): [number, number, number] {
  const n = opacities.length;
  const total = 1 << n;
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let mask = 0; mask < total; mask++) {
    let w = 1;
    for (let i = 0; i < n; i++) {
      w *= (mask >> i) & 1 ? opacities[i] : 1 - opacities[i];
    }
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
  opacities: readonly number[],
  primaries: readonly Float64Array[],
): Float64Array {
  const n = opacities.length;
  const total = 1 << n;
  const r = new Float64Array(BIN_COUNT);
  for (let mask = 0; mask < total; mask++) {
    let w = 1;
    for (let i = 0; i < n; i++) {
      w *= (mask >> i) & 1 ? opacities[i] : 1 - opacities[i];
    }
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

/** Reflectance spectrum → linear sRGB in [0, 1]. Fast path for solvers. */
export function spectrumToLinearSrgb(
  r: Float64Array,
): [number, number, number] {
  let X = 0;
  let Y = 0;
  let Z = 0;
  for (let i = 0; i < BIN_COUNT; i++) {
    X += r[i] * D65_X[i];
    Y += r[i] * D65_Y[i];
    Z += r[i] * D65_Z[i];
  }
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

/** Reflectance spectrum → gamma-encoded sRGB triple in [0, 255]. */
export function spectrumToSrgb(r: Float64Array): [number, number, number] {
  const [lr, lg, lb] = spectrumToLinearSrgb(r);
  return [
    Math.round(255 * srgbEncode(lr)),
    Math.round(255 * srgbEncode(lg)),
    Math.round(255 * srgbEncode(lb)),
  ];
}

/** CIE 1976 (Lab) ΔE between two sRGB colors. */
function deltaELab(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const la = d3color.lab(d3color.rgb(a[0], a[1], a[2]));
  const lb = d3color.lab(d3color.rgb(b[0], b[1], b[2]));
  return Math.sqrt(
    (la.l - lb.l) ** 2 + (la.a - lb.a) ** 2 + (la.b - lb.b) ** 2,
  );
}

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

/**
 * Search for KM parameters that best reproduce `hex` at α=1.
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
 * after a coarse log-sweep on kScale to land in a sane basin.
 */
export function calibrateKScale(hex: string, spec: LayerSpec): Calibration {
  const targetRgb: [number, number, number] = (() => {
    const c = d3color.rgb(hex);
    return [c.r, c.g, c.b];
  })();

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
      deltaE: deltaELab(spectrumToSrgb(r), targetRgb),
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

  const evaluate = (): number => {
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
    const r = spectralForward([1], [layer]);
    return deltaELab(spectrumToSrgb(r), targetRgb);
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

  // Coordinate descent over (kScale, baseline, ampScale_i). Each coordinate
  // gets a golden-section 1D search; bounded so amplitudes stay close to
  // their pigment-template priors (×[0.25, 4]).
  for (let sweep = 0; sweep < 12; sweep++) {
    const beforeErr = evaluate();

    kScale = Math.exp(
      golden(
        (logS) => {
          kScale = Math.exp(logS);
          return evaluate();
        },
        Math.log(kScale / 5),
        Math.log(kScale * 5),
        30,
      ),
    );
    baseline = golden(
      (b) => {
        baseline = b;
        return evaluate();
      },
      0,
      0.2,
      30,
    );
    for (let i = 0; i < ampScales.length; i++) {
      ampScales[i] = golden(
        (s) => {
          ampScales[i] = s;
          return evaluate();
        },
        0.25,
        4,
        30,
      );
    }
    if (hasFluor) {
      quantumYield = golden(
        (q) => {
          quantumYield = q;
          return evaluate();
        },
        0,
        2,
        30,
      );
      exCenter = golden(
        (c) => {
          exCenter = c;
          return evaluate();
        },
        Math.max(380, (fluorInitial?.exCenter ?? 0) - 60),
        Math.min(730, (fluorInitial?.exCenter ?? 0) + 60),
        30,
      );
      emCenter = golden(
        (c) => {
          emCenter = c;
          return evaluate();
        },
        Math.max(380, (fluorInitial?.emCenter ?? 0) - 60),
        Math.min(730, (fluorInitial?.emCenter ?? 0) + 60),
        30,
      );
      exWidth = golden(
        (w) => {
          exWidth = w;
          return evaluate();
        },
        (fluorInitial?.exWidth ?? 1) * 0.5,
        (fluorInitial?.exWidth ?? 1) * 2,
        30,
      );
      emWidth = golden(
        (w) => {
          emWidth = w;
          return evaluate();
        },
        (fluorInitial?.emWidth ?? 1) * 0.5,
        (fluorInitial?.emWidth ?? 1) * 2,
        30,
      );
    }

    const afterErr = evaluate();
    if (beforeErr - afterErr < 1e-4) break;
  }

  return {
    kScale,
    baseline,
    amplitudes: initialAmps.map((a, i) => a * ampScales[i]),
    fluorescence: hasFluor
      ? { quantumYield, exCenter, emCenter, exWidth, emWidth }
      : undefined,
    deltaE: evaluate(),
  };
}
