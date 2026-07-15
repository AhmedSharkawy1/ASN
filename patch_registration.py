import re

def duplicate_blocks(file_path, find_pattern, replace_func):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    
    matches = list(re.finditer(find_pattern, content, flags=re.MULTILINE))
    if not matches:
        print(f"No matches in {file_path}")
        return

    # We do replacements from end to start so indices don't shift
    for match in reversed(matches):
        original = match.group(0)
        duplicated = replace_func(original)
        content = content[:match.end()] + "\n" + duplicated + content[match.end():]
        
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Patched {file_path}")

# 1. src/app/dashboard/marketing-links/page.tsx
# Example line: { key: "theme18-red", nameEn: "Theme 18 (Red)", nameAr: "ثيم 18 (أحمر)" },
duplicate_blocks(
    "src/app/dashboard/marketing-links/page.tsx",
    r"^[ \t]*\{[ \t]*key:[ \t]*\"theme18.*?\}.*?$",
    lambda text: text.replace("theme18", "theme19").replace("Theme 18", "Theme 19").replace("ثيم 18", "ثيم 19").replace("MenuMasr Replica", "Theme 19").replace("منيو مصر المطابق", "ثيم 19")
)

# 2. src/app/dashboard/theme/page.tsx
# Registration array elements
duplicate_blocks(
    "src/app/dashboard/theme/page.tsx",
    r"^[ \t]*\{[ \t]*id:[ \t]*\"theme18.*?preview_color:.*?\},?$",
    lambda text: text.replace("theme18", "theme19").replace("Theme 18", "Theme 19").replace("Theme18", "Theme19").replace("ثيم 18", "ثيم 19").replace("MenuMasr Replica", "Theme 19").replace("منيو مصر المطابق", "ثيم 19")
)
# id: "theme18" inside an array
duplicate_blocks(
    "src/app/dashboard/theme/page.tsx",
    r"^[ \t]*id:[ \t]*\"theme18\",?$",
    lambda text: text.replace("theme18", "theme19")
)

# 3. src/app/super-admin/themes/page.tsx
duplicate_blocks(
    "src/app/super-admin/themes/page.tsx",
    r"^[ \t]*\{[ \t]*id:[ \t]*\"theme18.*?preview_color:.*?\},?$",
    lambda text: text.replace("theme18", "theme19").replace("Theme 18", "Theme 19").replace("Theme18", "Theme19").replace("ثيم 18", "ثيم 19").replace("MenuMasr Replica", "Theme 19").replace("منيو مصر المطابق", "ثيم 19")
)

# 4. src/app/menu/[restaurantId]/page.tsx
# Imports
duplicate_blocks(
    "src/app/menu/[restaurantId]/page.tsx",
    r"^const Theme18.*?\);$",
    lambda text: text.replace("Theme18", "Theme19")
)
# Render conditions
duplicate_blocks(
    "src/app/menu/[restaurantId]/page.tsx",
    r"^[ \t]*if[ \t]*\(config\?\.theme[ \t]*===[ \t]*\"theme18.*?return.*?Theme18.*?;[ \t]*\n[ \t]*\}$",
    lambda text: text.replace("theme18", "theme19").replace("Theme18", "Theme19")
)
