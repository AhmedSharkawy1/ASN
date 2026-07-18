import sys
import glob
import re

files = glob.glob("f:/ASN/ASN/src/components/menu/*.tsx")

for file_path in files:
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check if already fully patched
        if "const cur = parseCurrency(config?.currency, isAr);" in content and "let parsedCurrency" not in content:
            continue

        # Add import if missing
        if "import { parseCurrency } from '@/lib/currency';" not in content:
            content = content.replace("import React", "import { parseCurrency } from '@/lib/currency';\nimport React")

        # 1. Clean up `let parsedCurrency` blocks if any were missed
        pattern1 = re.compile(r"let parsedCurrency = \{ ar:.*?const cur = isAr \? parsedCurrency\.ar : parsedCurrency\.en;", re.DOTALL)
        content = pattern1.sub("const cur = parseCurrency(config?.currency, isAr);", content)

        # 2. Clean up `const cur = config.currency || ...;` 
        pattern2 = re.compile(r"const cur = config\.currency \|\|.*?;")
        content = pattern2.sub("const cur = parseCurrency(config?.currency, isAr);", content)

        # 3. Clean up `const cur = config?.currency || ...;`
        pattern3 = re.compile(r"const cur = config\?\.currency \|\|.*?;")
        content = pattern3.sub("const cur = parseCurrency(config?.currency, isAr);", content)

        # 4. Clean up `let cur = config.currency || ...;`
        pattern4 = re.compile(r"let cur = config\.currency \|\|.*?;")
        content = pattern4.sub("const cur = parseCurrency(config?.currency, isAr);", content)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Patched {file_path}")
            
    except Exception as e:
        print(f"Failed {file_path}: {e}")

print("Currency logic patched globally for all remaining themes.")
