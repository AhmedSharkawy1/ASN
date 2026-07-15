import sys
file_path = r'f:\ASN\ASN\src\components\menu\Theme17Menu.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """                                        {cat.image_url ? (
                                            <Image quality={95} thumbnailSrc={cat.thumbnail_url} originalSrc={cat.image_url} alt={catName(cat)} fill className="object-cover rounded-[18px]" />
                                        ) : ("""
replacement = """                                        {cat.image_url ? (
                                            <OptimizedMenuImage thumbnailSrc={cat.thumbnail_url} originalSrc={cat.image_url} alt={catName(cat)} fill className="object-cover rounded-[18px]" />
                                        ) : ("""

if target in content:
    content = content.replace(target, replacement)
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Successfully patched.')
else:
    print('Target string not found.')
