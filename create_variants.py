import os

variants = {
    "Red": "#dc2626",
    "Cyan": "#06b6d4",
    "Emerald": "#10b981",
    "Sky": "#0ea5e9",
    "Pink": "#ec4899",
}

template = """import Theme18Menu from "./Theme18Menu";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Theme18{color}Menu(props: any) {{
    const customConfig = {{ ...props.config }};
    if (!customConfig.theme_colors) customConfig.theme_colors = {{}};
    customConfig.theme_colors.primary = '{hex}';
    
    return <Theme18Menu {{...props}} config={{customConfig}} />;
}}
"""

directory = r'f:\ASN\ASN\src\components\menu'

for color, hex_val in variants.items():
    file_path = os.path.join(directory, f"Theme18{color}Menu.tsx")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(template.format(color=color, hex=hex_val))

print("Created 5 color variant files.")
