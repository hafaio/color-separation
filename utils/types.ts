import type { RgbU32 } from "../utils/color";

export interface ColorState {
  name: string;
  active: boolean;
  remap: RgbU32 | undefined;
  order: number;
}

export type Ordering = "light-to-dark" | "manual" | "auto";
export const ORDERINGS: readonly Ordering[] = [
  "light-to-dark",
  "manual",
  "auto",
];
export function isOrdering(value: string): value is Ordering {
  return (ORDERINGS as readonly string[]).includes(value);
}
