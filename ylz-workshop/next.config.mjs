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
};

export default nextConfig;
