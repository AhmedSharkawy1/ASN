const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'menu');
let fixedCount = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const basename = path.basename(filePath);
    
    // Only process files that have BOTH showCallMenu AND showBottomCallModal
    if (!content.includes('showCallMenu') || !content.includes('showBottomCallModal')) return;
    
    let modified = false;

    // Step 1: Replace header button onClick from setShowCallMenu to setShowBottomCallModal
    // Pattern: setShowCallMenu(!showCallMenu) -> setShowBottomCallModal(true)
    content = content.replace(
        /setShowCallMenu\(!showCallMenu\)/g,
        'setShowBottomCallModal(true)'
    );
    
    // Step 2: Replace the button's conditional styling that uses showCallMenu
    // Pattern: ${showCallMenu ? "bg-zinc-900..." : "bg-white..."}
    content = content.replace(
        /\$\{showCallMenu \? "bg-zinc-900 text-white border-zinc-800" : "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-200 dark:border-white\/10"\}/g,
        '"bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white border-zinc-200 dark:border-white/10"'
    );
    
    // Step 3: Remove the entire inline showCallMenu dropdown block
    // This is the <AnimatePresence> ... {showCallMenu && (...)} ... </AnimatePresence> block
    // We need to find and remove it
    
    // Pattern to match the entire showCallMenu block including AnimatePresence wrapper
    const callMenuBlockRegex = /\s*{\/\* Call Menu Dropdown \*\/}\s*\r?\n\s*<AnimatePresence>\s*\r?\n\s*\{showCallMenu && \([\s\S]*?\)\}\s*\r?\n\s*<\/AnimatePresence>/g;
    
    if (callMenuBlockRegex.test(content)) {
        content = content.replace(callMenuBlockRegex, '');
        modified = true;
    }
    
    // Also try without the comment
    const callMenuBlockRegex2 = /\s*<AnimatePresence>\s*\r?\n\s*\{showCallMenu && \([\s\S]*?<\/motion\.div>[\s\S]*?\)\}\s*\r?\n\s*<\/AnimatePresence>/g;
    
    if (!modified) {
        const before = content;
        content = content.replace(callMenuBlockRegex2, '');
        if (content !== before) modified = true;
    }
    
    // Step 4: Remove the showCallMenu state declaration if no longer used
    if (!content.includes('showCallMenu') || (content.match(/showCallMenu/g) || []).length <= 1) {
        content = content.replace(/\s*const \[showCallMenu, setShowCallMenu\] = useState\(false\);/g, '');
    }

    if (modified || content.includes('setShowBottomCallModal(true)')) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${basename}`);
        fixedCount++;
    }
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
    processFile(path.join(dir, file));
}

console.log(`\nDone! Fixed ${fixedCount} files.`);
