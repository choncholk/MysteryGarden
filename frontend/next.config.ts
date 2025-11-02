import type { NextConfig } from "next";

// Get basePath from environment variable, default to empty string
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const isExport = process.env.NEXT_EXPORT === "true";

const nextConfig: NextConfig = {
  basePath: basePath,
  output: isExport ? "export" : undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Headers are not supported in static export, but we can set them via meta tags or server config
  // For GitHub Pages, we'll need to add these headers via _document or meta tags if needed
  ...(!isExport && {
    headers() {
      // Required by FHEVM for development/server mode
      return Promise.resolve([
        {
          source: '/',
          headers: [
            {
              key: 'Cross-Origin-Opener-Policy',
              value: 'same-origin',
            },
            {
              key: 'Cross-Origin-Embedder-Policy',
              value: 'require-corp',
            },
          ],
        },
      ]);
    }
  }),
};

export default nextConfig;

