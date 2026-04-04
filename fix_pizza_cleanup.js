const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'menu');
let fixedCount = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const basename = path.basename(filePath);
    
    // Only process PizzaPasta files that still have showCallMenu
    if (!basename.startsWith('PizzaPasta') || !content.includes('showCallMenu')) return;
    
    // Remove the orphaned showCallMenu inline block
    // Pattern: {showCallMenu && (...</>...)}
    // The block starts with {showCallMenu && ( and ends with )}
    const lines = content.split('\n');
    let newLines = [];
    let inBlock = false;
    let braceDepth = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('{showCallMenu && (')) {
            inBlock = true;
            braceDepth = 1; // opening brace
            continue;
        }
        
        if (inBlock) {
            // Count opening and closing braces/parens
            for (const ch of line) {
                if (ch === '(' || ch === '{') braceDepth++;
                if (ch === ')' || ch === '}') braceDepth--;
            }
            if (braceDepth <= 0) {
                inBlock = false;
            }
            continue;
        }
        
        newLines.push(line);
    }
    
    content = newLines.join('\n');
    
    // Remove the state declaration
    content = content.replace(/\s*const \[showCallMenu, setShowCallMenu\] = useState\(false\);\s*\n/g, '\n');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Cleaned: ${basename}`);
    fixedCount++;
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
    processFile(path.join(dir, file));
}

console.log(`\nDone! Cleaned ${fixedCount} files.`);
