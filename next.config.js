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
    '@xenova/transformers', // Keep this
  ],

  outputFileTracingExcludes: {
    '**/*': [
      '.model_cache/**/*',
      // No need to exclude onnxruntime-node anymore!
    ]
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@xenova/transformers',
      ];
    }
    return config;
  },
};

module.exports = nextConfig;
