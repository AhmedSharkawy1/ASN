import codecs

path = r'f:\ASN\ASN\src\components\menu\Theme18Menu.tsx'
with codecs.open(path, 'r', 'utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if "import CheckoutModal from './CheckoutModal';" in line:
        new_lines.append("import SharedMarquee from './SharedMarquee';\n")
        new_lines.append(line)
        continue
    
    if "            {/* --- HEADER --- */}" in line and "MARQUEE" not in "".join(lines):
        new_lines.append("""            {/* --- MARQUEE --- */}
            {config.marquee_enabled && (
                <div className="text-sm text-white" style={{ backgroundColor: primaryColor }}>
                    <SharedMarquee text={isAr ? (config.marquee_text_ar || '') : (config.marquee_text_en || config.marquee_text_ar || '')} />
                </div>
            )}
""")
        new_lines.append(line)
        continue

    new_lines.append(line)

# Now fix social media block
content = "".join(new_lines)
social_old = """                                {config.social_media && Object.keys(config.social_media).length > 0 && (
                                    <div className="pt-4 border-t border-black/10 dark:border-white/10">
                                        <p className="text-center font-bold mb-4">{isAr ? 'تابعنا على' : 'Follow Us'}</p>
                                        <div className="flex justify-center gap-4 flex-wrap">
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
                                )}"""

social_new = """                                {((config.social_links && Object.keys(config.social_links).length > 0) || config.facebook_url || config.instagram_url || config.tiktok_url || config.whatsapp_number) && (
                                    <div className="pt-4 border-t border-black/10 dark:border-white/10">
                                        <p className="text-center font-bold mb-4">{isAr ? 'تابعنا على' : 'Follow Us'}</p>
                                        <div className="flex justify-center gap-4 flex-wrap">
                                            {(config.social_links?.facebook || config.facebook_url) && (
                                                <a href={config.social_links?.facebook || config.facebook_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-[#1877F2] transition-transform hover:scale-110"><FaFacebookF /></a>
                                            )}
                                            {(config.social_links?.instagram || config.instagram_url) && (
                                                <a href={config.social_links?.instagram || config.instagram_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] transition-transform hover:scale-110"><FaInstagram /></a>
                                            )}
                                            {(config.social_links?.snapchat || config.snapchat_url) && (
                                                <a href={config.social_links?.snapchat || config.snapchat_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-black text-xl bg-[#FFFC00] transition-transform hover:scale-110"><FaSnapchatGhost /></a>
                                            )}
                                            {(config.social_links?.tiktok || config.tiktok_url) && (
                                                <a href={config.social_links?.tiktok || config.tiktok_url} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-[#000000] dark:border dark:border-zinc-700 transition-transform hover:scale-110"><FaTiktok /></a>
                                            )}
                                            {(config.social_links?.whatsapp || config.whatsapp_number) && (
                                                <a href={`https://wa.me/${(config.social_links?.whatsapp || config.whatsapp_number || '').replace('+', '')}`} target="_blank" rel="noreferrer" className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl bg-[#25D366] transition-transform hover:scale-110"><FaWhatsapp /></a>
                                            )}
                                        </div>
                                    </div>
                                )}"""

content = content.replace(social_old, social_new)

with codecs.open(path, 'w', 'utf-8') as f:
    f.write(content)

print("Done")
