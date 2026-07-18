import sys

file_path = "f:/ASN/ASN/src/app/menu/[restaurantId]/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "if (restData.vicino_landing_enabled && restData.theme === 'vicino') {",
    "if (restData.vicino_landing_enabled && restData.theme?.startsWith('vicino')) {"
)

content = content.replace(
    "} else if (restData.theme !== 'vicino') {",
    "} else if (!restData.theme?.startsWith('vicino')) {"
)

content = content.replace(
    'if (showGlobalSplash && config?.theme !== "vicino") {',
    'if (showGlobalSplash && !config?.theme?.startsWith("vicino")) {'
)

content = content.replace(
    'if (config?.theme === "vicino") {',
    'if (config?.theme?.startsWith("vicino")) {'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("page.tsx patched successfully.")
