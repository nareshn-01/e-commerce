/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/e-commerce',
  assetPrefix: '/e-commerce/',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
