const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    
    // We need to find the bottom nav bar. It usually contains:
    // justify-around shadow-xl relative
    // AND we accidentally added: max-h-[45vh] flex flex-col
    // Just blindly replace 'flex flex-col max-h-[45vh]' ONLY IF it's in the same line as 'justify-around'
    content = content.replace(/(justify-between|justify-around)[^>]*?max-h-\[45vh\] flex flex-col/g, match => {
        return match.replace('max-h-[45vh] flex flex-col', '');
    });

    content = content.replace(/(justify-between|justify-around)[^>]*?flex flex-col max-h-\[45vh\]/g, match => {
        return match.replace('flex flex-col max-h-[45vh]', '');
    });

    // Also just in case, there might be 'max-h-[55vh]'
    content = content.replace(/(justify-between|justify-around)[^>]*?max-h-\[55vh\] flex flex-col/g, match => {
        return match.replace('max-h-[55vh] flex flex-col', '');
    });
    content = content.replace(/(justify-between|justify-around)[^>]*?flex flex-col max-h-\[55vh\]/g, match => {
        return match.replace('flex flex-col max-h-[55vh]', '');
    });

    // Or just look for any tag containing 'justify-around' and clean it up completely:
    const lines = content.split('\n');
    const newLines = lines.map(line => {
        if (line.includes('justify-around') && line.includes('bottom-0') === false) {
            // It's the inner nav container
            if (line.includes('max-h-[45vh] flex flex-col')) {
                return line.replace(' max-h-[45vh] flex flex-col', '');
            }
            if (line.includes(' flex flex-col max-h-[45vh]')) {
                return line.replace(' flex flex-col max-h-[45vh]', '');
            }
        }
        return line;
    });
    content = newLines.join('\n');

    // Make absolutely sure:
    // Some lines might just have justify-around and flex-col accidentally
    content = content.replace(/flex flex-col max-h-\[45vh\] mx-auto/g, 'flex flex-col max-h-[45vh] mx-auto'); // wait, that's normal for modal
    
    // Specifically target the bottom nav inner wrapper
    content = content.replace(/justify-around shadow-xl relative max-h-\[45vh\] flex flex-col/g, 'justify-around shadow-xl relative');
    content = content.replace(/justify-around shadow-lg relative max-h-\[45vh\] flex flex-col/g, 'justify-around shadow-lg relative');
    content = content.replace(/justify-around shadow-md relative max-h-\[45vh\] flex flex-col/g, 'justify-around shadow-md relative');

    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        count++;
    }
});
console.log('Fixed bottom nav bars in', count, 'files');
