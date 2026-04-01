const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    // Remove aspect-video from the top of the Item selection modals since it makes the image take 175px out of max-h 45vh.
    // Replace with explicit small height.
    content = content.replace(/className="[^"]*aspect-video[^"]*"/g, match => {
        return match.replace('aspect-video', 'h-24');
    });

    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        count++;
    }
});
console.log('Fixed aspect-video in', count, 'files');
