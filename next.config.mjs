/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
    images: {
        unoptimized: true,
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
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
};

export default nextConfig;
