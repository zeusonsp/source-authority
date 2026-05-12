/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@source-authority/config"],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
