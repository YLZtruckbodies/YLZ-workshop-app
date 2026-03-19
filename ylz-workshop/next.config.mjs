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
    serverComponentsExternalPackages: ['pdfjs-dist', 'pdfkit', 'fontkit'],
    outputFileTracingIncludes: {
      // Ensure the pdfjs worker file is deployed — it's loaded dynamically so
      // Vercel's file tracer misses it without this explicit include.
      '/api/mrp-tools/laser-pack': [
        './node_modules/pdfjs-dist/legacy/build/pdf.worker.js',
      ],
    },
  },
};

export default nextConfig;
