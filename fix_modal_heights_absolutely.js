const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');
files.push('src/components/menu/CheckoutModal.tsx');

let changed = 0;

files.forEach(file => {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // Any motion.div or div that is a modal container (has rounded-2xl/3xl/[-24px] and bg-white)
    // we must ensure it has flex flex-col max-h-[55vh]
    
    // specifically target: max-w-[310px] without max-h-[55vh]
    content = content.replace(/max-w-\[310px\]([^>]+?)"([^>]*?>)/g, (match, classes, ending) => {
        let newClasses = classes;
        if (!newClasses.includes('max-h-')) {
            newClasses += ' max-h-[55vh] flex flex-col';
        }
        if (!newClasses.includes('mx-auto')) {
            newClasses += ' mx-auto';
        }
        return `max-w-[310px]${newClasses}"${ending}`;
    });

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        changed++;
        console.log('Fixed missing max-h in', file);
    }
});

console.log('Fixed missing heights in', changed, 'files');
