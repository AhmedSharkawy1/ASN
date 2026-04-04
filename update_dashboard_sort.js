const fs = require('fs');

const path = 'src/app/dashboard/menu/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add sort handles functions
const moveFuncs = `
    const handleMoveCategory = async (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === categories.length - 1) return;
        const newCats = [...categories];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newCats[index], newCats[swapIndex]] = [newCats[swapIndex], newCats[index]];
        
        setCategories(newCats);
        
        Promise.all([
            supabase.from('categories').update({ sort_order: index }).eq('id', newCats[index].id),
            supabase.from('categories').update({ sort_order: swapIndex }).eq('id', newCats[swapIndex].id)
        ]).catch(console.error);
    };

    const handleMoveItem = async (catId: string, itemIndex: number, direction: 'up' | 'down') => {
        const cat = categories.find(c => c.id === catId);
        if (!cat) return;
        if (direction === 'up' && itemIndex === 0) return;
        if (direction === 'down' && itemIndex === cat.items.length - 1) return;
        
        const newItems = [...cat.items];
        const swapIndex = direction === 'up' ? itemIndex - 1 : itemIndex + 1;
        [newItems[itemIndex], newItems[swapIndex]] = [newItems[swapIndex], newItems[itemIndex]];
        
        setCategories(categories.map(c => c.id === catId ? { ...c, items: newItems } : c));
        
        Promise.all([
            supabase.from('items').update({ sort_order: itemIndex }).eq('id', newItems[itemIndex].id),
            supabase.from('items').update({ sort_order: swapIndex }).eq('id', newItems[swapIndex].id)
        ]).catch(console.error);
    };
`;

if (!content.includes('handleMoveCategory')) {
    content = content.replace('const handleDeleteItem =', moveFuncs + '\n    const handleDeleteItem =');
}

// 2. Add sort_order to fetch
content = content.replace(/(await supabase\.from\('items'\)\.select\('\*'\)\.in\('category_id', catIds\))/, "$1.order('sort_order', { ascending: true })");

// 3. Add catIdx to map
content = content.replace(/categories\.map\(\(cat\)\s*=>\s*\{/, 'categories.map((cat, catIdx) => {');

// 4. Inject up/down arrows in Category header
const catButtons = `
                                            <div className="flex items-center gap-1.5 md:gap-2">
                                                <div className="flex bg-slate-100 dark:bg-black/30 rounded-lg p-0.5 border border-glass-border">
                                                    <button onClick={() => handleMoveCategory(catIdx, 'up')} disabled={catIdx === 0} className="p-1 px-1.5 text-zinc-500 hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30"><ChevronUp className="w-5 h-5" /></button>
                                                    <button onClick={() => handleMoveCategory(catIdx, 'down')} disabled={catIdx === categories.length - 1} className="p-1 px-1.5 text-zinc-500 hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30"><ChevronDown className="w-5 h-5" /></button>
                                                </div>
                                                <button onClick={() => { setEditingCat(cat.id); setEditingItem(null); }} className="p-2 text-blue hover:bg-blue/10 rounded-lg transition-colors"><Edit2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                                                <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4 md:w-5 md:h-5" /></button>
                                            </div>`;

content = content.replace(/<div className="flex items-center gap-2">\s*<button onClick=\{\(\) => \{ setEditingCat\(cat\.id\);[^<]*<\/button>\s*<button onClick=\{\(\) => handleDeleteCategory\(cat\.id\)\}[^<]*<\/button>\s*<\/div>/, catButtons);

// 5. Add iIdx to item map
content = content.replace(/cat\.items\.map\(\(item\)\s*=>\s*\(/g, 'cat.items.map((item, iIdx) => (');

// 6. Inject up/down arrows in ItemRow rendering
content = content.replace(/<ItemRow item=\{item\} language=\{language\}/g, `<ItemRow item={item} language={language}
                                                                    isFirst={iIdx === 0}
                                                                    isLast={iIdx === cat.items.length - 1}
                                                                    onMoveUp={() => handleMoveItem(cat.id, iIdx, 'up')}
                                                                    onMoveDown={() => handleMoveItem(cat.id, iIdx, 'down')} `);


// 7. Update ItemRow Definition
content = content.replace(/function ItemRow\(\{ item, language, onEdit, onDelete \}: \{[\s\S]*?\}\) \{/, 
`function ItemRow({ item, language, onEdit, onDelete, isFirst, isLast, onMoveUp, onMoveDown }: {
    item: Item; language: string;
    onEdit: () => void; onDelete: () => void;
    isFirst?: boolean; isLast?: boolean;
    onMoveUp?: () => void; onMoveDown?: () => void;
}) {`);

const itemButtons = `
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="flex items-center bg-slate-100 dark:bg-black/30 rounded-lg p-0.5 border border-glass-border">
                        <button onClick={onMoveUp} disabled={isFirst} className="p-1 px-1 text-zinc-500 hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30"><ChevronUp className="w-4 h-4" /></button>
                        <button onClick={onMoveDown} disabled={isLast} className="p-1 px-1 text-zinc-500 hover:text-foreground hover:bg-white dark:hover:bg-zinc-800 rounded-md transition-colors disabled:opacity-30"><ChevronDown className="w-4 h-4" /></button>
                    </div>
                    <div className="flex gap-2 justify-end">
                        <button onClick={onEdit} className="p-2 text-blue hover:bg-blue/10 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={onDelete} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
`;

content = content.replace(/<div className="flex flex-col gap-2 shrink-0">\s*<button onClick=\{onEdit\}[^>]*><Edit2[^>]*><\/button>\s*<button onClick=\{onDelete\}[^>]*><Trash2[^>]*><\/button>\s*<\/div>/, itemButtons);

// Add ChevronUp and ChevronDown if missing from ItemRow imports
if (!content.includes('ChevronUp')) {
    content = content.replace('import { Plus, Trash2, Edit2, Image as ImageIcon, Utensils, Star, Upload, X, Save }', 'import { Plus, Trash2, Edit2, Image as ImageIcon, Utensils, Star, Upload, X, Save, ChevronUp, ChevronDown }');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
