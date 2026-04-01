const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // 1. Extreme max-height and max-width limit on the modal
    content = content.replace(/max-w-\[340px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-h-\[75vh\]/g, 'max-h-[55vh]');
    content = content.replace(/max-h-\[85vh\]/g, 'max-h-[55vh]');
    content = content.replace(/max-h-\[65vh\]/g, 'max-h-[55vh]');

    // 2. Shrink the huge hero image height inside the modal so it doesn't take up the whole 55vh!
    content = content.replace(/h-\[200px\] (?:sm:)?h-\[180px\]/g, 'h-[140px]');
    content = content.replace(/h-\[180px\] (?:sm:)?h-\[160px\]/g, 'h-[140px]');

    // 3. Reset the wrapper padding to be reasonable, as max-h/max-w does the real centering job
    content = content.replace(/py-12 px-6(?: sm:py-16 sm:px-10)?/g, 'p-6 sm:p-8');

    // 4. In case the modal container isn't flex-col properly, ensure the footer is sticky or inside
    // No action needed for this if it's already structured well.

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        changedAnyFile = true;
    }
});

// Fix CheckoutModal too!
const checkoutPath = 'src/components/menu/CheckoutModal.tsx';
if (fs.existsSync(checkoutPath)) {
    let content = fs.readFileSync(checkoutPath, 'utf-8');
    const oldContent = content;
    
    // max size
    content = content.replace(/max-w-\[360px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-h-\[75vh\]/g, 'max-h-[60vh]');
    
    // padding back to safety
    content = content.replace(/py-12 px-6 sm:py-16 sm:px-10/g, 'p-6 sm:p-8');
    
    if (content !== oldContent) {
        fs.writeFileSync(checkoutPath, content, 'utf-8');
        changedAnyFile = true;
    }
}

if (!changedAnyFile) {
    console.log('No files needed fixing.');
} else {
    console.log('Fixed Extreme Shrink');
}
