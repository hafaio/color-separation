import type { ReactElement } from "react";
import ColorButton from "./color-button";

export default function ColorPicker({
  colors,
  toggleColor,
  remapColor,
  muted,
}: {
  colors: Map<string, [string, boolean, string | undefined]>;
  toggleColor: (color: string) => void;
  remapColor: (color: string, remap: string) => void;
  muted: boolean;
}): ReactElement {
  // TODO for colors we know, we may want to use their cmyk variant since it
  // doesn't use the simple 1-1
  const palette: readonly (readonly [string, string])[] = [...colors].map(
    ([hex, [name]]) => [hex, name],
  );
  const buttons = [...colors].map(([color, [name, active, remap]]) => (
    <ColorButton
      color={color}
      name={name}
      toggleColor={toggleColor}
      remapColor={remapColor}
      remap={remap}
      palette={palette}
      active={active}
      muted={muted}
      key={color}
    />
  ));
  return <div className="flex flex-wrap justify-center">{buttons}</div>;
}
