const fs = require('fs');
const path = require('path');
const dir = 'f:/ASN/ASN/src/components/menu';
const files = [
    'AtyabOrientalMenu.tsx', 'AtyabOrientalCyanMenu.tsx', 'AtyabOrientalEmeraldMenu.tsx', 'AtyabOrientalSkyMenu.tsx',
    'AtyabEtoileMenu.tsx', 'AtyabEtoileCyanMenu.tsx', 'AtyabEtoileEmeraldMenu.tsx', 'AtyabEtoileSkyMenu.tsx'
];

files.forEach(file => {
    const fp = path.join(dir, file);
    if (!fs.existsSync(fp)) return;
    let c = fs.readFileSync(fp, 'utf8');

    // Currently `showBottomCallModal` looks like:
    // ...
    //   </motion.div>
    // </>
    // )}
    //
    // But it was replaced at the top with:
    // <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} ...>
    //  <motion.div ...>
    // 
    // Meaning the `</>` needs to be `</motion.div>`
    // The pattern is: `</motion.div>` followed by white space then `</>` followed by whitespace then `)}` followed by `</AnimatePresence>` 
    // Wait, let's just find that block before `<ASNFooter />`, which is right after `showBottomCallModal`.
    
    // Using a regex to match precisely the end of `showBottomCallModal`
    const pattern = /<\/motion\.div>\s*<\/>\s*\)\}\s*<\/AnimatePresence>\s*<ASNFooter \/>/;
    const replacement = '</motion.div>\n                    </motion.div>\n                )}\n            </AnimatePresence>\n\n\n\n            <ASNFooter />';
    
    c = c.replace(pattern, replacement);

    fs.writeFileSync(fp, c, 'utf8');
    console.log('Fixed', file);
});
