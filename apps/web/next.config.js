/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**.cloudinary.com' },
    ],
  },
  // Disable ESLint during build - it runs separately via lint command
  // This prevents build failures due to ESLint parser resolution issues in monorepos
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
