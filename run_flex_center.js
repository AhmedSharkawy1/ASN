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

    // Pattern to match the OLD wrapper
    const pattern = /<>\s*<div className="fixed inset-0 z-\[200\] bg-black\/[0-9]+ backdrop-blur-[A-Za-z-]+" onClick=\{\(\) => setShowBottomCallModal\(false\)\} \/>\s*<motion\.div\s+initial=\{\{ opacity: 0, scale: 0\.95 \}\} animate=\{\{ opacity: 1, scale: 1 \}\} exit=\{\{ opacity: 0, scale: 0\.95 \}\}\s+transition=\{\{ type: 'spring', damping: 25, stiffness: 200 \}\}\s+className="fixed top-1\/2 left-1\/2 -translate-x-1\/2 -translate-y-1\/2 z-\[201\] w-\[92%\] max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden max-h-\[85vh\] flex flex-col"\s*>/;

    const replacement = `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowBottomCallModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-zinc-200 dark:border-white/10"
                            onClick={e => e.stopPropagation()}
                        >`;
                        
    if (c.match(pattern)) {
        c = c.replace(pattern, replacement);
        // also replace the closing `</>` with closing `</motion.div>` for the new wrapper
        // The structure was:
        //        </motion.div>
        //    </>
        // )}
        // Using a more generalized replacement to avoid greedy matching issues:
        // Instead of regex, just find the very next `</>\s*)}` ... wait, the literal `</>` is followed by `)}` 
        c = c.replace(/<\/motion\.div>\s*<\/>\s*\)\}/, '</motion.div>\n                    </motion.div>\n                )}');
    }

    fs.writeFileSync(fp, c, 'utf8');
    console.log('Fixed wrapper in', file);
});

// Also fix the global modal in page.tsx
const globalFp = 'f:/ASN/ASN/src/app/menu/[restaurantId]/page.tsx';
if (fs.existsSync(globalFp)) {
    let gc = fs.readFileSync(globalFp, 'utf8');

    const globalPattern = /<>\s*<div className="fixed inset-0 z-\[200\] bg-black\/[0-9]+ backdrop-blur-[A-Za-z-]+" onClick=\{\(\) => setShowGlobalDeliveryModal\(false\)\} \/>\s*<motion\.div\s+initial=\{\{ opacity: 0, scale: 0\.95 \}\} animate=\{\{ opacity: 1, scale: 1 \}\} exit=\{\{ opacity: 0, scale: 0\.95 \}\}\s+className="fixed top-1\/2 left-1\/2 -translate-x-1\/2 -translate-y-1\/2 z-\[201\] w-\[92%\] max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden max-h-\[85vh\] flex flex-col"\s+onClick=\{e => e\.stopPropagation\(\)\}\s*>/;

    const globalReplacement = `<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setShowGlobalDeliveryModal(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] border border-zinc-200 dark:border-white/10"
            onClick={e => e.stopPropagation()}
          >`;

    if (gc.match(globalPattern)) {
        gc = gc.replace(globalPattern, globalReplacement);
        gc = gc.replace(/<\/motion\.div>\s*<\/>\s*\)\}/, '</motion.div>\n          </motion.div>\n        )}');
    }
    fs.writeFileSync(globalFp, gc, 'utf8');
    console.log('Fixed wrapper in global modal');
}
