const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    
    // Replace max-h-[50vh] or max-h-[xxvh] on inner divs with flex-1
    // Usually it was: className="... overflow-y-auto max-h-[50vh]" or "p-5 overflow-y-auto max-h-[50vh]"
    content = content.replace(/overflow-y-auto max-h-\[\d+vh\]/g, 'flex-1 overflow-y-auto');
    
    // If the image had fixed 120/130/140px, we already replaced some.
    // Also change w-full h-40 to w-full h-24
    content = content.replace(/w-full h-40/g, 'w-full h-24');
    
    // Make sure text inside sizes isn't too huge
    content = content.replace(/text-xl font-black tabular-nums/g, 'text-lg font-black tabular-nums');

    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        count++;
    }
});
console.log('Fixed interior height styles in', count, 'files');
