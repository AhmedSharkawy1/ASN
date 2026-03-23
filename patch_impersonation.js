const fs = require('fs');
const path = require('path');

const files = [
    'src/app/dashboard/page.tsx',
    'src/app/dashboard/menu/page.tsx',
    'src/app/dashboard/branches/page.tsx',
    'src/app/dashboard/settings/page.tsx',
    'src/app/dashboard/theme/page.tsx',
    'src/app/dashboard/staff/page.tsx',
];

for (const relPath of files) {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');

    // Pattern 1: eq('email', user.email)
    content = content.replace(
        /let\s+\{\s*data\s*:\s*restaurant\s*\}\s*=\s*await\s*supabase\s*\n?\s*\.from\('restaurants'\)\.select\('id'\)\.eq\('email',\s*user\.email\)\.single\(\);/g,
        `const impersonatingTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;\n                let { data: restaurant } = await supabase.from('restaurants').select('id').eq(impersonatingTenant ? 'id' : 'email', impersonatingTenant || user.email).single();`
    );

    // Pattern 2: eq('email', session.user.email)
    content = content.replace(
        /const\s+\{\s*data\s*:\s*rest\s*\}\s*=\s*await\s*supabase\.from\('restaurants'\)\.select\('id'\)\.eq\('email',\s*session\.user\.email\)\.single\(\);/g,
        `const impTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;\n                const { data: rest } = await supabase.from('restaurants').select('id').eq(impTenant ? 'id' : 'email', impTenant || session.user.email).single();`
    );

    // Pattern 3: dashboard/page.tsx specific
    content = content.replace(
        /const\s+\{\s*data\s*:\s*restaurant\s*\}\s*=\s*await\s*supabase\s*\n\s*\.from\('restaurants'\)\s*\n\s*\.select\('id,\s*name'\)\s*\n\s*\.eq\('email',\s*user\.email\)\s*\n\s*\.single\(\);/g,
        `const impTenant = typeof window !== "undefined" ? sessionStorage.getItem('impersonating_tenant') : null;\n            const { data: restaurant } = await supabase.from('restaurants').select('id, name').eq(impTenant ? 'id' : 'email', impTenant || user.email).single();`
    );

    // Pattern 4: dashboard/settings/page.tsx and theme
    content = content.replace(
        /\.eq\('email',\s*user\.email\)/g,
        `.eq(typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? 'id' : 'email', typeof window !== "undefined" && sessionStorage.getItem('impersonating_tenant') ? sessionStorage.getItem('impersonating_tenant') : user.email)`
    );

    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Patched ${relPath}`);
}
