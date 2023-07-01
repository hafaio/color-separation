import {
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Select,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Switch,
  Tooltip,
  useColorModeValue,
  useToast,
} from "@chakra-ui/react";
import { saveAs } from "file-saver";
import Head from "next/head";
import {
  ChangeEvent,
  PropsWithChildren,
  ReactElement,
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { FileRejection, useDropzone } from "react-dropzone";
import {
  FaFileDownload,
  FaFileUpload,
  FaGithub,
  FaInfoCircle,
} from "react-icons/fa";
import { extractColors, updateColors } from "../utils/extract";
import { colorSeparation } from "../utils/sep";

function UploadButton({
  onFile,
  loading = false,
}: {
  onFile: (f: File) => void;
  loading?: boolean;
}): ReactElement {
  const onChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const file = evt.target.files?.[0];
    if (file) {
      onFile(file);
    }
  };
  const input = useRef<HTMLInputElement>(null);
  const click = () => {
    input.current?.click();
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept="image/svg+xml"
        onChange={onChange}
        className="hidden"
      />
      <Button
        className="w-full"
        isLoading={loading}
        onClick={click}
        leftIcon={<FaFileUpload />}
      >
        Upload
      </Button>
    </div>
  );
}

function ColorButton({
  color,
  name,
  active,
  toggleColor,
}: {
  color: string;
  name: string;
  active: boolean;
  toggleColor: (named: string) => void;
}): ReactElement {
  const toggle = useCallback(() => toggleColor(color), [color, toggleColor]);
  return (
    <Tooltip label={name}>
      <button
        className="rounded-full bg-transparent transition-all m-1 focus:outline hover:scale-110"
        style={{
          width: "2rem",
          height: "2rem",
          borderWidth: active ? "0.2rem" : "1rem",
          borderColor: color,
          outlineColor: color,
        }}
        onClick={toggle}
      />
    </Tooltip>
  );
}

// more riso colors: https://www.stencil.wiki/colors
const risoPallette = [
  ["#f15060", "bright red"],
  ["#ff48b0", "fluorescent pink"],
  ["#ffe800", "yellow"],
  ["#00a95c", "green"],
  ["#0078bf", "blue"],
  ["#000000", "black"],
] as const;

const cmykPallette = [
  ["#00ffff", "cyan"],
  ["#ff00ff", "magenta"],
  ["#ffff00", "yellow"],
  ["#000000", "black"],
] as const;

function PalletteInput({
  colors,
  setPallette,
  addColor,
  paperColor,
  setPaperColor,
}: {
  colors: Map<string, unknown>;
  setPallette: (colors: readonly (readonly [string, string])[]) => void;
  addColor: (color: string, name: string) => void;
  paperColor: string;
  setPaperColor: (color: string) => void;
}): ReactElement {
  const palletteChange = (evt: ChangeEvent<HTMLSelectElement>) => {
    const val = evt.target.value;
    if (val === "none") {
      setPallette([]);
    } else if (val === "riso") {
      setPallette(risoPallette);
    } else if (val === "cmyk") {
      setPallette(cmykPallette);
    }
  };
  // default pallette
  useEffect(() => setPallette(risoPallette), [setPallette]);

  const [name, setName] = useState("");
  const inputChange = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => setName(evt.target.value),
    [setName],
  );
  const [color, setColor] = useState("#000000");
  const colorChange = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => setColor(evt.target.value),
    [setColor],
  );
  const paperColorChange = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => setPaperColor(evt.target.value),
    [setPaperColor],
  );

  const addClick = useCallback(
    () => addColor(color, name),
    [color, name, addColor],
  );

  const valid = name && !colors.has(color);
  const message = !name
    ? "must name added colors"
    : colors.has(color)
    ? "can only add unique colors"
    : undefined;

  return (
    <>
      <InputGroup>
        <Input placeholder="Color Name" value={name} onChange={inputChange} />
        <Input
          type="color"
          style={{ borderRadius: 0, borderLeft: 0, width: "8rem" }}
          value={color}
          onChange={colorChange}
        />
        <InputRightAddon style={{ padding: 0 }}>
          <Tooltip label={message}>
            <Button
              style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
              isDisabled={!valid}
              onClick={addClick}
            >
              Add
            </Button>
          </Tooltip>
        </InputRightAddon>
      </InputGroup>
      <Select placeholder="Select Pallette" onChange={palletteChange}>
        <option value="none">None</option>
        <option value="riso">Risograph</option>
        <option value="cmyk">CMYK</option>
      </Select>
      <InputGroup>
        <InputLeftAddon>
          <Tooltip label="Set the printed paper color">Paper Color</Tooltip>
        </InputLeftAddon>
        <Input type="color" value={paperColor} onChange={paperColorChange} />
      </InputGroup>
    </>
  );
}

function ColorPicker({
  colors,
  toggleColor,
}: {
  colors: Map<string, [string, boolean]>;
  toggleColor: (color: string) => void;
}): ReactElement {
  // TODO for colors we know, we may want to use their cmyk variant since it
  // doesn't use the simple 1-1
  const buttons = [...colors].map(([color, [name, active]]) => (
    <ColorButton
      color={color}
      name={name}
      toggleColor={toggleColor}
      active={active}
      key={color}
    />
  ));
  return <div className="flex flex-wrap justify-center">{buttons}</div>;
}

function EditorHeader({ children }: PropsWithChildren): ReactElement {
  return <h2 className="font-bold text-lg">{children}</h2>;
}

function Editor({
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

function HelpText({ closeable }: { closeable: boolean }): ReactElement {
  const footer = closeable ? (
    <p className="pt-4 pb-4">
      Click the info button below to hide this information.
    </p>
  ) : null;
  return (
    <div className="flex flex-col justify-between flex-grow">
      <div className="space-y-1 flex-grow">
        <p>
          Separate an SVG into spot colors; useful for risograph printing.
          Currently this assumes a naive color model, and printing on white.
        </p>
        <ol className="list-decimal ml-4">
          <li>
            Upload your SVG by clicking above or dropping it anywhere. Your SVG
            can contain opacity, but <span className="italic">must not</span>{" "}
            contain overlapping elements, embedded bitmaps, or gradients.
          </li>
          <li>Customize your color pallette by adding colors available.</li>
          <li>
            Select different colors and losses to check our your decomposition.
          </li>
          <li>Click export to download an individual SVG for each layer.</li>
        </ol>
      </div>
      {footer}
    </div>
  );
}

function DropModal({ show }: { show: boolean }): ReactElement {
  return (
    <div
      className={`w-screen h-screen fixed backdrop-blur-sm z-10 flex flex-col items-center justify-center ${
        show ? "block" : "hidden"
      }`}
    >
      <div
        className={`w-96 p-4 space-y-2 rounded-md shadow-md ${useColorModeValue(
          "bg-white",
          "bg-gray-900",
        )}`}
      >
        <h1 className="font-bold text-lg">Drag & Drop an SVG to Upload</h1>
        <p>Drop a compatible SVG anywhere to begin separating its colors.</p>
      </div>
    </div>
  );
}

interface Elements {
  fill: SVGElement[];
  stroke: SVGElement[];
}

interface Parsed {
  readonly raw: string;
  readonly doc: Document;
  readonly colors: readonly string[];
}

type Action =
  | { action: "set"; colors: readonly (readonly [string, string])[] }
  | { action: "add"; color: string; name: string }
  | { action: "toggle"; color: string };

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
    <div
      {...getRootProps({
        className: "h-screen w-screen flex flex-row",
      })}
    >
      <Head>
        <title>Spot Color Separation</title>
      </Head>
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
        <div className="flex justify-center space-x-2">
          <Tooltip label="show help">
            <IconButton
              aria-label="show help information"
              icon={<FaInfoCircle />}
              isDisabled={!parsed}
              onClick={toggleHelp}
            />
          </Tooltip>
          <a
            href="https://github.com/hafaio/color-separation"
            target="_blank"
            rel="noreferrer"
          >
            <IconButton
              aria-label="view source on github"
              icon={<FaGithub />}
            />
          </a>
        </div>
      </div>
      <div
        className="h-full w-full overflow-auto"
        style={{ backgroundColor: paperColor }}
      >
        {img}
      </div>
    </div>
  );
}
