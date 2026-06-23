import re

def add_theme_9_red_to_admin(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if 'id: "theme9-red"' in content or "id: 'theme9-red'" in content or 'id: `theme9-red`' in content:
        print(f'Theme9Red already exists in {filepath}')
        return

    pattern = r'(\{[\s]*id:\s*[\'\"`]theme9-cyan[\'\"`].*?\})'
    
    match = re.search(pattern, content, re.DOTALL)
    if match:
        theme9_cyan_block = match.group(1)
        theme9_red_block = theme9_cyan_block.replace('theme9-cyan', 'theme9-red').replace('Cyan', 'Red').replace('cyan', 'red').replace('سماوي', 'أحمر').replace('#0891b2', '#dc2626')
        
        # Add a comma and the new block
        content = content[:match.end()] + ',\n' + theme9_red_block + content[match.end():]
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Added Theme9Red to {filepath}')
    else:
        print(f'Could not find theme9-cyan block in {filepath}')

add_theme_9_red_to_admin('src/app/dashboard/theme/page.tsx')
add_theme_9_red_to_admin('src/app/super-admin/themes/page.tsx')
