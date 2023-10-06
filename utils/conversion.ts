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

export async function resizeBlob(
  inp: Blob,
  clientWidth: number,
  clientHeight: number,
): Promise<Blob> {
  if (inp.type === "image/svg+xml") {
    return inp; // don't resize svgs
  }
  const bmp = await createImageBitmap(inp);
  if (bmp.width <= clientWidth && bmp.height <= clientHeight) {
    return inp; // small enough
  }
  const wh = bmp.width * clientHeight;
  const hw = bmp.height * clientWidth;
  const [width, height] =
    wh > hw ? [clientWidth, hw / bmp.width] : [wh / bmp.height, clientHeight];
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bmp, 0, 0, width, height);
  return await canvas.convertToBlob();
}
