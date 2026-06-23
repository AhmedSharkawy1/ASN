import os
import re
import codecs

themes = [
    {"prefix": "AtyabEtoile", "id": "atyab-etoile"},
    {"prefix": "AtyabOriental", "id": "atyab-oriental"},
    {"prefix": "BabAlHara", "id": "bab-alhara"},
    {"prefix": "PizzaPasta", "id": "pizzapasta"},
    {"prefix": "Theme5", "id": "theme5"},
    {"prefix": "Theme6", "id": "theme6"},
    {"prefix": "Theme7", "id": "theme7"},
    {"prefix": "Theme10", "id": "theme10"},
    {"prefix": "Theme11", "id": "theme11"},
    {"prefix": "Theme13", "id": "theme13"},
]

components_dir = r"f:\ASN\ASN\src\components\menu"

replacements = {
    "CyanMenu": "RedMenu",
    "#0891b2": "#dc2626", # cyan-600 -> red-600
    "#06b6d4": "#ef4444", # cyan-500 -> red-500
    "cyan-50": "red-50",
    "cyan-100": "red-100",
    "cyan-200": "red-200",
    "cyan-300": "red-300",
    "cyan-400": "red-400",
    "cyan-500": "red-500",
    "cyan-600": "red-600",
    "cyan-700": "red-700",
    "cyan-800": "red-800",
    "cyan-900": "red-900",
    "cyan-950": "red-950",
}

def create_components():
    created = []
    for t in themes:
        cyan_file = os.path.join(components_dir, f"{t['prefix']}CyanMenu.tsx")
        red_file = os.path.join(components_dir, f"{t['prefix']}RedMenu.tsx")
        
        if not os.path.exists(cyan_file):
            print(f"Warning: {cyan_file} not found.")
            continue
            
        with codecs.open(cyan_file, "r", "utf-8") as f:
            content = f.read()
            
        for old, new in replacements.items():
            content = content.replace(old, new)
            
        with codecs.open(red_file, "w", "utf-8") as f:
            f.write(content)
        
        created.append(t)
        print(f"Created {red_file}")
    return created

def patch_registrations(created_themes):
    red_id_name = {
        "atyab-etoile": ("atyab-etoile-red", "أطياب ايتوال (أحمر)", "Atyab Etoile (Red)"),
        "atyab-oriental": ("atyab-oriental-red", "أطياب أورينتال (أحمر)", "Atyab Oriental (Red)"),
        "bab-alhara": ("bab-alhara-red", "باب الحارة (أحمر)", "Bab Al Hara (Red)"),
        "pizzapasta": ("pizzapasta-red", "بيتزا باستا (أحمر)", "Pizza Pasta (Red)"),
        "theme5": ("theme5-red", "ثيم 5 (أحمر)", "Theme 5 (Red)"),
        "theme6": ("theme6-red", "ثيم 6 (أحمر)", "Theme 6 (Red)"),
        "theme7": ("theme7-red", "ثيم 7 (أحمر)", "Theme 7 (Red)"),
        "theme10": ("theme10-red", "ثيم 10 (أحمر)", "Theme 10 (Red)"),
        "theme11": ("theme11-red", "ثيم 11 (أحمر)", "Theme 11 (Red)"),
        "theme13": ("theme13-red", "ثيم 13 (أحمر)", "Theme 13 (Red)"),
    }
    
    # 1. page.tsx
    page_path = r'f:\ASN\ASN\src\app\menu\[restaurantId]\page.tsx'
    with codecs.open(page_path, 'r', 'utf-8') as f:
        content = f.read()
        
    for t in created_themes:
        prefix = t['prefix']
        base_id = t['id']
        red_id, _, _ = red_id_name[base_id]
        
        # Import
        if f'Theme{prefix}RedMenu' not in content:
            import_statement = f'const {prefix}RedMenu = dynamic(() => import("@/components/menu/{prefix}RedMenu"));'
            # find Cyan import and add after
            cyan_import = f'const {prefix}CyanMenu = dynamic(() => import("@/components/menu/{prefix}CyanMenu"));'
            content = content.replace(cyan_import, f"{cyan_import}\n{import_statement}")
            
        # Render
        if f'"{red_id}"' not in content:
            cyan_render = f'if (config?.theme === "{base_id}-cyan") {{\n    return <{prefix}CyanMenu'
            if cyan_render in content:
                # Need to find the whole block to append after, but let's just do a regex
                block_pattern = re.compile(rf'if \(config\?\.theme === "{base_id}-cyan"\) {{.*?}}', re.DOTALL)
                match = block_pattern.search(content)
                if match:
                    # we do similar render but with Red
                    red_block = match.group(0).replace(f'"{base_id}-cyan"', f'"{red_id}"').replace(f'{prefix}CyanMenu', f'{prefix}RedMenu')
                    content = content[:match.end()] + "\n  // If Theme " + prefix + " Red\n  " + red_block + content[match.end():]

    with codecs.open(page_path, 'w', 'utf-8') as f:
        f.write(content)

    # 2. theme/page.tsx
    theme_path = r'f:\ASN\ASN\src\app\dashboard\theme\page.tsx'
    with codecs.open(theme_path, 'r', 'utf-8') as f:
        content = f.read()
    
    for t in created_themes:
        base_id = t['id']
        red_id, name_ar, name_en = red_id_name[base_id]
        if f'"{red_id}"' not in content:
            # find the cyan object and insert red after
            cyan_pattern = re.compile(rf'{{[^}}]*id:\s*"{base_id}-cyan"[^}}]*}},', re.DOTALL)
            match = cyan_pattern.search(content)
            if match:
                red_obj = match.group(0).replace(f'"{base_id}-cyan"', f'"{red_id}"')
                red_obj = re.sub(r'name_ar:\s*"[^"]*"', f'name_ar: "{name_ar}"', red_obj)
                red_obj = re.sub(r'name_en:\s*"[^"]*"', f'name_en: "{name_en}"', red_obj)
                red_obj = re.sub(r'preview_color:\s*"[^"]*"', 'preview_color: "#dc2626"', red_obj)
                content = content[:match.end()] + "\n" + red_obj + content[match.end():]
                
    with codecs.open(theme_path, 'w', 'utf-8') as f:
        f.write(content)
        
    # 3. super-admin/themes/page.tsx
    admin_path = r'f:\ASN\ASN\src\app\super-admin\themes\page.tsx'
    with codecs.open(admin_path, 'r', 'utf-8') as f:
        content = f.read()
        
    for t in created_themes:
        base_id = t['id']
        red_id, name_ar, name_en = red_id_name[base_id]
        if f'"{red_id}"' not in content:
            cyan_pattern = re.compile(rf'{{[^}}]*id:\s*"{base_id}-cyan"[^}}]*}},', re.DOTALL)
            match = cyan_pattern.search(content)
            if match:
                red_obj = match.group(0).replace(f'"{base_id}-cyan"', f'"{red_id}"')
                red_obj = re.sub(r'name_ar:\s*"[^"]*"', f'name_ar: "{name_ar}"', red_obj)
                red_obj = re.sub(r'name_en:\s*"[^"]*"', f'name_en: "{name_en}"', red_obj)
                red_obj = re.sub(r'preview_color:\s*"[^"]*"', 'preview_color: "#dc2626"', red_obj)
                content = content[:match.end()] + "\n" + red_obj + content[match.end():]
                
    with codecs.open(admin_path, 'w', 'utf-8') as f:
        f.write(content)
        
    # 4. middleware.ts
    mid_path = r'f:\ASN\ASN\src\middleware.ts'
    with codecs.open(mid_path, 'r', 'utf-8') as f:
        content = f.read()
        
    for t in created_themes:
        base_id = t['id']
        red_id, _, _ = red_id_name[base_id]
        if f"'{red_id}'" not in content:
            content = content.replace(f"'{base_id}-cyan',", f"'{base_id}-cyan', '{red_id}',")
            
    with codecs.open(mid_path, 'w', 'utf-8') as f:
        f.write(content)
        
    # 5. dashboard/marketing-links/page.tsx
    mkt_path = r'f:\ASN\ASN\src\app\dashboard\marketing-links\page.tsx'
    with codecs.open(mkt_path, 'r', 'utf-8') as f:
        content = f.read()
        
    for t in created_themes:
        base_id = t['id']
        red_id, name_ar, name_en = red_id_name[base_id]
        if f'"{red_id}"' not in content:
            cyan_pattern = re.compile(rf'{{[^}}]*key:\s*"{base_id}-cyan"[^}}]*}},', re.DOTALL)
            match = cyan_pattern.search(content)
            if match:
                red_obj = match.group(0).replace(f'"{base_id}-cyan"', f'"{red_id}"')
                red_obj = re.sub(r'nameAr:\s*"[^"]*"', f'nameAr: "{name_ar}"', red_obj)
                red_obj = re.sub(r'nameEn:\s*"[^"]*"', f'nameEn: "{name_en}"', red_obj)
                content = content[:match.end()] + "\n" + red_obj + content[match.end():]
                
    with codecs.open(mkt_path, 'w', 'utf-8') as f:
        f.write(content)
        
    print("Done registering all.")

if __name__ == "__main__":
    created = create_components()
    patch_registrations(created)
