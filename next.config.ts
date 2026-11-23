import { fileURLToPath } from 'node:url';
import type { NextConfig } from 'next';

const vercel = process.env.WORKSPACE_TARGET === 'vercel' || process.env.VERCEL === '1';

const nextConfig: NextConfig = vercel ? {
  env: { WORKSPACE_TARGET: 'vercel' },
  webpack(config, { webpack, isServer }) {
    if (isServer) {
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /^cloudflare:workers$/,
        fileURLToPath(new URL('./lib/platform/vercel-bindings.ts', import.meta.url)),
      ));
    }
    return config;
  },
  async rewrites() {
    return [
      { source: '/signin-with-chatgpt', destination: '/auth/workspace?action=signin' },
      { source: '/signout-with-chatgpt', destination: '/auth/workspace?action=signout' },
    ];
  },
} : {};

export default nextConfig;
