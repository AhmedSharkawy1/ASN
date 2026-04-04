/* ═══════════════════════════════════════════════════════════════════
 *  ASN POS Desktop — Build Script
 *  Copies the Next.js standalone output into the Electron app directory.
 *  Run this after `npm run build` in the parent Next.js project.
 * 
 *  Important: Next.js standalone output does NOT include:
 *    - .next/static (CSS, JS chunks)
 *    - public/ (static assets like logo, favicon, etc.)
 *  These must be copied separately into the standalone output.
 * ═══════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const STANDALONE = path.join(ROOT, '.next', 'standalone');
const STATIC = path.join(ROOT, '.next', 'static');
const PUBLIC = path.join(ROOT, 'public');
const TARGET = path.join(__dirname, 'app');

function copyRecursive(src, dest) {
    if (!fs.existsSync(src)) {
        console.warn(`  [WARN] Source not found: ${src}`);
        return;
    }

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        const children = fs.readdirSync(src);
        for (const child of children) {
            if (child === '.git') continue;
            copyRecursive(path.join(src, child), path.join(dest, child));
        }
    } else {
        const dir = path.dirname(dest);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

function cleanDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(dir, { recursive: true });
}

async function main() {
    console.log('═══════════════════════════════════════');
    console.log('  ASN POS Desktop — Build Copy Script');
    console.log('═══════════════════════════════════════');

    // 1. Check that standalone output exists
    if (!fs.existsSync(STANDALONE)) {
        console.error(`\n[ERROR] Next.js standalone output not found at:\n  ${STANDALONE}`);
        console.error('\nRun "npm run build" in the parent directory first.');
        process.exit(1);
    }

    // 2. Clean target directory
    console.log('\n[1/4] Cleaning target directory...');
    cleanDir(TARGET);

    // 3. Copy ENTIRE standalone output (includes .next/ with server build, node_modules, server.js)
    console.log('[2/4] Copying Next.js standalone output (server + .next build)...');
    copyRecursive(STANDALONE, TARGET);

    // Verify the server-side build was copied
    if (!fs.existsSync(path.join(TARGET, '.next', 'BUILD_ID'))) {
        console.error('[ERROR] BUILD_ID not found in copied .next/ directory!');
        console.error('The standalone output may be incomplete.');
        process.exit(1);
    }
    console.log('  [✓] Server build (.next/server, BUILD_ID, manifests) copied');

    // 4. Copy .next/static (these are NOT included in standalone output)
    console.log('[3/4] Copying .next/static assets (CSS, JS chunks)...');
    const staticDest = path.join(TARGET, '.next', 'static');
    if (!fs.existsSync(staticDest)) fs.mkdirSync(staticDest, { recursive: true });
    copyRecursive(STATIC, staticDest);
    console.log('  [✓] Static assets copied');

    // 5. Copy public directory (also NOT included in standalone output)
    console.log('[4/4] Copying public directory...');
    const publicDest = path.join(TARGET, 'public');
    if (!fs.existsSync(publicDest)) fs.mkdirSync(publicDest, { recursive: true });
    copyRecursive(PUBLIC, publicDest);
    console.log('  [✓] Public directory copied');

    // 6. Copy .env to the app directory
    const envSrc = path.join(__dirname, '.env');
    const envDest = path.join(TARGET, '.env');
    if (fs.existsSync(envSrc)) {
        fs.copyFileSync(envSrc, envDest);
        console.log('  [✓] .env copied');
    }

    // 7. Fix app/package.json for electron-builder compatibility
    console.log('[5/6] Fixing app/package.json...');
    const appPkgPath = path.join(TARGET, 'package.json');
    if (fs.existsSync(appPkgPath)) {
        const appPkg = JSON.parse(fs.readFileSync(appPkgPath, 'utf-8'));
        appPkg.name = 'asn-pos-server';
        appPkg.description = 'ASN POS Desktop - Next.js Standalone Server';
        appPkg.version = '1.0.0';
        appPkg.author = 'ASN Technology';
        fs.writeFileSync(appPkgPath, JSON.stringify(appPkg, null, 2));
        console.log('  [✓] app/package.json fixed');
    }

    // 8. Copy sharp module to app/node_modules (required for image optimization)
    console.log('[6/6] Copying sharp module...');
    const sharpSrc = path.join(__dirname, 'node_modules', 'sharp');
    const sharpDest = path.join(TARGET, 'node_modules', 'sharp');
    if (fs.existsSync(sharpSrc)) {
        copyRecursive(sharpSrc, sharpDest);
        // Also copy @img (sharp's native bindings)
        const imgSrc = path.join(__dirname, 'node_modules', '@img');
        const imgDest = path.join(TARGET, 'node_modules', '@img');
        if (fs.existsSync(imgSrc)) {
            copyRecursive(imgSrc, imgDest);
        }
        // Also copy color, detect-libc, semver if needed
        for (const dep of ['color', 'color-convert', 'color-string', 'color-name', 'detect-libc', 'semver', 'is-arrayish', 'simple-swizzle']) {
            const depSrc = path.join(__dirname, 'node_modules', dep);
            const depDest = path.join(TARGET, 'node_modules', dep);
            if (fs.existsSync(depSrc) && !fs.existsSync(depDest)) {
                copyRecursive(depSrc, depDest);
            }
        }
        console.log('  [✓] Sharp module copied');
    } else {
        console.warn('  [WARN] Sharp not found in pos-discktop/node_modules. Run "npm install sharp" first.');
    }

    // Verification
    const checks = [
        { path: path.join(TARGET, 'server.js'), label: 'server.js' },
        { path: path.join(TARGET, '.next', 'BUILD_ID'), label: '.next/BUILD_ID' },
        { path: path.join(TARGET, '.next', 'server'), label: '.next/server/' },
        { path: path.join(TARGET, '.next', 'static'), label: '.next/static/' },
        { path: path.join(TARGET, 'public'), label: 'public/' },
        { path: path.join(TARGET, 'node_modules', 'next'), label: 'node_modules/next' },
        { path: path.join(TARGET, 'node_modules', 'sharp'), label: 'node_modules/sharp' },
    ];

    console.log('\n── Verification ──');
    let allOk = true;
    for (const check of checks) {
        const exists = fs.existsSync(check.path);
        console.log(`  ${exists ? '✓' : '✗'} ${check.label}`);
        if (!exists) allOk = false;
    }

    if (!allOk) {
        console.error('\n[ERROR] Some required files are missing!');
        process.exit(1);
    }

    console.log(`\n✅ Build copy complete!`);
    console.log('   Run "npm run dev" to test or "npm run build:win" to package.');
}

main().catch(err => {
    console.error('Build script failed:', err);
    process.exit(1);
});
