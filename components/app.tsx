"use client";

import { createToaster, Toaster, type ToastOptions } from "@ark-ui/react/toast";
import * as d3color from "d3-color";
import { saveAs } from "file-saver";
import { extension } from "mime-types";
import Image from "next/image";
import {
  type ReactElement,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { blob2url, resizeBlob, url2blob } from "../utils/conversion";
import { genPreview, genSeparation } from "../utils/separate";
import DropModal from "./drop-modal";
import Editor, { type Action } from "./editor";
import Footer from "./footer";
import HelpText from "./help-text";
import UploadButton from "./upload-button";

const toaster = createToaster({
  placement: "bottom-start",
});

interface Parsed {
  raw: File;
  preview: string;
}

export default function App(): ReactElement {
  const [showRaw, setShowRaw] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [isDownloading, setDownloading] = useState(false);
  const toggleHelp = useCallback(() => {
    setShowHelp(!showHelp);
  }, [showHelp]);
  const imgBox = useRef(null);

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
      } else if (action.action === "toggle") {
        const copy = new Map(existingColors);
        const [name, state] = copy.get(action.color)!;
        copy.set(action.color, [name, !state]);
        return copy;
      } else {
        return new Map(
          [...existingColors].map(([color, [name]]) => [color, [name, false]]),
        );
      }
    },
    new Map<string, [string, boolean]>(),
  );

  const [preview, setPreview] = useState<string | undefined>();
  const [increments, setIncrements] = useState(0);

  useEffect(() => {
    if (!parsed || ![...colors.values()].some(([, active]) => active)) {
      setPreview(undefined);
    } else {
      void (async () => {
        try {
          setRendering(true);

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
          toaster.create({
            title: "Couldn't separate image",
            type: "error",
          });
        } finally {
          setRendering(false);
        }
      })();
    }
  }, [colors, increments, parsed]);

  const download = useCallback(() => {
    if (parsed) {
      void (async () => {
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
            saveAs(blob, `${baseName}_${name.replaceAll(" ", "_")}.${ext}`);
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
  }, [parsed, colors, increments]);

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
        increments={increments}
        setIncrements={setIncrements}
        download={download}
        isDownloading={isDownloading}
        setShowRaw={setShowRaw}
        rendering={rendering}
      />
    ) : (
      <HelpText closeable={!!parsed} />
    );
  const src = showRaw ? parsed?.preview : (preview ?? parsed?.preview);
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
          title: "Dropped file was not an SVG, PNG, or JPEG",
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
        <div className="w-72 h-full p-2 overflow-y-auto flex flex-col flex-shrink-0 justify-between bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
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
