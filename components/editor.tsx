import {
  Button,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Tooltip,
} from "@chakra-ui/react";
import { PropsWithChildren, ReactElement, useCallback } from "react";
import { FaFileDownload } from "react-icons/fa";
import ColorPicker from "./color-picker";
import PalletteInput from "./pallette-input";

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
  showRaw,
  setShowRaw,
  rendering,
}: {
  colors: Map<string, [string, boolean]>;
  modifyColors: (action: Action) => void;
  increments: number;
  setIncrements: (inc: number) => void;
  download: () => void;
  isDownloading: boolean;
  showRaw: boolean;
  setShowRaw: (val: boolean) => void;
  rendering: boolean;
}): ReactElement {
  const exportText = colors.size
    ? undefined
    : "must select at least one color to export";
  const onDown = useCallback(() => setShowRaw(true), [setShowRaw]);
  const onUp = useCallback(() => setShowRaw(false), [setShowRaw]);
  const toggleColor = useCallback(
    (color: string) => modifyColors({ action: "toggle", color }),
    [modifyColors],
  );
  const setPallette = useCallback(
    (colors: readonly (readonly [string, string])[]) =>
      modifyColors({ action: "set", colors }),
    [modifyColors],
  );
  const addColor = useCallback(
    (color: string, name: string) =>
      modifyColors({ action: "add", color, name }),
    [modifyColors],
  );
  const selected = [...colors.values()].some(([, active]) => active);
  return (
    <>
      <Button
        className="w-full"
        isDisabled={!selected}
        onMouseDown={onDown}
        onMouseUp={onUp}
      >
        Toggle Original
      </Button>
      <Tooltip label={exportText}>
        <Button
          className="w-full"
          isDisabled={!selected}
          onClick={download}
          leftIcon={<FaFileDownload />}
          isLoading={isDownloading}
        >
          Export Separation
        </Button>
      </Tooltip>
      <EditorHeader>Colors</EditorHeader>
      <p>Click a color to toggle its use in the separation</p>
      <ColorPicker
        colors={colors}
        toggleColor={toggleColor}
        disabled={rendering}
      />
      <EditorHeader>Pallette</EditorHeader>
      <p>Add new colors or reset to a pallette</p>
      <PalletteInput
        setPallette={setPallette}
        colors={colors}
        addColor={addColor}
      />
      <EditorHeader>Dicretizations</EditorHeader>
      <p>
        Drag the slider to change the number of dicrete opacities, this produces
        a more posterized appearance.
      </p>
      <div className="px-4">
        <Slider
          defaultValue={increments}
          onChangeEnd={setIncrements}
          min={0}
          max={7}
          step={1}
          isDisabled={rendering}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </div>
    </>
  );
}
