"use client";

import { createToaster, Toaster, type ToastOptions } from "@ark-ui/react/toast";
import { saveAs } from "file-saver";
import { extension } from "mime-types";
import Image from "next/image";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { luminance, type RgbU32 } from "../utils/color";
import { blob2url, resizeBlob, url2blob } from "../utils/conversion";
import { INKS_BY_ID, INKS_BY_RGB, RISO_DEFAULTS } from "../utils/inks";
import type { MixingMode } from "../utils/sep";
import {
  genGrid,
  genPreviewAndSeparation,
  genSeparation,
} from "../utils/separate";
import type { ColorState, Ordering } from "../utils/types";
import DropModal from "./drop-modal";
import Editor, { type Action } from "./editor";
import Footer from "./footer";
import HelpText from "./help-text";
import UploadButton from "./upload-button";

const toaster = createToaster({
  placement: "top-end",
  duration: 6000,
});

interface Parsed {
  raw: File;
  preview: string;
}

function orderActive(
  colors: Map<RgbU32, ColorState>,
  ordering: Ordering,
): [RgbU32, ColorState][] {
  const actives = [...colors].filter(([, s]) => s.active);
  if (ordering === "manual") {
    actives.sort(([, a], [, b]) => a.order - b.order);
  } else {
    // light-to-dark; auto picks an order in the worker after racing, so the
    // baseline pool we send out uses this same sort.
    actives.sort(([a], [b]) => luminance(b) - luminance(a));
  }
  return actives;
}

// The reducer reuses ColorState references for entries it doesn't touch, so
// shallow tuple-equality is enough to detect "active subset unchanged" after
// an unrelated palette add / remove.
function sameActive(
  a: readonly [RgbU32, ColorState][],
  b: readonly [RgbU32, ColorState][],
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i][0] !== b[i][0] || a[i][1] !== b[i][1]) return false;
  }
  return true;
}

export default function App(): ReactElement {
  const [showRaw, setShowRaw] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [isDownloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const toggleHelp = useCallback(() => {
    setShowHelp(!showHelp);
  }, [showHelp]);
  const imgBox = useRef(null);

  const [parsed, setParsed] = useState<Parsed | undefined | null>();
  const [ordering, setOrdering] = useState<Ordering>("light-to-dark");
  const [mixingMode, setMixingMode] = useState<MixingMode>("subtractive");
  const [colors, modifyColors] = useReducer(
    (
      existingColors: Map<RgbU32, ColorState>,
      action: Action,
    ): Map<RgbU32, ColorState> => {
      if (action.action === "add") {
        const copy = new Map(existingColors);
        copy.set(action.color, {
          name: action.name,
          active: false,
          remap: undefined,
          order: 0,
        });
        return copy;
      } else if (action.action === "remove") {
        const copy = new Map(existingColors);
        copy.delete(action.color);
        return copy;
      } else if (action.action === "toggle") {
        const copy = new Map(existingColors);
        const state = copy.get(action.color)!;
        const nextActive = !state.active;
        // activating assigns the next print position; deactivating keeps the
        // prior order so re-activation pushes the color to the back
        const order = nextActive
          ? Math.max(0, ...[...existingColors.values()].map((s) => s.order)) + 1
          : state.order;
        copy.set(action.color, {
          ...state,
          active: nextActive,
          remap: undefined,
          order,
        });
        return copy;
      } else if (action.action === "remap") {
        const copy = new Map(existingColors);
        const state = copy.get(action.color)!;
        const remap = action.remap === action.color ? undefined : action.remap;
        copy.set(action.color, { ...state, remap });
        return copy;
      } else {
        return new Map(
          [...existingColors].map(([color, state]) => [
            color,
            { ...state, active: false, remap: undefined },
          ]),
        );
      }
    },
    null,
    () =>
      new Map<RgbU32, ColorState>(
        RISO_DEFAULTS.map((id) => {
          const ink = INKS_BY_ID.get(id)!;
          return [
            ink.rgb,
            { name: ink.name, active: false, remap: undefined, order: 0 },
          ];
        }),
      ),
  );

  const [preview, setPreview] = useState<string | undefined>();
  const [grid, setGrid] = useState<string | undefined>();
  const [increments, setIncrements] = useState(0);
  const [lambda, setLambda] = useState(0);
  // The most recent worker-chosen print order, used to drive badge numbers
  // and filename indices under `auto` ordering. Stays in sync with whichever
  // render last completed; reset whenever the baseline pool changes.
  const [autoChosen, setAutoChosen] = useState<readonly RgbU32[] | undefined>();

  const orderedActiveRef = useRef<[RgbU32, ColorState][] | null>(null);
  const orderedActive = useMemo(() => {
    const next = orderActive(colors, ordering);
    const prev = orderedActiveRef.current;
    if (prev && sameActive(prev, next)) return prev;
    orderedActiveRef.current = next;
    return next;
  }, [colors, ordering]);
  // Inks that aren't KM-eligible by virtue of bad calibration.
  const kmIneligibleNames = useMemo(
    () =>
      orderedActive
        .map(([rgb, state]) => ({
          rgb,
          state,
          ink: INKS_BY_RGB.get(rgb),
        }))
        .filter((e) => e.ink && !e.ink.kmEligible)
        .map((e) => e.state.name),
    [orderedActive],
  );
  const kmAvailable = kmIneligibleNames.length === 0;
  // If the user has KM selected and activates an incompatible ink, fall back
  // to alpha_blend so we don't keep rendering with a mode the worker can't
  // honor. A toast informs the user.
  useEffect(() => {
    if (mixingMode === "kubelka_munk" && !kmAvailable) {
      setMixingMode("alpha_blend");
      toaster.create({
        title: `Switched to alpha-blend: ${kmIneligibleNames.join(", ")} ${kmIneligibleNames.length === 1 ? "is" : "are"} not KM-eligible`,
        type: "error",
      });
    }
  }, [mixingMode, kmAvailable, kmIneligibleNames]);
  // Display order = auto-chosen if it covers the current active set, else
  // the baseline ordering. Active rendering always sends the baseline pool
  // to the worker; the worker either keeps it (non-auto) or reorders
  // internally and reports back via chosenOrder.
  const displayOrdered = useMemo(() => {
    if (ordering !== "auto" || !autoChosen) return orderedActive;
    const baseline = new Map(orderedActive);
    if (
      autoChosen.length !== baseline.size ||
      autoChosen.some((rgb) => !baseline.has(rgb))
    ) {
      return orderedActive;
    }
    return autoChosen.map(
      (rgb) => [rgb, baseline.get(rgb)!] as [RgbU32, ColorState],
    );
  }, [orderedActive, ordering, autoChosen]);
  const positions = useMemo(
    () =>
      new Map<RgbU32, number>(
        displayOrdered.map(([color], i) => [color, i + 1]),
      ),
    [displayOrdered],
  );

  useEffect(() => {
    if (!parsed) {
      setPreview(undefined);
      setGrid(undefined);
      return;
    }
    const pool = orderedActive.map(([color]) => color);
    const renderPool = orderedActive.map(
      ([color, state]) => state.remap ?? color,
    );
    if (!pool.length) {
      setPreview(undefined);
      setGrid(undefined);
      return;
    }
    const autoOrder = ordering === "auto";
    let cancelled = false;
    // Skip state updates for sub-1% deltas so React doesn't reconcile the
    // toolbar tree on every per-color worker progress message.
    let lastReported = -1;
    const reportProgress = (frac: number) => {
      if (cancelled) return;
      if (frac < 1 && frac - lastReported < 0.01) return;
      lastReported = frac;
      setRenderProgress(frac);
    };
    void (async () => {
      try {
        setRendering(true);
        setRenderProgress(0);
        const blob = await url2blob(parsed.preview);
        const {
          preview: previewBlob,
          separations,
          chosenOrder,
        } = await genPreviewAndSeparation(
          blob,
          pool,
          renderPool,
          mixingMode,
          autoOrder,
          increments,
          lambda,
          reportProgress,
        );
        // separations come back in chosen order; tint with the corresponding
        // (potentially-remapped) render colors.
        const tintColors = chosenOrder.map((idx) => renderPool[idx]);
        const gridBlob = await genGrid(separations, tintColors);
        const [previewUrl, gridUrl] = await Promise.all([
          blob2url(previewBlob),
          blob2url(gridBlob),
        ]);
        if (!cancelled) {
          setPreview(previewUrl);
          setGrid(gridUrl);
          setAutoChosen(
            autoOrder ? chosenOrder.map((idx) => pool[idx]) : undefined,
          );
        }
      } catch (ex) {
        console.error(ex);
        if (!cancelled) {
          setPreview(undefined);
          setGrid(undefined);
          toaster.create({
            title: "Couldn't separate image",
            type: "error",
          });
        }
      } finally {
        if (!cancelled) {
          setRendering(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderedActive, mixingMode, ordering, increments, parsed, lambda]);

  const download = useCallback(() => {
    if (parsed) {
      void (async () => {
        try {
          setDownloading(true);
          const fileName = parsed.raw.name;
          const baseName =
            fileName.slice(0, fileName.lastIndexOf(".")) || fileName;

          const pool = orderedActive.map(([color]) => color);
          const names = orderedActive.map(([, state]) => state.name);

          setDownloadProgress(0);
          let lastReported = -1;
          const reportProgress = (frac: number) => {
            if (frac < 1 && frac - lastReported < 0.01) return;
            lastReported = frac;
            setDownloadProgress(frac);
          };
          const { separations, chosenOrder } = await genSeparation(
            parsed.raw,
            pool,
            mixingMode,
            ordering === "auto",
            increments,
            lambda,
            reportProgress,
          );
          // Filenames follow the chosen print order so the prefix matches the
          // numbered badge in the UI.
          for (let printIdx = 0; printIdx < chosenOrder.length; printIdx++) {
            const poolIdx = chosenOrder[printIdx];
            const blob = separations[printIdx];
            const ext = extension(blob.type);
            const name = names[poolIdx];
            saveAs(
              blob,
              `${baseName}_${printIdx + 1}_${name.replaceAll(" ", "_")}.${ext}`,
            );
          }
        } catch (ex) {
          console.error(ex);
          toaster.create({
            title: "Couldn't separate image",
            type: "error",
          });
        } finally {
          setDownloading(false);
        }
      })();
    }
  }, [parsed, orderedActive, mixingMode, ordering, increments, lambda]);

  const onUpload = useCallback((file: File) => {
    void (async () => {
      try {
        setParsed(null);
        setShowHelp(false);
        modifyColors({ action: "clear" });

        const { clientWidth, clientHeight } = imgBox.current!;
        const blob = await resizeBlob(file, clientWidth, clientHeight);
        const prev = await blob2url(blob);
        setParsed({ raw: file, preview: prev });
      } catch (ex) {
        console.error(ex);
        toaster.create({
          title: "Couldn't load file",
          type: "error",
        });
        setParsed(undefined);
      }
    })();
  }, []);

  const editor =
    parsed && !showHelp ? (
      <Editor
        colors={colors}
        modifyColors={modifyColors}
        positions={positions}
        ordering={ordering}
        setOrdering={setOrdering}
        mixingMode={mixingMode}
        setMixingMode={setMixingMode}
        kmAvailable={kmAvailable}
        kmIneligibleNames={kmIneligibleNames}
        increments={increments}
        setIncrements={setIncrements}
        lambda={lambda}
        setLambda={setLambda}
        download={download}
        isDownloading={isDownloading}
        setShowRaw={setShowRaw}
        setShowGrid={setShowGrid}
        rendering={rendering}
      />
    ) : (
      <HelpText closeable={!!parsed} />
    );
  const src = showRaw
    ? parsed?.preview
    : showGrid && grid
      ? grid
      : (preview ?? parsed?.preview);
  const img = src ? (
    <Image
      src={src}
      alt="rendered separation"
      className="h-full w-full object-contain"
      width="1"
      height="1"
    />
  ) : null;

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      const [file] = accepted;
      if (file) {
        onUpload(file);
      }
      if (rejected.length) {
        toaster.create({
          title: "Dropped file was not an SVG, PNG, JPEG, or WebP",
          type: "error",
        });
      }
    },
    [onUpload],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [],
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
    },
    multiple: false,
    noClick: true,
  });

  return (
    <>
      <div
        {...getRootProps({
          className: "h-screen w-screen flex flex-row",
        })}
      >
        <input {...getInputProps()} />
        <DropModal show={isDragActive} />
        <div className="w-72 h-full p-2 flex flex-col flex-shrink-0 gap-2 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
          <div className="flex flex-col gap-2 flex-shrink-0">
            <h1 className="font-bold text-xl text-center">
              Spot Color Separator
            </h1>
            <UploadButton onFile={onUpload} loading={parsed === null} />
          </div>
          {editor}
          <Footer helpDisabled={!parsed} toggleHelp={toggleHelp} />
        </div>
        <div className="h-full w-full overflow-auto relative" ref={imgBox}>
          {img}
          {(rendering || isDownloading) && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-700 pointer-events-none">
              <div
                className="h-full bg-slate-400 dark:bg-slate-500 transition-all duration-100"
                style={{
                  width: `${(isDownloading ? downloadProgress : renderProgress) * 100}%`,
                }}
              />
            </div>
          )}
        </div>
      </div>
      <Toaster toaster={toaster}>
        {(toast: ToastOptions) => (
          <div className="bg-red-100 text-red-900 border border-red-300 dark:bg-red-900 dark:text-red-100 dark:border-red-700 px-4 py-3 rounded shadow-lg">
            <p className="font-medium">{toast.title}</p>
          </div>
        )}
      </Toaster>
    </>
  );
}
