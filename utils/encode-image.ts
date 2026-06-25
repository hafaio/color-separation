/** we load the wasm manually so the bundler knows where to include it */
import encodeJpeg, { init as initJpeg } from "@jsquash/jpeg/encode.js";
import initOxipng, {
  optimise_raw as optimisePngRaw,
} from "@jsquash/oxipng/codec/pkg/squoosh_oxipng.js";

function assetUrl(wasm: URL): string {
  return new URL(wasm.href, self.location.origin).href;
}

const mozjpegWasm = new URL(
  "../node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm",
  import.meta.url,
);
let jpegReady: Promise<void> | undefined;
function ensureJpeg(): Promise<void> {
  jpegReady ??= initJpeg({ locateFile: () => assetUrl(mozjpegWasm) });
  return jpegReady;
}

const oxipngWasm = new URL(
  "../node_modules/@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm",
  import.meta.url,
);
let oxipngReady: Promise<unknown> | undefined;
function ensureOxipng(): Promise<unknown> {
  oxipngReady ??= initOxipng(assetUrl(oxipngWasm));
  return oxipngReady;
}

/**
 * Encode pixels to a blob of `type`. With `grayscale` and a type that has a
 * grayscale colour space — PNG (oxipng reduction) or JPEG (mozjpeg) — the
 * single-channel encoder is used: identical output, far smaller. WebP and the
 * toggle-off path use the canvas encoder, unchanged.
 */
export async function encodeImage(
  image: ImageData,
  type: string,
  grayscale: boolean,
): Promise<Blob> {
  if (grayscale && type === "image/png") {
    await ensureOxipng();
    const png = optimisePngRaw(
      image.data,
      image.width,
      image.height,
      2, // default optimization level
      false,
      false,
    );
    return new Blob([png as Uint8Array<ArrayBuffer>], { type });
  } else if (grayscale && type === "image/jpeg") {
    await ensureJpeg();
    const jpeg = await encodeJpeg(image, {
      color_space: 1, // greyscale
      quality: 92, // browser default we use on other path
    });
    return new Blob([jpeg], { type });
  } else {
    const canvas = new OffscreenCanvas(image.width, image.height);
    canvas.getContext("2d")!.putImageData(image, 0, 0);
    return canvas.convertToBlob({ type });
  }
}
