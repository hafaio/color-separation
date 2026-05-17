import * as d3color from "d3-color";
import { packRgb, type RgbU32, unpackRgb } from "./color";
import { colorSeparation } from "./sep";
import type { RasterMessage, RasterResult } from "./winterface";

addEventListener("message", (event: MessageEvent<RasterMessage>) => {
  void run(event.data);
});

async function run(message: RasterMessage): Promise<void> {
  try {
    const { blob, pool, increments, outputType } = message;
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

    const unique = new Set<RgbU32>();
    for (let i = 0; i < srcData.length; i += 4) {
      unique.add(packRgb(srcData[i], srcData[i + 1], srcData[i + 2]));
    }

    const colorPool: d3color.RGBColor[] = [];
    for (let i = 0; i < pool.length; i++) {
      const { r, g, b } = unpackRgb(pool[i]);
      colorPool.push(d3color.rgb(r, g, b));
    }

    const triples = numOutputs * 3;
    const lookup = new Map<RgbU32, Uint8Array>();
    for (const key of unique) {
      const { r, g, b } = unpackRgb(key);
      const { color, opacities } = colorSeparation(
        d3color.rgb(r, g, b),
        colorPool,
        { increments },
      );
      const { r: pr, g: pg, b: pb } = color.rgb();
      const bytes = new Uint8Array(triples);
      bytes[0] = pr;
      bytes[1] = pg;
      bytes[2] = pb;
      for (let j = 0; j < numChannels; j++) {
        const v = Math.round((1 - opacities[j]) * 255);
        const base = 3 + j * 3;
        bytes[base] = v;
        bytes[base + 1] = v;
        bytes[base + 2] = v;
      }
      lookup.set(key, bytes);
    }

    const outCanvases: OffscreenCanvas[] = [];
    const outCtxs: OffscreenCanvasRenderingContext2D[] = [];
    const outDatas: ImageData[] = [];
    for (let j = 0; j < numOutputs; j++) {
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext("2d")!;
      outCanvases.push(canvas);
      outCtxs.push(ctx);
      outDatas.push(ctx.createImageData(width, height, { colorSpace: "srgb" }));
    }

    for (let i = 0; i < srcData.length; i += 4) {
      const key = packRgb(srcData[i], srcData[i + 1], srcData[i + 2]);
      const alpha = srcData[i + 3];
      const bytes = lookup.get(key)!;
      for (let j = 0; j < numOutputs; j++) {
        const out = outDatas[j].data;
        const base = j * 3;
        out[i] = bytes[base];
        out[i + 1] = bytes[base + 1];
        out[i + 2] = bytes[base + 2];
        out[i + 3] = alpha;
      }
    }

    for (let j = 0; j < numOutputs; j++) {
      outCtxs[j].putImageData(outDatas[j], 0, 0);
    }
    const blobs = await Promise.all(
      outCanvases.map((canvas) => canvas.convertToBlob({ type: outputType })),
    );

    const result: RasterResult = {
      typ: "success",
      preview: blobs[0],
      separations: blobs.slice(1),
    };
    postMessage(result);
  } catch (ex) {
    const err = ex instanceof Error ? ex.toString() : "unknown error";
    const result: RasterResult = { typ: "err", err };
    postMessage(result);
  }
}
