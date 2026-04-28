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
  // Defaults to the local Namaste dev server; override via BACKEND_URL in .env.local.
  env: {
    BACKEND_URL: process.env.BACKEND_URL ?? "https://127.0.0.1:3001",
  },
};

export default nextConfig;
