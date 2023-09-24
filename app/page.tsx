"use client";

import { useToast } from "@chakra-ui/react";
import * as d3color from "d3-color";
import { saveAs } from "file-saver";
import {
  ReactElement,
  useCallback,
  useEffect,
  useReducer,
  useState,
} from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import DropModal from "../components/drop-modal";
import Editor, { Action } from "../components/editor";
import Footer from "../components/footer";
import HelpText from "../components/help-text";
import Theme from "../components/theme";
import UploadButton from "../components/upload-button";
import { extractColors, updateColors } from "../utils/extract";
import { colorSeparation } from "../utils/sep";

// FIXME add a png version of parsed where raw is the raw image url and doc is
// some javascript image representation
// FIXME also handle svgs with embedded rasters
interface Parsed {
  readonly raw: string;
  readonly doc: Document;
  readonly colors: readonly string[];
}

function* activeColors(
  existingColors: Map<string, [string, boolean]>,
): IterableIterator<[string, string]> {
  for (const [color, [name, active]] of existingColors) {
    if (active) {
      yield [color, name];
    }
  }
}

export default function App(): ReactElement {
  const [showRaw, setShowRaw] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const toggleHelp = useCallback(
    () => setShowHelp(!showHelp),
    [showHelp, setShowHelp],
  );
  const toast = useToast();

  const [fileName, setFileName] = useState<string | undefined>();
  const [parsed, setParsed] = useState<Parsed | undefined | null>();
  const [colors, modifyColors] = useReducer(
    (
      existingColors: Map<string, [string, boolean]>,
      action: Action,
    ): Map<string, [string, boolean]> => {
      if (action.action === "set") {
        return new Map(
          action.colors.map(([color, name]) => [color, [name, false]]),
        );
      } else if (action.action === "add") {
        const copy = new Map(existingColors);
        copy.set(action.color, [action.name, false]);
        return copy;
      } else {
        // action.action === "toggle"
        const copy = new Map(existingColors);
        const [name, state] = copy.get(action.color)!;
        copy.set(action.color, [name, !state]);
        return copy;
      }
    },
    new Map<string, [string, boolean]>(),
  );

  const [[altered, mapping], setAltered] = useState<
    [string | undefined, Map<string, number[]>]
  >([undefined, new Map<string, number[]>()]);
  const [increments, setIncrements] = useState(0);

  useEffect(() => {
    if (!parsed || ![...colors.values()].some(([, active]) => active)) {
      setAltered([undefined, new Map<string, number[]>()]);
    } else {
      const pool = [];
      for (const [color] of activeColors(colors)) {
        pool.push(color);
      }

      const weights = new Map<string, number[]>();
      const update = new Map<string, string>();
      for (const target of parsed.colors) {
        const { opacities, color } = colorSeparation(target, pool, {
          increments,
        });
        weights.set(target, opacities);
        update.set(target, color);
      }

      const render = parsed.doc.cloneNode(true) as Document;
      updateColors(render, (css: string) => {
        const orig = d3color.color(css)!;
        const updated = d3color.color(update.get(orig.formatHex())!)!;
        return updated.copy({ opacity: orig.opacity }).toString();
      });
      const serial = new XMLSerializer();
      const rendered = serial.serializeToString(render);
      setAltered([
        `data:image/svg+xml,${encodeURIComponent(rendered)}`,
        weights,
      ]);
    }
  }, [colors, increments, parsed, setAltered]);

  const download = useCallback(() => {
    if (parsed && mapping.size && fileName) {
      const baseName = fileName.slice(0, fileName.lastIndexOf(".")) || fileName;
      const serial = new XMLSerializer();

      const pool = [];
      for (const [, name] of activeColors(colors)) {
        pool.push(name);
      }

      for (const [ind, name] of pool.entries()) {
        const render = parsed.doc.cloneNode(true) as Document;
        updateColors(render, (css: string) => {
          const orig = d3color.color(css)!;
          const opacity = mapping.get(orig.formatHex())![ind];
          const updated = d3color.gray((1 - opacity) * 100);
          return updated.copy({ opacity: orig.opacity }).toString();
        });
        const rendered = serial.serializeToString(render);
        const blob = new Blob([rendered], { type: "image/svg+xml" });
        saveAs(blob, `${baseName}_${name.replace(" ", "_")}.svg`);
      }
    }
  }, [parsed, mapping, colors, fileName]);

  const onUpload = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setParsed(null);
      setShowHelp(false);
      try {
        const text = await file.text();
        const parser = new DOMParser();
        const svg = parser.parseFromString(text, "image/svg+xml");
        const colors = [...extractColors(svg)];

        setParsed({
          raw: `data:image/svg+xml,${encodeURIComponent(text)}`,
          doc: svg,
          colors,
        });
      } catch (ex) {
        console.error(ex);
        toast({
          title: "Problem loading SVG",
          status: "error",
          position: "bottom-left",
        });
        setParsed(undefined);
      }
    },
    [setParsed, setFileName, setShowHelp, toast],
  );

  const editor =
    parsed && !showHelp ? (
      <Editor
        colors={colors}
        modifyColors={modifyColors}
        increments={increments}
        setIncrements={setIncrements}
        download={download}
        showRaw={showRaw}
        setShowRaw={setShowRaw}
      />
    ) : (
      <HelpText closeable={!!parsed} />
    );
  const src = showRaw ? parsed?.raw : altered ?? parsed?.raw;
  const img = src ? (
    <img
      src={src}
      alt="rendered separation"
      className="h-full w-full object-contain"
    />
  ) : null;

  const onDrop = useCallback(
    (accepted: File[], rejected: FileRejection[]) => {
      const [file] = accepted;
      if (file) {
        onUpload(file);
      }
      if (rejected.length) {
        toast({
          title: "Dropped file was not an SVG",
          status: "error",
          position: "bottom-left",
        });
      }
    },
    [onUpload, toast],
  );
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/svg+xml": [],
    },
    multiple: false,
    noClick: true,
  });

  return (
    <Theme>
      <div
        {...getRootProps({
          className: "h-screen w-screen flex flex-row",
        })}
      >
        <input {...getInputProps()} />
        <DropModal show={isDragActive} />
        <div className="w-72 h-full p-2 overflow-y-auto flex flex-col flex-shrink-0 justify-between">
          <div className="space-y-2 flex-grow flex flex-col">
            <h1 className="font-bold text-xl text-center">
              Spot Color Separator
            </h1>
            <UploadButton onFile={onUpload} loading={parsed === null} />
            {editor}
          </div>
          <Footer helpDisabled={!parsed} toggleHelp={toggleHelp} />
        </div>
        <div className="h-full w-full overflow-auto">{img}</div>
      </div>
    </Theme>
  );
}
