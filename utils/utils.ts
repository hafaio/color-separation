export function copyImageData(img: ImageData): ImageData {
  const { data, width, height, colorSpace } = img;
  return new ImageData(data.slice(), width, height, { colorSpace });
}
