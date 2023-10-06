import { Tooltip } from "@chakra-ui/react";
import { ReactElement, useCallback } from "react";

export default function ColorButton({
  color,
  name,
  active,
  toggleColor,
  disabled = false,
}: {
  color: string;
  name: string;
  active: boolean;
  toggleColor: (named: string) => void;
  disabled?: boolean;
}): ReactElement {
  const toggle = useCallback(() => toggleColor(color), [color, toggleColor]);
  const col = disabled ? "#cbd5e1" : color;
  const sty = disabled ? "" : "hover:scale-110";
  return (
    <Tooltip label={name}>
      <button
        className={`rounded-full bg-transparent transition-all m-1 focus:outline w-8 h-8 ${sty}`}
        style={{
          borderWidth: active ? "0.2rem" : "1rem",
          borderColor: col,
          outlineColor: col,
        }}
        onClick={toggle}
        disabled={disabled}
      />
    </Tooltip>
  );
}
