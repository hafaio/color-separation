import { colorSeparation } from "./sep";

test("grey linear", () => {
  const colors = ["#000000"];
  const {
    error,
    opacities: [opacity],
  } = colorSeparation("#0000ff", colors, { quadratic: false });
  expect(Math.abs(opacity - 1)).toBeLessThan(1e-3);
  expect(Math.abs(error - 1 / 3)).toBeLessThan(1e-3);
});

test("grey quadratic", () => {
  const colors = ["#000000"];
  const {
    error,
    opacities: [opacity],
  } = colorSeparation("#0000ff", colors);
  expect(Math.abs(opacity - 2 / 3)).toBeLessThan(1e-3);
  expect(Math.abs(error - Math.sqrt(2 / 27))).toBeLessThan(1e-3);
});

test("pink single linear increments", () => {
  const colors = ["#ee0403", "#0301ef"];
  const {
    opacities: [pink, blue],
  } = colorSeparation("#ff0000", colors, { quadratic: false, increments: 1 });
  expect(Math.abs(pink - 1)).toBeLessThan(1e-3);
  expect(Math.abs(blue - 0)).toBeLessThan(1e-3);
});

test("pink double linear increments", () => {
  const colors = ["#ee0403", "#0301ef"];
  const {
    opacities: [pink, blue],
  } = colorSeparation("#ff8888", colors, { quadratic: false, increments: 2 });
  expect(Math.abs(pink - 0.5)).toBeLessThan(1e-3);
  expect(Math.abs(blue - 0)).toBeLessThan(1e-3);
});

test("pink single quadratic increments", () => {
  const colors = ["#ee0403", "#0301ef"];
  const {
    opacities: [pink, blue],
  } = colorSeparation("#ff0000", colors, { quadratic: true, increments: 1 });
  expect(Math.abs(pink - 1)).toBeLessThan(1e-3);
  expect(Math.abs(blue - 0)).toBeLessThan(1e-3);
});

test("pink double quadratic increments", () => {
  const colors = ["#ee0403", "#0301ef"];
  const {
    opacities: [pink, blue],
  } = colorSeparation("#ff8888", colors, { quadratic: true, increments: 2 });
  expect(Math.abs(pink - 0.5)).toBeLessThan(1e-3);
  expect(Math.abs(blue - 0)).toBeLessThan(1e-3);
});

test("duo linear", () => {
  const colors = ["#22ccee", "#bbee33"];
  const { error, opacities } = colorSeparation("#dd8822", colors, {
    quadratic: false,
  });
  expect(error).toBeLessThan(0.2);
});

test("duo quadratic", () => {
  const colors = ["#22ccee", "#bbee33"];
  const { error, opacities } = colorSeparation("#dd8822", colors);
  expect(error).toBeLessThan(0.15);
});

test("cmy linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"];
  const { error } = colorSeparation("#dd8822", colors, {
    quadratic: false,
  });
  expect(error).toBeLessThan(1e-3);
});

test("cmy quadratic", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00"];
  const { error } = colorSeparation("#dd8822", colors);
  expect(error).toBeLessThan(1e-3);
});

test("underconstrained linear", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error } = colorSeparation("#dd8822", colors, {
    quadratic: false,
  });
  expect(error).toBeLessThan(1e-3);
});

test("underconstrained quadratic", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error } = colorSeparation("#dd8822", colors);
  expect(error).toBeLessThan(1e-3);
});

test("underconstrained linear black", () => {
  const colors = ["#00ffff", "#ff00ff", "#ffff00", "#000000"];
  const { error, opacities } = colorSeparation("#000000", colors, {
    quadratic: false,
  });
  expect(error).toBeLessThan(1e-3);
  expect(opacities).toEqual([0, 0, 0, 1]);
});

test("underconstrained quadratic black", () => {
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
  } = colorSeparation("#008888", colors);
  expect(error).toBeLessThan(0.15);
  expect(Math.abs(blue - 0.55)).toBeLessThan(0.01);
  expect(Math.abs(green - 0.55)).toBeLessThan(0.01);
  expect(color).toBe("#00bebe");
});
