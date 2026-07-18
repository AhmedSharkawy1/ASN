import sys

file_path = "f:/ASN/ASN/src/lib/uploadImage.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "async function convertToWebP(file: File | Blob, maxWidth = 1200, quality = 0.70): Promise<Blob> {",
    "async function convertToWebP(file: File | Blob, maxWidth = 1600, quality = 0.85): Promise<Blob> {"
)

content = content.replace(
    "Max width: 1200px. Quality: 70%.",
    "Max width: 1600px. Quality: 85% (Ensures high quality while maintaining reasonable file size)."
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("uploadImage.ts default parameters patched successfully.")
