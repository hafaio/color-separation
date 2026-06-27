import { encodeGreyscale } from "./encode-image";
import { type EncodePayload, serve } from "./worker-rpc";

serve<EncodePayload, Blob>(async ({ data, width, height, type }) => {
  // The transferred buffer is a plain ArrayBuffer; TS widens it to ArrayBufferLike.
  const image = new ImageData(
    data as Uint8ClampedArray<ArrayBuffer>,
    width,
    height,
  );
  return encodeGreyscale(image, type);
});
