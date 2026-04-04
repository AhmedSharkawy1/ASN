const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'menu');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Ensure FaInstagram is imported if FaFacebook is there.
    if (content.includes('FaFacebook') && !content.includes('FaInstagram')) {
        content = content.replace(/FaFacebook/, 'FaFacebook, FaInstagram');
    }

    // 2. Add Instagram block after Facebook block
    const regex = /(\{config\.facebook_url\s*&&\s*\(\s*<a[\s\S]*?<FaFacebook[\s\S]*?<\/a>\s*\)\s*\})/g;
    
    content = content.replace(regex, (match) => {
        // Create exactly matched instagram block
        let igBlock = match
            .replace(/facebook_url/g, 'instagram_url')
            .replace(/FaFacebook/g, 'FaInstagram')
            .replace(/"فيسبوك"/g, '"انستجرام"')
            .replace(/"Facebook"/g, '"Instagram"')
            .replace(/#1877F2/g, '#E1306C')
            .replace(/bg-\[#1877F2\]\/10/g, 'bg-[#E1306C]/10')
            .replace(/text-\[#1877F2\]/g, 'text-[#E1306C]'); 
            // the colors might be handled by exact hex replacements above
            
        // Because Javascript replace might return unexpected things if Instagram is already there we shouldn't insert twice
        return match + '\n                ' + igBlock;
    });

    // We shouldn't duplicate if it was already duplicated
    // But since we just reset with git restore, it should be clean.

    // 3. Zoom the logo
    // <img src={config.logo_url} alt="Logo" className="w-full h-full object-cover" />
    content = content.replace(/(<img\s+src=\{config\.logo_url\}[\s\S]*?className="[^"]*)(object-cover)([^"]*")/g, (match, p1, p2, p3) => {
        if (!p3.includes('scale-')) {
            return p1 + p2 + ' scale-[1.15]' + p3;
        }
        return match;
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Modified:', path.basename(filePath));
    }
}

function walk(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            processFile(fullPath);
        }
    }
}

walk(dir);
console.log('Done mapping instagram and logo.');
