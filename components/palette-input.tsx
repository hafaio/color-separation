import { Dialog } from "@ark-ui/react/dialog";
import { Tooltip } from "@ark-ui/react/tooltip";
import {
  type ChangeEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FaPlus } from "react-icons/fa";
import { hexToRgb, type RgbU32, rgbToCss } from "../utils/color";
import type { CustomColor } from "../utils/custom-colors";
import { INKS_BY_RGB, type Ink } from "../utils/inks";
import type { ColorState } from "../utils/types";

// INKS_BY_RGB is module-constant, so the displayed swatch list never changes.
const INK_LIST: readonly Ink[] = [...INKS_BY_RGB.values()];

// A focused native color input means its picker is open. This is the
// deterministic "is the picker open" signal — no timing involved.
function isColorInput(el: EventTarget | null): boolean {
  return el instanceof HTMLInputElement && el.type === "color";
}

/**
 * The circular color chip shared by every palette swatch: the Riso and custom
 * toggle buttons and the add-form's live preview. `selected` draws the ring;
 * `children` is for overlays like the position badge or KM-ineligible dot.
 */
function ColorSwatch({
  color,
  selected = false,
  className = "",
  children,
}: {
  color: RgbU32 | string;
  selected?: boolean;
  className?: string;
  children?: ReactNode;
}): ReactElement {
  const css = typeof color === "string" ? color : rgbToCss(color);
  return (
    <span
      className={`relative block w-9 h-9 rounded-full ${className}`}
      style={{
        backgroundColor: css,
        boxShadow: selected
          ? `0 0 0 2px var(--palette-bg), 0 0 0 4px ${css}`
          : "inset 0 0 0 1px rgba(0,0,0,0.15)",
      }}
    >
      {children}
    </span>
  );
}

function Swatch({
  rgb,
  selected,
  label,
  badge,
  onToggle,
  onContextMenu,
}: {
  rgb: RgbU32;
  selected: boolean;
  label: string;
  badge?: ReactElement;
  onToggle: () => void;
  onContextMenu?: (evt: MouseEvent) => void;
}): ReactElement {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <button
          type="button"
          aria-pressed={selected}
          className="mx-auto flex p-0 rounded-full transition-transform hover:scale-110"
          onClick={onToggle}
          onContextMenu={onContextMenu}
        >
          <ColorSwatch color={rgb} selected={selected}>
            {badge}
          </ColorSwatch>
        </button>
      </Tooltip.Trigger>
      <Tooltip.Positioner>
        <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow z-50">
          {label}
        </Tooltip.Content>
      </Tooltip.Positioner>
    </Tooltip.Root>
  );
}

function KmIneligibleDot(): ReactElement {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      aria-hidden
    >
      <span
        className="w-1.5 h-1.5 rounded-full bg-white"
        style={{ mixBlendMode: "difference" }}
      />
    </span>
  );
}

function CustomAddForm({
  customs,
  onSave,
}: {
  customs: readonly CustomColor[];
  onSave: (color: CustomColor) => void;
}): ReactElement {
  const [hex, setHex] = useState("#ff0000");
  const [name, setName] = useState("");

  const onHexChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    setHex(evt.target.value);
  }, []);
  const onNameChange = useCallback((evt: ChangeEvent<HTMLInputElement>) => {
    setName(evt.target.value);
  }, []);

  const trimmedName = name.trim();
  const rgb = hexToRgb(hex);
  // Reject a name or color that already belongs to any color — Riso ink or
  // saved custom — so two swatches can't collide. `reason` doubles as the
  // disabled-Save tooltip text; undefined means the form is valid.
  const colorOwner =
    INKS_BY_RGB.get(rgb)?.name ??
    customs.find((color) => color.rgb === rgb)?.name;
  const lowerName = trimmedName.toLowerCase();
  const nameTaken =
    INK_LIST.some((ink) => ink.name.toLowerCase() === lowerName) ||
    customs.some((color) => color.name.toLowerCase() === lowerName);
  const reason = !trimmedName
    ? "Enter a name"
    : colorOwner
      ? `That color is already used by ${colorOwner}`
      : nameTaken
        ? `The name "${trimmedName}" is already in use`
        : undefined;
  const invalid = reason !== undefined;

  const onSubmit = useCallback(
    (evt: SyntheticEvent) => {
      evt.preventDefault();
      if (invalid) return;
      onSave({ rgb, name: trimmedName });
    },
    [invalid, onSave, rgb, trimmedName],
  );

  const saveButton = (
    <button
      type="submit"
      disabled={invalid}
      className="px-3 py-1 text-sm bg-slate-300 hover:bg-slate-400 text-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-white rounded disabled:opacity-50 disabled:pointer-events-none"
    >
      Save
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2">
      <label className="flex-shrink-0 cursor-pointer rounded-full transition-transform hover:scale-110">
        <ColorSwatch color={hex} />
        <input
          type="color"
          value={hex}
          onChange={onHexChange}
          className="sr-only"
          aria-label="Pick color"
        />
      </label>
      <input
        type="text"
        // biome-ignore lint/a11y/noAutofocus: focusing the only text field on modal open
        autoFocus
        value={name}
        onChange={onNameChange}
        placeholder="Name"
        className="flex-grow min-w-0 px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-slate-100"
      />
      {reason ? (
        <Tooltip.Root>
          {/* Wrap in a span: a disabled button (pointer-events-none) can't
              be a hover target, so the span carries the tooltip instead. */}
          <Tooltip.Trigger asChild>
            <span className="inline-flex">{saveButton}</span>
          </Tooltip.Trigger>
          <Tooltip.Positioner>
            <Tooltip.Content className="bg-slate-800 dark:bg-slate-700 text-white text-sm px-2 py-1 rounded shadow z-[80] max-w-xs">
              {reason}
            </Tooltip.Content>
          </Tooltip.Positioner>
        </Tooltip.Root>
      ) : (
        saveButton
      )}
    </form>
  );
}

export default function PaletteInput({
  colors,
  addColor,
  removeColor,
  customs,
  saveCustom,
  deleteCustom,
}: {
  colors: Map<RgbU32, ColorState>;
  addColor: (color: RgbU32, name: string) => void;
  removeColor: (color: RgbU32) => void;
  customs: readonly CustomColor[];
  saveCustom: (color: CustomColor) => void;
  deleteCustom: (rgb: RgbU32) => void;
}): ReactElement {
  const [adding, setAdding] = useState(false);
  // Whether a color input was focused (its native picker open) at the instant
  // of the last outside pointerdown. zag fires the modal's interact-outside
  // deferred (raf), by which point focus has moved — so we record the fact
  // synchronously here and read it in the deferred handler. No timing guesses.
  const pickerOpenAtPointerDown = useRef(false);
  useEffect(() => {
    if (!adding) return;
    const onPointerDownCapture = () => {
      pickerOpenAtPointerDown.current = isColorInput(document.activeElement);
    };
    document.addEventListener("pointerdown", onPointerDownCapture, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDownCapture, true);
  }, [adding]);
  const toggleInk = useCallback(
    (rgb: RgbU32, name: string) => {
      if (colors.has(rgb)) {
        removeColor(rgb);
      } else {
        addColor(rgb, name);
      }
    },
    [colors, addColor, removeColor],
  );

  const selectedCount = useMemo(
    () => INK_LIST.reduce((n, ink) => n + (colors.has(ink.rgb) ? 1 : 0), 0),
    [colors],
  );

  // Close the add modal whenever the palette dialog opens / closes so we
  // don't leave it hanging over a stale state.
  const onDialogOpenChange = useCallback(() => {
    setAdding(false);
  }, []);

  const onAddSave = useCallback(
    (color: CustomColor) => {
      saveCustom(color);
      setAdding(false);
    },
    [saveCustom],
  );

  return (
    <Dialog.Root onOpenChange={onDialogOpenChange}>
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
            Click a color to add or remove it from your palette.
          </Dialog.Description>
          <h3 className="font-semibold mb-2">Riso inks</h3>
          <div
            className="grid gap-3 mb-6"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(2.75rem, 1fr))",
            }}
          >
            {INK_LIST.map((ink) => (
              <Swatch
                key={ink.id}
                rgb={ink.rgb}
                selected={colors.has(ink.rgb)}
                label={
                  ink.kmEligible ? ink.name : `${ink.name} · no K-M calibration`
                }
                badge={ink.kmEligible ? undefined : <KmIneligibleDot />}
                onToggle={() => toggleInk(ink.rgb, ink.name)}
              />
            ))}
          </div>
          <h3 className="font-semibold mb-2">Custom colors</h3>
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(2.75rem, 1fr))",
            }}
          >
            {customs.map((color) => (
              <Swatch
                key={color.rgb}
                rgb={color.rgb}
                selected={colors.has(color.rgb)}
                label={color.name}
                badge={<KmIneligibleDot />}
                onToggle={() => toggleInk(color.rgb, color.name)}
                onContextMenu={(evt) => {
                  evt.preventDefault();
                  deleteCustom(color.rgb);
                }}
              />
            ))}
            <Dialog.Root
              open={adding}
              onOpenChange={(details) => setAdding(details.open)}
              onInteractOutside={(event) => {
                // Keep the modal open only when this interaction is the native
                // color picker being dismissed: a pointerdown made while the
                // color input was focused, or focus leaving the color input.
                const original = event.detail.originalEvent;
                const fromPicker =
                  original.type === "focusin" || original.type === "focusout"
                    ? isColorInput((original as FocusEvent).relatedTarget)
                    : pickerOpenAtPointerDown.current;
                if (fromPicker) event.preventDefault();
              }}
              lazyMount
              unmountOnExit
            >
              <Dialog.Trigger asChild>
                <button
                  type="button"
                  aria-label="Add custom color"
                  className="w-9 h-9 rounded-full mx-auto border-2 border-dashed border-slate-400 dark:border-slate-500 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                >
                  <FaPlus aria-hidden />
                </button>
              </Dialog.Trigger>
              <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-[60]" />
              <Dialog.Positioner className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                <Dialog.Content className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-xs p-6">
                  <Dialog.Title className="text-xl font-bold mb-4">
                    Add Custom Color
                  </Dialog.Title>
                  <CustomAddForm customs={customs} onSave={onAddSave} />
                </Dialog.Content>
              </Dialog.Positioner>
            </Dialog.Root>
          </div>
          <div className="flex justify-end mt-6">
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
