const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');
files.push('src/components/menu/CheckoutModal.tsx');

let changed = 0;

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // The user wants it even smaller from top/bottom. Let's push to max-h-[45vh]
    content = content.replace(/max-h-\[55vh\]/g, 'max-h-[45vh]');
    content = content.replace(/max-h-\[60vh\]/g, 'max-h-[45vh]');
    content = content.replace(/max-h-\[65vh\]/g, 'max-h-[45vh]');
    
    // Check if the image headers are too tall for 45vh. 45vh is ~350px.
    // If the image is 130px, that's already 1/3 of the modal! Let's shrink it to h-24 (96px).
    content = content.replace(/h-\[130px\]/g, 'h-24');
    content = content.replace(/h-\[140px\]/g, 'h-24');
    content = content.replace(/h-\[120px\]/g, 'h-24');

    // Force massive padding on the backdrop so it NEVER touches the edges!
    content = content.replace(/p-6 sm:p-8 mb-safe/g, 'py-16 px-6 mb-safe');
    content = content.replace(/p-8 sm:p-12 md:p-16 mb-safe/g, 'py-16 px-6 sm:py-20 sm:px-10 mb-safe');
    content = content.replace(/p-4 sm:p-6 mb-safe/g, 'py-16 px-6 mb-safe');

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        changed++;
        console.log('Fixed more margins top/bottom in', file);
    }
});

console.log('Tidied up margins in', changed, 'files');
