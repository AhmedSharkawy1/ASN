const fs = require('fs');
const path = require('path');

const dir = 'f:/ASN/ASN/src/components/menu';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let count = 0;

for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    const original = content;

    const hasLocalModal = content.includes('setShowCallMenu');
    const clickAction = hasLocalModal ? 'setShowCallMenu(true)' : "document.dispatchEvent(new CustomEvent('openDeliveryModal', { detail: config.phone_numbers }))";

    // 1. Remove the modal blocks completely
    content = content.replace(/\{config\.phone\s*&&\s*\(\s*<a\s+href=\{`tel:\$\{config\.phone\}`\}\s+([^>]*)>\s*([\s\S]{1,800}?)\s*<\/a>\s*\)\s*\}/g, (match, classAttr, innerContent) => {
        if (innerContent.includes('tabular-nums') || innerContent.includes('الرئيسي') || innerContent.includes('الأساسي') || innerContent.includes('Main')) {
            return '';
        }
        // It's a header icon block, replace with button and update the condition
        return `{(config.phone_numbers && config.phone_numbers.length > 0) && (
                        <button onClick={(e) => { e.preventDefault(); ${clickAction}; }} ${classAttr}>
                            ${innerContent}
                        </button>
                    )}`;
    });

    // 2. Safely replace standalone <a> tags that link to config.phone WITHOUT adding curly braces, to prevent AST breaking in ternaries!
    content = content.replace(/<a\s+href=\{`tel:\$\{config\.phone\}`\}\s+([^>]*)>\s*([\s\S]{1,800}?)\s*<\/a>/g, (match, classAttr, innerContent) => {
        if (innerContent.includes('tabular-nums') || innerContent.includes('الرئيسي') || innerContent.includes('الأساسي') || innerContent.includes('Main')) {
            return '';
        }
        if (innerContent.includes('{config.phone}')) {
             // Don't modify text label anchors like in Theme10 Cyan Menu dropdowns
             return match;
        }
        return `<button onClick={(e) => { e.preventDefault(); ${clickAction}; }} ${classAttr}>
                            ${innerContent}
                        </button>`;
    });

    if (content !== original) {
        fs.writeFileSync(fp, content, 'utf8');
        count++;
    }
}
console.log('Updated files:', count);
