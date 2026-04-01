const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');
let count = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const old = content;
    
    const lines = content.split('\n');
    const newLines = lines.map(line => {
        // If this line is the bottom navigation bar inner wrapper, which usually has 'justify-around' and 'rounded-full' or 'rounded-[2.5rem]'
        if (line.includes('justify-around') || line.includes('bottom-0 left-0 right-0')) {
            let fixedLine = line;
            fixedLine = fixedLine.replace(/ max-h-\[45vh\] flex flex-col mx-auto/g, '');
            fixedLine = fixedLine.replace(/ max-h-\[45vh\] flex flex-col/g, '');
            fixedLine = fixedLine.replace(/ flex flex-col max-h-\[45vh\]/g, '');
            fixedLine = fixedLine.replace(/ max-h-\[55vh\] flex flex-col/g, '');
            fixedLine = fixedLine.replace(/ flex flex-col max-h-\[55vh\]/g, '');
            return fixedLine;
        }
        return line;
    });
    content = newLines.join('\n');

    if (old !== content) {
        fs.writeFileSync(file, content, 'utf-8');
        count++;
    }
});
console.log('Fixed accidental horizontal bottom bar flex-col injection globally in', count, 'files');
