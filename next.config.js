/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
 outputFileTracingExcludes: {
    '**/*': [
      '.model_cache/**/*',
      'node_modules/@huggingface/transformers/dist/**/*.onnx',
      'node_modules/@huggingface/transformers/dist/**/*.bin',
      'node_modules/onnxruntime-node/**/*', // This can be large
      'node_modules/@xenova/transformers/**/*.onnx', // If still present
    ]
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
