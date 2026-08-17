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
  type KmCache,
  type MixingMode,
  remapKmCache,
  type SeparationOptions,
  separateWithMask,
} from "./sep";
import {
  ndPrimariesXyz,
  permutedPrimaries,
  type SpectralLayer,
} from "./spectral";

const AUTO_PERM_CAP = 7; // skip auto-order above N=7 (5040 perms)
const MASS_FRACTION = 0.3; // pixel mass after which we just accept the leader
const E_MAX = 1.0; // upper bound on per-sample RMS error in linear sRGB
const TIE_EPS = 1e-6; // tolerance for "essentially tied" arm means

export function findAutoOrder(
  pool: readonly RgbU32[],
  mixingMode: MixingMode,
  press: boolean,
  colorCounts: ReadonlyMap<RgbU32, number>,
  layers?: readonly SpectralLayer[],
): number[] {
  const n = pool.length;
  if (n <= 1 || n > AUTO_PERM_CAP) return identity(n);

  const colorObjs = pool.map(rgbToCulori);
  const perms = permutations(n);
  const permPools = perms.map((p) => p.map((i) => colorObjs[i]));
  const permKmCaches =
    mixingMode === "kubelka_munk" && layers
      ? permCaches(layers, perms, press)
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
      return { mode: "kubelka_munk", cache, press };
    }
    return mixingMode === "multiply"
      ? { mode: mixingMode, press }
      : { mode: mixingMode };
  });

  // Ordering only affects how well the whole pool can hit a color, so this
  // races full-pool fits and skips the min-ink subset sweep entirely.
  const allInks = (1 << n) - 1;

  const pull = (i: number): boolean => {
    if (pulled[i] >= targets.length) return false;
    const t = targets[pulled[i]];
    const { error } = separateWithMask(
      t.obj,
      permPools[i],
      permOpts[i],
      allInks,
    );
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

/**
 * One Neugebauer cache per permutation, built as cheaply as the physics
 * allows.
 *
 * Scattering and fluorescence change what a stack of full-coverage dots
 * reflects — white over black covers where black over white does not, and
 * emission is attenuated by whatever sits above it — so the primaries
 * themselves differ per permutation and each needs its own 2^n spectral build.
 * Trapping doesn't touch them: it decides how much area each overlap gets, not
 * what the overlap looks like, so one build covers every permutation once the
 * bit↔ink labelling is remapped. With none of the three the arms are genuinely
 * indistinguishable and can share a single cache outright; they tie, and the
 * caller's fallback order wins.
 *
 * Even the per-permutation builds share most of their work, since a stack that
 * appears in one ordering appears identically in every ordering that agrees
 * with it — see `permutedPrimaries`.
 */
function permCaches(
  layers: readonly SpectralLayer[],
  perms: readonly (readonly number[])[],
  press: boolean,
): KmCache[] {
  const stackDependent = layers.some(
    (layer) => layer.fluorescence !== undefined || layer.s.some((sd) => sd > 0),
  );
  if (stackDependent) {
    // permutedPrimaries hands back the same spectrum object wherever two
    // orderings share a stack, so integrating by identity reuses that sharing
    // instead of redoing the same 36 bins up to 5040 times.
    const integrated = new Map<Float64Array, Float64Array>();
    return permutedPrimaries(layers, perms).map((primaries) => {
      const primariesXyz = new Float64Array(primaries.length * 3);
      for (const [index, primary] of primaries.entries()) {
        const cached = integrated.get(primary);
        const xyz = cached ?? ndPrimariesXyz([primary]);
        if (cached === undefined) integrated.set(primary, xyz);
        primariesXyz.set(xyz, index * 3);
      }
      return { n: layers.length, primaries, primariesXyz };
    });
  } else {
    const shared = buildKmCache(layers);
    return press
      ? perms.map((perm) => remapKmCache(shared, perm))
      : perms.map(() => shared);
  }
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
