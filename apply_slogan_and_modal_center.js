const fs = require('fs');
const path = require('path');
const dir = 'f:/ASN/ASN/src/components/menu';
const files = [
    'PizzaPastaMenu.tsx', 'PizzaPastaCyanMenu.tsx', 'PizzaPastaEmeraldMenu.tsx', 'PizzaPastaSkyMenu.tsx',
    'AtyabOrientalMenu.tsx', 'AtyabOrientalCyanMenu.tsx', 'AtyabOrientalEmeraldMenu.tsx', 'AtyabOrientalSkyMenu.tsx'
];

files.forEach(file => {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) return;
    let c = fs.readFileSync(fp, 'utf8');
    
    // 1. Add slogan properties to RestaurantConfig if missing
    if (!c.includes('slogan_ar?: string;')) {
        c = c.replace(/name:\s*string;/, 'name: string;\n    slogan_ar?: string;\n    slogan_en?: string;');
    }

    // 2. Replace hardcoded slogans
    if (file.includes('PizzaPasta')) {
        c = c.replace(/\{isAr \? "مذاق إيطالي أصيل" : "Delicious Italian Taste"\}/g, '{isAr ? (config.slogan_ar || "مذاق إيطالي أصيل") : (config.slogan_en || config.slogan_ar || "Delicious Italian Taste")}');
    } else if (file.includes('AtyabOriental')) {
        c = c.replace(/\{isAr \? "مذاقات أصيلة" : "Authentic Flavors"\}/g, '{isAr ? (config.slogan_ar || "مذاقات أصيلة") : (config.slogan_en || config.slogan_ar || "Authentic Flavors")}');
    }

    // 3. Center the Bottom Delivery Modal
    // This looks for the Delivery Modal's AnimatePresence wrapper specifically, based on previous script insertions
    const modalPrefix = 'BOTTOM NAV DELIVERY MODAL';
    if (c.includes(modalPrefix)) {
        // Change the motion.div animation values
        c = c.replace(
            /initial=\{\{ opacity: 0, y: 100 \}\} animate=\{\{ opacity: 1, y: 0 \}\} exit=\{\{ opacity: 0, y: 100 \}\}/g,
            'initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}'
        );
        // Change the motion.div class to be centered instead of bottom-fixed
        c = c.replace(
            /className="fixed bottom-0 left-0 right-0 z-\[201\] bg-white dark:bg-zinc-900 rounded-t-\[2rem\] shadow-2xl overflow-hidden max-h-\[70vh\]"/g,
            'className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[201] w-[92%] max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"'
        );
        
        // Remove the top drag handle
        c = c.replace(
            /<div className="flex justify-center pt-3 pb-1">\s*<div className="w-10 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" \/>\s*<\/div>/g,
            ''
        );
    }
    
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Processed', file);
});
