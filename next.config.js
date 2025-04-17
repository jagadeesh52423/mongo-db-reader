/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@mui/material',
    '@mui/icons-material',
    '@emotion/react',
    '@emotion/styled',
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/lang-javascript',
    '@codemirror/lang-json',
    '@codemirror/theme-one-dark',
    '@codemirror/commands',
    'react-json-tree'
  ],
  // Configure proxy for API calls to backend server
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
}

module.exports = nextConfig;
