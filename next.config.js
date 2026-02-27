/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
 
  
  serverExternalPackages: [
    '@huggingface/transformers',
    '@xenova/transformers',
    'onnxruntime-node',
    'pdf-parse',
  ],

  outputFileTracingExcludes: {
    '**/*': [
      '.model_cache/**/*',
      'node_modules/@huggingface/transformers/dist/**/*',
      'node_modules/onnxruntime-node/bin/**/*',
    ]
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      
      config.externals = [
        ...(config.externals || []),
        '@huggingface/transformers',
        'onnxruntime-node',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
