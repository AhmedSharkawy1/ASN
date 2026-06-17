# -*- coding: utf-8 -*-
import re

with open('src/components/menu/Theme10Menu.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

with open('src/components/menu/Theme18MenuJSX.tsx', 'r', encoding='utf-8') as f:
    new_jsx = f.read()

# remove return ( and ) from new_jsx
new_jsx = new_jsx.replace('    return (\n', '')
new_jsx = new_jsx.replace('    );\n', '')

match1 = re.search(r'([\s\S]*?if \(!mounted\)[\s\S]*?return \()', content)
if not match1:
    exit(1)
pre_content = match1.group(1)

pre_content = pre_content.replace('Theme10Menu', 'Theme18Menu')
pre_content = pre_content.replace('T10_PRIMARY', 'T18_PRIMARY')
pre_content = re.sub(r"const bgBody = .*?;", "const bgBody = '#0d0f14';", pre_content)
pre_content = re.sub(r"const bgCard = .*?;", "const bgCard = '#1a1d24';", pre_content)
pre_content = re.sub(r"const textMain = .*?;", "const textMain = '#ededed';", pre_content)
pre_content = re.sub(r"const textMuted = .*?;", "const textMuted = '#999999';", pre_content)
pre_content = re.sub(r"const borderColor = .*?;", "const borderColor = '#333333';", pre_content)

match2 = re.search(r'(            {/\* Modal \*/}[\s\S]*)', content)
if not match2:
    exit(1)
modals = match2.group(1)

match3 = re.search(r'([\s\S]*</CheckoutModal>)', modals)
if match3:
    modals = match3.group(1)

modals = modals.replace('bg-white dark:bg-slate-800', 'bg-[#1a1d24]')
modals = modals.replace('bg-slate-50 dark:bg-slate-900', 'bg-[#0d0f14]')
modals = modals.replace('border-slate-200 dark:border-slate-700', 'border-[#333333]')
modals = modals.replace('bg-gray-100 dark:bg-slate-700', 'bg-[#333333]')
modals = modals.replace('text-gray-500 dark:text-gray-400', 'text-[#999999]')
modals = modals.replace('text-slate-900 dark:text-white', 'text-[#ededed]')

final_content = pre_content + "\n    <>\n" + new_jsx + "\n" + modals + "\n        </div>\n        </>\n    );\n}\n"

with open('src/components/menu/Theme18Menu.tsx', 'w', encoding='utf-8') as f:
    f.write(final_content)

print("Done")
