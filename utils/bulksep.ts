import * as d3color from "d3-color";
import { ColorSpaceObject } from "d3-color";
import { Result } from "./winterface";

export async function* bulkColorSeparation(
  colorIter: AsyncIterable<ColorSpaceObject>,
  pool: readonly ColorSpaceObject[],
  increments: number,
): AsyncIterableIterator<[string, ColorSpaceObject, number[]]> {
  const colors = new Set<string>();
  for await (const color of colorIter) {
    colors.add(color.formatHex());
  }
  const transPool = new Uint8ClampedArray(pool.length * 3);
  for (const [i, color] of pool.entries()) {
    const { r, g, b } = color.rgb();
    transPool.set([r, g, b], i * 3);
  }

  const message = { colors, pool: transPool, increments };
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  const res = await new Promise<Result>((resolve) => {
    worker.addEventListener("message", (event: MessageEvent<Result>) => {
      resolve(event.data);
    });
    worker.postMessage(message, {
      transfer: [transPool.buffer as ArrayBuffer],
    });
  });
  if (res.typ === "err") {
    throw new Error(res.err);
  }
  const { prevs, opacs } = res;
  let i = 0;
  for (const key of colors) {
    const [r, g, b] = prevs.slice(i * 3, (i + 1) * 3);
    const opac = [...opacs.slice(i * pool.length, (i + 1) * pool.length)];
    yield [key, d3color.rgb(r, g, b), opac];
    i++;
  }
}
