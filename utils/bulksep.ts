import type { ColorSpaceObject } from "d3-color";
import { packRgb, type RgbU32 } from "./color";
import type { Result } from "./winterface";

export async function* bulkColorSeparation(
  colorIter: AsyncIterable<RgbU32>,
  pool: readonly ColorSpaceObject[],
  renderPool: readonly ColorSpaceObject[],
  increments: number,
  lambda: number,
): AsyncIterableIterator<[RgbU32, RgbU32, number[]]> {
  const colors = new Set<RgbU32>();
  for await (const color of colorIter) {
    colors.add(color);
  }
  const transPool = new Uint32Array(pool.length);
  const transRender = new Uint32Array(renderPool.length);
  for (const [i, color] of pool.entries()) {
    const { r, g, b } = color.rgb();
    transPool[i] = packRgb(r, g, b);
  }
  for (const [i, color] of renderPool.entries()) {
    const { r, g, b } = color.rgb();
    transRender[i] = packRgb(r, g, b);
  }

  const message = {
    colors,
    pool: transPool,
    renderPool: transRender,
    increments,
    lambda,
  };
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  const res = await new Promise<Result>((resolve) => {
    worker.addEventListener("message", (event: MessageEvent<Result>) => {
      resolve(event.data);
      worker.terminate();
    });
    worker.postMessage(message, {
      transfer: [
        transPool.buffer as ArrayBuffer,
        transRender.buffer as ArrayBuffer,
      ],
    });
  });
  if (res.typ === "err") {
    throw new Error(res.err);
  }
  const { prevs, opacs } = res;
  let i = 0;
  for (const key of colors) {
    const opac = [...opacs.slice(i * pool.length, (i + 1) * pool.length)];
    yield [key, prevs[i], opac];
    i++;
  }
}
