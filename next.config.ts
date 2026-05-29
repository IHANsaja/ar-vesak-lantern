import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack is the default bundler in Next.js 16.
  // mind-ar's bundled JS has a `require('fs')` call guarded by an IS_NODE
  // check that never runs in the browser, but Turbopack still tries to
  // resolve it statically. Aliasing it to false stubs it out.
  turbopack: {
    resolveAlias: {
      fs: { browser: "./empty.js" },
    },
  },
};

export default nextConfig;

