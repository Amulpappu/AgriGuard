/** @type {import('next').NextConfig} */
const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_API_URL;

const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://todwosflbwzuizvedouy.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvZHdvc2ZsYnd6dWl6dmVkb3V5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMjYxNjUsImV4cCI6MjEwNjcwMjE2NX0.fDqNi4bHJo9DCByVmZyX_GbKtyvJzQdD_bttu057UKY",
  },
  async rewrites() {
    if (!backendUrl) {
      return [];
    }
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "**",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

module.exports = nextConfig;
