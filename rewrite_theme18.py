import re

with open('src/components/menu/Theme18Menu.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Theme10Menu with Theme18Menu
content = content.replace('Theme10Menu', 'Theme18Menu')
content = content.replace('T10_PRIMARY', 'T18_PRIMARY')

# Enforce target colors
content = re.sub(r"const bgBody = .*?;", "const bgBody = '#0d0f14';", content)
content = re.sub(r"const bgCard = .*?;", "const bgCard = '#1a1d24';", content)
content = re.sub(r"const textMain = .*?;", "const textMain = '#ededed';", content)
content = re.sub(r"const textMuted = .*?;", "const textMuted = '#999999';", content)
content = re.sub(r"const borderColor = .*?;", "const borderColor = '#333333';", content)

# Extract everything up to the main return statement
match = re.search(r'(\s*if \(!mounted\) return <div className="min-h-screen.*?/>;\s*return \()', content, re.DOTALL)
if match:
    start_idx = match.end()
    # Find the closing parenthesis of the main return
    # This is tricky without a proper parser, but we know it's before the modals.
    # We can just replace the whole main block.
    # Let's use a simpler approach: replace the content from return ( to the end of the file,
    # but we need the modals.
