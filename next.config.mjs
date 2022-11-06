export const experimental = {
  forceSwcTransforms: true,
};
export const webpack = (config) => {
  config.resolve.fallback = { fs: false, child_process: false };
  return config;
};
