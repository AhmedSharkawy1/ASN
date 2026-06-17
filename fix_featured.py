import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("const featuredItems = allItems.slice(0, 6);", "const featuredItems = allItems.filter(item => item.is_popular);")

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Done")
