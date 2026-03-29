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

    // The error was created when I did:
    // c.replace(/<\/motion\.div>\s*<\/>\s*\)\}/, '</motion.div>\\n                    </motion.div>\\n                )}');
    // Which replaced the FIRST instance. This corrupted `showCallMenu` modal's fragment `</>`.
    
    // To fix it, any `showCallMenu` that now looks like:
    // </motion.div>
    // </motion.div>
    // )}
    // Needs to be reverted to:
    // </motion.div>
    // </>
    // )}
    
    // Let's identify the end of showCallMenu.
    // It's followed by `</AnimatePresence>` and then usually the facebook button or something.
    // The buggy part literally says `</motion.div>\n                    </motion.div>\n                )}` in the middle of where `</>` should be!
    
    // Let's just fix the very first instance of `</motion.div>\n                    </motion.div>\n                )}` 
    // IF the file has a mismatched `<>` ... 
    // Let's be smart. The top header modal `showCallMenu` ALWAYS starts with ` {showCallMenu && ( <> `
    c = c.replace(
        /\{showCallMenu\s*&&\s*\(\s*<>\s*([\s\S]*?)<\/motion\.div>\s*<\/motion\.div>\s*\)\}/,
        '{showCallMenu && (\n                                    <>\n$1</motion.div>\n                                    </>\n                                )}'
    );

    fs.writeFileSync(fp, c, 'utf8');
    console.log('Fixed', file);
});
