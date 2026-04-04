const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'menu');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Ensure FaInstagram is imported if FaFacebook is there.
    if (content.includes('FaFacebook') && !content.includes('FaInstagram')) {
        content = content.replace(/FaFacebook(?!.*FaInstagram)/, 'FaFacebook, FaInstagram');
    }

    // 2. Add Instagram block after Facebook block
    const maxIters = 10;
    for (let i=0; i<maxIters; i++) {
        // Look for facebook block
        // Assuming it looks like {config.facebook_url && ( ... )}
        let fbIndex = content.indexOf('{config.facebook_url');
        if (fbIndex === -1) break;

        // Find the matching closing brace for this block.
        let braceCount = 0;
        let p = fbIndex;
        let foundStart = false;
        let endIndex = -1;

        while (p < content.length) {
            if (content[p] === '{') {
                braceCount++;
                foundStart = true;
            } else if (content[p] === '}') {
                braceCount--;
            }
            if (foundStart && braceCount === 0) {
                endIndex = p;
                break;
            }
            p++;
        }

        if (endIndex !== -1) {
            let fbBlock = content.substring(fbIndex, endIndex + 1);
            
            // create exactly matched instagram block
            if (!content.substring(endIndex + 1, endIndex + 200).includes('config.instagram_url')) {
                let igBlock = fbBlock
                    .replace(/facebook_url/g, 'instagram_url')
                    .replace(/FaFacebook/g, 'FaInstagram')
                    .replace(/"فيسبوك"/g, '"انستجرام"')
                    .replace(/"Facebook"/g, '"Instagram"')
                    .replace(/#1877F2/g, '#E1306C'); // replace standard facebook blue with instagram pink
                
                content = content.substring(0, endIndex + 1) + '\n                ' + igBlock + content.substring(endIndex + 1);
            }
            
            // move to next if needed by temporarily replacing config.facebook_url
            content = content.substring(0, fbIndex) + '{__FB_URL_DONE__' + content.substring(fbIndex + 20);
        } else {
            break;
        }
    }

    // restore fb block marker
    content = content.replace(/\{__FB_URL_DONE__/g, '{config.facebook_url');


    // 3. Zoom the logo
    // <img src={config.logo_url} ... className="w-full h-full object-cover" />
    content = content.replace(/(<img\s+src=\{config\.logo_url\}[\s\S]*?className=")([^"]+)(")/g, (match, prefix, classNames, suffix) => {
        if (!classNames.includes('scale-([1.15])') && !classNames.includes('scale-110') && !classNames.includes('scale-125')) {
            return prefix + classNames + ' scale-[1.15]' + suffix;
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
