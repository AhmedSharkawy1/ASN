const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    
    // Some bottom nav bars might STILL have flex-col from my aggressive injection
    // Let's forcibly ensure they are horizontal
    const lines = content.split('\n');
    let insideNav = false;
    for (let i = 0; i < lines.length; i++) {
        // Find bottom nav element
        if (lines[i].includes('<nav ') && lines[i].includes('fixed bottom-0')) {
            insideNav = true;
        }
        
        if (insideNav) {
            // Find the immediate child or itself
            if (lines[i].includes('flex')) {
                // If it has flex-col, rip it out!
                if (lines[i].includes(' flex-col') && !lines[i].includes('<a ') && !lines[i].includes('<button ')) {
                    // Only remove it if it's not the button/anchor itself (buttons have flex-col for icon+text)
                    lines[i] = lines[i].replace(/ flex-col/g, '');
                    lines[i] = lines[i].replace(/ flex flex-col/g, ' flex');
                    lines[i] = lines[i].replace(/ max-h-\[45vh\]/g, '');
                    lines[i] = lines[i].replace(/ max-h-\[55vh\]/g, '');
                }
            }
        }
        
        if (lines[i].includes('</nav>')) {
            insideNav = false;
        }
    }
    
    content = lines.join('\n');

    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log('Fixed straggling flex-col in', file);
    }
});
