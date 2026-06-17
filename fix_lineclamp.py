import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

# Replace line-clamp-1 with line-clamp-2 for item titles in grid
content = content.replace('className="font-bold text-[0.95rem] mb-1 leading-tight line-clamp-1"', 'className="font-bold text-[0.95rem] mb-1 leading-tight line-clamp-3"')

# Featured item title
content = content.replace('className="font-bold text-lg mb-1 leading-tight line-clamp-2"', 'className="font-bold text-lg mb-1 leading-tight line-clamp-3"')

# You might also like title
content = content.replace('className="font-bold text-[11px] mb-1 line-clamp-1"', 'className="font-bold text-[11px] mb-1 line-clamp-2"')

# Cart item title
content = content.replace('className="font-bold text-sm line-clamp-1"', 'className="font-bold text-sm line-clamp-2"')

# Item description
content = content.replace('className="text-[11px] mb-2 line-clamp-1"', 'className="text-[11px] mb-2 line-clamp-2"')

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Done")
