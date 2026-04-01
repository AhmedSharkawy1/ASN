const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    
    // Restore h-24 back to h-40 or aspect-video for the modal product image
    // I previously did `w-full h-24` and `w-full h-full object-cover`
    content = content.replace(/w-full h-24 rounded-\[1\.5rem\]/g, 'w-full h-40 rounded-[1.5rem]');
    content = content.replace(/aspect-video/g, 'aspect-video'); // some might have it
    // Wait, earlier I did: 
    // content = content.replace(/className="[^"]*aspect-video[^"]*"/g, match => match.replace('aspect-video', 'h-24'));
    // Let's find any `h-24` inside `relative` or `overflow-hidden` that is used for images
    content = content.replace(/className="relative h-24/g, 'className="relative aspect-video');
    content = content.replace(/className="w-full h-24 object-cover"/g, 'className="w-full h-40 object-cover"');
    
    // In other places, I literally replaced aspect-video with h-24 verbatim.
    content = content.replace(/h-24 bg-gray-100/g, 'aspect-video bg-gray-100');
    content = content.replace(/h-24 dark:bg-black/g, 'aspect-video dark:bg-black');
    content = content.replace(/relative h-24 bg-gray-100 dark:bg-black/g, 'relative aspect-video bg-gray-100 dark:bg-black');

    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        count++;
    }
});
console.log('Restored beautiful images in', count, 'files');
