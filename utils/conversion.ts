export async function url2blob(url: string): Promise<Blob> {
  const resp = await fetch(url);
  return await resp.blob();
}

export function blob2url(blob: Blob): Promise<string> {
  const reader = new FileReader();
  return new Promise<string>((resolve) => {
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.readAsDataURL(blob);
  });
}

export async function blob2imgdata(blob: Blob): Promise<ImageData> {
  const bmp = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0);
  return ctx.getImageData(0, 0, bmp.width, bmp.height, {
    colorSpace: "srgb",
  });
}

export async function imgdata2blob(img: ImageData): Promise<Blob> {
  const bmp = await createImageBitmap(img);
  const canvas = new OffscreenCanvas(bmp.width, bmp.height);
  canvas.getContext("bitmaprenderer")!.transferFromImageBitmap(bmp);
  return await canvas.convertToBlob();
}
