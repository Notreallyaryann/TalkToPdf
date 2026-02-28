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
    '@xenova/transformers',
  ],

 
  experimental: {
    esmExternals: 'loose',  
  },

  outputFileTracingExcludes: {
    '**/*': [
      '.model_cache/**/*',
    ]
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [
        ...(config.externals || []),
        '@xenova/transformers',
      ];

      
      config.module.rules.push({
        test: /\.m?js$/,
        type: 'javascript/auto',
        resolve: {
          fullySpecified: false,
        },
      });
    }
    return config;
  },
};

module.exports = nextConfig;
