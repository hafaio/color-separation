import { colorSeparation } from "./sep";

test("grey linear", () => {
  const colors = ["#000000"];
  const {
    error,
    opacities: [opacity],
  } = colorSeparation("#0000ff", colors);
  expect(opacity).toBeCloseTo(1);
  expect(error).toBeCloseTo(1 / 3);
});

test("pink single linear increments", () => {
  const colors = ["#ee0403", "#0301ef"];
  const {
    opacities: [pink, blue],
  } = colorSeparation("#ff0000", colors, { increments: 1 });
  expect(pink).toBeCloseTo(1);
  expect(blue).toBeCloseTo(0);
});

test("pink double linear increments", () => {
  const colors = ["#ee0403", "#0301ef"];
  const {
    opacities: [pink, blue],
  } = colorSeparation("#ff8888", colors, { increments: 2 });
  expect(pink).toBeCloseTo(1 / 2);
  expect(blue).toBeCloseTo(0);
});

test("duo linear", () => {
  const colors = ["#22ccee", "#bbee33"];
  const { error } = colorSeparation("#dd8822", colors);
  expect(error).toBeLessThan(0.25);
});

test("cmy linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"];
  const { error, opacities } = colorSeparation("#dd8822", colors);
  expect(error).toBeLessThan(1e-3);
  const [c, m, y] = opacities;
  expect(1 - c).toBeCloseTo(0xdd / 0xff);
  expect(1 - m).toBeCloseTo(0x88 / 0xff);
  expect(1 - y).toBeCloseTo(0x22 / 0xff);
});

test("underconstrained linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error } = colorSeparation("#dd8822", colors);
  expect(error).toBeLessThan(1e-3);
});

test("underconstrained linear black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error, opacities } = colorSeparation("#000000", colors);
  expect(error).toBeLessThan(1e-3);
  expect(opacities).toEqual([0, 0, 0, 1]);
});

test("color saturation", () => {
  // Here the red channel goes below zero in the optimization throwing things
  // off, by we still return black for the red channel
  const colors = ["#0088ff", "#00ff88"];
  const {
    error,
    opacities: [blue, green],
    color,
  } = colorSeparation("#009999", colors);
  expect(error).toBeLessThan(0.25);
  expect(blue).toBeCloseTo(1 / 7);
  expect(green).toBeCloseTo(6 / 7);
  expect(color).toBe("#00ee99");
});
