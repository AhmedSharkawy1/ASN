const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // 1. Max Height Shrinking (Top/Bottom Margins)
    content = content.replace(/max-h-\[85vh\]/g, 'max-h-[75vh]');
    content = content.replace(/max-h-\[90vh\]/g, 'max-h-[75vh]');
    content = content.replace(/max-h-\[80vh\]/g, 'max-h-[75vh]');
    
    // 2. Adjust internal paddings to better fit the smaller modal
    content = content.replace(/p-6 sm:p-8 md:p-12/g, 'py-12 px-6 sm:p-12 md:p-16');
    content = content.replace(/p-8 sm:p-12 md:p-16 mb-safe/g, 'py-12 px-6 sm:py-16 sm:px-10 mb-safe');
    
    // 3. Shrink massive text and paddings inside the modal content
    content = content.replace(/p-5 pb-24/g, 'p-4 pb-20');
    content = content.replace(/p-5 border-b/g, 'p-4 border-b');
    content = content.replace(/p-5 shadow-/g, 'p-4 shadow-');
    
    content = content.replace(/text-2xl sm:text-3xl font-black/g, 'text-xl sm:text-2xl font-black');
    content = content.replace(/text-xl font-bold flex items-center/g, 'text-lg font-bold flex items-center');

    // 4. Shrink button sizes in sticky footers
    content = content.replace(/h-14 rounded-full text-white font-bold text-lg/g, 'h-11 rounded-full text-white font-bold text-base');
    content = content.replace(/h-12 rounded-full text-white/g, 'h-11 rounded-full text-white');
    content = content.replace(/h-12 rounded-xl text-white/g, 'h-11 rounded-xl text-white');
    
    // Decrease header icon size if too big
    content = content.replace(/w-10 h-10 flex/g, 'w-9 h-9 flex');
    content = content.replace(/w-12 h-12 flex/g, 'w-10 h-10 flex');

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log('Fixed Vertical/Sizes in: ', file);
        changedAnyFile = true;
    }
});

// Fix CheckoutModal too!
const checkoutPath = 'src/components/menu/CheckoutModal.tsx';
if (fs.existsSync(checkoutPath)) {
    let content = fs.readFileSync(checkoutPath, 'utf-8');
    const oldContent = content;
    
    content = content.replace(/max-h-\[85vh\]/g, 'max-h-[75vh]');
    content = content.replace(/max-h-\[90vh\]/g, 'max-h-[75vh]');
    // Margins
    content = content.replace(/p-8 sm:p-12 md:p-16 mb-safe/g, 'py-12 px-6 sm:py-16 sm:px-10 mb-safe');
    // Button heights
    content = content.replace(/h-14/g, 'h-11');
    content = content.replace(/h-12/g, 'h-11');
    content = content.replace(/text-lg font-bold transition-transform/g, 'text-base font-bold transition-transform');
    // texts
    content = content.replace(/text-xl font-black/g, 'text-lg font-black');
    
    if (content !== oldContent) {
        fs.writeFileSync(checkoutPath, content, 'utf-8');
        console.log('Fixed Vertical/Sizes in: ', checkoutPath);
        changedAnyFile = true;
    }
}

if (!changedAnyFile) {
    console.log('No files needed fixing.');
}
