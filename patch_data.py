import codecs
import re

# 1. Patch src/app/menu/[restaurantId]/page.tsx
menu_path = r'f:\ASN\ASN\src\app\menu\[restaurantId]\page.tsx'
with codecs.open(menu_path, 'r', 'utf-8') as f:
    menu_content = f.read()

# Add old_prices to Item type
if 'old_prices?: number[];' not in menu_content:
    menu_content = menu_content.replace(
        '  is_available: boolean;\n};',
        '  is_available: boolean;\n  old_prices?: number[];\n};'
    )

# Parse in formattedData
old_map = """            items: itemsData
              ? itemsData.filter((i) => i.category_id === cat.id)
              : [],"""

new_map = """            items: itemsData
              ? itemsData.filter((i) => i.category_id === cat.id).map(item => {
                  if (item.size_labels && item.size_labels.some((l: string) => l && l.includes('::'))) {
                      const newLabels: string[] = [];
                      const oldPrices: number[] = [];
                      item.size_labels.forEach((l: string) => {
                          if (l && l.includes('::')) {
                              const parts = l.split('::');
                              newLabels.push(parts[0]);
                              const parsed = parseFloat(parts[1]);
                              oldPrices.push(isNaN(parsed) ? 0 : parsed);
                          } else {
                              newLabels.push(l);
                              oldPrices.push(0);
                          }
                      });
                      return { ...item, size_labels: newLabels, old_prices: oldPrices };
                  }
                  return item;
              })
              : [],"""

menu_content = menu_content.replace(old_map, new_map)

with codecs.open(menu_path, 'w', 'utf-8') as f:
    f.write(menu_content)


# 2. Patch src/app/dashboard/menu/page.tsx
dash_path = r'f:\ASN\ASN\src\app\dashboard\menu\page.tsx'
with codecs.open(dash_path, 'r', 'utf-8') as f:
    dash_content = f.read()

# Add old_prices to Item type
if 'old_prices?: number[];' not in dash_content:
    dash_content = dash_content.replace(
        '    weight_unit?: string;\n};',
        '    weight_unit?: string;\n    old_prices?: number[];\n};'
    )

# Parse in fetchMenuData
dash_old_map = """                            items: itemsData ? itemsData.filter(i => i.category_id === cat.id) : []"""
dash_new_map = """                            items: itemsData ? itemsData.filter(i => i.category_id === cat.id).map(item => {
                                if (item.size_labels && item.size_labels.some((l: string) => l && l.includes('::'))) {
                                    const newLabels: string[] = [];
                                    const oldPrices: number[] = [];
                                    item.size_labels.forEach((l: string) => {
                                        if (l && l.includes('::')) {
                                            const parts = l.split('::');
                                            newLabels.push(parts[0]);
                                            const parsed = parseFloat(parts[1]);
                                            oldPrices.push(isNaN(parsed) ? 0 : parsed);
                                        } else {
                                            newLabels.push(l);
                                            oldPrices.push(0);
                                        }
                                    });
                                    return { ...item, size_labels: newLabels, old_prices: oldPrices };
                                }
                                return item;
                            }) : []"""

dash_content = dash_content.replace(dash_old_map, dash_new_map)

# Now, add old_prices to the Dashboard UI
# 1. Adding Item (main form)
# Search for: const [prices, setPrices] = useState<number[]>([0]);
if 'const [oldPrices, setOldPrices]' not in dash_content:
    dash_content = dash_content.replace(
        'const [prices, setPrices] = useState<number[]>([0]);',
        'const [prices, setPrices] = useState<number[]>([0]);\n    const [oldPrices, setOldPrices] = useState<number[]>([0]);'
    )

# Update handleSave for Add Item
if 'size_labels: sizeLabels.filter' in dash_content and 'oldPrices[i] > 0' not in dash_content:
    dash_content = dash_content.replace(
        'prices: prices.filter(p => p > 0), size_labels: sizeLabels.filter((_, i) => prices[i] > 0),',
        'prices: prices.filter(p => p > 0), size_labels: sizeLabels.filter((_, i) => prices[i] > 0).map((lbl, i) => oldPrices[i] > 0 ? `${lbl}::${oldPrices[i]}` : lbl),'
    )

# Adding the input to Add Item form
add_item_ui_old = """<input type="number" value={p || ''} onChange={e => { const np = [...prices]; np[idx] = parseFloat(e.target.value) || 0; setPrices(np); }}
                                placeholder="0" className="w-24 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border focus:border-blue outline-none text-base font-bold tabular-nums text-center" dir="ltr" />"""
add_item_ui_new = """<input type="number" value={p || ''} onChange={e => { const np = [...prices]; np[idx] = parseFloat(e.target.value) || 0; setPrices(np); }}
                                placeholder="0" className="w-20 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border focus:border-blue outline-none text-base font-bold tabular-nums text-center" dir="ltr" />
                            <input type="number" value={oldPrices[idx] || ''} onChange={e => { const no = [...oldPrices]; no[idx] = parseFloat(e.target.value) || 0; setOldPrices(no); }}
                                placeholder={language === "ar" ? "بدل كام" : "Old"} className="w-20 px-3 py-2 rounded-lg bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm font-bold tabular-nums text-center text-red-500" dir="ltr" />"""
dash_content = dash_content.replace(add_item_ui_old, add_item_ui_new)

# Update Add Size button in Add Item
dash_content = dash_content.replace(
    "setPrices([...prices, 0]); setSizeLabels([...sizeLabels, '']);",
    "setPrices([...prices, 0]); setSizeLabels([...sizeLabels, '']); setOldPrices([...oldPrices, 0]);"
)

# Update delete size button in Add Item
dash_content = dash_content.replace(
    "setSizeLabels(sizeLabels.filter((_, i) => i !== idx));",
    "setSizeLabels(sizeLabels.filter((_, i) => i !== idx)); setOldPrices(oldPrices.filter((_, i) => i !== idx));"
)

# 2. Edit Item Modal
if 'const [localOldPrices, setLocalOldPrices]' not in dash_content:
    dash_content = dash_content.replace(
        'const [localPrices, setLocalPrices] = useState([...item.prices]);',
        'const [localPrices, setLocalPrices] = useState([...item.prices]);\n    const [localOldPrices, setLocalOldPrices] = useState<number[]>(item.old_prices ? [...item.old_prices] : Array(item.prices.length).fill(0));'
    )

if 'size_labels: localLabels,' in dash_content:
    dash_content = dash_content.replace(
        'prices: localPrices, size_labels: localLabels,',
        'prices: localPrices, size_labels: localLabels.map((lbl, idx) => localOldPrices[idx] > 0 ? `${lbl}::${localOldPrices[idx]}` : lbl),'
    )

# Adding input to Edit Item Modal
edit_item_ui_old = """<input type="number" value={price} onChange={e => { const np = [...localPrices]; np[idx] = parseFloat(e.target.value) || 0; setLocalPrices(np); }}
                            className="w-20 sm:w-24 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm sm:text-base font-bold tabular-nums text-center" dir="ltr" />"""
edit_item_ui_new = """<input type="number" value={price} onChange={e => { const np = [...localPrices]; np[idx] = parseFloat(e.target.value) || 0; setLocalPrices(np); }}
                            className="w-16 sm:w-20 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm sm:text-base font-bold tabular-nums text-center" dir="ltr" />
                        <input type="number" value={localOldPrices[idx] || ''} onChange={e => { const no = [...localOldPrices]; no[idx] = parseFloat(e.target.value) || 0; setLocalOldPrices(no); }}
                            placeholder={language === "ar" ? "بدل" : "Old"} className="w-16 sm:w-20 px-2 py-1.5 rounded bg-transparent border-b border-glass-border focus:border-blue outline-none text-sm font-bold tabular-nums text-center text-red-500" dir="ltr" />"""
dash_content = dash_content.replace(edit_item_ui_old, edit_item_ui_new)

# Update Add Size button in Edit Item
dash_content = dash_content.replace(
    "setLocalPrices([...localPrices, 0]); setLocalLabels([...localLabels, '']);",
    "setLocalPrices([...localPrices, 0]); setLocalLabels([...localLabels, '']); setLocalOldPrices([...localOldPrices, 0]);"
)

# Update delete size button in Edit Item
dash_content = dash_content.replace(
    "setLocalLabels(localLabels.filter((_, i) => i !== idx));",
    "setLocalLabels(localLabels.filter((_, i) => i !== idx)); setLocalOldPrices(localOldPrices.filter((_, i) => i !== idx));"
)

with codecs.open(dash_path, 'w', 'utf-8') as f:
    f.write(dash_content)

print("Data layer patched.")
