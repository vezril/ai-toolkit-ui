import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // The repo root has its own package-lock.json; pin tracing to this app
  // so Next.js doesn't warn about multiple lockfiles.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
