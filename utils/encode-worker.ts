import { encodeImage } from "./encode-image";
import type { EncodeRequest, EncodeResponse } from "./winterface";

addEventListener("message", (event: MessageEvent<EncodeRequest>) => {
  void run(event.data);
});

async function run({
  id,
  data,
  width,
  height,
  type,
  grayscale,
}: EncodeRequest): Promise<void> {
  try {
    // The transferred buffer is a plain ArrayBuffer; TS widens it to ArrayBufferLike.
    const image = new ImageData(
      data as Uint8ClampedArray<ArrayBuffer>,
      width,
      height,
    );
    const blob = await encodeImage(image, type, grayscale);
    const response: EncodeResponse = { id, blob };
    postMessage(response);
  } catch (ex) {
    const error = ex instanceof Error ? ex.message : "encode failed";
    const response: EncodeResponse = { id, error };
    postMessage(response);
  }
}
