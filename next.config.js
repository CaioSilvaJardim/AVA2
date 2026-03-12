/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['puppeteer-core', 'redis'],
};

module.exports = nextConfig;
