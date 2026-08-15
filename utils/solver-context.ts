/**
 * Shared worker-side machinery: build a solver context from the wire pool +
 * render pool, optionally run auto-ordering, and iterate the unique-color
 * solver loop. Used by both the SVG and raster worker entry points so they
 * stop drifting apart.
 */

import { culoriToPacked, type RgbU32, rgbToCulori } from "./color";
import { INKS_BY_RGB } from "./inks";
import { findAutoOrder } from "./race";
import {
  buildKmCache,
  type ComposeOptions,
  colorSeparation,
  composeColors,
  type MinInkResult,
  type MixingMode,
  type SeparationOptions,
  separateWithMask,
  withinBudget,
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
  readonly poolColors: ReturnType<typeof rgbToCulori>[];
  readonly renderColors: ReturnType<typeof rgbToCulori>[];
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
  tolerance: number,
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
  const poolColors = pool.map(rgbToCulori);
  const renderColors = renderPool.map(rgbToCulori);
  const layers = chosenOrder.map((i) => baseLayers[i]);
  const renderLayers = renderPool.map(layerFor);

  const sepOpts: SeparationOptions =
    mixingMode === "kubelka_munk"
      ? {
          mode: "kubelka_munk",
          cache: buildKmCache(layers),
          increments,
          tolerance,
        }
      : { mode: mixingMode, increments, tolerance };
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

/** How many distinct ink recipes the whole image is allowed to settle on. */
const RECIPE_PALETTE_SIZE = 12;

/** Share of the progress bar spent on the (much heavier) first pass. */
const FIRST_PASS_FRACTION = 0.85;

/**
 * Run the per-unique-color solver, writing preview-color RGB and per-channel
 * opacities into the given output buffers, and posting periodic progress.
 * Results are written in `counts` iteration order. Returns when every color
 * has been processed.
 *
 * Choosing the cheapest ink subset per color independently shreds smooth
 * gradients — neighboring ramp steps land on unrelated subsets and the seam
 * shows. So this runs two passes: the first solves every color on its own and
 * tallies which recipes the image actually leans on by pixel count, the second
 * re-solves each color against the most-used recipes and adopts the most-used
 * one that still fits that color's tolerance. Colors that genuinely need
 * something unusual keep their own answer. Both passes are order-independent:
 * the palette is ranked by (pixel count, bitmask) rather than by insertion
 * order, and per-color choices never depend on other colors' results beyond
 * that ranking.
 */
export function solveColors(
  ctx: SolverContext,
  counts: ReadonlyMap<RgbU32, number>,
  prevs: Uint32Array,
  opacs: Float64Array,
  progressScale: number,
  postProgress: (v: number) => void,
): void {
  const total = counts.size;
  const batch = Math.max(1, Math.floor(total / 50));
  const channels = ctx.poolColors.length;

  const solved: MinInkResult[] = new Array(total);
  const usage = new Map<number, number>();
  let index = 0;
  for (const [key, count] of counts) {
    const result = colorSeparation(
      rgbToCulori(key),
      ctx.poolColors,
      ctx.sepOpts,
    );
    solved[index] = result;
    usage.set(result.inkMask, (usage.get(result.inkMask) ?? 0) + count);
    index++;
    if (index % batch === 0 || index === total) {
      postProgress(progressScale * FIRST_PASS_FRACTION * (index / total));
    }
  }

  const palette = [...usage]
    .sort(([maskA, countA], [maskB, countB]) =>
      countA === countB ? maskA - maskB : countB - countA,
    )
    .slice(0, RECIPE_PALETTE_SIZE)
    .map(([mask]) => mask);

  index = 0;
  for (const key of counts.keys()) {
    const target = rgbToCulori(key);
    const own = solved[index];
    let opacities = own.opacities;
    for (const mask of palette) {
      // Its own recipe always fits, so reaching it ends the scan for free.
      if (mask === own.inkMask) break;
      const candidate = separateWithMask(
        target,
        ctx.poolColors,
        ctx.sepOpts,
        mask,
      );
      if (withinBudget(candidate.deltaE, own.deltaEBudget)) {
        opacities = candidate.opacities;
        break;
      }
    }
    prevs[index] = culoriToPacked(
      composeColors(opacities, ctx.renderColors, ctx.composeOpts),
    );
    opacs.set(opacities, index * channels);
    index++;
    if (index % batch === 0 || index === total) {
      postProgress(
        progressScale *
          (FIRST_PASS_FRACTION + (1 - FIRST_PASS_FRACTION) * (index / total)),
      );
    }
  }
}
