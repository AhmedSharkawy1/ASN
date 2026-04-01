const fs = require('fs');
const path = require('path');

const componentsDir = path.join(__dirname, 'src', 'components');

function replaceImagesInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // Check if file has img tags, ignore if not
    if (!content.includes('<img ')) return;

    // Add import Image from "next/image" if not present
    if (!content.includes('import Image from "next/image"')) {
        // Insert after first import
        content = content.replace(/(import .*?;)/, '$1\nimport Image from "next/image";');
    }

    // Replace <img src={...} alt={...} className={...} />
    // To safe-guard Next.js image behavior without layout breaking, we use:
    // width={800} height={800} style={{ width: "100%", height: "100%", objectFit: "cover" }} 
    // This allows NextJS to serve optimized WebP, while behaving exactly like a normal responsive <img>
    const imgRegex = /<img([\s\S]*?)\/?>/g;

    content = content.replace(imgRegex, (match, attrs) => {
        // Basic heuristics to carry over src, alt, className
        if (attrs.includes('className=')) {
            // Remove object-cover from className since we put it in style
            // wait, if we just keep original className and add width/height, it scales down nicely
            return `<Image${attrs} width={800} height={800} loading="lazy" />`.replace('loading="lazy" loading="lazy"', 'loading="lazy"').replace('/>>', '/>');
        } else {
            return `<Image${attrs} width={800} height={800} loading="lazy" className="w-full h-full object-cover" />`.replace('loading="lazy" loading="lazy"', 'loading="lazy"').replace('/>>', '/>');
        }
    });

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Optimized images in:', path.basename(filePath));
    }
}

function processDirectory(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
            replaceImagesInFile(fullPath);
        }
    }
}

processDirectory(componentsDir);
console.log('Image optimization complete.');
