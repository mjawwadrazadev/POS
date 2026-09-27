/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Business-type pages moved from /industries to /solutions
  async redirects() {
    return [
      { source: "/industries", destination: "/solutions", permanent: true },
      { source: "/industries/:slug", destination: "/solutions/:slug", permanent: true },
    ];
  },
};

module.exports = nextConfig;
