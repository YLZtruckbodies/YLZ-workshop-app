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
    serverComponentsExternalPackages: ['pdf-parse', 'pdfkit'],
  },
  webpack: (config) => {
    config.externals.push('pdf-parse', 'pdfkit')
    return config
  },
};

export default nextConfig;
