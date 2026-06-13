import os

def modify_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace the "All items merged" logic back to just rendering `filteredCategories`
    old_cat_list = """    const activeCatList = (activeCategory === 'all' || searchQuery)
        ? [{
            id: 'all_items_merged',
            name_ar: 'الكل',
            name_en: 'All',
            items: filteredCategories.flatMap((c: any) => c.items || [])
        }]
        : filteredCategories.filter((c: any) => c.id === activeCategory);"""
    
    new_cat_list = """    // Always render all filtered categories so continuous scroll works
    const activeCatList = filteredCategories;"""

    if old_cat_list in content:
        content = content.replace(old_cat_list, new_cat_list)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Modified {filepath}")
    else:
        print(f"Could not find old_cat_list in {filepath}")

modify_file(r"f:\ASN\ASN\src\components\menu\Theme9Menu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9CyanMenu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9EmeraldMenu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9SkyMenu.tsx")
