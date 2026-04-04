const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'menu');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // We want to target the absolute popover for showCallMenu in Atyab, BabAlHara, PizzaPasta
    // Look for: className="absolute top-something... " inside showCallMenu block.

    // Atyab / BabAlHara typical:
    // <div className="fixed inset-0 z-[-1] ... " />
    // <motion.div ... className="absolute top-full mt-3 left-0 right-0 ... z-50"

    // Fix overlay z-index
    if (content.includes('z-[-1]') && content.includes('showCallMenu')) {
        content = content.replace(/(<div[^>]*className="[^"]*fixed inset-0[^"]*)z-\[-1\]([^"]*"[^>]*onClick=\{\s*\(\)\s*=>\s*setShowCallMenu\(false\)\s*\}[^>]*>)/g, (match, p1, p2) => {
            modified = true;
            return p1 + 'z-[299]' + p2;
        });
    }

    // Fix absolute popup
    const absoluteRegex = /(<motion\.div[^>]*className="[^"]*)(absolute\s+top-(?:full|16)[^"]*)(z-50)("[^>]*>)/g;
    content = content.replace(absoluteRegex, (match, p1, classes, z, p4) => {
        // Only modify if it's near 'onClick={e => e.stopPropagation()}' or inside showCallMenu which is true since they are popups
        if (!classes.includes('top-half')) {
            modified = true;
            // replace classes
            let newClasses = classes.replace(/absolute top-(?:full|16)[^ ]*/, 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[310px] max-h-[85vh]');
            newClasses = newClasses.replace(/mt-3|mt-2|left-0|right-0/g, ' '); // remove conflicting positioning
            return p1 + newClasses + 'z-[300]' + p4;
        }
        return match;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Modified Call Modal to Centered:', path.basename(filePath));
    }
}

function walk(directory) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const fullPath = path.join(directory, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
            processFile(fullPath);
        }
    }
}

walk(dir);
console.log('All Call dropdowns centered.');
