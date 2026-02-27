/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // Add @xenova/transformers here
  serverExternalPackages: [
    'pdf-parse',
    '@huggingface/transformers',
    '@xenova/transformers',
    'onnxruntime-node'
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'onnxruntime-node'];
    }
    return config;
  },
};

module.exports = nextConfig;
