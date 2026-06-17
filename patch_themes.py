import codecs
import re

variants = {
    "Red": {"hex": "#dc2626", "id": "theme18-red", "name_ar": "ثيم 18 (أحمر)", "name_en": "Theme 18 (Red)"},
    "Cyan": {"hex": "#06b6d4", "id": "theme18-cyan", "name_ar": "ثيم 18 (سماوي)", "name_en": "Theme 18 (Cyan)"},
    "Emerald": {"hex": "#10b981", "id": "theme18-emerald", "name_ar": "ثيم 18 (زمردي)", "name_en": "Theme 18 (Emerald)"},
    "Sky": {"hex": "#0ea5e9", "id": "theme18-sky", "name_ar": "ثيم 18 (سماوي فاتح)", "name_en": "Theme 18 (Sky)"},
    "Pink": {"hex": "#ec4899", "id": "theme18-pink", "name_ar": "ثيم 18 (وردي)", "name_en": "Theme 18 (Pink)"},
}

# 1. src/app/menu/[restaurantId]/page.tsx
page_path = r'f:\ASN\ASN\src\app\menu\[restaurantId]\page.tsx'
with codecs.open(page_path, 'r', 'utf-8') as f:
    content = f.read()

# Add imports
imports = "\n".join([f'const Theme18{color}Menu = dynamic(() => import("@/components/menu/Theme18{color}Menu"));' for color in variants.keys()])
if "Theme18RedMenu" not in content:
    content = content.replace(
        'const Theme18Menu = dynamic(() => import("@/components/menu/Theme18Menu"));',
        f'const Theme18Menu = dynamic(() => import("@/components/menu/Theme18Menu"));\n{imports}'
    )

# Add render logic
renders = "\n".join([
    f'  if (config?.theme === "{v["id"]}") {{\n    return <Theme18{color}Menu config={{config}} categories={{categories}} restaurantId={{config.id}} />;\n  }}'
    for color, v in variants.items()
])
if '"theme18-red"' not in content:
    content = content.replace(
        '  if (config?.theme === "theme18") {\n    return <Theme18Menu config={config} categories={categories} restaurantId={config.id} />;\n  }',
        f'  if (config?.theme === "theme18") {{\n    return <Theme18Menu config={{config}} categories={{categories}} restaurantId={{config.id}} />;\n  }}\n{renders}'
    )

with codecs.open(page_path, 'w', 'utf-8') as f:
    f.write(content)

# 2. src/app/dashboard/theme/page.tsx
theme_path = r'f:\ASN\ASN\src\app\dashboard\theme\page.tsx'
with codecs.open(theme_path, 'r', 'utf-8') as f:
    content = f.read()

dashboard_variants = "\n".join([
    f'    {{ id: "{v["id"]}", name_ar: "{v["name_ar"]}", name_en: "{v["name_en"]}", description_ar: "نفس التصميم ثيم 18 بلون {v["name_ar"]}", description_en: "Theme 18 design with {color} color", preview_color: "{v["hex"]}" }},'
    for color, v in variants.items()
])

if '"theme18-red"' not in content:
    content = content.replace(
        '{ id: "theme18",',
        f'{dashboard_variants}\n    {{ id: "theme18",'
    )
with codecs.open(theme_path, 'w', 'utf-8') as f:
    f.write(content)

# 3. src/app/super-admin/themes/page.tsx
admin_path = r'f:\ASN\ASN\src\app\super-admin\themes\page.tsx'
with codecs.open(admin_path, 'r', 'utf-8') as f:
    content = f.read()

admin_variants = "\n".join([
    f'    {{ id: "{v["id"]}", name_ar: "{v["name_ar"]}", name_en: "{v["name_en"]}", preview_color: "{v["hex"]}" }},'
    for color, v in variants.items()
])

if '"theme18-red"' not in content:
    content = content.replace(
        '{ id: "theme18",',
        f'{admin_variants}\n    {{ id: "theme18",'
    )
with codecs.open(admin_path, 'w', 'utf-8') as f:
    f.write(content)

# 4. src/middleware.ts
mid_path = r'f:\ASN\ASN\src\middleware.ts'
with codecs.open(mid_path, 'r', 'utf-8') as f:
    content = f.read()

mid_variants = ", ".join([f"'{v['id']}'" for v in variants.values()])

if "'theme18-red'" not in content:
    content = content.replace(
        "'theme18',",
        f"'theme18', {mid_variants},"
    )
with codecs.open(mid_path, 'w', 'utf-8') as f:
    f.write(content)

# 5. src/app/dashboard/marketing-links/page.tsx
mkt_path = r'f:\ASN\ASN\src\app\dashboard\marketing-links\page.tsx'
with codecs.open(mkt_path, 'r', 'utf-8') as f:
    content = f.read()

mkt_variants = "\n".join([
    f'    {{ key: "{v["id"]}", nameEn: "{v["name_en"]}", nameAr: "{v["name_ar"]}" }},'
    for color, v in variants.items()
])

if '"theme18-red"' not in content:
    content = content.replace(
        '{ key: "theme18",',
        f'{mkt_variants}\n    {{ key: "theme18",'
    )
with codecs.open(mkt_path, 'w', 'utf-8') as f:
    f.write(content)

print("Done registering variants!")
