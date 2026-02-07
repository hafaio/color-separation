import { Tooltip } from "@ark-ui/react/tooltip";
import {
  type ChangeEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";

// more riso colors: https://www.stencil.wiki/colors
const risoPalette = [
  ["#f15060", "bright red"],
  ["#ff48b0", "fluorescent pink"],
  ["#ffe800", "yellow"],
  ["#00a95c", "green"],
  ["#0078bf", "blue"],
  ["#000000", "black"],
] as const;

const cmykPalette = [
  ["#00ffff", "cyan"],
  ["#ff00ff", "magenta"],
  ["#ffff00", "yellow"],
  ["#000000", "black"],
] as const;

// FIXME think about this interface more, maybe just have a + icon for adding a
// color and a clear? And maybe just have presets as well?
export default function PaletteInput({
  colors,
  setPalette,
  addColor,
}: {
  colors: Map<string, [string, boolean]>;
  setPalette: (colors: readonly (readonly [string, string])[]) => void;
  addColor: (color: string, name: string) => void;
}): ReactElement {
  const paletteChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    const val = evt.target.value;
    if (val === "none") {
      setPalette([]);
    } else if (val === "riso") {
      setPalette(risoPalette);
    } else if (val === "cmyk") {
      setPalette(cmykPalette);
    }
  };
  // default palette
  useEffect(() => {
    setPalette(risoPalette);
  }, [setPalette]);

  const [name, setName] = useState("");
  const inputChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    setName(evt.target.value);
  }, []);
  const [color, setColor] = useState("#000000");
  const colorChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    setColor(evt.target.value);
  }, []);

  const addClick = useCallback(() => {
    addColor(color, name);
  }, [color, name, addColor]);

  const valid = name && !colors.has(color);
  const message = !name
    ? "must name added colors"
    : colors.has(color)
      ? "can only add unique colors"
      : undefined;

  return (
    <>
      <div className="flex">
        <input
          className="flex-1 min-w-0 px-2 py-1 border border-slate-300 dark:border-slate-600 rounded-l bg-white dark:bg-slate-800 dark:text-slate-100"
          placeholder="Color Name"
          value={name}
          onChange={inputChange}
        />
        <input
          type="color"
          className="w-16 h-full border border-l-0 border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
          value={color}
          onChange={colorChange}
        />
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <button
              className="px-3 py-1 bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded-r disabled:opacity-50 disabled:pointer-events-none"
              disabled={!valid}
              onClick={addClick}
              type="button"
            >
              Add
            </button>
          </Tooltip.Trigger>
          {message && (
            <Tooltip.Positioner>
              <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow">
                {message}
              </Tooltip.Content>
            </Tooltip.Positioner>
          )}
        </Tooltip.Root>
      </div>
      <select
        className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-100"
        onChange={paletteChange}
        defaultValue=""
      >
        <option value="" disabled>
          Select Palette
        </option>
        <option value="none">None</option>
        <option value="riso">Risograph</option>
        <option value="cmyk">CMYK</option>
      </select>
    </>
  );
}
