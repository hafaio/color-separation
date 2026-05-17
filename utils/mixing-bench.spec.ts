import { expect, test } from "bun:test";
import { rgb } from "d3-color";
import { rgbToD3 } from "./color";
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
const pool = inks.map((ink) => rgbToD3(ink.rgb));

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

function optsFor(mode: MixingMode): SeparationOptions {
  return mode === "kubelka_munk"
    ? { mode: "kubelka_munk", cache: kmCache }
    : { mode };
}

function meanErrorFor(mode: MixingMode): number {
  const opts = optsFor(mode);
  let total = 0;
  for (const t of TARGETS) {
    const target = rgb(t.r, t.g, t.b);
    const { opacities } = colorSeparation(target, pool, opts);
    const composed = composeColors(opacities, pool, opts).rgb();
    total += srgbDist({ r: composed.r, g: composed.g, b: composed.b }, t);
  }
  return total / TARGETS.length;
}

test("benchmark: KM mean reconstruction error vs other modes", () => {
  const subtractive = meanErrorFor("subtractive");
  const alphaBlend = meanErrorFor("alpha_blend");
  const km = meanErrorFor("kubelka_munk");
  console.log("");
  console.log(
    `Mean sRGB reconstruction error across ${TARGETS.length} targets, riso 6 pool:`,
  );
  console.log(`  subtractive : ${subtractive.toFixed(1)}`);
  console.log(`  alpha_blend : ${alphaBlend.toFixed(1)}`);
  console.log(`  kubelka_munk: ${km.toFixed(1)}`);
  // KM models dithered-halftone physics via the Neugebauer-Demichel model,
  // so its reconstruction error should be at least as good as alpha_blend's
  // ad-hoc linear-light blending. Subtractive is intentionally excluded
  // from this check — its forward is non-physical arithmetic and can fit
  // any target exactly via LP, so its "error" is misleadingly low.
  expect(km).toBeLessThanOrEqual(alphaBlend);
});
