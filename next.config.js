export default {
  webpack: (config) => {
    config.resolve.fallback = { fs: false, child_process: false };
    return config;
  },
  reactStrictMode: true,
  assetPrefix:
    process.env.NODE_ENV === "production" ? "/color-separation" : undefined,
  output: "export",
  images: {
    unoptimized: true,
  },
};
