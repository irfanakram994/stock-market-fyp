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
    // Increase header size limits to prevent 431 errors
    onDemandEntries: {
        maxInactiveAge: 60 * 60 * 1000,
        pagesBufferLength: 5,
    },
    // Configure server to handle larger headers
    httpAgentOptions: {
        keepAlive: true,
    },
};

module.exports = nextConfig;
