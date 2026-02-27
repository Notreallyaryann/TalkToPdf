/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
 
  serverExternalPackages: [
    'pdf-parse',
    '@huggingface/transformers',
    '@xenova/transformers',
    'onnxruntime-node', // Keep this
  ],

  outputFileTracingExcludes: {
    '**/*': [
      '.model_cache/**/*',
      'node_modules/onnxruntime-node/bin/**/*', 
      'node_modules/@img/sharp-libvips-linux*/**/*',
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'onnxruntime-node',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
