import { Menu } from "@ark-ui/react/menu";
import { Tooltip } from "@ark-ui/react/tooltip";
import { type ReactElement, useCallback } from "react";

export default function ColorButton({
  color,
  name,
  active,
  remap,
  palette,
  toggleColor,
  remapColor,
  muted = false,
}: {
  color: string;
  name: string;
  active: boolean;
  remap: string | undefined;
  palette: readonly (readonly [string, string])[];
  toggleColor: (named: string) => void;
  remapColor: (color: string, remap: string) => void;
  muted?: boolean;
}): ReactElement {
  const toggle = useCallback(() => {
    toggleColor(color);
  }, [color, toggleColor]);
  const onSelect = useCallback(
    (details: { value: string }) => {
      remapColor(color, details.value);
    },
    [color, remapColor],
  );
  const fillColor = active && remap ? remap : "transparent";
  const buttonClass = `rounded-full transition-all m-1 focus:outline w-8 h-8 hover:scale-110 ${muted ? "opacity-50" : ""}`;
  const buttonStyle = {
    borderWidth: active ? "0.2rem" : "1rem",
    borderColor: color,
    outlineColor: color,
    backgroundColor: fillColor,
  };

  if (!active) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className={buttonClass}
            style={buttonStyle}
            onClick={toggle}
            type="button"
          />
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow">
            {name}
          </Tooltip.Content>
        </Tooltip.Positioner>
      </Tooltip.Root>
    );
  }
  return (
    <Menu.Root onSelect={onSelect}>
      <Menu.ContextTrigger
        className={buttonClass}
        style={buttonStyle}
        onClick={toggle}
        type="button"
        title={name}
      />
      <Menu.Positioner>
        <Menu.Content className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-lg p-1 z-50 focus:outline-none">
          {palette.map(([paletteColor, paletteName]) => (
            <Menu.Item
              key={paletteColor}
              value={paletteColor}
              className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700"
            >
              <span
                className="inline-block w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"
                style={{ backgroundColor: paletteColor }}
              />
              <span className="text-sm">{paletteName}</span>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
