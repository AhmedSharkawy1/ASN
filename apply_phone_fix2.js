const fs = require('fs');
const path = require('path');

const dir = 'f:/ASN/ASN/src/components/menu';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

let count = 0;

for (const file of files) {
    const fp = path.join(dir, file);
    let content = fs.readFileSync(fp, 'utf8');
    const original = content;

    // Only process files that have config.phones (the old pattern)
    if (!content.includes('config.phones')) continue;

    // 1. Replace the condition: (config.phone || (config.phones && config.phones.length > 0))
    //    with: (config.phone_numbers && config.phone_numbers.length > 0)
    content = content.replace(
        /\(config\.phone\s*\|\|\s*\(config\.phones\s*&&\s*config\.phones\.length\s*>\s*0\)\)/g,
        '(config.phone_numbers && config.phone_numbers.length > 0)'
    );

    // 2. Replace the dropdown content ternary:
    //    {config.phones && config.phones.length > 0 ? (
    //        config.phones.map(...)
    //    ) : (
    //        <a href={`tel:${config.phone}`}>..config.phone..</a>
    //    )}
    // With just phone_numbers.map
    const dropdownRegex = /\{config\.phones\s*&&\s*config\.phones\.length\s*>\s*0\s*\?\s*\(\s*config\.phones\.map\(\(phoneNum:\s*string,\s*idx:\s*number\)\s*=>\s*\(\s*<a\s*\n?\s*key=\{idx\}\s*\n?\s*href=\{`tel:\$\{phoneNum\}`\}\s*\n?\s*className="([^"]*)"\s*\n?\s*>\s*\n?\s*\{phoneNum\}\s*\n?\s*<\/a>\s*\n?\s*\)\)\s*\)\s*:\s*\(\s*<a\s*\n?\s*href=\{`tel:\$\{config\.phone\}`\}\s*\n?\s*className="([^"]*)"\s*\n?\s*>\s*\n?\s*\{config\.phone\}\s*\n?\s*<\/a>\s*\n?\s*\)\}/gs;

    content = content.replace(dropdownRegex, (match, cls1) => {
        return `{config.phone_numbers?.map((pn: {label?: string; number: string}, idx: number) => (
                                                    <a
                                                        key={idx}
                                                        href={\`tel:\${pn.number}\`}
                                                        className="${cls1}"
                                                    >
                                                        {pn.label || pn.number}
                                                    </a>
                                                ))}`;
    });

    // 3. Also check for bottom bar phone buttons that use config.phones
    // Replace: config.phones && config.phones.length > 0 (standalone in conditions)
    content = content.replace(/config\.phones\s*&&\s*config\.phones\.length\s*>\s*0/g, 
        'config.phone_numbers && config.phone_numbers.length > 0');

    // 4. Replace remaining config.phones.map references
    content = content.replace(/config\.phones\.map\(\(phoneNum:\s*string,\s*idx:\s*number\)/g,
        'config.phone_numbers?.map((pn: {label?: string; number: string}, idx: number)');

    if (content !== original) {
        fs.writeFileSync(fp, content, 'utf8');
        count++;
        console.log('Fixed:', file);
    }
}
console.log('Total updated:', count);
