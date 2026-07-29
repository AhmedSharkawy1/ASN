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
        // sharp is a native module: it resolves its platform binary
        // (@img/sharp-linux-x64 and the matching libvips) at runtime, by a path
        // webpack cannot see. Bundling it therefore produces a build that
        // throws `Could not load the "sharp" module using the linux-x64
        // runtime` on a Linux host — which is exactly what the upload route was
        // reporting, and why thumbnails were silently stored unresized.
        serverComponentsExternalPackages: ['sharp'],

        // Leaving it unbundled is only half of it: with output: 'standalone'
        // the file tracer copies just the files it can statically see, and it
        // cannot see a runtime-resolved .node binary either. These have to be
        // named explicitly or the module is missing from the deployed output.
        outputFileTracingIncludes: {
            '/api/upload-image': [
                './node_modules/sharp/**/*',
                './node_modules/@img/**/*',
            ],
        },
    },
};

export default nextConfig;
