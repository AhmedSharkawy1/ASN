const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // 1. Target any numeric y values like y: 100, y: 200, y: 50 in initial, animate, exit
    // Specifically looking for motion.div initial={{ y: 100, opacity: 0 }} etc
    content = content.replace(/initial=\{\{\s*(?:y:\s*[0-9]+|opacity:\s*[0-9.]+),\s*(?:opacity:\s*[0-9.]+|y:\s*[0-9]+)\s*\}\}\s*animate=\{\{\s*(?:y:\s*0|opacity:\s*[0-9.]+),\s*(?:opacity:\s*[0-9.]+|y:\s*0)\s*\}\}\s*exit=\{\{\s*(?:y:\s*[0-9]+|opacity:\s*[0-9.]+),\s*(?:opacity:\s*[0-9.]+|y:\s*[0-9]+)\s*\}\}/g, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );
    
    // Some are ordered scale, y, etc. The safest way is to replace typical initial={{ y: 100, opacity: 0 }} ...
    content = content.replace(/initial=\{\{\s*y:\s*100,\s*opacity:\s*0\s*\}\}\s*animate=\{\{\s*y:\s*0,\s*opacity:\s*1\s*\}\}\s*exit=\{\{\s*y:\s*100,\s*opacity:\s*0\s*\}\}/g, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );
    
    content = content.replace(/initial=\{\{\s*y:\s*200,\s*opacity:\s*0\s*\}\}\s*animate=\{\{\s*y:\s*0,\s*opacity:\s*1\s*\}\}\s*exit=\{\{\s*y:\s*200,\s*opacity:\s*0\s*\}\}/g, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );

    // Some have initial={{ opacity: 0, y: 100 }}...
    content = content.replace(/initial=\{\{\s*opacity:\s*0,\s*y:\s*100\s*\}\}\s*animate=\{\{\s*opacity:\s*1,\s*y:\s*0\s*\}\}\s*exit=\{\{\s*opacity:\s*0,\s*y:\s*100\s*\}\}/g, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );

    // 2. Fix flex-col in fixed inset-0 wrappers
    content = content.replace(/className=\"fixed inset-0[^"]*flex[^"]*bg-black\/[0-9]+[^"]*\"/g, (match) => {
        let classes = match.substring(11, match.length - 1);
        classes = classes.replace(/\s*flex-col\s*/g, ' ').replace(/\s*items-end\s*/g, ' ').replace(/\s*items-start\s*/g, ' ');
        if (!classes.includes('items-center')) classes += ' items-center';
        if (!classes.includes('justify-center')) classes += ' justify-center';
        return `className="${classes.replace(/\s+/g, ' ').trim()}"`;
    });

    // 3. Remove mt-auto which forces modals down even if they are in items-center
    content = content.replace(/\s*mt-auto\s*/g, ' ');
    content = content.replace(/\s*md:mt-0\s*/g, ' ');

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log('Fixed Modals numeric Y in: ', file);
        changedAnyFile = true;
    }
});

if (!changedAnyFile) {
    console.log('No additional fixes needed.');
}
