const fs = require('fs');
const path = require('path');

const dir = 'src/components/menu';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
    if(f === 'SharedMarquee.tsx' || f === 'CheckoutModal.tsx' || f === 'ASNFooter.tsx') return;
    
    const filePath = path.join(dir, f);
    let original = fs.readFileSync(filePath, 'utf-8');
    
    const navStart = original.indexOf('<nav className="fixed bottom-0');
    if (navStart === -1) return;
    
    let navEnd = original.indexOf('</nav>', navStart);
    if (navEnd === -1) navEnd = original.length;
    
    const navSection = original.substring(navStart, navEnd);
    
    // Check if there are buttons or anchors in navSection missing flex-col
    const matches = navSection.match(/className="([^"]+)"/g);
    let problemFound = false;
    if(matches) {
        matches.forEach(m => {
            const cls = m.replace('className="', '').replace('"', '').split(/\s+/);
            // look for flex items that represent the bottom bar items. They usually have flex, items-center
            if(cls.includes('flex') && cls.includes('items-center') && !cls.includes('flex-col')) {
               // Is it an item container? Usually includes flex-1 or gap-1 or px-..
               // Let's print out the classes so we can see what's what
               // console.log(`${f}: ${cls.join(' ')}`);
               problemFound = true;
            }
        });
    }
    
    if (problemFound) {
       console.log(`Potential missed flex-col in: ${f}`);
    }
});
