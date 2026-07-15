import os
import glob
import re

src_dir = "src/components/menu"
files = glob.glob(os.path.join(src_dir, "Theme18*.tsx"))

for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Replace Theme18 with Theme19
    new_content = content.replace("Theme18", "Theme19")
    new_content = new_content.replace("T18_PRIMARY", "T19_PRIMARY")
    
    # If it's the main menu file, remove the searchQuery condition around category name
    if "Theme18Menu.tsx" in file:
        old_pattern = """                                {searchQuery && (
                                    <h3 className="font-bold text-lg mb-4" style={{ color: primaryColor }}>{catName(category)}</h3>
                                )}"""
        new_pattern = """                                <h3 className="font-bold text-lg mb-4" style={{ color: primaryColor }}>{catName(category)}</h3>"""
        new_content = new_content.replace(old_pattern, new_pattern)
        
    new_file = file.replace("Theme18", "Theme19")
    with open(new_file, "w", encoding="utf-8") as f:
        f.write(new_content)
    
    print(f"Created {new_file}")

