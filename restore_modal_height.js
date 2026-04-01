const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');
files.push('src/components/menu/CheckoutModal.tsx');

let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    
    // The user wants all content to be visible without extreme scrolling.
    // Replace all max-h-[xxvh] and h-[xxvh] on the wrapper with max-h-[85vh]
    // which allows the content to expand naturally up to 85% of the screen.
    content = content.replace(/max-h-\[45vh\]/g, 'max-h-[85vh]');
    content = content.replace(/max-h-\[55vh\]/g, 'max-h-[85vh]');
    content = content.replace(/max-h-\[60vh\]/g, 'max-h-[85vh]');
    
    // Ensure that it contains h-auto 
    content = content.replace(/flex flex-col max-h-\[85vh\]/g, 'flex flex-col h-auto max-h-[85vh]');
    
    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        count++;
    }
});

console.log('Restored natural content height in', count, 'files');
