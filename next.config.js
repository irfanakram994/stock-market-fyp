/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    reactStrictMode: true,
    // Point Next.js to the correct app directory
    experimental: {
        serverActions: {
            bodySizeLimit: '2mb',
        },
    },
    // Configure webpack to resolve paths correctly
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': __dirname,
        };
        return config;
    },
};

module.exports = nextConfig;
