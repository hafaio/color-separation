import {
  Button,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Tooltip,
} from "@chakra-ui/react";
import { PropsWithChildren, ReactElement, useCallback } from "react";
import { FaFileDownload } from "react-icons/fa";
import ColorPicker from "./color-picker";
import PalletteInput from "./pallette-input";

export type Action =
  | { action: "set"; colors: readonly (readonly [string, string])[] }
  | { action: "add"; color: string; name: string }
  | { action: "toggle"; color: string };

function EditorHeader({ children }: PropsWithChildren): ReactElement {
  return <h2 className="font-bold text-lg">{children}</h2>;
}

export default function Editor({
  colors,
  modifyColors,
  paperColor,
  setPaperColor,
  quadratic,
  toggleQuad,
  usePaper,
  togglePaper,
  increments,
  setIncrements,
  download,
  showRaw,
  setShowRaw,
}: {
  colors: Map<string, [string, boolean]>;
  modifyColors: (action: Action) => void;
  paperColor: string;
  setPaperColor: (color: string) => void;
  quadratic: boolean;
  toggleQuad: () => void;
  usePaper: boolean;
  togglePaper: () => void;
  increments: number;
  setIncrements: (inc: number) => void;
  download: () => void;
  showRaw: boolean;
  setShowRaw: (val: boolean) => void;
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
        >
          Export Separation
        </Button>
      </Tooltip>
      <EditorHeader>Colors</EditorHeader>
      <p>Click a color to toggle its use in the separation</p>
      <ColorPicker colors={colors} toggleColor={toggleColor} />
      <EditorHeader>Pallette</EditorHeader>
      <p>Add new colors or reset to a pallette</p>
      <PalletteInput
        setPallette={setPallette}
        colors={colors}
        addColor={addColor}
        paperColor={paperColor}
        setPaperColor={setPaperColor}
      />
      <EditorHeader>Dicretizations</EditorHeader>
      <p>Drag the slider to change the number of dicrete opacities</p>
      <div className="px-4">
        <Slider
          defaultValue={increments}
          onChange={setIncrements}
          min={0}
          max={7}
          step={1}
        >
          <SliderTrack>
            <SliderFilledTrack />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </div>
      <Tooltip label="Toggle for different separation">
        <div className="flex flex-row justify-between items-baseline">
          <label htmlFor="quadratic">
            <EditorHeader>Quadratic Loss</EditorHeader>
          </label>
          <Switch id="quadratic" onChange={toggleQuad} isChecked={quadratic} />
        </div>
      </Tooltip>
      <Tooltip label="Account for paper color when doing separation">
        <div className="flex flex-row justify-between items-baseline">
          <label htmlFor="account-paper-color">
            <EditorHeader>Account for Paper Color</EditorHeader>
          </label>
          <Switch
            id="account-paper-color"
            onChange={togglePaper}
            isChecked={usePaper}
          />
        </div>
      </Tooltip>
    </>
  );
}
