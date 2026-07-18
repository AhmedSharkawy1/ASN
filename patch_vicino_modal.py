import sys

file_path = "f:/ASN/ASN/src/components/menu/ThemeVicinoMenu.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update the Modal Container
old_modal_start = """                    <motion.div 
                        initial={{ opacity: 0, y: '100%' }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 flex flex-col"
                        style={{ backgroundColor: bgBody }}
                    >"""
new_modal_start = """                    <motion.div 
                        initial={{ opacity: 0, y: '100%' }} 
                        animate={{ opacity: 1, y: 0 }} 
                        exit={{ opacity: 0, y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed inset-0 z-50 flex flex-col md:items-center md:justify-center md:bg-black/60 md:backdrop-blur-sm"
                        style={{ backgroundColor: typeof window !== 'undefined' && window.innerWidth < 768 ? bgBody : undefined }}
                    >
                        <div className="flex flex-col w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl overflow-hidden shadow-2xl relative" style={{ backgroundColor: bgBody }}>"""
content = content.replace(old_modal_start, new_modal_start)

# 2. Add an extra closing div at the end of the modal before </motion.div>
content = content.replace("                    </motion.div>\n                )}", "                        </div>\n                    </motion.div>\n                )}")

# 3. Fix the "Add to Cart" button (remove fixed bottom-0)
old_bottom_action = """                        {/* Bottom Actions */}
                        <div className="fixed bottom-0 left-0 right-0 p-5 z-20" style={{ backgroundColor: bgBody }}>"""
new_bottom_action = """                        {/* Bottom Actions */}
                        <div className="shrink-0 p-5 z-20 border-t" style={{ backgroundColor: bgBody, borderColor }}>"""
content = content.replace(old_bottom_action, new_bottom_action)

# 4. Remove the `pb-24` from the scrolling area so the bottom action fits perfectly
content = content.replace('<div className="flex-1 overflow-y-auto pb-24">', '<div className="flex-1 overflow-y-auto">')

# 5. Fix the Image height in the modal so it's not massively stretched on desktop
# from `h-[320px]` to `h-[250px] md:h-[320px] shrink-0`
content = content.replace('<div className="w-full h-[320px] relative">', '<div className="w-full h-[280px] md:h-[350px] shrink-0 relative">')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Vicino Modal Patched.")
