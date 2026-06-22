import type { ReactElement } from "react";
import type { RgbU32 } from "../utils/color";
import { INKS_BY_RGB } from "../utils/inks";
import type { ColorState } from "../utils/types";
import ColorButton from "./color-button";

export default function ColorPicker({
  colors,
  positions,
  toggleColor,
  remapColor,
  muted,
}: {
  colors: Map<RgbU32, ColorState>;
  positions: ReadonlyMap<RgbU32, number>;
  toggleColor: (color: RgbU32) => void;
  remapColor: (color: RgbU32, remap: RgbU32) => void;
  muted: boolean;
}): ReactElement {
  const palette: readonly (readonly [RgbU32, string])[] = [...colors].map(
    ([rgb, { name }]) => [rgb, name],
  );
  const buttons = [...colors].map(([color, { name, active, remap }]) => (
    <ColorButton
      color={color}
      name={name}
      toggleColor={toggleColor}
      remapColor={remapColor}
      remap={remap}
      palette={palette}
      active={active}
      position={positions.get(color)}
      kmEligible={INKS_BY_RGB.get(color)?.kmEligible ?? false}
      muted={muted}
      key={color}
    />
  ));
  return <div className="flex flex-wrap justify-center">{buttons}</div>;
}
