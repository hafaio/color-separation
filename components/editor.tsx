import { Slider } from "@ark-ui/react/slider";
import { Tooltip } from "@ark-ui/react/tooltip";
import { type PropsWithChildren, type ReactElement, useCallback } from "react";
import { FaFileDownload } from "react-icons/fa";
import ColorPicker from "./color-picker";
import PaletteInput from "./palette-input";

export type Action =
  | { action: "set"; colors: readonly (readonly [string, string])[] }
  | { action: "add"; color: string; name: string }
  | { action: "toggle"; color: string }
  | { action: "clear" };

function EditorHeader({ children }: PropsWithChildren): ReactElement {
  return <h2 className="font-bold text-lg">{children}</h2>;
}

export default function Editor({
  colors,
  modifyColors,
  increments,
  setIncrements,
  download,
  isDownloading,
  setShowRaw,
  rendering,
}: {
  colors: Map<string, [string, boolean]>;
  modifyColors: (action: Action) => void;
  increments: number;
  setIncrements: (inc: number) => void;
  download: () => void;
  isDownloading: boolean;
  setShowRaw: (val: boolean) => void;
  rendering: boolean;
}): ReactElement {
  const exportText = colors.size
    ? undefined
    : "must select at least one color to export";
  const onDown = useCallback(() => {
    setShowRaw(true);
  }, [setShowRaw]);
  const onUp = useCallback(() => {
    setShowRaw(false);
  }, [setShowRaw]);
  const toggleColor = useCallback(
    (color: string) => {
      modifyColors({ action: "toggle", color });
    },
    [modifyColors],
  );
  const setPalette = useCallback(
    (colors: readonly (readonly [string, string])[]) => {
      modifyColors({ action: "set", colors });
    },
    [modifyColors],
  );
  const addColor = useCallback(
    (color: string, name: string) => {
      modifyColors({ action: "add", color, name });
    },
    [modifyColors],
  );
  const selected = [...colors.values()].some(([, active]) => active);
  return (
    <>
      <button
        className="w-full px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded disabled:opacity-50 disabled:pointer-events-none"
        disabled={!selected}
        onMouseDown={onDown}
        onMouseUp={onUp}
        type="button"
      >
        Toggle Original
      </button>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            className="w-full px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            disabled={!selected || isDownloading}
            onClick={download}
            type="button"
          >
            <FaFileDownload />
            {isDownloading ? "Exporting..." : "Export Separation"}
          </button>
        </Tooltip.Trigger>
        {exportText && (
          <Tooltip.Positioner>
            <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow">
              {exportText}
            </Tooltip.Content>
          </Tooltip.Positioner>
        )}
      </Tooltip.Root>
      <EditorHeader>Colors</EditorHeader>
      <p className="text-slate-600 dark:text-slate-400">
        Click a color to toggle its use in the separation
      </p>
      <ColorPicker
        colors={colors}
        toggleColor={toggleColor}
        disabled={rendering}
      />
      <EditorHeader>Palette</EditorHeader>
      <p className="text-slate-600 dark:text-slate-400">
        Add new colors or reset to a palette
      </p>
      <PaletteInput
        setPalette={setPalette}
        colors={colors}
        addColor={addColor}
      />
      <EditorHeader>Discretizations</EditorHeader>
      <p className="text-slate-600 dark:text-slate-400">
        Drag the slider to change the number of discrete opacities, this
        produces a more posterized appearance.
      </p>
      <div className="px-4">
        <Slider.Root
          defaultValue={[increments]}
          onValueChangeEnd={(details) => setIncrements(details.value[0])}
          min={0}
          max={7}
          step={1}
          disabled={rendering}
        >
          <Slider.Control className="relative flex items-center h-5">
            <Slider.Track className="relative h-2 w-full rounded bg-slate-300 dark:bg-slate-600">
              <Slider.Range className="absolute h-full rounded bg-slate-400 dark:bg-slate-500" />
            </Slider.Track>
            <Slider.Thumb
              index={0}
              className="absolute w-5 h-5 bg-white dark:bg-slate-200 border-2 border-slate-400 dark:border-slate-400 rounded-full shadow cursor-pointer -translate-x-1/2"
            />
          </Slider.Control>
        </Slider.Root>
      </div>
    </>
  );
}
