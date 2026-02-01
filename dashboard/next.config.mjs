/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@atlashub/shared'],
  output: 'standalone',
};

export default nextConfig;
