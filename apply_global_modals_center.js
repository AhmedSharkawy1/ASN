const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/components/menu/*Menu.tsx');

let changedAnyFile = false;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    const oldContent = content;

    // 1. Fix the modal backdrops for ALL modals
    // Look for <motion.div ... className="fixed inset-0 ... bg-black/... (without modifying the very first motion.div definition entirely)
    // Actually, it's safer to target the specific classes.
    
    // First, convert any items-end or items-start to items-center everywhere in 'fixed inset-0' overlays
    content = content.replace(/className=\"fixed inset-0[^"]*flex[^"]*bg-black\/[0-9]+[^"]*\"/g, (match) => {
        let classes = match.substring(11, match.length - 1); // Extract inner string
        
        // Remove old positioning
        classes = classes.replace(/\s*sm:items-center\s*/g, ' ')
                         .replace(/\s*md:items-center\s*/g, ' ')
                         .replace(/\s*items-end\s*/g, ' ')
                         .replace(/\s*items-start\s*/g, ' ');
                         
        classes = classes.replace(/\s*sm:justify-center\s*/g, ' ')
                         .replace(/\s*md:justify-center\s*/g, ' ')
                         .replace(/\s*justify-end\s*/g, ' ')
                         .replace(/\s*justify-start\s*/g, ' ');
                         
        // Ensure items-center justify-center
        if (!classes.includes('items-center')) classes += ' items-center';
        if (!classes.includes('justify-center')) classes += ' justify-center';

        // Add blur (ضبابية)
        classes = classes.replace(/\s*backdrop-blur-[a-z]+\s*/g, ' ');
        if (!classes.includes('backdrop-blur')) classes += ' backdrop-blur-md';

        // Fix margins (هوامش)
        classes = classes.replace(/\s*p-[0-9]+\s*/g, ' ').replace(/\s*sm:p-[0-9]+\s*/g, ' ').replace(/\s*md:p-[0-9]+\s*/g, ' ').replace(/\s*lg:p-[0-9]+\s*/g, ' ');
        classes += ' p-6 sm:p-8 md:p-12 mb-safe';

        return `className="${classes.replace(/\s+/g, ' ').trim()}"`;
    });

    // 2. Change the Slide-Up animation (y: "100%") to Scale/Fade Popup Animation
    // For nested motion.div components
    content = content.replace(/initial=\{\{\s*y:\s*[\"']100%[\"']\s*\}\}\s*animate=\{\{\s*y:\s*0\s*\}\}\s*exit=\{\{\s*y:\s*[\"']100%[\"']\s*\}\}/g, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );
    
    // Some might have string values or different spacing
    content = content.replace(/initial=\{\{\s*y:\s*\"100%\"\s*\}\}\s*animate=\{\{\s*y:\s*0\s*\}\}\s*exit=\{\{\s*y:\s*\"100%\"\s*\}\}/gi, 
        'initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}'
    );

    // 3. Ensure NO rounded corners are just rounded-t- (make them fully rounded since it's a popup, not a bottom sheet)
    content = content.replace(/rounded-t-\[.*?\]/g, 'rounded-[2rem]');
    content = content.replace(/sm:rounded-\[.*?\]/g, 'rounded-[2rem]');
    content = content.replace(/md:rounded-\[.*?\]/g, 'rounded-[2rem]');
    content = content.replace(/rounded-t-3xl/g, 'rounded-[2rem]');
    content = content.replace(/rounded-t-2xl/g, 'rounded-2xl');
    
    // Also, PizzaPasta's original rounded-[2.5rem] is fine, we leave it alone if it's already fully rounded.

    if (content !== oldContent) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log('Fixed Modals in: ', file);
        changedAnyFile = true;
    }
});

if (!changedAnyFile) {
    console.log('No changes were needed. All modals are already centered popups.');
} else {
    console.log('Finished updating all menu modals to fully centered popups with blur and margins.');
}
