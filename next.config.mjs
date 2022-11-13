export const experimental = {
  forceSwcTransforms: true,
};
export const webpack = (config) => {
  config.resolve.fallback = { fs: false, child_process: false };
  return config;
};
export const reactStrictMode = true;
export const assetPrefix =
  process.env.NODE_ENV === "production" ? "/color-separation" : "";
