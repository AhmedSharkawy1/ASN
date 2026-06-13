import os

def modify_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Fix the IntersectionObserver early return
    old_effect_return = "if (searchQuery || activeCategory !== 'all') return;"
    new_effect_return = "if (searchQuery) return;"

    if old_effect_return in content:
        content = content.replace(old_effect_return, new_effect_return)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Modified {filepath}")
    else:
        print(f"Could not find old_effect_return in {filepath}")

modify_file(r"f:\ASN\ASN\src\components\menu\Theme9Menu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9CyanMenu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9EmeraldMenu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9SkyMenu.tsx")
