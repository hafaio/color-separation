import * as d3color from "d3-color";

/** RGB color packed into a single 32-bit integer: (r << 16) | (g << 8) | b. */
export type RgbU32 = number;

/** Channel triple in linear sRGB space, each in [0, 1]. */
export type LinearRgb = readonly [number, number, number];

export function packRgb(r: number, g: number, b: number): RgbU32 {
  return (
    ((Math.round(r) & 0xff) << 16) |
    ((Math.round(g) & 0xff) << 8) |
    (Math.round(b) & 0xff)
  );
}

export function unpackRgb(c: RgbU32): { r: number; g: number; b: number } {
  return { r: (c >> 16) & 0xff, g: (c >> 8) & 0xff, b: c & 0xff };
}

/** Parse `#rrggbb` (lowercase or upper) into the packed form. */
export function hexToRgb(hex: string): RgbU32 {
  return Number.parseInt(hex.slice(1), 16) as RgbU32;
}

/** Render the packed color as a `#rrggbb` string for CSS. */
export function rgbToCss(c: RgbU32): string {
  return `#${(c & 0xffffff).toString(16).padStart(6, "0")}`;
}

/** Packed RGB → d3-color RGBColor (no allocations for r/g/b). */
export function rgbToD3(c: RgbU32): d3color.RGBColor {
  return d3color.rgb((c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff);
}

/** sRGB piecewise transfer (IEC 61966-2-1), per channel in [0, 1]. */
export function srgbDecode(c: number): number {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function srgbEncode(c: number): number {
  const x = c < 0 ? 0 : c > 1 ? 1 : c;
  return x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
}

/** Packed RGB → linear sRGB triple in [0, 1]. */
export function rgbToLinear(c: RgbU32): LinearRgb {
  return [
    srgbDecode(((c >> 16) & 0xff) / 255),
    srgbDecode(((c >> 8) & 0xff) / 255),
    srgbDecode((c & 0xff) / 255),
  ];
}

/** Linear sRGB triple → packed RGB (clamped to gamut, byte-quantized). */
export function linearToRgb(lin: LinearRgb): RgbU32 {
  return packRgb(
    255 * srgbEncode(lin[0]),
    255 * srgbEncode(lin[1]),
    255 * srgbEncode(lin[2]),
  );
}

/** CIE L* (perceptual lightness) of a packed RGB. */
export function luminance(c: RgbU32): number {
  const { r, g, b } = unpackRgb(c);
  return d3color.lab(d3color.rgb(r, g, b)).l;
}
