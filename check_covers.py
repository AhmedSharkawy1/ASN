import glob, os

files = glob.glob('src/components/menu/*Menu.tsx') + ['src/components/Theme12Menu/Theme12Menu.tsx']
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    
    has_slider = 'config.cover_images' in content
    has_cover = 'config.cover_url' in content
    
    print(f"{os.path.basename(f)}: Cover Images (Slider): {has_slider}, Cover URL: {has_cover}")
