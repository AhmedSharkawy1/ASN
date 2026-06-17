import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

# Fix the parent container for the featured item to be a flex column and take full height
content = content.replace(
    'className="rounded-3xl overflow-hidden shadow-sm cursor-pointer relative"\n                                        style={{ backgroundColor: bgCard }}',
    'className="rounded-3xl overflow-hidden shadow-sm cursor-pointer relative flex flex-col h-full"\n                                        style={{ backgroundColor: bgCard }}'
)

# Fix the fixed height of the text container
content = content.replace(
    'className="p-4 flex flex-col justify-between h-[100px]"',
    'className="p-4 flex flex-col justify-between flex-1 min-h-[100px]"'
)

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Done")
