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

    // Make the modal look much better centered
    c = c.replace(
        /<div className="px-5 pb-3 pt-1 flex items-center justify-between/g,
        '<div className="px-5 pb-4 pt-5 flex items-center justify-between'
    );
    
    // Add backdrop-blur to the inset
    c = c.replace(
        /className="fixed inset-0 z-\[200\] bg-black\/50 backdrop-blur-sm"/g,
        'className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md"'
    );
    
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Fixed padding in', file);
});
