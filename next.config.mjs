/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
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
  // Ensure the pdfjs worker file is deployed to Vercel — it's loaded
  // dynamically so the file tracer misses it without this explicit include.
  outputFileTracingIncludes: {
    '/api/mrp-tools/laser-pack': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.js',
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['pdfjs-dist', 'pdfkit', 'fontkit', 'sharp'],
  },
};

export default nextConfig;
