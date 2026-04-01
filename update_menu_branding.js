const fs = require('fs');
const path = require('path');

const menuDir = path.join(__dirname, 'src', 'components', 'menu');
const files = fs.readdirSync(menuDir).filter(f => 
    f.endsWith('.tsx') && 
    !['ASNFooter.tsx', 'SharedMarquee.tsx', 'CheckoutModal.tsx'].includes(f)
);

let updated = 0;
let skipped = 0;

for (const file of files) {
    const filePath = path.join(menuDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Skip if already updated
    if (content.includes('show_asn_branding')) {
        skipped++;
        continue;
    }
    
    let changed = false;
    
    // 1. Add show_asn_branding to RestaurantConfig type
    // Add after order_channel line if exists, otherwise after orders_enabled
    if (content.includes("order_channel?:")) {
        content = content.replace(
            /(order_channel\?:.*?;)/,
            "$1\n    show_asn_branding?: boolean;"
        );
        changed = true;
    } else if (content.includes("orders_enabled?:")) {
        content = content.replace(
            /(orders_enabled\?:.*?;)/,
            "$1\n    show_asn_branding?: boolean;"
        );
        changed = true;
    }
    
    // 2. Replace <ASNFooter /> with <ASNFooter show={...} />
    if (content.includes('<ASNFooter />')) {
        content = content.replace(
            /<ASNFooter \/>/g,
            '<ASNFooter show={config.show_asn_branding !== false} />'
        );
        changed = true;
    }
    
    // 3. Wrap inline "مدعوم بواسطة" / "Powered by" in conditional
    // Pattern varies by theme family, handle each
    
    // BabAlHara style: <p ...>{isAr ? "مدعوم بواسطة" : "Powered by"} <span...>ASN Technology</span></p>
    const babPattern = /(\s*)<p ([^>]*?)>\s*\n\s*\{isAr \? "مدعوم بواسطة" : "Powered by"\} <span ([^>]*?)>ASN Technology<\/span>\s*\n\s*<\/p>/;
    if (babPattern.test(content)) {
        content = content.replace(babPattern, (match, indent, pAttrs, spanAttrs) => {
            return `${indent}{config.show_asn_branding !== false && (\n${indent}<p ${pAttrs}>\n${indent}    {isAr ? "مدعوم بواسطة" : "Powered by"} <span ${spanAttrs}>ASN Technology</span>\n${indent}</p>\n${indent})}`;
        });
        changed = true;
    }
    
    // AtyabOriental style: <p ...>{isAr ? "مدعوم بواسطة" : "Powered by"} <span ...>ASN Technology</span></p>
    // (single line)
    const atyabPattern = /(\s*)<p ([^>]*?)>\{isAr \? "مدعوم بواسطة" : "Powered by"\} <span ([^>]*?)>ASN Technology<\/span><\/p>/;
    if (atyabPattern.test(content)) {
        content = content.replace(atyabPattern, (match, indent, pAttrs, spanAttrs) => {
            return `${indent}{config.show_asn_branding !== false && (\n${indent}<p ${pAttrs}>{isAr ? "مدعوم بواسطة" : "Powered by"} <span ${spanAttrs}>ASN Technology</span></p>\n${indent})}`;
        });
        changed = true;
    }
    
    // PizzaPasta style: {isAr ? "مدعوم بواسطة" : "Powered by"} ASN Technology (inside a p tag, possibly multiline)
    const pizzaPattern = /(\s*)<p ([^>]*?)>\s*\n\s*\{isAr \? "مدعوم بواسطة" : "Powered by"\} ASN Technology\s*\n\s*<\/p>/;
    if (pizzaPattern.test(content)) {
        content = content.replace(pizzaPattern, (match, indent, pAttrs) => {
            return `${indent}{config.show_asn_branding !== false && (\n${indent}<p ${pAttrs}>\n${indent}    {isAr ? "مدعوم بواسطة" : "Powered by"} ASN Technology\n${indent}</p>\n${indent})}`;
        });
        changed = true;
    }
    
    // AtyabEtoile style: within a span: {isAr ? "مدعوم بواسطة" : "Powered by"} <span>ASN Technology</span>
    const etoilePattern = /(\s*)<span ([^>]*?)>\s*\n\s*\{isAr \? "مدعوم بواسطة" : "Powered by"\} <span ([^>]*?)>ASN Technology<\/span>\s*\n\s*<\/span>/;
    if (etoilePattern.test(content)) {
        content = content.replace(etoilePattern, (match, indent, spanAttrs, innerSpanAttrs) => {
            return `${indent}{config.show_asn_branding !== false && (\n${indent}<span ${spanAttrs}>\n${indent}    {isAr ? "مدعوم بواسطة" : "Powered by"} <span ${innerSpanAttrs}>ASN Technology</span>\n${indent}</span>\n${indent})}`;
        });
        changed = true;
    }
    
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        updated++;
        console.log(`✅ Updated: ${file}`);
    } else {
        console.log(`⚠️  No changes needed: ${file}`);
    }
}

console.log(`\nDone! Updated: ${updated}, Skipped (already done): ${skipped}`);
