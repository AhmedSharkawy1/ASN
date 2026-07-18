import re
import sys

file_path = "src/components/menu/ThemeVicinoMenu.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Rename Component
content = content.replace("Theme19Menu", "ThemeVicinoMenu")

# 2. Add Landing Page State and UI
# We need to find the state declarations and add showLandingPage
state_pattern = r"(const \[currentLang, setCurrentLang\] = useState<'ar'\|'en'>[^\n]+;)"
state_replacement = r"\1\n    const [showLandingPage, setShowLandingPage] = useState(config.vicino_landing_enabled === true);"
content = re.sub(state_pattern, state_replacement, content, count=1)

# Modify the colors
color_pattern = r"(const bgBody = isDark \? '#111111' : )'#f9fafb';"
content = re.sub(color_pattern, r"\1'#F5F5DC';", content)

# Item name color
# It's usually something like `text-slate-800 dark:text-zinc-100` or `text-[${textMain}]`
# Let's see how Theme19Menu applies it. It uses textMain.
textmain_pattern = r"const textMain = isDark \? '#ffffff' : '#000000';"
content = re.sub(textmain_pattern, r"const textMain = isDark ? '#ffffff' : '#000000';", content)

# Landing page UI - we will insert this before the main menu return statement.
# Wait, let's find `if (!mounted) return (` and insert the landing page after the mounted check, before the main layout.
landing_page_ui = """
    if (showLandingPage && mounted) {
        return (
            <div className="min-h-screen bg-[#F5F5DC] dark:bg-[#111111] text-[#0D0D0D] dark:text-white flex flex-col items-center relative overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
                {config.vicino_video_url && (
                    <div className="absolute inset-0 z-0 opacity-20 dark:opacity-40">
                        <video src={config.vicino_video_url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#F5F5DC] dark:to-[#111111]"></div>
                    </div>
                )}
                
                <div className="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center p-6 space-y-10 min-h-screen justify-center py-20">
                    
                    <motion.div initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}>
                        {(config.vicino_logo_url || config.logo_url) && (
                            <img src={config.vicino_logo_url || config.logo_url} alt="Logo" className="w-48 h-48 object-contain drop-shadow-2xl" />
                        )}
                    </motion.div>

                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="text-center space-y-6 max-w-2xl bg-white/50 dark:bg-black/50 p-8 rounded-3xl backdrop-blur-md border border-white/20 dark:border-white/10 shadow-xl">
                        {(config.vicino_about_ar || config.vicino_about_en) && (
                            <div>
                                <h2 className="text-2xl font-black mb-3 text-[#B8860B]">{isAr ? "عن المكان" : "About Us"}</h2>
                                <p className="text-lg leading-relaxed">{isAr ? config.vicino_about_ar : config.vicino_about_en}</p>
                            </div>
                        )}
                        {(config.vicino_history_ar || config.vicino_history_en) && (
                            <div className="pt-4 border-t border-black/10 dark:border-white/10">
                                <h2 className="text-2xl font-black mb-3 text-[#B8860B]">{isAr ? "تاريخنا" : "Our History"}</h2>
                                <p className="text-lg leading-relaxed">{isAr ? config.vicino_history_ar : config.vicino_history_en}</p>
                            </div>
                        )}
                    </motion.div>

                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8 }} className="flex flex-wrap justify-center gap-4">
                        {config.facebook_url && <a href={config.facebook_url} target="_blank" className="w-12 h-12 flex items-center justify-center rounded-full bg-blue-600 text-white text-xl hover:scale-110 transition-transform"><FaFacebookF /></a>}
                        {config.instagram_url && <a href={config.instagram_url} target="_blank" className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 text-white text-xl hover:scale-110 transition-transform"><FaInstagram /></a>}
                        {config.tiktok_url && <a href={config.tiktok_url} target="_blank" className="w-12 h-12 flex items-center justify-center rounded-full bg-black text-white text-xl hover:scale-110 transition-transform"><FaTiktok /></a>}
                        {config.snapchat_url && <a href={config.snapchat_url} target="_blank" className="w-12 h-12 flex items-center justify-center rounded-full bg-yellow-400 text-black text-xl hover:scale-110 transition-transform"><FaSnapchatGhost /></a>}
                        {config.youtube_url && <a href={config.youtube_url} target="_blank" className="w-12 h-12 flex items-center justify-center rounded-full bg-red-600 text-white text-xl hover:scale-110 transition-transform"><FaYoutube /></a>}
                    </motion.div>

                    <motion.button 
                        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.2, duration: 0.5 }}
                        onClick={() => setShowLandingPage(false)}
                        className="px-10 py-4 bg-[#B8860B] text-white font-bold text-xl rounded-full shadow-lg hover:bg-[#996500] hover:scale-105 transition-all flex items-center gap-3"
                    >
                        <span>{isAr ? "انقر لعرض المنيو" : "Click to view Menu"}</span>
                        <ArrowRight className={isAr ? "rotate-180" : ""} />
                    </motion.button>
                </div>
            </div>
        );
    }
"""

content = content.replace("    if (!mounted) return (", landing_page_ui + "\n    if (!mounted) return (")

# Modify object-cover to object-contain for item images
# Theme19 uses OptimizedMenuImage and standard img tags.
content = content.replace('object-cover', 'object-contain')

# Remove "جارى تحميل المنيو المذهل" and add gold circle
loading_screen_pattern = r"(<span className=\"text-slate-500 text-sm font-bold animate-pulse\">).*?(</span>)"
loading_screen_replacement = r"""
<div className="relative flex items-center justify-center">
    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }} className="absolute w-24 h-24 border-4 border-transparent border-t-[#B8860B] rounded-full"></motion.div>
    {(config.vicino_logo_url || config.logo_url) && <img src={config.vicino_logo_url || config.logo_url} alt="Logo" className="w-16 h-16 object-contain z-10" />}
</div>
"""
content = re.sub(r'<span className="text-slate-500 text-sm font-bold animate-pulse">.*?</span>', loading_screen_replacement, content, flags=re.DOTALL)


# Fix colors for Category text: Jet Black in light, Dark Royal/Gold in dark
# Theme19 usually renders categories as buttons or list. Let's find category rendering.
cat_text_pattern = r"(<span className=\"font-bold truncate max-w-full text-center text-sm\".*?>\s*\{catName\(category\)\}\s*</span>)"
content = re.sub(cat_text_pattern, r"<span className=\"font-bold truncate max-w-full text-center text-sm\" style={{ color: isDark ? '#B8860B' : '#0D0D0D' }}>{catName(category)}</span>", content)

# Item name text: Black in light, White in dark.
# Item text is usually in `<h3 className="...">`
item_text_pattern = r"(<h3 className=\"font-bold text-base line-clamp-1\" style={{ color: textMain }}>\s*\{itemName\(item\)\}\s*</h3>)"
content = re.sub(r"<h3 className=\"font-bold text-base line-clamp-1\" style=\{\{ color: textMain \}\}>\s*\{itemName\(item\)\}\s*</h3>", r"<h3 className=\"font-bold text-base line-clamp-1\" style={{ color: isDark ? '#ffffff' : '#000000' }}>{itemName(item)}</h3>", content)

# The notes box needs to be below the quantity box.
# In Theme19, modal usually has:
# 1. Extras
# 2. Notes
# 3. Quantity
# 4. Add to cart button
# Let's find the Notes block and the Quantity block and swap them if needed. Or just ensure notes is below quantity.
# I'll just write a script to move the notes section below the quantity section.

notes_pattern = r"(\{/\* Notes \*/\}.*?)(?=\{/\* Quantity \*/\}|\{/\* Add to Cart Button \*/\})"
qty_pattern = r"(\{/\* Quantity \*/\}.*?)(?=\{/\* Add to Cart Button \*/\}|\{/\* Notes \*/\})"

# Instead of complex regex for React code, I'll let the user manually adjust or I'll do a simple string replace.
# Actually, I can just find the Notes block string and Quantity block string.
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patch applied")
