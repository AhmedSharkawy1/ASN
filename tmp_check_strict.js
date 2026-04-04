const fs = require('fs');
const path = require('path');

const dir = 'src/components/menu';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let total = 0;
let problemFiles = [];

files.forEach(f => {
    if(f === 'SharedMarquee.tsx' || f === 'CheckoutModal.tsx' || f === 'ASNFooter.tsx') return;
    
    total++;
    const filePath = path.join(dir, f);
    let original = fs.readFileSync(filePath, 'utf-8');
    
    let navStart = original.lastIndexOf('<nav className="fixed bottom-0');
    if (navStart === -1) {
        navStart = original.lastIndexOf('<nav className="fixed inset-x-0 bottom-0');
    }
    
    if (navStart !== -1) {
        let navEnd = original.indexOf('</nav>', navStart);
        if (navEnd === -1) navEnd = original.length;
        
        const navSection = original.substring(navStart, navEnd);
        
        // Let's check buttons/anchors in the flex row
        let missingFlexCol = false;
        
        const classNameRegex = /className="([^"]+)"/g;
        let p;
        while ((p = classNameRegex.exec(navSection)) !== null) {
            const cls = p[1].split(/\s+/);
            if (cls.includes('flex') && cls.includes('items-center') && !cls.includes('flex-col')) {
                // If it also includes flex-1 or it's a specific wrapper, it's missing flex-col
                // E.g 'flex-1', 'px-4', 'gap-1'
                if(cls.includes('flex-1') || cls.includes('gap-1') || cls.includes('py-2')) {
                    missingFlexCol = true;
                }
            }
        }
        
        if (missingFlexCol) {
            problemFiles.push(f);
        }
    } else {
        // Did not find bottom nav? Some themes might use different class?
    }
});

console.log('Total Menu Components:', total);
console.log('Problem Files Count:', problemFiles.length);
if (problemFiles.length > 0) {
    console.log('Problem Files:');
    console.log(problemFiles.join('\n'));
} else {
    console.log('✅ ALL THEMES ARE FIXED!');
}
