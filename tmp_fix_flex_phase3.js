const fs = require('fs');
const path = require('path');

const dir = 'src/components/menu';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let changedFiles = 0;

files.forEach(f => {
    if(f === 'SharedMarquee.tsx' || f === 'CheckoutModal.tsx' || f === 'ASNFooter.tsx') return;
    
    const filePath = path.join(dir, f);
    let original = fs.readFileSync(filePath, 'utf-8');
    
    // Find bottom navigation block
    const navStart = original.indexOf('<nav className="fixed bottom-0');
    if (navStart === -1) return;
    
    let navEnd = original.indexOf('</nav>', navStart);
    if (navEnd === -1) navEnd = original.length;
    
    const navSection = original.substring(navStart, navEnd + 6);
    
    // We want to replace `className="flex-1 flex items-center` with `className="flex-1 flex flex-col items-center`
    // OR `className="flex items-center gap-1 flex-1` with `className="flex flex-col items-center gap-1 flex-1`
    // Basically any class combination that has 'flex' and 'flex-1' and 'items-center' but NO 'flex-col'.
    
    const classNameRegex = /className="([^"]+)"/g;
    let modifiedNav = navSection.replace(classNameRegex, (match, classList) => {
        const classes = classList.split(/\s+/);
        if (classes.includes('flex') && classes.includes('flex-1') && classes.includes('items-center') && !classes.includes('flex-col')) {
            const flexIndex = classes.indexOf('flex');
            classes.splice(flexIndex + 1, 0, 'flex-col');
            return `className="${classes.join(' ')}"`;
        }
        return match;
    });
    
    if (navSection !== modifiedNav) {
        const newContent = original.substring(0, navStart) + modifiedNav + original.substring(navEnd + 6);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Updated ${f}`);
        changedFiles++;
    }
});

console.log(`Phase 3 total files changed: ${changedFiles}`);
