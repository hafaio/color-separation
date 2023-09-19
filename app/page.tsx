"use client";

import { useToast } from "@chakra-ui/react";
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

// FIXME change the color parsing. Right now we translate opacity to white, but
// I think we should just preserve opacity. This should work, but we'll need to
// make sure for download we convery the color to grayscale, not to black with
// opacity.
// FIXME colors I think it all colors present, but we shouldn't need that,
// instead, update should just compute the colors lazily as it finds them,
// saving the storage here.
// FIXME update should now only compute the expected new color, and download
// should compute the component
// FIXME add a png version of parsed where raw is the raw image url and doc is
// some javascritp image representation
interface Parsed {
  readonly raw: string;
  readonly doc: Document;
  readonly colors: readonly string[];
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
  const [paperColor, setPaperColor] = useState("#ffffff");

  const [[altered, mapping], setAltered] = useState<
    [string | undefined, Map<string, number[]>]
  >([undefined, new Map<string, number[]>()]);
  const [quadratic, toggleQuad] = useReducer((state: boolean) => !state, false);
  const [usePaper, togglePaper] = useReducer((state: boolean) => !state, true);
  const [increments, setIncrements] = useState(0);

  useEffect(() => {
    if (!parsed || ![...colors.values()].some(([, active]) => active)) {
      setAltered([undefined, new Map<string, number[]>()]);
    } else {
      const pool = [];
      for (const [color, [, active]] of colors) {
        if (active) {
          pool.push(color);
        }
      }

      const newMapping = new Map<string, number[]>();
      const update = new Map<string, string>();
      for (const target of parsed.colors) {
        const { opacities, color } = colorSeparation(target, pool, {
          quadratic,
          paper: paperColor,
          increments,
          factorPaper: usePaper,
        });
        newMapping.set(target, opacities);
        update.set(target, color);
      }

      const render = parsed.doc.cloneNode(true) as Document;
      updateColors(render, update);
      const serial = new XMLSerializer();
      const rendered = serial.serializeToString(render);
      setAltered([
        `data:image/svg+xml,${encodeURIComponent(rendered)}`,
        newMapping,
      ]);
    }
  }, [colors, quadratic, increments, parsed, setAltered, paperColor, usePaper]);

  const download = useCallback(() => {
    if (parsed && mapping.size && fileName) {
      const baseName = fileName.slice(0, fileName.lastIndexOf(".")) || fileName;
      const serial = new XMLSerializer();
      let i = 0;
      for (const [color, [name, active]] of colors) {
        if (active) {
          const update = new Map<string, string>();
          for (const color of parsed.colors) {
            const opacity = mapping.get(color)![i];
            // FIXME switch to d3-color format
            const hex = Math.round(255 * (1 - opacity)).toString(16);
            const grey = `#${hex}${hex}${hex}`;
            update.set(color, grey);
          }
          const render = parsed.doc.cloneNode(true) as Document;
          updateColors(render, update);
          const rendered = serial.serializeToString(render);
          const blob = new Blob([rendered], { type: "image/svg+xml" });
          saveAs(blob, `${baseName}_${name.replace(" ", "_")}.svg`);
          i++;
        }
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
        paperColor={paperColor}
        setPaperColor={setPaperColor}
        quadratic={quadratic}
        toggleQuad={toggleQuad}
        usePaper={usePaper}
        togglePaper={togglePaper}
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
        <div
          className="h-full w-full overflow-auto"
          style={{ backgroundColor: paperColor }}
        >
          {img}
        </div>
      </div>
    </Theme>
  );
}
