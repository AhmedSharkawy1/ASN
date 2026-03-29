const fs = require('fs');
const path = require('path');
const dir = 'f:/ASN/ASN/src/components/menu';
const files = [
    'PizzaPastaMenu.tsx', 'PizzaPastaCyanMenu.tsx', 'PizzaPastaEmeraldMenu.tsx', 'PizzaPastaSkyMenu.tsx'
];

files.forEach(file => {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) return;
    let c = fs.readFileSync(fp, 'utf8');

    // Replace the corrupted `</>` closing tag with `</motion.div>` right before `CHECKOUT MODAL`
    // The broken code looks like:
    //                         </motion.div>
    //                                     </>
    //                                 )}
    //             </AnimatePresence>
    //
    //             {/* ===== CHECKOUT MODAL ===== */}
    
    // We will find exactly that block using a reliable matching method that doesn't consume all files
    c = c.replace(
        /<\/motion\.div>\s*<\/>\s*\)\}\s*<\/AnimatePresence>\s*\{\/\* ===== CHECKOUT/,
        '</motion.div>\n                    </motion.div>\n                )}\n            </AnimatePresence>\n\n            {/* ===== CHECKOUT'
    );

    fs.writeFileSync(fp, c, 'utf8');
    console.log('Fixed', file);
});
