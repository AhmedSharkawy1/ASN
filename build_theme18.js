const fs = require('fs');

const content = fs.readFileSync('src/components/menu/Theme10Menu.tsx', 'utf-8');

const match1 = content.match(/([\s\S]*?if \(!mounted\)[\s\S]*?return \()/);
if (!match1) process.exit(1);
let pre_content = match1[1];
pre_content = pre_content.replace(/Theme10Menu/g, 'Theme18Menu');
pre_content = pre_content.replace(/T10_PRIMARY/g, 'T18_PRIMARY');
pre_content = pre_content.replace(/const bgBody = .*?;/, "const bgBody = '#0d0f14';");
pre_content = pre_content.replace(/const bgCard = .*?;/, "const bgCard = '#1a1d24';");
pre_content = pre_content.replace(/const textMain = .*?;/, "const textMain = '#ededed';");
pre_content = pre_content.replace(/const textMuted = .*?;/, "const textMuted = '#999999';");
pre_content = pre_content.replace(/const borderColor = .*?;/, "const borderColor = '#333333';");

const new_jsx = \        <div className="min-h-screen font-cairo pb-24" style={{ backgroundColor: bgBody, color: textMain }} dir={isAr ? 'rtl' : 'ltr'}>
            {/* Header Marquee */}
            {config.marquee_enabled && (
                <div className="bg-[#f97316] font-cairo text-sm text-white">
                    <SharedMarquee text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')} />
                </div>
            )}

            {/* Cart Button */}
            {config.orders_enabled !== false && (
                <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center rounded-full text-white shadow-lg bg-[#f97316] transition-transform active:scale-95 hover:bg-orange-600">
                    <ShoppingCart className="w-6 h-6" />
                    {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white text-xs font-bold flex items-center justify-center border-2 border-[#f97316] text-[#f97316]">
                            {cartCount}
                        </span>
                    )}
                </button>
            )}

            {/* Header Section */}
            <div className="text-center mb-8 pt-8">
                {config.logo_url && (
                    <img src={config.logo_url} alt={config.name} className="w-[100px] h-[100px] rounded-full object-cover mb-3 mx-auto" />
                )}
                <h1 className="text-[2em] font-black text-center">{config.name}</h1>
                <p className="text-[#999999] text-[0.9em] mt-1">
                    {(config.phone || config.phone_numbers?.[0]) && \\\📞 \\\\}
                    {config.address && \\\ • 📍 \\\\}
                </p>
                <p className="text-[#999999] text-[0.9em] mt-1">
                    🚚 {isAr ? 'توصيل متاح' : 'Delivery Available'}
                     • 🍽️ {isAr ? 'داين إن متاح' : 'Dine-in Available'}
                </p>
            </div>

            <main className="max-w-[900px] mx-auto px-5 w-full">
                <p className="text-center mb-6">
                    {isAr ? \\\تصفح منيو \ الكامل بالأسعار والصور.\\\ : \\\Browse \ full menu with prices and photos.\\\}
                </p>

                {categories.map((category) => {
                    const items = category.items || [];
                    if (items.length === 0) return null;

                    return (
                        <div key={category.id} id={category.id.toString()} className="mb-10">
                            <h2 className="text-[1.5em] font-bold text-[#f97316] mt-[2em] border-b-2 border-[#f97316] pb-2 mb-4">
                                {catName(category)}
                            </h2>
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4 mt-3">
                                {items.map((item) => (
                                    <div 
                                        key={item.id} 
                                        className="bg-[#1a1d24] border border-[#333333] rounded-[12px] p-4 overflow-hidden cursor-pointer hover:border-[#f97316] transition-colors"
                                        onClick={() => openModal(item, catName(category), category.image_url)}
                                    >
                                        <img 
                                            src={item.image_url || item.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c"} 
                                            alt={itemName(item)} 
                                            loading="lazy"
                                            className="w-full h-[160px] object-cover rounded-[8px] mb-2" 
                                        />
                                        <h3 className="font-bold text-[1.1em] m-0 mb-1">{itemName(item)}</h3>
                                        {(item.description_ar || item.desc_ar) && (
                                            <p className="text-[#999999] text-sm mb-2 line-clamp-2">
                                                {isAr ? (item.description_ar || item.desc_ar) : (item.description_en || item.desc_en || item.description_ar || item.desc_ar)}
                                            </p>
                                        )}
                                        <p className="text-[#f97316] font-bold text-[1.1em]">
                                            {item.prices?.[0]} {cur}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </main>

            {/* Target Footer Replica */}
            <footer style={{ marginTop: '3em', paddingTop: '2em', borderTop: '1px solid #333', textAlign: 'center', color: '#666' }}>
                <p>منيو {config.name} على <a href="https://menumasr.com" style={{ color: '#f97316' }}>منيو مصر</a></p>
                <p className="mt-2 space-x-2 space-x-reverse">
                    <a href="https://menumasr.com/منيو-الكتروني" style={{ color: '#f97316' }}>منيو الكتروني</a> • 
                    <a href="https://menumasr.com/منيو-رقمي" style={{ color: '#f97316' }}>منيو رقمي</a> • 
                    <a href="https://menumasr.com/منيو-qr-code" style={{ color: '#f97316' }}>منيو QR Code</a>
                </p>
            </footer>
\;

const match2 = content.match(/(            {\/\* Modal \*\/}[\s\S]*)/);
if (!match2) process.exit(1);
let modals = match2[1];

const match3 = modals.match(/([\s\S]*<\/CheckoutModal>)/);
if (match3) {
    modals = match3[1];
}

modals = modals.replace(/bg-white dark:bg-slate-800/g, 'bg-[#1a1d24]');
modals = modals.replace(/bg-slate-50 dark:bg-slate-900/g, 'bg-[#0d0f14]');
modals = modals.replace(/border-slate-200 dark:border-slate-700/g, 'border-[#333333]');
modals = modals.replace(/bg-gray-100 dark:bg-slate-700/g, 'bg-[#333333]');
modals = modals.replace(/text-gray-500 dark:text-gray-400/g, 'text-[#999999]');
modals = modals.replace(/text-slate-900 dark:text-white/g, 'text-[#ededed]');

let final_content = pre_content + "\n    <>\n" + new_jsx + "\n" + modals + "\n        </div>\n        </>\n    );\n}\n";

fs.writeFileSync('src/components/menu/Theme18Menu.tsx', final_content, 'utf-8');
console.log("Done");
