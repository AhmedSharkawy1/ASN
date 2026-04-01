const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    // CLEAN ALL THE MESSED UP WIDTH/HEIGHT CLASSES
    content = content.replace(/w-full max-w-\[310px\] w-\[88vw\]/g, 'w-[85vw] max-w-[310px]');
    content = content.replace(/max-w-\[310px\] w-\[88vw\]/g, 'w-[85vw] max-w-[310px]');
    content = content.replace(/w-full max-w-\[340px\]/g, 'w-[85vw] max-w-[310px]');
    content = content.replace(/max-w-\[340px\] w-full/g, 'w-[85vw] max-w-[310px]');
    
    // Ensure the container actually has max-h-[55vh]
    content = content.replace(/max-h-\[60vh\]/g, 'max-h-[55vh]');
    
    fs.writeFileSync(file, content, 'utf-8');
});

const checkout = 'src/components/menu/CheckoutModal.tsx';
if (fs.existsSync(checkout)) {
    let c = fs.readFileSync(checkout, 'utf-8');
    c = c.replace(/relative w-full max-w-\[310px\]/g, 'relative w-[85vw] max-w-[310px]');
    c = c.replace(/max-h-\[60vh\]/g, 'max-h-[55vh]');
    fs.writeFileSync(checkout, c, 'utf-8');
}
