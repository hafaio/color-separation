import { packRgb, type RgbU32, unpackRgb } from "./color";
import { encodeGreyscale } from "./encode-image";
import { paintOutputs } from "./paint";
import { buildSolverContext, solveColors } from "./solver-context";
import {
  type RasterMessage,
  type RasterOut,
  SOLVER_FRACTION,
  serve,
} from "./worker-rpc";

// Separations (grayscale PNG/JPEG) get the small grayscale codec; the preview
// and any WebP output fall back to the canvas encoder.
function encodeImage(
  image: ImageData,
  type: string,
  grayscale: boolean,
): Promise<Blob> {
  if (grayscale && (type === "image/png" || type === "image/jpeg")) {
    return encodeGreyscale(image, type);
  } else {
    const canvas = new OffscreenCanvas(image.width, image.height);
    canvas.getContext("2d")!.putImageData(image, 0, 0);
    return canvas.convertToBlob({ type });
  }
}

serve<RasterMessage, RasterOut>(async (message, onProgress) => {
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
    onProgress,
  );

  // Per unique colour, the RGB to write for each output: the preview's channels,
  // then each separation's grey repeated across R/G/B (the outputs are RGBA).
  const triples = numOutputs * 3;
  const table = new Map<RgbU32, Uint8ClampedArray>();
  let cIdx = 0;
  for (const key of counts.keys()) {
    const bytes = new Uint8ClampedArray(triples);
    const { r, g, b } = unpackRgb(prevs[cIdx]);
    bytes[0] = r;
    bytes[1] = g;
    bytes[2] = b;
    for (let j = 0; j < numChannels; j++) {
      const v = Math.round((1 - opacs[cIdx * n + j]) * 255);
      const base = 3 + j * 3;
      bytes[base] = v;
      bytes[base + 1] = v;
      bytes[base + 2] = v;
    }
    table.set(key, bytes);
    cIdx++;
  }

  const outDatas = Array.from(
    { length: numOutputs },
    () => new ImageData(width, height, { colorSpace: "srgb" }),
  );
  paintOutputs(srcData, outDatas, table);

  // Split the trailing budget: ~40% for pixel write, ~60% for per-channel
  // blob encoding (the heavier phase).
  const trailing = 1 - SOLVER_FRACTION;
  const pixelEnd = SOLVER_FRACTION + trailing * 0.4;
  const blobEnd = 1;
  onProgress(pixelEnd);
  // Encode all blobs in parallel and report progress as each resolves. The
  // preview (index 0) is full colour; only the per-channel separations are
  // grayscale, so the grayscale colour space only applies to index > 0.
  let done = 0;
  const step = (blobEnd - pixelEnd) / outDatas.length;
  const blobs = await Promise.all(
    outDatas.map((data, j) =>
      encodeImage(data, outputType, grayscale && j > 0).then((blob) => {
        done++;
        onProgress(pixelEnd + step * done);
        return blob;
      }),
    ),
  );

  return {
    preview: blobs[0],
    separations: blobs.slice(1),
    chosenOrder: ctx.chosenOrder,
  };
});
