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
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'http://localhost:8000/api/:path*',
        },
      ],
    }
  },
}

export default nextConfig
