const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, 'src', 'components', 'menu');
const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.tsx') && f !== 'CheckoutModal.tsx' && f !== 'SharedMarquee.tsx');

let finalOutput = "=== THEME ANALYSIS ===\n";

for (const file of themeFiles) {
    const content = fs.readFileSync(path.join(themesDir, file), 'utf-8');

    const missing = [];
    if (!content.includes('tel:')) missing.push('Phone (tel:)');
    if (!content.includes('wa.me')) missing.push('WhatsApp (wa.me)');
    if (!(content.includes('map_link') && (content.includes('MapPin') || content.includes('📍')))) missing.push('Location (MapPin)');
    if (!(content.includes('facebook_url') || content.includes('FaFacebook'))) missing.push('Facebook');
    if (!(content.includes('instagram_url') || content.includes('FaInstagram'))) missing.push('Instagram');

    // Check if prices component has conditional "orders_enabled" rendering fallback
    const handlesPricesNoCart = content.includes('orders_enabled !== false ?') || content.includes('orders_enabled !== false &&') || content.includes('!config.orders_enabled') || content.includes('config.orders_enabled');

    finalOutput += `\n[${file}]\n`;
    finalOutput += `Missing Links: ${missing.length ? missing.join(', ') : 'None'}\n`;
    finalOutput += `Has Condition For Prices (orders enabled)? ${handlesPricesNoCart ? 'Yes' : 'No'}\n`;
}

fs.writeFileSync('theme_analysis_readable.txt', finalOutput, 'utf-8');
