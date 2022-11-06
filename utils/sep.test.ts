import { colorSeparation } from "./sep";

test("grey linear", () => {
  const colors = ["#000000"];
  const {
    error,
    opacities: [opacity],
  } = colorSeparation("#0000ff", colors, { quadratic: false });
  expect(Math.abs(opacity - 1) < 1e-3).toBe(true);
  expect(Math.abs(error - 1 / 3) < 1e-3).toBe(true);
});

test("grey quadratic", () => {
  const colors = ["#000000"];
  const {
    error,
    opacities: [opacity],
  } = colorSeparation("#0000ff", colors);
  expect(Math.abs(opacity - 2 / 3) < 1e-3).toBe(true);
  expect(Math.abs(error - Math.sqrt(2 / 27)) < 1e-3).toBe(true);
});

test("duo linear", () => {
  const colors = ["#22ccee", "#bbee33"];
  const { error, opacities } = colorSeparation("#dd8822", colors, {
    quadratic: false,
  });
  expect(error < 0.2).toBe(true);
});

test("duo quadratic", () => {
  const colors = ["#22ccee", "#bbee33"];
  const { error, opacities } = colorSeparation("#dd8822", colors);
  expect(error < 0.15).toBe(true);
});

test("cmy linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"];
  const { error } = colorSeparation("#dd8822", colors, {
    quadratic: false,
  });
  expect(error < 1e-3).toBe(true);
});

test("cmy quadratic", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"];
  const { error } = colorSeparation("#dd8822", colors);
  expect(error < 1e-3).toBe(true);
});

test("underconstrained linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error } = colorSeparation("#dd8822", colors, {
    quadratic: false,
  });
  expect(error < 1e-3).toBe(true);
});

test("underconstrained quadratic", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error } = colorSeparation("#dd8822", colors);
  expect(error < 1e-3).toBe(true);
});

test("underconstrained linear black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error, opacities } = colorSeparation("#000000", colors, {
    quadratic: false,
  });
  expect(error < 1e-3).toBe(true);
  expect(opacities).toEqual([0, 0, 0, 1]);
});

test("underconstrained quadratic black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error, opacities } = colorSeparation("#000000", colors);
  expect(error < 1e-3).toBe(true);
  expect(opacities).toEqual([0, 0, 0, 1]);
});
