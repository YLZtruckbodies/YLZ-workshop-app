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
  webpack: (config, { isServer }) => {
    if (isServer) {
      const existing = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)
      config.externals = [...existing, 'pdf-lib', 'pdf-parse']
    }
    return config
  },
};

export default nextConfig;
