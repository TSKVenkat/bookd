/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Handle Konva to prevent SSR issues
    if (isServer) {
      // Mark Konva as external dependency when server-side rendering
      config.externals = [...config.externals, 'konva', 'react-konva'];
    }

    return config;
  },
}

module.exports = nextConfig 