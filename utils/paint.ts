import { packRgb, type RgbU32 } from "./color";

/**
 * Recolour a source image into the separation outputs: `table` gives the RGB
 * triple to write for each output per unique source colour; source alpha is
 * carried through.
 */
export function paintOutputs(
  srcData: Uint8ClampedArray,
  outputs: readonly ImageData[],
  table: ReadonlyMap<RgbU32, Uint8ClampedArray>,
): void {
  const datas = outputs.map((output) => output.data);
  for (let i = 0; i < srcData.length; i += 4) {
    const key = packRgb(srcData[i], srcData[i + 1], srcData[i + 2]);
    const alpha = srcData[i + 3];
    const bytes = table.get(key)!;
    for (let j = 0; j < datas.length; j++) {
      const out = datas[j];
      const base = j * 3;
      out[i] = bytes[base];
      out[i + 1] = bytes[base + 1];
      out[i + 2] = bytes[base + 2];
      out[i + 3] = alpha;
    }
  }
}
