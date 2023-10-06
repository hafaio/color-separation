import * as d3color from "d3-color";
import { ColorSpaceObject } from "d3-color";
import { Result } from "./winterface";

function* zipPrevs(
  colors: Set<string>,
  prevs: Uint8ClampedArray,
): Iterable<[string, ColorSpaceObject]> {
  let i = 0;
  for (const key of colors) {
    const [r, g, b] = prevs.slice(i, i + 3);
    i += 3;
    yield [key, d3color.rgb(r, g, b)];
  }
}

function* zipOpacs(
  colors: Set<string>,
  opacs: Float64Array,
): Iterable<[string, number[]]> {
  const step = opacs.length / colors.size;
  let i = 0;
  for (const key of colors) {
    const opac = [...opacs.slice(i, i + step)];
    i += step;
    yield [key, opac];
  }
}

export async function bulkColorSeparation(
  colors: Set<string>,
  pool: readonly ColorSpaceObject[],
  increments: number,
): Promise<
  [Iterable<[string, ColorSpaceObject]>, Iterable<[string, number[]]>]
> {
  const transPool = new Uint8ClampedArray(pool.length * 3);
  for (const [i, color] of pool.entries()) {
    const { r, g, b } = color.rgb();
    transPool.set([r, g, b], i * 3);
  }

  const message = { colors, pool: transPool, increments };
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  const res = await new Promise<Result>((resolve) => {
    worker.addEventListener("message", (event: MessageEvent<Result>) =>
      resolve(event.data),
    );
    worker.postMessage(message, { transfer: [transPool.buffer] });
  });
  if (res.typ === "err") {
    throw new Error(res.err);
  } else if (res.typ !== "success") {
    res satisfies never;
    throw new Error("unreachable");
  }
  const { prevs, opacs } = res;
  return [zipPrevs(colors, prevs), zipOpacs(colors, opacs)];
}
