import {
  Button,
  Input,
  InputGroup,
  InputRightAddon,
  Select,
  Tooltip,
} from "@chakra-ui/react";
import {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useState,
} from "react";

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

// FIXME think about this interface more, maybe just have a + icon for adding a
// color and a clear? And maybe just have presets as well?
export default function PalletteInput({
  colors,
  setPallette,
  addColor,
}: {
  colors: Map<string, unknown>;
  setPallette: (colors: readonly (readonly [string, string])[]) => void;
  addColor: (color: string, name: string) => void;
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
    </>
  );
}
