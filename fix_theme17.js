const fs = require('fs');
const p = 'f:/ASN/ASN/src/components/menu/Theme17Menu.tsx';
let txt = fs.readFileSync(p, 'utf8');

txt = txt.replace(/\\`/g, '`');
txt = txt.replace(/\\\$/g, '$');
txt = txt.replace(/\\\{/g, '{');
txt = txt.replace(/\\\\n/g, '\\n');
txt = txt.replace(/\\\\\+/g, '\\+'); 

fs.writeFileSync(p, txt);
console.log('Fixed file');
