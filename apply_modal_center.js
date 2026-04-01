const fs = require('fs');

const themes = [
  'AtyabOrientalMenu', 'AtyabOrientalCyanMenu', 'AtyabOrientalEmeraldMenu', 'AtyabOrientalSkyMenu',
  'AtyabEtoileMenu', 'AtyabEtoileCyanMenu', 'AtyabEtoileEmeraldMenu', 'AtyabEtoileSkyMenu',
  'PizzaPastaMenu', 'PizzaPastaCyanMenu', 'PizzaPastaEmeraldMenu', 'PizzaPastaSkyMenu',
  'Theme16Menu'
];

themes.forEach(theme => {
    const file = `src/components/menu/${theme}.tsx`;
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf-8');
        let initialContent = content;
        
        // Target: <motion.div ... className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
        // Target: <motion.div ... className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 sm:p-6"
        
        // 1. Force centering on ALL popups (items-center) instead of mostly items-end.
        // We look for 'fixed inset-0' and ensure it has 'items-center', 'backdrop-blur-md', and margins.
        content = content.replace(/className=\"fixed inset-0[^"]*flex[^"]*bg-black\/[0-9]+[^"]*\"/g, (match) => {
            let classes = match.substring(11, match.length - 1); // remove className=" and trailing "
            
            // Remove old flex alignment
            classes = classes.replace(/\s*sm:items-center\s*/g, ' ').replace(/\s*md:items-center\s*/g, ' ').replace(/\s*items-end\s*/g, ' ').replace(/\s*items-center\s*/g, ' ');
            classes = classes.replace(/\s*sm:justify-center\s*/g, ' ').replace(/\s*md:justify-center\s*/g, ' ').replace(/\s*justify-end\s*/g, ' ').replace(/\s*justify-center\s*/g, ' ').replace(/\s*justify-start\s*/g, ' ');

            // Ensure blur (ضبابية)
            classes = classes.replace(/\s*backdrop-blur-[a-z]+\s*/g, ' ');

            // Ensure margins on all sides (هوامش في كل الاجناب)
            classes = classes.replace(/\s*sm:p-[0-9]+\s*/g, ' ').replace(/\s*md:p-[0-9]+\s*/g, ' ').replace(/\s*lg:p-[0-9]+\s*/g, ' ');

            // Append exactly what the user wants: Center, Blur, Margins.
            // Using sm:p-10 md:p-16 creates visible margins on all sides on screens that can support it, matching PizzaPasta.
            // But actually he just wants "هوامش في كل الاجناب", p-6 is standard for all sides.
            classes = classes.trim();
            
            return `className="${classes} items-center justify-center backdrop-blur-md p-6 sm:p-8 md:p-12 mb-safe"`;
        });
        
        // Remove rounded-t- classes which make it look like a bottom sheet
        content = content.replace(/rounded-t-\[.*?\]/g, 'rounded-[2rem]');
        content = content.replace(/sm:rounded-\[.*?\]/g, 'rounded-[2rem]');
        content = content.replace(/rounded-t-3xl/g, 'rounded-3xl');
        content = content.replace(/rounded-t-2xl/g, 'rounded-2xl');

        // Also fix any hardcoded max-height that causes the modal to be cut off
        content = content.replace(/max-h-\[90vh\]/g, 'max-h-[85vh]');
        
        // If content changed, save it
        if (content !== initialContent) {
            fs.writeFileSync(file, content, 'utf-8');
            console.log('Fixed Modals in: ', theme);
        }
    } else {
        console.log('File not found: ', file);
    }
});
