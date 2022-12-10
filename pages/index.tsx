import {
  Button,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Radio,
  RadioGroup,
  Select,
  Tooltip,
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
import {
  FaFileDownload,
  FaFileUpload,
  FaGithub,
  FaInfoCircle,
} from "react-icons/fa";
import { mapGetDef } from "../utils/collections";
import { parseCSS } from "../utils/color";
import { colorSeparation, Losses } from "../utils/sep";

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
    [setName]
  );
  const [color, setColor] = useState("#000000");
  const colorChange = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => setColor(evt.target.value),
    [setColor]
  );
  const paperColorChange = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => setPaperColor(evt.target.value),
    [setPaperColor]
  );

  const addClick = useCallback(
    () => addColor(color, name),
    [color, name, addColor]
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
  loss,
  setLoss,
  download,
  showRaw,
  setShowRaw,
}: {
  colors: Map<string, [string, boolean]>;
  modifyColors: (action: Action) => void;
  paperColor: string;
  setPaperColor: (color: string) => void;
  loss: string;
  setLoss: (l: Losses) => void;
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
    [modifyColors]
  );
  const setPallette = useCallback(
    (colors: readonly (readonly [string, string])[]) =>
      modifyColors({ action: "set", colors }),
    [modifyColors]
  );
  const addColor = useCallback(
    (color: string, name: string) =>
      modifyColors({ action: "add", color, name }),
    [modifyColors]
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
      <EditorHeader>Style</EditorHeader>
      <RadioGroup onChange={setLoss} value={loss}>
        <div className="flex flex-col space-y-2">
          <Radio value="quadratic">Quadratic</Radio>
          <Radio value="linear">Linear</Radio>
          <Radio value="posterize">Posterize</Radio>
        </div>
      </RadioGroup>
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
            Upload your svg above. Your SVG can contain opacity, but{" "}
            <span className="italic">must not</span> contain overlapping
            elements, embedded bitmaps, or gradients.
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

interface Elements {
  fill: SVGElement[];
  stroke: SVGElement[];
}

interface Parsed {
  raw: string;
  doc: Document;
  elems: Map<string, Elements>;
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
    [showHelp, setShowHelp]
  );
  const toast = useToast();

  const [fileName, setFileName] = useState<string | undefined>();
  const [parsed, setParsed] = useState<Parsed | undefined | null>();
  const [colors, modifyColors] = useReducer(
    (
      existingColors: Map<string, [string, boolean]>,
      action: Action
    ): Map<string, [string, boolean]> => {
      if (action.action === "set") {
        return new Map(
          action.colors.map(([color, name]) => [color, [name, false]])
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
    new Map<string, [string, boolean]>()
  );
  const [paperColor, setPaperColor] = useState("#ffffff");

  const [[altered, mapping], setAltered] = useState<
    [string | undefined, Map<string, number[]>]
  >([undefined, new Map<string, number[]>()]);
  const [loss, setLoss] = useState<Losses>("quadratic");

  useEffect(() => {
    if (!parsed) {
      setAltered([undefined, new Map()]);
    } else if ([...colors.values()].some(([, active]) => active)) {
      const pool = [];
      for (const [color, [, active]] of colors) {
        if (active) {
          pool.push(color);
        }
      }

      const newMapping = new Map();
      for (const [target, { fill, stroke }] of parsed.elems) {
        const { opacities, color } = colorSeparation(target, pool, {
          variant: loss,
          paper: paperColor,
        });

        for (const elem of fill) {
          elem.style.fill = color;
        }
        for (const elem of stroke) {
          elem.style.stroke = color;
        }
        newMapping.set(target, opacities);
      }

      // TODO there's a bug where sometimes specific colors are off. These
      // aren't off on export, so it must have to do with the rendering...
      const serial = new XMLSerializer();
      const rendered = serial.serializeToString(parsed.doc);
      setAltered([
        `data:image/svg+xml,${encodeURIComponent(rendered)}`,
        newMapping,
      ]);
    } else {
      for (const [color, { fill, stroke }] of parsed?.elems ?? []) {
        for (const elem of fill) {
          elem.style.fill = color;
        }
        for (const elem of stroke) {
          elem.style.stroke = color;
        }
      }
      setAltered([undefined, new Map()]);
    }
  }, [colors, loss, parsed, setAltered, paperColor]);

  const download = useCallback(() => {
    if (parsed && mapping.size && fileName) {
      const baseName = fileName.slice(0, fileName.lastIndexOf(".")) || fileName;
      const serial = new XMLSerializer();
      let i = 0;
      for (const [color, [name, active]] of colors) {
        if (active) {
          for (const [color, { fill, stroke }] of parsed.elems) {
            const opacity = mapping.get(color)![i];
            const hex = Math.round(255 * (1 - opacity)).toString(16);
            const grey = `#${hex}${hex}${hex}`;
            for (const elem of fill) {
              elem.style.fill = grey;
            }
            for (const elem of stroke) {
              elem.style.stroke = grey;
            }
          }
          const rendered = serial.serializeToString(parsed.doc);
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
      let error;
      let div;
      try {
        const text = await file.text();
        const parser = new DOMParser();
        const svg = parser.parseFromString(text, "image/svg+xml");

        // shenanigans to use get computed style
        div = document.createElement("div");
        div.style.display = "none";
        const shadow = div.attachShadow({ mode: "open" });
        for (const elem of svg.children) {
          shadow.appendChild(elem);
        }
        document.documentElement.appendChild(div);

        const colorMap = new Map<string, Elements>();
        for (const elem of shadow.querySelectorAll("*")) {
          if (elem instanceof SVGElement) {
            const { fill, stroke } = getComputedStyle(elem);
            if (fill && fill !== "none") {
              try {
                const color = parseCSS(fill);
                const list = mapGetDef(colorMap, color, () => ({
                  fill: [],
                  stroke: [],
                })).fill;
                list.push(elem);
              } catch (ex) {
                console.error("problem parsing color", ex);
                error = "Problem parsing colors in SVG";
                elem.style.fill = "none";
              }
            }
            if (stroke && stroke !== "none") {
              try {
                const color = parseCSS(stroke);
                const list = mapGetDef(colorMap, color, () => ({
                  fill: [],
                  stroke: [],
                })).stroke;
                list.push(elem);
              } catch (ex) {
                console.error("problem parsing color", ex);
                error = "Problem parsing colors in SVG";
                elem.style.stroke = "none";
              }
            }
          }
        }

        // restore svg document
        for (const elem of shadow.children) {
          svg.appendChild(elem);
        }

        setParsed({
          raw: `data:image/svg+xml,${encodeURIComponent(text)}`,
          doc: svg,
          elems: colorMap,
        });
      } catch (ex) {
        console.error(ex);
        error = "Problem loading SVG";
        setParsed(undefined);
      } finally {
        // remove temp div from document
        try {
          div && document.documentElement.removeChild(div);
        } catch {
          // noop
        }
      }
      if (error) {
        toast({
          title: error,
          status: "error",
          position: "bottom-left",
        });
      }
    },
    [setParsed, setFileName, setShowHelp, toast]
  );

  const editor =
    parsed && !showHelp ? (
      <Editor
        colors={colors}
        modifyColors={modifyColors}
        paperColor={paperColor}
        setPaperColor={setPaperColor}
        loss={loss}
        setLoss={setLoss}
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

  return (
    <div className="h-screen w-screen flex flex-row">
      <Head>
        <title>Spot Color Separation</title>
      </Head>
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
      <div className="h-full w-full overflow-auto">{img}</div>
    </div>
  );
}
