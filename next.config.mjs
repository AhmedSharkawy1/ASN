/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
    images: {
        unoptimized: false,
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 31536000,
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
                port: '',
                pathname: '/**',
            },
            {
                protocol: 'https',
                hostname: '*.supabase.co',
                port: '',
                pathname: '/storage/**',
            },
            {
                protocol: 'https',
                hostname: 'dphylskqazuytvibiysn.supabase.co',
                port: '',
                pathname: '/storage/**',
            },
        ],
    },
};

export default nextConfig;
