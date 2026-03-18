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
  // Keep pdf-parse and pdfkit out of the webpack bundle — load from node_modules at runtime.
  // Must use the static-import form in route files for Next.js to honour this at build time.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfkit', 'fontkit'],
  },
};

export default nextConfig;
