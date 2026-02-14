import type { ReactElement } from "react";
import ColorButton from "./color-button";

export default function ColorPicker({
  colors,
  toggleColor,
  disabled,
}: {
  colors: Map<string, [string, boolean]>;
  toggleColor: (color: string) => void;
  disabled: boolean;
}): ReactElement {
  // TODO for colors we know, we may want to use their cmyk variant since it
  // doesn't use the simple 1-1
  const buttons = [...colors].map(([color, [name, active]]) => (
    <ColorButton
      color={color}
      name={name}
      toggleColor={toggleColor}
      active={active}
      disabled={disabled}
      key={color}
    />
  ));
  return <div className="flex flex-wrap justify-center">{buttons}</div>;
}
