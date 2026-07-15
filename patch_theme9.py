import os
import glob

# The directory containing the theme files
src_dir = "src/components/menu"

# Find all Theme9*.tsx files
files = glob.glob(os.path.join(src_dir, "Theme9*.tsx"))

for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Fix updateQty
    old_update = """    const updateQty = (id: string, n: string, d: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === id && i.notes === n) {
                const nq = i.quantity + d;
                return nq > 0 ? { ...i, quantity: nq } : i;
            }
            return i;
        }).filter(i => i.quantity > 0));
    };"""
    
    new_update = """    const updateQty = (id: string, n: string, d: number) => {
        setCart(prev => prev.map(i => {
            if (i.id === id && i.notes === n) {
                const nq = i.quantity + d;
                return { ...i, quantity: nq };
            }
            return i;
        }).filter(i => i.quantity > 0));
    };"""
    
    # 2. Fix line-clamp for item name in the list
    old_class1 = "font-extrabold text-[14px] md:text-lg mb-1 md:mb-2 line-clamp-1 leading-tight"
    new_class1 = "font-extrabold text-[14px] md:text-lg mb-1 md:mb-2 leading-tight"
    
    # 3. Fix line-clamp for item name in cart
    old_class2 = "font-bold text-sm mb-1 line-clamp-1"
    new_class2 = "font-bold text-sm mb-1"

    new_content = content.replace(old_update, new_update)
    new_content = new_content.replace(old_class1, new_class1)
    new_content = new_content.replace(old_class2, new_class2)
    
    with open(file, "w", encoding="utf-8") as f:
        f.write(new_content)
        
    print(f"Patched {file}")
