import os

file_path = "src/app/dashboard/menu/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update <ItemRow usage
old_itemrow_usage = """                                                            <ItemRow item={item} language={language}
                                                                onEdit={() => { setEditingItem(item.id); setEditingCat(null); setAddingItemToCat(null); }}
                                                                onDelete={() => handleDeleteItem(cat.id, item.id)}
                                                                isFirst={iIdx === 0}
                                                                isLast={iIdx === cat.items.length - 1}
                                                                onMoveUp={() => handleMoveItem(cat.id, iIdx, 'up')}
                                                                onMoveDown={() => handleMoveItem(cat.id, iIdx, 'down')}
                                                                currency={currency} />"""

new_itemrow_usage = """                                                            <ItemRow item={item} language={language}
                                                                onImageUpload={(f) => handleItemImageUpload(cat.id, item.id, f)}
                                                                onEdit={() => { setEditingItem(item.id); setEditingCat(null); setAddingItemToCat(null); }}
                                                                onDelete={() => handleDeleteItem(cat.id, item.id)}
                                                                isFirst={iIdx === 0}
                                                                isLast={iIdx === cat.items.length - 1}
                                                                onMoveUp={() => handleMoveItem(cat.id, iIdx, 'up')}
                                                                onMoveDown={() => handleMoveItem(cat.id, iIdx, 'down')}
                                                                currency={currency} />"""

content = content.replace(old_itemrow_usage, new_itemrow_usage)

# 2. Update ItemRow component definition
old_itemrow_def = """// ===================== ITEM ROW (read-only) =====================
function ItemRow({ item, language, onEdit, onDelete, isFirst, isLast, onMoveUp, onMoveDown, currency }: {
    item: Item; language: string;
    onEdit: () => void; onDelete: () => void;
    isFirst?: boolean; isLast?: boolean;
    onMoveUp?: () => void; onMoveDown?: () => void;
    currency?: string;
}) {
    return (
        <>
            {/* Main content: stacks vertically on mobile, horizontal on sm+ */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-glass-light flex items-center justify-center flex-shrink-0 border border-glass-border overflow-hidden">
                        {item.image_url ? <img src={item.image_url} alt={item.title_ar} className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-silver/50" />}
                    </div>"""

new_itemrow_def = """// ===================== ITEM ROW (read-only) =====================
function ItemRow({ item, language, onEdit, onDelete, isFirst, isLast, onMoveUp, onMoveDown, currency, onImageUpload }: {
    item: Item; language: string;
    onEdit: () => void; onDelete: () => void;
    isFirst?: boolean; isLast?: boolean;
    onMoveUp?: () => void; onMoveDown?: () => void;
    currency?: string;
    onImageUpload?: (file: File) => Promise<void>;
}) {
    const [uploading, setUploading] = useState(false);

    const handlePasteImage = async () => {
        if (!onImageUpload) return;
        try {
            const file = await getBestImageFromClipboard();
            if (file) {
                setUploading(true);
                await onImageUpload(file);
                setUploading(false);
                return;
            }
            alert(language === "ar" ? "لم يتم العثور على صورة في الحافظة." : "No image found in clipboard.");
        } catch (err) {
            console.error(err);
            alert(language === "ar" ? "لم نتمكن من قراءة الصورة. يرجى التأكد من إعطاء الصلاحية للمتصفح." : "Could not read clipboard. Please ensure you allow clipboard access.");
        }
    };

    return (
        <>
            {/* Main content: stacks vertically on mobile, horizontal on sm+ */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-glass-light flex items-center justify-center flex-shrink-0 border border-glass-border overflow-hidden group">
                        {item.image_url ? (
                            <img src={item.image_url} alt={item.title_ar} className="w-full h-full object-cover" />
                        ) : (
                            <button 
                                onClick={handlePasteImage}
                                disabled={uploading}
                                className="w-full h-full flex flex-col items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition relative"
                                title={language === 'ar' ? 'اضغط للصق صورة' : 'Click to paste image'}
                            >
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-blue border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <ImageIcon className="w-6 h-6 text-silver/50 group-hover:hidden" />
                                        <ClipboardPaste className="w-5 h-5 text-blue hidden group-hover:block" />
                                    </>
                                )}
                            </button>
                        )}
                    </div>"""

content = content.replace(old_itemrow_def, new_itemrow_def)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched!")
