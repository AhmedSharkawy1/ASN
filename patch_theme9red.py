import re

def add_theme_9_red(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'Theme9Red' in content:
        return

    if 'middleware.ts' in filepath:
        content = content.replace("'Theme9Cyan',", "'Theme9Cyan', 'Theme9Red',")
    elif 'marketing-links' in filepath:
        content = content.replace('"Theme9Cyan",', '"Theme9Cyan", "Theme9Red",')
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Added Theme9Red to {filepath}')

def add_theme_9_red_to_admin(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'id: "Theme9Red"' in content or "id: 'Theme9Red'" in content or 'id: `Theme9Red`' in content:
        return

    pattern = r'(\{[\s]*id:\s*[\'\"`]Theme9Cyan[\'\"`].*?\})'
    
    match = re.search(pattern, content, re.DOTALL)
    if match:
        theme9_cyan_block = match.group(1)
        theme9_red_block = theme9_cyan_block.replace('Theme9Cyan', 'Theme9Red').replace('Cyan', 'Red').replace('cyan', 'red').replace('سماوي', 'أحمر')
        
        # Add a comma and the new block
        content = content[:match.end()] + ',\n' + theme9_red_block + content[match.end():]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Added Theme9Red to {filepath}')
    else:
        print(f'Could not find Theme9Cyan block in {filepath}')

add_theme_9_red('src/middleware.ts')
add_theme_9_red('src/app/dashboard/marketing-links/page.tsx')
add_theme_9_red_to_admin('src/app/dashboard/theme/page.tsx')
add_theme_9_red_to_admin('src/app/super-admin/themes/page.tsx')
