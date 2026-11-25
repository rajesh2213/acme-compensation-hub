import type { NextConfig } from "next";
import { resolveApiProxyTarget } from "./lib/api-proxy-target";

const apiProxyTarget = resolveApiProxyTarget(process.env.API_PROXY_TARGET);

/** Disable Vercel CDN caching of proxied API/health responses (auth + cookies). */
const noStoreApiHeaders = [
  { key: "x-vercel-enable-rewrite-caching", value: "0" },
  {
    key: "Cache-Control",
    value: "private, no-store, max-age=0, must-revalidate",
  },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/api/:path*", headers: noStoreApiHeaders },
      { source: "/health", headers: noStoreApiHeaders },
      { source: "/health/ready", headers: noStoreApiHeaders },
    ];
  },
  async rewrites() {
    // External rewrites preserve browser same-origin `/api` while forwarding
    // Cookie / Set-Cookie / Origin / CSRF headers to the Express API.
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
      {
        source: "/health",
        destination: `${apiProxyTarget}/health`,
      },
      {
        source: "/health/ready",
        destination: `${apiProxyTarget}/health/ready`,
      },
    ];
  },
};

export default nextConfig;
