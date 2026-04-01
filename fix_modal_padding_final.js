const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // 1. Shrink maximum width
    content = content.replace(/w-full max-w-sm/g, 'w-full max-w-[340px]');
    content = content.replace(/max-w-sm w-full/g, 'max-w-[340px] w-full');
    content = content.replace(/max-w-\[400px\]/g, 'max-w-[340px]');
    content = content.replace(/max-w-\[384px\]/g, 'max-w-[340px]');
    content = content.replace(/max-w-\[350px\]/g, 'max-w-[340px]');
    
    // 2. Increase margins (padding on the overlay container)
    // currently: p-6 sm:p-8 md:p-12
    content = content.replace(/p-6 sm:p-8 md:p-12/g, 'p-8 sm:p-12 md:p-16');
    // currently just: p-6
    content = content.replace(/backdrop-blur-md p-6/g, 'backdrop-blur-md p-8 sm:p-12');
    content = content.replace(/backdrop-blur-sm p-6/g, 'backdrop-blur-sm p-8 sm:p-12');
    content = content.replace(/backdrop-blur-md\s+items-center/g, 'backdrop-blur-md p-8 sm:p-12 items-center');
    content = content.replace(/backdrop-filter:\s*blur\(8px\);\s*padding:\s*1rem;/g, 
        'backdrop-filter: blur(8px); padding: 2rem;'
    );
    
    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log('Fixed Modal Padding in: ', file);
        changedAnyFile = true;
    }
});

// Fix CheckoutModal too
const checkoutPath = 'src/components/menu/CheckoutModal.tsx';
if (fs.existsSync(checkoutPath)) {
    let content = fs.readFileSync(checkoutPath, 'utf-8');
    const oldContent = content;
    content = content.replace(/w-full max-w-sm/g, 'w-[90vw] max-w-[360px]');
    content = content.replace(/p-6 sm:p-8 md:p-12/g, 'p-8 sm:p-12 md:p-16');
    if (content !== oldContent) {
        fs.writeFileSync(checkoutPath, content, 'utf-8');
        console.log('Fixed Modal Padding in: ', checkoutPath);
        changedAnyFile = true;
    }
}

if (!changedAnyFile) {
    console.log('No themes needed fixing.');
}
