const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'menu');
let fixedCount = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const basename = path.basename(filePath);
    
    // Fix broken className template literal - the old conditional got replaced incorrectly
    const brokenPattern = /className=\{`([^`]*)"bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-200 dark:border-white\/10"`\}/g;
    
    if (brokenPattern.test(content)) {
        content = content.replace(brokenPattern, (match, prefix) => {
            return `className="${prefix}bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10"`;
        });
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed className: ${basename}`);
        fixedCount++;
    }
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
    processFile(path.join(dir, file));
}

console.log(`\nDone! Fixed ${fixedCount} files.`);
