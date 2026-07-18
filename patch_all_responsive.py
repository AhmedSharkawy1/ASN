import sys
import glob

# Files to update
files = glob.glob("f:/ASN/ASN/src/components/menu/*.tsx")

for file_path in files:
    if "ThemeVicinoMenu" in file_path or "Theme19Menu" in file_path or "Theme18Menu" in file_path or "VicinoLandingPage" in file_path:
        continue # Already heavily patched

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Update standard Grid view class
        content = content.replace(
            '"grid grid-cols-2 gap-3"',
            '"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"'
        )
        content = content.replace(
            '"grid grid-cols-2 gap-4"',
            '"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"'
        )

        # Update List view class (change flex flex-col to responsive grid)
        content = content.replace(
            '"flex flex-col gap-3"',
            '"flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"'
        )
        
        # Update Modals or other sub-grids
        content = content.replace(
            '"grid grid-cols-2 sm:grid-cols-3 gap-3"',
            '"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"'
        )

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        # print(f"Patched {file_path}")
    except Exception as e:
        pass

print("Global Responsive patches applied.")
