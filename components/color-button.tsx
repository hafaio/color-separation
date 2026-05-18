import { Menu } from "@ark-ui/react/menu";
import { Tooltip } from "@ark-ui/react/tooltip";
import { type ReactElement, useCallback } from "react";
import { type RgbU32, rgbToCss } from "../utils/color";

export default function ColorButton({
  color,
  name,
  active,
  remap,
  palette,
  position,
  kmEligible = true,
  toggleColor,
  remapColor,
  muted = false,
}: {
  color: RgbU32;
  name: string;
  active: boolean;
  remap: RgbU32 | undefined;
  palette: readonly (readonly [RgbU32, string])[];
  position?: number | undefined;
  kmEligible?: boolean;
  toggleColor: (color: RgbU32) => void;
  remapColor: (color: RgbU32, remap: RgbU32) => void;
  muted?: boolean;
}): ReactElement {
  const toggle = useCallback(() => {
    toggleColor(color);
  }, [color, toggleColor]);
  const onSelect = useCallback(
    (details: { value: string }) => {
      remapColor(color, Number(details.value) as RgbU32);
    },
    [color, remapColor],
  );
  const colorCss = rgbToCss(color);
  const fillCss = active ? rgbToCss(remap ?? color) : "transparent";
  const buttonClass = `relative rounded-full transition-all m-1 focus:outline w-8 h-8 hover:scale-110 ${muted ? "opacity-50" : ""}`;
  const buttonStyle = {
    borderWidth: active ? "0.2rem" : "1rem",
    borderColor: colorCss,
    outlineColor: colorCss,
    backgroundColor: fillCss,
  };
  const badge =
    position !== undefined ? (
      <span
        className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold pointer-events-none select-none"
        style={{ mixBlendMode: "difference" }}
      >
        {position}
      </span>
    ) : null;
  const ineligible = !kmEligible ? (
    <span
      className="absolute w-1.5 h-1.5 rounded-full bg-white pointer-events-none"
      style={{
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        mixBlendMode: "difference",
      }}
      aria-hidden
    />
  ) : null;

  const tooltipLabel = !kmEligible ? `${name} · no K-M calibration` : name;
  if (!active) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className={buttonClass}
            style={buttonStyle}
            onClick={toggle}
            type="button"
          >
            {ineligible}
          </button>
        </Tooltip.Trigger>
        <Tooltip.Positioner>
          <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow">
            {tooltipLabel}
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
        title={tooltipLabel}
      >
        {ineligible}
        {badge}
      </Menu.ContextTrigger>
      <Menu.Positioner>
        <Menu.Content className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-lg p-1 z-50 focus:outline-none">
          {palette.map(([paletteColor, paletteName]) => (
            <Menu.Item
              key={paletteColor}
              value={`${paletteColor}`}
              className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer data-[highlighted]:bg-slate-100 dark:data-[highlighted]:bg-slate-700"
            >
              <span
                className="inline-block w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600"
                style={{ backgroundColor: rgbToCss(paletteColor) }}
              />
              <span className="text-sm">{paletteName}</span>
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
  );
}
