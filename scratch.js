const fs = require('fs');

const path = 'f:\\ASN\\ASN\\src\\components\\menu\\Theme17Menu.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update CartItem type definition
content = content.replace(
    /type CartItem = {[\s\S]*?category_name: string;\n};/,
    `type CartItem = {
    id: string;
    item: Item;
    price: number;
    size_label: string;
    quantity: number;
    category_name: string;
    note?: string;
};`
);

// 2. Add New States
content = content.replace(
    /const \[itemSizeIdx, setItemSizeIdx\] = useState\(0\);/,
    `const [itemSizeIdx, setItemSizeIdx] = useState(0);
    const [itemNote, setItemNote] = useState('');
    const [showDeliveryModal, setShowDeliveryModal] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');`
);

// 3. Clear note when opening modal
// Wait, showItemModal is set multiple times.
// E.g. setShowItemModal({item, cName: catName(cat)});
content = content.replace(
    /setShowItemModal\(\{item, cName: catName\(cat\)\}\);/g,
    `setShowItemModal({item, cName: catName(cat)});
                                                        setItemNote('');`
);

// 4. Update addToCart logic
content = content.replace(
    /const cartId = \`\$\{item\.id\}-\$\{sLabel\}\`;/,
    `const cartId = \`\$\{item.id\}-\$\{sLabel\}-\$\{itemNote\}\`;`
);

content = content.replace(
    /return prev\.map\(c => c\.id === cartId \? \{ \.\.\.c, quantity: c\.quantity \+ itemQty \} : c\);/,
    `return prev.map(c => c.id === cartId ? { ...c, quantity: c.quantity + itemQty } : c);`
);

content = content.replace(
    /category_name: cName\n\s*\}\];/,
    `category_name: cName,\n                note: itemNote\n            }];`
);

content = content.replace(
    /setShowItemModal\(null\);\n\s*showToast/,
    `setShowItemModal(null);
        setItemNote('');
        showToast`
);

// 5. checkOutWhatsApp updates
content = content.replace(
    /if \(c\.size_label && c\.item\.size_labels && c\.item\.size_labels\.length > 1\) \{\n\s*msg \+= \`   📏 الحجم: \$\{c\.size_label\}\\n\`;\n\s*\}/,
    `if (c.size_label && c.item.size_labels && c.item.size_labels.length > 1) {
                msg += \`   📏 الحجم: \$\{c.size_label\}\\n\`;
            }
            if (c.note) {
                msg += \`   📝 ملاحظات: \$\{c.note\}\\n\`;
            }`
);

// 6. Marquee Animation REVERSE
content = content.replace(
    /0% \{ transform: translateX\(0\); \}\n\s*100% \{ transform: translateX\(-50\%\); \}/,
    `0% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }`
);

// 7. Search Icon onClick
content = content.replace(
    /<button className="text-gray-800 hover:text-red-600 transition" aria-label="Search">/,
    `<button className="text-gray-800 hover:text-red-600 transition" aria-label="Search" onClick={() => setIsSearchOpen(true)}>`
);

// 8. Add Item Modal image and text note
let itemModalSearch = /<div className="p-6">[\s\S]*?<p className="text-gray-600 text-sm mb-5 leading-relaxed font-medium">/;
let itemModalReplace = `<div className="p-6">
                                {!showItemModal.item.image_url && (
                                    <div className="flex justify-between items-start mb-3">
                                        <h3 className="font-black text-[#d32f2f] text-xl">{itemName(showItemModal.item)}</h3>
                                        <button className="text-gray-400 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center" onClick={() => setShowItemModal(null)}><X size={18} className="stroke-[2]" /></button>
                                    </div>
                                )}
                                {showItemModal.item.image_url && (
                                    <h3 className="font-black text-[#d32f2f] text-xl mb-2">{itemName(showItemModal.item)}</h3>
                                )}
                                
                                <p className="text-gray-600 text-sm mb-5 leading-relaxed font-medium">`;
content = content.replace(itemModalSearch, itemModalReplace); // wait, I already have this logic? Yes. Let's append the Note field right before the "Add to cart" button.

const addNoteField = `
                                <div className="mb-6">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">{isRTL ? 'إضافة ملاحظة (اختياري)' : 'Add a Note (Optional)'}</label>
                                    <textarea 
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:border-[#d32f2f] focus:ring-1 focus:ring-[#d32f2f] transition-all min-h-[80px]"
                                        placeholder={isRTL ? "مثال: بدون بصل، زيادة صوص..." : "e.g. No onions, extra sauce..."}
                                        value={itemNote}
                                        onChange={(e) => setItemNote(e.target.value)}
                                    />
                                </div>
`;
content = content.replace(
    /                                <button \n\s*className="w-full bg-\[\#d32f2f\] text-white py-4 rounded-\[20px\] font-black text-lg flex justify-between items-center px-6 shadow-\[0_8px_20px_rgba\(211,47,47,0\.3\)\]/,
    addNoteField + `\n                                <button \n                                    className="w-full bg-[#d32f2f] text-white py-4 rounded-[20px] font-black text-lg flex justify-between items-center px-6 shadow-[0_8px_20px_rgba(211,47,47,0.3)]`
);

// 9. Floating Delivery Button & all the NEW MODALS & FOOTER for Menu View.
// Footer should be inserted at the end of the Menu View Products List.
// Search for \`{/* Side Drawer Menu */}\`
const footerHTML = `
            {/* Menu Dark Footer */}
            <div className="bg-[#0a0f16] w-full pt-14 pb-14 rounded-t-[40px] px-6 text-white shadow-[0_-10px_40px_rgba(0,0,0,0.15)] mt-6 mb-20">
                <div className="flex flex-col items-center border-b border-white/10 pb-8 mb-8">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center p-2 mb-4 overflow-hidden relative shadow-lg">
                        {config.logo_url && <Image src={config.logo_url} fill className="object-contain p-1" alt="Logo"/>}
                    </div>
                    <h2 className="text-[20px] font-black mb-5 tracking-wide text-center">
                        {isRTL ? 'مطعم' : 'Restaurant'} {config.name}
                    </h2>
                    <div className="flex gap-4">
                        {(config.social_links?.instagram || config.instagram_url) && (
                            <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-[16px] border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition">
                                <FaInstagram size={22} />
                            </a>
                        )}
                        {(config.social_links?.facebook || config.facebook_url) && (
                            <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-[16px] border border-white/20 flex items-center justify-center text-white hover:bg-white/10 transition">
                                <FaFacebookF size={20} />
                            </a>
                        )}
                    </div>
                </div>

                <h3 className="text-center font-bold text-lg mb-8 text-gray-200">{isRTL ? 'تواصل معنا' : 'Contact Us'}</h3>

                <div className="space-y-6 max-w-sm mx-auto">
                    {config.phone && (
                        <div>
                            <p className="font-bold flex items-center gap-2 mb-2 text-[15px] text-gray-300">
                                <span className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"><Phone className="w-3.5 h-3.5"/></span>
                                {isRTL ? 'الفرع الرئيسي' : 'Main Branch'}
                            </p>
                            <p className="text-xs text-gray-500 mb-1">{isRTL ? 'أرقام التليفون' : 'Phone Numbers'}</p>
                            <div className="bg-[#1b2330] p-4 text-center font-mono font-bold tracking-wider rounded-lg border border-white/5 text-[15px]">
                                <a href={\`tel:\${config.phone}\`} className="text-white hover:text-gray-300">{config.phone}</a>
                            </div>
                        </div>
                    )}
                    {config.whatsapp_number && (
                        <div>
                            <p className="font-bold flex items-center gap-2 mb-2 text-[15px] text-gray-300">
                                <span className="w-6 h-6 rounded-full bg-[#25D366]/20 flex items-center justify-center"><FaWhatsapp className="w-3.5 h-3.5 text-[#25D366]"/></span>
                                {isRTL ? 'واتس اب' : 'WhatsApp'}
                            </p>
                            <div className="bg-[#0f2c1c] p-4 text-center font-mono font-bold tracking-wider rounded-lg text-[#b4ead2] border border-[#25D366]/20 text-[15px]">
                                <a href={\`https://wa.me/\${config.whatsapp_number.replace(/\\+/g, '')}\`} target="_blank" rel="noreferrer" className="hover:text-white transition">
                                    {config.whatsapp_number}
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </div>
`;
content = content.replace(
    /\{\/\* Side Drawer Menu \*\/\}/,
    footerHTML + '\n            {/* Side Drawer Menu */}'
);

// 10. Center all Modals uniformly
content = content.replace(/items-end sm:items-center/g, 'items-center mt-0');
content = content.replace(/rounded-t-\[32px\] sm:rounded-2xl/g, 'rounded-2xl');
content = content.replace(/rounded-t-\[32px\] sm:rounded-\[24px\]/g, 'rounded-2xl max-h-[85vh]');

// 11. Add Floating Delivery Button and New Modals at the very end before "export default" ends (or before Toast notification)
const customModalsHTML = \`
            {/* Floating Delivery Button */}
            <button 
                className="fixed bottom-24 right-4 sm:right-10 z-[500] w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(239,68,68,0.4)] hover:bg-red-600 transition-colors animate-bounce"
                onClick={() => setShowDeliveryModal(true)}
                aria-label="Delivery"
            >
                <Phone size={26} fill="currentColor" />
            </button>

            {/* Delivery Contact Modal */}
            <AnimatePresence>
                {showDeliveryModal && (
                    <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-4 backdrop-blur-[2px]" onClick={() => setShowDeliveryModal(false)}>
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }} 
                            animate={{ scale: 1, opacity: 1 }} 
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[24px] w-full max-w-sm overflow-hidden shadow-2xl"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
                                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                                    <Phone className="w-5 h-5 text-red-500" />
                                    {isRTL ? 'أرقام التوصيل' : 'Delivery Numbers'}
                                </h3>
                                <button className="text-gray-400 bg-gray-50 rounded-full p-2 hover:text-gray-600 hover:bg-gray-100 transition" onClick={() => setShowDeliveryModal(false)}>
                                    <X size={20} className="stroke-[2]" />
                                </button>
                            </div>
                            <div className="p-6">
                                {(!config.phone_numbers || config.phone_numbers.length === 0) && !config.phone && (
                                    <p className="text-center text-gray-500">{isRTL ? 'لا توجد أرقام متاحة.' : 'No numbers available.'}</p>
                                )}
                                
                                {config.phone && (
                                    <div className="mb-4">
                                        <p className="text-xs text-gray-500 mb-1">{isRTL ? 'الفرع الرئيسي' : 'Main Branch'}</p>
                                        <a href={\`tel:\${config.phone}\`} className="flex items-center justify-between bg-red-50 p-4 rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
                                            <span className="font-mono font-bold text-gray-900 tracking-wider text-lg">{config.phone}</span>
                                            <Phone className="w-5 h-5 text-red-500 fill-current opacity-20" />
                                        </a>
                                    </div>
                                )}
                                
                                {config.phone_numbers && config.phone_numbers.length > 0 && config.phone_numbers.map((ph, idx) => (
                                    <div key={idx} className="mb-4 last:mb-0">
                                        <p className="text-xs text-gray-500 mb-1">{ph.label || (isRTL ? 'توصيل' : 'Delivery')}</p>
                                        <a href={\`tel:\${ph.number}\`} className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors">
                                            <span className="font-mono font-bold text-gray-900 tracking-wider text-lg">{ph.number}</span>
                                            <Phone className="w-5 h-5 text-gray-400 fill-current opacity-20" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Search Modal */}
            <AnimatePresence>
                {isSearchOpen && (
                    <div className="fixed inset-0 bg-white z-[1100] flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className="px-4 py-4 flex items-center gap-3 border-b border-gray-100 shadow-sm bg-white sticky top-0">
                            <div className="flex-1 relative">
                                <Search className={\`w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2 \${isRTL ? 'right-3' : 'left-3'}\`} />
                                <input 
                                    type="text" 
                                    placeholder={isRTL ? "ابحث عن منتج..." : "Search items..."}
                                    className={\`w-full bg-gray-100 border-none rounded-xl py-3 focus:ring-0 text-sm font-medium \${isRTL ? 'pr-10 pl-3' : 'pl-10 pr-3'}\`}
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button className="text-blue-600 font-bold px-2 text-sm" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
                                {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-[#fffdfd] p-4">
                            {searchQuery.trim().length > 0 ? (
                                <div className="flex flex-col gap-3">
                                    {categories.flatMap(c => c.items.map(i => ({...i, catName: catName(c)})))
                                        .filter(i => i.is_available !== false && itemName(i).toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map((item, idx) => (
                                            <div 
                                                key={idx} 
                                                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex items-center p-3 gap-3"
                                                onClick={() => {
                                                    setIsSearchOpen(false);
                                                    setSearchQuery('');
                                                    if(config.orders_enabled !== false) {
                                                        setShowItemModal({item, cName: item.catName});
                                                        setItemQty(1);
                                                        setItemSizeIdx(0);
                                                        setItemNote('');
                                                    }
                                                }}
                                            >
                                                {item.image_url ? (
                                                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 relative">
                                                        <Image src={item.image_url} alt="" fill className="object-cover rounded-lg" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-16 bg-red-50 rounded-lg flex-shrink-0 flex items-center justify-center">
                                                        <span className="text-xl">🍔</span>
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-900 text-sm">{itemName(item)}</h3>
                                                    <span className="text-red-500 font-bold text-sm mt-1">{item.prices?.[0] || 'N/A'} {cur}</span>
                                                </div>
                                                {config.orders_enabled !== false && (
                                                    <button className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center font-bold">
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    }
                                    {categories.flatMap(c => c.items).filter(i => i.is_available !== false && itemName(i).toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                        <p className="text-center text-gray-400 mt-10 text-sm font-bold">
                                            {isRTL ? 'لا توجد نتائج' : 'No results found'}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center pb-20">
                                    <Search className="w-16 h-16 text-gray-200 mb-4" />
                                    <p className="text-gray-400 font-medium text-sm">
                                        {isRTL ? 'اكتب اسم المنتج للبحث' : 'Type to search for items'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </AnimatePresence>
\`;

content = content.replace(
    /\{\/\* Toast Notification \*\/\}/,
    customModalsHTML + '\\n            {/* Toast Notification */}'
);

fs.writeFileSync(path, content);
console.log('Successfully updated Theme17Menu!');
