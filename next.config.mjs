import createMDX from "@next/mdx";
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["js", "jsx", "mdx", "ts", "tsx"],
  // Moved from experimental.serverComponentsExternalPackages (deprecated in Next.js 14.2+)
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    instrumentationHook: true,
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

const mdxConfig = withMDX(nextConfig);

export default withSentryConfig(mdxConfig, {
  // Sentry organisation + project from your Sentry dashboard
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps only in CI / production builds
  silent: !process.env.CI,

  // Automatically tree-shake Sentry logger statements in production
  disableLogger: true,

  // Tunnel Sentry requests through the app to avoid ad-blockers
  tunnelRoute: "/monitoring-tunnel",

  // Upload source maps and delete local copies after upload
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Hide Sentry-generated routes from the Next.js router
  hideSourceMaps: true,

  // Automatically instrument React components for performance profiling
  reactComponentAnnotation: {
    enabled: true,
  },
});
