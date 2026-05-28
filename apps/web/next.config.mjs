import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Monorepo: tell Next where to root the file-tracing so the standalone
  // output bundles all workspace deps correctly.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Transpile workspace packages that ship raw TS sources.
  transpilePackages: ["@vidgen/sdk-ts", "@vidgen/config"],
  reactStrictMode: true,
  poweredByHeader: false,
  // Disable image optimisation; we're not serving images from this app yet.
  images: { unoptimized: true },
  webpack: (config) => {
    // Workspace packages (@vidgen/config, @vidgen/sdk-ts) use NodeNext
    // ESM-style `.js` imports inside `.ts` sources. Webpack needs to be
    // told to resolve `.js` → the actual `.ts` on disk, matching tsc.
    config.resolve = config.resolve ?? {};
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};

export default nextConfig;
