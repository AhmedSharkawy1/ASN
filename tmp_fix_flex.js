const fs = require('fs');
const path = require('path');

const dir = 'src/components/menu';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let changedFiles = 0;

files.forEach(f => {
    const filePath = path.join(dir, f);
    let original = fs.readFileSync(filePath, 'utf-8');
    
    // Find bottom navigation block
    const navStart = original.indexOf('<nav className="fixed bottom-0');
    if (navStart === -1) return;
    
    const navEnd = original.indexOf('</nav>', navStart);
    if (navEnd === -1) return;
    
    const navSection = original.substring(navStart, navEnd);
    
    // Replace `className="flex items-center gap-1 flex-1` with `className="flex flex-col items-center gap-1 flex-1` inside the nav section
    // Some might have `cursor-pointer`, `-mt-8`, `-mt-12` etc.
    const regex = /className="flex items-center gap-([0-9]) flex-1/g;
    const modifiedNav = navSection.replace(regex, 'className="flex flex-col items-center gap-1 flex-1');
    
    if (navSection !== modifiedNav) {
        const newContent = original.substring(0, navStart) + modifiedNav + original.substring(navEnd);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Updated ${f}`);
        changedFiles++;
    }
});

console.log(`Total files changed: ${changedFiles}`);
