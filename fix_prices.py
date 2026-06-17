import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

# Block 1
block1_old = """                                            <div className="text-left mt-auto" dir="ltr">
                                                <div className="flex items-center justify-end gap-2">
                                                    <span className="font-black text-xl">{item.prices?.[0]} {cur}</span>
                                                    {item.prices?.[0] && <span className="text-sm line-through opacity-50">{Math.round(item.prices[0] * 1.3)} {cur}</span>}
                                                </div>
                                            </div>"""

block1_new = """                                            <div className="text-left mt-auto w-full pt-2" dir="ltr">
                                                <div className="flex flex-col gap-1.5 w-full">
                                                    {item.prices?.map((price, pIdx) => (
                                                        <div key={pIdx} className="flex items-center justify-between w-full">
                                                            <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                                                                {item.size_labels?.[pIdx] && (
                                                                    <span className="text-xs font-bold opacity-70 truncate block">{item.size_labels[pIdx]}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                {item.prices?.length === 1 && (
                                                                    <span className="text-sm line-through opacity-50">{Math.round(price * 1.3)}</span>
                                                                )}
                                                                <span className="font-black text-lg">{price} {cur}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>"""

# Block 2
block2_old = """                                                <div className="mt-auto flex flex-col items-start gap-1" dir="ltr">
                                                    {item.prices?.[0] && <span className="text-[10px] line-through" style={{ color: textMuted }}>{Math.round(item.prices[0] * 1.3)} {cur}</span>}
                                                    <span className="font-black text-[1.1rem]" style={{ color: primaryColor }}>{item.prices?.[0]} {cur}</span>
                                                </div>"""

block2_new = """                                                <div className="mt-auto flex flex-col w-full gap-1 pt-2" dir="ltr">
                                                    {item.prices?.map((price, pIdx) => (
                                                        <div key={pIdx} className="flex items-center justify-between w-full">
                                                            <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                                                                {item.size_labels?.[pIdx] && (
                                                                    <span className="text-[10px] font-bold opacity-70 truncate block">{item.size_labels[pIdx]}</span>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                {item.prices?.length === 1 && (
                                                                    <span className="text-[10px] line-through" style={{ color: textMuted }}>{Math.round(price * 1.3)}</span>
                                                                )}
                                                                <span className="font-black text-[1.05rem]" style={{ color: primaryColor }}>{price} {cur}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>"""

# Block 3
block3_old = """                                                                <div className="flex items-center justify-center gap-1" dir="ltr">
                                                                    <span className="font-black text-[12px]" style={{ color: primaryColor }}>{item.prices?.[0]}</span>
                                                                    {item.prices?.[0] && <span className="text-[9px] line-through" style={{ color: textMuted }}>{Math.round(item.prices[0] * 1.3)}</span>}
                                                                </div>"""

block3_new = """                                                                <div className="flex flex-col gap-1 mt-auto w-full pt-1" dir="ltr">
                                                                    {item.prices?.map((price, pIdx) => (
                                                                        <div key={pIdx} className="flex items-center justify-between w-full">
                                                                            <div className="flex-1 min-w-0" dir={isAr ? 'rtl' : 'ltr'}>
                                                                                {item.size_labels?.[pIdx] && (
                                                                                    <span className="text-[9px] font-bold opacity-70 truncate block">{item.size_labels[pIdx]}</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex items-center gap-1 shrink-0 ml-1">
                                                                                {item.prices?.length === 1 && (
                                                                                    <span className="text-[9px] line-through" style={{ color: textMuted }}>{Math.round(price * 1.3)}</span>
                                                                                )}
                                                                                <span className="font-black text-[12px]" style={{ color: primaryColor }}>{price}</span>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>"""

content = content.replace(block1_old, block1_new)
content = content.replace(block2_old, block2_new)
content = content.replace(block3_old, block3_new)

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Done")
