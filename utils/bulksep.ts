import type { RgbU32 } from "./color";
import type { MixingMode } from "./sep";
import { type BulkMessage, type BulkResult, createSender } from "./worker-rpc";

const runBulk = createSender<BulkMessage, BulkResult>(
  () => new Worker(new URL("./bulksep-worker.ts", import.meta.url)),
  {
    transfer: ({ pool, renderPool }) => [
      pool.buffer as ArrayBuffer,
      renderPool.buffer as ArrayBuffer,
    ],
  },
);

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

  const { prevs, opacs, chosenOrder } = await runBulk(
    {
      colors,
      pool: transPool,
      renderPool: transRender,
      mixingMode,
      autoOrder,
      increments,
      lambda,
    },
    onProgress,
  );

  onChosenOrder?.(chosenOrder);
  let i = 0;
  for (const key of colors.keys()) {
    const opac = [...opacs.slice(i * pool.length, (i + 1) * pool.length)];
    yield [key, prevs[i], opac];
    i++;
  }
}
