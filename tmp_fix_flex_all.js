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
    
    let navEnd = original.indexOf('</nav>', navStart);
    if (navEnd === -1) {
        // sometimes it's not nested cleanly in a single regex match if there's no closing nav tag immediately, but it should be
        navEnd = original.length;
    }
    
    // we take the nav section + 10 characters to ensure we capture </nav>
    const navSection = original.substring(navStart, navEnd + 6);
    
    // In this section, find all classNames that have `flex-1`, `flex`, `items-center` but do NOT have `flex-col`.
    // Example: className="flex-1 flex items-center py-2 text-zinc-500 active:scale-90 transition-all"
    // Example: className="flex items-center gap-1 flex-1 cursor-pointer"
    
    let modifiedNav = navSection;
    
    // Regex explanation:
    // Match className=" ... flex ... items-center ... flex-1 ... "
    // We will just match any `className="..."` inside the nav.
    const classNameRegex = /className="([^"]+)"/g;
    
    modifiedNav = modifiedNav.replace(classNameRegex, (match, classList) => {
        const classes = classList.split(/\s+/);
        if (classes.includes('flex-1') && classes.includes('flex') && classes.includes('items-center') && !classes.includes('flex-col')) {
            // insert flex-col after flex
            const flexIndex = classes.indexOf('flex');
            classes.splice(flexIndex + 1, 0, 'flex-col');
            return `className="${classes.join(' ')}"`;
        }
        return match;
    });

    // Also, handle cases where `flex-1` might not be there, but it's meant to be flex-col, like the Top button?
    // User wants ALL with word under it. The Top 🔝 button usually doesn't have a word in most themes (it's a floating circle).
    // If the word "Top" does exist, it's already stacked if we added flex-col to flex-1 items.
    
    if (navSection !== modifiedNav) {
        const newContent = original.substring(0, navStart) + modifiedNav + original.substring(navEnd + 6);
        fs.writeFileSync(filePath, newContent, 'utf-8');
        console.log(`Updated ${f}`);
        changedFiles++;
    }
});

console.log(`Total files changed: ${changedFiles}`);
