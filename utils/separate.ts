import type { ColorSpaceObject } from "d3-color";
import * as d3color from "d3-color";
import { bulkColorSeparation } from "./bulksep";
import { packRgb, type RgbU32, unpackRgb } from "./color";
import { blob2url, url2blob } from "./conversion";
import type { MixingMode } from "./sep";
import {
  type RasterMessage,
  type RasterResult,
  type RasterWorkerOut,
  SOLVER_FRACTION,
} from "./winterface";

// 40% of trailing budget for SVG `updateColors` finishing post-bulksep.
const SVG_UPDATE_END = SOLVER_FRACTION + (1 - SOLVER_FRACTION) * 0.4;

/**
 * Run the SVG-path bulk solver, returning the per-color preview update map,
 * the per-color opacities, and the chosen print order. Both `genPreview*`
 * helpers wrap their callers around this — the only differences between
 * them are which maps they consume from each yielded triple.
 */
async function runBulkForSvg(
  blob: Blob,
  pool: readonly RgbU32[],
  renderPool: readonly RgbU32[],
  mixingMode: MixingMode,
  autoOrder: boolean,
  increments: number,
  lambda: number,
  onProgress: ((frac: number) => void) | undefined,
): Promise<{
  update: Map<RgbU32, RgbU32>;
  mapping: Map<RgbU32, number[]>;
  chosenOrder: readonly number[];
}> {
  const update = new Map<RgbU32, RgbU32>();
  const mapping = new Map<RgbU32, number[]>();
  let chosenOrder: readonly number[] = pool.map((_, i) => i);
  // Scale worker (solver) progress to the first SOLVER_FRACTION so the
  // trailing updateColors fills the rest of the bar.
  const wrapped = onProgress
    ? (v: number) => onProgress(v * SOLVER_FRACTION)
    : undefined;
  for await (const [key, color, opac] of bulkColorSeparation(
    extractColors(blob),
    pool,
    renderPool,
    mixingMode,
    autoOrder,
    increments,
    lambda,
    (order) => {
      chosenOrder = order;
    },
    wrapped,
  )) {
    update.set(key, color);
    mapping.set(key, opac);
  }
  return { update, mapping, chosenOrder };
}

const COLOR_PROPS = ["fill", "stroke", "stopColor"] as const;

function isRaster(type: string): boolean {
  return type === "image/png" || type === "image/jpeg" || type === "image/webp";
}

async function rasterPipeline(
  blob: Blob,
  pool: readonly RgbU32[],
  renderPool: readonly RgbU32[],
  mixingMode: MixingMode,
  autoOrder: boolean,
  increments: number,
  lambda: number,
  onProgress?: (frac: number) => void,
): Promise<{
  preview: Blob;
  separations: readonly Blob[];
  chosenOrder: readonly number[];
}> {
  const transPool = new Uint32Array(pool);
  const transRender = new Uint32Array(renderPool);
  const message: RasterMessage = {
    blob,
    pool: transPool,
    renderPool: transRender,
    mixingMode,
    autoOrder,
    increments,
    lambda,
    outputType: blob.type,
  };
  const worker = new Worker(new URL("./raster-worker.ts", import.meta.url));
  const result = await new Promise<RasterResult>((resolve) => {
    worker.addEventListener(
      "message",
      (event: MessageEvent<RasterWorkerOut>) => {
        const msg = event.data;
        if (msg.typ === "progress") {
          onProgress?.(msg.value);
        } else {
          resolve(msg);
          worker.terminate();
        }
      },
    );
    worker.postMessage(message, {
      transfer: [
        transPool.buffer as ArrayBuffer,
        transRender.buffer as ArrayBuffer,
      ],
    });
  });
  if (result.typ === "err") {
    throw new Error(result.err);
  }
  return {
    preview: result.preview,
    separations: result.separations,
    chosenOrder: result.chosenOrder,
  };
}

async function* extractColors(blob: Blob): AsyncIterableIterator<RgbU32> {
  if (isRaster(blob.type)) {
    const bmp = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bmp.width, bmp.height);
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bmp, 0, 0);
    const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height, {
      colorSpace: "srgb",
    });
    for (let i = 0; i < data.length; i += 4) {
      yield packRgb(data[i], data[i + 1], data[i + 2]);
    }
  } else if (blob.type === "image/svg+xml") {
    const text = await blob.text();
    const parser = new DOMParser();
    const svg = parser.parseFromString(text, "image/svg+xml");
    for (const elem of svg.querySelectorAll("*")) {
      if (elem instanceof SVGStyleElement) {
        for (const rule of elem.sheet?.cssRules ?? []) {
          if (rule instanceof CSSStyleRule) {
            for (const prop of COLOR_PROPS) {
              const color = d3color.color(rule.style?.[prop]);
              if (color) {
                const { r, g, b } = color.rgb();
                yield packRgb(r, g, b);
              }
            }
          }
        }
      } else if (elem instanceof SVGImageElement) {
        const href = await url2blob(elem.href.baseVal);
        for await (const color of extractColors(href)) {
          yield color;
        }
      } else if (elem instanceof SVGElement) {
        for (const prop of COLOR_PROPS) {
          const color = d3color.color(elem.style?.[prop]);
          if (color) {
            const { r, g, b } = color.rgb();
            yield packRgb(r, g, b);
          }
        }
      }
    }
  } else {
    throw new Error(`unhandled url type: ${blob.type}`);
  }
}

async function updateColors(
  blob: Blob,
  updaters: readonly ((css: ColorSpaceObject) => ColorSpaceObject)[],
): Promise<readonly Blob[]> {
  if (
    blob.type === "image/png" ||
    blob.type === "image/jpeg" ||
    blob.type === "image/webp"
  ) {
    const bmp = await createImageBitmap(blob);
    const { width, height } = bmp;
    const srcCanvas = new OffscreenCanvas(width, height);
    const srcCtx = srcCanvas.getContext("2d")!;
    srcCtx.drawImage(bmp, 0, 0);
    const srcData = srcCtx.getImageData(0, 0, width, height, {
      colorSpace: "srgb",
    }).data;
    const outCanvases = updaters.map(() => new OffscreenCanvas(width, height));
    const outCtxs = outCanvases.map((canvas) => canvas.getContext("2d")!);
    const outDatas = outCtxs.map((ctx) =>
      ctx.createImageData(width, height, { colorSpace: "srgb" }),
    );
    for (let i = 0; i < srcData.length; i += 4) {
      const src = d3color.rgb(srcData[i], srcData[i + 1], srcData[i + 2]);
      const alpha = srcData[i + 3];
      for (let j = 0; j < updaters.length; j++) {
        const { r, g, b } = updaters[j](src).rgb();
        const out = outDatas[j].data;
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = alpha;
      }
    }
    for (let j = 0; j < outCtxs.length; j++) {
      outCtxs[j].putImageData(outDatas[j], 0, 0);
    }
    return await Promise.all(
      outCanvases.map((canvas) => canvas.convertToBlob({ type: blob.type })),
    );
  } else if (blob.type === "image/svg+xml") {
    const text = await blob.text();
    const parser = new DOMParser();
    // Pre-process embedded images once across all updaters
    const discovery = parser.parseFromString(text, "image/svg+xml");
    const imageElements = [
      ...discovery.querySelectorAll("image"),
    ] as SVGImageElement[];
    const processedImages = await Promise.all(
      imageElements.map(async (elem) => {
        const href = await url2blob(elem.href.baseVal);
        const blobs = await updateColors(href, updaters);
        return await Promise.all(blobs.map(blob2url));
      }),
    );
    const serial = new XMLSerializer();
    return await Promise.all(
      updaters.map(async (update, updaterIdx) => {
        const svg = parser.parseFromString(text, "image/svg+xml");
        let imgIdx = 0;
        for (const elem of svg.querySelectorAll("*")) {
          if (elem instanceof SVGStyleElement) {
            const rules = [...(elem.sheet?.cssRules ?? [])];
            for (const rule of rules) {
              if (rule instanceof CSSStyleRule) {
                for (const prop of COLOR_PROPS) {
                  const init = d3color.color(rule.style?.[prop]);
                  if (init) {
                    rule.style[prop] = update(init).toString();
                  }
                }
              }
            }
            elem.textContent = rules.map((rule) => rule.cssText).join("\n");
          } else if (elem instanceof SVGImageElement) {
            elem.setAttribute("href", processedImages[imgIdx][updaterIdx]);
            imgIdx++;
          } else if (elem instanceof SVGElement) {
            for (const prop of COLOR_PROPS) {
              const init = d3color.color(elem.style[prop]);
              if (init) {
                elem.style[prop] = update(init).toString();
              }
            }
          }
        }
        return new Blob([serial.serializeToString(svg)], {
          type: "image/svg+xml",
        });
      }),
    );
  } else {
    throw new Error(`unhandled url type: ${blob.type}`);
  }
}

function previewUpdater(
  update: ReadonlyMap<RgbU32, RgbU32>,
): (orig: ColorSpaceObject) => ColorSpaceObject {
  return (orig) => {
    const { r: sr, g: sg, b: sb } = orig.rgb();
    const { r, g, b } = unpackRgb(update.get(packRgb(sr, sg, sb))!);
    return d3color.rgb(r, g, b, orig.opacity);
  };
}

function separationUpdaters(
  mapping: ReadonlyMap<RgbU32, number[]>,
  poolSize: number,
): readonly ((orig: ColorSpaceObject) => ColorSpaceObject)[] {
  return Array.from({ length: poolSize }, (_, ind) => {
    return (orig: ColorSpaceObject) => {
      const { r: sr, g: sg, b: sb } = orig.rgb();
      const opacity = mapping.get(packRgb(sr, sg, sb))![ind];
      return d3color.gray((1 - opacity) * 100).copy({ opacity: orig.opacity });
    };
  });
}

export async function genPreview(
  blob: Blob,
  pool: readonly RgbU32[],
  renderPool: readonly RgbU32[],
  mixingMode: MixingMode,
  autoOrder: boolean,
  increments: number,
  lambda: number,
): Promise<Blob> {
  if (isRaster(blob.type)) {
    const { preview } = await rasterPipeline(
      blob,
      pool,
      renderPool,
      mixingMode,
      autoOrder,
      increments,
      lambda,
    );
    return preview;
  }
  const update = new Map<RgbU32, RgbU32>();
  for await (const [key, color] of bulkColorSeparation(
    extractColors(blob),
    pool,
    renderPool,
    mixingMode,
    autoOrder,
    increments,
    lambda,
  )) {
    update.set(key, color);
  }
  const [out] = await updateColors(blob, [previewUpdater(update)]);
  return out;
}

export async function genPreviewAndSeparation(
  blob: Blob,
  pool: readonly RgbU32[],
  renderPool: readonly RgbU32[],
  mixingMode: MixingMode,
  autoOrder: boolean,
  increments: number,
  lambda: number,
  onProgress?: (frac: number) => void,
): Promise<{
  preview: Blob;
  separations: readonly Blob[];
  chosenOrder: readonly number[];
}> {
  if (isRaster(blob.type)) {
    return await rasterPipeline(
      blob,
      pool,
      renderPool,
      mixingMode,
      autoOrder,
      increments,
      lambda,
      onProgress,
    );
  }
  const { update, mapping, chosenOrder } = await runBulkForSvg(
    blob,
    pool,
    renderPool,
    mixingMode,
    autoOrder,
    increments,
    lambda,
    onProgress,
  );
  onProgress?.(SVG_UPDATE_END);
  const updaters = [
    previewUpdater(update),
    ...separationUpdaters(mapping, pool.length),
  ];
  const [preview, ...separations] = await updateColors(blob, updaters);
  onProgress?.(1);
  return { preview, separations, chosenOrder };
}

function tintSeparation(img: HTMLImageElement, color: RgbU32): OffscreenCanvas {
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, width, height);
  const { r: pr, g: pg, b: pb } = unpackRgb(color);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const opacity = (255 - data[i]) / 255;
    data[i] = Math.round(255 * (1 - opacity) + pr * opacity);
    data[i + 1] = Math.round(255 * (1 - opacity) + pg * opacity);
    data[i + 2] = Math.round(255 * (1 - opacity) + pb * opacity);
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

export async function genGrid(
  separations: readonly Blob[],
  colors: readonly RgbU32[],
): Promise<Blob> {
  const urls = separations.map((sep) => URL.createObjectURL(sep));
  try {
    const images = await Promise.all(
      urls.map(
        (url) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`failed to load ${url}`));
            img.src = url;
          }),
      ),
    );
    const cellWidth = Math.max(...images.map((img) => img.naturalWidth));
    const cellHeight = Math.max(...images.map((img) => img.naturalHeight));
    const cols = Math.ceil(Math.sqrt(images.length));
    const rows = Math.ceil(images.length / cols);
    const canvas = new OffscreenCanvas(cols * cellWidth, rows * cellHeight);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const [index, img] of images.entries()) {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cellX = col * cellWidth;
      const cellY = row * cellHeight;
      const dx = cellX + (cellWidth - img.naturalWidth) / 2;
      const dy = cellY + (cellHeight - img.naturalHeight) / 2;
      const tinted = tintSeparation(img, colors[index]);
      ctx.drawImage(tinted, dx, dy);
    }
    return await canvas.convertToBlob({ type: "image/png" });
  } finally {
    for (const url of urls) {
      URL.revokeObjectURL(url);
    }
  }
}

export async function genSeparation(
  blob: Blob,
  pool: readonly RgbU32[],
  mixingMode: MixingMode,
  autoOrder: boolean,
  increments: number,
  lambda: number,
  onProgress?: (frac: number) => void,
): Promise<{
  separations: readonly Blob[];
  chosenOrder: readonly number[];
}> {
  if (isRaster(blob.type)) {
    const { separations, chosenOrder } = await rasterPipeline(
      blob,
      pool,
      pool,
      mixingMode,
      autoOrder,
      increments,
      lambda,
      onProgress,
    );
    return { separations, chosenOrder };
  }
  const { mapping, chosenOrder } = await runBulkForSvg(
    blob,
    pool,
    pool,
    mixingMode,
    autoOrder,
    increments,
    lambda,
    onProgress,
  );
  onProgress?.(SVG_UPDATE_END);
  const separations = await updateColors(
    blob,
    separationUpdaters(mapping, pool.length),
  );
  onProgress?.(1);
  return { separations, chosenOrder };
}
