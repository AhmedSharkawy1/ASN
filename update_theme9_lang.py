import os
import sys

def modify_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update isAr state
    content = content.replace("const isAr = config.default_language === 'ar';", "const [lang, setLang] = useState<'ar' | 'en'>(config.default_language === 'en' ? 'en' : 'ar');\n    const isAr = lang === 'ar';")

    # 2. Update Layout Grid -> Flex Col
    grid_old = '                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">\n                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}\n                                {cat.items?.filter((i: any) => i.is_available !== false).map((item: any) => {\n                                    const hasMultiSizes = item.prices.length > 1;\n                                    return (\n                                        <div key={item.id} onClick={() => setSelectedItem({ item, catName: catName(cat), catImg: cat.image_url || cat.image })}\n                                            className={`relative rounded-[14px] rounded-[2rem] overflow-hidden cursor-pointer group transition-all duration-300 transform hover:-translate-y-1 ${hasMultiSizes ? \'col-span-2 flex flex-row\' : \'flex flex-col\'}`}'
    grid_new = '                            <div className="flex flex-col gap-3 md:gap-4">\n                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}\n                                {cat.items?.filter((i: any) => i.is_available !== false).map((item: any) => {\n                                    return (\n                                        <div key={item.id} onClick={() => setSelectedItem({ item, catName: catName(cat), catImg: cat.image_url || cat.image })}\n                                            className={`relative rounded-[14px] md:rounded-[2rem] overflow-hidden cursor-pointer group transition-all duration-300 transform hover:-translate-y-1 flex flex-row min-h-[8rem]`}'
    content = content.replace(grid_old, grid_new)

    # 3. Update Image size
    img_old = '{`overflow-hidden bg-gray-100 relative shrink-0 ${hasMultiSizes ? \'w-32 md:w-44\' : \'w-full h-32 md:h-32\'}`}'
    img_new = '{`overflow-hidden bg-gray-100 relative shrink-0 w-32 md:w-44`}'
    content = content.replace(img_old, img_new)

    # 4. Update body styling
    body_old = '<div className={`p-3 md:p-5 flex-1 flex flex-col ${hasMultiSizes ? \'text-right min-w-0\' : \'text-center\'}`}>\n                                                <h3 className={`font-extrabold ${hasMultiSizes ? \'text-[14px] md:text-lg\' : \'text-[13px] md:text-base\'} mb-1 md:mb-2 line-clamp-1 leading-tight`} style={{ color: textDark }}>'
    body_new = '<div className={`p-3 md:p-4 flex-1 flex flex-col text-right min-w-0`} dir={isAr ? \'rtl\' : \'ltr\'}>\n                                                <h3 className={`font-extrabold text-[14px] md:text-lg mb-1 md:mb-2 line-clamp-1 leading-tight`} style={{ color: textDark }}>'
    content = content.replace(body_old, body_new)

    # 5. Remove Login & Add Language toggle
    links_old_1 = '{ label: isAr ? \'المنيو\' : \'Menu\', icon: <UtensilsCrossed className="w-5 h-5" />, action: () => { document.querySelector(\'nav\')?.scrollIntoView(); setIsDrawerOpen(false); } },\n                                    { label: isAr ? \'تسجيل الدخول\' : \'Login\', icon: <User className="w-5 h-5" />, action: () => { } },'
    links_old_2 = '{ label: isAr ? \'أقسام وأصناف\' : \'Menu\', icon: <UtensilsCrossed className="w-5 h-5" />, action: () => { document.querySelector(\'nav\')?.scrollIntoView(); setIsDrawerOpen(false); } },\n                                    { label: isAr ? \'تسجيل الدخول\' : \'Login\', icon: <User className="w-5 h-5" />, action: () => { } },'
    links_new = '{ label: isAr ? \'أقسام وأصناف\' : \'Menu\', icon: <UtensilsCrossed className="w-5 h-5" />, action: () => { document.querySelector(\'nav\')?.scrollIntoView(); setIsDrawerOpen(false); } },'
    
    content = content.replace(links_old_1, links_new)
    content = content.replace(links_old_2, links_new)

    # Sometimes login is separated
    login_str = '{ label: isAr ? \'تسجيل الدخول\' : \'Login\', icon: <User className="w-5 h-5" />, action: () => { } },'
    content = content.replace(login_str, '')

    # Add language toggle
    theme_old = 'action: () => setTheme(isDark ? \'light\' : \'dark\')\n                                    }\n                                ].map((lnk, i) => ('
    theme_new = 'action: () => setTheme(isDark ? \'light\' : \'dark\')\n                                    },\n                                    { label: isAr ? \'English\' : \'العربية\', icon: <Globe className="w-5 h-5" />, action: () => { setLang(isAr ? \'en\' : \'ar\'); setIsDrawerOpen(false); } }\n                                ].map((lnk, i) => ('
    content = content.replace(theme_old, theme_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Modified {filepath}")

modify_file(r"f:\ASN\ASN\src\components\menu\Theme9Menu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9CyanMenu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9EmeraldMenu.tsx")
modify_file(r"f:\ASN\ASN\src\components\menu\Theme9SkyMenu.tsx")
