"use client";

import { useToast } from "@chakra-ui/react";
import * as d3color from "d3-color";
import { saveAs } from "file-saver";
import { extension } from "mime-types";
import {
  ReactElement,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import DropModal from "../components/drop-modal";
import Editor, { Action } from "../components/editor";
import Footer from "../components/footer";
import HelpText from "../components/help-text";
import Theme from "../components/theme";
import UploadButton from "../components/upload-button";
import { blob2url, resizeBlob, url2blob } from "../utils/conversion";
import { genPreview, genSeparation } from "../utils/separate";

interface Parsed {
  raw: File;
  preview: string;
}

export default function App(): ReactElement {
  const [showRaw, setShowRaw] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [colorsActive, setColorsActive] = useState(true);
  const [isDownloading, setDownloading] = useState(false);
  const toggleHelp = useCallback(
    () => setShowHelp(!showHelp),
    [showHelp, setShowHelp],
  );
  const toast = useToast();
  const imgBox = useRef(null);

  const [parsed, setParsed] = useState<Parsed | undefined | null>();
  // FIXME just make a list since copies are O(n) anyway
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

  const [preview, setPreview] = useState<string | undefined>();
  const [increments, setIncrements] = useState(0);

  // FIXME move computation heavy calls to webworkers
  useEffect(() => {
    if (!parsed || ![...colors.values()].some(([, active]) => active)) {
      setPreview(undefined);
    } else {
      void (async () => {
        try {
          setColorsActive(false);

          const pool = [];
          for (const [color, [, active]] of colors) {
            if (active) {
              pool.push(d3color.color(color)!);
            }
          }
          const blob = await url2blob(parsed.preview);
          const updated = await genPreview(blob, pool, increments);
          const url = await blob2url(updated);
          setPreview(url);
        } catch (ex) {
          console.error(ex);
          setPreview(undefined);
          toast({
            title: "Couldn't separate image",
            status: "error",
            position: "bottom-left",
          });
        } finally {
          setColorsActive(true);
        }
      })();
    }
  }, [colors, increments, parsed, setPreview, toast]);

  const download = useCallback(async () => {
    if (parsed) {
      try {
        setDownloading(true);
        const fileName = parsed.raw.name;
        const baseName =
          fileName.slice(0, fileName.lastIndexOf(".")) || fileName;

        const pool = [];
        const names = [];
        for (const [color, [name, active]] of colors) {
          if (active) {
            pool.push(d3color.color(color)!);
            names.push(name);
          }
        }

        const blobs = await genSeparation(parsed.raw, pool, increments);
        for (const [ind, name] of names.entries()) {
          const blob = blobs[ind];
          const ext = extension(blob.type);
          saveAs(blob, `${baseName}_${name.replace(" ", "_")}.${ext}`);
        }
      } catch (ex) {
        console.error(ex);
        toast({
          title: "Couldn't separate image",
          status: "error",
          position: "bottom-left",
        });
      } finally {
        setDownloading(false);
      }
    }
  }, [parsed, colors, toast, increments]);

  const onUpload = useCallback(
    async (file: File) => {
      try {
        setParsed(null);
        setShowHelp(false);
        // FIXME clear colors

        const { clientWidth, clientHeight } = imgBox.current!;
        const blob = await resizeBlob(file, clientWidth, clientHeight);
        const prev = await blob2url(blob);
        setParsed({ raw: file, preview: prev });
      } catch (ex) {
        console.error(ex);
        toast({
          title: "Couldn't load file",
          status: "error",
          position: "bottom-left",
        });
        setParsed(undefined);
      }
    },
    [setParsed, setShowHelp, toast],
  );

  const editor =
    parsed && !showHelp ? (
      <Editor
        colors={colors}
        modifyColors={modifyColors}
        colorsActive={colorsActive}
        increments={increments}
        setIncrements={setIncrements}
        download={download}
        isDownloading={isDownloading}
        showRaw={showRaw}
        setShowRaw={setShowRaw}
      />
    ) : (
      <HelpText closeable={!!parsed} />
    );
  const src = showRaw ? parsed?.preview : preview ?? parsed?.preview;
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
          title: "Dropped file was not an SVG, PNG, or JPEG",
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
      "image/png": [],
      "image/jpeg": [],
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
        <div className="h-full w-full overflow-auto" ref={imgBox}>
          {img}
        </div>
      </div>
    </Theme>
  );
}
