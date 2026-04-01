const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // 1. Convert Side Drawer Animations to Center Popup Animations
    // Search for x: '100%' or x: 100 or x: '-100%'
    content = content.replace(/initial=\{\{\s*(?:x:\s*isAr\s*\?\s*['"]-?100%['"]\s*:\s*['"]-?100%['"]|x:\s*['"]-?100%['"]|x:\s*-?100)\s*\}\}\s*animate=\{\{\s*x:\s*0\s*\}\}\s*exit=\{\{\s*(?:x:\s*isAr\s*\?\s*['"]-?100%['"]\s*:\s*['"]-?100%['"]|x:\s*['"]-?100%['"]|x:\s*-?100)\s*\}\}/g, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );
    
    // Some formats: initial={{ opacity: 0, x: '100%' }}
    content = content.replace(/initial=\{\{\s*opacity:\s*0,\s*x:\s*['"]-?100%['"]\s*\}\}\s*animate=\{\{\s*opacity:\s*1,\s*x:\s*0\s*\}\}\s*exit=\{\{\s*opacity:\s*0,\s*x:\s*['"]-?100%['"]\s*\}\}/g, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );

    // 2. Fix the Side Drawer Container CSS
    // From: absolute top-0 right-0 w-full max-w-[400px] h-full
    // To: relative w-full max-w-sm max-h-[85vh] mx-auto rounded-3xl
    content = content.replace(/className=\{`absolute top-0 \$\{.*?\} w-full max-w-\[.*?\] h-full flex flex-col shadow-2xl`\}/g,
        'className={`relative w-full max-w-sm max-h-[85vh] overflow-hidden rounded-[2rem] mx-auto flex flex-col shadow-2xl`}'
    );
    // Replace hardcoded ones
    content = content.replace(/className="absolute top-0 right-0 w-full max-w-\[.*?\] h-full flex flex-col shadow-2xl"/g,
        'className="relative w-full max-w-sm max-h-[85vh] overflow-hidden rounded-[2rem] mx-auto flex flex-col shadow-2xl"'
    );
    content = content.replace(/className="absolute top-0 left-0 w-full max-w-\[.*?\] h-full flex flex-col shadow-2xl"/g,
        'className="relative w-full max-w-sm max-h-[85vh] overflow-hidden rounded-[2rem] mx-auto flex flex-col shadow-2xl"'
    );
    
    // Also fix the wrapper of the side drawer to make sure it's flex items-center justify-center p-6
    content = content.replace(/className="fixed inset-0[^"]*bg-black\/[0-9]+[^"]*"/g, (match) => {
        let classes = match.substring(11, match.length - 1);
        if (!classes.includes('flex')) classes += ' flex items-center justify-center p-6 sm:p-8 md:p-12 mb-safe';
        else {
            if (!classes.includes('items-center')) classes += ' items-center';
            if (!classes.includes('justify-center')) classes += ' justify-center';
        }
        classes = classes.replace(/\s*h-full\s*/g, ' ');
        return `className="${classes.replace(/\s+/g, ' ').trim()}"`;
    });

    // 3. Make selectedItem or Cart items use max-w-sm instead of max-w-[450px] or max-w-lg or max-w-[500px] or max-w-md
    // Since the user said "Make the screen smaller" (max-w-sm is ~384px)
    content = content.replace(/max-w-lg/g, 'max-w-sm');
    content = content.replace(/max-w-md/g, 'max-w-sm');
    content = content.replace(/max-w-\[400px\]/g, 'max-w-sm');
    content = content.replace(/max-w-\[450px\]/g, 'max-w-sm');
    content = content.replace(/max-w-\[500px\]/g, 'max-w-sm');
    
    // Ensure fully rounded corners
    content = content.replace(/rounded-2xl/g, 'rounded-3xl');

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log('Fixed Drawers/Size in: ', file);
        changedAnyFile = true;
    }
});

if (!changedAnyFile) {
    console.log('No generic themes needed fixing.');
}
