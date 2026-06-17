import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace("is_available?: boolean;", "is_available?: boolean;\n    is_popular?: boolean;")

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Done")
