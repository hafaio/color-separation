/**
 * module for dealing with colors
 *
 * Internally we represent all colors as hex rgb, then convert those to
 * whatever format makes the most sense for computation. This modules contains
 * all necessary associated functions.
 *
 * @packageDocumentation
 */

/** parse arbitrary css color and return standardized rgb hex assuming white backdrop */
export function parseCSS(css: string): string {
  let match;
  if ((match = css.match(/^#([0-9a-fA-F]{6})$/))) {
    const [, hex] = match;
    return `#${hex.toLowerCase()}`;
  } else if ((match = css.match(/^#([0-9a-fA-F]{3})$/))) {
    const [, [r, g, b]] = match;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  } else if (
    (match = css.match(
      /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
    ))
  ) {
    const [, r, g, b, a] = match;
    return formatRGBA(
      [r, g, b].map((c) => parseInt(c, 16) / 255),
      parseInt(a, 16) / 255
    );
  } else if (
    (match = css.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/))
  ) {
    const [, r, g, b] = match;
    return formatColor([
      parseInt(r) / 255,
      parseInt(g) / 255,
      parseInt(b) / 255,
    ]);
  } else if (
    (match = css.match(
      /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([-+\d.eE]+)\s*\)$/
    ))
  ) {
    const [, r, g, b, a] = match;
    return formatRGBA(
      [r, g, b].map((c) => parseInt(c) / 255),
      parseFloat(a)
    );
  } else {
    throw new Error(`invalid color format: '${css}'`);
  }
}

/** helper function to format rgba numbers */
function formatRGBA(rgb: number[], alpha: number): string {
  return formatColor(rgb.map((c) => (c - 1) * alpha + 1));
}

/** format an arbitrary sequence of [0, 1] floats as a 256 hex color string */
export function formatColor(color: number[]): string {
  const base = color
    .map((n) =>
      Math.round(n * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("");
  return `#${base}`;
}
