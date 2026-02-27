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
    'onnxruntime-node',
    'onnxruntime-common',
    'onnxruntime-web',
  ],

  outputFileTracingExcludes: {
    '**/*': [
      '.model_cache/**/*',
      'node_modules/onnxruntime-node/**/*', // More broad exclusion
      'node_modules/onnxruntime-*/**/*',    // Catch all variants
      'node_modules/@img/**/*',             // Exclude all sharp binaries
      'node_modules/**/*.node',              // Exclude all .node binaries
      'node_modules/**/*.wasm',              // Exclude WebAssembly files
    ]
  },
  
  // Add experimental tracing options
  experimental: {
    outputFileTracingExcludes: {
      '**/*': [
        'node_modules/onnxruntime-node/**/*',
        'node_modules/@img/**/*',
      ]
    }
  },

  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        'onnxruntime-node',
        'onnxruntime-common',
        'sharp',
        '@img/sharp-libvips'
      ];
      
      // Add rule to ignore .node files
      config.module.rules.push({
        test: /\.node$/,
        loader: 'ignore-loader',
      });
    }
    return config;
  },
};

module.exports = nextConfig;
