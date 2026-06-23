import codecs

dash_path = r'f:\ASN\ASN\src\app\dashboard\menu\page.tsx'
with codecs.open(dash_path, 'r', 'utf-8') as f:
    dash_content = f.read()

# 1. AddItemPanel
add_item_ui_old = """                            <input type="number" value={p || ''} onChange={e => { const np = [...prices]; np[idx] = parseFloat(e.target.value) || 0; setPrices(np); }}
                                placeholder="0" className="w-24 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border -blue outline-none text-base font-bold tabular-nums text-center" dir="ltr" />
                            <span className="text-sm text-silver">{currency || (language === "ar" ? "ج.م" : "EGP")}</span>"""

add_item_ui_new = """                            <input type="number" value={p || ''} onChange={e => { const np = [...prices]; np[idx] = parseFloat(e.target.value) || 0; setPrices(np); }}
                                placeholder="0" className="w-20 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border -blue outline-none text-base font-bold tabular-nums text-center" dir="ltr" />
                            <input type="number" value={oldPrices[idx] || ''} onChange={e => { const no = [...oldPrices]; no[idx] = parseFloat(e.target.value) || 0; setOldPrices(no); }}
                                placeholder={language === "ar" ? "بدل كام" : "Old"} className="w-20 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border -blue outline-none text-sm font-bold tabular-nums text-center text-red-500" dir="ltr" />
                            <span className="text-sm text-silver">{currency || (language === "ar" ? "ج.م" : "EGP")}</span>"""

if add_item_ui_old in dash_content:
    dash_content = dash_content.replace(add_item_ui_old, add_item_ui_new)
else:
    print("WARNING: AddItemPanel block not found!")

# 2. ItemEditor
edit_item_ui_old = """                        <input type="number" value={price} onChange={e => { const np = [...localPrices]; np[idx] = parseFloat(e.target.value) || 0; setLocalPrices(np); }}
                            className="w-20 sm:w-24 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm sm:text-base font-bold tabular-nums text-center" dir="ltr" />
                        <span className="text-xs sm:text-sm text-silver">{currency || (language === "ar" ? "ج.م" : "EGP")}</span>"""

edit_item_ui_new = """                        <input type="number" value={price} onChange={e => { const np = [...localPrices]; np[idx] = parseFloat(e.target.value) || 0; setLocalPrices(np); }}
                            className="w-16 sm:w-20 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm sm:text-base font-bold tabular-nums text-center" dir="ltr" />
                        <input type="number" value={localOldPrices[idx] || ''} onChange={e => { const no = [...localOldPrices]; no[idx] = parseFloat(e.target.value) || 0; setLocalOldPrices(no); }}
                            placeholder={language === "ar" ? "بدل كام" : "Old"} className="w-16 sm:w-20 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm font-bold tabular-nums text-center text-red-500" dir="ltr" />
                        <span className="text-xs sm:text-sm text-silver">{currency || (language === "ar" ? "ج.م" : "EGP")}</span>"""

if edit_item_ui_old in dash_content:
    dash_content = dash_content.replace(edit_item_ui_old, edit_item_ui_new)
else:
    print("WARNING: ItemEditor block not found!")

with codecs.open(dash_path, 'w', 'utf-8') as f:
    f.write(dash_content)

print("Dashboard UI patched.")
