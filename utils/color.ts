/**
 * module for dealing with colors
 *
 * Internally we represent all colors as hex rgb, then convert those to
 * whatever format makes the most sense for computation. This modules contains
 * all necessary associated functions.
 *
 * @packageDocumentation
 */
import { color, rgb } from "d3-color";

/** parse arbitrary css color and return standardized rgb hex assuming white backdrop */
export function parseCSS(css: string): string {
  const parsed = color(css);
  if (!parsed) {
    throw new Error(`invalid css color: ${css}`);
  }
  const { r, g, b, opacity } = parsed.rgb();
  const onWhite = rgb(
    (r - 255) * opacity + 255,
    (g - 255) * opacity + 255,
    (b - 255) * opacity + 255,
  );
  return onWhite.formatHex();
}

/** format an arbitrary sequence of [0, 1] floats as a 256 hex color string */
export function formatColor(color: readonly [number, number, number]): string {
  // ts doesn't map tuple types correctly, so this is a "hack" around it
  const [r, g, b] = color.map((c) => c * 255);
  return rgb(r, g, b).formatHex();
}
