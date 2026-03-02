const fs = require('fs');
const path = require('path');

const themesDir = path.join(__dirname, 'src', 'components', 'menu');
const themeFiles = fs.readdirSync(themesDir).filter(f => f.endsWith('.tsx') && f !== 'CheckoutModal.tsx' && f !== 'SharedMarquee.tsx');

console.log(`Analyzing ${themeFiles.length} themes...\n`);

const results = [];

for (const file of themeFiles) {
    const filePath = path.join(themesDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    // Basic checks
    const hasPhoneLink = content.includes('tel:');
    const hasWhatsAppLink = content.includes('wa.me');
    const hasMapLink = content.includes('map_link') && (content.includes('MapPin') || content.includes('📍'));
    const hasFacebook = content.includes('facebook_url') || content.includes('FaFacebook');
    const hasInstagram = content.includes('instagram_url') || content.includes('FaInstagram');

    // Check if prices are hidden when orders are disabled
    // A good pattern is if they render prices outside of the `config.orders_enabled !== false` block,
    // or if they have a dedicated else block for showing prices without the cart button.
    const hasConditionForPricesWhenDisabled = content.includes('config.orders_enabled !== false ?') || content.includes('config.orders_enabled !== false &&');

    // Look for explicit fallback rendering of prices
    // This is hard to regex perfectly, but we can look for the variable `price` or `item.prices` being rendered
    // without a button next to it, or in an else block.
    // For now, let's just log the raw boolean presence.

    results.push({
        theme: file,
        phone: hasPhoneLink ? '✅' : '❌',
        whatsapp: hasWhatsAppLink ? '✅' : '❌',
        map: hasMapLink ? '✅' : '❌',
        facebook: hasFacebook ? '✅' : '❌',
        instagram: hasInstagram ? '✅' : '❌',
    });
}

console.table(results);
