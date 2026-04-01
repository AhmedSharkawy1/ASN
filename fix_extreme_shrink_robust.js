const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/components/menu/*Menu.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // 1. Force shrink width on ANY modal or popup container
    content = content.replace(/max-w-xl/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-lg/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-md/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-sm/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-\[500px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-\[450px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-\[400px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-\[384px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-\[340px\]/g, 'max-w-[310px] w-[88vw]');

    // 2. Force shrink height 
    content = content.replace(/max-h-\[90vh\]/g, 'max-h-[55vh]');
    content = content.replace(/max-h-\[85vh\]/g, 'max-h-[55vh]');
    content = content.replace(/max-h-\[82vh\]/g, 'max-h-[55vh]');
    content = content.replace(/max-h-\[80vh\]/g, 'max-h-[55vh]');
    content = content.replace(/max-h-\[75vh\]/g, 'max-h-[55vh]');
    content = content.replace(/max-h-\[70vh\]/g, 'max-h-[55vh]');

    // 3. Fix the giant image headers inside Atyab and PizzaPasta
    // PizzaPasta might use h-48 or h-[200px]
    content = content.replace(/h-48/g, 'h-32');
    content = content.replace(/h-\[200px\]/g, 'h-[130px]');
    content = content.replace(/h-\[180px\]/g, 'h-[130px]');
    content = content.replace(/h-\[250px\]/g, 'h-[130px]');
    
    // Smooth padding
    content = content.replace(/py-12 px-6 sm:py-16 sm:px-10/g, 'p-6 sm:p-8');
    content = content.replace(/p-8 sm:p-12 md:p-16/g, 'p-6 sm:p-8');
    
    // Ensure Cart Modal wrapper is flex-centered
    content = content.replace(/fixed inset-0 z-\[100\] flex flex-col/g, 'fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 sm:p-8');

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        changedAnyFile = true;
    }
});

// Also manually touch PizzaPasta and Atyab files in case they use different spacing
const pizzas = glob.sync('src/components/menu/PizzaPasta*Menu.tsx');
pizzas.forEach(file => {
   let content = fs.readFileSync(file, 'utf-8');
   content = content.replace(/w-full max-w-xl/g, 'w-full max-w-[310px] w-[88vw]');
   fs.writeFileSync(file, content, 'utf-8');
});

const checkoutPath = 'src/components/menu/CheckoutModal.tsx';
if (fs.existsSync(checkoutPath)) {
    let content = fs.readFileSync(checkoutPath, 'utf-8');
    content = content.replace(/max-w-\[360px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-\[340px\]/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-w-sm/g, 'max-w-[310px] w-[88vw]');
    content = content.replace(/max-h-\[75vh\]/g, 'max-h-[55vh]');
    content = content.replace(/py-12 px-6 sm:py-16 sm:px-10/g, 'p-6 sm:p-8');
    fs.writeFileSync(checkoutPath, content, 'utf-8');
}

if (changedAnyFile) {
    console.log('Fixed Extreme Shrink for ALL variations including PizzaPasta.');
} else {
    console.log('No files needed fixing.');
}
