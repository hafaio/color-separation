import { Dialog } from "@ark-ui/react/dialog";
import { Tooltip } from "@ark-ui/react/tooltip";
import { type ReactElement, useCallback, useMemo } from "react";
import { type RgbU32, rgbToCss } from "../utils/color";
import { INKS_BY_RGB, type Ink } from "../utils/inks";
import type { ColorState } from "../utils/types";

// INKS_BY_RGB is module-constant, so the displayed swatch list never changes.
const INK_LIST: readonly Ink[] = [...INKS_BY_RGB.values()];

export default function PaletteInput({
  colors,
  addColor,
  removeColor,
}: {
  colors: Map<RgbU32, ColorState>;
  addColor: (color: RgbU32, name: string) => void;
  removeColor: (color: RgbU32) => void;
}): ReactElement {
  const toggleInk = useCallback(
    (ink: Ink) => {
      if (colors.has(ink.rgb)) {
        removeColor(ink.rgb);
      } else {
        addColor(ink.rgb, ink.name);
      }
    },
    [colors, addColor, removeColor],
  );

  const selectedCount = useMemo(
    () => INK_LIST.reduce((n, ink) => n + (colors.has(ink.rgb) ? 1 : 0), 0),
    [colors],
  );

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="w-full px-4 py-2 bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded"
        >
          Edit Palette ({selectedCount} / {INK_LIST.length})
        </button>
      </Dialog.Trigger>
      <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-40" />
      <Dialog.Positioner className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <Dialog.Content className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-auto p-6 [--palette-bg:white] dark:[--palette-bg:rgb(30_41_59)]">
          <Dialog.Title className="text-xl font-bold mb-1">
            Palette
          </Dialog.Title>
          <Dialog.Description className="text-slate-600 dark:text-slate-400 mb-4">
            Click an ink to add or remove it from your palette.
          </Dialog.Description>
          <div
            className="grid gap-3 mb-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(2.75rem, 1fr))",
            }}
          >
            {INK_LIST.map((ink) => {
              const selected = colors.has(ink.rgb);
              const css = rgbToCss(ink.rgb);
              return (
                <Tooltip.Root key={ink.id}>
                  <Tooltip.Trigger asChild>
                    <button
                      type="button"
                      aria-pressed={selected}
                      className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 mx-auto"
                      style={{
                        backgroundColor: css,
                        boxShadow: selected
                          ? `0 0 0 2px var(--palette-bg), 0 0 0 4px ${css}`
                          : "inset 0 0 0 1px rgba(0,0,0,0.15)",
                      }}
                      onClick={() => toggleInk(ink)}
                    >
                      {!ink.kmEligible && (
                        // Indicator that KM mode is unavailable for this ink.
                        <span
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          aria-hidden
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-white"
                            style={{ mixBlendMode: "difference" }}
                          />
                        </span>
                      )}
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Positioner>
                    <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow z-50">
                      {ink.name}
                      {!ink.kmEligible && " · no K-M calibration"}
                    </Tooltip.Content>
                  </Tooltip.Positioner>
                </Tooltip.Root>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Dialog.CloseTrigger asChild>
              <button
                type="button"
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-white rounded"
              >
                Close
              </button>
            </Dialog.CloseTrigger>
          </div>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
