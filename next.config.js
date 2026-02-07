export default {
  reactStrictMode: true,
  assetPrefix:
    process.env.NODE_ENV === "production" ? "/color-separation" : undefined,
  output: "export",
  images: {
    unoptimized: true,
  },
};
