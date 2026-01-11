/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'standalone' - it's not compatible with middleware on Edge Runtime
  // Middleware runs on Edge Runtime, which doesn't support standalone output
  
  // Enable TypeScript
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // Environment variables that should be available to the browser
  env: {
    // Add any public env vars here if needed
  },
};

module.exports = nextConfig;
