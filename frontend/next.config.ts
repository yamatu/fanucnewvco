import path from 'node:path';
import type { NextConfig } from "next";

const configuredBuildWorkerCount = Number.parseInt(process.env.NEXT_BUILD_WORKER_COUNT || '', 10);
const buildWorkerCount =
  Number.isFinite(configuredBuildWorkerCount) && configuredBuildWorkerCount > 0
    ? configuredBuildWorkerCount
    : undefined;

type PolyfillAsset = {
  name: string;
  info: Record<PropertyKey, unknown>;
};

type PolyfillCompilation = {
  hooks: {
    processAssets: {
      tap(options: { name: string; stage: number }, callback: () => void): void;
    };
  };
  getAssets(): PolyfillAsset[];
};

type PolyfillCompiler = {
  webpack: { Compilation: { PROCESS_ASSETS_STAGE_ADDITIONS: number } };
  hooks: {
    thisCompilation: {
      tap(name: string, callback: (compilation: PolyfillCompilation) => void): void;
    };
  };
};

const excludeLegacyPolyfillFromManifestPlugin = {
  apply(compiler: PolyfillCompiler) {
    compiler.hooks.thisCompilation.tap('ExcludeLegacyPolyfillFromManifest', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'ExcludeLegacyPolyfillFromManifest',
          stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        () => {
          for (const asset of compilation.getAssets()) {
            if (!/^static\/chunks\/polyfills(?:-|\.)/.test(asset.name)) continue;
            for (const marker of Object.getOwnPropertySymbols(asset.info)) {
              delete asset.info[marker];
            }
          }
        },
      );
    });
  },
};

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  generateEtags: true,

  ...(buildWorkerCount
    ? {
        experimental: {
          cpus: buildWorkerCount,
        },
      }
    : {}),

  // Silence workspace root inference warning when monorepo-like structure exists
  outputFileTracingRoot: path.join(__dirname, '..'),

  // 确保环境变量正确注入
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      config.plugins?.push(excludeLegacyPolyfillFromManifestPlugin);
    }
    return config;
  },

  // API 重写配置，开发环境代理到后端
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

    return {
      beforeFiles: [
        {
          source: '/:indexnowKey([A-Za-z0-9_-]{8,128}).txt',
          destination: '/api/indexnow-key?key=:indexnowKey',
        },
      ],
      afterFiles: [
        // Serve /sitemap-products/:page.xml from an internal route without the ".xml" segment.
        // This avoids Next route segment edge cases and keeps the public URL stable.
        {
          source: '/sitemap-products/:page.xml',
          destination: '/sitemap-products/:page',
        },
        // When you run without an external Nginx (directly hitting Next on :3000),
        // proxy /uploads/* to the backend so uploaded images keep working.
        {
          source: '/uploads/:path*',
          destination: `${apiBase}/uploads/:path*`,
        },
        {
          source: '/api/:path*',
          destination: `${apiBase}/api/:path*`,
        },
      ],
    };
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  async headers() {
    return [
      {
        source: '/_next/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/:indexnowKey([A-Za-z0-9_-]{8,128}).txt',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // SEO-friendly caching for static assets
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // No cache for product pages to ensure fresh data for crawlers
      {
        source: '/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // No cache for sitemaps to ensure fresh data
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/sitemap-static.xml',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/sitemap-categories.xml',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/sitemap-products-index.xml',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/sitemap-products/:page.xml',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      {
        source: '/sitemap-news.xml',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
      // Short cache for main pages
      {
        source: '/((?!api|_next|products|sitemap).*)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=300, s-maxage=300, stale-while-revalidate=86400' },
        ],
      },
    ];
  },

  images: {
    minimumCacheTTL: 604800,
    remotePatterns: [
      { protocol: 'https', hostname: 's2.loli.net' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: '127.0.0.1' },
      { protocol: 'http', hostname: 'dz.yamatu.xyz' },
      { protocol: 'https', hostname: 'dz.yamatu.xyz' },
    ],
  },
};

export default nextConfig;
