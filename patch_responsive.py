import sys
import glob

# Files to update
files = [
    "f:/ASN/ASN/src/components/menu/ThemeVicinoMenu.tsx",
    "f:/ASN/ASN/src/components/menu/Theme19Menu.tsx",
    "f:/ASN/ASN/src/components/menu/Theme18Menu.tsx"
]

for file_path in files:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Update Grid view class
        content = content.replace(
            '"grid grid-cols-2 gap-3"',
            '"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4"'
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

        # Ensure container padding is good on large screens
        # Often there is a `<div className="px-4 pt-24 pb-32">` or similar for main content
        content = content.replace(
            'className="px-4 pt-24 pb-32"',
            'className="px-4 md:px-8 lg:px-12 pt-24 pb-32 max-w-7xl mx-auto"'
        )
        content = content.replace(
            'className="px-4 pt-20 pb-32"',
            'className="px-4 md:px-8 lg:px-12 pt-20 pb-32 max-w-7xl mx-auto"'
        )

        # Category Scrollbar padding adjustments
        content = content.replace(
            'className="flex items-center overflow-x-auto t19-no-scrollbar px-4 pb-2 gap-2"',
            'className="flex items-center overflow-x-auto t19-no-scrollbar px-4 md:px-8 lg:px-12 pb-2 gap-2 max-w-7xl mx-auto"'
        )
        content = content.replace(
            'className="flex items-center overflow-x-auto vicino-no-scrollbar px-4 pb-2 gap-2"',
            'className="flex items-center overflow-x-auto vicino-no-scrollbar px-4 md:px-8 lg:px-12 pb-2 gap-2 max-w-7xl mx-auto"'
        )

        # Header adjustments
        # To make sure headers don't span to infinity but look good, we can apply max-w-7xl mx-auto inside the sticky header
        # Usually it looks like: <div className="flex justify-between items-center px-4 py-3">
        content = content.replace(
            'className="flex justify-between items-center px-4 py-3"',
            'className="flex justify-between items-center px-4 md:px-8 lg:px-12 py-3 max-w-7xl mx-auto w-full"'
        )

        # Bottom Nav
        content = content.replace(
            'className="flex justify-around py-3 px-2"',
            'className="flex justify-around py-3 px-2 max-w-2xl mx-auto"'
        )
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Patched {file_path}")
    except Exception as e:
        print(f"Failed {file_path}: {e}")

# 2. Patch VicinoLandingPage
landing_path = "f:/ASN/ASN/src/components/menu/VicinoLandingPage.tsx"
try:
    with open(landing_path, "r", encoding="utf-8") as f:
        landing_content = f.read()

    # Make gallery responsive
    landing_content = landing_content.replace(
        '"grid grid-cols-2 md:grid-cols-3 gap-2"',
        '"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2 md:gap-4"'
    )
    
    # Make buttons responsive (from grid-cols-2 to up to 4 if there are many)
    landing_content = landing_content.replace(
        '"grid grid-cols-2 gap-3 w-full"',
        '"grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full max-w-4xl"'
    )

    # Max widths for containers
    landing_content = landing_content.replace(
        '"w-[85%]"',
        '"w-[85%] max-w-7xl mx-auto"'
    )
    landing_content = landing_content.replace(
        '"w-[85%] z-10 space-y-6"',
        '"w-[85%] max-w-4xl mx-auto z-10 space-y-6"'
    )

    with open(landing_path, "w", encoding="utf-8") as f:
        f.write(landing_content)
    print(f"Patched {landing_path}")
except Exception as e:
    print(f"Failed {landing_path}: {e}")

print("Responsive patches applied.")
