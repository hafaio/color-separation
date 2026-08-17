import { Slider } from "@ark-ui/react/slider";
import { Switch } from "@ark-ui/react/switch";
import { Tooltip } from "@ark-ui/react/tooltip";
import {
  type ChangeEvent,
  type PointerEvent,
  type PropsWithChildren,
  type ReactElement,
  useCallback,
} from "react";
import { FaFileDownload } from "react-icons/fa";
import type { RgbU32 } from "../utils/color";
import type { CustomColor } from "../utils/custom-colors";
import { isMixingMode, type MixingMode } from "../utils/sep";
import { type ColorState, isOrdering, type Ordering } from "../utils/types";
import ColorPicker from "./color-picker";
import PaletteInput from "./palette-input";

export type Action =
  | { action: "add"; color: RgbU32; name: string }
  | { action: "remove"; color: RgbU32 }
  | { action: "toggle"; color: RgbU32 }
  | { action: "remap"; color: RgbU32; remap: RgbU32 }
  | { action: "clear" };

function EditorHeader({
  children,
  action,
}: PropsWithChildren<{ action?: ReactElement }>): ReactElement {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-bold text-lg">{children}</h2>
      {action}
    </div>
  );
}

export default function Editor({
  colors,
  modifyColors,
  customs,
  saveCustom,
  deleteCustom,
  positions,
  ordering,
  setOrdering,
  mixingMode,
  setMixingMode,
  kmAvailable,
  kmIneligibleNames,
  increments,
  setIncrements,
  tolerance,
  setTolerance,
  press,
  setPress,
  orderIndependent,
  download,
  isDownloading,
  setShowRaw,
  showGrid,
  setShowGrid,
  rendering,
}: {
  colors: Map<RgbU32, ColorState>;
  modifyColors: (action: Action) => void;
  customs: readonly CustomColor[];
  saveCustom: (color: CustomColor) => void;
  deleteCustom: (rgb: RgbU32) => void;
  positions: ReadonlyMap<RgbU32, number>;
  ordering: Ordering;
  setOrdering: (ordering: Ordering) => void;
  mixingMode: MixingMode;
  setMixingMode: (mode: MixingMode) => void;
  kmAvailable: boolean;
  kmIneligibleNames: readonly string[];
  increments: number;
  setIncrements: (inc: number) => void;
  tolerance: number;
  setTolerance: (tolerance: number) => void;
  press: boolean;
  setPress: (press: boolean) => void;
  /** Whether the model composes the same however the inks are stacked. */
  orderIndependent: boolean;
  download: () => void;
  isDownloading: boolean;
  setShowRaw: (val: boolean) => void;
  showGrid: boolean;
  setShowGrid: (val: boolean) => void;
  rendering: boolean;
}): ReactElement {
  // Capturing the pointer keeps the release on this button, so dragging off
  // it mid-hold still ends the hold -- and makes it work under touch.
  const onDown = useCallback(
    (event: PointerEvent<HTMLButtonElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setShowRaw(true);
    },
    [setShowRaw],
  );
  const onUp = useCallback(() => {
    setShowRaw(false);
  }, [setShowRaw]);
  const toggleGrid = useCallback(() => {
    setShowGrid(!showGrid);
  }, [setShowGrid, showGrid]);
  const toggleColor = useCallback(
    (color: RgbU32) => {
      modifyColors({ action: "toggle", color });
    },
    [modifyColors],
  );
  const remapColor = useCallback(
    (color: RgbU32, remap: RgbU32) => {
      modifyColors({ action: "remap", color, remap });
    },
    [modifyColors],
  );
  const addColor = useCallback(
    (color: RgbU32, name: string) => {
      modifyColors({ action: "add", color, name });
    },
    [modifyColors],
  );
  const removeColor = useCallback(
    (color: RgbU32) => {
      modifyColors({ action: "remove", color });
    },
    [modifyColors],
  );
  const orderingChange = useCallback(
    (evt: ChangeEvent<HTMLSelectElement>) => {
      if (isOrdering(evt.target.value)) setOrdering(evt.target.value);
    },
    [setOrdering],
  );
  const mixingChange = useCallback(
    (evt: ChangeEvent<HTMLSelectElement>) => {
      if (isMixingMode(evt.target.value)) setMixingMode(evt.target.value);
    },
    [setMixingMode],
  );
  const pressChange = useCallback(
    ({ checked }: { checked: boolean }) => {
      setPress(checked);
    },
    [setPress],
  );
  const subtractive = mixingMode === "subtractive";
  // Rendered unconditionally and disabled, rather than from inside the
  // mixing-mode conditional it used to live in: mounting and unmounting it as
  // the mode changed restarted its transition every time.
  const pressSwitch = (
    <Switch.Root
      checked={press && !subtractive}
      className="flex-shrink-0 data-[disabled]:opacity-50"
      disabled={subtractive}
      id="press-simulation"
      onCheckedChange={pressChange}
    >
      <Switch.Control className="block w-9 h-5 rounded-full bg-slate-300 dark:bg-slate-600 data-[state=checked]:bg-slate-500 dark:data-[state=checked]:bg-slate-400 transition-colors p-0.5">
        <Switch.Thumb className="block w-4 h-4 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-4" />
      </Switch.Control>
      <Switch.Label className="sr-only">Simulate dot gain</Switch.Label>
      <Switch.HiddenInput />
    </Switch.Root>
  );

  const selected = [...colors.values()].some(({ active }) => active);
  const exportText = selected
    ? undefined
    : "must select at least one color to export";
  return (
    <>
      <div className="flex flex-col gap-2 flex-shrink-0">
        <button
          className="w-full px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded disabled:opacity-50 disabled:pointer-events-none"
          disabled={!selected}
          onPointerCancel={onUp}
          onPointerDown={onDown}
          onPointerUp={onUp}
          type="button"
        >
          Hold for Original
        </button>
        <button
          aria-pressed={showGrid}
          className={`w-full px-4 py-2 rounded disabled:opacity-50 disabled:pointer-events-none ${
            showGrid
              ? "bg-slate-700 hover:bg-slate-800 text-white dark:bg-slate-300 dark:hover:bg-slate-200 dark:text-slate-900"
              : "bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white"
          }`}
          disabled={!selected}
          onClick={toggleGrid}
          type="button"
        >
          {showGrid ? "Hide Channels" : "Show Channels"}
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
      </div>
      <div className="relative flex flex-col gap-2 flex-grow min-h-0 overflow-y-auto pr-1 -mr-1">
        <EditorHeader>Colors</EditorHeader>
        <p className="text-slate-600 dark:text-slate-400">
          Click a color to toggle its use in the separation
        </p>
        <ColorPicker
          colors={colors}
          positions={positions}
          toggleColor={toggleColor}
          remapColor={remapColor}
          muted={rendering}
        />
        <EditorHeader>Mixing</EditorHeader>
        <p className="text-slate-600 dark:text-slate-400">
          How overlapping inks combine. Subtractive is the fastest and most
          exact, Kubelka-Munk the most physical.
        </p>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <select
              className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-100"
              value={mixingMode}
              onChange={mixingChange}
            >
              <option value="subtractive">Subtractive</option>
              <option value="multiply">Multiply</option>
              <option value="kubelka_munk" disabled={!kmAvailable}>
                Kubelka-Munk
                {kmAvailable ? "" : " (incompatible inks)"}
              </option>
            </select>
          </Tooltip.Trigger>
          {!kmAvailable && (
            <Tooltip.Positioner>
              <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow max-w-xs">
                Kubelka-Munk disabled: no calibrated K(λ) for{" "}
                {kmIneligibleNames.join(", ")}.
              </Tooltip.Content>
            </Tooltip.Positioner>
          )}
        </Tooltip.Root>
        <EditorHeader>Ordering</EditorHeader>
        <p className="text-slate-600 dark:text-slate-400">
          Print order of selected colors. First is printed paper-adjacent; last
          is on top.
          {orderIndependent && " This model only uses it to number the layers."}
        </p>
        <select
          className="w-full px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-100"
          value={ordering}
          onChange={orderingChange}
        >
          <option value="light-to-dark">Lightest to darkest</option>
          <option value="manual">Selection order</option>
          <option value="auto">Automatic</option>
        </select>
        <EditorHeader>Palette</EditorHeader>
        <p className="text-slate-600 dark:text-slate-400">
          Add new colors or reset to a palette
        </p>
        <PaletteInput
          colors={colors}
          addColor={addColor}
          removeColor={removeColor}
          customs={customs}
          saveCustom={saveCustom}
          deleteCustom={deleteCustom}
        />
        <EditorHeader>Discretizations</EditorHeader>
        <p className="text-slate-600 dark:text-slate-400">
          Number of discrete opacities each layer is rounded to, for a
          posterized look.
        </p>
        <div className="px-4">
          <Slider.Root
            defaultValue={[increments]}
            onValueChangeEnd={(details) => setIncrements(details.value[0])}
            min={0}
            max={7}
            step={1}
          >
            <Slider.Control className="relative flex items-center h-5">
              <Slider.Track className="relative h-2 w-full rounded bg-slate-300 dark:bg-slate-600">
                <Slider.Range className="absolute h-full rounded bg-slate-400 dark:bg-slate-500" />
              </Slider.Track>
              <Slider.Thumb
                index={0}
                className="absolute w-5 h-5 bg-white dark:bg-slate-200 border-2 border-slate-400 dark:border-slate-400 rounded-full shadow cursor-pointer"
              />
            </Slider.Control>
          </Slider.Root>
        </div>
        <EditorHeader>Ink Minimization</EditorHeader>
        <p className="text-slate-600 dark:text-slate-400">
          How much color shift you'll accept to drop an ink layer.
          {subtractive && " Doesn't apply to Subtractive."}
        </p>
        <div className={`px-4 ${subtractive ? "opacity-50" : ""}`}>
          <Slider.Root
            disabled={subtractive}
            value={[tolerance]}
            onValueChange={(details) => setTolerance(details.value[0])}
            min={0}
            max={8}
            step={0.5}
          >
            <Slider.Control className="relative flex items-center h-5">
              <Slider.Track className="relative h-2 w-full rounded bg-slate-300 dark:bg-slate-600">
                <Slider.Range className="absolute h-full rounded bg-slate-400 dark:bg-slate-500" />
              </Slider.Track>
              <Slider.Thumb
                index={0}
                className="absolute w-5 h-5 bg-white dark:bg-slate-200 border-2 border-slate-400 dark:border-slate-400 rounded-full shadow cursor-pointer"
              />
            </Slider.Control>
          </Slider.Root>
        </div>
        <EditorHeader action={pressSwitch}>Press Simulation</EditorHeader>
        <p className="text-slate-600 dark:text-slate-400">
          Spread screened dots the way paper does, so midtones print darker.
          {subtractive && " Doesn't apply to Subtractive."}
        </p>
      </div>
    </>
  );
}
