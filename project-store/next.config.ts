import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // This app lives in a sub-folder of a repo that has another app; trace files from this folder only.
  outputFileTracingRoot: path.resolve(process.cwd()),
  // The built-in local database (used when DATABASE_URL is empty) loads its own WebAssembly files.
  serverExternalPackages: ["@electric-sql/pglite"],
  // Share images (opengraph-image.tsx) read their font from disk at run time, so it must ship with them.
  outputFileTracingIncludes: { "/**/opengraph-image*": ["./assets/fonts/*"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
