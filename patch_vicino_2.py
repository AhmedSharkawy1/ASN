import re

file_path = "src/components/menu/ThemeVicinoMenu.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Colors
content = content.replace("const T19_PRIMARY = '#f97316';", "const T19_PRIMARY = '#B8860B';")
content = content.replace("const bgBody = isDark ? '#111111' : '#F5F5DC';", "const bgBody = isDark ? '#111111' : '#F4EEE4';")
content = content.replace("bg-[#F5F5DC]", "bg-[#F4EEE4]")
content = content.replace("to-[#F5F5DC]", "to-[#F4EEE4]")
content = content.replace("const bgCard = isDark ? '#1c1c1e' : '#ffffff';", "const bgCard = isDark ? '#1c1c1e' : '#FAF7F1';")
content = content.replace("bg-white", "bg-white") # Some other bg-whites could be left alone, but item cards use bgCard or we need to replace specific bg-white classes.
# Wait, let's check if cards use bgCard or bg-white class
# Actually, the theme is dynamically styled using style={{backgroundColor: bgCard}}. So replacing bgCard is enough.

# 2. Logo Size and Source
old_logo_ui = """<OptimizedMenuImage src={config.logo_url} alt={config.name} className="h-16 w-16 rounded-full object-contain shadow-sm mb-2" useOriginal={true} />"""
new_logo_ui = """<OptimizedMenuImage src={config.vicino_logo_url || config.logo_url} alt={config.name} className="h-32 w-32 rounded-3xl object-contain shadow-sm mb-4 bg-white/10 p-2" useOriginal={true} />"""
content = content.replace(old_logo_ui, new_logo_ui)

# 3. Add Home button next to Share button
old_share_btn = """<button onClick={handleShare} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 transition-colors shadow-sm">
                        <Share2 className="w-5 h-5" />
                    </button>"""
new_share_btn = """<div className="flex gap-2">
                        {config.vicino_landing_enabled && (
                            <button onClick={() => setShowLandingPage(true)} className="w-10 h-10 rounded-full flex items-center justify-center bg-[#B8860B]/10 text-[#B8860B] transition-colors shadow-sm" title={isAr ? "الرئيسية" : "Home"}>
                                <Home className="w-5 h-5" />
                            </button>
                        )}
                        <button onClick={handleShare} className="w-10 h-10 rounded-full flex items-center justify-center bg-black/5 dark:bg-white/10 transition-colors shadow-sm">
                            <Share2 className="w-5 h-5" />
                        </button>
                    </div>"""
content = content.replace(old_share_btn, new_share_btn)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("ThemeVicinoMenu patched successfully.")
