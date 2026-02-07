import { expect, test } from "bun:test";
import { color, rgb } from "d3-color";
import { colorSeparation } from "./sep";

test("gray linear", () => {
  const colors = [rgb(0, 0, 0)];
  const {
    error,
    opacities: [opacity],
  } = colorSeparation(color("#0000ff")!, colors);
  expect(opacity).toBeCloseTo(1);
  expect(error).toBeCloseTo(1 / 3);
});

test("pink single linear increments", () => {
  const colors = ["#ee0403", "#0301ef"].map((c) => color(c)!);
  const {
    opacities: [pink, blue],
  } = colorSeparation(color("#ff0000")!, colors, { increments: 1 });
  expect(pink).toBeCloseTo(1);
  expect(blue).toBeCloseTo(0);
});

test("pink double linear increments", () => {
  const colors = ["#ee0403", "#0301ef"].map((c) => color(c)!);
  const {
    opacities: [pink, blue],
  } = colorSeparation(color("#ff8888")!, colors, { increments: 2 });
  expect(pink).toBeCloseTo(1 / 2);
  expect(blue).toBeCloseTo(0);
});

test("duo linear", () => {
  const colors = ["#22ccee", "#bbee33"].map((c) => color(c)!);
  const { error } = colorSeparation(color("#dd8822")!, colors);
  expect(error).toBeLessThan(0.25);
});

test("cmy linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"].map((c) => color(c)!);
  const {
    color: res,
    error,
    opacities,
  } = colorSeparation(color("#dd8822")!, colors);
  expect(error).toBeLessThan(1e-3);
  expect(res.formatHex()).toBe("#dd8822");
  const [c, m, y] = opacities;
  expect(1 - c).toBeCloseTo(0xdd / 0xff);
  expect(1 - m).toBeCloseTo(0x88 / 0xff);
  expect(1 - y).toBeCloseTo(0x22 / 0xff);
});

test("cmy white", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"].map((c) => color(c)!);
  const {
    color: res,
    error,
    opacities,
  } = colorSeparation(color("#ffffff")!, colors);
  expect(error).toBeLessThan(1e-3);
  expect(res.formatHex()).toBe("#ffffff");
  const [c, m, y] = opacities;
  expect(c).toBeCloseTo(0);
  expect(m).toBeCloseTo(0);
  expect(y).toBeCloseTo(0);
});

test("cmy black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"].map((c) => color(c)!);
  const {
    color: res,
    error,
    opacities,
  } = colorSeparation(color("#000000")!, colors);
  expect(error).toBeLessThan(1e-3);
  expect(res.formatHex()).toBe("#000000");
  const [c, m, y] = opacities;
  expect(c).toBeCloseTo(1);
  expect(m).toBeCloseTo(1);
  expect(y).toBeCloseTo(1);
});

test("underconstrained linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"].map(
    (c) => color(c)!,
  );
  const { error } = colorSeparation(color("#dd8822")!, colors);
  expect(error).toBeLessThan(1e-3);
});

test("underconstrained linear black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"].map(
    (c) => color(c)!,
  );
  const { error, opacities } = colorSeparation(rgb(0, 0, 0), colors);
  expect(error).toBeLessThan(1e-3);
  expect(opacities).toEqual([0, 0, 0, 1]);
});

test("color saturation", () => {
  // Here the red channel goes below zero in the optimization throwing things
  // off, by we still return black for the red channel
  const colors = ["#0088ff", "#00ff88"].map((c) => color(c)!);
  const {
    error,
    opacities: [blue, green],
    color: result,
  } = colorSeparation(color("#009999")!, colors);
  expect(error).toBeLessThan(0.25);
  expect(blue).toBeCloseTo(1 / 7);
  expect(green).toBeCloseTo(6 / 7);
  expect(result.formatHex()).toBe("#00ee99");
});
