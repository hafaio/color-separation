import type { ReactElement } from "react";

/**
 * One square printed three times, each pass offset down the same diagonal, so
 * the plates misregister the way a riso does. The middle pass is structurally
 * sandwiched and barely shows, so blue takes that slot rather than yellow,
 * which all but disappears at small area. Fills are the overprints the solver
 * returns for those inks at full opacity; the mono column swaps them for
 * density steps, for contexts that only get one ink.
 */
const TILES: readonly [
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  mono: string,
][] = [
  [2, 2, 8, 8, "#e859b4", "#b4b4b4"],
  [10, 2, 8, 8, "#e859b4", "#b4b4b4"],
  [18, 2, 28, 8, "#e859b4", "#b4b4b4"],
  [2, 10, 8, 8, "#e859b4", "#b4b4b4"],
  [10, 10, 8, 8, "#00418d", "#6d6d6d"],
  [18, 10, 28, 8, "#00418d", "#6d6d6d"],
  [46, 10, 8, 8, "#0078bd", "#b4b4b4"],
  [2, 18, 8, 28, "#e859b4", "#b4b4b4"],
  [10, 18, 8, 28, "#00418d", "#6d6d6d"],
  [18, 18, 28, 28, "#001e01", "#1c1c1c"],
  [46, 18, 8, 28, "#005400", "#6d6d6d"],
  [54, 18, 8, 28, "#ffe800", "#b4b4b4"],
  [10, 46, 8, 8, "#0078bd", "#b4b4b4"],
  [18, 46, 28, 8, "#005400", "#6d6d6d"],
  [46, 46, 8, 8, "#005400", "#6d6d6d"],
  [54, 46, 8, 8, "#ffe800", "#b4b4b4"],
  [18, 54, 28, 8, "#ffe800", "#b4b4b4"],
  [46, 54, 8, 8, "#ffe800", "#b4b4b4"],
  [54, 54, 8, 8, "#ffe800", "#b4b4b4"],
];

export default function Logo({
  size = 24,
  mono = false,
  className,
}: {
  size?: number;
  mono?: boolean;
  className?: string;
}): ReactElement {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Spot Color Separator"
    >
      {TILES.map(([x, y, width, height, color, grey]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={width}
          height={height}
          fill={mono ? grey : color}
        />
      ))}
    </svg>
  );
}
