const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components', 'menu');
let fixedCount = 0;

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const basename = path.basename(filePath);
    
    if (!content.includes('absolute top-full')) return;
    
    let modified = false;

    // ==================== PATTERN 1: Theme10/11/13 style ====================
    // isPhoneMenuOpen with absolute top-full
    if (content.includes('isPhoneMenuOpen') && content.includes('absolute top-full')) {
        // Step 1: Replace "absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48" with centered fixed
        const oldClass = 'absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 py-2 z-[110] overflow-hidden';
        const newClass = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[310px] bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-2xl border border-gray-100 dark:border-slate-700 py-2 z-[300] overflow-hidden';
        
        if (content.includes(oldClass)) {
            content = content.replace(oldClass, newClass);
            modified = true;
        }

        // Also try the other variant (Theme13)
        const oldClass2 = 'absolute top-full mt-2 left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-auto md:right-0 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-[0_5px_20px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-slate-700 py-2 z-[110] overflow-hidden';
        const newClass2 = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[310px] bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-2xl border border-gray-100 dark:border-slate-700 py-2 z-[300] overflow-hidden';
        
        if (content.includes(oldClass2)) {
            content = content.replace(oldClass2, newClass2);
            modified = true;
        }

        // Step 2: Add backdrop overlay - insert before the motion.div
        if (modified) {
            // Find "{isPhoneMenuOpen && (" and add backdrop after it
            content = content.replace(
                /(\{isPhoneMenuOpen && \(\r?\n)([\s]*<motion\.div)/g,
                '$1                                            <>\r\n                                            <div className="fixed inset-0 z-[299] bg-black/40 backdrop-blur-[4px]" onClick={() => setIsPhoneMenuOpen(false)} />\r\n$2'
            );

            // Step 3: Add </> before the closing
            content = content.replace(
                /(<\/motion\.div>\r?\n[\s]*\)\}\r?\n[\s]*<\/AnimatePresence>\r?\n[\s]*<\/div>\r?\n[\s]*\)\})/g,
                (match) => {
                    return match.replace('</motion.div>', '</motion.div>\r\n                                            </>');
                }
            );
        }
    }

    // ==================== PATTERN 2: PizzaPasta style ====================
    // showCallMenu with absolute top-full
    if (content.includes('showCallMenu') && content.includes('absolute top-full mt-3 left-0 right-0')) {
        const oldPizzaClass = 'absolute top-full mt-3 left-0 right-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden animate-slideUp z-50';
        const newPizzaClass = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85vw] max-w-[310px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-[1.5rem] shadow-2xl overflow-hidden z-[300]';

        if (content.includes(oldPizzaClass)) {
            content = content.replace(oldPizzaClass, newPizzaClass);
            modified = true;

            // Add backdrop overlay before the div
            content = content.replace(
                /(\{showCallMenu && \(\r?\n)([\s]*<div className="fixed top-1\/2)/g,
                '$1                                    <>\r\n                                    <div className="fixed inset-0 z-[299] bg-black/40 backdrop-blur-[4px]" onClick={() => setShowCallMenu(false)} />\r\n$2'
            );

            // Add </> closing fragment - find the </div> that closes the phone numbers dropdown
            // The pattern in PizzaPasta is: map -> </a> ))} </div> )}
            // We need </div> </> )}
            content = content.replace(
                /(\)\)\}\r?\n[\s]*<\/div>\r?\n)([\s]*\)\}[\s\r\n]*<\/AnimatePresence>)/g,
                (match, closingDiv, afterClose) => {
                    return closingDiv + '                                    </>\r\n' + afterClose;
                }
            );
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${basename}`);
        fixedCount++;
    }
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
for (const file of files) {
    processFile(path.join(dir, file));
}

console.log(`\nDone! Fixed ${fixedCount} files.`);
