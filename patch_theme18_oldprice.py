import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

# Replace block 1 (Featured)
b1_old = """                                                                {item.prices?.length === 1 && (
                                                                    <span className="text-sm line-through opacity-50">{Math.round(price * 1.3)}</span>
                                                                )}"""
b1_new = """                                                                {item.old_prices?.[pIdx] ? (
                                                                    <span className="text-sm line-through opacity-50">{item.old_prices[pIdx]}</span>
                                                                ) : null}"""
content = content.replace(b1_old, b1_new)

# Replace block 2 (Grid/List)
b2_old = """                                                                {item.prices?.length === 1 && (
                                                                    <span className="text-[10px] line-through" style={{ color: textMuted }}>{Math.round(price * 1.3)}</span>
                                                                )}"""
b2_new = """                                                                {item.old_prices?.[pIdx] ? (
                                                                    <span className="text-[10px] line-through" style={{ color: textMuted }}>{item.old_prices[pIdx]}</span>
                                                                ) : null}"""
content = content.replace(b2_old, b2_new)

# Replace block 3 (Modal selectedItem)
b3_old = """                                            {selectedItem.item.prices?.[0] && <span className="text-lg line-through" style={{ color: textMuted }}>{Math.round(selectedItem.item.prices[0] * 1.3)} {cur}</span>}"""
b3_new = """                                            {selectedItem.item.old_prices?.[0] ? <span className="text-lg line-through" style={{ color: textMuted }}>{selectedItem.item.old_prices[0]} {cur}</span> : null}"""
content = content.replace(b3_old, b3_new)

# Replace block 4 (You might also like)
b4_old = """                                                                                {item.prices?.length === 1 && (
                                                                                    <span className="text-[9px] line-through" style={{ color: textMuted }}>{Math.round(price * 1.3)}</span>
                                                                                )}"""
b4_new = """                                                                                {item.old_prices?.[pIdx] ? (
                                                                                    <span className="text-[9px] line-through" style={{ color: textMuted }}>{item.old_prices[pIdx]}</span>
                                                                                ) : null}"""
content = content.replace(b4_old, b4_new)

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Theme18 patched for old_prices")
