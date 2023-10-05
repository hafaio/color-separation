"use client";

import { useToast } from "@chakra-ui/react";
import * as d3color from "d3-color";
import { ColorSpaceObject } from "d3-color";
import { saveAs } from "file-saver";
import { extension } from "mime-types";
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
import { blob2url } from "../utils/conversion";
import { extractColors, updateColors } from "../utils/extract";
import { colorSeparation } from "../utils/sep";

export default function App(): ReactElement {
  const [showRaw, setShowRaw] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const toggleHelp = useCallback(
    () => setShowHelp(!showHelp),
    [showHelp, setShowHelp],
  );
  const toast = useToast();

  const [fileName, setFileName] = useState<string | undefined>();
  const [parsed, setParsed] = useState<string | undefined | null>();
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
  // FIXME make sure all async effects set a loading state in some way...
  useEffect(() => {
    if (!parsed || ![...colors.values()].some(([, active]) => active)) {
      setPreview(undefined);
    } else {
      // FIXME set state so that we disable the color picker
      const pool = [];
      for (const [color, [, active]] of colors) {
        if (active) {
          pool.push(d3color.color(color)!);
        }
      }

      // FIXME move this into separate call
      (async () => {
        const update = new Map<string, ColorSpaceObject>();
        for await (const target of extractColors(parsed)) {
          const key = target.formatHex();
          if (update.has(key)) continue;
          const { color } = colorSeparation(target, pool, {
            increments,
          });
          update.set(key, color);
        }

        const updater = (orig: ColorSpaceObject): ColorSpaceObject => {
          return update.get(orig.formatHex())!.copy({ opacity: orig.opacity });
        };

        const updated = await updateColors(parsed, updater);
        const url = await blob2url(updated);
        setPreview(url);
      })().catch(() => {
        // FIXME
      });
    }
  }, [colors, increments, parsed, setPreview]);

  const download = useCallback(async () => {
    if (parsed && fileName) {
      // FIXME try/catch
      const baseName = fileName.slice(0, fileName.lastIndexOf(".")) || fileName;

      const pool = [];
      const names = [];
      for (const [color, [name, active]] of colors) {
        if (active) {
          pool.push(d3color.color(color)!);
          names.push(name);
        }
      }

      // FIXME move this out
      const mapping = new Map<string, number[]>();
      for await (const target of extractColors(parsed)) {
        const key = target.formatHex();
        if (mapping.has(key)) continue;
        const { opacities } = colorSeparation(target, pool, {
          increments,
        });
        mapping.set(key, opacities);
      }

      const proms = [];
      for (const [ind, name] of names.entries()) {
        const updater = (orig: ColorSpaceObject): ColorSpaceObject => {
          const opacity = mapping.get(orig.formatHex())![ind];
          const updated = d3color.gray((1 - opacity) * 100);
          return updated.copy({ opacity: orig.opacity });
        };

        proms.push(
          updateColors(parsed, updater).then((blob) => {
            const ext = extension(blob.type);
            saveAs(blob, `${baseName}_${name.replace(" ", "_")}.${ext}`);
          }),
        );
      }
      await Promise.all(proms);
    }
  }, [parsed, colors, fileName]);

  const onUpload = useCallback(
    async (file: File) => {
      setFileName(file.name);
      setParsed(null);
      setShowHelp(false);
      try {
        const raw = await blob2url(file);
        setParsed(raw);
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
  const src = showRaw ? parsed : preview ?? parsed;
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
        <div className="h-full w-full overflow-auto">{img}</div>
      </div>
    </Theme>
  );
}
