import codecs

with codecs.open('src/components/menu/Theme18Menu.tsx', 'r', 'utf-8') as f:
    content = f.read()

# 1. Imports
imports_addition = """import CheckoutModal from './CheckoutModal';
import { FaWhatsapp, FaFacebookF, FaSnapchatGhost, FaInstagram, FaTiktok, FaMapMarkerAlt, FaPhoneAlt } from 'react-icons/fa';
"""
content = content.replace("import ASNFooter from '@/components/menu/ASNFooter';", "import ASNFooter from '@/components/menu/ASNFooter';\n" + imports_addition)

# 2. Language State and isAr
old_lang = """    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const isAr = config.default_language === 'ar' || true; // Layout is strictly RTL from screenshots
    const isDark = mounted && theme === 'dark';
    const cur = config.currency || (isAr ? "ج.م" : "EGP");"""

new_lang = """    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    const [currentLang, setCurrentLang] = useState<'ar'|'en'>(config.default_language === 'en' ? 'en' : 'ar');
    const isAr = currentLang === 'ar';
    const isDark = mounted && theme === 'dark';
    const cur = config.currency || (isAr ? "ج.م" : "EGP");"""
content = content.replace(old_lang, new_lang)

# 3. New Modals States
old_states = """    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string }[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);"""

new_states = """    const [cart, setCart] = useState<{ id: string, item: MenuItem, catName: string, price: number, sizeLabel: string, quantity: number, notes: string }[]>([]);
    const [showCheckout, setShowCheckout] = useState(false);
    const [showContactModal, setShowContactModal] = useState(false);
    const [showMenuCategories, setShowMenuCategories] = useState(false);"""
content = content.replace(old_states, new_states)

# 4. Logo Shape
old_logo = """<img src={config.logo_url} alt={config.name} className="h-16 object-contain" />"""
new_logo = """<img src={config.logo_url} alt={config.name} className="h-16 w-16 rounded-full object-cover shadow-sm" />"""
content = content.replace(old_logo, new_logo)

# 5. Language Toggle Buttons
old_lang_toggle = """                <div className="flex justify-center items-center gap-2 mb-6 bg-black/5 dark:bg-white/5 w-fit mx-auto rounded-full p-1">
                    <button className="px-5 py-1.5 rounded-full font-bold text-sm bg-transparent">
                        English
                    </button>
                    <button className="px-5 py-1.5 rounded-full font-bold text-sm text-white shadow-md" style={{ backgroundColor: primaryColor }}>
                        العربية
                    </button>
                </div>"""

new_lang_toggle = """                <div className="flex justify-center items-center gap-2 mb-6 bg-black/5 dark:bg-white/5 w-fit mx-auto rounded-full p-1" dir="ltr">
                    <button 
                        onClick={() => setCurrentLang('en')}
                        className="px-5 py-1.5 rounded-full font-bold text-sm transition-all"
                        style={{ backgroundColor: !isAr ? primaryColor : 'transparent', color: !isAr ? '#fff' : textMain, boxShadow: !isAr ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none' }}>
                        English
                    </button>
                    <button 
                        onClick={() => setCurrentLang('ar')}
                        className="px-5 py-1.5 rounded-full font-bold text-sm transition-all"
                        style={{ backgroundColor: isAr ? primaryColor : 'transparent', color: isAr ? '#fff' : textMain, boxShadow: isAr ? '0 4px 6px -1px rgb(0 0 0 / 0.1)' : 'none' }}>
                        العربية
                    </button>
                </div>"""
content = content.replace(old_lang_toggle, new_lang_toggle)

# 6. Featured Offers Autoplay
old_swiper = """<Swiper spaceBetween={15} slidesPerView={1.5} className="w-full">"""
new_swiper = """<Swiper spaceBetween={15} slidesPerView={1.5} className="w-full" modules={[Autoplay]} autoplay={{ delay: 2500, disableOnInteraction: false }} loop={featuredItems.length > 2}>"""
content = content.replace(old_swiper, new_swiper)

# 7. Bottom Nav Menu & Contact Buttons
old_bottom_nav_menu = """                    <button 
                        onClick={() => { setNavTab('menu'); setIsCartOpen(false); setShowCheckout(false); }}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all"
                        style={{ color: navTab === 'menu' && !isCartOpen ? primaryColor : textMuted, backgroundColor: navTab === 'menu' && !isCartOpen ? ${primaryColor}15 : 'transparent' }}
                    >
                        <Home className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">المنيو</span>
                    </button>"""

new_bottom_nav_menu = """                    <button 
                        onClick={() => { setNavTab('menu'); setIsCartOpen(false); setShowCheckout(false); setShowMenuCategories(true); }}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all"
                        style={{ color: navTab === 'menu' && !isCartOpen ? primaryColor : textMuted, backgroundColor: navTab === 'menu' && !isCartOpen ? ${primaryColor}15 : 'transparent' }}
                    >
                        <Home className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{isAr ? 'المنيو' : 'Menu'}</span>
                    </button>"""
content = content.replace(old_bottom_nav_menu, new_bottom_nav_menu)

old_bottom_nav_cart = """<span className="text-[10px] font-bold">سلة الطلبات</span>"""
new_bottom_nav_cart = """<span className="text-[10px] font-bold">{isAr ? 'السلة' : 'Cart'}</span>"""
content = content.replace(old_bottom_nav_cart, new_bottom_nav_cart)

old_bottom_nav_contact = """                    <button 
                        onClick={() => { setNavTab('contact'); /* Handled later */ }}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all"
                        style={{ color: navTab === 'contact' && !isCartOpen ? primaryColor : textMuted, backgroundColor: navTab === 'contact' && !isCartOpen ? ${primaryColor}15 : 'transparent' }}
                    >
                        <User className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">تواصل</span>
                    </button>"""

new_bottom_nav_contact = """                    <button 
                        onClick={() => { setNavTab('contact'); setShowContactModal(true); setIsCartOpen(false); setShowCheckout(false); }}
                        className="flex-1 flex flex-col items-center justify-center py-2 rounded-full transition-all"
                        style={{ color: navTab === 'contact' && !isCartOpen ? primaryColor : textMuted, backgroundColor: navTab === 'contact' && !isCartOpen ? ${primaryColor}15 : 'transparent' }}
                    >
                        <User className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{isAr ? 'تواصل' : 'Contact'}</span>
                    </button>"""
content = content.replace(old_bottom_nav_contact, new_bottom_nav_contact)

old_bottom_nav_dark = """<span className="text-[10px] font-bold">{isDark ? 'مضيء' : 'مظلم'}</span>"""
new_bottom_nav_dark = """<span className="text-[10px] font-bold">{isDark ? (isAr ? 'مضيء' : 'Light') : (isAr ? 'مظلم' : 'Dark')}</span>"""
content = content.replace(old_bottom_nav_dark, new_bottom_nav_dark)

# 8. Modals Append
modals = """
            {/* Contact Modal */}
            <AnimatePresence>
                {showContactModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex justify-center py-16 px-5"
                        onClick={() => setShowContactModal(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[400px] rounded-[2rem] mx-auto flex flex-col shadow-2xl p-6"
                            style={{ backgroundColor: bgCard, maxHeight: 'max-content', marginTop: 'auto', marginBottom: 'auto' }}
                            onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold">{isAr ? 'تواصل معنا' : 'Contact Us'}</h2>
                                <button onClick={() => setShowContactModal(false)} className="w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/10 rounded-full"><X className="w-5 h-5" /></button>
                            </div>
                            
                            <div className="space-y-4">
                                {(config.phone || (config.phone_numbers && config.phone_numbers.length > 0)) && (
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}><FaPhoneAlt /></div>
                                        <div>
                                            <p className="text-sm font-bold opacity-70 mb-1">{isAr ? 'رقم الهاتف' : 'Phone Number'}</p>
                                            <a href={	el:} className="font-bold block" dir="ltr">{config.phone || config.phone_numbers[0]}</a>
                                        </div>
                                    </div>
                                )}
                                
                                {config.address && (
                                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-black/5 dark:bg-white/5">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: primaryColor }}><FaMapMarkerAlt /></div>
                                        <div>
                                            <p className="text-sm font-bold opacity-70 mb-1">{isAr ? 'العنوان' : 'Address'}</p>
                                            <p className="font-bold">{config.address}</p>
                                        </div>
                                    </div>
                                )}

                                {config.social_media && Object.keys(config.social_media).length > 0 && (
                                    <div className="pt-4 border-t border-black/10 dark:border-white/10">
                                        <p className="text-center font-bold mb-4">{isAr ? 'تابعنا على' : 'Follow Us'}</p>
                                        <div className="flex justify-center gap-4">
                                            {config.social_media.facebook && (
                                                <a href={config.social_media.facebook} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-[#1877F2] transition-transform hover:scale-110"><FaFacebookF /></a>
                                            )}
                                            {config.social_media.instagram && (
                                                <a href={config.social_media.instagram} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] transition-transform hover:scale-110"><FaInstagram /></a>
                                            )}
                                            {config.social_media.snapchat && (
                                                <a href={config.social_media.snapchat} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-black text-xl bg-[#FFFC00] transition-transform hover:scale-110"><FaSnapchatGhost /></a>
                                            )}
                                            {config.social_media.tiktok && (
                                                <a href={config.social_media.tiktok} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-[#000000] dark:border dark:border-zinc-700 transition-transform hover:scale-110"><FaTiktok /></a>
                                            )}
                                            {config.social_media.whatsapp && (
                                                <a href={config.social_media.whatsapp} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-[#25D366] transition-transform hover:scale-110"><FaWhatsapp /></a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Menu Categories Modal/Drawer */}
            <AnimatePresence>
                {showMenuCategories && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex justify-center py-16 px-5 mb-safe"
                        onClick={() => setShowMenuCategories(false)}>
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="relative w-full max-w-[400px] max-h-[70vh] overflow-hidden rounded-[2rem] mx-auto flex flex-col shadow-2xl mt-auto"
                            style={{ backgroundColor: bgCard }}
                            onClick={e => e.stopPropagation()}>
                            <div className="p-5 flex justify-between items-center text-white shadow-md z-10 sticky top-0" style={{ backgroundColor: primaryColor }}>
                                <span className="font-bold text-lg">{isAr ? 'أقسام المنيو' : 'Menu Categories'}</span>
                                <button onClick={() => setShowMenuCategories(false)} className="w-8 h-8 flex items-center justify-center bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                                <button
                                    onClick={() => {
                                        setActiveCategory('all');
                                        setShowMenuCategories(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                    className="w-full text-start px-4 py-4 rounded-xl font-bold transition-colors"
                                    style={{ backgroundColor: activeCategory === 'all' ? ${primaryColor}20 : 'transparent', color: activeCategory === 'all' ? primaryColor : textMain }}
                                >
                                    {isAr ? 'الكل' : 'All'}
                                </button>
                                {categories.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => {
                                            setActiveCategory(cat.id.toString());
                                            setShowMenuCategories(false);
                                            const el = document.getElementById(cat.id.toString());
                                            if(el) {
                                                const y = el.getBoundingClientRect().top + window.scrollY - 100;
                                                window.scrollTo({ top: y, behavior: 'smooth' });
                                            }
                                        }}
                                        className="w-full text-start px-4 py-4 rounded-xl font-bold transition-colors"
                                        dir={isAr ? 'rtl' : 'ltr'}
                                        style={{ backgroundColor: activeCategory === cat.id.toString() ? ${primaryColor}20 : 'transparent', color: activeCategory === cat.id.toString() ? primaryColor : textMain }}
                                    >
                                        {catName(cat)}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
"""

old_checkout = """            {/* Checkout Modal (Stubbed as simple text due to size limits, integrate real CheckoutModal later if needed) */}
            <AnimatePresence>
                {showCheckout && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[400] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-3xl p-6" style={{ backgroundColor: bgCard }}>
                            <h2 className="text-2xl font-bold mb-4">إتمام الطلب عبر واتساب</h2>
                            <p className="mb-6 text-sm" style={{ color: textMuted }}>سيتم تحويلك إلى تطبيق واتساب لإرسال الطلب مباشرة للمطعم.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowCheckout(false)} className="flex-1 py-3 rounded-2xl border font-bold" style={{ borderColor }}>إلغاء</button>
                                <button onClick={() => {
                                    let txt = طلب جديد من %0A%0A;
                                    cart.forEach(c => txt += ${c.quantity}x  -  %0A);
                                    txt += %0Aالإجمالي:  ;
                                    const tel = (config.phone || '').replace(/\D/g, '');
                                    window.open(https://wa.me/?text=, '_blank');
                                    setShowCheckout(false);
                                    setCart([]);
                                }} className="flex-1 py-3 rounded-2xl text-white font-bold" style={{ backgroundColor: '#25D366' }}>إرسال الطلب</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>"""

new_checkout = """            <CheckoutModal 
                isOpen={showCheckout} 
                onClose={() => setShowCheckout(false)} 
                cart={cart} 
                config={config} 
                restaurantId={restaurantId} 
                currency={cur} 
                language={currentLang} 
                primaryColor={primaryColor}
                onOrderSuccess={() => { setCart([]); setIsCartOpen(false); setShowCheckout(false); }}
            />"""

content = content.replace(old_checkout, modals + "\n" + new_checkout)

with codecs.open('src/components/menu/Theme18Menu.tsx', 'w', 'utf-8') as f:
    f.write(content)

print("Modifications done")
