/**
 * Worker-side automatic print-order search for order-dependent mixing modes.
 *
 * Each permutation of the active pool is an "arm" in a best-arm identification
 * problem. With deterministic frequency-sorted color sampling we get exact
 * structural bounds on each arm's true weighted-mean error:
 *
 *   LCB = errSum / totalMass
 *   UCB = errSum / totalMass + E_MAX · (1 − weight / totalMass)
 *
 * (Unseen colors can contribute at most E_MAX per unit weight to the true
 * mean.) An arm is dominated when its LCB exceeds another arm's UCB. Per
 * round we tighten the leader (lowest UCB) and the challenger (lowest LCB
 * among non-leaders) — LUCB-style. Stops at single survivor, when challenger
 * LCB > leader UCB, or when the leader has covered 30% of the pixel mass.
 * Ties (e.g. all-zero error, identical perms) break toward the fewest
 * inversions vs. the input order — callers pass the pool in their preferred
 * fallback (e.g. lightest→darkest), so "tie ⇒ keep the fallback" falls out
 * naturally.
 */

import { type RgbU32, rgbToCulori } from "./color";
import {
  buildKmCache,
  colorSeparation,
  type MixingMode,
  type SeparationOptions,
} from "./sep";
import type { SpectralLayer } from "./spectral";

const AUTO_PERM_CAP = 7; // skip auto-order above N=7 (5040 perms)
const MASS_FRACTION = 0.3; // pixel mass after which we just accept the leader
const E_MAX = 1.0; // upper bound on per-sample RMS error in linear sRGB
const TIE_EPS = 1e-6; // tolerance for "essentially tied" arm means

export function findAutoOrder(
  pool: readonly RgbU32[],
  mixingMode: MixingMode,
  colorCounts: ReadonlyMap<RgbU32, number>,
  layers?: readonly SpectralLayer[],
): number[] {
  const n = pool.length;
  if (n <= 1 || n > AUTO_PERM_CAP) return identity(n);

  const colorObjs = pool.map(rgbToCulori);
  const perms = permutations(n);
  const permPools = perms.map((p) => p.map((i) => colorObjs[i]));
  const permLayers = layers
    ? perms.map((p) => p.map((i) => layers[i]))
    : undefined;
  // KM mode needs a Neugebauer cache per permutation, but the cache only
  // depends on layer order when at least one layer is fluorescent (the
  // fluorescence pass attenuates emission by layers above it). Without any
  // fluorescent layers, the simplified single-constant K-M is order-
  // invariant, so all permutations can share one cache.
  const fluorInPool =
    layers?.some((layer) => layer.fluorescence !== undefined) ?? false;
  const permKmCaches =
    mixingMode === "kubelka_munk" && permLayers
      ? fluorInPool
        ? permLayers.map(buildKmCache)
        : (() => {
            const shared = buildKmCache(permLayers[0]);
            return permLayers.map(() => shared);
          })()
      : undefined;
  const targets = [...colorCounts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([rgb, count]) => ({ obj: rgbToCulori(rgb), count }));
  const totalMass = targets.reduce((s, t) => s + t.count, 0);
  const massThreshold = MASS_FRACTION * totalMass;

  const errSums = new Float64Array(perms.length);
  const weights = new Float64Array(perms.length);
  const pulled = new Int32Array(perms.length);
  const alive = new Array<boolean>(perms.length).fill(true);

  // Per-perm options hoisted out of the pull loop.
  const permOpts: SeparationOptions[] = perms.map((_, i): SeparationOptions => {
    if (mixingMode === "kubelka_munk") {
      const cache = permKmCaches?.[i];
      if (!cache) throw new Error("kubelka_munk race missing cache");
      return { mode: "kubelka_munk", cache };
    }
    return { mode: mixingMode };
  });

  const pull = (i: number): boolean => {
    if (pulled[i] >= targets.length) return false;
    const t = targets[pulled[i]];
    const { error } = colorSeparation(t.obj, permPools[i], permOpts[i]);
    errSums[i] += t.count * error;
    weights[i] += t.count;
    pulled[i]++;
    return true;
  };

  // Seed each arm with one pull so its bounds are defined.
  for (let i = 0; i < perms.length; i++) pull(i);

  while (true) {
    let minUCB = Infinity;
    for (let i = 0; i < perms.length; i++) {
      if (!alive[i]) continue;
      const ucb = errSums[i] / totalMass + E_MAX * (1 - weights[i] / totalMass);
      if (ucb < minUCB) minUCB = ucb;
    }
    let aliveCount = 0;
    for (let i = 0; i < perms.length; i++) {
      if (!alive[i]) continue;
      const lcb = errSums[i] / totalMass;
      if (lcb > minUCB) alive[i] = false;
      else aliveCount++;
    }
    if (aliveCount <= 1) break;

    let leader = -1;
    let leaderUCB = Infinity;
    for (let i = 0; i < perms.length; i++) {
      if (!alive[i]) continue;
      const ucb = errSums[i] / totalMass + E_MAX * (1 - weights[i] / totalMass);
      if (ucb < leaderUCB) {
        leaderUCB = ucb;
        leader = i;
      }
    }
    let challenger = -1;
    let challengerLCB = Infinity;
    for (let i = 0; i < perms.length; i++) {
      if (!alive[i] || i === leader) continue;
      const lcb = errSums[i] / totalMass;
      if (lcb < challengerLCB) {
        challengerLCB = lcb;
        challenger = i;
      }
    }
    if (challenger === -1 || challengerLCB > leaderUCB) break;

    const a = pull(leader);
    const b = pull(challenger);
    if (!a && !b) break;
    if (weights[leader] >= massThreshold) break;
  }

  const survivors: number[] = [];
  for (let p = 0; p < perms.length; p++) if (alive[p]) survivors.push(p);
  survivors.sort((a, b) => {
    const meanA = weights[a] > 0 ? errSums[a] / weights[a] : Infinity;
    const meanB = weights[b] > 0 ? errSums[b] / weights[b] : Infinity;
    if (Math.abs(meanA - meanB) < TIE_EPS) {
      return inversions(perms[a]) - inversions(perms[b]);
    }
    return meanA - meanB;
  });
  return perms[survivors[0]];
}

function identity(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

function permutations(n: number): number[][] {
  const indices = identity(n);
  const out: number[][] = [];
  const recurse = (start: number) => {
    if (start === n) {
      out.push([...indices]);
      return;
    }
    for (let i = start; i < n; i++) {
      [indices[start], indices[i]] = [indices[i], indices[start]];
      recurse(start + 1);
      [indices[start], indices[i]] = [indices[i], indices[start]];
    }
  };
  recurse(0);
  return out;
}

/** Number of pairs (i, j) with i < j but perm[i] > perm[j]. */
function inversions(perm: readonly number[]): number {
  let count = 0;
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) count++;
    }
  }
  return count;
}
