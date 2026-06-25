import { packRgb, type RgbU32 } from "./color";
import { encodeImage } from "./encode-image";
import { buildSolverContext, solveColors } from "./solver-context";
import {
  type RasterMessage,
  type RasterResult,
  SOLVER_FRACTION,
} from "./winterface";

addEventListener("message", (event: MessageEvent<RasterMessage>) => {
  void run(event.data);
});

async function run(message: RasterMessage): Promise<void> {
  try {
    const {
      blob,
      pool,
      renderPool,
      mixingMode,
      autoOrder,
      increments,
      lambda,
      outputType,
      grayscale,
    } = message;
    const numChannels = pool.length;
    const numOutputs = 1 + numChannels;

    const bmp = await createImageBitmap(blob);
    const { width, height } = bmp;
    const srcCanvas = new OffscreenCanvas(width, height);
    const srcCtx = srcCanvas.getContext("2d")!;
    srcCtx.drawImage(bmp, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, width, height, {
      colorSpace: "srgb",
    }).data;

    // Pixel-frequency-weighted unique colors drive auto-ordering racing.
    const counts = new Map<RgbU32, number>();
    for (let i = 0; i < srcData.length; i += 4) {
      const key = packRgb(srcData[i], srcData[i + 1], srcData[i + 2]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const ctx = buildSolverContext(
      pool,
      renderPool,
      mixingMode,
      autoOrder,
      counts,
      increments,
      lambda,
    );

    const total = counts.size;
    const n = ctx.poolColors.length;
    const prevs = new Uint32Array(total);
    const opacs = new Float64Array(total * n);
    solveColors(
      ctx,
      counts.keys(),
      total,
      prevs,
      opacs,
      SOLVER_FRACTION,
      (value) => postMessage({ typ: "progress", value }),
    );

    // Build per-unique-color packed bytes (preview RGB + per-channel grayscale
    // triples) once so the per-pixel canvas-write loop is a pure memcpy.
    const triples = numOutputs * 3;
    const colorIndex = new Map<RgbU32, number>();
    const colorBytes: Uint8Array[] = new Array(total);
    let cIdx = 0;
    for (const key of counts.keys()) {
      const bytes = new Uint8Array(triples);
      const prev = prevs[cIdx];
      bytes[0] = (prev >> 16) & 0xff;
      bytes[1] = (prev >> 8) & 0xff;
      bytes[2] = prev & 0xff;
      for (let j = 0; j < numChannels; j++) {
        const v = Math.round((1 - opacs[cIdx * n + j]) * 255);
        const base = 3 + j * 3;
        bytes[base] = v;
        bytes[base + 1] = v;
        bytes[base + 2] = v;
      }
      colorBytes[cIdx] = bytes;
      colorIndex.set(key, cIdx);
      cIdx++;
    }

    const outDatas: ImageData[] = [];
    for (let j = 0; j < numOutputs; j++) {
      outDatas.push(new ImageData(width, height, { colorSpace: "srgb" }));
    }

    for (let i = 0; i < srcData.length; i += 4) {
      const key = packRgb(srcData[i], srcData[i + 1], srcData[i + 2]);
      const alpha = srcData[i + 3];
      const bytes = colorBytes[colorIndex.get(key)!];
      for (let j = 0; j < numOutputs; j++) {
        const out = outDatas[j].data;
        const base = j * 3;
        out[i] = bytes[base];
        out[i + 1] = bytes[base + 1];
        out[i + 2] = bytes[base + 2];
        out[i + 3] = alpha;
      }
    }

    // Split the trailing budget: ~40% for pixel write, ~60% for per-channel
    // blob encoding (the heavier phase).
    const trailing = 1 - SOLVER_FRACTION;
    const pixelEnd = SOLVER_FRACTION + trailing * 0.4;
    const blobEnd = 1;
    postMessage({ typ: "progress", value: pixelEnd });
    // Encode all blobs in parallel and report progress as each resolves. The
    // preview (index 0) is full colour; only the per-channel separations are
    // grayscale, so the grayscale colour space only applies to index > 0.
    let done = 0;
    const step = (blobEnd - pixelEnd) / outDatas.length;
    const blobs = await Promise.all(
      outDatas.map((data, j) =>
        encodeImage(data, outputType, grayscale && j > 0).then((blob) => {
          done++;
          postMessage({ typ: "progress", value: pixelEnd + step * done });
          return blob;
        }),
      ),
    );

    const result: RasterResult = {
      typ: "success",
      preview: blobs[0],
      separations: blobs.slice(1),
      chosenOrder: ctx.chosenOrder,
    };
    postMessage(result);
  } catch (ex) {
    const err = ex instanceof Error ? ex.toString() : "unknown error";
    const result: RasterResult = { typ: "err", err };
    postMessage(result);
  }
}
