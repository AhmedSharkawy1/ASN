import sys

file_path = "f:/ASN/ASN/src/lib/uploadImage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "uploadBlob = await convertToWebP(file, 2000, 0.85);",
    "uploadBlob = await convertToWebP(file, 1600, 0.85);"
)

content = content.replace(
    "Use 2000px and 0.85 quality to preserve details for the backend Sharp processing",
    "Use 1600px and 0.85 quality to balance high quality and smaller storage size since backend Sharp is bypassed"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("uploadImage.ts patched successfully.")
