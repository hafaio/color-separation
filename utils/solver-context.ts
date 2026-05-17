/**
 * Shared worker-side machinery: build a solver context from the wire pool +
 * render pool, optionally run auto-ordering, and iterate the unique-color
 * solver loop. Used by both the SVG and raster worker entry points so they
 * stop drifting apart.
 */

import { packRgb, type RgbU32, rgbToD3 } from "./color";
import { INKS_BY_RGB } from "./inks";
import { findAutoOrder } from "./race";
import {
  buildKmCache,
  type ComposeOptions,
  colorSeparation,
  composeColors,
  type MixingMode,
  type SeparationOptions,
} from "./sep";
import { buildLayer, type SpectralLayer } from "./spectral";

function layerFor(rgb: RgbU32): SpectralLayer {
  const ink = INKS_BY_RGB.get(rgb);
  return ink ? buildLayer(ink) : buildLayer({});
}

export interface SolverContext {
  readonly chosenOrder: number[];
  readonly pool: RgbU32[];
  readonly renderPool: RgbU32[];
  readonly poolColors: ReturnType<typeof rgbToD3>[];
  readonly renderColors: ReturnType<typeof rgbToD3>[];
  readonly sepOpts: SeparationOptions;
  readonly composeOpts: ComposeOptions;
}

/**
 * Resolve auto-ordering (if requested), reorder pool / render-pool / spectral
 * layers accordingly, and bundle the per-mode `colorSeparation` /
 * `composeColors` options. The returned options carry any KM caches needed,
 * so the per-pixel loop just calls `colorSeparation(target, pool, sepOpts)`.
 */
export function buildSolverContext(
  poolWire: Uint32Array,
  renderPoolWire: Uint32Array,
  mixingMode: MixingMode,
  autoOrder: boolean,
  counts: ReadonlyMap<RgbU32, number>,
  increments: number,
  lambda: number,
): SolverContext {
  const poolArr: RgbU32[] = Array.from(poolWire) as RgbU32[];
  const renderArr: RgbU32[] = Array.from(renderPoolWire) as RgbU32[];

  const baseLayers = poolArr.map(layerFor);
  const chosenOrder =
    autoOrder && mixingMode !== "subtractive"
      ? findAutoOrder(poolArr, mixingMode, counts, baseLayers)
      : poolArr.map((_, i) => i);

  const pool = chosenOrder.map((i) => poolArr[i]);
  const renderPool = chosenOrder.map((i) => renderArr[i]);
  const poolColors = pool.map(rgbToD3);
  const renderColors = renderPool.map(rgbToD3);
  const layers = chosenOrder.map((i) => baseLayers[i]);
  const renderLayers = renderPool.map(layerFor);

  const sepOpts: SeparationOptions =
    mixingMode === "kubelka_munk"
      ? {
          mode: "kubelka_munk",
          cache: buildKmCache(layers),
          increments,
          lambda,
        }
      : { mode: mixingMode, increments, lambda };
  const composeOpts: ComposeOptions =
    mixingMode === "kubelka_munk"
      ? { mode: "kubelka_munk", cache: buildKmCache(renderLayers) }
      : { mode: mixingMode };

  return {
    chosenOrder,
    pool,
    renderPool,
    poolColors,
    renderColors,
    sepOpts,
    composeOpts,
  };
}

/**
 * Run the per-unique-color solver, writing preview-color RGB and per-channel
 * opacities into the given output buffers, and posting periodic progress.
 * Returns when every color has been processed.
 */
export function solveColors(
  ctx: SolverContext,
  keys: Iterable<RgbU32>,
  total: number,
  prevs: Uint32Array,
  opacs: Float64Array,
  progressScale: number,
  postProgress: (v: number) => void,
): void {
  const batch = Math.max(1, Math.floor(total / 50));
  const n = ctx.poolColors.length;
  let i = 0;
  for (const key of keys) {
    const { opacities } = colorSeparation(
      rgbToD3(key),
      ctx.poolColors,
      ctx.sepOpts,
    );
    const { r, g, b } = composeColors(
      opacities,
      ctx.renderColors,
      ctx.composeOpts,
    ).rgb();
    prevs[i] = packRgb(r, g, b);
    opacs.set(opacities, i * n);
    i++;
    if (i % batch === 0 || i === total) {
      postProgress(progressScale * (i / total));
    }
  }
}
