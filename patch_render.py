import re

file_path = "src/app/menu/[restaurantId]/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Pattern for the conditions
pattern = r"([ \t]*if[ \t]*\(config\?\.theme[ \t]*===[ \t]*\"theme18(.*?)\"\)[ \t]*\{\n[ \t]*return[ \t]*<Theme18(.*?) \/>;\n[ \t]*\})"

matches = list(re.finditer(pattern, content, flags=re.MULTILINE))

if not matches:
    print("No matches")
else:
    for match in reversed(matches):
        original = match.group(0)
        duplicated = original.replace("theme18", "theme19").replace("Theme18", "Theme19")
        content = content[:match.end()] + "\n" + duplicated + content[match.end():]

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Patched " + file_path)
