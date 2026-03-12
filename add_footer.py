import os
import glob

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'ASNFooter' in content:
        return
    
    # Add import statement after the last import
    lines = content.split('\n')
    last_import_idx = -1
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import_idx = i
            
    if last_import_idx != -1:
        lines.insert(last_import_idx + 1, "import ASNFooter from '@/components/menu/ASNFooter';")
    else:
        lines.insert(0, "import ASNFooter from '@/components/menu/ASNFooter';")
        
    content = '\n'.join(lines)
    
    # Insert <ASNFooter /> before <CheckoutModal
    if '<CheckoutModal' in content:
        content = content.replace('<CheckoutModal', '<ASNFooter />\n            <CheckoutModal')
    else:
        # If no CheckoutModal, append before the last closing div
        rsplit = content.rsplit('</div>', 1)
        if len(rsplit) == 2:
            content = rsplit[0] + '<ASNFooter />\n        </div>' + rsplit[1]
            
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Process all menu files
menu_dir = os.path.join('src', 'components', 'menu')
files = glob.glob(os.path.join(menu_dir, '*Menu.tsx'))

theme12 = os.path.join('src', 'components', 'Theme12Menu', 'Theme12Menu.tsx')
if os.path.exists(theme12):
    files.append(theme12)

for f in files:
    if os.path.basename(f) != 'ASNFooter.tsx':
        print(f"Processing {f}")
        process_file(f)

print("Done.")
