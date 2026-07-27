/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    eslint: { ignoreDuringBuilds: true },
    images: {
        // Deliberate: Next's optimizer would re-fetch and re-encode every image
        // on the origin, which is exactly the Supabase egress the thumbnail_url
        // column exists to avoid. Menus serve the pre-made 400px variant instead.
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
