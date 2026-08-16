import { expect, test } from "bun:test";
import { INKS, INKS_BY_ID } from "./inks";
import {
  MEASURED_BLACK_FILM,
  MEASURED_FILMS,
  MEASURED_FLUORESCENT_FILMS,
  MEASURED_OVERPRINTS,
  type MeasuredOverprint,
} from "./measured-spectra";
import {
  absorptionFromFilm,
  BIN_COUNT,
  buildLayer,
  calibrateKScale,
  PAPER_R,
  type SpectralLayer,
  spectralForward,
  spectrumToSrgb,
  WAVELENGTHS,
} from "./spectral";

const GRAY_FILM = MEASURED_FILMS.get("gray")!;
const overprint = (
  over: string | null,
  under: string | null,
): MeasuredOverprint =>
  MEASURED_OVERPRINTS.find((o) => o.over === over && o.under === under)!;
const GRAY_OVER_BLUE = overprint("gray", "blue");

/**
 * A layer that turns the model's flat paper into the sheet a profile was
 * printed on, so a prediction can be scored against a reading in the reading's
 * own frame instead of a normalized one. Pure absorption, and negative where
 * the brightened sheet reads above 0.95 — which is exactly the film that
 * reproduces a sheet returning more light than it was given.
 */
function sheet(paper: readonly number[]): SpectralLayer {
  return buildLayer({
    kSpectrum: paper.map((r) => Math.log(r / PAPER_R) / -2),
  });
}

const rms = (deviations: readonly number[]): number =>
  Math.sqrt(deviations.reduce((sum, d) => sum + d * d, 0) / deviations.length);

/** Per-bin gap between a prediction and what the instrument read. */
function residuals(
  predicted: Float64Array,
  measured: readonly number[],
): number[] {
  return Array.from(measured, (r, i) => predicted[i] - r);
}

test("gray over blue comes out where it was measured, and only because it scatters", () => {
  const base = sheet(GRAY_FILM.paper);
  // Blue laid down first, recovered from its own solid on the same sheet.
  const blue = buildLayer({
    kSpectrum: absorptionFromFilm(
      GRAY_OVER_BLUE.underSolid,
      GRAY_OVER_BLUE.paper,
    ),
  });
  const gray = INKS_BY_ID.get("gray")!;
  const scatter = gray.scatter!;

  // Three grays, each refitted to reproduce the same solid-on-paper reading,
  // differing only in the scattering they are allowed. Refitting is what makes
  // this a counterfactual rather than a handicap: whatever S cannot explain,
  // K absorbs, so all three are exact on paper and only the overprint tells
  // them apart.
  const variants = {
    shipped: scatter,
    flat: { sd: scatter.sd },
    none: undefined,
  } as const;
  const over: Record<string, number[]> = {};
  for (const [name, spec] of Object.entries(variants)) {
    const layer = buildLayer({
      kSpectrum: absorptionFromFilm(GRAY_FILM.solid, GRAY_FILM.paper, spec),
      scatter: spec,
      // The reading is of the film the instrument saw, not of the thinner one
      // the published hex asks for, so no density scaling here.
    });
    const solo = spectralForward([1, 1], [base, layer]);
    expect(rms(residuals(solo, GRAY_FILM.solid))).toBeLessThan(1e-9);
    over[name] = residuals(
      spectralForward([1, 1, 1], [base, blue, layer]),
      GRAY_OVER_BLUE.stack,
    );
  }

  console.log("");
  console.log("Gray over a blue solid, predicted against 36 measured bins:");
  for (const [name, deviations] of Object.entries(over)) {
    const worst = Math.max(...deviations.map(Math.abs));
    console.log(
      `  ${name.padEnd(8)}: rms ${rms(deviations).toFixed(4)}  worst ${worst.toFixed(4)}`,
    );
  }

  // Two numbers standing in for 36 bins of S(λ), so the bar is loose in
  // absolute reflectance and the point is the ordering below it.
  expect(rms(over.shipped)).toBeLessThan(0.02);
  expect(Math.max(...over.shipped.map(Math.abs))).toBeLessThan(0.05);
  // Without scattering the model has nothing left to explain the overprint
  // with, and misses by four times as much.
  expect(rms(over.none)).toBeGreaterThan(4 * rms(over.shipped));
  // The headline, at the bin the magnitude was read off: gray over blue
  // reflects 0.068, a scattering gray predicts it to within a percent, and a
  // pure absorber puts it fifteen times too dark. That gap is the whole
  // evidence for the scattering term being measured rather than asserted.
  const at550 = WAVELENGTHS.indexOf(550);
  const measured550 = GRAY_OVER_BLUE.stack[at550];
  expect(Math.abs(over.shipped[at550])).toBeLessThan(0.05 * measured550);
  expect(measured550 + over.none[at550]).toBeLessThan(measured550 / 10);
  // And the tilt earns its place: the same magnitude spread flat across the
  // spectrum is measurably worse over the same 36 bins.
  expect(rms(over.shipped)).toBeLessThan(rms(over.flat));
});

test("a measurement is not overridden by the hex it is calibrated against", () => {
  const film = MEASURED_FILMS.get("blue")!;
  const spec = { kSpectrum: absorptionFromFilm(film.solid, film.paper) };
  // Blue's own hex, something in the wrong half of the wheel, and a neutral.
  const fitted = ["#0078bf", "#ff2200", "#585858"].map(
    (hex) =>
      buildLayer({ ...spec, kScale: calibrateKScale(hex, spec).kScale }).k,
  );

  const [reference] = fitted;
  for (const k of fitted) {
    const density = k[0] / reference[0];
    for (let bin = 0; bin < BIN_COUNT; bin++) {
      // Every fit is the measured spectrum times one number, so the shape is
      // the instrument's whatever hex it was pointed at. The hex moves the
      // film's thickness and can reach nothing else.
      expect(k[bin] / reference[bin]).toBeCloseTo(density, 10);
    }
  }
  // The hexes really do pull to different thicknesses, or the above is vacuous.
  const densities = fitted.map((k) => k[0] / reference[0]);
  expect(Math.max(...densities) / Math.min(...densities)).toBeGreaterThan(1.5);
});

test("every measured ink took its shape from the instrument and nothing else", () => {
  const measured = INKS.filter((ink) => ink.kBandsSource === "measured");
  expect(measured.map((ink) => ink.id).sort()).toEqual(
    [...MEASURED_FILMS.keys()].sort(),
  );
  for (const ink of measured) {
    // A pigment template is what a measurement replaces, not what it corrects.
    expect(ink.kBands).toBeUndefined();
    expect(ink.kSpectrum).toBeDefined();
    const film = MEASURED_FILMS.get(ink.id)!;
    expect(ink.kSpectrum).toEqual(
      absorptionFromFilm(film.solid, film.paper, ink.scatter),
    );
  }
  // Everything else keeps a template, and no template ink claims a reading.
  for (const ink of INKS) {
    if (ink.kBandsSource !== "measured") expect(ink.kSpectrum).toBeUndefined();
  }
});

test("fluorescent films are radiance and cannot be read as absorption", () => {
  for (const [id, film] of MEASURED_FLUORESCENT_FILMS) {
    // Above a perfect diffuser, which no film reaches by absorbing.
    expect(Math.max(...film.solid)).toBeGreaterThan(1);
    const k = absorptionFromFilm(film.solid, film.paper);
    expect(Math.min(...k)).toBeLessThan(0);
    // The ink table models these the other way, through emission.
    expect(INKS_BY_ID.get(id)?.fluorescence).toBeDefined();
  }
  // The films the table does calibrate from stay on the absorbing side of
  // zero, which is the line the fluorescent two cross.
  for (const [, film] of MEASURED_FILMS) {
    const k = absorptionFromFilm(film.solid, film.paper);
    expect(Math.min(...k)).toBeGreaterThan(0);
  }
});

test("riso black measures nowhere near the black it publishes", () => {
  const film = MEASURED_BLACK_FILM;
  const layer = buildLayer({
    kSpectrum: absorptionFromFilm(film.solid, film.paper),
  });
  const [red, green, blue] = spectrumToSrgb(spectralForward([1], [layer]));
  console.log(`Measured riso black solid renders ${red},${green},${blue}`);
  // A warm dark grey, not an absence of light. `#000000` is a nominal, so it
  // pins no film thickness and the ink table calibrates from the template
  // instead — see `MEASURED_BLACK_FILM`.
  expect(red).toBeGreaterThan(50);
  expect(red).toBeGreaterThan(blue);
  expect(INKS_BY_ID.get("black")!.kBandsSource).toBe("pigment_template");
});

test("overprints land lighter than two films predict, whatever the ink", () => {
  // Every pair the collection offers that isn't fluorescent, scored as a pure
  // absorber over a pure absorber. What matters is not the size of the miss
  // but its sign: one direction, every pigment, every sheet.
  const coloured = MEASURED_OVERPRINTS.filter((o) => o.over !== "gray");
  const means: number[] = [];
  console.log("");
  console.log("Solid over solid, predicted as pure absorbers:");
  for (const pair of coloured) {
    const base = sheet(pair.paper);
    const under = buildLayer({
      kSpectrum: absorptionFromFilm(pair.underSolid, pair.paper),
    });
    const over = buildLayer({
      kSpectrum: absorptionFromFilm(pair.overSolid, pair.paper),
    });
    const deviations = residuals(
      spectralForward([1, 1, 1], [base, under, over]),
      pair.stack,
    );
    const mean = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
    means.push(mean);
    const label = `${pair.over ?? "black"} over ${pair.under ?? "black"}`;
    console.log(`  ${label.padEnd(18)}: mean ${mean.toFixed(4)}`);
  }
  // A pigment that scattered would push its own overprint the other way, so a
  // one-signed miss across unrelated colorants is the press, not the ink.
  expect(means.every((mean) => mean < 0)).toBe(true);
  expect(Math.max(...means)).toBeLessThan(-0.005);
});

test("gray's scattering reads lower over black than over blue", () => {
  // The magnitude gray ships was inverted over a blue solid. Black is flatter
  // and far darker, so it reads rho almost directly -- and disagrees. Both are
  // recorded because neither is dismissible, and the shipped value stays with
  // the substrate the bracket was drawn around.
  const fit = (pair: MeasuredOverprint, sd: number): number => {
    const scatter = { sd, tilt: 2 };
    const base = sheet(pair.paper);
    const under = buildLayer({
      kSpectrum: absorptionFromFilm(pair.underSolid, pair.paper),
    });
    const over = buildLayer({
      kSpectrum: absorptionFromFilm(pair.overSolid, pair.paper, scatter),
      scatter,
    });
    return rms(
      residuals(spectralForward([1, 1, 1], [base, under, over]), pair.stack),
    );
  };
  const bestSd = (pair: MeasuredOverprint): number => {
    let best = 0;
    let bestRms = Infinity;
    for (let sd = 0.002; sd <= 0.4; sd += 0.002) {
      const scored = fit(pair, sd);
      if (scored < bestRms) {
        bestRms = scored;
        best = sd;
      }
    }
    return best;
  };
  const overBlue = bestSd(GRAY_OVER_BLUE);
  const overBlack = bestSd(overprint("gray", null));
  // The two sheets lay different amounts of ink, and sd is S*D, so the black
  // sheet's reading is put in the blue sheet's terms by the ratio of gray's
  // own absorption between them before the two are compared at all.
  const at550 = WAVELENGTHS.indexOf(550);
  const density = (pair: MeasuredOverprint): number =>
    absorptionFromFilm(pair.overSolid, pair.paper)[at550];
  const rescaled =
    (overBlack * density(GRAY_OVER_BLUE)) / density(overprint("gray", null));
  console.log("");
  console.log(
    `Gray's scattering: ${overBlue.toFixed(3)} over blue, ` +
      `${overBlack.toFixed(3)} over black (${rescaled.toFixed(3)} at the blue sheet's lay)`,
  );
  expect(overBlue).toBeCloseTo(INKS_BY_ID.get("gray")!.scatter!.sd, 1);
  // Half, not a rounding difference -- which is why the bracket stays wide.
  expect(rescaled).toBeLessThan(0.7 * overBlue);
  expect(rescaled).toBeGreaterThan(0.05);
});
