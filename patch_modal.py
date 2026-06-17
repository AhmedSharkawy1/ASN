import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    content = f.read()

old_block = """                                    <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                                        <span className="font-bold">{isAr ? 'السعر' : 'Price'}</span>
                                        <div className="flex gap-2 items-center" dir="ltr">
                                            <span className="text-3xl font-black" style={{ color: primaryColor }}>{selectedItem.item.prices?.[0]} {cur}</span>
                                            {selectedItem.item.old_prices?.[0] ? <span className="text-lg line-through" style={{ color: textMuted }}>{selectedItem.item.old_prices[0]} {cur}</span> : null}
                                        </div>
                                    </div>
                                </div>

                                {/* Add to Cart Huge Button */}
                                {config.orders_enabled !== false && (
                                    <button 
                                        onClick={addToCart} 
                                        className="w-full h-[64px] rounded-2xl flex items-center justify-between px-2 shadow-lg transition-transform active:scale-95 mb-8"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <div className="flex-1 text-center font-bold text-xl text-white">
                                            {isAr ? 'أضف للسلة' : 'Add to Cart'}
                                        </div>
                                        <div className="h-[48px] w-[64px] rounded-xl flex items-center justify-center bg-black/10 text-white font-bold" dir="ltr">
                                            {selectedItem.item.prices?.[0]} {cur}
                                        </div>
                                    </button>
                                )}"""

new_block = """                                    <div className="flex justify-between items-center bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                                        <span className="font-bold">{isAr ? 'السعر' : 'Price'}</span>
                                        <div className="flex gap-2 items-center" dir="ltr">
                                            <span className="text-3xl font-black" style={{ color: primaryColor }}>{selectedItem.item.prices?.[sizeIdx]} {cur}</span>
                                            {selectedItem.item.old_prices?.[sizeIdx] ? <span className="text-lg line-through" style={{ color: textMuted }}>{selectedItem.item.old_prices[sizeIdx]} {cur}</span> : null}
                                        </div>
                                    </div>
                                </div>

                                {/* Size Selection */}
                                {selectedItem.item.prices && selectedItem.item.prices.length > 1 && (
                                    <div className="mb-6">
                                        <label className="text-sm font-bold mb-3 block">{isAr ? 'اختر الحجم' : 'Choose Size'}</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {selectedItem.item.prices.map((p, idx) => {
                                                const label = selectedItem.item.size_labels?.[idx] || (isAr ? `حجم ${idx + 1}` : `Size ${idx + 1}`);
                                                const isSelected = sizeIdx === idx;
                                                return (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setSizeIdx(idx)}
                                                        className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${isSelected ? 'shadow-md scale-[1.02]' : 'hover:bg-black/5 dark:hover:bg-white/5'}`}
                                                        style={{
                                                            borderColor: isSelected ? primaryColor : 'transparent',
                                                            backgroundColor: isSelected ? `${primaryColor}15` : 'var(--glass-dark)'
                                                        }}
                                                    >
                                                        <span className="font-bold text-sm mb-1">{label}</span>
                                                        <span className="text-xs font-black" style={{ color: primaryColor }}>{p} {cur}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Quantity Selection */}
                                {config.orders_enabled !== false && (
                                    <div className="mb-8 flex items-center justify-between bg-black/5 dark:bg-white/5 p-4 rounded-2xl">
                                        <span className="font-bold">{isAr ? 'الكمية' : 'Quantity'}</span>
                                        <div className="flex items-center gap-4 bg-white dark:bg-black/40 rounded-xl px-2 py-1 shadow-sm border border-glass-border">
                                            <button 
                                                onClick={() => setQty(Math.max(1, qty - 1))}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                style={{ color: textMain }}
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                            <span className="font-bold w-6 text-center">{qty}</span>
                                            <button 
                                                onClick={() => setQty(qty + 1)}
                                                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                                                style={{ color: primaryColor }}
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Add to Cart Huge Button */}
                                {config.orders_enabled !== false && (
                                    <button 
                                        onClick={addToCart} 
                                        className="w-full h-[64px] rounded-2xl flex items-center justify-between px-2 shadow-lg transition-transform active:scale-95 mb-8"
                                        style={{ backgroundColor: primaryColor }}
                                    >
                                        <div className="flex-1 text-center font-bold text-xl text-white">
                                            {isAr ? 'أضف للسلة' : 'Add to Cart'}
                                        </div>
                                        <div className="h-[48px] px-4 rounded-xl flex items-center justify-center bg-black/10 text-white font-bold" dir="ltr">
                                            {((selectedItem.item.prices?.[sizeIdx] || 0) * qty)} {cur}
                                        </div>
                                    </button>
                                )}"""

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("WARNING: Could not find block to replace!")

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Modal UI injected")
