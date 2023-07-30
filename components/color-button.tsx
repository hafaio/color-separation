import { Tooltip } from "@chakra-ui/react";
import { ReactElement, useCallback } from "react";

export default function ColorButton({
  color,
  name,
  active,
  toggleColor,
}: {
  color: string;
  name: string;
  active: boolean;
  toggleColor: (named: string) => void;
}): ReactElement {
  const toggle = useCallback(() => toggleColor(color), [color, toggleColor]);
  return (
    <Tooltip label={name}>
      <button
        className="rounded-full bg-transparent transition-all m-1 focus:outline hover:scale-110"
        style={{
          width: "2rem",
          height: "2rem",
          borderWidth: active ? "0.2rem" : "1rem",
          borderColor: color,
          outlineColor: color,
        }}
        onClick={toggle}
      />
    </Tooltip>
  );
}
