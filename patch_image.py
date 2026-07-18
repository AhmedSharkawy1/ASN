import sys

file_path = "f:/ASN/ASN/src/components/menu/OptimizedMenuImage.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

import_statement = "import Image from 'next/image';\n"
if "import Image from 'next/image';" not in content:
    content = content.replace("import React,", "import Image from 'next/image';\nimport React,")

helper_fn = """
const isAllowedHost = (url: string) => {
  if (!url || url.startsWith('/')) return true; // allow relative paths
  if (url.startsWith('data:')) return true;
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'images.unsplash.com' || parsed.hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
};
"""

if "const isAllowedHost" not in content:
    content = content.replace("export default function OptimizedMenuImage({", helper_fn + "\nexport default function OptimizedMenuImage({")

render_logic = """
      {primarySrc ? (
        isAllowedHost(primarySrc) ? (
          <Image
            src={primarySrc}
            alt={alt}
            className={`object-cover transition-opacity duration-300 ${isFilled ? 'w-full h-full absolute inset-0' : ''}`}
            onError={handleError}
            priority={priority}
            fill={isFilled}
            sizes={sizes}
            width={!isFilled ? (width || 400) : undefined}
            height={!isFilled ? (height || 400) : undefined}
            style={!isFilled ? { width: width || '100%', height: height || '100%', ...style } : style}
            unoptimized={primarySrc.startsWith('data:')}
          />
        ) : (
          <img
            src={primarySrc}
            alt={alt}
            className={`object-cover transition-opacity duration-300 ${isFilled ? 'w-full h-full absolute inset-0' : ''}`}
            onError={handleError}
            loading={priority ? undefined : 'lazy'}
            decoding="async"
            style={!isFilled ? { width: width || '100%', height: height || '100%', ...style } : style}
          />
        )
      ) : (
"""

content = content.replace(
"""      {primarySrc ? (
        <img
          src={primarySrc}
          alt={alt}
          className={`object-cover transition-opacity duration-300 ${isFilled ? 'w-full h-full absolute inset-0' : ''}`}
          onError={handleError}
          loading={priority ? undefined : 'lazy'}
          decoding="async"
          style={!isFilled ? { width: width || '100%', height: height || '100%' } : {}}
        />
      ) : (""", render_logic
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("OptimizedMenuImage patched successfully.")
