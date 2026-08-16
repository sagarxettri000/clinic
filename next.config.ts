import type { NextConfig } from "next";
import * as helmet from "helmet";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
  // Security headers via Helmet
  helmet: {
    referrerPolicy: {
      policy: 'origin-when-cross-origin',
    },
    contentSecurityPolicy: false,
  },
};

export default nextConfig;