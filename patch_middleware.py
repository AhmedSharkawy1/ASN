import codecs

mid_path = r'f:\ASN\ASN\src\middleware.ts'
with codecs.open(mid_path, 'r', 'utf-8') as f:
    content = f.read()

content = content.replace(
    "'theme13-cyan', 'theme13-emerald', 'theme13-sky',",
    "'theme13-cyan', 'theme13-emerald', 'theme13-sky',\n    'theme18', 'theme18-red', 'theme18-cyan', 'theme18-emerald', 'theme18-sky', 'theme18-pink',"
)

with codecs.open(mid_path, 'w', 'utf-8') as f:
    f.write(content)

print("Done patching middleware")
