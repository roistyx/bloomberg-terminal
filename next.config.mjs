/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Expose backend URL to server-side route handlers.
  // Defaults to the local Express backend; override via BACKEND_URL in .env.local.
  env: {
    BACKEND_URL: process.env.BACKEND_URL ?? "http://localhost:3001",
  },
};

export default nextConfig;
