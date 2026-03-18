/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img1.wsimg.com',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdf-lib'],
  },
  webpack: (config) => {
    config.externals.push('pdf-lib', 'pdf-parse')
    return config
  },
};

export default nextConfig;
