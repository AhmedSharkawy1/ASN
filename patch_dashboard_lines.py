import codecs

dash_path = r'f:\ASN\ASN\src\app\dashboard\menu\page.tsx'
with codecs.open(dash_path, 'r', 'utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'input type="number" value={p || \'\'}' in line:
        # It's line 728
        lines[i] = '                            <input type="number" value={p || \'\'} onChange={e => { const np = [...prices]; np[idx] = parseFloat(e.target.value) || 0; setPrices(np); }}\n'
        lines[i+1] = '                                placeholder="0" className="w-20 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border -blue outline-none text-base font-bold tabular-nums text-center" dir="ltr" />\n                            <input type="number" value={oldPrices[idx] || \'\'} onChange={e => { const no = [...oldPrices]; no[idx] = parseFloat(e.target.value) || 0; setOldPrices(no); }}\n                                placeholder={language === "ar" ? "بدل" : "Old"} className="w-16 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border -blue outline-none text-sm font-bold tabular-nums text-center text-red-500" dir="ltr" />\n'
    elif 'input type="number" value={price}' in line:
        # It's line 1022
        lines[i] = '                        <input type="number" value={price} onChange={e => { const np = [...localPrices]; np[idx] = parseFloat(e.target.value) || 0; setLocalPrices(np); }}\n'
        lines[i+1] = '                            className="w-16 sm:w-20 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm sm:text-base font-bold tabular-nums text-center" dir="ltr" />\n                        <input type="number" value={localOldPrices[idx] || \'\'} onChange={e => { const no = [...localOldPrices]; no[idx] = parseFloat(e.target.value) || 0; setLocalOldPrices(no); }}\n                            placeholder={language === "ar" ? "بدل" : "Old"} className="w-16 sm:w-20 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm font-bold tabular-nums text-center text-red-500" dir="ltr" />\n'

with codecs.open(dash_path, 'w', 'utf-8') as f:
    f.writelines(lines)

print("Line-by-line patch applied.")
