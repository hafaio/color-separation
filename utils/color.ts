/** RGB color packed into a single 32-bit integer: (r << 16) | (g << 8) | b. */
export type RgbU32 = number;

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
