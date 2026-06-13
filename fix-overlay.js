const fs = require('fs');

['Theme13Menu.tsx', 'Theme13CyanMenu.tsx', 'Theme13EmeraldMenu.tsx', 'Theme13SkyMenu.tsx'].forEach(f => {
    const p = 'src/components/menu/' + f;
    let c = fs.readFileSync(p, 'utf8');
    
    // Find the overlay block
    const regex = /\{\/\* Action Buttons Overlay \*\/\}.*?<LinkIcon className=\"w-3\.5 h-3\.5\" \/>\s*<\/button>\s*<\/div>/s;
    
    c = c.replace(regex, '');
    
    fs.writeFileSync(p, c);
    console.log('Fixed ' + f);
});
