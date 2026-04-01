const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let count = 0;
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    
    // I specifically injected h-24 for modal images earlier in fix_aspect_video.js and fix_top_bottom_extreme.js
    // I used h-24 for the image wrapper in AtyabEtoile and others.
    // They are usually w-full h-24 rounded-[..] or relative h-24
    content = content.replace(/w-full h-24 rounded-\[1\.5rem\]/g, 'w-full h-40 rounded-[1.5rem]');
    content = content.replace(/w-full h-24 rounded-3xl/g, 'w-full h-40 rounded-3xl');
    content = content.replace(/w-full h-24 shrink-0 relative/g, 'w-full h-[35vh] md:h-[40vh] shrink-0 relative'); 
    
    // Restore generic `h-24` back to what they were or at least `h-40` for images
    if (file.includes('AtyabEtoile') || file.includes('AtyabOriental')) {
        content = content.replace(/relative h-24/g, 'relative aspect-video');
        content = content.replace(/w-full h-24 rounded-\[1\.5rem\]/g, 'w-full h-40 rounded-[1.5rem]');
    }

    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        count++;
    }
});
console.log('Restored images in', count, 'files');
