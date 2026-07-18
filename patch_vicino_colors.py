import sys
import os

# 1. Patch ThemeVicinoMenu.tsx
file_path = "f:/ASN/ASN/src/components/menu/ThemeVicinoMenu.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

import_stmt = "import { getVicinoColors } from '@/lib/vicinoVariants';\n"
if "getVicinoColors" not in content:
    content = content.replace("import React,", import_stmt + "import React,")

old_colors = """    const T19_PRIMARY = '#B8860B'; // orange-500
    const primaryColor = config.theme_colors?.primary || T19_PRIMARY;
    
    // Theme colors matching the screenshots
    const bgBody = isDark ? '#111111' : '#F4EEE4';
    const bgCard = isDark ? '#1c1c1e' : '#FAF7F1';
    const textMain = isDark ? '#ffffff' : '#000000';
    const textMuted = isDark ? '#9ca3af' : '#6b7280';
    const borderColor = isDark ? '#333333' : '#f3f4f6';"""

new_colors = """    const { primaryColor, bgBody, bgCard, textMain, textMuted, borderColor } = getVicinoColors(config, isDark);"""

content = content.replace(old_colors, new_colors)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)


# 2. Patch VicinoLandingPage.tsx
file_path2 = "f:/ASN/ASN/src/components/menu/VicinoLandingPage.tsx"
with open(file_path2, "r", encoding="utf-8") as f:
    content2 = f.read()

import_stmt2 = "import { getVicinoColors } from '@/lib/vicinoVariants';\n"
if "getVicinoColors" not in content2:
    content2 = content2.replace("import React ", import_stmt2 + "import React ")
    # Actually, VicinoLandingPage imports `import { motion } from 'framer-motion';` at the top
    if "import { getVicinoColors }" not in content2:
        content2 = import_stmt2 + content2

old_colors2 = """    const isDark = resolvedTheme === 'dark';
    const bgBody = isDark ? '#0a0a0a' : '#ffffff';
    const textMain = isDark ? '#ffffff' : '#0a0a0a';
    const textMuted = isDark ? '#a3a3a3' : '#525252';
    const T19_PRIMARY = '#B8860B';
    const primaryColor = config.theme_colors?.primary || T19_PRIMARY;"""

new_colors2 = """    const isDark = resolvedTheme === 'dark';
    const { primaryColor, bgBody, textMain, textMuted } = getVicinoColors(config, isDark);"""

content2 = content2.replace(old_colors2, new_colors2)

with open(file_path2, "w", encoding="utf-8") as f:
    f.write(content2)


# 3. Patch theme/page.tsx
file_path3 = "f:/ASN/ASN/src/app/dashboard/theme/page.tsx"
with open(file_path3, "r", encoding="utf-8") as f:
    content3 = f.read()

new_themes = """    { id: "vicino", name_ar: "ثيم 20 (Vicino)", name_en: "Theme 20 (Vicino)", description_ar: "التصميم الأساسي", description_en: "Default design", preview_color: "#B8860B" },
    { id: "vicino-red", name_ar: "ثيم 20 (أحمر)", name_en: "Theme 20 (Red)", description_ar: "نسخة حمراء", description_en: "Red variant", preview_color: "#ef4444" },
    { id: "vicino-cyan", name_ar: "ثيم 20 (سماوي)", name_en: "Theme 20 (Cyan)", description_ar: "نسخة سماوية", description_en: "Cyan variant", preview_color: "#06b6d4" },
    { id: "vicino-emerald", name_ar: "ثيم 20 (زمردي)", name_en: "Theme 20 (Emerald)", description_ar: "نسخة زمردية", description_en: "Emerald variant", preview_color: "#10b981" },
    { id: "vicino-purple", name_ar: "ثيم 20 (بنفسجي)", name_en: "Theme 20 (Purple)", description_ar: "نسخة بنفسجية", description_en: "Purple variant", preview_color: "#8b5cf6" },
    { id: "vicino-dark", name_ar: "ثيم 20 (داكن جداً)", name_en: "Theme 20 (Midnight Gold)", description_ar: "داكن مع ذهبي", description_en: "Midnight Gold variant", preview_color: "#111111" },
"""
if "vicino-red" not in content3:
    content3 = content3.replace('    { id: "theme19-gold", name_ar: "ثيم 19 (ذهبي)", name_en: "Theme19 (Gold)", description_ar: "نفس التصميم ثيم 19 بلون ذهبي", description_en: "Theme19 design with Gold color", preview_color: "#D4A017" },', '    { id: "theme19-gold", name_ar: "ثيم 19 (ذهبي)", name_en: "Theme19 (Gold)", description_ar: "نفس التصميم ثيم 19 بلون ذهبي", description_en: "Theme19 design with Gold color", preview_color: "#D4A017" },\n' + new_themes)

with open(file_path3, "w", encoding="utf-8") as f:
    f.write(content3)


# 4. Patch marketing-links/page.tsx
file_path4 = "f:/ASN/ASN/src/app/dashboard/marketing-links/page.tsx"
with open(file_path4, "r", encoding="utf-8") as f:
    content4 = f.read()

new_links = """    { key: "theme19", nameEn: "Theme 19", nameAr: "ثيم 19" },
    { key: "vicino", nameEn: "Theme 20 (Vicino)", nameAr: "ثيم 20 (فيتشينو)" },
    { key: "vicino-red", nameEn: "Theme 20 (Red)", nameAr: "ثيم 20 (أحمر)" },
    { key: "vicino-cyan", nameEn: "Theme 20 (Cyan)", nameAr: "ثيم 20 (سماوي)" },
    { key: "vicino-emerald", nameEn: "Theme 20 (Emerald)", nameAr: "ثيم 20 (زمردي)" },
    { key: "vicino-purple", nameEn: "Theme 20 (Purple)", nameAr: "ثيم 20 (بنفسجي)" },
    { key: "vicino-dark", nameEn: "Theme 20 (Dark Gold)", nameAr: "ثيم 20 (ذهبي داكن)" },"""

if "vicino-red" not in content4:
    content4 = content4.replace('{ key: "theme19", nameEn: "Theme 19", nameAr: "ثيم 19" },', new_links)

with open(file_path4, "w", encoding="utf-8") as f:
    f.write(content4)


print("All files patched successfully.")
