import { parseCSS } from "./color";

test("parseCSS()", () => {
  expect(parseCSS("#789ABC")).toBe("#789abc");
  expect(parseCSS("#789")).toBe("#778899");
  expect(parseCSS("#789ABCef")).toBe("#80a0c0");
  expect(parseCSS("rgb(120, 154, 188)")).toBe("#789abc");
  expect(parseCSS("rgba(120, 154, 188, 0.94)")).toBe("#80a0c0");
  expect(() => parseCSS("invalid")).toThrow("invalid css color: invalid");
});
