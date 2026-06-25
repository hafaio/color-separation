import type { EncodeRequest, EncodeResponse } from "./winterface";

// Which types route to the synchronous wasm codecs (and so must run off the
// main thread). Mirrors the grayscale branches in `encode-image`; WebP and the
// non-grayscale path use the canvas encoder, which is already async/off-thread.
function usesGrayscaleCodec(type: string, grayscale: boolean): boolean {
  return grayscale && (type === "image/png" || type === "image/jpeg");
}

function encodeFallback(image: ImageData, type: string): Promise<Blob> {
  const canvas = new OffscreenCanvas(image.width, image.height);
  canvas.getContext("2d")!.putImageData(image, 0, 0);
  return canvas.convertToBlob({ type });
}

let worker: Worker | undefined;
let nextId = 0;
const pending = new Map<
  number,
  { resolve: (blob: Blob) => void; reject: (err: Error) => void }
>();

function encodeWorker(): Worker {
  if (!worker) {
    const created = new Worker(new URL("./encode-worker.ts", import.meta.url));
    created.addEventListener(
      "message",
      (event: MessageEvent<EncodeResponse>) => {
        const { id, blob, error } = event.data;
        const entry = pending.get(id);
        if (!entry) return;
        pending.delete(id);
        if (blob) entry.resolve(blob);
        else entry.reject(new Error(error ?? "encode failed"));
      },
    );
    worker = created;
  }
  return worker;
}

/**
 * Main-thread entry for the SVG export path. The grayscale wasm encoders are
 * synchronous, so route them to a worker to keep the UI responsive; the canvas
 * fallback already runs off-thread, so do it inline.
 */
export function encodeImageOffMainThread(
  image: ImageData,
  type: string,
  grayscale: boolean,
): Promise<Blob> {
  if (!usesGrayscaleCodec(type, grayscale)) {
    return encodeFallback(image, type);
  }
  const instance = encodeWorker();
  const id = nextId++;
  return new Promise<Blob>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    const request: EncodeRequest = {
      id,
      data: image.data,
      width: image.width,
      height: image.height,
      type,
      grayscale,
    };
    // Transfer the pixel buffer so postMessage doesn't copy it on the main thread.
    instance.postMessage(request, [image.data.buffer as ArrayBuffer]);
  });
}
