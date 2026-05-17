import type { RgbU32 } from "./color";
import type { MixingMode } from "./sep";
import type { Result, WorkerOut } from "./winterface";

export async function* bulkColorSeparation(
  colorIter: AsyncIterable<RgbU32>,
  pool: readonly RgbU32[],
  renderPool: readonly RgbU32[],
  mixingMode: MixingMode,
  autoOrder: boolean,
  increments: number,
  lambda: number,
  onChosenOrder?: (order: readonly number[]) => void,
  onProgress?: (frac: number) => void,
): AsyncIterableIterator<[RgbU32, RgbU32, number[]]> {
  const colors = new Map<RgbU32, number>();
  for await (const color of colorIter) {
    colors.set(color, (colors.get(color) ?? 0) + 1);
  }
  const transPool = new Uint32Array(pool);
  const transRender = new Uint32Array(renderPool);

  const message = {
    colors,
    pool: transPool,
    renderPool: transRender,
    mixingMode,
    autoOrder,
    increments,
    lambda,
  };
  const worker = new Worker(new URL("./worker.ts", import.meta.url));
  const res = await new Promise<Result>((resolve) => {
    worker.addEventListener("message", (event: MessageEvent<WorkerOut>) => {
      const msg = event.data;
      if (msg.typ === "progress") {
        onProgress?.(msg.value);
      } else {
        resolve(msg);
        worker.terminate();
      }
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
  const { prevs, opacs, chosenOrder } = res;
  onChosenOrder?.(chosenOrder);
  let i = 0;
  for (const key of colors.keys()) {
    const opac = [...opacs.slice(i * pool.length, (i + 1) * pool.length)];
    yield [key, prevs[i], opac];
    i++;
  }
}
